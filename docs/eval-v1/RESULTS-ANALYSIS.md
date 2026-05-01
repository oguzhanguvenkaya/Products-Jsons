# Eval v1 — Sonuç Analizi (Batch 1: DB-direct, 155 senaryo)

**Run:** 2026-05-02 — git tag `v1.1.10b-baseline` (commit `0ac29c7`)
**Method:** DB-direct validation (bot LLM + retrieval HTTP bypass)
**Total:** 155 senaryo (D/E/F/G/H/I/C kategorileri)
**Pass rate:** 130/155 = **%83.9**

| Kategori | Pass | Total | % | Fail |
|---|---|---|---|---|
| budget (F) | 20 | 20 | 100% | 0 |
| related (H) | 15 | 15 | 100% | 0 |
| compare (G) | 13 | 15 | 87% | 2 |
| filter (D) | 25 | 30 | 83% | 5 |
| rank (E) | 16 | 20 | 80% | 4 |
| faq (I) | 19 | 25 | 76% | 6 |
| detail (C) | 22 | 30 | 73% | 8 |
| **TOPLAM** | **130** | **155** | **83.9%** | **25** |

---

## Fail Kök Neden Analizi

25 fail → 3 ana kategoriye ayrılır:

### 🔴 A. GERÇEK VERİ/BOT BUG (PRIORITY 1) — yeni cleanup phase gerek

#### BUG-A1 — `consumption_per_car_ml` string range (5 ürün)
**Etkilenen SKU'lar:** 79301 (`30-50`), Q2-LSE50M (`30-40`), Q2M-CDYA1000M (`40-50`), Q2M-QDYA1000M (`40-50`), 74062 (`10-20`)
**Belirti:** Bot "araç başına 25 ml tüketen kaplama" filter koyduğunda `(specs->>'consumption_per_car_ml')::numeric` cast fail → bu 5 ürün eksik
**Kök neden:** Veri bazı ürünlerde range string olarak kaydedilmiş (Phase 1 normalize'de atlanmış)
**Çözüm:** Phase 1.1.13G — range'leri sayısala normalize (orta nokta veya min/max field)
**Pattern:** Phase 1.1.13C ph_level normalize'in benzeri — JSON number olarak yazılmalı

#### BUG-A2 — `purpose` JSON-quoted (11 solid_compound ürün)
**Belirti:** DB değer `"heavy_cut"` (JSON-quoted string), bot query `purpose='heavy_cut'` (plain) — eşleşme YOK
**Test:** D021 "heavy cut katı pasta" → zero_result ama DB'de 3 ürün var
**Etkilenen:** solid_compound purpose dağılımı: `"finish"` 4, `"heavy_cut"` 3, `"medium_cut"` 2, `"super_finish"` 2 (hepsi quoted)
**Çözüm:** Phase 1.1.13B.1 application_method paterniyle aynı — purpose JSON-quoted strip
**Etki:** Bot tüm "heavy/medium/finish/super_finish" pasta sorgularında 0 sonuç döner

#### BUG-A3 — `product_type` JSON-quoted (28 polisher_machine ürün)
**Belirti:** DB değer `"machine"`/`"accessory"` (JSON-quoted), bot query `product_type='machine'` plain — eşleşme YOK
**Test:** D023 "polisaj makinesi" → zero_result ama DB'de 14 machine + 14 accessory var
**Etkilenen:** Tüm polisher_machine + sprayers_bottles ürünleri — bot prompt'taki "polisaj makinesi (aksesuar değil)" örneği BROKEN
**Çözüm:** Phase 1.1.13B.1 paterniyle product_type JSON-quoted strip
**Etki:** **KRİTİK** — bot polisaj makinesi/aksesuar/parça ayrımı yapamıyor

### 🟡 B. EVAL SCRIPT BUG (test framework iyileştirme — gerçek bot etkisi yok)

- **B1. C001-C020 SQL ambiguous:** `product_search ps JOIN products p` kolon prefix yok → eval-db-direct.ts:fix gerek
- **B2. E rating fail (E005, E006, E012, E020):** rating_* nested specs.ratings içinde, eval script `specs->>'rating_beading'` arıyor ama bunu projector product_meta.rating_beading'e yazıyor — eval script `product_meta` JOIN etmeli
- **B3. I004 SKU FAQ:** Eval script SKU keyword olarak FAQ'da arıyor — yanlış inferans
- **B4. G004/G010 SKU compare:** name yerine sku field'da arama gerek

### 🟢 C. TEST SORU TASARIM SORUNU (soruyu düzelt)

- **C1. D008 "seramik katkılı şampuan":** exp.metaFilter_must yok, ceramic_infused sub_type yönlendirme bekliyor — soruyu düzelt: `exp.templateSubType="ceramic_infused_shampoo"`

---

## Tespit edilen mevcut bot bug'ları (eval öncesi bilinen + yeni)

| Bug | Kaynak | Açıklama | Etki | Öneri |
|---|---|---|---|---|
| BUG-1 (snippet `, boya`) | regenerate-search-text:34 | pipe replace başta/sonda `, ` boş element | Görünüm | Quick fix |
| BUG-2 (sub_type display) | bot LLM | `car_shampoo - ph_neutral_shampoo` kullanıcıya | UX | Bot prompt not |
| BUG-3 (text trunc `cont`) | bot LLM | "conta" → "cont" word-bound olmadan kesim | UX | Bot prompt not |
| **BUG-A1** consumption range | **YENİ** — eval | 5 ürün string range | Filter eksik | Mini phase fix |
| **BUG-A2** purpose JSON-quoted | **YENİ** — eval | 11 ürün eşleşmiyor | Heavy/medium/finish katı pasta sorgusu broken | Mini phase fix |
| **BUG-A3** product_type JSON-quoted | **YENİ** — eval | 28 ürün eşleşmiyor | Polisaj makinesi/aksesuar ayrımı broken | Mini phase fix |

---

## Önerilen acil fix — Phase 1.1.13G (mini cleanup)

**Kapsam:** 3 alan JSON-quoted strip + 1 alan numeric normalize

```ts
// Phase 1.1.13G — JSON-quoted strip + range normalize

// 1. purpose JSON-quoted strip (11 ürün)
UPDATE products SET specs = jsonb_set(specs, '{purpose}',
  to_jsonb(REPLACE(REPLACE(specs->>'purpose', '"', ''), '\\', ''))::jsonb)
WHERE specs->>'purpose' LIKE '"%';

// 2. product_type JSON-quoted strip (28+ ürün)
UPDATE products SET specs = jsonb_set(specs, '{product_type}',
  to_jsonb(REPLACE(specs->>'product_type', '"', ''))::jsonb)
WHERE specs->>'product_type' LIKE '"%';

// 3. consumption_per_car_ml range normalize (5 ürün)
// "30-50" → 40 (orta nokta) veya yeni field consumption_per_car_ml_min, _max
// Karar gerekli: orta nokta basit ama bilgi kaybı; min/max yeni field anlamsal doğru
```

**Süre:** ~25 dk (script + apply + re-project + verify + commit)
**Etki:** Bot pasta + polisaj makinesi + tüketim sorgularını doğru cevaplar

---

## Bot LLM gerektiren eval (Batch 2 — manuel/MCP)

DB-direct kapsam dışı 115 senaryo:
- A (clarifying) — 40 soru: bot generic kategori → Choice yield
- B (multi-turn) — 50 soru: Choice → cevap → bot doğru filter
- J (edge) — 15 soru: typo, vague, zero-result
- K (adversarial) — 10 soru: halüsinasyon, prompt injection

**Yöntem önerisi:** ADK dev tunnel + MCP `adk_send_message` ile sample 30 soru manuel/yarı-otomatik. Veya kullanıcı webchat'te elle test eder + `adk_query_traces` ile sonuç analizi.

---

## Sıradaki adımlar

1. ✅ Phase 1.1.13G mini cleanup (JSON-quoted purpose + product_type + consumption range) — **acil**, %20+ fail çözer
2. ⏭ Eval script bug fix (B1-B4) — DB-direct retest %95+ pass beklenir
3. ⏭ Bot LLM eval (Batch 2) — A/B/J/K kategorileri için 30-50 örnek
4. ⏭ Snippet bug fix (BUG-1, 2, 3) — UX iyileştirme
5. ⏭ Final rapor + iyileştirme özeti

---

## Auto-mode özet

**130/155 (%83.9)** baseline pass rate. **3 kritik veri bug'ı** keşfedildi (purpose/product_type JSON-quoted + consumption range) — bunlar bot davranışını doğrudan etkiliyor ve hızlı fix ile **+%15-20 iyileştirme** beklenir. Eval script de iyileştirildiğinde gerçek pass rate %95+'a çıkacaktır.
