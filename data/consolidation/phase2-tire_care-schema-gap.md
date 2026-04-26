# Phase 2 Schema Gap Report — `tire_care`

- Toplam ürün: **7**
- Mevcut sub_type sayısı: **3**
- Önerilen sub_type sayısı (post-merge): **2**
- Merge satırları (CSV): **3**
- İlgisiz key DELETE satırları (CSV): **0**

## Top 10 Meta Key Coverage (grup geneli)

| Key | Count | Coverage |
|---|---|---|
| `whyThisProduct` | 7/7 | 100% |
| `safe_on_screens` | 7/7 | 100% |
| `anti_bacterial_claim` | 7/7 | 100% |
| `howToUse` | 7/7 | 100% |
| `finish` | 7/7 | 100% |
| `sub_type` | 7/7 | 100% |
| `target_surfaces` | 7/7 | 100% |
| `uv_protection` | 7/7 | 100% |
| `concentrate` | 7/7 | 100% |
| `dilution` | 7/7 | 100% |
| `whenToUse` | 7/7 | 100% |
| `scent` | 7/7 | 100% |

## Sub_type Konsolidasyon Önerisi

| Eski sub | Yeni sub | Öncelik | Neden |
|---|---|---|---|
| `tire_gel` (3) | → `tire_dressing` | P1 | gel=dressing formülasyonu; specs.formulation=gel ile ayırt |

## Post-Merge Sub_type Dağılımı

| Sub_type | Ürün sayısı |
|---|---|
| `tire_dressing` | 6 |
| `tire_cleaner` | 1 |

## Schema Base — Zorunlu Key Önerisi (post-merge sub_type başına)

### `tire_dressing` (6 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `volume_ml` | 4/6 (67%) | ✓ |
| `form` | 3/6 (50%) | ✓ |
| `hydrophobic` | 3/6 (50%) | ✓ |
| `non_greasy` | 1/6 (17%) | ✓ |
| `water_resistant` | 2/6 (33%) | ✓ |
| `durability` | 2/6 (33%) | ✓ |
| `consumption` | 2/6 (33%) | ✓ |
| `no_sling` | 1/6 (17%) | ✓ |
| `coating_safe` | 0/6 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `made_in` (3/6)
- `function` (3/6)
- `dilution_ratio` (2/6)
- `chemical_resistant` (1/6)
- `weight_kg` (1/6)
- `duration` (1/6)
- `volume_lt` (1/6)
- `solvent_based` (1/6)
- `ready_to_use` (1/6)
- `anti_static` (1/6)
- `consumption_ml_per_car` (1/6)

### `tire_cleaner` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `volume_ml` | 1/1 (100%) | ✓ |
| `ph_level` | 1/1 (100%) | ✓ |
| `foam_level` | 1/1 (100%) | ✓ |
| `dilution_ratio` | 0/1 (0%) | ✓ |
| `consumption` | 1/1 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `made_in` (1/1)
- `function` (1/1)
- `coating_safe` (1/1)
- `ready_to_use` (1/1)

## İlgisiz Key Tespiti (DELETE listesi)

Bu grupta anlamsız 29 potansiyel key:

`abrasiveness`, `battery_capacity_ah`, `cars_per_bar`, `clay_form`, `color_temperature_k`, `confidence`, `contains_sio2`, `cure_time_hours`, `fit`, `flagship`, `gap_reason`, `grit_range`, `hardness`, `ipa_content`, `load_capacity_kg`, `lubricant_required`, `lumens`, `machine_compatible`, `mounting_points`, `orbit_mm`, `premium`, `rpm_range`, `runtime_minutes`, `sio2_percent`, `source`, `speed_range_rpm`, `vacuum_pa`, `wall_mountable`, `wheeled`


→ Ürünlerin specs alanında bulunanlar **0** satır olarak `phase2-tire_care-key-delete.csv` dosyasına yazıldı.
