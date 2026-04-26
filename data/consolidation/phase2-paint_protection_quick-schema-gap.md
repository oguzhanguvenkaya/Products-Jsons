# Phase 2 Schema Gap Report — `paint_protection_quick`

- Toplam ürün: **22**
- Mevcut sub_type sayısı: **8**
- Önerilen sub_type sayısı (post-merge): **6**
- Merge satırları (CSV): **5**
- İlgisiz key DELETE satırları (CSV): **2**

## Top 10 Meta Key Coverage (grup geneli)

| Key | Count | Coverage |
|---|---|---|
| `howToUse` | 22/22 | 100% |
| `whyThisProduct` | 22/22 | 100% |
| `whenToUse` | 22/22 | 100% |
| `features` | 21/22 | 95% |
| `durability_label` | 12/22 | 55% |
| `consumption_ml` | 11/22 | 50% |
| `contains_sio2` | 10/22 | 45% |
| `concentrate` | 9/22 | 41% |
| `sub_type` | 8/22 | 36% |
| `application_method` | 8/22 | 36% |
| `durability_weeks` | 7/22 | 32% |
| `cure_time_hours` | 7/22 | 32% |

## Sub_type Konsolidasyon Önerisi

| Eski sub | Yeni sub | Öncelik | Neden |
|---|---|---|---|
| `spray_wipe_sealant` (3) | → `spray_sealant` | P1 | uygulama biçimi=spray; sub-variant flag specs içine |
| `spray_rinse_sealant` (2) | → `spray_sealant` | P1 | uygulama biçimi=spray; rinse=after-care flag |
| `paste_wax` (1) | = `paste_wax` | P2 | tek ürün; gelecekte wax üst-ailesine |
| `glass_coating` (1) | = `glass_coating` | P2 | tek ürün; ileride glass_treatment ailesine |

## Post-Merge Sub_type Dağılımı

| Sub_type | Ürün sayısı |
|---|---|
| `spray_sealant` | 10 |
| `rinse_wax_concentrate` | 4 |
| `quick_detailer` | 4 |
| `liquid_sealant` | 2 |
| `glass_coating` | 1 |
| `paste_wax` | 1 |

## Schema Base — Zorunlu Key Önerisi (post-merge sub_type başına)

### `spray_sealant` (10 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `consumption_ml` | 7/10 (70%) | ✓ |
| `durability_weeks` | 5/10 (50%) | ✓ |
| `durability_months` | 2/10 (20%) | ✓ |
| `application_method` | 4/10 (40%) | ✓ |
| `contains_sio2` | 3/10 (30%) | ✓ |
| `ph_tolerance` | 3/10 (30%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (9/10)
- `durability_label` (5/10)
- `ratings` (3/10)
- `target_surfaces` (2/10)
- `sio2_percent` (2/10)
- `durability_months_single` (2/10)
- `durability_months_with_maintenance` (2/10)
- `contains_wax` (1/10)
- `uv_active` (1/10)
- `dilution_ratio` (1/10)
- `finish_effect` (1/10)
- `function` (1/10)
- `hydrophobic` (1/10)
- `application_area` (1/10)
- `applications_per_bottle` (1/10)

### `quick_detailer` (4 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `consumption_ml` | 3/4 (75%) | ✓ |
| `application_method` | 1/4 (25%) | ✓ |
| `features` | 4/4 (100%) | ✓ |
| `scent` | 0/4 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `contains_sio2` (2/4)
- `ratings` (2/4)
- `durability_weeks` (2/4)
- `function` (2/4)
- `waterless_wash_capability` (1/4)
- `ph_tolerance` (1/4)
- `ph` (1/4)
- `cure_time_hours` (1/4)

### `rinse_wax_concentrate` (4 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `consumption_ml` | 0/4 (0%) | ✓ |
| `dilution_ratio` | 4/4 (100%) | ✓ |
| `concentrate` | 4/4 (100%) | ✓ |
| `application_method` | 1/4 (25%) | ✓ |
| `durability_label` | 0/4 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (4/4)
- `scent` (2/4)
- `ph` (1/4)
- `application_area` (1/4)
- `base_type` (1/4)
- `osmosis_compatible` (1/4)

### `liquid_sealant` (2 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `consumption_ml` | 0/2 (0%) | ✓ |
| `durability_months` | 1/2 (50%) | ✓ |
| `application_method` | 2/2 (100%) | ✓ |
| `cure_time_hours` | 0/2 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (2/2)
- `filler_free` (2/2)
- `gloss_level` (2/2)
- `abrasiveness` (2/2)
- `durability_label` (1/2)
- `base_type` (1/2)
- `contains_carnauba` (1/2)

### `paste_wax` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `application_method` | 0/1 (0%) | ✓ |
| `durability_months` | 1/1 (100%) | ✓ |
| `contains_sio2` | 0/1 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `form` (1/1)
- `ratings` (1/1)
- `features` (1/1)
- `ph_tolerance` (1/1)
- `durability_km` (1/1)
- `durability_label` (1/1)
- `contains_fluorine` (1/1)
- `cure_time_minutes` (1/1)
- `consumption_ml_per_car` (1/1)

### `glass_coating` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `consumption_ml` | 1/1 (100%) | ✓ |
| `durability_months` | 1/1 (100%) | ✓ |
| `application_method` | 0/1 (0%) | ✓ |
| `cure_time_hours` | 0/1 (0%) | ✓ |
| `contains_sio2` | 0/1 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `ratings` (1/1)
- `features` (1/1)
- `contact_angle` (1/1)
- `ph_resistance` (1/1)
- `sileceksiz_hiz_kmh` (1/1)

## İlgisiz Key Tespiti (DELETE listesi)

Bu grupta anlamsız 26 potansiyel key:

`abrasiveness`, `battery_capacity_ah`, `cars_per_bar`, `clay_form`, `color_temperature_k`, `confidence`, `fit`, `flagship`, `gap_reason`, `grit_range`, `hardness`, `load_capacity_kg`, `lubricant_required`, `lumens`, `machine_compatible`, `mounting_points`, `orbit_mm`, `premium`, `rpm_range`, `runtime_minutes`, `source`, `speed_range_rpm`, `target_material`, `vacuum_pa`, `wall_mountable`, `wheeled`


→ Ürünlerin specs alanında bulunanlar **2** satır olarak `phase2-paint_protection_quick-key-delete.csv` dosyasına yazıldı.
