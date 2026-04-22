# Phase 4 Bot Testi — Uygulanan Düzeltmeler (Detaylı)

**Tarih:** 2026-04-21
**Branş:** `feat/phase-4-tool-cutover`
**Commit aralığı:** `ceab509` → `bd647c5` (4 yeni commit, hepsi push edildi)

Bu rapor, kullanıcının 11 query'lik manuel testinden sonra 6 somut bulguyu gidermek için yaptığım tüm kod/veri/instruction değişikliklerini — hangi agent ile teşhis edildiğini, hangi dosyanın nereden nereye değiştiğini, hangi sorunu giderdiğini — atlamadan içerir.

---

## 1. Teşhis aşaması (kod değişikliği öncesi)

### 1.1 Paralel 3 agent spawn edildi
Testin ardından kullanıcı 6 somut sorun bildirdi; bunların her birini tek agent'a vermek yerine **3 Explore agent paralel** koşturuldu:
- **Agent 1** — Trace DB analizi (`.adk/bot/traces/traces.db`): her tool call'ın input/output'u (output 1 KB truncated)
- **Agent 2** — Microservice kod audit'i (`retrieval-service/src/**`): mantıksal bug arayışı
- **Agent 3** — Supabase veri doğrulaması (3. agent plan yapıp durdu, script çalıştırmadı — eksiği ben giderdim)

### 1.2 Eksik kapatıldı — veri doğrulama scripti
Agent 3 hiç sorgu koşturmadığı için manuel oluşturuldu:

**YENİ:** [retrieval-service/scripts/inspect-phase4-bugs.ts](../../retrieval-service/scripts/inspect-phase4-bugs.ts)
- 12 SQL sondası, 7 grup:
  - Q1 — AntiFog ürünleri ve search_text'inde "seramik" var mı
  - Q2 — GYEON + ceramic_coating + price ≤1000 TL (tek ürün: AntiFog 570 TL)
  - Q3 — Syncro durability ratings + tüm ceramic_coating rating sıralaması
  - Q4 — Menzerna 400 serisi + heavy_cut_compound sub_type
  - Q5 — 1500-2500 TL abrasive_polish (primary + variant)
  - Q6 — Q2-OLE100M silikon FAQ'ı (EMPTY — yok)
  - Q7 — Q2-OLE100M use_with relations (SADECE Prep 3 variant)
  - Q8 — abrasive_polish sub_type dağılımı

**YENİ:** [retrieval-service/scripts/inspect-specs-structure.ts](../../retrieval-service/scripts/inspect-specs-structure.ts)
- `specs` JSONB key frekansı (tüm katalog)
- Ceramic_coating ürünlerinde `durability_months`, `durability_km`, `hardness`, `ph_tolerance`
- Q2-OLE100M specs tam içeriği
- Tüm 38 synonym entry'si

**Kritik bulgular:**
| Sorun | Veri | Sonuç |
|---|---|---|
| #3 AntiFog | template_group=ceramic_coating, sub_type=glass_coating, fiyat 570 TL | GYEON'un ceramic_coating içinde ≤1000 TL **tek ürün** |
| #8 Syncro | durability rating 5.5, durability_months 50 | Gerçek #1 ama searchProducts çağrıldığı için gelmedi |
| #8 SINH | rating null, months 48, km 75000 | WHERE `ratings IS NOT NULL` ile eleniyordu |
| #5 silikon FAQ | Q2-OLE100M için EMPTY | 30 FAQ'ta silikon geçen soru yok |
| #7 use_with | Q2-OLE100M için sadece Q2M-PYA4000M (Prep) | BaldWipe/SoftWipe/Cure/Bathe relation YOK |
| #10 Menzerna 400 | YENİ 400 (1900), 400 Yeşil (2500), heavy_cut_compound | Hepsi doğru kategoride, BM25/vector top-5'te sıralama sorunu |
| **Bonus** | `specs.durability_months` 63 üründe dolu | Rating'ten daha zengin metric |

---

## 2. Uygulanan düzeltmeler

### Commit 1 — `6c85d39` : Microservice 4 fix (price/rating/faq/null)

**Dosyalar:**
- [retrieval-service/src/types.ts](../../retrieval-service/src/types.ts)
- [retrieval-service/src/lib/formatters.ts](../../retrieval-service/src/lib/formatters.ts)
- [retrieval-service/src/lib/searchCore.ts](../../retrieval-service/src/lib/searchCore.ts)
- [retrieval-service/src/routes/search-price.ts](../../retrieval-service/src/routes/search-price.ts)
- [retrieval-service/src/routes/search-rating.ts](../../retrieval-service/src/routes/search-rating.ts)
- [retrieval-service/src/routes/faq.ts](../../retrieval-service/src/routes/faq.ts)
- [retrieval-service/src/routes/products.ts](../../retrieval-service/src/routes/products.ts)

#### Fix A — Zod null handling (Kritik: searchByPriceRange tamamen kırıktı)

**Sorun:** [types.ts:281-287](../../retrieval-service/src/types.ts#L281-L287)
```typescript
// ÖNCE
export const PriceSearchInputSchema = z.object({
  minPrice: z.number().int().optional(),
  maxPrice: z.number().int().optional(),
  templateGroup: z.string().optional(),
  brand: z.string().optional(),     // null reddedildi
  limit: z.number().int()...,
});
```

Bot handler'ı `brand: brand ?? null` gönderiyordu. `.optional()` Zod'da **yalnızca undefined** kabul eder, null FAIL. Sonuç: her searchByPriceRange çağrısı HTTP 400 Zod error → LLM searchProducts'a fallback yaptı → text-based filter (yok) → yanlış fiyatlar döndü.

**Fix:** Tüm 4 alan `.nullable().optional()` oldu. PriceSearchInputSchema artık null kabul ediyor.

#### Fix B — searchFaq SKU-bypass embedding ranking + threshold kalibrasyonu

**Sorun:** [faq.ts ÖNCE](../../retrieval-service/src/routes/faq.ts) (SKU-bypass mode)
```typescript
const rows = await sql<FaqHit[]>`
  SELECT sku, question, answer, NULL::numeric AS similarity
  FROM product_faqs
  WHERE scope = 'product' AND sku = ${sku}
  ORDER BY id
  LIMIT 50
`;
```
50 FAQ id sırasıyla, similarity=null. LLM rastgele ilk-N'i seçiyordu.

**Fix:** SKU-bypass artık query embedding çalıştırıyor, o ürünün FAQ'larını cosine similarity ile sıralıyor, threshold'la confidence tier belirliyor. Fallback: embedding yoksa id-sıralı.

```typescript
// SONRA — SKU-bypass mode
rows = await sql<FaqHit[]>`
  SELECT sku, question, answer,
         (1 - (embedding <=> ${vlit}::vector)) AS similarity
  FROM product_faqs
  WHERE scope = 'product' AND sku = ${sku}
    AND embedding IS NOT NULL
  ORDER BY embedding <=> ${vlit}::vector
  LIMIT ${limit}
`;
```

**Threshold kalibrasyonu:** [faq.ts:33-37](../../retrieval-service/src/routes/faq.ts#L33-L37)
```typescript
// ÖNCE: HIGH=0.6, LOW=0.4
// SONRA: HIGH=0.75, LOW=0.55
// Sebep: Q2-OLE100M'de silicon-related FAQ yok, ama generic semantic proximity
// topSim=0.71 veriyor. Eski HIGH=0.6 bunu 'high' diyerek LLM'i kötü FAQ'ı
// parrot etmeye yönlendiriyordu. 0.75 sıkı eşik → 0.71 artık 'low' →
// recommendation "domain bilgini kullan".
```

**Recommendation stringleri yeniden yazıldı:**
- HIGH: "birden fazla ilgili FAQ dönerse birlikte yorumla, sadece ilkini kopyalama"
- LOW: "önce SENIN genel domain bilgini kullan, FAQ'tan destekleyici cümle"
- NONE: Sayısal→specs, Genel→domain knowledge, Nüanslı→"bilgim yok, bayiye sorun"

#### Fix C — searchByPriceRange variant fiyat filter

**Sorun:** [formatters.ts ÖNCE](../../retrieval-service/src/lib/formatters.ts)
```typescript
export function toCarouselItemsWithVariants(row: ProductRow): CarouselItem[] {
  // sizes[] içindeki HER variant fiyatı ne olursa olsun carousel'a giriyor
}
```
searchByPriceRange SQL'i primary fiyatı filtreliyordu, ama formatter `sizes[]`'in TÜM variant'larını (600 TL, 2750 TL vs.) carousel'a yield ediyordu. Aralık dışına taşma.

**Fix:** Yeni `VariantFilter` interface + `withinPriceRange` helper + her variant'a per-variant price bound check.

```typescript
// SONRA
export interface VariantFilter {
  minPrice?: number | null;
  maxPrice?: number | null;
}

export function toCarouselItemsWithVariants(
  row: ProductRow,
  variantFilter?: VariantFilter,
): CarouselItem[] {
  // ...
  for (const s of sizes) {
    if (!hasRenderableUrl(s.url)) continue;
    if (!withinPriceRange(s.price, variantFilter)) continue;  // YENİ
    // ...
  }
}
```

[search-price.ts](../../retrieval-service/src/routes/search-price.ts) route'unda filter geçiliyor:
```typescript
const variantFilter = { minPrice: minPrice ?? null, maxPrice: maxPrice ?? null };
const carouselItems = rows.flatMap((r) => toCarouselItemsWithVariants(r, variantFilter));
```

Aynı şekilde `toTextFallbackLinesFromVariants` da güncellendi.

**Breaking change risk:** Mevcut çağrı siteleri `toCarouselItemsWithVariants(row)` formunda, yeni signature opsiyonel ikinci param alıyor — geriye uyumlu.

**flatMap signature collision:** `.flatMap(toCarouselItemsWithVariants)` TypeScript'te flatMap'in 2. parametresini index (number) beklediği için yeni opsiyonel VariantFilter parametresi çakıştı. 3 yerde wrapper'la çözüldü:
```typescript
filtered.flatMap((r) => toCarouselItemsWithVariants(r))
```
Dosyalar: searchCore.ts (2 yer), products.ts (related endpoint).

#### Fix F — searchByRating durability composite metric

**Sorun:** [search-rating.ts ÖNCE](../../retrieval-service/src/routes/search-rating.ts)
```sql
WHERE specs #>> ARRAY['ratings', 'durability'] IS NOT NULL
ORDER BY rating_value DESC NULLS LAST
```
Sadece rating'i olan ürünler. INNOVACAR SINH 48 ay/75.000 km ama rating null → dışarıda. MX-PRO Diamond 48 ay/9H ama rating null → dışarıda.

**Fix:** Metric='durability' için ayrı SQL path:
```sql
-- SONRA (composite)
WHERE (
  specs #>> ARRAY['ratings','durability'] IS NOT NULL
  OR specs ->> 'durability_months' IS NOT NULL
)
ORDER BY
  COALESCE(
    (specs #>> ARRAY['ratings','durability'])::numeric,
    (specs ->> 'durability_months')::numeric / 10.0
  ) DESC NULLS LAST, name ASC
```

Rating 1-5 ölçeği, months 12-60 ölçeği → months/10 ile 0-5.5'a normalize edildi. Rating varsa rating, yoksa proxy.

**Response şema genişlemesi:** [types.ts RankedProductSchema](../../retrieval-service/src/types.ts) üç yeni alan:
```typescript
durabilityMonths: z.number().nullable().optional(),
durabilityKm: z.number().nullable().optional(),
hardness: z.string().nullable().optional(),
```

**Subtitle formatı:** "GYEON • 50 ay / 50.000 km • 7.250 TL" (somut sayıyı öne çıkar, rating ikincil).

**Live test (post-deploy):**
```
metric=durability, templateGroup=ceramic_coating, limit=5 →
  Q2-SLE50M Syncro  (50 ay, 5.5 rating, 7250 TL) ← ÖNCE YOKTU
  Q2-MLE100M Mohs   (48 ay, 5.0 rating, 8600 TL)
  Q2-PLE50M Pure    (36 ay, 5.0 rating, 5100 TL)
  Q2-VE20M View     (24 ay, 5.0 rating, 1900 TL) [glass]
  700405 INNOVACAR SINH (48 ay, rating=null, 6000 TL) ← ÖNCE YOKTU
```

---

### Commit 2 — `21850cb` : Taxonomy sub_type + ı/i typo tolerance

**Dosyalar:**
- [retrieval-service/src/lib/slotExtractor.ts](../../retrieval-service/src/lib/slotExtractor.ts) — 111 satır yeni
- [retrieval-service/src/lib/synonymExpander.ts](../../retrieval-service/src/lib/synonymExpander.ts) — typo fold
- [retrieval-service/src/lib/searchCore.ts](../../retrieval-service/src/lib/searchCore.ts) — hem hybrid hem pure_vector path'te slot kullanımı

#### Fix E.1 — SUB_TYPE_PATTERNS inverse mapping

**Prensip (kullanıcının önerisi):** Template sub_type'lere search_text gibi etiket havuzu. Kullanıcı sorgusu → inverse lookup → en iyi eşleşen sub_type.

**Implementation:** [slotExtractor.ts:55-160](../../retrieval-service/src/lib/slotExtractor.ts#L55-L160) yeni `SUB_TYPE_PATTERNS` array'i:

```typescript
interface SubTypeMapping {
  canonical: string;        // e.g. 'paint_coating'
  templateGroup: string;    // e.g. 'ceramic_coating' — co-filter
  patterns: string[];       // normalized Turkish phrases
}
```

**15 mapping eklendi:**

*ceramic_coating alt-türleri:*
- `paint_coating` ← "boya seramik kaplama", "gövde seramik kaplama", "oto seramik kaplama", "arac seramik kaplama", "boya koruma kaplama", "9h seramik kaplama", "nano seramik kaplama"
- `glass_coating` ← "cam seramik", "cam kaplama", "cam su itici", "antifog", "buğu önleyici", "yağmur kaydırıcı", "cam bakımı"
- `tire_coating` ← "lastik kaplama", "lastik parlatıcı", "lastik koruyucu", "teker kaplama"
- `wheel_coating` ← "jant kaplama", "jant koruyucu", "jant seramik"
- `trim_coating` ← "plastik kaplama", "trim kaplama", "plastik yenileyici"
- `leather_coating` ← "deri kaplama", "deri koruyucu", "deri seramik", "koltuk kaplama deri"
- `fabric_coating` ← "kumaş kaplama", "koltuk kumaş", "tente kaplama", "kumaş koruyucu"
- `interior_coating` ← "iç mekan kaplama", "iç yüzey kaplama", "antibakteriyel kaplama"
- `spray_coating` ← "sprey seramik", "sprey kaplama", "hızlı seramik"

*abrasive_polish alt-türleri:*
- `heavy_cut_compound` ← "kalın pasta", "ağır çizik giderici", "heavy cut", "agresif pasta"
- `polish` ← "ince pasta", "ince çizik giderici", "ara kesim", "medium cut"
- `finish` ← "hare giderici", "bitiriş cila", "finish polish", "üçüncü adım"
- `one_step_polish` ← "tek adım pasta", "all in one", "3 in 1", "3in1"
- `metal_polish` ← "metal parlatıcı", "krom parlatıcı"
- `sanding_paste` ← "zımpara pasta", "matlaştırıcı"

**Longest-match-first sort:** Pattern'ler length DESC sıralı → "cam kaplama" (11) > "kaplama" (7) önce match eder.

**Match davranışı non-consumptive:** Pattern match olsa bile query'den çıkarılmıyor — semantic ranking hâlâ context görsün.

**Match fonksiyonu typo-tolerant:** `foldDotlessI` → "kalin pasta" ↔ "kalın pasta" aynı.

#### Fix E.2 — Slot'ların searchCore'a bağlanması

**Önce:** [searchCore.ts:366-372 ÖNCE](../../retrieval-service/src/lib/searchCore.ts#L366-L372)
```typescript
const tg = input.templateGroup ?? null;        // LLM gönderdi ise
const tst = input.templateSubType ?? null;
```

**Sonra:**
```typescript
const tg = input.templateGroup ?? slots.templateGroup ?? null;
const tst = input.templateSubType ?? slots.templateSubType ?? null;
```

Explicit input her zaman kazanır (LLM bilerek geçtiyse saygı); yoksa slot'tan inferred değer.

**Aynı fix pure_vector path'inde de** (line 195-198):
```typescript
const slotsPure = extractSlots(input.query);
const tg = input.templateGroup ?? slotsPure.templateGroup ?? null;
const tst = input.templateSubType ?? slotsPure.templateSubType ?? null;
const br = input.brand ?? slotsPure.brand ?? null;
```

#### Fix E.3 — Debug output + filtersApplied reflekte etmek

**Debug slots:**
```typescript
extractedSlots: {
  brand: slots.brand ?? null,
  priceMin: slots.priceMin ?? null,
  priceMax: slots.priceMax ?? null,
  ratingHint: slots.ratingHint ?? null,
  templateSubType: slots.templateSubType ?? null,  // YENİ
  templateGroup: slots.templateGroup ?? null,      // YENİ
},
```

**filtersApplied:** Artık effective (inferred) değer yansıtılıyor, ham input değil:
```typescript
filtersApplied: {
  templateGroup: tg,            // effective (slot veya input)
  templateSubType: tst,         // effective
  brand: effectiveBrand,
  exactMatch: input.exactMatch ?? null,
},
```

#### Fix E.4 — synonymExpander ı/i typo tolerance

**Sorun:** Synonyms tablosunda "polisaj" var (aliases: cila, pasta, polish, compound). Ama kullanıcı "polısaj" (dotless ı typo) yazdığında match etmiyor. Turkish normalize by-design ı ≠ i tutar (kırık vs kirik semantik fark).

**Fix:** [synonymExpander.ts:71-89](../../retrieval-service/src/lib/synonymExpander.ts#L71-L89) `containsPhrase` iki pass:

```typescript
function foldDotlessI(s: string): string {
  return s.replace(/ı/g, 'i');
}

function containsPhrase(haystack: string, phrase: string): boolean {
  if (!phrase) return false;
  if (wordBoundaryRegex(phrase).test(haystack)) return true;
  // Typo-tolerant pass: collapse ı→i on both sides and retry
  const folded = foldDotlessI(haystack);
  const foldedPhrase = foldDotlessI(phrase);
  if (folded === haystack && foldedPhrase === phrase) return false;
  return wordBoundaryRegex(foldedPhrase).test(folded);
}
```

**Neden turkishNormalize'a koymadım:** Normalize layer "kırık" gibi ı kritik kelimeleri yiyemez. Synonym layer zaten forgiving bir layer — fold burada güvenli.

**Aynı fold** `slotExtractor.matchSubType`'a da eklendi.

**Live test sonucu:**
```
"polısaj oner" →
  addedAliases: ["cila", "pasta", "polish", "compound"] ✓
"kalin pasta" →
  filtersApplied: { templateSubType: "heavy_cut_compound" } ✓
```

---

### Commit 3 — `bd647c5` : Bot instruction revision (RAG + re-tool + proactive + curator)

**Dosya:** [Botpress/detailagent-ms/src/conversations/index.ts](../../Botpress/detailagent-ms/src/conversations/index.ts) (~100 satır revize)

#### Fix D.1 — searchFaq bölümü → RAG semantik

**Eski davranış:** "confidence=high → direkt cevabı sun." LLM döndürülen ilk FAQ'ı parrot ediyordu.

**Yeni prensip:** FAQ = bilgi parçası (RAG context), LLM = yorumcu.

[conversations/index.ts searchFaq section ÖNCE] (~40 satır):
```
- confidence='high' → cevabı doğal cümleyle sun
- confidence='low'  → "En yakın SSS şunu söylüyor:" disclaimer
- confidence='none' → FAQ CEVABINI KULLANMA, "bilgim yok" de
- FAQ question kullanıcıya gösterilmez
- Scope kuralları (sku dolu vs null)
```

[conversations/index.ts searchFaq section SONRA] (~45 satır):
```
FAQ TEK BİR CEVAP DEĞİL, BİLGİ PARÇALARIDIR.

1. Birden fazla ilgili FAQ dönerse BİRLİKTE YORUMLA.
   "İkinci kat uygulasam dayanımım artar mı" için "katlar arası",
   "ne kadar dayanır", "kaç kat önerilir" dönerse — hepsini birleştir.

2. Generic ürün kimya bilgisi SENIN pre-training bilgin.
   "Seramik kaplamalar silikon içerir mi" için FAQ yoksa —
   "SiO2/nano tabanlı seramikler tipik olarak silikon içermez,
    fiziksel bağ oluştururlar" diye KENDİNDEN söyle.

3. Ürün-spesifik sayısal iddia → specs'ten doğrula.

confidence='high' (≥0.75): FAQ'lar uygun, birlikte yorumla
confidence='low' (0.55-0.75): Önce domain bilgin, sonra FAQ destekleyici
confidence='none' (<0.55): Sayısal→specs, Genel→domain knowledge, Nüanslı→dürüst

Multi-turn re-call: aynı konu farklı kelime → re-call, kopyalama.
```

#### Fix D.2 — searchByRating zorunluluğu sertleştirildi

**Eski:** "en iyi X → searchByRating kullan."
**Yeni:** "en iyi/top/en yüksek/en dayanıklı için searchByRating HARİCİ TOOL YASAK." + composite metric açıklaması + sunum: **somut sayıyı öne çıkar** ("50 ay" > "5.5/5 puan").

Bu, kullanıcının Q#8'de yaşadığı "LLM searchProducts çağırdı → Syncro gelmedi" sorununu hedefliyor.

#### Fix D.3 — Proactive Fallback (YENİ bölüm)

**Motivasyon:** Kullanıcı Q#3'te "1000 TL altı GYEON seramik kaplama" sorgusuna bot AntiFog (yanlış ürün) döndürdü. İkinci sorguda "düzelt" dediğinde alternatif cam kaplama+wetcoat+quick detailer önerdi. Bot ilk sorguda neden bunu yapmadı?

**Fix:**
```markdown
## PROACTIVE FALLBACK — Empty / Poor Result Handling (v10)

Tool sonucu boş VEYA sonuçlar kullanıcının isteğiyle ciddi uyumsuz ise, "sonuç yok" deyip kapatma. 2 ADIM dene:

ADIM 1 — Filter gevşet, tekrar çağır:
- Empty + price → priceMax'ı %30 gevşet veya kaldır
- Empty + templateSubType → templateGroup'a sadeleştir
- Empty + brand → brand kaldır
- Empty + exactMatch → exactMatch kaldır

ADIM 2 — Alternatif sunumu:
Dürüstçe söyle + yakın alternatifler sun.
"1000 TL altı GYEON paint coating yok — en ucuz 3.450 TL.
 Bütçeyi buna çıkarabilirsen veya 1000 TL altı cam/sprey seramik seçenekleri..."
```

#### Fix D.4 — Search Result Relevance Check (curator role, YENİ bölüm)

**Motivasyon:** Kullanıcı sordu: "LLM carousel'i kontrol ediyor mu?"
Cevap: Hayır — mekanik. Ama LLM text annotation yapabilir.

**Fix:**
```markdown
## SEARCH RESULT RELEVANCE CHECK (v10)

searchProducts / searchByPriceRange carousel'i MEKANİK üretir
(microservice retrieval — LLM kontrolünde DEĞİL). Ama sen sonuçların
gerçekten kullanıcının sorusuyla uyuştuğunu değerlendirebilirsin.

- "seramik kaplama öner" sorgusunda AntiFog (cam) döndüyse →
  Carousel'i yield et AMA "NOT: Q2-AF120M cam iç yüzeyine uygulanır,
  boya koruma için değildir..." diye açıkla
- Fiyat aralığı dışı ürün varsa (rare post-v10) → uyar
- Aynı üründen 3 variant → "3 boyut mevcut" bilgisi ver

Retrieval deterministic, sen CURATOR'sın. Yanlış hit'i görünce uyar.
```

#### Fix D.5 — Multi-turn Re-tool Rule (TOOL ÇAĞRI KURALLARI bölümüne 7. madde)

```
7. MULTI-TURN RE-TOOL (v10 — KRİTİK):
Kullanıcı aynı konuyu 2. veya 3. kez farklı kelimelerle sorduysa —
örn "silikon içerir mi" → "dolgu var mı" → "katkı maddesi ne" —
context'teki önceki cevabı KOPYALAMA. Tool'u YENİ query ile tekrar
çağır. Özellikle FAQ için şart: kullanıcı memnun değilse re-call yap.
```

#### Fix D.6 — BOŞ SONUÇ kuralı güncellendi (madde 3)

**Eski:** "Boş sonuç → exactMatch'i gevşet, tek kez yeniden dene."
**Yeni:** "Boş sonuç → 'Proactive Fallback' bölümündeki ADIM 1+2'yi uygula."

---

## 3. Deploy ve doğrulama

### 3.1 Fly.io prod deploy'ları

- Commit 1 sonrası: `flyctl deploy --app detailagent-retrieval` — 2 machine rolling update OK
- Commit 2 sonrası: Yeniden deploy, 2 machine rolling update OK
- Commit 3 (bot instruction): Bot tarafı, lokal `adk build` 0 error. **Botpress Cloud'a deploy EDİLMEDİ** (kullanıcı lokal test öncesi istemedi).

### 3.2 Live prod test sonuçları

**Test 1 — searchByPriceRange null brand:**
```
Input:  {minPrice:1500, maxPrice:2500, templateGroup:"abrasive_polish", brand:null}
Output: 10 ürün, hepsi 1500-2500 TL aralığında
        Menzerna 1100 (1500), 2500 (1700), 3800 (1800), YENİ 400 (1900),
        2200 (1900), Compound (2050), One-Step (2100), FRA-BER (2200),
        Polish (2200), 3500 (2300)
```
**Öncesi:** Zod 400 error → fallback searchProducts → 600/720/990/2750 TL gibi aralık dışı.
**Sonrası:** ✅ Tüm fiyatlar aralıkta.

**Test 2 — searchByRating durability composite:**
```
Input:  {metric:"durability", templateGroup:"ceramic_coating", limit:5}
Output: Syncro (50 ay, 5.5), Mohs (48 ay, 5.0), Pure (36 ay, 5.0),
        View (24 ay, 5.0 glass), INNOVACAR SINH (48 ay, rating=null)
totalCandidates: 21
```
**Öncesi:** Rating null ürünler eleniyordu (Syncro'yu LLM searchProducts çağırdığı için almadı, SINH hiç katılmıyordu).
**Sonrası:** ✅ Syncro #1, SINH #5 (composite metric ile).

**Test 3 — searchFaq SKU-bypass silikon:**
```
Input:  {query:"silikon içerir mi", sku:"Q2-OLE100M", limit:3}
Output: confidence=low, topSim=0.713
        Recommendation: "önce SENIN genel domain bilgini kullan..."
        results: 3 FAQ (konu dışı: "Bu ürün nedir?", "Çıkarılabilir mi?", "Üst kaplama")
```
**Öncesi:** topSim=null (id-sıralı), ilk FAQ "Light Box farkı" parrot ediliyordu.
**Sonrası:** ✅ Low confidence → LLM'e "domain knowledge kullan" sinyali.

**Test 4 — searchFaq cross-product silikon:**
```
Input:  {query:"silikon içerir mi"}  (no SKU)
Output: confidence=high, topSim=0.904
        Q2M-PPR, Q2M-CM, Q2M-CMPR için "Dolgu maddesi ya da silikon içerir mi?"
```
**Sonuç:** ✅ Cross-product gerçek silikon FAQ'larını döndürdü (yüksek similarity).

**Test 5 — Taxonomy sub_type inference:**
```
"cam kaplama öner" → templateSubType=glass_coating ✓
  → INNOVACAR SC3, Q2-VE20M View, Q2-AF120M AntiFog (3/3 glass)
"kalın pasta öner" limit=8 → templateSubType=heavy_cut_compound ✓
  → Menzerna 1100, 1000, Compound+, 1000 1kg, Cut Force, Compound+ REDEFINED,
    MENZERNA YENİ 400, MENZERNA 400 Yeşil (7-8. sırada!)
"GYEON seramik kaplama 1000 tl altı" → paint_coating + priceMax=1000 + GYEON
  → [] (EMPTY — doğru, katalog bu filtrelerle gerçekten boş)
```

**Test 6 — ı/i typo tolerance:**
```
"polısaj oner" → addedAliases: [cila, pasta, polish, compound] ✓
"kalin pasta" → templateSubType=heavy_cut_compound ✓
```

---

## 4. Yapılmayanlar (bilinçli erteleme)

### 4.1 product_relations enrich (Q2-OLE100M BaldWipe/SoftWipe/Cure/Bathe)
**Gerekçe:** Kullanıcı açıkça belirtti: "Sistematik 'her seramik için 4 ürün zorunlu' sorun yaratır, düşünelim." Manuel review + ETL yaklaşımı gerekiyor. Phase 6.5 enrichment kapsamına alındı.

### 4.2 Bot Cloud env vars (`agent.config.ts` configuration schema)
**Gerekçe:** Cloud'da bot microservice'e hit edemiyor (`.env` lokal-only, Cloud'da inject edilmiyor). Ama kullanıcı lokal test modunu tercih etti. Cloud deploy öncesi yapılacak.

### 4.3 detailagent v9.2 karşılaştırma testi
**Gerekçe:** Şu anki fix'ler sonrası aynı 11 query'yi hem v9.2 (Botpress Tables) hem detailagent-ms (microservice) bot'larında yan yana koşturup kıyaslamak Phase 5 shadow mode işi.

### 4.4 151-query otomatik test altyapısı
**Gerekçe:** Retrieval layer için zaten mevcut (`retrieval-service/eval/`). Bot-seviyesi için yeni altyapı gerek (Botpress chat API + trace parsing + expected_tool/expected_skus annotation). ~1 gün iş, Phase 5 kapsamı.

---

## 5. Özet tablosu — Soru → Fix mapping

| # | Kullanıcı Sorunu | Fix Tipi | Commit | Durum |
|---|---|---|---|---|
| 1 | searchFaq silikon için "Light Box farkı" döndü | Microservice: embedding ranking + threshold calibration | 6c85d39 | ✅ Prod test geçti |
| 1b | searchFaq aynı cevabı 3 kez tekrarladı | Instruction: multi-turn re-tool + RAG semantics | bd647c5 | ⏳ Bot test gerekli |
| 2 | getRelatedProducts BaldWipe/Cure carousel'a eklenmedi | Veri: product_relations eksik (4.1'de ertelendi) | — | ⏸ Phase 6.5 |
| 3 | "1000 TL altı GYEON seramik" AntiFog döndü | Microservice: slotExtractor sub_type inference | 21850cb | ✅ Prod test geçti |
| 3b | İlk sorguda proactive alternative sunmadı | Instruction: Proactive Fallback bölümü | bd647c5 | ⏳ Bot test gerekli |
| 4 | searchProducts'ta LLM confidence belirliyor mu? | Cevap: Hayır, mekanik. LLM curator role alabilir | bd647c5 | ⏳ Bot test gerekli |
| 5A | searchByPriceRange 600/720/2750 TL döndü | Microservice: Zod .nullish + variant filter | 6c85d39 | ✅ Prod test geçti |
| 8 | "En dayanıklı seramik"te Syncro yok | Microservice: rating composite + Instruction: tool zorla | 6c85d39 + bd647c5 | ✅ Prod + ⏳ Bot |
| 10 | "polisaj öner"de Menzerna 400 yok | Microservice: sub_type + synonym + ı/i fold | 21850cb | ✅ Kısmen (limit 8'de geliyor) |

**Toplam commit:** 3 (microservice + bot + instruction) + 1 önceki (Phase 4.11-4.13 getApplicationGuide cutover)
**Toplam satır değişikliği:** +525 / -104 (microservice) + +66 / -32 (instruction)
**Prod deploy:** 2 (Fly.io, rolling, healthy)
**Bot Cloud deploy:** ⏸ Bekliyor
