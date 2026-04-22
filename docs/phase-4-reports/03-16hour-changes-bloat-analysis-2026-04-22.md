# Phase 4 — Son 16 Saat Değişiklik Raporu + Instruction/Prompt Bloat Analizi

**Dönem:** 2026-04-21 17:00 TR → 2026-04-22 09:30 TR (yaklaşık 16 saat)
**Branch:** `feat/phase-4-tool-cutover`
**Fokus:** Tüm commit'ler, sorun/çözüm eşleşmeleri, bot instruction/tool description token bütçesi, sadeleştirme fırsatları

---

## İçindekiler

1. [Commit timeline + kategori tablosu](#1-commit-timeline)
2. [Bot instruction boyut evrimi](#2-bot-instruction-boyut-evrimi)
3. [Yeni/revize bölümler ve token maliyetleri](#3-yenirevize-bölümler)
4. [Tool description boyutları](#4-tool-description-boyutları)
5. [Microservice değişiklikleri (runtime etki)](#5-microservice-değişiklikleri)
6. [Veri katmanı değişiklikleri](#6-veri-katmanı-değişiklikleri)
7. [Sorun → Fix eşleşme tablosu](#7-sorun--fix-eşleşme-tablosu)
8. [Token inflation hipotezi + hesap](#8-token-inflation-hipotezi--hesap)
9. [Sadeleştirme önerileri (actionable)](#9-sadeleştirme-önerileri)
10. [Riskler + geri alınacak/tutulacaklar](#10-riskler)

---

## 1. Commit Timeline

Son 16 saatte 7 commit atıldı. Hepsi `feat/phase-4-tool-cutover` branch'inde, GitHub'a push edildi.

| Saat (TR) | Hash | Başlık | +/- Satır | Kategori |
|---|---|---|---|---|
| 2026-04-21 20:00:27 | `5e276ce` | Step 4.11 — `/products/:sku/guide` endpoint + video_url migration | +155/-3 (6 dosya) | microservice-code + migration |
| 2026-04-21 20:00:37 | `6488b38` | Steps 4.12+4.13 — getApplicationGuide HTTP cutover + Botpress Tables kaldırma | +36/-509 (15 dosya) | bot-code (cleanup) |
| 2026-04-22 01:09:04 | `49fc83c` | Round 2 — base_name + paint_coating family + variant price SQL | +334/-15 (9 dosya) | microservice-code + migration + bot-code + yorum |
| 2026-04-22 01:09:04 | (aynı) | Yukarıdaki commit 4 fix'i içeriyor: G+H+M + types | — | — |
| 2026-04-22 01:09:29 | `5f23e8c` | Instruction v10.1 — searchByRating enforcement + pre-yield relevance | +38/-6 (1 dosya) | bot-instruction |
| 2026-04-21 22:24:16 | `6c85d39` | Phase 4 bot test — 4 bug (price/rating/faq/null-handling) | +525/-104 (9 dosya) | microservice-code (büyük kısmı debug scriptleri) |
| 2026-04-21 22:35:18 | `21850cb` | Taxonomy sub_type inverse mapping + ı/i typo tolerance | +211/-8 (3 dosya) | microservice-code |
| 2026-04-21 22:39:07 | `bd647c5` | Instruction v10 — RAG, proactive fallback, re-tool, curator | +66/-32 (1 dosya) | bot-instruction |
| 2026-04-22 09:31 (uncommitted) | — | Backtick escape fix (v10.1 build hatası düzeltme) | +9/-9 (1 dosya) | bot-instruction (hotfix) |

Bot tarafında Cloud deploy yapılmadı (son deploy `ceab509`, 2026-04-21 17:10 civarı). Microservice prod'a 3 kere deploy edildi (`6c85d39`, `21850cb`, `49fc83c`).

---

## 2. Bot Instruction Boyut Evrimi

**Dosya:** [Botpress/detailagent-ms/src/conversations/index.ts](../../Botpress/detailagent-ms/src/conversations/index.ts)

| Nokta | Toplam satır | Backtick içi (instruction blok) | Tahmini token (Gemini 3 Flash, ~4 char/token TR) |
|---|---|---|---|
| detailagent v9.2 (Phase 4 giriş baseline) | 463 | ~420 | ~5.300 |
| `bd647c5^` (Phase 4.10 deploy sonrası, Round 1 öncesi) | 475 | ~432 | ~5.500 |
| `bd647c5` (v10 instruction revision) | 509 | ~460 | ~5.900 |
| `5f23e8c` (v10.1 + hotfix) | **541** | **426 (backtick içi, gerçek)** | **~6.536** (doğrulandı: 26.143 char / 4) |

**Son 16 saatteki net artış:** 475 → 541 = **+66 satır**, **~+800 token** (instruction text'i için).

**Not:** Gemini sistem promptunda instruction dışında tool JSON schema + ADK prelude da var. Trace DB'deki `ai.system_length` alanı toplam system prompt karakter sayısını gösteriyor:
- Boş state ile: ~51.664 char ≈ **12.9k token**
- Dolu state ile (lastProducts + lastFocusSku + lastFaqAnswer): 60-66k char ≈ **15-16.5k token**

Kullanıcının gördüğü **"10k → 16k" çoğunlukla state doldurma etkisi**; instruction text'inin kendisi +800 token ekledi (sabit).

---

## 3. Yeni/Revize Bölümler ve Token Maliyetleri

Son 16 saatte instruction metnine eklenen veya revize edilen bölümler (token tahminleri backtick içi 4 char/token):

| Başlık | Satır aralığı | Durum | Tahmini token | Ekleyen commit |
|---|---|---|---|---|
| TOOL SEÇİMİ Karar Tablosu + **Rule 0** (searchByRating zorunlu) | 126-145 | **v10.1'de expand** (Rule 0 + 4 örnek) | +400 | `5f23e8c` |
| PROACTIVE FALLBACK (empty result handling, 2 adım) | 337-351 | **v10 yeni** | 700 | `bd647c5` |
| SEARCH RESULT RELEVANCE CHECK | 353-385 | **v10 → v10.1 expand** (3 satır curator → 4 adım checklist) | +550 (net) | `bd647c5` + `5f23e8c` |
| Multi-turn Re-tool kuralı (TOOL ÇAĞRI kuralları madde 7) | 418 | **v10 yeni** | 60 | `bd647c5` |
| searchFaq KULLANIM — RAG semantiği + scope conventions | 420-449 | **v10 revize** (tek-cevap → bilgi parçası) | 550 (net ~0 artış, içerik reframe) | `bd647c5` |
| RATINGS / DAYANIKLILIK Karşılaştırması | 321-335 | **v10 revize** (composite metric açıklama) | 400 | `bd647c5` |

**Son 16 saatte eklenen/revize edilen net token:** ~1.050 (instruction blok içinde). Kullanıcı etkisinde ana kütleyi oluşturur.

---

## 4. Tool Description Boyutları

Bot tool definition'ındaki `description:` alanı Gemini'ye her çağrıda tool schema içinde gönderilir.

| Tool | Description char | Token (÷4) | 16 saatte değişim |
|---|---|---|---|
| `searchProducts` | 236 | ~59 | — (description sabit, 6c85d39'da içerik güncellendi ama uzunluk aynı) |
| `searchFaq` | **862** | **~216** | — (description en uzun; SKU-bypass + scope semantics) |
| `getProductDetails` | 334 | ~83 | — |
| `getApplicationGuide` | 405 | ~101 | — (Phase 4.11'de yeni ama description uzun değil) |
| `searchByPriceRange` | 343 | ~86 | — |
| `searchByRating` | 505 | ~126 | **Revize (49fc83c):** composite metric + ay/km açıklama eklendi |
| `getRelatedProducts` | 461 | ~115 | — |
| **TOPLAM** | **3.146** | **~787** | ~+25 token (searchByRating revize) |

Tool description'lar toplam ~787 token; instruction blok (~6.500 token) ile birlikte **~7.300 token** statik system prompt yükü.

**Not:** Zod input/output schema'ları ayrıca tool schema içinde serialize ediliyor — bu field descriptionları ile birlikte ~2.500 token daha eklenebilir (Gemini'nin internal representation).

---

## 5. Microservice Değişiklikleri

Bot instruction'ına etki etmeyen ama retrieval kalitesine direkt etki eden değişiklikler.

### 5.1 `5e276ce` — `/products/:sku/guide` + video_url migration

- **Migration 006:** `products.video_url` kolonu eklendi
- **Yeni endpoint:** `GET /products/:sku/guide` — 14 alan + YouTube Carousel videoCard
- **Formatter helper:** `formatVideoCard` (YouTube ID parse, thumbnail URL)
- **Bot tool:** `getApplicationGuide` bu endpoint'e bağlandı (`6488b38`'de)
- **Etki:** getApplicationGuide payload'u getProductDetails'in 3-4 katı daha küçük (~1.500 vs ~5.000 token); video kart benzersiz feature

### 5.2 `6488b38` — getApplicationGuide HTTP cutover + Tables cleanup

- Son Botpress Tables bağımlılığı (`get-application-guide.ts`) kesildi → `retrievalClient.getGuide()`
- `src/tables/` dizini (11 dosya) silindi
- Cloud tabloları deployment metadata'da "ignored" olarak düştü
- **Etki:** Bot tamamen microservice-only, Botpress Tables hiçbir yerde kullanılmıyor

### 5.3 `6c85d39` — 4 bug fix (Round 1)

- **Fix A:** Zod `.optional()` → `.nullable().optional()` (searchByPriceRange Zod 400 crash'i düzeltti)
- **Fix B:** searchFaq SKU-bypass embedding ranking + HIGH=0.75/LOW=0.55 threshold
- **Fix C:** `toCarouselItemsWithVariants(row, variantFilter)` — per-variant price bound
- **Fix F:** searchByRating composite durability — `COALESCE(rating, months/10)` fallback (rating null olan INNOVACAR SINH, MX-PRO Diamond vs. artık dahil)
- **Debug scripts:** `inspect-phase4-bugs.ts` + `inspect-specs-structure.ts` (reusable)

### 5.4 `21850cb` — Taxonomy sub_type inverse mapping

- `slotExtractor.ts` → 15 mapping (ceramic_coating: paint/glass/tire/wheel/trim/leather/fabric/interior/spray; abrasive_polish: heavy_cut/polish/finish/one_step/metal/sanding)
- `searchCore.ts` → slot sub_type'ı explicit input olmadığında filter'a bağladı
- `synonymExpander.ts` → ı↔i typo fold (containsPhrase fallback)
- `slotExtractor.matchSubType` → aynı fold
- **Etki:** "cam kaplama öner" → glass_coating auto-filter; "kalın pasta" → heavy_cut_compound auto-filter; "polısaj" (dotless ı typo) → "polisaj" synonym match

### 5.5 `49fc83c` — Round 2 (3 fix tek commit)

- **Fix G:** Migration 007 `products.base_name` kolonu + seed populate + `baseNameFromRow` prefer base_name
- **Fix H:** `expandSubTypeFamily(sub)` helper → paint_coating: `[paint_coating, paint_coating_kit, multi_step_coating_kit, single_layer_coating]`. searchCore ve bm25 her ikisi de array-based filter (`= ANY(${family})`). Syncro (kit) ve Hydro (multi-step-kit) artık paint sorgularında dahil
- **Fix M:** `search-price.ts` SQL'de `WHERE EXISTS variant price` branch → primary aralık dışı ama variant aralıkta olan ürünler (Diamond 30ml 2500 TL) artık geliyor
- **Debug script:** `inspect-phase4-round2.ts` (235 satır, 10 SQL probe)

---

## 6. Veri Katmanı Değişiklikleri

### Migration dosyaları
- **006_add_video_url.sql** — `products.video_url TEXT`
- **007_add_base_name.sql** — `products.base_name TEXT`

Her iki migration da idempotent (`IF NOT EXISTS`) ve geri alınamayan değil (kolon düşürme gerekmez; eski davranış fallback ile korunur — `video_url IS NULL → null video`, `base_name IS NULL → row.name`).

### Seed değişiklikleri
- `seed-products.ts` — video_url + base_name CSV'den alınıp INSERT'e dahil edildi (idempotent UPSERT ile)
- Re-seed koşuldu 2 kere (video_url için, base_name için) — her seferinde 511 ürün

### product_relations (dokunulmadı)
Round 2 inspection'da **Menzerna 400 (22202.260.001) use_with 6 row dolu** çıktı (P150M + 2 sünger + 3 keçe). Dolayısıyla "Fix L — pad use_with enrichment" iptal edildi (Round 1 raporumda yanlış yazmıştım).

---

## 7. Sorun → Fix Eşleşme Tablosu

Test oturumlarındaki bulgular ve bu 16 saatteki fix'ler:

| # | Test oturum bulgusu | Root cause | Fix | Commit | Durum |
|---|---|---|---|---|---|
| 1 | "silikon içerir mi" saçma FAQ parrotu | SKU-bypass id-ordered similarity=null | Embedding ranking + confidence tier (HIGH=0.75) | `6c85d39` Fix B | ✅ Prod test geçti |
| 1b | Aynı sorunun 2. kez aynı cevap alması | LLM context kullanıyor, re-tool yok | Multi-turn Re-tool kuralı | `bd647c5` | ⏳ Bot test kısmi geçti |
| 2 | getRelatedProducts use_with sadece Prep | Q2-OLE100M için BaldWipe/Cure relation eksik | **İptal** (manuel ETL işi, Phase 6.5) | — | ⏸ ertelendi |
| 3 | "GYEON 1000 TL altı seramik" → AntiFog | Sub_type filter'ı yok | slotExtractor SUB_TYPE_PATTERNS | `21850cb` | ✅ Prod test geçti |
| 4 | searchProducts LLM confidence soru | Instruction açıklaması yok | Curator role instruction | `bd647c5` + `5f23e8c` | ⏳ Bot test kısmi |
| 5A | searchByPriceRange 600/720/2750 dönüyor | Zod `.optional()` null kabul etmiyor + variant SQL filter yok | Zod `.nullish()` + variant price filter | `6c85d39` Fix A/C | ✅ Prod test geçti |
| 5B | Primary>3000 ama variant≤3000 gelmiyor (Diamond 30ml) | SQL WHERE sadece primary | `WHERE EXISTS variant` branch | `49fc83c` Fix M | ✅ Prod test geçti |
| 6 | Title "1 lt — 250 ml" duplication | `row.name` zaten boyut içeriyor, base_name kolonu DB'de yok | Migration 007 + seed + formatter | `49fc83c` Fix G | ✅ Prod test geçti |
| 7 | Syncro (50 ay #1) "en dayanıklı" sorgusunda yok | paint_coating_kit sub_type, paint_coating filter'ında düşüyor | expandSubTypeFamily | `49fc83c` Fix H | ✅ Prod test geçti |
| 8 | LLM "en dayanıklı" için searchProducts çağırıyor | Instruction soft rule | Tool decision table Rule 0 (hard YASAK) | `5f23e8c` Fix J | ⏳ Bot test kısmi |
| 9 | MX-PRO Diamond 30ml 2500 TL görünmüyor | Primary filter SQL (Fix M ile aynı konu) | Fix M | `49fc83c` | ✅ |
| 10 | "polısaj oner" synonym match yok | Turkish normalize ı'yı korur, synonyms tablosunda "polisaj" | synonymExpander `foldDotlessI` tolerance | `21850cb` | ✅ Prod test geçti |
| 11 | Green Monster "seramik silme bezi" aramada | search_text'te "Silme Bezleri" kategori ifadesi var | Pre-yield relevance check (instruction) | `5f23e8c` Fix K | ⏳ Bot test + data enrichment gerekli |
| 12 | "Lustratutto" FRA-BER'de yok (halüsinasyon) | LLM output dışı isim üretiyor | Anti-hallucination kuralı | `5f23e8c` Fix N | ⏳ Bot test |
| 13 | Gommanera (lastik) cila olarak önerildi | LLM kategori halüsinasyonu | Kategori halüsinasyon kuralı | `5f23e8c` Fix K/N | ⏳ Bot test |
| 14 | Carousel'da her üründen tüm variantlar (sığmıyor) | formatters default davranış = sizes[].length per product | **Henüz ele alınmadı** | — | 🔴 açık |

**Açık bulgu:** #14 — "her üründen tek variant" özelliği implement edilmedi. Round 2 planda işaretliydi ama kapsam dışı kaldı.

---

## 8. Token Inflation Hipotezi + Hesap

### Başlangıç ve şimdi (ai.system_length trace değerleri)

| Senaryo | `ai.system_length` char | Token (÷4) |
|---|---|---|
| Boş state (ilk turn) | ~51.664 | **~12.916** |
| Dolu state (lastProducts + lastFaqAnswer) | ~65.723 | **~16.430** |
| **User'ın gördüğü** | 10k → 16k diye rapor etti | (yaklaşık eşleşiyor: boş → dolu state kıyası) |

### System prompt bileşenleri (tahmin)

| Bileşen | Token | % |
|---|---|---|
| ADK runtime prelude (fixed) | ~2.500 | ~19% |
| Tool JSON schemas (7 tool, input + output + description) | ~3.000 | ~23% |
| Conversation instruction blok (backtick içi, 26.143 char) | ~6.536 | **~51%** |
| State render (boş: `lastProducts: []` / dolu: 5 ürün listesi + lastFaqAnswer 500 char) | 0 → ~800 | 0 → ~6% |
| **TOPLAM boş state** | **~12.036** | |
| **TOPLAM dolu state** | **~12.836+** | |

User'ın input olarak gördüğü ek token'lar:
- Bot conversation history (önceki turn'ler) — Gemini context window'a eklenir
- User mesajı + LLM'nin yield ettiği metin + tool call/result JSON'ları

Bu parçalar sohbet uzadıkça **birikir**; sistem prompt sabit ama context büyür. 16 saat boyunca aynı oturumda artış şaşırtıcı değil.

### Instruction blok içi son 16 saat artış

Backtick içi 22.965 char (bd647c5^) → 26.143 char (şu an) = **+3.178 char ≈ +795 token**.

Bu **+800 token'luk artış**, user'ın gördüğü 10k→16k farkın küçük bir parçası. Asıl dominant neden:
1. Gemini'nin tüm turn'leri context'te tutması (multi-turn oturumda artan geçmiş)
2. State render'ın dolması

**Yani:** User'ın şüphelendiği "instruction bloat" kısmen doğru (+800 token) ama **dominan değil**. Ana kütle conversation history + tool output verisidir.

---

## 9. Sadeleştirme Önerileri

Instruction blok token'ını %15-25 geri kazanmak için, riske göre sıralı:

### ✅ Düşük risk (+öneri)

**9.1. PROACTIVE FALLBACK + SEARCH RESULT RELEVANCE birleştir**
- **Sorun:** İki bölüm benzer tema (empty result + relevance). PROACTIVE 700 token, RELEVANCE 550 token.
- **Yeni yapı:** Tek "RESULT VALIDATION" başlığı, 4 adım:
  1. Output'u user query ile semantic eşleştir (templateGroup/SubType)
  2. Uyumsuz oranı >%30 → filter gevşet + re-call (ÖNCE)
  3. Empty result → 2 alternatif kategori öner (price gevşet, brand kaldır)
  4. Yield sonrası: uyumsuz ürünleri metinde flag'le, asla output dışı isim/kategori üretme
- **Hedef token:** 750 (net **-500 token, %7 tasarruf**)
- **Risk:** Düşük — pattern benzer, birleştirme behavior'ı kırmaz

**9.2. RATINGS v9.0 + RATINGS v10 birleştir**
- Şu an iki bölüm var: "RATINGS Alanı" (v9.0, spec yapı) ve "RATINGS / DAYANIKLILIK Karşılaştırması" (v10, searchByRating ZORUNLU).
- **Yeni yapı:** Tek "RATING / DAYANIKLILIK" başlığı, önce tool seçimi (composite metric açıklaması dahil), sonra spec yapısı.
- **Hedef token:** 400 (şu an ~550). Net **-150 token**.
- **Risk:** Çok düşük.

**9.3. Versiyon tag trim (v8.2 / v8.4 / v8.5 / v9.0 / v9.1 / v10 / v10.1)**
- 7 farklı versiyon başlık ve inline referans'ta geçiyor.
- **Önerilen:** Başlıklarda versiyon KALDIRIN ("searchFaq KULLANIM (v10 — RAG semantiği)" → "searchFaq — RAG ile kullanım").
- **Hedef token:** -80.
- **Risk:** Yok — evrim history'si git log'da zaten.

### 🟡 Orta risk (değer/risk)

**9.4. META FİLTRE tablosu 13 → 5 örnek**
- Şu an 13 satırlık tablo (~650 token).
- En kritik 5: `silicone_free`, `contains_sio2`, `ph_level`, `durability_days`, `volume_ml`.
- Diğer 8 için: "Diğer meta key'ler için `[{key:'X',op:'eq',value:Y}]` formatı; microservice `resolveMetaFilterSkus` validate eder."
- **Hedef token:** 300. Net **-350**.
- **Risk:** LLM nadir kombinasyonu unutabilir (cut_level, machine_compatibility, vs.). Ama microservice uygun hata döner, kullanıcıya bu şekilde sunmak yeterli.

**9.5. SPEC-FIRST + searchFaq sku-aware → DATA SOURCE SELECTION**
- Şu an iki bölüm (~1.000 token): SPEC-FIRST (sayısal → spec'e git) + searchFaq (SKU-aware FAQ)
- **Yeni yapı:** Tek "VERİ KAYNAĞI SEÇİMİ" başlığı (3 kural):
  - Sayısal/teknik soru → getProductDetails.technicalSpecs (deterministik)
  - Nüanslı ürün sorusu + SKU biliniyor → searchFaq(sku)
  - Genel soru (ürün belirsiz) → searchFaq (cross-product)
- **Hedef token:** 600. Net **-400**.
- **Risk:** LLM "bu sayısal mı değil mi" karışıklığı — mitigate: sayısal keyword enum'u (km, ay, pH, ml/araç, hardness) explicit listele.

### 🔴 Yüksek risk (dikkatli tartılmalı)

**9.6. KEYWORD TUZAK MAPPING (searchProducts tool description) 11 → 3 örnek**
- Tool description'da kritik tuzaklar: seramik vs cam, pasta vs compound, şampuan tipi.
- Microservice sub_type inverse mapping (Fix E) bu tuzakları back-end'de enforce ediyor.
- **Riski:** LLM templateGroup parametresini `glass_cleaner_protectant` yerine `ceramic_coating` koyabilir (manuel seçim). Microservice auto-filter eklese de LLM'in initial choice'ı yine önemli.
- **Öneri:** Top-3 tuzak kalsın, diğerleri için "microservice slot extractor kalanını halleder, ama template enum değerlerini biliyorsan koy" kuralı.
- **Hedef token:** -150.
- **Risk:** Orta-yüksek — bot test gerektirir.

### Özet tablo

| Öneri | Tasarruf | Risk | Sıra |
|---|---|---|---|
| 9.1 PROACTIVE + RELEVANCE birleştir | -500 | Düşük | 1 |
| 9.5 SPEC-FIRST + searchFaq merge | -400 | Orta | 2 |
| 9.4 META FİLTRE tablosu kısalt | -350 | Orta | 3 |
| 9.2 RATINGS v9.0 + v10 merge | -150 | Düşük | 4 |
| 9.6 KEYWORD TUZAK trim | -150 | Yüksek | 5 |
| 9.3 Versiyon tag trim | -80 | Yok | 6 |
| **TOPLAM (9.1-9.3 agresif)** | **-1.630** | — | ~25% reduction |
| **Conservative (9.1+9.2+9.3)** | **-730** | Düşük | ~11% reduction |

---

## 10. Riskler

### Şu anki durum (revert YOK, forward fix)
- **Microservice prod'da:** 7 fix canlı (Fly.io 2 machine healthy)
- **Bot Cloud'da:** Son deploy `ceab509` (20:00, Round 1 başlamadan önce). Round 1 + Round 2 instruction değişiklikleri (bd647c5, 5f23e8c) deploy edilmedi.
- **Lokal adk dev:** v10.1 + hotfix, syntax error giderildi, konuşma akışı açıldı.

### Revert yapılsa etkileri

| Kapsam | Etki |
|---|---|
| Sadece v10.1 (`5f23e8c`) revert | Instruction token -800, searchByRating enforcement + pre-yield relevance kaldırılır. Anti-hallucination soft kurala düşer. |
| v10 + v10.1 revert (`bd647c5` + `5f23e8c`) | Toplam ~-1.400 token. RAG FAQ, proactive fallback, re-tool, curator hepsi kaybolur. searchFaq Round 1'deki sorunlu davranışa geri döner. |
| Round 2 commit (`49fc83c`) revert | `base_name` fix, `paint_coating_kit` family, variant price SQL geri alınır. Migration 007 DB'de kalır (boş kolon zararsız). Carousel title duplication geri gelir. |
| Tümü revert (Round 1+2) | Prod test geçen 12+ fix kaybedilir. Phase 4.10 deploy state'ine dönülür. |

### Kullanıcı kararı beklenen

1. Hangi fix'ler korunacak, hangileri tartışılacak?
2. Carousel tek-variant özelliği (bulgu #14) yeni commit olarak mı Phase 5'e mi?
3. Instruction sadeleştirme (9.1-9.3) şimdi mi, bot Cloud deploy öncesi mi, sonrası mı?
4. Bot Cloud deploy: instruction v10.1 ve microservice fix'leri Cloud bot'a taşınacak mı (şu an instruction Cloud'da yok)?

---

**Rapor oluşturulma:** 2026-04-22
**Kaynak:** `git log --since="16 hours ago"` + `wc -l` + trace DB `ai.system_length` + inspect-phase4-round2 SQL çıktıları.
