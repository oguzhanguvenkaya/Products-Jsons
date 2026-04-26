# Phase 2 Schema Gap Report — `industrial_products`

- Toplam ürün: **12**
- Mevcut sub_type sayısı: **2**
- Önerilen sub_type sayısı (post-merge): **2**
- Merge satırları (CSV): **0**
- İlgisiz key DELETE satırları (CSV): **46**

## Top 10 Meta Key Coverage (grup geneli)

| Key | Count | Coverage |
|---|---|---|
| `whyThisProduct` | 12/12 | 100% |
| `howToUse` | 12/12 | 100% |
| `whenToUse` | 12/12 | 100% |
| `sub_type` | 12/12 | 100% |
| `color` | 11/12 | 92% |
| `gap_reason` | 11/12 | 92% |
| `target_material` | 11/12 | 92% |
| `confidence` | 11/12 | 92% |
| `weight` | 11/12 | 92% |
| `type` | 11/12 | 92% |
| `fit` | 11/12 | 92% |
| `source` | 11/12 | 92% |

## Sub_type Konsolidasyon Önerisi

| Eski sub | Yeni sub | Öncelik | Neden |
|---|---|---|---|
| `engine_cleaner` (1) | = `engine_cleaner` | P2 | tek ürün; ileride engine_care ailesine — şimdilik dur |

## Post-Merge Sub_type Dağılımı

| Sub_type | Ürün sayısı |
|---|---|
| `metal_polish` | 11 |
| `engine_cleaner` | 1 |

## Schema Base — Zorunlu Key Önerisi (post-merge sub_type başına)

### `metal_polish` (11 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `target_material` | 11/11 (100%) | ✓ |
| `abrasiveness` | 3/11 (27%) | ✓ |
| `grit_range` | 1/11 (9%) | ✓ |
| `finish` | 1/11 (9%) | ✓ |
| `type` | 11/11 (100%) | ✓ |
| `features` | 0/11 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `fit` (11/11)
- `color` (11/11)
- `source` (11/11)
- `weight` (11/11)
- `confidence` (11/11)
- `gap_reason` (11/11)
- `flagship` (1/11)
- `heat_buildup` (1/11)
- `premium` (1/11)
- `finish_level` (1/11)

### `engine_cleaner` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `target_material` | 0/1 (0%) | ✓ |
| `dilution_ratio` | 1/1 (100%) | ✓ |
| `features` | 0/1 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `weight_kg` (1/1)
- `eco_friendly` (1/1)
- `cationic_formula` (1/1)

## İlgisiz Key Tespiti (DELETE listesi)

Bu grupta anlamsız 30 potansiyel key:

`battery_capacity_ah`, `cars_per_bar`, `clay_form`, `coating_safe`, `color_temperature_k`, `confidence`, `contains_sio2`, `cure_time_hours`, `durability_months`, `durability_weeks`, `fit`, `flagship`, `gap_reason`, `hydrophobic`, `load_capacity_kg`, `lubricant_required`, `lumens`, `machine_compatible`, `mounting_points`, `no_sling`, `orbit_mm`, `premium`, `rpm_range`, `runtime_minutes`, `sio2_percent`, `source`, `speed_range_rpm`, `vacuum_pa`, `wall_mountable`, `wheeled`


→ Ürünlerin specs alanında bulunanlar **46** satır olarak `phase2-industrial_products-key-delete.csv` dosyasına yazıldı.
