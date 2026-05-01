# Eval v1 — Test Plan

**Baseline:** git tag `v1.1.10b-baseline` (commit `0ac29c7`)
**Tarih:** 2026-05-02
**Hedef:** 200-250 multi-turn senaryolu kapsamlı bot davranış evaluation

---

## Test Engineer Yaklaşımı

Bot'un sağladığı hizmet **customer support + ürün danışmanı**. Test'in amacı:

1. **Kalite ölçümü** — bot kullanıcıya doğru, dürüst, anlaşılır cevap veriyor mu?
2. **Kapsam ölçümü** — tüm 25 template_group + 80 sub_type + 12 metaFilter key + tüm tool patternleri test ediliyor mu?
3. **İyileştirme noktası tespiti** — fail/zayıf cevaplar nereden kaynaklanıyor?
   - **Veri** (DB eksik/yanlış)
   - **Mimari** (tool/endpoint/embedding sınırı)
   - **Prompt** (instruction zayıf veya eksik)
   - **Kod** (tool implementation bug)
   - **Sistem doğası** (LLM stochasticity, context limit, vb.)

---

## Test Taxonomy (10 kategori, ~250 soru)

| Kat. | Kategori | Soru | Multi-turn dağılımı | Amaç |
|---|---|---|---|---|
| **A** | Single-turn product search (CLARIFYING / direct) | 40 | 1-turn | 17 CLARIFYING kategori + spesifik marka/model |
| **B** | Multi-turn refinement | 50 | 2-3 turn | Choice → cevap → bot doğru filter ekliyor mu |
| **C** | Specific product detail / spec | 30 | 1-2 turn | getProductDetails doğru bilgi getiriyor mu |
| **D** | Filter / metaFilter | 30 | 1-2 turn | silikonsuz, pH nötr, asidik, contains_sio2, durability, vb. |
| **E** | Sıralama (rankBySpec) | 20 | 1 turn | en iyi, en güçlü, en uzun, en az tüketen |
| **F** | Bütçe + filter (searchByPriceRange) | 20 | 1-2 turn | X TL altı, X-Y arası, en ucuz |
| **G** | Karşılaştırma (X vs Y) | 15 | 2-3 turn | 2 ürün karşılaştırması |
| **H** | İlişkili ürün (use_with) | 15 | 2 turn | "Bathe ile birlikte ne kullanılır" |
| **I** | FAQ / nüanslı sorular | 25 | 1-3 turn | "ıslak mı uygulanır", "silikon içerir mi", dayanıklılık |
| **J** | Edge cases | 15 | 1-2 turn | typo, vague, zero-result, "cok genel" |
| **K** | Adversarial / hallucination | 10 | 1 turn | output dışı marka, off-topic, halüsinasyon test |
| | **TOPLAM** | **250** | | |

---

## Multi-turn dağılımı (toplam 250 senaryo)

| Turn sayısı | Senaryo | %  |
|---|---|---|
| 1 turn | 90 | %36 |
| 2 turn | 70 | %28 |
| 3 turn | 50 | %20 |
| 4-5 turn | 30 | %12 |
| 6-7 turn | 10 | %4 |
| **Toplam** | **250** | **100%** |

---

## Test Boyutları (her sorunun değerlendirileceği eksen)

Her test sorusu için 6 eksen ölçülür:

1. **Doğruluk (Correctness):** Bot doğru ürünü/cevabı buldu mu? (DB ile doğrula)
2. **Tool seçimi:** Doğru tool (searchProducts/rankBySpec/searchByPriceRange/searchFaq) seçildi mi?
3. **Filter doğru mu:** metaFilter, templateSubType, exactMatch doğru mu?
4. **Açıklama kalitesi:** Bot ürün açıklaması anlaşılır + Türkçe mi? (snippet bug var mı?)
5. **CLARIFYING davranışı:** Generic sorgu ise Choice yield ediliyor mu? Spesifik ise SKIP ediliyor mu?
6. **Halüsinasyon:** Output dışı marka/ürün/iddia üretiliyor mu?

---

## Bilinen sorunlar (test sırasında doğrulanacak)

### BUG-1 (snippet format) — `regenerate-search-text.ts:34`
**Belirti:** `Yüzeyler: , boya, boyalı yüzey, ppf, plastik, conta, ` → başında ve sonunda `, ` boş element
**Kök neden:** `targetSurfaces.replace(/\|/g, ', ')` — pipe-formatlı `|x|y|` string'inde başta/sonda `|` olduğu için replace sonrası `, x, y, ` oluşur
**Etki:** search_text snippet kötü görünüm, bot LLM kullanıcıya kopyalarsa şikayet
**Fix önerisi:** `targetSurfaces.replace(/^\||\|$/g, '').split('|').filter(Boolean).join(', ')`

### BUG-2 (technical sub_type adı kullanıcıya gösteriliyor) — bot LLM davranışı
**Belirti:** "Kategori: car_shampoo - ph_neutral_shampoo" kullanıcıya gösteriliyor
**Kök neden:** Bot LLM searchProducts output'undan template_sub_type'i alıp display'e koyuyor (instruction'da explicit kuralı yok)
**Etki:** Kullanıcı technical key görünce profesyonel olmaz
**Fix önerisi:** Bot prompt'a "technical taxonomy adlarını (snake_case) kullanıcıya gösterme, Türkçe çeviri kullan" notu

### BUG-3 (text truncation) — bot LLM 250 char display kesimi
**Belirti:** "conta" → "cont" kesim (son harf koparılmış)
**Kök neden:** Bot LLM display için kestirip noktayı atmış olabilir
**Etki:** Anlaşılırlık kaybı
**Fix önerisi:** Bot prompt'a "açıklama kesilirse `...` ekle, kelimeyi yarıdan bölme" kuralı

---

## Test execution stratejisi

### Yöntem: adk evals framework + manuel batch

1. **JSON eval suite** — 250 senaryoyu structured JSON'a yaz
2. **adk evals run** — bot'u her senaryoya karşı çalıştır, trace + cevap kayıt
3. **llm_judge** — her cevap için 6 eksene göre puan (Gemini 3 Flash judge)
4. **Manuel review** — düşük puanlı/şüpheli cevapları gözden geçir
5. **DB doğrulama** — bot iddialarını DB ile karşılaştır (örn "X ürünü 3 yıl dayanıklı" → DB.specs.durability_months=36 mi?)

### Çıktı formatları

- `results-raw.jsonl` — tüm senaryo cevapları (trace + bot reply + tool calls)
- `results-judge.jsonl` — llm_judge puanları (6 eksen × 250 senaryo)
- `results-analysis.md` — kategorize edilmiş bulgular:
  - Pass rate per kategori
  - Fail örnekleri + kök neden (data/architecture/prompt/code/system)
  - İyileştirme önerileri
  - Follow-up odaklı testler

---

## Soru kaynakları (200-250 sorunun beslendiği yerler)

1. **DB ürün bilgileri** — gerçek ürün özelliklerinden test soruları çıkar
2. **product_faqs tablosu (3.156 FAQ)** — kullanıcı tipi sorular zaten orada
3. **Internet — detailimage.com blog** — detailing topluluğu sık sorulan
4. **Insta DM kayıtları (varsa)** — gerçek müşteri sorgusu pattern'i
5. **CLARIFYING listesinden** — bot'un Choice tasarladığı 17 kategori için trigger sorular
6. **Edge case ideation** — typo, ambigüite, off-topic

---

## Soru template örnekleri (her kategoriden 1 örnek)

### A1 — Single-turn CLARIFYING (generic kategori)
```
{
  "id": "A001",
  "category": "single-turn-clarifying",
  "turns": [{ "user": "şampuan öner" }],
  "expected": {
    "yield": "Choice",
    "options_count": 5,
    "must_contain_options": ["pH nötr", "ön yıkama", "seramik", "dekontaminasyon", "susuz"],
    "tool_calls": []
  },
  "tags": ["clarifying", "car_shampoo"]
}
```

### B1 — Multi-turn refinement
```
{
  "id": "B001",
  "category": "multi-turn-refinement",
  "turns": [
    { "user": "şampuan öner" },
    { "user": "pH nötr" },
    { "user": "1 lt'lik fiyatı uygun olan" }
  ],
  "expected": {
    "final_tool": "searchByPriceRange",
    "final_filters": { "templateSubType": "ph_neutral_shampoo", "volume_ml_lte": 1500 },
    "must_include_skus": ["Q2M-PPFW500M", "70616", "701851"]
  }
}
```

### C1 — Specific product detail
```
{
  "id": "C001",
  "turns": [{ "user": "GYEON Bathe nedir, dayanıklılığı ne kadar?" }],
  "expected": {
    "tool_calls": ["searchProducts", "getProductDetails"],
    "must_mention": ["pH nötr", "şampuan", "GYEON"],
    "must_not_hallucinate": true
  }
}
```

### D1 — metaFilter
```
{
  "id": "D001",
  "turns": [{ "user": "asidik şampuan istiyorum" }],
  "expected": {
    "tool": "searchProducts",
    "metaFilter_must_contain": { "key": "ph_category", "op": "eq", "value": "asidik" }
  }
}
```

### E1 — Sıralama
```
{
  "id": "E001",
  "turns": [{ "user": "en güçlü polisaj pastası" }],
  "expected": {
    "tool": "rankBySpec",
    "params": { "sortKey": "cut_level", "direction": "desc" }
  }
}
```

### F1 — Bütçe
```
{
  "id": "F001",
  "turns": [{ "user": "1000 TL altı şampuan" }],
  "expected": {
    "tool": "searchByPriceRange",
    "params": { "templateGroup": "car_shampoo", "maxPrice": 1000 }
  }
}
```

### G1 — Karşılaştırma
```
{
  "id": "G001",
  "turns": [
    { "user": "GYEON Bathe ile FRA-BER Bathe arasında fark ne?" }
  ],
  "expected": {
    "tool_calls_count": 2,
    "must_mention_both": ["GYEON Bathe", "FRA-BER"],
    "comparison_format": true
  }
}
```

### H1 — İlişkili ürün
```
{
  "id": "H001",
  "turns": [
    { "user": "GYEON Bathe ile birlikte ne kullanmalıyım?" }
  ],
  "expected": {
    "tool": "getRelatedProducts",
    "params": { "relation_type": "use_with" }
  }
}
```

### I1 — FAQ
```
{
  "id": "I001",
  "turns": [{ "user": "Q2M-MOHS EVO ıslak mı uygulanır?" }],
  "expected": {
    "tool": "searchFaq",
    "must_address_question": "ıslak/kuru uygulama"
  }
}
```

### J1 — Edge case
```
{
  "id": "J001",
  "turns": [{ "user": "Bate var mı" }],
  "expected": {
    "behavior": "typo_recovery",
    "must_yield": "Choice",
    "must_ask_about": "Bathe"
  }
}
```

### K1 — Adversarial
```
{
  "id": "K001",
  "turns": [{ "user": "Q2M-Bathe Pro Max var mı?" }],
  "expected": {
    "must_not_hallucinate": true,
    "must_say": "böyle bir ürün bulunmuyor",
    "alternatives_optional": true
  }
}
```

---

## Auto execution akışı

1. ✅ Mevcut durum kaydet (git tag + memory snapshot)
2. ✅ Snippet bug analizi (BUG-1, BUG-2, BUG-3)
3. ✅ Test plan dosyası
4. ⏭ 250 soru üret (kategorize JSON)
5. ⏭ Eval framework hazırla (adk evals + bun script)
6. ⏭ Eval çalıştır (batch run, 250 senaryo)
7. ⏭ llm_judge sonuçları
8. ⏭ Sonuç analizi (pass rate + kök neden)
9. ⏭ Follow-up odaklı testler (şüpheli alanlar)
10. ⏭ Bug fix önerileri + öncelik (data/prompt/code)
