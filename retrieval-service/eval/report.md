# Phase 3 — Retrieval Eval Report

Corpus: 151 queries (50 instagram, 50 synthetic, 51 manual).
Annotation: category-level (brand=33, template_group=125, sku=4).

## Overall

| Metric              | pure_vector | hybrid | Δ        |
|---------------------|-------------|--------|----------|
| brand_hit@5         | 100.0%      | 100.0% | +0.0pp   |
| tg_hit@5            | 96.0%       | 92.8%  | -3.2pp   |
| sku_hit@5           | 100.0%      | 100.0% | +0.0pp   |
| any_hit@5           | 98.5%       | 96.2%  | -2.3pp   |
| any_hit@10          | 99.2%       | 97.7%  | -1.5pp   |
| MRR                 | 86.9%       | 89.6%  | +2.7pp   |
| p50 latency         | 754.0ms     | 700.0ms| -54ms    |
| p95 latency         | 1005.0ms    | 922.0ms| -83ms    |

## Per-source

### instagram (50 queries)

| Metric       | pure_vector | hybrid   | Δ        |
|--------------|-------------|----------|----------|
| brand_hit@5  | 100.0%      | 100.0%   | +0.0pp     |
| tg_hit@5     | 85.7%       | 82.1%    | -3.6pp     |
| any_hit@5    | 97.1%       | 94.1%    | -2.9pp     |
| MRR          | 0.775       | 0.835    | +0.060   |

### synthetic (50 queries)

| Metric       | pure_vector | hybrid   | Δ        |
|--------------|-------------|----------|----------|
| brand_hit@5  | 100.0%      | 100.0%   | +0.0pp     |
| tg_hit@5     | 100.0%      | 93.9%    | -6.1pp     |
| any_hit@5    | 100.0%      | 95.9%    | -4.1pp     |
| MRR          | 0.886       | 0.909    | +0.023   |

### manual (51 queries)

| Metric       | pure_vector | hybrid   | Δ        |
|--------------|-------------|----------|----------|
| brand_hit@5  | 100.0%      | 100.0%   | +0.0pp     |
| tg_hit@5     | 97.9%       | 97.9%    | +0.0pp     |
| any_hit@5    | 98.0%       | 98.0%    | +0.0pp     |
| MRR          | 0.916       | 0.925    | +0.009   |

## Regressions (pure_vector any@5 hit → hybrid miss)

- `ig-019` Sonaxın şampuanı var sanırım cilalı o şampuan sanırım bu ürünü ondan sonra kullanamam
- `synth-018` cam temizleyici öner
- `synth-042` araç boyası üzerine koruma
- `manual-046` seramik kaplama seti

## Wins (hybrid any@5 hit → pure_vector miss)

- `manual-031` cam buğu önleyici

## Step 3.10 / 3.11 Decision — Deploy First, Tune with Real Traffic

The 151-query corpus is ceiling-bound at 98.5% any_hit@5 under
pure_vector, so aggressive offline tuning would be optimizing
noise. The hybrid pipeline ships with its default parameters:

- RRF k = 60 (TREC standard)
- BM25 OR-tsquery (`a | b | c`) so synonym-expanded queries don't
  degrade to zero matches under default AND semantics
- Candidate pool per leg = 50, rerank pool = limit × 4 (default 20)
- Business boosts: rating coef 0.08, in_stock 1.05, featured 1.10
  — effectively neutral today because catalog rating is NULL and
  is_featured is all FALSE, but the code path is ready for data

Phase 5 (shadow mode) will replay both modes on live bot traffic
and surface the real failure modes. Separately, a data-enrichment
workstream will tighten `search_text` and grow the synonym set —
those changes move the baseline for BOTH modes, which makes
offline parameter tuning meaningful again.

## Production Deploy — 2026-04-21

- `flyctl deploy --app detailagent-retrieval --strategy rolling`
- 2 machines on version 2, iad region, 1/1 checks passing
- Cold response (fresh image): hybrid 1039ms, pure_vector 83ms
  (warm cache retained from prior deployment)
- Warm p50 (10x): hybrid 380ms, pure_vector 317ms
  → ~60ms hybrid overhead for the second parallel SQL query
- `?mode=pure_vector` reachable (A/B + shadow mode input)
- Slot extraction verified live: `{brand: GYEON, priceMax: 1000}`
  applied to both BM25 and vector filter sets, candidate pool
  correctly narrowed (50 → 40)
- Auth negative still returns 401

## Next steps (out of Phase 3)

1. Phase 4 — Bot tool cutover (detailagent-ms handlers → HTTP)
2. Phase 5 — Shadow mode + real-traffic eval replay
3. Data-enrichment workstream (search_text expansion, synonym
   growth 38 → ~100 entries, product-level FAQ review)