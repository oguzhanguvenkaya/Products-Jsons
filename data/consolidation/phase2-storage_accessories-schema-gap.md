# Phase 2 Schema Gap Report — `storage_accessories`

- Toplam ürün: **23**
- Mevcut sub_type sayısı: **11**
- Önerilen sub_type sayısı (post-merge): **10**
- Merge satırları (CSV): **2**
- İlgisiz key DELETE satırları (CSV): **0**

## Top 10 Meta Key Coverage (grup geneli)

| Key | Count | Coverage |
|---|---|---|
| `whenToUse` | 23/23 | 100% |
| `howToUse` | 23/23 | 100% |
| `whyThisProduct` | 23/23 | 100% |
| `material` | 20/23 | 87% |
| `wall_mountable` | 19/23 | 83% |
| `accessory_type` | 19/23 | 83% |
| `portable` | 19/23 | 83% |
| `capacity` | 12/23 | 52% |
| `weight_kg` | 8/23 | 35% |
| `capacity_lt` | 5/23 | 22% |
| `sub_type` | 4/23 | 17% |
| `color` | 4/23 | 17% |

## Sub_type Konsolidasyon Önerisi

| Eski sub | Yeni sub | Öncelik | Neden |
|---|---|---|---|
| `cart_trolley` (1) | = `cart_trolley` | P2 | tek ürün; gelecekte storage_furniture ailesine |
| `storage_box` (1) | = `storage_box` | P2 | tek ürün; gelecekte storage_furniture ailesine |
| `bucket_accessories` (1) | → `wash_accessory` | P1 | bucket aksesuarları yıkama-aksesuarı sınıfına |
| `water_spray_gun` (1) | → `wash_accessory` | P1 | sprey tabancası yıkama-aksesuarı sınıfına |

## Post-Merge Sub_type Dağılımı

| Sub_type | Ürün sayısı |
|---|---|
| `wall_stand` | 4 |
| `work_light` | 3 |
| `vacuum_cleaner` | 3 |
| `work_gear` | 3 |
| `bag_carrier` | 2 |
| `protective_cover` | 2 |
| `wash_accessory` | 2 |
| `holder_clamp` | 2 |
| `cart_trolley` | 1 |
| `storage_box` | 1 |

## Schema Base — Zorunlu Key Önerisi (post-merge sub_type başına)

### `wall_stand` (4 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 4/4 (100%) | ✓ |
| `dimensions_cm` | 0/4 (0%) | ✓ |
| `wall_mountable` | 4/4 (100%) | ✓ |
| `mounting_points` | 2/4 (50%) | ✓ |
| `weight_kg` | 0/4 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `capacity` (4/4)
- `portable` (4/4)
- `accessory_type` (4/4)

### `work_gear` (3 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 3/3 (100%) | ✓ |
| `color` | 1/3 (33%) | ✓ |
| `accessory_type` | 3/3 (100%) | ✓ |
| `quantity` | 1/3 (33%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `portable` (3/3)
- `wall_mountable` (3/3)
- `handle` (1/3)
- `foldable` (1/3)
- `dimensions_open_mm` (1/3)
- `dimensions_folded_mm` (1/3)
- `pocket_count` (1/3)
- `dimensions_cm` (1/3)
- `ccs_technology` (1/3)
- `capacity` (1/3)
- `lengths_inch` (1/3)
- `total_length_inch` (1/3)

### `vacuum_cleaner` (3 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `power_w` | 2/3 (67%) | ✓ |
| `vacuum_pa` | 2/3 (67%) | ✓ |
| `capacity_lt` | 3/3 (100%) | ✓ |
| `voltage` | 0/3 (0%) | ✓ |
| `portable` | 3/3 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `power` (3/3)
- `capacity` (3/3)
- `material` (3/3)
- `accessory_type` (3/3)
- `wall_mountable` (3/3)
- `weight_kg` (2/3)
- `dimensions_mm` (2/3)
- `wet_dry` (1/3)
- `flow_rate_lpm` (1/3)
- `blower_function` (1/3)
- `liquid_capacity_lt` (1/3)
- `runtime_min` (1/3)
- `filter_area_cm2` (1/3)
- `wheeled` (1/3)
- `head_count` (1/3)

### `work_light` (3 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `power_w` | 0/3 (0%) | ✓ |
| `color_temperature_k` | 2/3 (67%) | ✓ |
| `voltage` | 2/3 (67%) | ✓ |
| `ip_rating` | 2/3 (67%) | ✓ |
| `portable` | 0/3 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (3/3)
- `product_type` (3/3)
- `cri` (1/3)
- `lumen_max` (1/3)
- `runtime_max_hours` (1/3)
- `color_temperature_levels` (1/3)
- `color_temperature_range_k` (1/3)
- `lumen` (1/3)
- `range_m` (1/3)
- `weight_g` (1/3)
- `battery_type` (1/3)
- `runtime_hours` (1/3)
- `beam_angle_range` (1/3)
- `lumen_levels` (1/3)
- `height_range_m` (1/3)

### `protective_cover` (2 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 2/2 (100%) | ✓ |
| `dimensions_cm` | 0/2 (0%) | ✓ |
| `color` | 2/2 (100%) | ✓ |
| `accessory_type` | 2/2 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `portable` (2/2)
- `quantity` (2/2)
- `waterproof` (2/2)
- `wall_mountable` (2/2)
- `wear_resistant` (2/2)
- `universal_fit` (1/2)

### `bag_carrier` (2 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 2/2 (100%) | ✓ |
| `dimensions_cm` | 0/2 (0%) | ✓ |
| `color` | 0/2 (0%) | ✓ |
| `accessory_type` | 2/2 (100%) | ✓ |
| `portable` | 2/2 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `wall_mountable` (2/2)
- `weight_kg` (1/2)
- `dimensions` (1/2)
- `pocket_count` (1/2)
- `leg_strap_inch` (1/2)
- `dimensions_inch` (1/2)
- `belt_length_inch` (1/2)

### `holder_clamp` (2 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 2/2 (100%) | ✓ |
| `accessory_type` | 2/2 (100%) | ✓ |
| `wall_mountable` | 2/2 (100%) | ✓ |
| `mounting_points` | 0/2 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `portable` (2/2)
- `max_load_lbs` (1/2)
- `dimensions_cm` (1/2)
- `barrel_size_mm` (1/2)
- `capacity` (1/2)
- `quantity` (1/2)
- `max_load_kg` (1/2)

### `wash_accessory` (2 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 2/2 (100%) | ✓ |
| `accessory_type` | 1/2 (50%) | ✓ |
| `capacity` | 1/2 (50%) | ✓ |
| `portable` | 1/2 (50%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `color` (1/2)
- `capacity_lt` (1/2)
- `includes_lid` (1/2)
- `scale_markings` (1/2)
- `wall_mountable` (1/2)
- `includes_grit_guard` (1/2)
- `features` (1/2)
- `spray_modes` (1/2)
- `product_type` (1/2)

### `cart_trolley` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 1/1 (100%) | ✓ |
| `dimensions_cm` | 1/1 (100%) | ✓ |
| `wheeled` | 1/1 (100%) | ✓ |
| `capacity` | 1/1 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `tiers` (1/1)
- `portable` (1/1)
- `weight_kg` (1/1)
- `accessory_type` (1/1)
- `wall_mountable` (1/1)

### `storage_box` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 1/1 (100%) | ✓ |
| `dimensions_cm` | 0/1 (0%) | ✓ |
| `capacity_lt` | 1/1 (100%) | ✓ |
| `color` | 0/1 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `capacity` (1/1)
- `foldable` (1/1)
- `portable` (1/1)
- `stackable` (1/1)
- `accessory_type` (1/1)
- `wall_mountable` (1/1)

## İlgisiz Key Tespiti (DELETE listesi)

Bu grupta anlamsız 32 potansiyel key:

`abrasiveness`, `alcohol_free`, `anti_static`, `battery_capacity_ah`, `concentrate`, `confidence`, `consumption_ml_per_car`, `contains_sio2`, `cure_time_hours`, `dilution_ratio`, `durability_months`, `dwell_time_min`, `fit`, `flagship`, `formulation`, `gap_reason`, `grit_range`, `ipa_content`, `orbit_mm`, `ph_level`, `premium`, `rpm_range`, `runtime_minutes`, `scent`, `silicone_free`, `solvent_based`, `source`, `speed_range_rpm`, `target_dirt`, `toxic_free`, `volume_ml`, `water_based`


→ Ürünlerin specs alanında bulunanlar **0** satır olarak `phase2-storage_accessories-key-delete.csv` dosyasına yazıldı.
