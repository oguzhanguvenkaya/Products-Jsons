# Phase 2 Schema Gap Report — `applicators`

- Toplam ürün: **14**
- Mevcut sub_type sayısı: **6**
- Önerilen sub_type sayısı (post-merge): **4**
- Merge satırları (CSV): **3**
- İlgisiz key DELETE satırları (CSV): **1**

## Top 10 Meta Key Coverage (grup geneli)

| Key | Count | Coverage |
|---|---|---|
| `whenToUse` | 14/14 | 100% |
| `howToUse` | 14/14 | 100% |
| `whyThisProduct` | 14/14 | 100% |
| `material` | 14/14 | 100% |
| `reusable` | 13/14 | 93% |
| `intended_use` | 13/14 | 93% |
| `features` | 11/14 | 79% |
| `type` | 9/14 | 64% |
| `quantity` | 7/14 | 50% |
| `design` | 6/14 | 43% |
| `shape` | 6/14 | 43% |
| `purpose` | 5/14 | 36% |

## Sub_type Konsolidasyon Önerisi

| Eski sub | Yeni sub | Öncelik | Neden |
|---|---|---|---|
| `scrub_pad` (1) | → `cleaning_pad` | P0 | tek ürün; sponge/scrub ortak amaç=temizlik pedi |
| `wash_sponge` (1) | → `cleaning_pad` | P0 | tek ürün; yıkama süngeri = temizlik pedi |
| `cleaning_sponge` (1) | → `cleaning_pad` | P0 | tek ürün; ortak meta=material+shape |

## Post-Merge Sub_type Dağılımı

| Sub_type | Ürün sayısı |
|---|---|
| `applicator_pad` | 6 |
| `cleaning_pad` | 3 |
| `tire_applicator` | 3 |
| `coating_applicator` | 2 |

## Schema Base — Zorunlu Key Önerisi (post-merge sub_type başına)

### `applicator_pad` (6 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 6/6 (100%) | ✓ |
| `reusable` | 6/6 (100%) | ✓ |
| `intended_use` | 6/6 (100%) | ✓ |
| `type` | 5/6 (83%) | ✓ |
| `quantity` | 3/6 (50%) | ✓ |
| `shape` | 3/6 (50%) | ✓ |
| `design` | 3/6 (50%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (5/6)
- `size` (2/6)
- `version` (1/6)
- `purpose` (1/6)
- `color` (1/6)
- `diameter` (1/6)

### `tire_applicator` (3 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 3/3 (100%) | ✓ |
| `reusable` | 3/3 (100%) | ✓ |
| `intended_use` | 3/3 (100%) | ✓ |
| `shape` | 3/3 (100%) | ✓ |
| `design` | 1/3 (33%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `type` (3/3)
- `features` (3/3)
- `quantity` (2/3)
- `purpose` (1/3)
- `size` (1/3)
- `ergonomic` (1/3)

### `coating_applicator` (2 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 2/2 (100%) | ✓ |
| `reusable` | 2/2 (100%) | ✓ |
| `intended_use` | 2/2 (100%) | ✓ |
| `type` | 0/2 (0%) | ✓ |
| `quantity` | 2/2 (100%) | ✓ |
| `design` | 2/2 (100%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `purpose` (2/2)
- `professional` (1/2)
- `features` (1/2)

### `cleaning_pad` (3 ürün)

| Key | Mevcut coverage | Zorunlu? |
|---|---|---|
| `material` | 3/3 (100%) | ✓ |
| `reusable` | 2/3 (67%) | ✓ |
| `intended_use` | 2/3 (67%) | ✓ |
| `shape` | 0/3 (0%) | ✓ |
| `design` | 0/3 (0%) | ✓ |
| `purpose` | 1/3 (33%) | ✓ |

**Şemaya alınmayan ama gözlenen keyler:**

- `features` (2/3)
- `function` (2/3)
- `version` (1/3)
- `safe_for` (1/3)
- `color` (1/3)
- `dimensions` (1/3)
- `scratch_safe` (1/3)
- `type` (1/3)
- `chemical_free` (1/3)

## İlgisiz Key Tespiti (DELETE listesi)

Bu grupta anlamsız 31 potansiyel key:

`alcohol_free`, `anti_static`, `battery_capacity_ah`, `chemical_base`, `chemical_free`, `color_temperature_k`, `confidence`, `consumption_ml_per_car`, `contains_sio2`, `cure_time_hours`, `dilution_ratio`, `durability_months`, `dwell_time_min`, `fit`, `flagship`, `formulation`, `gap_reason`, `ipa_content`, `lumens`, `ph_level`, `premium`, `reaction_color`, `rpm_range`, `runtime_minutes`, `scent`, `solvent_based`, `source`, `speed_range_rpm`, `target_dirt`, `vacuum_pa`, `volume_ml`


→ Ürünlerin specs alanında bulunanlar **1** satır olarak `phase2-applicators-key-delete.csv` dosyasına yazıldı.
