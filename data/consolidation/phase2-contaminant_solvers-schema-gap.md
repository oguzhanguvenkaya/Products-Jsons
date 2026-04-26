# Phase 2 Schema Gap Report — `contaminant_solvers`

- Toplam ürün: **21**
- Mevcut sub_type sayısı: **11**
- Önerilen sub_type sayısı (post-merge): **9**
- Merge satırları (CSV): **5**
- İlgisiz key DELETE satırları (CSV): **3**
- KRİTİK GRUP TAŞIMA: `Q2M-PYA4000M`: contaminant_solvers→ceramic_coating

## Top 10 Meta Key Coverage (grup geneli)

| Key | Count | Coverage |
|---|---|---|
| `whyThisProduct` | 21/21 | 100% |
| `howToUse` | 21/21 | 100% |
| `whenToUse` | 21/21 | 100% |
| `sub_type` | 19/21 | 90% |
| `safe_on_surfaces` | 16/21 | 76% |
| `needs_agitation` | 16/21 | 76% |
| `dwell_time_minutes` | 16/21 | 76% |
| `target_dirt` | 14/21 | 67% |
| `ph_level` | 14/21 | 67% |
| `ph_label` | 13/21 | 62% |
| `concentrate` | 11/21 | 52% |
| `consumption_ml_per_car` | 11/21 | 52% |

## Sub_type Konsolidasyon Önerisi

| Eski sub | Yeni sub | Öncelik | Neden |
|---|---|---|---|
| `single_layer_coating` (1) | → `surface_prep` | P0 | YANLIS GRUP: prep ürünü; group → ceramic_coating, sub → surface_prep |
| `iron_remover` (2) | → `wheel_iron_remover` | P1 | iron_remover = wheel_iron_remover üst-aile; surface farkı specs.target_surface ile |
| `wax_remover` (1) | → `tar_glue_remover` | P1 | solvent tabanlı sökücü; ortak meta key set |
| `oil_degreaser` (1) | = `oil_degreaser` | P2 | tek ürün; ileride degreaser ailesi büyürse ayrı |
| `specialty_cleaner` (1) | = `specialty_cleaner` | P2 | tek ürün; ileride spot_cleaner ailesine |
| `clay_lubricant` (1) | = `clay_lubricant` | P2 | tek ürün; clay_products grubuyla ilişkili — group taşıma adayı |

## Post-Merge Sub_type Dağılımı

| Sub_type | Ürün sayısı |
|---|---|
| `wheel_iron_remover` | 6 |
| `water_spot_remover` | 3 |
| `clay_bar` | 3 |
| `tar_glue_remover` | 3 |
| `bug_remover` | 2 |
| `specialty_cleaner` | 1 |
| `clay_lubricant` | 1 |
| `surface_prep` | 1 |
| `oil_degreaser` | 1 |

## Schema Base — Zorunlu Key Önerisi (post-merge sub_type başına)

### `wheel_iron_remover` (6 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `volume_ml` | 4/6 (67%) | ✓ |
| `ph_level` | 5/6 (83%) | ✓ |
| `target_dirt` | 6/6 (100%) | ✓ |
| `dwell_time_min` | 2/6 (33%) | ✓ |
| `reaction_color` | 3/6 (50%) | ✓ |
| `dilution_ratio` | 2/6 (33%) | ✓ |
| `consumption_ml_per_car` | 3/6 (50%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `gel_form` (5/6)
- `odor` (3/6)
- `concentrate` (2/6)
- `antioksidan_film` (2/6)
- `volume_lt` (1/6)
- `acid_free` (1/6)
- `phosphate_free` (1/6)
- `formulation` (1/6)
- `working_temp_c` (1/6)

### `clay_bar` (3 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `weight_gr` | 3/3 (100%) | ✓ |
| `hardness` | 3/3 (100%) | ✓ |
| `cars_per_bar` | 3/3 (100%) | ✓ |
| `material` | 3/3 (100%) | ✓ |
| `working_temp_c` | 1/3 (33%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `color` (2/3)
- `compatible_surfaces` (2/3)
- `ph_tolerance` (1/3)
- `chemical_resistant` (1/3)
- `consumption_ml_per_car` (1/3)

### `water_spot_remover` (3 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `volume_ml` | 1/3 (33%) | ✓ |
| `ph_level` | 3/3 (100%) | ✓ |
| `target_dirt` | 3/3 (100%) | ✓ |
| `dwell_time_min` | 0/3 (0%) | ✓ |
| `consumption_ml_per_car` | 2/3 (67%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `concentrate` (2/3)
- `dilution_ratio` (2/3)
- `weight_kg` (1/3)
- `ready_to_use` (1/3)
- `chemical_base` (1/3)
- `dwell_time_sec` (1/3)
- `gel_form` (1/3)
- `nta_free` (1/3)
- `edta_free` (1/3)
- `volume_lt` (1/3)
- `phosphate_free` (1/3)
- `consumption_ml_per_panel` (1/3)

### `bug_remover` (2 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `volume_ml` | 2/2 (100%) | ✓ |
| `ph_level` | 2/2 (100%) | ✓ |
| `target_dirt` | 2/2 (100%) | ✓ |
| `dwell_time_min` | 1/2 (50%) | ✓ |
| `ready_to_use` | 2/2 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (1/2)
- `cleaning_power` (1/2)
- `consumption_ml_per_car` (1/2)

### `tar_glue_remover` (3 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `volume_ml` | 2/3 (67%) | ✓ |
| `ph_level` | 2/3 (67%) | ✓ |
| `target_dirt` | 2/3 (67%) | ✓ |
| `chemical_base` | 1/3 (33%) | ✓ |
| `dwell_time_min` | 2/3 (67%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `ready_to_use` (2/3)
- `consumption_ml_per_car` (2/3)
- `voc_content` (1/3)
- `working_temp_c` (1/3)
- `ph` (1/3)
- `features` (1/3)
- `mat_safe` (1/3)
- `consumption_ml` (1/3)
- `dwell_time_seconds` (1/3)
- `applications_per_bottle` (1/3)
- `solvent_free` (1/3)

### `specialty_cleaner` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `volume_ml` | 0/1 (0%) | ✓ |
| `ph_level` | 0/1 (0%) | ✓ |
| `target_dirt` | 0/1 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `weight_kg` (1/1)
- `safe_on_paint` (1/1)
- `dilution_ratio` (1/1)
- `safe_on_plastic` (1/1)

### `clay_lubricant` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `volume_ml` | 1/1 (100%) | ✓ |
| `ready_to_use` | 1/1 (100%) | ✓ |
| `consumption_ml_per_car` | 0/1 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `function` (1/1)
- `ph_level` (1/1)
- `slickness` (1/1)
- `concentrate` (1/1)
- `dilution_ratio` (1/1)

### `oil_degreaser` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `volume_ml` | 0/1 (0%) | ✓ |
| `ph_level` | 1/1 (100%) | ✓ |
| `target_dirt` | 1/1 (100%) | ✓ |
| `chemical_base` | 1/1 (100%) | ✓ |
| `dilution_ratio` | 1/1 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (1/1)
- `function` (1/1)
- `concentrate` (1/1)
- `consumption_ml_per_car` (1/1)

## İlgisiz Key Tespiti (DELETE listesi)

Bu grupta anlamsız 32 potansiyel key:

`abrasiveness`, `battery_capacity_ah`, `cars_per_bar`, `clay_form`, `color_temperature_k`, `confidence`, `contains_sio2`, `cure_time_hours`, `durability_months`, `durability_weeks`, `fit`, `flagship`, `gap_reason`, `grit_range`, `layer_count`, `load_capacity_kg`, `lubricant_required`, `lumens`, `machine_compatible`, `mounting_points`, `no_water_hours`, `orbit_mm`, `premium`, `rpm_range`, `runtime_minutes`, `sio2_percent`, `source`, `speed_range_rpm`, `target_material`, `vacuum_pa`, `wall_mountable`, `wheeled`


→ Ürünlerin specs alanında bulunanlar **3** satır olarak `phase2-contaminant_solvers-key-delete.csv` dosyasına yazıldı.
