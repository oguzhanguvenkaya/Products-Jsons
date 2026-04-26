# Phase 2 Schema Gap Report — abrasive_polish

Toplam ürün: **24**, sub_type sayısı: **6**

## Top 15 specs key (group-wide coverage)
| Key | Adet | Coverage |
|---|---:|---:|
| howToUse | 24 | 100.0% |
| whenToUse | 24 | 100.0% |
| whyThisProduct | 24 | 100.0% |
| sub_type | 19 | 79.2% |
| silicone_free | 19 | 79.2% |
| cut_level | 18 | 75.0% |
| filler_free | 18 | 75.0% |
| finish_level | 18 | 75.0% |
| machine_compatibility | 18 | 75.0% |
| recommended_pad_types | 18 | 75.0% |
| bodyshop_safe | 17 | 70.8% |
| contains_protection | 17 | 70.8% |
| formula_base | 14 | 58.3% |
| safe_for_soft_paint | 13 | 54.2% |
| dusting_level | 11 | 45.8% |

## Sub_type detayı

### `heavy_cut_compound` (n=13)
**Örnek SKU'lar:** Q2M-PPR1000M, 22930.261.001, Q2M-CM1000M

**Mevcut top keys:**
- `howToUse` — 13/13 (100%)
- `whenToUse` — 13/13 (100%)
- `whyThisProduct` — 13/13 (100%)
- `cut_level` — 10/13 (77%)
- `finish_level` — 10/13 (77%)
- `machine_compatibility` — 10/13 (77%)
- `recommended_pad_types` — 10/13 (77%)
- `filler_free` — 10/13 (77%)

**Önerilen schema base (zorunlu):**
- `cut_level` — 10/13 (77%) [GAP]
- `gloss_level` — 0/13 (0%) [GAP]
- `volume_ml` — 1/13 (8%) [GAP]
- `dust_level` — 0/13 (0%) [GAP]
- `dat_diminishing` — 0/13 (0%) [GAP]
- `machine_compatibility` — 10/13 (77%) [GAP]
- `howToUse` — 13/13 (100%) [OK]
- `whenToUse` — 13/13 (100%) [OK]
- `whyThisProduct` — 13/13 (100%) [OK]
- `features` — 0/13 (0%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `cut_level` eksik: Q2M-PPR1000M, 22200.261.001, 22984.281.001, Q2M-GP250M, 22202.260.001
- `gloss_level` eksik: Q2M-PPR1000M, 22930.261.001, Q2M-CM1000M, 22200.261.001, Q2M-CMP1000M, Q2M-CMPR1000M, 24017.261.080, 22984.260.001 ...
- `volume_ml` eksik: Q2M-PPR1000M, 22930.261.001, Q2M-CM1000M, 22200.261.001, Q2M-CMP1000M, Q2M-CMPR1000M, 22984.260.001, 22203.261.001 ...
- `dust_level` eksik: Q2M-PPR1000M, 22930.261.001, Q2M-CM1000M, 22200.261.001, Q2M-CMP1000M, Q2M-CMPR1000M, 24017.261.080, 22984.260.001 ...
- `dat_diminishing` eksik: Q2M-PPR1000M, 22930.261.001, Q2M-CM1000M, 22200.261.001, Q2M-CMP1000M, Q2M-CMPR1000M, 24017.261.080, 22984.260.001 ...
- `machine_compatibility` eksik: Q2M-PPR1000M, 22200.261.001, 22984.281.001, Q2M-GP250M, 22202.260.001
- `features` eksik: Q2M-PPR1000M, 22930.261.001, Q2M-CM1000M, 22200.261.001, Q2M-CMP1000M, Q2M-CMPR1000M, 24017.261.080, 22984.260.001 ...

### `polish` (n=6)
**Örnek SKU'lar:** 22771.261.001, 74391, 22828.261.001

**Mevcut top keys:**
- `howToUse` — 6/6 (100%)
- `whenToUse` — 6/6 (100%)
- `whyThisProduct` — 6/6 (100%)
- `sub_type` — 5/6 (83%)
- `silicone_free` — 5/6 (83%)
- `cut_level` — 4/6 (67%)
- `filler_free` — 4/6 (67%)
- `finish_level` — 4/6 (67%)

**Önerilen schema base (zorunlu):**
- `cut_level` — 4/6 (67%) [GAP]
- `gloss_level` — 1/6 (17%) [GAP]
- `volume_ml` — 0/6 (0%) [GAP]
- `dust_level` — 0/6 (0%) [GAP]
- `machine_compatibility` — 4/6 (67%) [GAP]
- `howToUse` — 6/6 (100%) [OK]
- `whenToUse` — 6/6 (100%) [OK]
- `whyThisProduct` — 6/6 (100%) [OK]
- `features` — 0/6 (0%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `cut_level` eksik: 74391, 22828.261.001, 22992.261.001, 700209
- `gloss_level` eksik: 22771.261.001, 74391, 22828.261.001, Q2M-PO1000M, 700209
- `volume_ml` eksik: 22771.261.001, 74391, 22828.261.001, Q2M-PO1000M, 22992.261.001, 700209
- `dust_level` eksik: 22771.261.001, 74391, 22828.261.001, Q2M-PO1000M, 22992.261.001, 700209
- `machine_compatibility` eksik: 74391, 22828.261.001, 22992.261.001, 700209
- `features` eksik: 22771.261.001, 74391, 22828.261.001, Q2M-PO1000M, 22992.261.001, 700209

### `finish` (n=2)
**Örnek SKU'lar:** 22029.261.001, 22911.261.001

**Mevcut top keys:**
- `howToUse` — 2/2 (100%)
- `sub_type` — 2/2 (100%)
- `cut_level` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `filler_free` — 2/2 (100%)
- `finish_level` — 2/2 (100%)
- `formula_base` — 2/2 (100%)
- `abrasive_type` — 2/2 (100%)

**Önerilen schema base (zorunlu):**
- `cut_level` — 2/2 (100%) [OK]
- `gloss_level` — 1/2 (50%) [GAP]
- `volume_ml` — 0/2 (0%) [GAP]
- `dust_level` — 0/2 (0%) [GAP]
- `machine_compatibility` — 2/2 (100%) [OK]
- `howToUse` — 2/2 (100%) [OK]
- `whenToUse` — 2/2 (100%) [OK]
- `whyThisProduct` — 2/2 (100%) [OK]
- `features` — 0/2 (0%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `gloss_level` eksik: 22029.261.001
- `volume_ml` eksik: 22029.261.001, 22911.261.001
- `dust_level` eksik: 22029.261.001, 22911.261.001
- `features` eksik: 22029.261.001, 22911.261.001

### `sanding_paste` (n=1)
**Örnek SKU'lar:** 20144.261.001

**Mevcut top keys:**
- `function` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `cut_level` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `filler_free` — 1/1 (100%)
- `finish_level` — 1/1 (100%)
- `formula_base` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `one_step_polish` (n=1)
**Örnek SKU'lar:** 22748.261.001

**Mevcut top keys:**
- `howToUse` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `cut_level` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `filler_free` — 1/1 (100%)
- `finish_level` — 1/1 (100%)
- `formula_base` — 1/1 (100%)
- `grit_removal` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `metal_polish` (n=1)
**Örnek SKU'lar:** 23003.391.001

**Mevcut top keys:**
- `howToUse` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `silicone_free` — 1/1 (100%)
- `target_surface` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `application_method` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

## Merge önerileri
| Tier | From | To | n | Gerekçe |
|---|---|---|---:|---|
| P0 | `sanding_paste` | `heavy_cut_compound` | 1 | Tek ürün; zımpara izi giderici ağır pasta sınıfı |
| P0 | `metal_polish` | `polish` | 1 | Tek ürün; metal cila genel polish ailesi |
| P1 | `one_step_polish` | `polish` | 1 | Tek ürün; tek adım pasta = polish (orta agresiflik); ayrı tutulabilir |

## Ürünle ilgisiz key tespiti (delete önerisi)
_İlgisiz key tespit edilmedi._