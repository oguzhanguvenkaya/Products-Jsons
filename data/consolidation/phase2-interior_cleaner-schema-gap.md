# Phase 2 Schema Gap Report — interior_cleaner

Toplam ürün: **25**, sub_type sayısı: **16**

## Top 15 specs key (group-wide coverage)
| Key | Adet | Coverage |
|---|---:|---:|
| howToUse | 25 | 100.0% |
| whenToUse | 25 | 100.0% |
| whyThisProduct | 25 | 100.0% |
| target_surfaces | 25 | 100.0% |
| concentrate | 17 | 68.0% |
| finish | 16 | 64.0% |
| scent | 13 | 52.0% |
| uv_protection | 13 | 52.0% |
| dilution | 12 | 48.0% |
| sub_type | 12 | 48.0% |
| dilution_ratio | 12 | 48.0% |
| safe_on_screens | 12 | 48.0% |
| anti_bacterial_claim | 12 | 48.0% |
| features | 12 | 48.0% |
| ph_level | 9 | 36.0% |

## Sub_type detayı

### `interior_apc` (n=4)
**Örnek SKU'lar:** 701010, 701285, 79771

**Mevcut top keys:**
- `howToUse` — 4/4 (100%)
- `whenToUse` — 4/4 (100%)
- `concentrate` — 4/4 (100%)
- `dilution_ratio` — 4/4 (100%)
- `whyThisProduct` — 4/4 (100%)
- `target_surfaces` — 4/4 (100%)
- `scent` — 2/4 (50%)
- `finish` — 2/4 (50%)

**Önerilen schema base (zorunlu):**
- `ph_level` — 2/4 (50%) [GAP]
- `dilution_ratio` — 4/4 (100%) [OK]
- `volume_ml` — 1/4 (25%) [GAP]
- `scent` — 2/4 (50%) [GAP]
- `surface_compatibility` — 0/4 (0%) [GAP]
- `howToUse` — 4/4 (100%) [OK]
- `whenToUse` — 4/4 (100%) [OK]
- `whyThisProduct` — 4/4 (100%) [OK]
- `features` — 1/4 (25%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `ph_level` eksik: 701010, 701285
- `volume_ml` eksik: 701010, 701285, 79771
- `scent` eksik: 701010, 701285, 79771, Q2M-APYA4000M
- `surface_compatibility` eksik: 701010, 701285, 79771, Q2M-APYA4000M
- `features` eksik: 701010, 79771, Q2M-APYA4000M

### `fabric_cleaner_concentrate` (n=4)
**Örnek SKU'lar:** 73378, 75404, 70723

**Mevcut top keys:**
- `howToUse` — 4/4 (100%)
- `whenToUse` — 4/4 (100%)
- `concentrate` — 4/4 (100%)
- `dilution_ratio` — 4/4 (100%)
- `whyThisProduct` — 4/4 (100%)
- `target_surfaces` — 4/4 (100%)
- `scent` — 3/4 (75%)
- `finish` — 3/4 (75%)

**Önerilen schema base (zorunlu):**
- `ph_level` — 0/4 (0%) [GAP]
- `dilution_ratio` — 4/4 (100%) [OK]
- `volume_ml` — 0/4 (0%) [GAP]
- `foam_quality` — 0/4 (0%) [GAP]
- `scent` — 3/4 (75%) [GAP]
- `howToUse` — 4/4 (100%) [OK]
- `whenToUse` — 4/4 (100%) [OK]
- `whyThisProduct` — 4/4 (100%) [OK]
- `features` — 1/4 (25%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `ph_level` eksik: 73378, 75404, 70723, 71676
- `volume_ml` eksik: 73378, 75404, 70723, 71676
- `foam_quality` eksik: 73378, 75404, 70723, 71676
- `scent` eksik: 73378, 75404, 70723, 71676
- `features` eksik: 75404, 70723, 71676

### `plastic_dressing` (n=3)
**Örnek SKU'lar:** 74598, 79298, 70894

**Mevcut top keys:**
- `scent` — 3/3 (100%)
- `finish` — 3/3 (100%)
- `howToUse` — 3/3 (100%)
- `volume_ml` — 3/3 (100%)
- `whenToUse` — 3/3 (100%)
- `whyThisProduct` — 3/3 (100%)
- `target_surfaces` — 3/3 (100%)
- `anti_static` — 2/3 (67%)

**Önerilen schema base (zorunlu):**
- `finish_type` — 0/3 (0%) [GAP]
- `volume_ml` — 3/3 (100%) [OK]
- `uv_protection` — 2/3 (67%) [GAP]
- `dust_repellent` — 0/3 (0%) [GAP]
- `application_method` — 0/3 (0%) [GAP]
- `howToUse` — 3/3 (100%) [OK]
- `whenToUse` — 3/3 (100%) [OK]
- `whyThisProduct` — 3/3 (100%) [OK]
- `features` — 1/3 (33%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `finish_type` eksik: 74598, 79298, 70894
- `uv_protection` eksik: 74598, 79298, 70894
- `dust_repellent` eksik: 74598, 79298, 70894
- `application_method` eksik: 74598, 79298, 70894
- `features` eksik: 79298, 70894

### `surface_disinfectant` (n=2)
**Örnek SKU'lar:** 77075, 77080

**Mevcut top keys:**
- `features` — 2/2 (100%)
- `howToUse` — 2/2 (100%)
- `volume_lt` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `rinse_required` — 2/2 (100%)
- `whyThisProduct` — 2/2 (100%)
- `target_surfaces` — 2/2 (100%)
- `alcohol_based` — 1/2 (50%)

**Önerilen schema base (zorunlu):**
- `active_ingredient` — 0/2 (0%) [GAP]
- `contact_time` — 0/2 (0%) [GAP]
- `volume_ml` — 0/2 (0%) [GAP]
- `alcohol_free` — 0/2 (0%) [GAP]
- `scent` — 0/2 (0%) [GAP]
- `howToUse` — 2/2 (100%) [OK]
- `whenToUse` — 2/2 (100%) [OK]
- `whyThisProduct` — 2/2 (100%) [OK]
- `features` — 2/2 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `active_ingredient` eksik: 77075, 77080
- `contact_time` eksik: 77075, 77080
- `volume_ml` eksik: 77075, 77080
- `alcohol_free` eksik: 77075, 77080
- `scent` eksik: 77075, 77080

### `fabric_leather_cleaner` (n=1)
**Örnek SKU'lar:** 79818

**Mevcut top keys:**
- `finish` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `ph_level` — 1/1 (100%)
- `volume_lt` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `concentrate` — 1/1 (100%)
- `consumption` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `plastic_restorer` (n=1)
**Örnek SKU'lar:** Q2M-PRYA250M

**Mevcut top keys:**
- `finish` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `durability` — 1/1 (100%)
- `anti_static` — 1/1 (100%)
- `consumption` — 1/1 (100%)
- `uv_protection` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `fabric_cleaner` (n=1)
**Örnek SKU'lar:** Q2M-FCNA1000M

**Mevcut top keys:**
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `ph_level` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `consumption` — 1/1 (100%)
- `working_temp` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `target_surfaces` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `foam_cleaner` (n=1)
**Örnek SKU'lar:** 70901

**Mevcut top keys:**
- `form` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `volume_ml` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `drying_time` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `target_surfaces` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `plastic_cleaner` (n=1)
**Örnek SKU'lar:** Q2M-TRC500M

**Mevcut top keys:**
- `finish` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `ph_level` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `anti_static` — 1/1 (100%)
- `consumption` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `fabric_protector` (n=1)
**Örnek SKU'lar:** 75277

**Mevcut top keys:**
- `scent` — 1/1 (100%)
- `finish` — 1/1 (100%)
- `dilution` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `volume_ml` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `breathable` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `wood_cleaner` (n=1)
**Örnek SKU'lar:** 75132

**Mevcut top keys:**
- `scent` — 1/1 (100%)
- `finish` — 1/1 (100%)
- `dilution` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `nta_free` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `edta_free` — 1/1 (100%)
- `volume_lt` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `interior_disinfectant` (n=1)
**Örnek SKU'lar:** Q2M-IDYA4000M

**Mevcut top keys:**
- `scent` — 1/1 (100%)
- `finish` — 1/1 (100%)
- `dilution` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `volume_ml` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `anti_static` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `degreaser` (n=1)
**Örnek SKU'lar:** Q2M-DT10P

**Mevcut top keys:**
- `form` — 1/1 (100%)
- `scent` — 1/1 (100%)
- `dosage` — 1/1 (100%)
- `finish` — 1/1 (100%)
- `dilution` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `ph_level` — 1/1 (100%)
- `sub_type` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `interior_detailer` (n=1)
**Örnek SKU'lar:** Q2M-PM500M

**Mevcut top keys:**
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `ph_level` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `consumption` — 1/1 (100%)
- `alcohol_free` — 1/1 (100%)
- `anti_bacterial` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `wood_protector` (n=1)
**Örnek SKU'lar:** 77192

**Mevcut top keys:**
- `scent` — 1/1 (100%)
- `finish` — 1/1 (100%)
- `dilution` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `sub_type` — 1/1 (100%)
- `anti_mold` — 1/1 (100%)
- `volume_lt` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `heavy_duty_cleaner` (n=1)
**Örnek SKU'lar:** 77019

**Mevcut top keys:**
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `ph_level` — 1/1 (100%)
- `weight_kg` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `concentrate` — 1/1 (100%)
- `dilution_ratio` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Önerilen schema base (zorunlu):**
- `ph_level` — 1/1 (100%) [OK]
- `dilution_ratio` — 1/1 (100%) [OK]
- `volume_ml` — 0/1 (0%) [GAP]
- `solvent_based` — 0/1 (0%) [GAP]
- `howToUse` — 1/1 (100%) [OK]
- `whenToUse` — 1/1 (100%) [OK]
- `whyThisProduct` — 1/1 (100%) [OK]
- `features` — 1/1 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `volume_ml` eksik: 77019
- `solvent_based` eksik: 77019

## Merge önerileri
| Tier | From | To | n | Gerekçe |
|---|---|---|---:|---|
| P0 | `plastic_cleaner` | `interior_apc` | 1 | Tek ürün; plastik temizleyici APC kapsamında |
| P0 | `wood_cleaner` | `interior_apc` | 1 | Tek ürün; ahşap temizleyici iç mekan APC |
| P0 | `foam_cleaner` | `interior_apc` | 1 | Tek ürün; köpük temizleyici APC formu |
| P0 | `degreaser` | `heavy_duty_cleaner` | 1 | Tek ürün; yağ çözücü = ağır kir temizleyici |
| P0 | `fabric_cleaner` | `fabric_cleaner_concentrate` | 1 | Tek ürün; kumaş temizleyici konsantre alt-türüne taşı |
| P1 | `fabric_leather_cleaner` | `fabric_cleaner_concentrate` | 1 | Tek ürün; kumaş+deri ortak; ya yeni "upholstery_cleaner" ya da fabric_concentrate altı |
| P0 | `interior_disinfectant` | `surface_disinfectant` | 1 | Tek ürün; iç dezenfektan = yüzey dezenfektan |
| P1 | `interior_detailer` | `plastic_dressing` | 1 | Tek ürün; iç detayer plastik dressing fonksiyonu |
| P1 | `plastic_restorer` | `plastic_dressing` | 1 | Tek ürün; plastik canlandırıcı dressing alt türü |
| P2 | `wood_protector` | `plastic_dressing` | 1 | Tek ürün; ahşap koruyucu dressing/conditioner; yeni sub gerekebilir |
| P2 | `fabric_protector` | `fabric_cleaner_concentrate` | 1 | Tek ürün; kumaş koruyucu farklı işlev (waterproof); ileride ayrı sub |

## Ürünle ilgisiz key tespiti (delete önerisi)
Toplam 4 adet ilgisiz key kullanımı bulundu.
| Key | Adet |
|---|---:|
| specs.durability_months | 1 |
| specs.curing_time | 1 |
| specs.sio2_content | 1 |
| specs.siloxane_content | 1 |