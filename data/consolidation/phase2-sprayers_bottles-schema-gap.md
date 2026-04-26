# Phase 2 Schema Gap Report — sprayers_bottles

Toplam ürün: **48**, sub_type sayısı: **4**

## Top 15 specs key (group-wide coverage)
| Key | Adet | Coverage |
|---|---:|---:|
| howToUse | 48 | 100.0% |
| whenToUse | 48 | 100.0% |
| whyThisProduct | 48 | 100.0% |
| capacity_liters | 48 | 100.0% |
| chemical_resistance | 43 | 89.6% |
| max_pressure_bar | 38 | 79.2% |
| nozzle_type | 34 | 70.8% |
| spray_pattern_adjustable | 29 | 60.4% |
| compressed_air_connection | 29 | 60.4% |
| sub_type | 28 | 58.3% |
| nozzle_types | 28 | 58.3% |
| capacity_total_lt | 28 | 58.3% |
| spare_seals_included | 28 | 58.3% |
| pressure_relief_valve | 28 | 58.3% |
| capacity_usable_lt | 26 | 54.2% |

## Sub_type detayı

### `pump_sprayer` (n=22)
**Örnek SKU'lar:** 20102, 20417, 19976

**Mevcut top keys:**
- `howToUse` — 22/22 (100%)
- `whenToUse` — 22/22 (100%)
- `whyThisProduct` — 22/22 (100%)
- `capacity_liters` — 22/22 (100%)
- `chemical_resistance` — 21/22 (95%)
- `nozzle_type` — 19/22 (86%)
- `capacity_total_lt` — 19/22 (86%)
- `max_pressure_bar` — 18/22 (82%)

**Önerilen schema base (zorunlu):**
- `capacity_liters` — 22/22 (100%) [OK]
- `pump_material` — 11/22 (50%) [GAP]
- `seal_type` — 13/22 (59%) [GAP]
- `nozzle_type` — 19/22 (86%) [OK]
- `chemical_resistance` — 21/22 (95%) [OK]
- `tank_wall` — 1/22 (5%) [GAP]
- `features` — 9/22 (41%) [GAP]
- `howToUse` — 22/22 (100%) [OK]
- `whenToUse` — 22/22 (100%) [OK]
- `whyThisProduct` — 22/22 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `capacity_liters` eksik: 20102, 20417, 19976, 81773, 19956, 81781, 20444, 23822 ...
- `pump_material` eksik: 81773, 81781, 81774, 700743, 81777, 82679, 82672, 81671901 ...
- `seal_type` eksik: 81773, 81781, 81774, 700743, 82679, 82672, 81671901, 83371 ...
- `nozzle_type` eksik: 700743, 81671901, 123456
- `chemical_resistance` eksik: 20102, 20417, 19976, 81773, 19956, 81781, 20444, 23822 ...
- `tank_wall` eksik: 20102, 20417, 19976, 81773, 19956, 81781, 20450, 81774 ...
- `features` eksik: 20102, 20417, 19976, 81773, 19956, 81781, 20444, 23822 ...

### `trigger_sprayer` (n=15)
**Örnek SKU'lar:** 79588-643, 84177, P0140AK1#26263

**Mevcut top keys:**
- `howToUse` — 15/15 (100%)
- `whenToUse` — 15/15 (100%)
- `whyThisProduct` — 15/15 (100%)
- `capacity_liters` — 15/15 (100%)
- `chemical_resistance` — 13/15 (87%)
- `color` — 11/15 (73%)
- `capacity_ml` — 11/15 (73%)
- `sub_type` — 10/15 (67%)

**Önerilen schema base (zorunlu):**
- `capacity_liters` — 15/15 (100%) [OK]
- `bottle_material` — 0/15 (0%) [GAP]
- `trigger_material` — 4/15 (27%) [GAP]
- `chemical_resistance` — 13/15 (87%) [OK]
- `nozzle_type` — 7/15 (47%) [GAP]
- `features` — 4/15 (27%) [GAP]
- `howToUse` — 15/15 (100%) [OK]
- `whenToUse` — 15/15 (100%) [OK]
- `whyThisProduct` — 15/15 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `capacity_liters` eksik: P0140AK1#26263, 84170, 79588-644, 12922, 12918, 79587-644, 79586-644, 79586-643 ...
- `bottle_material` eksik: 79588-643, 84177, P0140AK1#26263, 84170, 79588-644, 84173, 12922, 12918 ...
- `trigger_material` eksik: 84177, P0140AK1#26263, 84170, 79588-644, 84173, 12922, 12918, 79587-644 ...
- `chemical_resistance` eksik: 79588-643, P0140AK1#26263, 84170, 79588-644, 12922, 12918, 79587-644, 79586-644 ...
- `nozzle_type` eksik: 79588-643, 79588-644, 84173, 79587-644, 79586-644, 79586-643, 79587-643, 84174
- `features` eksik: 79588-643, P0140AK1#26263, 84170, 79588-644, 12922, 12918, 79587-644, 79586-644 ...

### `foaming_pump_sprayer` (n=10)
**Örnek SKU'lar:** 18848, 82676, 23841

**Mevcut top keys:**
- `howToUse` — 10/10 (100%)
- `whenToUse` — 10/10 (100%)
- `whyThisProduct` — 10/10 (100%)
- `capacity_liters` — 10/10 (100%)
- `max_pressure_bar` — 10/10 (100%)
- `chemical_resistance` — 9/10 (90%)
- `nozzle_type` — 8/10 (80%)
- `capacity_total_lt` — 8/10 (80%)

**Önerilen schema base (zorunlu):**
- `capacity_liters` — 10/10 (100%) [OK]
- `foam_quality` — 0/10 (0%) [GAP]
- `pump_material` — 4/10 (40%) [GAP]
- `chemical_resistance` — 9/10 (90%) [OK]
- `features` — 4/10 (40%) [GAP]
- `howToUse` — 10/10 (100%) [OK]
- `whenToUse` — 10/10 (100%) [OK]
- `whyThisProduct` — 10/10 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `capacity_liters` eksik: 18848, 23841, 19771, SGGC091, 81686, SGGD135
- `foam_quality` eksik: 18848, 82676, 23841, 19771, 81776, SGGC091, 81686, 21746 ...
- `pump_material` eksik: 82676, 81776, SGGC091, 81686, 81678, SGGD135
- `chemical_resistance` eksik: 18848, 82676, 23841, 19771, SGGC091, 81686, SGGD135
- `features` eksik: 18848, 23841, 19771, SGGC091, 81686, SGGD135

### `dispenser_bottle` (n=1)
**Örnek SKU'lar:** Q2M-P-DB300M

**Mevcut top keys:**
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `material` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `capacity_ml` — 1/1 (100%)
- `intended_use` — 1/1 (100%)
- `labeling_area` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

## Merge önerileri
| Tier | From | To | n | Gerekçe |
|---|---|---|---:|---|
| P0 | `dispenser_bottle` | `pump_sprayer` | 1 | Tek ürün; pump sprayer ile aynı işlev (sıvı dispense) |

## Ürünle ilgisiz key tespiti (delete önerisi)
_İlgisiz key tespit edilmedi._