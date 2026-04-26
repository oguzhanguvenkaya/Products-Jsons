# Phase 2 Schema Gap Report — microfiber

Toplam ürün: **31**, sub_type sayısı: **12**

## Top 15 specs key (group-wide coverage)
| Key | Adet | Coverage |
|---|---:|---:|
| howToUse | 31 | 100.0% |
| whenToUse | 31 | 100.0% |
| whyThisProduct | 31 | 100.0% |
| size | 28 | 90.3% |
| features | 28 | 90.3% |
| wash_temp_max | 27 | 87.1% |
| type | 19 | 61.3% |
| edge_type | 16 | 51.6% |
| ccs_technology | 13 | 41.9% |
| gsm | 13 | 41.9% |
| color | 10 | 32.3% |
| material_blend | 10 | 32.3% |
| quantity | 8 | 25.8% |
| weight_gr | 6 | 19.4% |
| inner_sponge_mm | 5 | 16.1% |

## Sub_type detayı

### `wash_mitt` (n=8)
**Örnek SKU'lar:** 3225A-BL, Q2M-STE, 3227I-HD

**Mevcut top keys:**
- `size` — 8/8 (100%)
- `features` — 8/8 (100%)
- `howToUse` — 8/8 (100%)
- `whenToUse` — 8/8 (100%)
- `whyThisProduct` — 8/8 (100%)
- `type` — 7/8 (88%)
- `wash_temp_max` — 7/8 (88%)
- `color` — 5/8 (62%)

**Önerilen schema base (zorunlu):**
- `gsm` — 3/8 (38%) [GAP]
- `material` — 0/8 (0%) [GAP]
- `dimensions_cm` — 0/8 (0%) [GAP]
- `color` — 5/8 (62%) [GAP]
- `wash_cycles` — 0/8 (0%) [GAP]
- `howToUse` — 8/8 (100%) [OK]
- `whenToUse` — 8/8 (100%) [OK]
- `whyThisProduct` — 8/8 (100%) [OK]
- `features` — 8/8 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `gsm` eksik: 3225A-BL, 3227I-HD, 3227B, 3221A-RD, 3228R, Q2M-WP
- `material` eksik: 3225A-BL, Q2M-STE, 3227I-HD, 3227B, Q2M-WME, 3221A-RD, 3228R, Q2M-WP
- `dimensions_cm` eksik: 3225A-BL, Q2M-STE, 3227I-HD, 3227B, Q2M-WME, 3221A-RD, 3228R, Q2M-WP
- `color` eksik: Q2M-STE, Q2M-WME, 3221A-RD, Q2M-WP
- `wash_cycles` eksik: 3225A-BL, Q2M-STE, 3227I-HD, 3227B, Q2M-WME, 3221A-RD, 3228R, Q2M-WP

### `glass_cloth` (n=4)
**Örnek SKU'lar:** 3218, 3218-1, Q2M-GWE4040

**Mevcut top keys:**
- `size` — 4/4 (100%)
- `features` — 4/4 (100%)
- `howToUse` — 4/4 (100%)
- `whenToUse` — 4/4 (100%)
- `wash_temp_max` — 4/4 (100%)
- `whyThisProduct` — 4/4 (100%)
- `type` — 3/4 (75%)
- `color` — 2/4 (50%)

**Önerilen schema base (zorunlu):**
- `gsm` — 2/4 (50%) [GAP]
- `material` — 0/4 (0%) [GAP]
- `dimensions_cm` — 0/4 (0%) [GAP]
- `edge_type` — 1/4 (25%) [GAP]
- `color` — 2/4 (50%) [GAP]
- `howToUse` — 4/4 (100%) [OK]
- `whenToUse` — 4/4 (100%) [OK]
- `whyThisProduct` — 4/4 (100%) [OK]
- `features` — 4/4 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `gsm` eksik: 3218, 3218-1
- `material` eksik: 3218, 3218-1, Q2M-GWE4040, Q2M-WD4060C
- `dimensions_cm` eksik: 3218, 3218-1, Q2M-GWE4040, Q2M-WD4060C
- `edge_type` eksik: 3218, 3218-1, Q2M-WD4060C
- `color` eksik: Q2M-GWE4040, Q2M-WD4060C

### `buffing_cloth` (n=4)
**Örnek SKU'lar:** 3215D, Q2M-PWE4040C, 3215ZB

**Mevcut top keys:**
- `size` — 4/4 (100%)
- `type` — 4/4 (100%)
- `features` — 4/4 (100%)
- `howToUse` — 4/4 (100%)
- `edge_type` — 4/4 (100%)
- `whenToUse` — 4/4 (100%)
- `wash_temp_max` — 4/4 (100%)
- `whyThisProduct` — 4/4 (100%)

**Önerilen schema base (zorunlu):**
- `gsm` — 3/4 (75%) [GAP]
- `material` — 0/4 (0%) [GAP]
- `dimensions_cm` — 0/4 (0%) [GAP]
- `edge_type` — 4/4 (100%) [OK]
- `color` — 1/4 (25%) [GAP]
- `howToUse` — 4/4 (100%) [OK]
- `whenToUse` — 4/4 (100%) [OK]
- `whyThisProduct` — 4/4 (100%) [OK]
- `features` — 4/4 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `gsm` eksik: Q2M-SWE4040C
- `material` eksik: 3215D, Q2M-PWE4040C, 3215ZB, Q2M-SWE4040C
- `dimensions_cm` eksik: 3215D, Q2M-PWE4040C, 3215ZB, Q2M-SWE4040C
- `color` eksik: 3215D, Q2M-PWE4040C, Q2M-SWE4040C

### `drying_towel` (n=3)
**Örnek SKU'lar:** Q2M-SODE6080C, Q2M-SDE7090C, 3213EMR

**Mevcut top keys:**
- `size` — 3/3 (100%)
- `type` — 3/3 (100%)
- `features` — 3/3 (100%)
- `howToUse` — 3/3 (100%)
- `edge_type` — 3/3 (100%)
- `whenToUse` — 3/3 (100%)
- `wash_temp_max` — 3/3 (100%)
- `whyThisProduct` — 3/3 (100%)

**Önerilen schema base (zorunlu):**
- `gsm` — 2/3 (67%) [GAP]
- `material` — 0/3 (0%) [GAP]
- `dimensions_cm` — 0/3 (0%) [GAP]
- `absorption_capacity` — 1/3 (33%) [GAP]
- `edge_type` — 3/3 (100%) [OK]
- `howToUse` — 3/3 (100%) [OK]
- `whenToUse` — 3/3 (100%) [OK]
- `whyThisProduct` — 3/3 (100%) [OK]
- `features` — 3/3 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `gsm` eksik: Q2M-SODE6080C
- `material` eksik: Q2M-SODE6080C, Q2M-SDE7090C, 3213EMR
- `dimensions_cm` eksik: Q2M-SODE6080C, Q2M-SDE7090C, 3213EMR
- `absorption_capacity` eksik: Q2M-SODE6080C, 3213EMR

### `multi_purpose_cloth` (n=3)
**Örnek SKU'lar:** KLIN-3113AG, 3217HS-5G, 3217HS-5W

**Mevcut top keys:**
- `size` — 3/3 (100%)
- `features` — 3/3 (100%)
- `howToUse` — 3/3 (100%)
- `quantity` — 3/3 (100%)
- `whenToUse` — 3/3 (100%)
- `wash_temp_max` — 3/3 (100%)
- `ccs_technology` — 3/3 (100%)
- `whyThisProduct` — 3/3 (100%)

**Önerilen schema base (zorunlu):**
- `gsm` — 2/3 (67%) [GAP]
- `material` — 0/3 (0%) [GAP]
- `dimensions_cm` — 0/3 (0%) [GAP]
- `edge_type` — 2/3 (67%) [GAP]
- `color` — 1/3 (33%) [GAP]
- `howToUse` — 3/3 (100%) [OK]
- `whenToUse` — 3/3 (100%) [OK]
- `whyThisProduct` — 3/3 (100%) [OK]
- `features` — 3/3 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `gsm` eksik: KLIN-3113AG
- `material` eksik: KLIN-3113AG, 3217HS-5G, 3217HS-5W
- `dimensions_cm` eksik: KLIN-3113AG, 3217HS-5G, 3217HS-5W
- `edge_type` eksik: KLIN-3113AG
- `color` eksik: KLIN-3113AG, 3217HS-5G

### `interior_cloth` (n=2)
**Örnek SKU'lar:** Q2M-IWE40402P, Q2M-LWE40402P

**Mevcut top keys:**
- `size` — 2/2 (100%)
- `features` — 2/2 (100%)
- `howToUse` — 2/2 (100%)
- `quantity` — 2/2 (100%)
- `edge_type` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `wash_temp_max` — 2/2 (100%)
- `whyThisProduct` — 2/2 (100%)

**Önerilen schema base (zorunlu):**
- `gsm` — 0/2 (0%) [GAP]
- `material` — 0/2 (0%) [GAP]
- `dimensions_cm` — 0/2 (0%) [GAP]
- `edge_type` — 2/2 (100%) [OK]
- `color` — 0/2 (0%) [GAP]
- `howToUse` — 2/2 (100%) [OK]
- `whenToUse` — 2/2 (100%) [OK]
- `whyThisProduct` — 2/2 (100%) [OK]
- `features` — 2/2 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `gsm` eksik: Q2M-IWE40402P, Q2M-LWE40402P
- `material` eksik: Q2M-IWE40402P, Q2M-LWE40402P
- `dimensions_cm` eksik: Q2M-IWE40402P, Q2M-LWE40402P
- `color` eksik: Q2M-IWE40402P, Q2M-LWE40402P

### `kit` (n=2)
**Örnek SKU'lar:** Q2M-IPE4P, Q2M-GPE2P

**Mevcut top keys:**
- `size` — 2/2 (100%)
- `features` — 2/2 (100%)
- `howToUse` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `kit_contents` — 2/2 (100%)
- `wash_temp_max` — 2/2 (100%)
- `whyThisProduct` — 2/2 (100%)
- `edge_type` — 1/2 (50%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `cleaning_cloth` (n=1)
**Örnek SKU'lar:** 3219

**Mevcut top keys:**
- `color` — 1/1 (100%)
- `made_in` — 1/1 (100%)
- `function` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `material` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `ccs_system` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `suede_cloth` (n=1)
**Örnek SKU'lar:** Q2M-SEP1010C

**Mevcut top keys:**
- `gsm` — 1/1 (100%)
- `size` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `quantity` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `wash_temp_max` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `interior_cleaning_applicator` (n=1)
**Örnek SKU'lar:** 3236NBR2

**Mevcut top keys:**
- `made_in` — 1/1 (100%)
- `function` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `material` — 1/1 (100%)
- `quantity` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `dimensions` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `chamois_drying_towel` (n=1)
**Örnek SKU'lar:** 70919

**Mevcut top keys:**
- `made_in` — 1/1 (100%)
- `function` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `material` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `weight_g` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `dimensions` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `coating_cloth` (n=1)
**Örnek SKU'lar:** Q2M-BWE4040

**Mevcut top keys:**
- `size` — 1/1 (100%)
- `type` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `edge_type` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `wash_temp_max` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

## Merge önerileri
| Tier | From | To | n | Gerekçe |
|---|---|---|---:|---|
| P0 | `chamois_drying_towel` | `drying_towel` | 1 | Tek ürün; sami/kurulama havlusu drying ana sınıfa ait |
| P0 | `coating_cloth` | `buffing_cloth` | 1 | Tek ürün; coating bezleri buffing/parlatma kullanım |
| P0 | `suede_cloth` | `glass_cloth` | 1 | Tek ürün; suede süet bez cam/kaplama silme |
| P0 | `cleaning_cloth` | `multi_purpose_cloth` | 1 | Tek ürün; jenerik cleaning cloth = multi-purpose |
| P0 | `interior_cleaning_applicator` | `interior_cloth` | 1 | Tek ürün; iç mekan aplikatörü interior_cloth ile birleşir |
| P1 | `kit` | `multi_purpose_cloth` | 2 | 2 ürün; kit setleri ana ürün havuzuna katılabilir veya ayrı kalabilir |

## Ürünle ilgisiz key tespiti (delete önerisi)
Toplam 24 adet ilgisiz key kullanımı bulundu.
| Key | Adet |
|---|---:|
| specs.nozzle_types | 3 |
| specs.capacity_liters | 3 |
| specs.max_pressure_bar | 3 |
| specs.chemical_resistance | 3 |
| specs.spare_seals_included | 3 |
| specs.pressure_relief_valve | 3 |
| specs.spray_pattern_adjustable | 3 |
| specs.compressed_air_connection | 3 |