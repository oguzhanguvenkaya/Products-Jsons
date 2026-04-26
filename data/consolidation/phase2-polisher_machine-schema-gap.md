# Phase 2 Schema Gap Report — `polisher_machine`

- Toplam ürün: **23**
- Mevcut sub_type sayısı: **8**
- Önerilen sub_type sayısı (post-merge): **6**
- Merge satırları (CSV): **11**
- İlgisiz key DELETE satırları (CSV): **0**

## Top 10 Meta Key Coverage (grup geneli)

| Key | Count | Coverage |
|---|---|---|
| `whyThisProduct` | 23/23 | 100% |
| `power_source` | 23/23 | 100% |
| `whenToUse` | 23/23 | 100% |
| `howToUse` | 23/23 | 100% |
| `features` | 22/23 | 96% |
| `weight_kg` | 21/23 | 91% |
| `backing_plate_supported_mm` | 20/23 | 87% |
| `orbit_mm` | 17/23 | 74% |
| `kit_contents` | 11/23 | 48% |
| `voltage` | 11/23 | 48% |
| `speed_range_rpm` | 11/23 | 48% |
| `power_watt` | 10/23 | 43% |

## Sub_type Konsolidasyon Önerisi

| Eski sub | Yeni sub | Öncelik | Neden |
|---|---|---|---|
| `cordless_rotary_polisher` (1) | → `rotary_polisher` | P0 | tek ürünlü; cordless+corded=rotary üst-aile |
| `corded_rotary_polisher` (3) | → `rotary_polisher` | P0 | 3 ürünlü; cordless ile birleştir → rotary_polisher |
| `machine_kit` (1) | = `machine_kit` | P2 | tek ürün; ileride kit_bundle ile birleşir |
| `forced_rotation_polisher` (2) | → `da_polisher` | P1 | forced rotation = DA türevi; meta key uyumu yüksek |
| `other` (5) | → `polisher_accessory` | P0 | aksesuar/yedek parça; sub_type=other anlamsız |

## Post-Merge Sub_type Dağılımı

| Sub_type | Ürün sayısı |
|---|---|
| `da_polisher` | 6 |
| `mini_cordless_polisher` | 5 |
| `polisher_accessory` | 5 |
| `rotary_polisher` | 4 |
| `sander` | 2 |
| `machine_kit` | 1 |

## Schema Base — Zorunlu Key Önerisi (post-merge sub_type başına)

### `rotary_polisher` (4 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `power_watt` | 3/4 (75%) | ✓ |
| `speed_range_rpm` | 4/4 (100%) | ✓ |
| `orbit_mm` | 0/4 (0%) | ✓ |
| `weight_kg` | 4/4 (100%) | ✓ |
| `voltage` | 2/4 (50%) | ✓ |
| `power_source` | 4/4 (100%) | ✓ |
| `motor_type` | 1/4 (25%) | ✓ |
| `backing_plate_supported_mm` | 4/4 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (4/4)
- `cable_length_m` (3/4)
- `spindle_thread` (3/4)
- `max_pad_diameter_mm` (2/4)
- `speed_range` (2/4)
- `speed_levels` (2/4)
- `kit_contents` (1/4)
- `battery_count` (1/4)
- `runtime_minutes` (1/4)
- `battery_capacity_ah` (1/4)
- `charge_time_minutes` (1/4)

### `da_polisher` (6 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `power_watt` | 4/6 (67%) | ✓ |
| `speed_range_rpm` | 4/6 (67%) | ✓ |
| `orbit_mm` | 6/6 (100%) | ✓ |
| `oscillation_speed_rpm` | 5/6 (83%) | ✓ |
| `weight_kg` | 6/6 (100%) | ✓ |
| `voltage` | 3/6 (50%) | ✓ |
| `motor_type` | 2/6 (33%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (6/6)
- `power_source` (6/6)
- `backing_plate_supported_mm` (6/6)
- `max_pad_diameter_mm` (3/6)
- `speed_levels` (3/6)
- `cable_length_m` (2/6)
- `rotation_speed_rpm` (2/6)
- `battery_count` (2/6)
- `runtime_minutes` (2/6)
- `battery_capacity_ah` (2/6)
- `power_output_watt` (1/6)
- `kit_contents` (1/6)

### `mini_cordless_polisher` (5 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `power_watt` | 0/5 (0%) | ✓ |
| `speed_range_rpm` | 2/5 (40%) | ✓ |
| `orbit_mm` | 1/5 (20%) | ✓ |
| `weight_kg` | 2/5 (40%) | ✓ |
| `voltage` | 4/5 (80%) | ✓ |
| `battery_capacity_ah` | 2/5 (40%) | ✓ |
| `runtime_minutes` | 1/5 (20%) | ✓ |
| `battery_count` | 1/5 (20%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (4/5)
- `motor_type` (4/5)
- `product_type` (2/5)
- `speed_levels` (2/5)
- `power_source` (2/5)
- `orbit_options_mm` (2/5)
- `backing_plate_supported_mm` (2/5)
- `charger_included` (1/5)
- `max_pad_diameter_mm` (1/5)
- `max_torque_nm` (1/5)
- `color` (1/5)
- `hardness` (1/5)
- `pad_type` (1/5)
- `height_mm` (1/5)
- `pack_quantity` (1/5)

### `sander` (2 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `power_watt` | 2/2 (100%) | ✓ |
| `speed_range_rpm` | 1/2 (50%) | ✓ |
| `orbit_mm` | 2/2 (100%) | ✓ |
| `weight_kg` | 1/2 (50%) | ✓ |
| `voltage` | 0/2 (0%) | ✓ |
| `motor_type` | 2/2 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (2/2)
- `power_source` (2/2)
- `backing_plate_diameter_mm` (1/2)
- `cable_length_m` (1/2)
- `sanding_pad_size_mm` (1/2)
- `oscillation_speed_rpm` (1/2)

### `machine_kit` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `kit_contents` | 1/1 (100%) | ✓ |
| `weight_kg` | 0/1 (0%) | ✓ |
| `product_type` | 0/1 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `voltage` (1/1)
- `features` (1/1)
- `power_source` (1/1)

### `polisher_accessory` (5 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 3/5 (60%) | ✓ |
| `product_type` | 4/5 (80%) | ✓ |
| `features` | 5/5 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `weight_g` (2/5)
- `max_speed_rpm` (1/5)
- `accessory_type` (1/5)
- `shaft_length_cm` (1/5)
- `compatible_machine` (1/5)
- `voltage` (1/5)
- `power_watt` (1/5)
- `airflow_l_min` (1/5)
- `airflow_levels` (1/5)
- `cable_length_m` (1/5)
- `temperature_step_c` (1/5)
- `temperature_range_c` (1/5)
- `nozzle_type` (1/5)
- `dimensions_mm` (1/5)
- `max_pressure_bar` (1/5)

## İlgisiz Key Tespiti (DELETE listesi)

Bu grupta anlamsız 32 potansiyel key:

`alcohol_free`, `anti_static`, `concentrate`, `confidence`, `consumption`, `consumption_ml`, `consumption_ml_per_car`, `contains_sio2`, `cure_time_hours`, `dilution_ratio`, `durability_label`, `durability_months`, `durability_weeks`, `dwell_time_min`, `fit`, `flagship`, `foam_level`, `formulation`, `gap_reason`, `ipa_content`, `ph_level`, `premium`, `reaction_color`, `scent`, `silicone_free`, `sio2_percent`, `solvent_based`, `source`, `target_dirt`, `toxic_free`, `volume_ml`, `water_based`


→ Ürünlerin specs alanında bulunanlar **0** satır olarak `phase2-polisher_machine-key-delete.csv` dosyasına yazıldı.
