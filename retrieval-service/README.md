# detailagent-retrieval

Türkçe e-ticaret kataloğu için **hybrid RAG microservice**. detailagent-ms Botpress bot'unun retrieval backend'i.

> **Son güncelleme:** 2026-04-27 · Master doc: [`/docs/PROJECT_BRIEFING.md`](../docs/PROJECT_BRIEFING.md)

## Stack

- **Runtime:** Bun 1.3+ (dev: `bun --watch`, prod: `bun src/server.ts`)
- **Web:** Hono 4.9 + zod-validator
- **DB:** Supabase Postgres us-east-1 + pgvector 0.8+ (HNSW m=16, ef_construction=64)
- **FTS:** Postgres `turkish` text search (tsvector, ts_rank_cd)
- **Embedding:** Gemini `text-embedding-001` (**768 dim**)
- **Cache:** In-memory LRU (`lru-cache`, max 1000 entry, TTL 24h)
- **Deploy:** Fly.io iad (Dockerfile + fly.toml, 256MB, active-active)

> **Not:** Önceki README'de `text-embedding-004` yazıyordu — yanlış. Gerçek model `gemini-embedding-001`, kontrol için `src/lib/embed.ts:6-8`.

## Endpoints

Tüm endpoint'ler `Authorization: Bearer <RETRIEVAL_SHARED_SECRET>` ister (timing-safe karşılaştırma). `/admin/*` ayrı `RETRIEVAL_ADMIN_SECRET` (varsa, yoksa shared'e fallback).

| Method | Path | Amaç |
|---|---|---|
| POST | `/search` | Hybrid retrieval (BM25 + vector + RRF + slot + boost) |
| POST | `/faq` | FAQ semantic + confidence tier (high≥0.75 / low≥0.55 / none) |
| GET | `/products/:sku` | Master row + specs JSONB + FAQs + variants |
| GET | `/products/:sku/guide` | Hafif (howToUse + videoCard) |
| GET | `/products/:sku/related?relationType=use_with` | İlişkili ürün |
| POST | `/search/price` | Variant-aware fiyat sıralama (asc/desc) |
| POST | `/search/rank-by-spec` | Universal numeric/rating ranker — 11 sortKey (durability, volume, cut_level, rating_*, ...) |
| GET | `/health` | `{status, version, request_id}` |
| `/admin/*` | (preview, staging/apply, coverage, audit-log, faqs/upsert, relations/upsert, tools) | Catalog Atelier UI backend |

## Hybrid Pipeline (POST /search)

```
1. Turkish normalize         turkishNormalize.ts (sentinel-based ş/ç/ğ preservation)
2. Synonym expand            synonymExpander.ts (37 entry, longest-first, MIN_ALIAS=4)
3. Slot extract              slotExtractor.ts (43 brand + 280+ sub_type pattern + price regex)
4. Embedding (LRU cache)     embed.ts + cache.ts (Gemini embedding-001, 768 dim)
5. Parallel:
     ├─ BM25                 bm25.ts (ts_rank_cd, OR semantics)
     └─ Vector (HNSW cosine) searchCore.ts:236-255
   HYBRID_CANDIDATE_LIMIT = 50 each
6. RRF fusion                rrf.ts (k = HYBRID_RRF_K = 60, Cormack/Clarke/Buettcher 2009)
7. Business boost            BOOST_RATING_COEF=0.08, IN_STOCK=1.05, OUT=0.85, FEATURED=1.10
8. Post-filter (exactMatch)  word-boundary regex, OVERSAMPLE_FACTOR=5
9. Format                    formatters.ts → {carouselItems, productSummaries, textFallbackLines}
```

Constants: `src/lib/searchCore.ts:306-314`.

## Veri Katmanı

7 tablo (Supabase Postgres):

| Tablo | Satır | Notlar |
|---|---:|---|
| `products` | 511 | specs JSONB (Phase 1 canonical), sizes, variant_skus[] |
| `product_embeddings` | 511 | VECTOR(768), HNSW idx |
| `product_search` | 511 | TSVECTOR generated (Turkish FTS, weight 'A') + trigram |
| `product_faqs` | 3.156 | scope: product/brand/category, embedded |
| `product_relations` | 1.287 | use_with/use_before/use_after/alternatives/accessories |
| `product_meta` | 1.961 | EAV (scalar + array as pipe-separated value_text) |
| `synonyms` | 37 | TR detailing domain (alias[] GIN idx) |

Migration: `migrations/001_extensions.sql` → `migrations/002_core_schema.sql` → `003_*` → `006_audit_log.sql`.

## Phase Tarihçesi (uygulanmış migration'lar)

- **Phase 1 — Canonical key normalize** (892 değişiklik, 296 SKU): `durability_months`, `volume_ml`, `target_surface[]`, `compatibility[]` vb. Build: `scripts/build-phase1-{A..G}.ts`.
- **Phase 2R — Taxonomy refactor** (450+ değişiklik): `spare_part` eridi, `wash_tools` yeni group, ceramic/abrasive sub merge.
- **Phase 19 — Post-feedback fix'ler** (48 değişiklik): `solid_compound`, `air_equipment` rename, `marin_products` renormalize, NPMW6555 → wool_pad.
- **Re-embed:** `scripts/regenerate-search-text.ts` + `regenerate-affected-search-text.ts`.
- **EAV projection:** `scripts/project-specs-to-meta.ts` (specs JSONB → product_meta).

Detay: [`data/consolidation/CHANGE-REPORT.md`](../data/consolidation/CHANGE-REPORT.md).

## Çalıştırma (Dev)

```bash
bun install
bun run dev          # :8787 (hot-reload)

# Sağlık
curl -s http://localhost:8787/health

# Test
curl -s -X POST http://localhost:8787/search \
  -H "Authorization: Bearer $RETRIEVAL_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"query":"yıkama eldiveni","limit":5}'
```

## Environment

`.env`:
```
SUPABASE_DB_URL=...                # Transaction pooler (us-east-1)
GEMINI_API_KEY=...                 # Google AI Studio
RETRIEVAL_SHARED_SECRET=<16+>      # Bot ile aynı değer
RETRIEVAL_ADMIN_SECRET=<16+>       # Admin UI için (opsiyonel, yoksa shared'e fallback)
PORT=8787
LOG_LEVEL=info                     # debug | info | warn | error
```

Doğrulama: `src/lib/env.ts:9-21` (zod schema).

## Magic Numbers

| Constant | Değer | Yer | Amaç |
|---|---:|---|---|
| `HYBRID_CANDIDATE_LIMIT` | 50 | searchCore.ts:306 | BM25/vector candidate cap |
| `HYBRID_RRF_K` | 60 | searchCore.ts:307 | RRF damping (TREC default) |
| `OVERSAMPLE_FACTOR` | 5 | searchCore.ts:37 | exactMatch fetch çarpanı |
| `BOOST_RATING_COEF` | 0.08 | searchCore.ts:311 | Max %8 rating boost |
| `BOOST_IN_STOCK` | 1.05 | searchCore.ts:312 | Stok bonusu |
| `BOOST_OUT_OF_STOCK` | 0.85 | searchCore.ts:313 | Stok yok cezası |
| `BOOST_FEATURED` | 1.10 | searchCore.ts:314 | Featured çarpan |
| `embedCache.max` | 1000 | cache.ts:28 | LRU capacity |
| `embedCache.ttl` | 24h | cache.ts:29 | LRU TTL |
| `EMBEDDING_DIM` | 768 | embed.ts:8 | Gemini embedding-001 |
| `HIGH_THRESHOLD` | 0.75 | faq.ts:46 | FAQ confidence high |
| `LOW_THRESHOLD` | 0.55 | faq.ts:47 | FAQ confidence low |
| `MIN_ALIAS_LENGTH_FOR_REVERSE` | 4 | synonymExpander.ts:35 | Reverse synonym min length |

## Eval

`eval/run-eval.ts` framework hazır (150-query, brand_hit@k / tg_hit@k / sku_hit@k / MRR). **Ama `eval/corpus.jsonl` boş** — production retrieval kalitesi unevaluated. Phase 5 shadow mode için bu corpus oluşturulmalı.

## Phase 1.1 ile çözülenler

- ✅ **slotExtractor `metal parlatici` duplicate** — polish'ten silindi, sadece `solid_compound` altında.
- ✅ **searchByRating durability bug** — kaldırıldı; `rankBySpec(durability_months desc)` objektif ay ile sıralıyor.
- ✅ **Business boost no-op risk** — `BUSINESS_BOOST_ENABLED=false` flag default; veri olmadan RRF'i sessizce skewlemez.
- ✅ **Price tool sortDirection** — variant-aware MIN/MAX iki SQL branch + `NULLIF(s->>'price','')` boş string koruması.
- ✅ **Rating EAV projection** — `specs.ratings.{durability,beading,self_cleaning}` → `product_meta` scalar key'leri (idempotent).

## Açık riskler

- **Synonym tablosu 37 entry** — TR detailing domain için zenginleştirilebilir.
- **Embedding cache cold start** — yeni query 150-800ms; pre-warm script yok.
- **Eval corpus yok** — RRF k=60, business boost coef'leri tune edilmedi.
- **rankBySpec rating_* coverage düşük** — sadece ~20 GYEON ürünü; backend `coverageNote` ile dinamik uyarıyor.

Detay + yol haritası: [`/docs/PROJECT_BRIEFING.md §14, §15`](../docs/PROJECT_BRIEFING.md).

## Referanslar

- Master briefing: [`/docs/PROJECT_BRIEFING.md`](../docs/PROJECT_BRIEFING.md)
- Bot tarafı: [`/Botpress/detailagent-ms/`](../Botpress/detailagent-ms/)
- DB migration: [`migrations/`](migrations/)
- Phase artifacts: [`/data/consolidation/`](../data/consolidation/)
- Akademik karşılaştırma: PROJECT_BRIEFING §16 (RRF Cormack 2009, HNSW Malkov 2018, BM25 Robertson, ReAct Yao 2023, vb.)
