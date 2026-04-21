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
