# Phase 2 Schema Gap Report — car_shampoo

Toplam ürün: **30**, sub_type sayısı: **7**

## Top 15 specs key (group-wide coverage)
| Key | Adet | Coverage |
|---|---:|---:|
| howToUse | 30 | 100.0% |
| whenToUse | 30 | 100.0% |
| whyThisProduct | 30 | 100.0% |
| safe_on_ceramic_coatings | 24 | 80.0% |
| scent | 20 | 66.7% |
| foam_level | 20 | 66.7% |
| lubricity_level | 20 | 66.7% |
| dilution | 19 | 63.3% |
| ph_label | 19 | 63.3% |
| ph_level | 19 | 63.3% |
| sub_type | 19 | 63.3% |
| concentrate | 19 | 63.3% |
| stripping_power | 19 | 63.3% |
| safe_on_ppf_wrap | 19 | 63.3% |
| contains_sio2_or_wax | 19 | 63.3% |

## Sub_type detayı

### `prewash_foaming_shampoo` (n=14)
**Örnek SKU'lar:** 72042, 78784, 71490

**Mevcut top keys:**
- `howToUse` — 14/14 (100%)
- `whenToUse` — 14/14 (100%)
- `whyThisProduct` — 14/14 (100%)
- `scent` — 12/14 (86%)
- `safe_on_ceramic_coatings` — 12/14 (86%)
- `dilution` — 11/14 (79%)
- `ph_label` — 11/14 (79%)
- `sub_type` — 11/14 (79%)

**Önerilen schema base (zorunlu):**
- `ph_level` — 6/14 (43%) [GAP]
- `dilution_ratio` — 4/14 (29%) [GAP]
- `foam_quality` — 0/14 (0%) [GAP]
- `concentrate` — 11/14 (79%) [GAP]
- `volume_ml` — 0/14 (0%) [GAP]
- `scent` — 12/14 (86%) [OK]
- `howToUse` — 14/14 (100%) [OK]
- `whenToUse` — 14/14 (100%) [OK]
- `whyThisProduct` — 14/14 (100%) [OK]
- `features` — 3/14 (21%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `ph_level` eksik: 78784, 75021, 70942, 74258, 701062, 70640, 71180, 73575
- `dilution_ratio` eksik: 72042, 78784, 75021, 79281, 701980, 700387, 70942, 74258 ...
- `foam_quality` eksik: 72042, 78784, 71490, 75021, 79281, 701980, 700387, Q2M-FYA4000M ...
- `concentrate` eksik: 72042, 78784, 71490, 75021, 79281, 701980, 700387, Q2M-FYA4000M ...
- `volume_ml` eksik: 72042, 78784, 71490, 75021, 79281, 701980, 700387, Q2M-FYA4000M ...
- `scent` eksik: 72042, 78784, 75021, 79281, 701980, 700387, Q2M-FYA4000M, 70942 ...
- `features` eksik: 72042, 78784, 75021, 79281, 701980, 700387, Q2M-FYA4000M, 70942 ...

### `ph_neutral_shampoo` (n=6)
**Örnek SKU'lar:** 700508, 701851, 70616

**Mevcut top keys:**
- `howToUse` — 6/6 (100%)
- `whenToUse` — 6/6 (100%)
- `whyThisProduct` — 6/6 (100%)
- `safe_on_ceramic_coatings` — 6/6 (100%)
- `scent` — 5/6 (83%)
- `dilution` — 5/6 (83%)
- `ph_label` — 5/6 (83%)
- `ph_level` — 5/6 (83%)

**Önerilen schema base (zorunlu):**
- `ph_level` — 5/6 (83%) [OK]
- `dilution_ratio` — 3/6 (50%) [GAP]
- `volume_ml` — 0/6 (0%) [GAP]
- `wax_safe` — 0/6 (0%) [GAP]
- `coating_safe` — 0/6 (0%) [GAP]
- `scent` — 5/6 (83%) [OK]
- `howToUse` — 6/6 (100%) [OK]
- `whenToUse` — 6/6 (100%) [OK]
- `whyThisProduct` — 6/6 (100%) [OK]
- `features` — 1/6 (17%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `ph_level` eksik: 701851
- `dilution_ratio` eksik: 700508, 700507, 79284
- `volume_ml` eksik: 700508, 701851, 70616, 700507, Q2M-BYA4000M, 79284
- `wax_safe` eksik: 700508, 701851, 70616, 700507, Q2M-BYA4000M, 79284
- `coating_safe` eksik: 700508, 701851, 70616, 700507, Q2M-BYA4000M, 79284
- `scent` eksik: 700508, 701851, 70616, 700507, Q2M-BYA4000M, 79284
- `features` eksik: 700508, 701851, 70616, Q2M-BYA4000M, 79284

### `ceramic_infused_shampoo` (n=3)
**Örnek SKU'lar:** Q2M-BPYA1000M, 79286, 701003

**Mevcut top keys:**
- `features` — 3/3 (100%)
- `howToUse` — 3/3 (100%)
- `whenToUse` — 3/3 (100%)
- `contains_sio2` — 3/3 (100%)
- `whyThisProduct` — 3/3 (100%)
- `ph_level` — 2/3 (67%)
- `consumption_ml_per_car` — 2/3 (67%)
- `ratings` — 1/3 (33%)

**Önerilen schema base (zorunlu):**
- `ph_level` — 2/3 (67%) [GAP]
- `dilution_ratio` — 1/3 (33%) [GAP]
- `volume_ml` — 0/3 (0%) [GAP]
- `sio2_content` — 0/3 (0%) [GAP]
- `durability_months` — 1/3 (33%) [GAP]
- `scent` — 0/3 (0%) [GAP]
- `howToUse` — 3/3 (100%) [OK]
- `whenToUse` — 3/3 (100%) [OK]
- `whyThisProduct` — 3/3 (100%) [OK]
- `features` — 3/3 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `ph_level` eksik: 701003
- `dilution_ratio` eksik: Q2M-BPYA1000M, 79286
- `volume_ml` eksik: Q2M-BPYA1000M, 79286, 701003
- `sio2_content` eksik: Q2M-BPYA1000M, 79286, 701003
- `durability_months` eksik: Q2M-BPYA1000M, 701003
- `scent` eksik: Q2M-BPYA1000M, 79286, 701003

### `decon_shampoo` (n=3)
**Örnek SKU'lar:** 79290, Q2M-RWYA1000M, Q2M-RW1000M

**Mevcut top keys:**
- `howToUse` — 3/3 (100%)
- `ph_level` — 3/3 (100%)
- `whenToUse` — 3/3 (100%)
- `dilution_ratio` — 3/3 (100%)
- `whyThisProduct` — 3/3 (100%)
- `consumption_ml_per_car` — 3/3 (100%)
- `safe_on_ceramic_coatings` — 3/3 (100%)
- `features` — 2/3 (67%)

**Önerilen schema base (zorunlu):**
- `ph_level` — 3/3 (100%) [OK]
- `dilution_ratio` — 3/3 (100%) [OK]
- `volume_ml` — 0/3 (0%) [GAP]
- `iron_remover` — 2/3 (67%) [GAP]
- `contamination_target` — 0/3 (0%) [GAP]
- `howToUse` — 3/3 (100%) [OK]
- `whenToUse` — 3/3 (100%) [OK]
- `whyThisProduct` — 3/3 (100%) [OK]
- `features` — 2/3 (67%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `volume_ml` eksik: 79290, Q2M-RWYA1000M, Q2M-RW1000M
- `iron_remover` eksik: 79290
- `contamination_target` eksik: 79290, Q2M-RWYA1000M, Q2M-RW1000M
- `features` eksik: Q2M-RW1000M

### `towel_wash` (n=2)
**Örnek SKU'lar:** 701422, Q2M-TWYA500M

**Mevcut top keys:**
- `scent` — 2/2 (100%)
- `dilution` — 2/2 (100%)
- `howToUse` — 2/2 (100%)
- `ph_label` — 2/2 (100%)
- `sub_type` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `foam_level` — 2/2 (100%)
- `concentrate` — 2/2 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `rinseless_wash` (n=1)
**Örnek SKU'lar:** Q2M-EW1000M

**Mevcut top keys:**
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `ph_level` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `contains_sio2` — 1/1 (100%)
- `dilution_ratio` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `ppf_shampoo` (n=1)
**Örnek SKU'lar:** Q2M-PPFW500M

**Mevcut top keys:**
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `ph_level` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `safe_on_ppf` — 1/1 (100%)
- `iron_remover` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `dilution_ratio` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

## Merge önerileri
| Tier | From | To | n | Gerekçe |
|---|---|---|---:|---|
| P1 | `rinseless_wash` | `prewash_foaming_shampoo` | 1 | Tek ürün; durulamasız yıkama farklı bir ürün sınıfı; ileride ayrı tutulabilir |
| P1 | `ppf_shampoo` | `ph_neutral_shampoo` | 1 | Tek ürün; PPF şampuanları ph-nötr alt-sınıfı |
| P2 | `towel_wash` | `ph_neutral_shampoo` | 2 | 2 ürün; havlu yıkama deterjanı temizlik şampuanı; review gerekli |

## Ürünle ilgisiz key tespiti (delete önerisi)
Toplam 6 adet ilgisiz key kullanımı bulundu.
| Key | Adet |
|---|---:|
| specs.sio2_percentage | 1 |
| specs.durability_weeks | 1 |
| specs.cure_time | 1 |
| specs.gloss_level | 1 |
| specs.cure_time_hours | 1 |
| specs.durability_months | 1 |