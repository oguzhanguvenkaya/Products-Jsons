# Phase 2 Schema Gap Report — `clay_products`

- Toplam ürün: **8**
- Mevcut sub_type sayısı: **5**
- Önerilen sub_type sayısı (post-merge): **2**
- Merge satırları (CSV): **3**
- İlgisiz key DELETE satırları (CSV): **3**

## Top 10 Meta Key Coverage (grup geneli)

| Key | Count | Coverage |
|---|---|---|
| `howToUse` | 8/8 | 100% |
| `size` | 8/8 | 100% |
| `whyThisProduct` | 8/8 | 100% |
| `whenToUse` | 8/8 | 100% |
| `clay_form` | 7/8 | 88% |
| `color` | 7/8 | 88% |
| `grade` | 7/8 | 88% |
| `lubricant_required` | 7/8 | 88% |
| `machine_compatible` | 7/8 | 88% |
| `reusable` | 7/8 | 88% |
| `material` | 7/8 | 88% |
| `durability` | 5/8 | 62% |

## Sub_type Konsolidasyon Önerisi

| Eski sub | Yeni sub | Öncelik | Neden |
|---|---|---|---|
| `clay_disc` (1) | → `clay_pad` | P0 | tek ürün; form=disc specs.format ile ayırt |
| `clay_cloth` (1) | → `clay_pad` | P0 | tek ürün; form=cloth specs.format ile ayırt |
| `clay_mitt` (1) | → `clay_pad` | P0 | tek ürün; form=mitt specs.format ile ayırt |

## Post-Merge Sub_type Dağılımı

| Sub_type | Ürün sayısı |
|---|---|
| `clay_pad` | 7 |
| `clay_bar` | 1 |

## Schema Base — Zorunlu Key Önerisi (post-merge sub_type başına)

### `clay_pad` (7 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 7/7 (100%) | ✓ |
| `grade` | 6/7 (86%) | ✓ |
| `clay_form` | 6/7 (86%) | ✓ |
| `reusable` | 6/7 (86%) | ✓ |
| `lubricant_required` | 6/7 (86%) | ✓ |
| `machine_compatible` | 6/7 (86%) | ✓ |
| `size` | 6/7 (86%) | ✓ |
| `color` | 5/7 (71%) | ✓ |
| `durability` | 5/7 (71%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `attachment` (2/7)
- `weight` (1/7)
- `diameter` (1/7)
- `thickness` (1/7)
- `body` (1/7)
- `quantity` (1/7)
- `pack_quantity` (1/7)
- `compatible_with` (1/7)

### `clay_bar` (1 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 0/1 (0%) | ✓ |
| `grade` | 1/1 (100%) | ✓ |
| `clay_form` | 1/1 (100%) | ✓ |
| `reusable` | 1/1 (100%) | ✓ |
| `lubricant_required` | 1/1 (100%) | ✓ |
| `color` | 1/1 (100%) | ✓ |
| `durability` | 0/1 (0%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `size` (1/1)
- `weight` (1/1)
- `ppf_safe` (1/1)
- `matte_safe` (1/1)
- `ph_tolerance` (1/1)
- `chemical_resistant` (1/1)
- `machine_compatible` (1/1)
- `consumption_ml_per_car` (1/1)

## İlgisiz Key Tespiti (DELETE listesi)

Bu grupta anlamsız 31 potansiyel key:

`alcohol_free`, `anti_static`, `battery_capacity_ah`, `chemical_base`, `chemical_resistant`, `confidence`, `consumption_ml_per_car`, `contains_sio2`, `cure_time_hours`, `dilution_ratio`, `durability_months`, `dwell_time_min`, `fit`, `flagship`, `foam_level`, `formulation`, `gap_reason`, `ipa_content`, `ph_level`, `ph_tolerance`, `premium`, `reaction_color`, `rpm_range`, `runtime_minutes`, `scent`, `sio2_percent`, `solvent_based`, `source`, `speed_range_rpm`, `target_dirt`, `volume_ml`


→ Ürünlerin specs alanında bulunanlar **3** satır olarak `phase2-clay_products-key-delete.csv` dosyasına yazıldı.
