# Phase 2 Schema Gap Report — ceramic_coating

Toplam ürün: **23**, sub_type sayısı: **15**

## Top 15 specs key (group-wide coverage)
| Key | Adet | Coverage |
|---|---:|---:|
| howToUse | 23 | 100.0% |
| whenToUse | 23 | 100.0% |
| whyThisProduct | 23 | 100.0% |
| durability_months | 22 | 95.7% |
| consumption_ml_per_car | 18 | 78.3% |
| ratings | 15 | 65.2% |
| ph_tolerance | 15 | 65.2% |
| durability_km | 13 | 56.5% |
| features | 12 | 52.2% |
| application_surface | 11 | 47.8% |
| contact_angle | 11 | 47.8% |
| layer_count | 6 | 26.1% |
| cure_time_hours | 6 | 26.1% |
| application_method | 6 | 26.1% |
| technology | 6 | 26.1% |

## Sub_type detayı

### `paint_coating` (n=5)
**Örnek SKU'lar:** MXP-DPCN50KS, MXP-CCN50KS, Q2-PLE50M

**Mevcut top keys:**
- `howToUse` — 5/5 (100%)
- `whenToUse` — 5/5 (100%)
- `whyThisProduct` — 5/5 (100%)
- `durability_months` — 5/5 (100%)
- `hardness` — 4/5 (80%)
- `contact_angle` — 4/5 (80%)
- `durability_km` — 4/5 (80%)
- `consumption_ml_per_car` — 4/5 (80%)

**Önerilen schema base (zorunlu):**
- `sio2_content` — 0/5 (0%) [GAP]
- `durability_months` — 5/5 (100%) [OK]
- `contact_angle` — 4/5 (80%) [OK]
- `application_method` — 0/5 (0%) [GAP]
- `curing_time_h` — 0/5 (0%) [GAP]
- `volume_ml` — 0/5 (0%) [GAP]
- `howToUse` — 5/5 (100%) [OK]
- `whenToUse` — 5/5 (100%) [OK]
- `whyThisProduct` — 5/5 (100%) [OK]
- `features` — 3/5 (60%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `sio2_content` eksik: MXP-DPCN50KS, MXP-CCN50KS, Q2-PLE50M, 700405, Q2-MLE100M
- `contact_angle` eksik: 700405
- `application_method` eksik: MXP-DPCN50KS, MXP-CCN50KS, Q2-PLE50M, 700405, Q2-MLE100M
- `curing_time_h` eksik: MXP-DPCN50KS, MXP-CCN50KS, Q2-PLE50M, 700405, Q2-MLE100M
- `volume_ml` eksik: MXP-DPCN50KS, MXP-CCN50KS, Q2-PLE50M, 700405, Q2-MLE100M
- `features` eksik: Q2-PLE50M, Q2-MLE100M

### `glass_coating` (n=3)
**Örnek SKU'lar:** Q2-VE20M, 79296, Q2-AF120M

**Mevcut top keys:**
- `howToUse` — 3/3 (100%)
- `whenToUse` — 3/3 (100%)
- `whyThisProduct` — 3/3 (100%)
- `durability_months` — 3/3 (100%)
- `consumption_ml_per_car` — 3/3 (100%)
- `ratings` — 2/3 (67%)
- `ph_tolerance` — 2/3 (67%)
- `speed_threshold` — 2/3 (67%)

**Önerilen schema base (zorunlu):**
- `durability_months` — 3/3 (100%) [OK]
- `contact_angle` — 1/3 (33%) [GAP]
- `application_method` — 0/3 (0%) [GAP]
- `curing_time_h` — 0/3 (0%) [GAP]
- `volume_ml` — 0/3 (0%) [GAP]
- `howToUse` — 3/3 (100%) [OK]
- `whenToUse` — 3/3 (100%) [OK]
- `whyThisProduct` — 3/3 (100%) [OK]
- `features` — 1/3 (33%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `contact_angle` eksik: Q2-VE20M, 79296
- `application_method` eksik: Q2-VE20M, 79296, Q2-AF120M
- `curing_time_h` eksik: Q2-VE20M, 79296, Q2-AF120M
- `volume_ml` eksik: Q2-VE20M, 79296, Q2-AF120M
- `features` eksik: Q2-VE20M, Q2-AF120M

### `single_layer_coating` (n=2)
**Örnek SKU'lar:** Q2-PR1000M, Q2-OLE100M

**Mevcut top keys:**
- `ratings` — 2/2 (100%)
- `howToUse` — 2/2 (100%)
- `irl_safe` — 2/2 (100%)
- `sub_type` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `layer_count` — 2/2 (100%)
- `kit_contents` — 2/2 (100%)
- `prep_required` — 2/2 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `fabric_coating` (n=2)
**Örnek SKU'lar:** Q2-FCNA400M, 79299

**Mevcut top keys:**
- `features` — 2/2 (100%)
- `howToUse` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `whyThisProduct` — 2/2 (100%)
- `durability_months` — 2/2 (100%)
- `application_method` — 2/2 (100%)
- `application_surface` — 2/2 (100%)
- `ratings` — 1/2 (50%)

**Önerilen schema base (zorunlu):**
- `durability_months` — 2/2 (100%) [OK]
- `volume_ml` — 0/2 (0%) [GAP]
- `application_method` — 2/2 (100%) [OK]
- `breathable` — 0/2 (0%) [GAP]
- `howToUse` — 2/2 (100%) [OK]
- `whenToUse` — 2/2 (100%) [OK]
- `whyThisProduct` — 2/2 (100%) [OK]
- `features` — 2/2 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `volume_ml` eksik: Q2-FCNA400M, 79299
- `breathable` eksik: Q2-FCNA400M, 79299

### `wheel_coating` (n=1)
**Örnek SKU'lar:** Q2-RE30M

**Mevcut top keys:**
- `ratings` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `durability_km` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `heat_resistance` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `ppf_coating` (n=1)
**Örnek SKU'lar:** Q2-PPFE50M

**Mevcut top keys:**
- `ratings` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `contact_angle` — 1/1 (100%)
- `durability_km` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `multi_step_coating_kit` (n=1)
**Örnek SKU'lar:** MXP-HC50KS

**Mevcut top keys:**
- `howToUse` — 1/1 (100%)
- `irl_safe` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `technology` — 1/1 (100%)
- `layer_count` — 1/1 (100%)
- `kit_contents` — 1/1 (100%)
- `self_healing` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `interior_coating` (n=1)
**Örnek SKU'lar:** Q2-PC100M

**Mevcut top keys:**
- `function` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `technology` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `durability_months` — 1/1 (100%)
- `application_surface` — 1/1 (100%)
- `consumption_ml_per_sqm` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `tire_coating` (n=1)
**Örnek SKU'lar:** Q2-TYA500M

**Mevcut top keys:**
- `ratings` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `composition` — 1/1 (100%)
- `finish_effect` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `durability_washes` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `top_coat` (n=1)
**Örnek SKU'lar:** Q2-BS30M

**Mevcut top keys:**
- `function` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `contact_angle` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `durability_months` — 1/1 (100%)
- `application_surface` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `trim_coating` (n=1)
**Örnek SKU'lar:** Q2-TRE30M

**Mevcut top keys:**
- `ratings` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `durability_km` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `durability_months` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `paint_coating_kit` (n=1)
**Örnek SKU'lar:** Q2-SLE50M

**Mevcut top keys:**
- `ratings` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `layer_count` — 1/1 (100%)
- `kit_contents` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `contact_angle` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `matte_coating` (n=1)
**Örnek SKU'lar:** Q2-MTEL50M

**Mevcut top keys:**
- `ratings` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `contact_angle` — 1/1 (100%)
- `durability_km` — 1/1 (100%)
- `finish_effect` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `spray_coating` (n=1)
**Örnek SKU'lar:** Q2-CCE200M

**Mevcut top keys:**
- `ratings` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `consumption` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `contact_angle` — 1/1 (100%)
- `durability_km` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `leather_coating` (n=1)
**Örnek SKU'lar:** Q2-LSE50M

**Mevcut top keys:**
- `ratings` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `ph_tolerance` — 1/1 (100%)
- `durability_km` — 1/1 (100%)
- `finish_effect` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

## Merge önerileri
| Tier | From | To | n | Gerekçe |
|---|---|---|---:|---|
| P0 | `single_layer_coating` | `paint_coating` | 2 | 2 ürün; tek katlı seramik = boya kaplama alt-tipi |
| P0 | `matte_coating` | `paint_coating` | 1 | Tek ürün; mat kaplama paint_coating mat varyantı |
| P0 | `spray_coating` | `paint_coating` | 1 | Tek ürün; sprey kaplama paint_coating uygulama formu |
| P0 | `paint_coating_kit` | `paint_coating` | 1 | Tek ürün; kit boya kaplama ile birleşir (kit flag ayrı saklanır) |
| P0 | `multi_step_coating_kit` | `paint_coating` | 1 | Tek ürün; çok adımlı kit paint_coating altı |
| P1 | `top_coat` | `paint_coating` | 1 | Tek ürün; üst kat paint_coating ekipmanı; ayrı tutmak da mümkün |
| P1 | `ppf_coating` | `paint_coating` | 1 | Tek ürün; PPF koruma paint_coating alt-tipi (PPF üstü) |
| P1 | `trim_coating` | `paint_coating` | 1 | Tek ürün; trim kaplama plastik koruma; "trim_coating" yeni sub düşünülebilir |
| P1 | `wheel_coating` | `paint_coating` | 1 | Tek ürün; jant kaplama paint_coating ile mineral seramik benzer |
| P2 | `interior_coating` | `fabric_coating` | 1 | Tek ürün; iç mekan kaplama; semantik fabric/leather kaplama yakın |
| P2 | `leather_coating` | `fabric_coating` | 1 | Tek ürün; deri kaplama ile kumaş kaplama yakın hidrofobik mekanik |
| P2 | `tire_coating` | `paint_coating` | 1 | Tek ürün; lastik kaplama farklı kullanım; ayrı kalabilir |

## Ürünle ilgisiz key tespiti (delete önerisi)
Toplam 4 adet ilgisiz key kullanımı bulundu.
| Key | Adet |
|---|---:|
| specs.cut_level | 1 |
| specs.filler_free | 1 |
| specs.gloss_level | 1 |
| specs.silicone_free | 1 |