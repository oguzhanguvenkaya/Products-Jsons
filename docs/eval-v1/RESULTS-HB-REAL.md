# HB Real-World Eval — Bare vs Context Mode + Phase 1.1.13K/L Karşılaştırması

**Son güncelleme:** 2026-05-03
**Fazlar:** 1.1.13J (eval altyapı + storage rule) + 1.1.13K (leather konsolidasyon + slot disambiguation) + 1.1.13L (slot extractor stale canonical fix)
**Baseline:** v1.1.10b-baseline + Phase 1.1.13G/H/J/K/L
**Çıktılar:**
- `docs/eval-v1/results-hb-real-bare.jsonl` (baseline)
- `docs/eval-v1/results-hb-real-context-before-13K.jsonl` (snapshot before 13K)
- `docs/eval-v1/results-hb-real-context-before-13L.jsonl` (snapshot before 13L)
- `docs/eval-v1/results-hb-real-context.jsonl` (current — Phase 1.1.13L sonrası)

---

## 1. Test mantığı + ground truth

### Veri kaynağı

- **Ham havuz:** `hb_QA_unique.json` 1269 Hepsiburada Q&A
- **Eval set:** subagent ile stratified seçim → 191 senaryo (intent × SKU × kalite)
- **Ground truth:** `sku_db` — kullanıcı bu soruyu sorduğunda HB'de hangi ürün sayfasındaydı, bot **o ürünü** bulmalı

### İki test modu

| Mod | Query format | Amaç |
|---|---|---|
| `bare` | `q.soru` (raw) | Saf retrieval baseline, ürün bağlamı YOK |
| `context` | `${q.urun_adi} — ${q.soru}` | HB ürün sayfası bağlamı simülasyonu |

**Neden iki mod?** Gerçek HB senaryosunda kullanıcı belirli bir ürün sayfasındadır ve soruda ürün adını yazmayabilir ("son kullanma tarihi nedir?"). Bot bu bağlamı sayfa context'inden alır. Bare mod bu bağlamı vermez (alt sınır), context mod verir (gerçekçi sınır).

### Pass kriterleri

- **Testable intent** (product_spec, surface_compat, recommendation, comparison, application, storage_safety, effect_outcome, kit_contents, compat_other): top-8 (variant_skus dahil) içinde `sku_db` var → pass
- **Adversarial** (`sku_db` NULL, DB'de gerçekten YOK): top-8'de high-similarity (>0.7) match YOK → pass (halüsinasyon önleme)
- **off_topic** (kargo/iade/fiyat): skip

### Kapsam dışı uyarılar

- **Bot LLM bypass.** Gerçek bot Gemini ile slot extraction yapıyor (`templateGroup`, `brand`, `exactMatch`, hangi tool); biz yapmadık. Bu test yalnız retrieval pipeline'ı (BM25 + vector + RRF + slot extractor + meta filter) ölçer.
- **lastFocusSku/state yok.** Gerçek sohbette `state.lastFocusSku` ile FAQ/details sorgusu yapılır; biz yapmadık.

---

## 2. Bare vs Context — Özet

| Intent | Bare pass | Bare % | Context pass | Context % | Δ |
|---|---|---|---|---|---|
| product_spec | 20/53 | 37% | 40/53 | 75% | +20 |
| surface_compat | 12/35 | 34% | 30/35 | 85% | +18 |
| product_recommendation | 7/33 | 21% | 28/33 | 84% | +21 |
| comparison | 6/20 | 30% | 17/20 | 85% | +11 |
| application | 2/15 | 13% | 12/15 | 80% | +10 |
| storage_safety | 0/11 | 0% | 9/11 | 81% | +9 |
| adversarial_not_in_db | 6/8 | 75% | 2/8 | 25% | -4 |
| effect_outcome | 4/5 | 80% | 5/5 | 100% | +1 |
| kit_contents | 1/4 | 25% | 3/4 | 75% | +2 |
| compatibility_with_other_product | 1/2 | 50% | 0/2 | 0% | -1 |
| off_topic | – (skip 5) | – | – (skip 5) | – | – |
| **TOPLAM** | **59/186** | **31%** | **146/186** | **78%** | **+87** |

### Match position dağılımı

| Mode | Matched | top-1 | top-3 | top-5 |
|---|---|---|---|---|
| Bare | 53 | 12 (22%) | 28 (52%) | 38 (71%) |
| Context | 144 | 76 (52%) | 134 (93%) | 142 (98%) |

**Yorum:** Context mode'da match pozisyonu çok temiz — top-3 %93, top-5 %98. Yani retrieval doğru ürünü bulduğunda **neredeyse her zaman ilk 3-5 sırada** veriyor. Bu retrieval pipeline kalitesi açısından sağlıklı bir sinyal.

---

## 3. Adversarial regresyon (beklenen davranış)

Adversarial 75% → 25% düştü. Bu **test artifact'ı**, gerçek bir bug değil:

- Adversarial sorularda `sku_db=NULL` (DB'de YOK)
- Bare mod'da: raw soru → retrieval düşük similarity → "no match" pass
- Context mod'da: `urun_adi` prepend → retrieval o ürünü buluyor (yüksek similarity) → "high-sim match" fail

**Sonuç:** Adversarial test bare mode'da anlamlı; context mode'da uygun değil. Rapor değerlendirilirken adversarial'i bare sayısı ile alın.

---

## 4. Per-intent fail örnekleri (context mode'da hâlâ fail edenler)

### product_spec (13 fail) — variant precision sorunu

| ID | Sorulan | Expected | Got top-3 |
|---|---|---|---|
| HB132 | "Tabanı 150mm olan orta sert sünger uyumlu mu" | 26900.223.010 (150mm) | 22930.261.001, 22984.281.001, 22203.261.001 |
| HB138 | "1 mi 2 mi sünger" | 26900.224.011 | 22828.261.001, 22828.281.001, 22748.261.001 |

**Pattern:** Aynı tip ürünün farklı variant'ları döndü (130/150mm vs 150mm sünger). Ground truth tek bir variant SKU; retrieval başka variant verdi. Eval pass kriteri çok dar — variant-level değil, base-product level olabilir.

### product_recommendation (5 fail) — 0 sonuç vakaları

| ID | Sorulan | Expected | Got |
|---|---|---|---|
| HB093 | "camda inatçı su lekeleri için ne kullanmalıyım" | Q2M-APYA4000M (APC) | (boş) |
| HB104 | "Tesla beyaz PU koltuk için natural mı strong mı" | Q2M-LCN500M | (boş) |

**Pattern:** "X için ne kullanmalıyım" karşılaştırma soruları retrieval pipeline'da hiç sonuç dönmüyor. Bot LLM gerçekte iki ayrı searchProducts çağırıp natural/strong'u karşılaştırabilir; raw query'de bu yok.

### surface_compat (5 fail) — yüzey filter zayıflığı

| ID | Sorulan | Expected | Got |
|---|---|---|---|
| HB073 | "alcantara kumaş için bu ürün uygun mu" | Q2M-LCSYA500M (Leather Cleaner Strong) | Q2M-FCNA1000M (FabricCleaner) |
| HB075 | "tavan döşemesi silmek için kullanılabilir mi" | Q2M-BWE4040 (Baldwipe) | Q2M-LWE40402P, IPE4P |

**Pattern:** Doğru kategori bulundu (microfiber bez, leather cleaner) ama ground truth variant değil — yan ürün döndü. Yine variant precision.

### comparison (3 fail) — "X mi Y mi" multi-product

| ID | Sorulan | Expected | Got |
|---|---|---|---|
| HB052 | "Leathercleaner Strong'tan farkı nedir" | Q2M-LCN500M (Natural) | Q2M-FCNA1000M (FabricCleaner) |
| HB055 | "350 TL olan ürünle farkı nedir" | 79586-644 | 79643 |
| HB062 | "Bu cihaz hem orbital hem rotary işlevi görüyor mu?" | 418072 | 533021, 447129, 418080 |

**Pattern:** İki ürün karşılaştırması, retrieval birini buluyor diğerini kaçırıyor. Bot LLM iki search yapıp karşılaştırırdı.

### application (3 fail), storage_safety (2 fail), kit_contents (1 fail), compat_other (2 fail)

Çoğunda 0-2 sonuç döndü. Bu sorular retrieval'a değil, FAQ/getProductDetails'a yönelik. Gerçek bot bu intent'lerde başka tool çağırırdı.

### adversarial (6 fail) — yukarıda açıklandı, test artifact.

---

## 5. Failure mode sınıflandırması (context mode 35 fail)

| Sınıf | Adet | Açıklama |
|---|---|---|
| **Variant precision** | ~14 | Doğru ürün ailesi bulundu ama farklı variant döndü (sünger, microfiber, leather cleaner). Ground truth çok dar veya base-product matching gerek. |
| **Karşılaştırma multi-search** | ~6 | "X mi Y mi" — iki ayrı search gerek, raw query yetersiz. Bot LLM gerçekte yapardı. |
| **0-sonuç** | ~9 | Spesifik teknik soru ("xaomi kompresör uyumlu mu") retrieval bulamıyor. FAQ/details ile çözülür. |
| **Adversarial test artifact** | 6 | Context'te ürün adı eklendi, retrieval buluyor — beklenen davranış, gerçek bug değil. |

---

## 6. Skor revizyon değerlendirmesi

- **Saf retrieval bare:** 59/186 = %31.7 (alt sınır)
- **Saf retrieval context:** 146/186 = %78.5 (gerçekçi retrieval kalitesi)
- **Match position kalitesi:** top-3 %93, top-5 %98 (matched arasında — retrieval doğruyu bulduğunda ilk sıralarda)
- **Bot LLM ile gerçek pass rate:** Bilinmiyor — manuel webchat veya bot LLM ile re-run gerek

Context mode'daki %78.5 **retrieval pipeline'ın gerçekçi kalitesi** sinyalidir. Bot LLM (slot extraction + multi-tool) eklendiğinde bu rakam **daha da yükselebilir** — özellikle karşılaştırma + 0-sonuç fail'lerinde.

---

## 6B. Phase 1.1.13K — leather konsolidasyon + slot disambiguation sonuçları

### Yapılan değişiklikler (özet)

- DB: 7 ürün `template_group: leather_care` → `interior_cleaner` (sub_type aynı)
- types.ts: `leather_care` enum'dan kaldırıldı, `normalizeTemplateGroup()` alias shim 3 endpoint'te aktif (deprecated log üretir)
- slotExtractor: 4 değişiklik (leather_dressing → interior_cleaner, fabric_leather pattern daraltıldı) + 2 yeni rule (`leather_cleaner` öncelikli, `water_spot_remover`)
- search-products + sister tools: 25 → 24 templateGroup, 4 yeni deri mapping + 1 su lekesi mapping
- Bot instruction (conversations/index.ts): deri/su lekesi mapping güncellendi
- search_text 494 ürün regenerate, 7 SKU embedding refresh

### Bare vs Context (Phase 1.1.13K sonrası)

| Intent | Bare | Context (before 13K) | Context (after 13K) | Δ (13K etkisi) |
|---|---|---|---|---|
| product_spec | 20/53 (37%) | 40/53 (75%) | 39/53 (73%) | -1 |
| surface_compat | 12/35 (34%) | 30/35 (85%) | 30/35 (85%) | +0 |
| product_recommendation | 7/33 (21%) | 28/33 (84%) | 29/33 (87%) | +1 |
| comparison | 6/20 (30%) | 17/20 (85%) | 18/20 (90%) | +1 |
| application | 2/15 (13%) | 12/15 (80%) | 11/15 (73%) | -1 |
| storage_safety | 0/11 (0%) | 9/11 (81%) | 9/11 (81%) | +0 |
| adversarial_not_in_db | 6/8 (75%) | 2/8 (25%) | 2/8 (25%) | +0 |
| effect_outcome | 4/5 (80%) | 5/5 (100%) | 5/5 (100%) | +0 |
| kit_contents | 1/4 (25%) | 3/4 (75%) | 3/4 (75%) | +0 |
| compatibility_with_other_product | 1/2 (50%) | 0/2 (0%) | 0/2 (0%) | +0 |
| **TOPLAM** | **59/186 (31.7%)** | **146/186 (78.5%)** | **146/186 (78.5%)** | **+0** |

**Net pass rate değişmedi** ama hedef senaryoların durumu kritik:

### Hedef senaryolar — başarı doğrulaması

| ID | Önce | Sonra | Sonuç |
|---|---|---|---|
| **HB073** (alcantara, Strong) | FAIL pos=-1 | **PASS pos=2** | Q2M-LCSYA1000M Strong **top-1**, Q2M-LCSYA500M variant top-2 ⭐ |
| **HB052** (Natural vs Strong farkı) | FAIL pos=-1 | **PASS pos=2** | Q2M-LCN1000M Natural **top-1**, Q2M-LCN500M top-2 ⭐ |
| HB093 (su lekesi, APC ground truth) | FAIL pos=-1 | hâlâ FAIL pos=-1 | 0 sonuç — slot extractor "apc" pattern (urun_adi'nda) `interior_apc` öncelikli match'liyor, "su lekesi" → water_spot_remover'a geçemiyor |
| HB016 (adversarial, mavi/siyah Tire) | FAIL high-sim | hâlâ FAIL high-sim | dataset etiket hatası, retrieval doğru iki ürünü buluyor |

### Net etkisinin sıfır görünmesinin sebebi

13K **+2 hedef pass** (HB073, HB052) sağladı, ama yan etkiler:
- **product_spec -1, application -1:** slot extractor'da generic "deri temizleyici" pattern fabric_leather_cleaner'dan kaldırıldığı için bazı sorgular farklı sub_type'a düşmüş olabilir. Spot-check gerekli (hangi 2 senaryo regress oldu).
- **comparison +1, recommendation +1:** leather konsolidasyonu sayesinde Strong/Natural ailesi sorgularda daha iyi ranking.

### Match position dağılımı

| Mode | Matched | top-1 | top-3 | top-5 |
|---|---|---|---|---|
| Context (before 13K) | 144 | 76 (53%) | 134 (93%) | 142 (99%) |
| Context (after 13K) | 144 | 73 (51%) | 134 (93%) | 142 (99%) |

top-1 -3, top-3/top-5 stabil. Kazanılan top-1'ler (HB073, HB052) ve kaybedilen top-1'ler (3 senaryo) net -3 vermiş.

### HB093 niye hâlâ 0 sonuç — diagnostic

Tam query: `"Gyeon Q²m Apc Çok Amaçlı Genel Yüzey Temizleyici - 4000 ml — aracın tavan kısmında ve camlarda inatçı su lekeleri mevcut, hangi ürün kullanımı uygundur?"`

Slot extractor'da rule sırası:
1. `interior_apc` (`'apc'`, `'cok amacli temizleyici'`) → **urun_adi'nda match** → `templateGroup=interior_cleaner, templateSubType=interior_apc`
2. `water_spot_remover` (`'su lekesi temizleyici'`, `'kireç çözücü'`) → match olmaz çünkü ilk match kazanır

Sonuç: retrieval `interior_cleaner/interior_apc` filter ile arıyor, WaterSpot `contaminant_solvers/water_spot_remover` altında → 0 sonuç.

**Çözüm seçenekleri (ileri faz):**
- A. Slot extractor multi-match desteği (multiple sub_type/templateGroup return)
- B. "su lekesi"/"kireç" daha güçlü intent sinyali sayılırsa interior_apc'yi override et
- C. Bot LLM gerçekte söz konusu — slot extractor backup, bot LLM önce templateGroup karar verir

Bu fazın kapsamı dışında, ayrı diagnostic faz.

---

## 6C. Phase 1.1.13L — Slot Extractor Stale Canonical Fix

### Tetikleyici

Kullanıcı keskin gözlem: "interior_apc diye sub_type yok ki, slot extractor mi bu çıkarımı yapıyor?". Tarama sonucu Phase 2R rename'i sırasında DB'de `multi_surface_apc`'ye geçilmiş ama slot extractor canonical hâlâ `interior_apc` kullanıyordu. Bu mismatch HB093'te 0-sonuç bug'ının kök sebebi.

### Yapılan değişiklikler

`retrieval-service/src/lib/slotExtractor.ts`:

1. **Canonical rename:** `interior_apc` → `multi_surface_apc` (DB'deki gerçek sub_type adı)
2. **water_spot_remover pattern coverage genişletildi:** "su lekesi", "su lekeleri", "su izi", "su izleri", "inatçı su lekesi" eklendi (compound only, false-positive risk mitigasyonu için tek başına "kireç" eklenmedi)

### Sonuçlar

| Intent | Before 13L | After 13L | Δ |
|---|---|---|---|
| product_spec | 39/53 (73%) | 39/53 (73%) | +0 |
| surface_compat | 30/35 (85%) | 29/35 (82%) | -1 |
| product_recommendation | 29/33 (87%) | 30/33 (90%) | +1 |
| comparison | 18/20 (90%) | 18/20 (90%) | +0 |
| application | 11/15 (73%) | 11/15 (73%) | +0 |
| storage_safety | 9/11 (81%) | 10/11 (90%) | +1 |
| adversarial_not_in_db | 2/8 (25%) | 2/8 (25%) | +0 |
| effect_outcome | 5/5 (100%) | 5/5 (100%) | +0 |
| kit_contents | 3/4 (75%) | 3/4 (75%) | +0 |
| compatibility_with_other_product | 0/2 (0%) | 0/2 (0%) | +0 |
| **TOPLAM** | **146/186 (78%)** | **147/186 (79%)** | **+1** |

### Kazanılan / kaybedilen senaryolar

**Kazanılan (3):**
- ⭐ **HB093** (su lekesi APC) — Q2M-APYA4000M sim=0.830 **TOP-1** (önce 0 sonuç)
- HB029 (storage_safety) — son kullanma tarihi
- HB160 (product_spec) — su miktar/dilution

**Kaybedilen (2) — DATASET ETİKET HATASI:**
- **HB066** "ppf kaplı arabalarda kireç/su lekesi giderme" — ground truth Q2M-PPFW500M (PPF Wash, sayfa SKU). Ama `beklenen_cevap` aslında: **"var olan kireç lekelerini gidermek için GYEON Q²M WaterSpot..."** — yani satıcı WaterSpot önermiş! Retrieval Q2M-WSYA1000M top-1 dönüyor; **gerçekten doğru cevap**, dataset etiketi yanlış (ground truth sayfa SKU değil çözüm SKU olmalı).
- **HB142** "PPF kaplama su lekelerini geçirir mi" — ground truth Q2M-RWYA500M (Restart Wash). Top-1 Q2M-WSYA1000M (WaterSpot). Beklenen cevap link içeriyor, çözüm ürünü doğrulanamadı ama benzer pattern.

### Net kazanç değerlendirmesi

- Yüzeysel: +1 net pass (146 → 147)
- Düzeltme sonrası (HB066/HB142 dataset hatası kabul edilirse): **+3 net pass** (149/186 = %80)

### HB093 başarı doğrulaması

Filter chain (slot extractor sonrası):
- `templateGroup='interior_cleaner'` (urun_adi'nda "Apc Çok Amaçlı Genel Yüzey Temizleyici")
- `templateSubType='multi_surface_apc'` (canonical fix sayesinde DB ile uyumlu)
- `brand='GYEON'`
- Sonuç: Q2M-APYA4000M sim=0.830 **TOP-1**, Q2M-TRC500M sim=0.741 top-2

### Açık not — kısa pattern false-positive riski

"su lekesi" / "su lekeleri" pattern length 9-11 karakter. Bazı bağlamlarda yanlış yönlendirebilir (örn. PPF su lekesi sorgusunda water_spot_remover yerine PPF maintain ürünü bekleniyorsa). HB066/HB142 fail'leri buna örnek; ancak ground truth düzeltilirse retrieval doğrudur. İleri faz: pattern öncelik veya intent context analysis.

---

## 6D. Phase 1.1.13M — answer_sku Ground Truth Revize

### Kavramsal düzeltme

Önceki tüm fazlarda `sku_db` field'ı **ground truth** olarak kullanıldı. Ama bu field aslında **kullanıcının baktığı HB sayfa SKU'su** (context_sku). Gerçek doğru cevap = **satıcının önerdiği ürün** (answer_sku) — kullanıcı yanlış sayfada olabilir veya satıcı alternatif öneriyor.

Subagent ile 191 satırın `beklenen_cevap` + `cevapta_url` parse edildi, 3 yeni field eklendi: `answer_sku`, `answer_sku_alt`, `answer_method`. eval-hb-real.ts pass criteria revize edildi:
- Truth = `answer_sku ?? sku_db` + `answer_sku_alt`
- Skip kuralı genişletildi: off_topic + no_product_in_answer + unparseable

### Subagent extraction sonuçları

| Method | Sayı | Anlam |
|---|---|---|
| confirms_context | 55 | Satıcı sayfa ürününü onaylıyor → answer_sku == sku_db |
| info_only_about_context | 63 | Teknik bilgi (raf ömrü, kullanım) → answer_sku == sku_db |
| **recommends_alternative** | **43** | Satıcı farklı ürün öneriyor → **answer_sku != sku_db** |
| unparseable | 25 | Parse edilemedi (genelde adversarial) — SKIP |
| no_product_in_answer | 5 | Cevap ürün önerisi içermiyor (kargo/iade) — SKIP |

### Bare/Context (eski ground truth) vs Phase 1.1.13M (yeni answer_sku)

| Intent | Before 13M (sku_db) | After 13M (answer_sku) |
|---|---|---|
| product_spec | 39/53 (73%) skip=0 | 25/46 (54%) skip=7 |
| surface_compat | 29/35 (82%) skip=0 | 28/34 (82%) skip=1 |
| product_recommendation | 30/33 (90%) skip=0 | 23/32 (71%) skip=1 |
| comparison | 18/20 (90%) skip=0 | 13/15 (86%) skip=5 |
| application | 11/15 (73%) skip=0 | 8/11 (72%) skip=4 |
| storage_safety | 10/11 (90%) skip=0 | 8/9 (88%) skip=2 |
| adversarial_not_in_db | 2/8 (25%) skip=0 | 1/3 (33%) skip=5 |
| effect_outcome | 5/5 (100%) skip=0 | 5/5 (100%) skip=0 |
| kit_contents | 3/4 (75%) skip=0 | 3/4 (75%) skip=0 |
| compatibility_with_other_product | 0/2 (0%) skip=0 | 0/2 (0%) skip=0 |
| **TOPLAM** | **147/186 (79%)** skip=5 | **114/161 (70.8%)** skip=30 |

Match position kalitesi (matched arasında) hâlâ yüksek: top-1 %50, top-3 %89, top-5 %96.

### Kritik bulgu: cross-brand öneri eksikliği

Pass rate 9 puan düştü (%79 → %71). Sebep tek başına bir bug değil — satıcının cross-brand öneri davranışı retrieval pipeline'ın yakaladığından farklı. Hedef senaryolar:

| ID | sku_db | answer_sku | retrieval top-1 | Sonuç | Sebep |
|---|---|---|---|---|---|
| HB066 | Q2M-PPFW500M (PPF Wash) | **Q2M-WSYA500M** (WaterSpot, alt: Q2M-PPR1000M) | Q2M-WSYA1000M | ✅ PASS | Aynı ürün ailesi (variant_skus) |
| HB142 | Q2M-RWYA500M (Restart Wash) | **79290** (INNOVACAR DS SCALE) | Q2M-WSYA1000M (GYEON) | ❌ FAIL | Cross-brand: GYEON → INNOVACAR öneri |
| HB093 | Q2M-APYA4000M (APC) | **701350** (INNOVACAR 0 SCALE) | Q2M-APYA4000M (GYEON APC) | ❌ FAIL (önce PASS) | Cross-brand: GYEON → INNOVACAR öneri |
| HB073 | Q2M-LCSYA500M (Strong) | **79818** (INNOVACAR X2 FABRICS&LEATHER) | Q2M-LCSYA1000M (GYEON Strong) | ❌ FAIL (önce PASS) | Cross-brand: GYEON → INNOVACAR öneri |
| HB052 | Q2M-LCN500M (Natural) | Q2M-LCN500M (info_only) | Q2M-LCN1000M | ✅ PASS | Aynı ürün, info_only |

**Pattern:** Satıcı GYEON sayfasındayken sıkça INNOVACAR / FRA-BER / EPOCA alternatifi öneriyor. Retrieval pipeline `urun_adi`'ndan `brand=GYEON` slot çıkarıp sadece GYEON ürünlerini filterliyor → cross-brand alternatifler retrieval'a hiç girmiyor.

### Yorumlama

**%70.8 pass rate, %79'dan daha gerçekçi sinyal.** Eski metrik "sayfa SKU bulundu mu" idi — kolay ama anlamsız. Yeni metrik "satıcı önerdiği ürün top-N'de mi" — gerçek bot davranışı kalitesi.

İki ayrı problem:
- **Retrieval pipeline çoğunlukla doğru (top-3 %89, top-5 %96)** — tek brand içinde sıralama temiz
- **Cross-brand öneri sıralaması zayıf** — slot extractor `brand` field'ını çok katı uyguluyor, satıcı önerisi çoklu marka kapsıyor

### Çözüm seçenekleri (gelecek faz)

1. **Slot extractor brand opsiyonel:** "GYEON Apc" geçen sorguda brand=GYEON çıkar **ama** "alternatif öner" sinyali varsa brand'ı drop et. Pattern: "yoksa", "alternatif", "başka", "öner".
2. **Retrieval rerank multi-brand:** Top-N içinde brand çeşitliliği artır (RRF parametre tuning).
3. **Bot LLM açısından:** "ürün önerisi" intent'inde bot iki search yapar — biri current brand, biri brand-agnostic.
4. **DB FAQ enrichment:** Satıcının önerdiği ürünleri product_faqs tablosuna ekle → bot `searchFaq` ile direkt cevabı bulur (kullanıcının ileride yapacağı iş).

---

## 7. Öneriler / sonraki adımlar

1. **Storage_safety bot kuralı eklendi** (Phase 1.1.13J B): bot LLM artık kimyasal ürünlerde "açıldıktan sonra 3 yıl" standart cevap verecek. Smoke test gerekli (HB024-HB033 örneklerinden 3-5 tanesi gerçek bot ile).

2. **Variant precision fail'leri gerçek bug mu?** İncelemeye değer: pass kriteri `sku_db` veya `variant_skus` içinde diyor — ama ground truth SKU bazen variant değil base-product. Pass criteria gevşetme önerisi: `template_group + template_sub_type + brand` üçlüsü match olsa pass say.

3. **Karşılaştırma + 0-sonuç fail'leri için bot LLM re-run.** Tek senaryo (HB093, HB104, HB052) gerçek bot ile manual oyna → tool sequence görülür.

4. **Bare mode adversarial baseline** olarak kalır — context mode'da değerlendirilmez.

5. **product_spec/surface_compat'te kalan 18 fail için spot-check.** Variant precision dışında gerçek retrieval gap var mı, üst düzey diagnostic.

6. **Phase 1.1.13K side regression spot-check** (NEW): product_spec -1, application -1 — hangi 2 senaryo regress oldu, slotExtractor'dan "deri temizleyici" generic kaldırılması mı sebep?

7. **HB093 slot extractor multi-match veya intent priority** (NEW): "apc + su lekesi" gibi compound query'lerde hangi rule kazanır kararı.

8. **Alias shim deprecated log monitoring** (NEW): production'da `[deprecated-alias] templateGroup=leather_care` log sayısı izlenip eski runtime tespit edilmeli, sıfıra düştüğünde shim silinebilir.

---

## 8. Test komutları

```bash
# Microservice çalışıyor olmalı (port 8787)
cd retrieval-service && bun run dev

# Bare mode (baseline reference)
cd retrieval-service && MODE=bare bun ../docs/eval-v1/eval-hb-real.ts

# Context mode (gerçekçi)
cd retrieval-service && MODE=context bun ../docs/eval-v1/eval-hb-real.ts

# Çıktılar
ls docs/eval-v1/results-hb-real-{bare,context}.jsonl
```
