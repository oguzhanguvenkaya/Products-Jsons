# Phase 2 Schema Gap Report — polishing_pad

Toplam ürün: **33**, sub_type sayısı: **4**

## Top 15 specs key (group-wide coverage)
| Key | Adet | Coverage |
|---|---:|---:|
| howToUse | 33 | 100.0% |
| cut_level | 33 | 100.0% |
| whenToUse | 33 | 100.0% |
| diameter_mm | 33 | 100.0% |
| whyThisProduct | 33 | 100.0% |
| machine_compatibility | 33 | 100.0% |
| color | 29 | 87.9% |
| base_diameter_mm | 27 | 81.8% |
| hardness | 26 | 78.8% |
| cell_structure | 17 | 51.5% |
| height_mm | 13 | 39.4% |
| suitable_backing_plate | 13 | 39.4% |
| safety_edge | 11 | 33.3% |
| sub_type | 10 | 30.3% |
| washable | 9 | 27.3% |

## Sub_type detayı

### `foam_pad` (n=26)
**Örnek SKU'lar:** GPRO060, GPRO180F-C, SVPRO160F

**Mevcut top keys:**
- `color` — 26/26 (100%)
- `hardness` — 26/26 (100%)
- `howToUse` — 26/26 (100%)
- `cut_level` — 26/26 (100%)
- `whenToUse` — 26/26 (100%)
- `diameter_mm` — 26/26 (100%)
- `whyThisProduct` — 26/26 (100%)
- `machine_compatibility` — 26/26 (100%)

**Önerilen schema base (zorunlu):**
- `diameter_mm` — 26/26 (100%) [OK]
- `foam_density` — 0/26 (0%) [GAP]
- `cut_level` — 26/26 (100%) [OK]
- `color` — 26/26 (100%) [OK]
- `backing_type` — 0/26 (0%) [GAP]
- `application` — 0/26 (0%) [GAP]
- `howToUse` — 26/26 (100%) [OK]
- `whenToUse` — 26/26 (100%) [OK]
- `whyThisProduct` — 26/26 (100%) [OK]
- `features` — 1/26 (4%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `foam_density` eksik: GPRO060, GPRO180F-C, SVPRO160F, 26900.223.012, GRY180F-C, GRY200F, 26909.099.001, DOR160F ...
- `backing_type` eksik: GPRO060, GPRO180F-C, SVPRO160F, 26900.223.012, GRY180F-C, GRY200F, 26909.099.001, DOR160F ...
- `application` eksik: GPRO060, GPRO180F-C, SVPRO160F, 26900.223.012, GRY180F-C, GRY200F, 26909.099.001, DOR160F ...
- `features` eksik: GPRO060, GPRO180F-C, SVPRO160F, 26900.223.012, GRY180F-C, GRY200F, 26909.099.001, DOR160F ...

### `wool_pad` (n=5)
**Örnek SKU'lar:** KP160-22KL, 26913.099.001, 26906.099.001

**Mevcut top keys:**
- `howToUse` — 5/5 (100%)
- `material` — 5/5 (100%)
- `cut_level` — 5/5 (100%)
- `whenToUse` — 5/5 (100%)
- `diameter_mm` — 5/5 (100%)
- `whyThisProduct` — 5/5 (100%)
- `machine_compatibility` — 5/5 (100%)
- `sub_type` — 3/5 (60%)

**Önerilen schema base (zorunlu):**
- `diameter_mm` — 5/5 (100%) [OK]
- `wool_type` — 0/5 (0%) [GAP]
- `cut_level` — 5/5 (100%) [OK]
- `backing_type` — 0/5 (0%) [GAP]
- `application` — 0/5 (0%) [GAP]
- `howToUse` — 5/5 (100%) [OK]
- `whenToUse` — 5/5 (100%) [OK]
- `whyThisProduct` — 5/5 (100%) [OK]
- `features` — 0/5 (0%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `wool_type` eksik: KP160-22KL, 26913.099.001, 26906.099.001, KP160-22L, 26915.099.001
- `backing_type` eksik: KP160-22KL, 26913.099.001, 26906.099.001, KP160-22L, 26915.099.001
- `application` eksik: KP160-22KL, 26913.099.001, 26906.099.001, KP160-22L, 26915.099.001
- `features` eksik: KP160-22KL, 26913.099.001, 26906.099.001, KP160-22L, 26915.099.001

### `felt_pad` (n=1)
**Örnek SKU'lar:** SGGA081

**Mevcut top keys:**
- `howToUse` — 1/1 (100%)
- `material` — 1/1 (100%)
- `cut_level` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `diameter_mm` — 1/1 (100%)
- `target_surface` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `base_diameter_mm` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `microfiber_pad` (n=1)
**Örnek SKU'lar:** NPMW6555

**Mevcut top keys:**
- `color` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `material` — 1/1 (100%)
- `cut_level` — 1/1 (100%)
- `height_mm` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `short_pile` — 1/1 (100%)
- `diameter_mm` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

## Merge önerileri
| Tier | From | To | n | Gerekçe |
|---|---|---|---:|---|
| P2 | `microfiber_pad` | `foam_pad` | 1 | Tek ürün; mikrofiber pad de pasta uygulayıcı; 8+ ürün gelene kadar geçici merge |
| P2 | `felt_pad` | `wool_pad` | 1 | Tek ürün; keçe pad cila/parlatma için, wool ile benzer agresiflik bandı |

## Ürünle ilgisiz key tespiti (delete önerisi)
_İlgisiz key tespit edilmedi._