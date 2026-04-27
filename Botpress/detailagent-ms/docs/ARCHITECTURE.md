# Mimari — detailagent-ms (v10)

> **Son güncelleme:** 2026-04-27 · **Branch:** `feat/phase-4.9-catalog-atelier`
>
> Bu doküman bot tarafının mimari özet'idir. Mikroservis pipeline detayları için [`/docs/PROJECT_BRIEFING.md §7`](../../../docs/PROJECT_BRIEFING.md). Veri katmanı için §4. Bot deep dive için §8.

## 1. Genel bakış

```
┌────────────────────────────────────────────────────────┐
│  Botpress Cloud Runtime (detailagent-ms)               │
│  • LLMz Autonomous (Gemini 3 Flash, temp 0.2)          │
│  • Conversation state: lastProducts (max 5),           │
│                        lastFocusSku                    │
│  • Transcript (auto), widgets (Carousel/Card/Choice)   │
│                                                        │
│  Tool handler'lar (HTTP client + Bearer auth):         │
│    searchProducts        ─┐                            │
│    searchFaq             ─┤                            │
│    getProductDetails     ─┤                            │
│    getApplicationGuide   ─┼──→ retrievalClient.*       │
│    getRelatedProducts    ─┤    (5s timeout, no retry)  │
│    searchByPriceRange    ─┤                            │
│    rankBySpec            ─┘                            │
└──────────────────┬─────────────────────────────────────┘
                   │ HTTPS + RETRIEVAL_SHARED_SECRET
                   │ ~200-700ms (cold), ~200ms warm
                   ▼
┌────────────────────────────────────────────────────────┐
│  retrieval-service (Bun + Hono, Fly.io iad)            │
│  Stack: Bun + Hono 4.9 + postgres.js 3.4 + zod         │
│                                                        │
│  Endpoints (auth-guarded):                             │
│    POST /search              hybrid retrieval          │
│    POST /faq                 confidence tier (h/l/n)   │
│    GET  /products/:sku       master + specs + FAQs     │
│    GET  /products/:sku/guide hafif (howToUse + video)  │
│    GET  /products/:sku/related?relationType=...        │
│    POST /search/price                                  │
│    POST /search/rank-by-spec (numeric/rating ranker)   │
│    GET  /admin/* (separate admin secret)               │
│    GET  /health                                        │
│                                                        │
│  Hybrid pipeline (her /search):                        │
│    1. zod validation + Bearer auth                     │
│    2. Turkish normalize (sentinel-based ş/ç/ğ)         │
│    3. Synonym expand (37 entry + alias[])              │
│    4. Slot extract (43 brand + 280+ sub_type pattern,  │
│       price regex, longest-first)                      │
│    5. Embedding: LRU cache → Gemini text-embedding-001 │
│    6. Parallel: BM25 (ts_rank_cd) + vector (HNSW)      │
│       — HYBRID_CANDIDATE_LIMIT=50 each                 │
│    7. RRF fusion (k=60, Cormack 2009)                  │
│    8. Business boost (rating ×1.0-1.08, stock          │
│       ×1.05/0.85, featured ×1.10)                      │
│    9. Post-filter (exactMatch word-boundary)           │
│   10. Format → {carouselItems, productSummaries,       │
│       textFallbackLines, totalReturned}                │
└────┬───────────────────────────────────────────────────┘
     │ postgres.js (15-50ms typical)
     ▼
┌──────────────────────────────────────────────────────┐
│  Supabase Postgres (us-east-1, pgvector 0.8+)        │
│                                                      │
│  Tablolar:                                           │
│    products              511 (specs JSONB canonical) │
│    product_embeddings    511 (VECTOR(768) HNSW)      │
│    product_search        511 (TSVECTOR turkish, GIN) │
│    product_faqs        3.156 (scope-aware embedded)  │
│    product_relations   1.287 (5 relation_type)       │
│    product_meta        1.961 (EAV: scalar + array)   │
│    synonyms               37 (TR detailing domain)   │
│    audit_log               * (admin UI commit log)   │
│                                                      │
│  RLS: deny-all except service_role.                  │
└──────────────────────────────────────────────────────┘
```

## 2. Latency Bütçesi (gerçekleşen, 2026-04-26 trace)

| Aşama | Hedef | Gerçekleşen |
|---|---|---|
| Botpress → microservice HTTP | 30-80ms | 200-700ms (cold), ~200ms warm |
| Query normalize + synonym | 2-5ms | ~3ms |
| Embedding cache hit / miss | 1-3ms / 80-150ms | ~1ms / 150-800ms (cold) |
| BM25 + vector paralel | 15-40ms | ~30-50ms |
| RRF + boost + format | 5-10ms | ~5-10ms |
| **Total /search** | 55-140ms / 130-290ms | 200-700ms |
| **LLM cognitive call (Gemini 3 Flash)** | — | 3-5s / iteration |
| **Total turn (multi-step LLMz)** | — | **7-15s typical, 60-100s edge case** |

## 3. Token Bütçesi (sistem prompt)

`cognitive.request.ai.system_length` trace'lerden ölçülen:

| Bileşen | Char | Token tahmini |
|---|---:|---:|
| Bizim instruction (`conversations/index.ts`) | 39.947 | ~10.000 |
| 6 tool description (toplam) | 35.619 | ~8.900 |
| LLMz wrapper ("Important Instructions" + TSX) | ~12.000 | ~3.000 |
| State serialize | ~500 | ~125 |
| **Total system prompt / istek** | **~88.000** | **~22.000** |

**State cleanup sonrası (2026-04-26):** `lastFaqAnswer` + 3 dead field çıkarıldı → 67-77K char (16.7-19.3K token), **~%20 düşüş**.

## 4. Phase Tarihçesi

### ✅ Phase 1 — Data layer scaffolding (sub-step in core)

Supabase migration + seed (511 ürün, 3.156 FAQ, 1.287 relation, 1.961 meta, 37 synonym). Embedding'ler `gemini-embedding-001` ile 768 dim.

### ✅ Phase 1 — Canonical key migration (892 değişiklik, 296 SKU)

[data/consolidation/MEGA-payload.json](../../../data/consolidation/MEGA-payload.json):

- `durability_days/weeks/label` → `durability_months`
- `volume_liters/kg` → `volume_ml`; `capacity_liters` → `capacity_ml`
- `consumption_ml_per_car` → `consumption_per_car_ml`
- `safe_on_*` → `compatibility[]` (array, pipe-separated EAV)
- `aluminum_safe/fiberglass_safe/plexiglass_safe` → `substrate_safe[]`
- `ph/ph_label` → `ph_level` (number 1-14)
- `dilution_*` flat keys → `dilution: {ratio, bucket, foam_lance, pump_sprayer, manual}` nested

Build script'leri: `retrieval-service/scripts/build-phase1-{A..G}.ts`. EAV projection: `retrieval-service/scripts/project-specs-to-meta.ts`.

### ✅ Phase 2R — Taxonomy refactor (450+ değişiklik)

[data/consolidation/phase2R-FINAL-payload.json](../../../data/consolidation/phase2R-FINAL-payload.json):

- **`spare_part` template_group ERİDİ** → parts → `polisher_machine` (backing_plate, battery, charger, carbon_brush) + `sprayers_bottles` (trigger_head, nozzle, maintenance_kit, hose, handle)
- **`wash_tools` yeni group** (15 ürün) — wash_mitt + drying_towel + foam_tool + towel_wash + bucket
- **ceramic_coating sub merge:** `leather_coating` + `interior_coating` → `fabric_coating`; `spray_coating` → `paint_coating`; `tire_coating` → `tire_care/tire_dressing`
- **abrasive_polish sub merge:** `one_step_polish` + `metal_polish` → `polish`; `sanding_paste` → `heavy_cut_compound`

### ✅ Phase 4 — Tool cutover

6 tool handler Botpress Tables → microservice HTTP. Tek path (feature flag yok). Bot için tool input/output contract aynı kaldı; arkada `retrievalClient.*` HTTP.

### ✅ Phase 19 — Post-feedback fix'ler (48 değişiklik)

[retrieval-service/scripts/build-phase19-payload.ts](../../../retrieval-service/scripts/build-phase19-payload.ts):

- NPMW6555 keçe → `polishing_pad/wool_pad` (microfiber DEĞİL)
- 11 industrial `metal_polish` → `industrial_products/solid_compound` + `specs.purpose` + `specs.surface[]`
- Eski `accessory` group → `air_equipment` (rename), 3 sub: `air_blow_gun`, `tornador_gun`, `tornador_part`
- `marin_products` 5 sub'a renormalize: `marine_polish`, `marine_metal_cleaner`, `marine_surface_cleaner`, `marine_general_cleaner`, `marine_wood_care`
- 7 SKU silindi

### ⏳ Phase 5 — Shadow mode (bekliyor)

`retrieval-service/eval/run-eval.ts` framework hazır (150-query, brand_hit@k / tg_hit@k / sku_hit@k / MRR metrik). Ama `eval/corpus.jsonl` boş → unevaluated. Yapılması gereken:
1. Eval corpus oluştur
2. detailagent (v9.2) ve detailagent-ms (v10) paralel çalıştır
3. Top-3 product overlap ≥ %85 hedef
4. Kalite eşitlendiğinde Phase 6'ya geç

### ⏳ Phase 6 — A/B + production cutover

%10 trafik (48 saat) → %25 → %50 → %100. Rollback prova. Eski botu (detailagent v9.2) deprecate et.

## 5. Veri Senkronizasyonu

Phase 4 cutover sonrası: **Supabase = source of truth**. Botpress Cloud Tables artık kullanılmıyor (eski detailagent v9.2 hâlâ Tables'a bağlı, frozen).

Veri akışı:
1. `etl/refresh_data.py` CSV üretir (`data/csv/`)
2. `retrieval-service/scripts/seed-*.ts` Supabase'e yazar
3. `retrieval-service/scripts/regenerate-search-text.ts` `search_text` columns yeniden hesaplar + embedding refresh
4. `retrieval-service/scripts/project-specs-to-meta.ts` specs JSONB → product_meta EAV projection
5. Bot'tan tool çağrıldığında microservice Supabase'i sorgular

Admin UI değişikliği:
1. User UI'da düzenler
2. Staging drawer'da preview
3. Atomic commit (audit log + DB transaction)
4. Affected SKU'lar için search_text + EAV regenerate

## 6. State Şeması (KRİTİK — 2026-04-26 cleanup)

```ts
state: z.object({
  lastProducts: z.array(z.object({
    sku: z.string(),
    productName: z.string(),
    brand: z.string(),
    price: z.number(),
  })).default([]),                  // max 5, multi-turn context
  lastFocusSku: z.string().nullable().default(null),
                                    // searchFaq SKU-filter, getProductDetails sonrası set
})
```

`onAfterTool` hook (`src/conversations/index.ts:78-93`):
- `searchProducts` / `searchByPriceRange` çıktısı → `state.lastProducts` güncelle (slice 0,5)
- `getProductDetails` / `getApplicationGuide` → `state.lastFocusSku = output.sku`

Eski `selectedBrand/selectedCategory/surfaceType/lastFaqAnswer` 4 field'ı **2026-04-26'da KALDIRILDI** çünkü:
- 3'ü asla set edilmiyordu (dead code)
- `lastFaqAnswer` set ediliyordu ama LLM kuralı yoktu (yarı-dead)
- Transcript LLMz tarafından zaten gönderiliyor → marka/kategori bilgisi orada

## 7. Anti-Hallucination Mimarisi

Bot 4 katmanlı defense:

1. **Tool output verification** (Adım 2, instruction satır 388-393): Metinde geçecek ürün ismi mutlaka tool output'unda olmalı. "Lustratutto cilası..." dediğinde tool output'ta yoksa → halüsinasyon
2. **Carousel-metin çelişkisi yasağı** (Adım 2.5): productSummaries dolu iken "bulamadım" demek yasak
3. **Filter post-check** (Adım 2.6 - T11 type): `durability_months >= 36` filter sonrası dönen ürünleri tekrar verify et (oversample edilebilir)
4. **Ranking accuracy** (Adım 2.7): `rankedProducts` içinde `durability_months` 50 ay ise metinde "24 ay" deme

Bu kurallar instruction'da fazla tekrar ediyor (~9 yer rating kuralı, ~3 yer Adım 2.5/2.6/2.7) — sadeleştirme planlanıyor.

## 8. Risk + Mitigation

| Risk | Mitigation |
|---|---|
| Cold embedding latency (150-800ms) → 5s timeout aşımı (Phase 1.1: 3s'den 5s'e çıkarıldı) | edge case persistirse pre-warm script |
| Multi-step LLMz timeout (60-100s) | Instruction "MAX 5 TOOL PER TURN" var ama soft; 3'e indirilebilir |
| RRF k=60 tune edilmedi | Eval corpus tamamlanınca k ∈ {30, 60, 80, 100} grid search |
| Embedding cache miss storm | LRU TTL 24h, top-N pre-warm |
| Gemini model değişimi → stale embedding | `embedding_version` alanı (`gemini-embedding-001-v1`), periyodik re-index |
| ~~slotExtractor pattern duplicate (`metal parlatici`)~~ | Phase 1.1'de polish'ten silindi, sadece `solid_compound` altında |

## 9. Referanslar

- **Master briefing:** [`/docs/PROJECT_BRIEFING.md`](../../../docs/PROJECT_BRIEFING.md) (1.339 satır, akademik karşılaştırma + tüm detay)
- **Microservice src:** [`retrieval-service/`](../../../retrieval-service/)
- **DB migrations:** [`retrieval-service/migrations/`](../../../retrieval-service/migrations/)
- **Phase artifacts:** [`data/consolidation/`](../../../data/consolidation/) (CHANGE-REPORT.md, MEGA-payload.json, phase{1,2R,19}-*-payload.json)
- **Eval framework:** [`retrieval-service/eval/`](../../../retrieval-service/eval/) (corpus.jsonl yok, framework hazır)
- **Admin UI:** [`admin-ui/`](../../../admin-ui/)
- **Frozen sibling:** [`Botpress/detailagent/`](../../detailagent/) (v9.2, prod, Botpress Tables backend)
- **Görsel:** `docs/*.drawio` (system-blueprint, bot-architecture, bot-scenarios)
