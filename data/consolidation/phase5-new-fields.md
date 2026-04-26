# Phase 5 — Yeni FAQ Field/Schema Önerileri (Kullanıcı Sinyalinden)

> Sinyal kaynağı: `data/instagram/unanswered.jsonl` (ilk 200) + `conversations.jsonl` (ilk 200, customer turns)
> Toplam analiz edilen müşteri mesajı: 2124

## Bulgular & Pattern Yoğunluğu

| Pattern | Sinyal sayısı | Açıklama |
|---|---:|---|
| Stok / bayilik / sipariş | 23 | "nereden alabilirim", "bayi", "sipariş" |
| Sorun-çözüm (leke, hare, kalıntı) | 9 | "su lekesi", "pasta kalıntısı", "swirl" |
| Karşılaştırma (X vs Y) | 13 | "X ile Y arasında fark", "hangisi daha iyi" |
| Fiyat | 43 | "fiyat", "ne kadar", "kaç para" |
| Uygulama (nasıl) | 29 | "nasıl uygulanır", "nasıl kullanılır" |

## Önerilen Yeni Schema Elemanları

### 1. `distribution_channels` — products.distribution_channels JSONB

**Cevap verdiği soru:** "Bayilik / nereden alırım / stok"
**Etkisi:** Tüm ürünler (~700+) — brand-level varsayılan + ürün-bazında override.

```sql
ALTER TABLE products ADD COLUMN distribution_channels JSONB;
-- Örnek değer:
-- { "marketplaces": ["trendyol","hepsiburada","n11"],
--   "dealers": ["mts_kimya","altintas","cila_kutusu"],
--   "direct_sale": false,
--   "dealer_lookup_url": "https://gyeon.co/network/" }
```

Bot davranışı: "satın al" / "bayi" yakalandığında `getDistribution(sku)` tool → karta yönlendir.

### 2. `solves_problem` — products.solves_problem TEXT[]

**Cevap verdiği soru:** "Su lekesi nasıl çıkar?", "Hare giderici hangi ürün?"
**Etkisi:** İlk fazda ~120 ürün (polish, iron remover, swirl removers, glass cleaner).

```sql
ALTER TABLE products ADD COLUMN solves_problem TEXT[];
CREATE INDEX idx_products_solves_problem ON products USING GIN(solves_problem);
-- Vocabulary: 'water_spots','swirls','iron_contamination','tar','bird_droppings',
--             'orange_peel','holograms','etching','interior_stains','odor'
```

Bot tool: `searchProductsByProblem(problem_code)` → ürün listesi.

### 3. `comparison_pairs` — product_relations.relation_type='comparison_pair'

**Cevap verdiği soru:** "X ile Y arasında fark nedir?"
**Etkisi:** ~80-150 yaygın çift (Mohs vs Q One, Bathe vs Bathe+, vb.)

```sql
-- Mevcut product_relations tablosunda yeni relation_type:
INSERT INTO product_relations (sku, related_sku, relation_type, metadata)
VALUES ('GYE-MOHS-EVO-50', 'GYE-Q-ONE-EVO-50', 'comparison_pair',
        '{"diff_summary":"Mohs daha sert, Q One esnek","strength_x":"hardness","strength_y":"flexibility"}'::jsonb);
```

Bot tool: `compareProducts(sku_a, sku_b)` → diff_summary döner.

### 4. `price_quote_template` — opsiyonel, brand-level FAQ

**Cevap verdiği soru:** "Fiyat ne kadar?"
**Etkisi:** Mevcut `price` field zaten var; **bot tarafında** tool zorlaması yeterli (Phase 4 v10.1 `searchByRating enforcement` paterni gibi).

Yeni schema gerekmez; instruction'a SPEC-FIRST yanına PRICE-FIRST ekle:
> "fiyat sorularında `getProductDetails().sizes[].price` olmadan asla manuel cevap verme."

## Karar Matrisi

| Öneri | Sinyal hacmi | Schema değişikliği | Bot effort | Öneri |
|---|---|---|---|---|
| distribution_channels | Yüksek | products + JSONB | tool + 1 instruction blok | 🟢 KISA YOL |
| solves_problem | Orta | products + TEXT[] + GIN | tool + RAG entegrasyonu | 🟢 ORTA |
| comparison_pairs | Orta | product_relations + metadata | tool + JSONB diff_summary | 🟡 EFFORT YÜKSEK |
| price_quote_template | Yüksek | (yok) | sadece instruction | 🟢 KOLAY |

