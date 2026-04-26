# Phase 2 Schema Gap Report — spare_part

Toplam ürün: **28**, sub_type sayısı: **13**

## Top 15 specs key (group-wide coverage)
| Key | Adet | Coverage |
|---|---:|---:|
| howToUse | 28 | 100.0% |
| whenToUse | 28 | 100.0% |
| whyThisProduct | 28 | 100.0% |
| compatible_device | 23 | 82.1% |
| features | 10 | 35.7% |
| material | 9 | 32.1% |
| diameter_mm | 9 | 32.1% |
| thread_size | 8 | 28.6% |
| quantity | 7 | 25.0% |
| color | 6 | 21.4% |
| part_type | 5 | 17.9% |
| kit_contents | 5 | 17.9% |
| output_cc | 4 | 14.3% |
| gasket_type | 4 | 14.3% |
| sub_type | 3 | 10.7% |

## Sub_type detayı

### `backing_plate` (n=8)
**Örnek SKU'lar:** SGGD053, 26934.099.001, 487988

**Mevcut top keys:**
- `howToUse` — 8/8 (100%)
- `whenToUse` — 8/8 (100%)
- `diameter_mm` — 8/8 (100%)
- `whyThisProduct` — 8/8 (100%)
- `compatible_device` — 8/8 (100%)
- `material` — 7/8 (88%)
- `thread_size` — 4/8 (50%)
- `color` — 3/8 (38%)

**Önerilen schema base (zorunlu):**
- `diameter_mm` — 8/8 (100%) [OK]
- `thread_size` — 4/8 (50%) [GAP]
- `compatible_machines` — 0/8 (0%) [GAP]
- `material` — 7/8 (88%) [OK]
- `howToUse` — 8/8 (100%) [OK]
- `whenToUse` — 8/8 (100%) [OK]
- `whyThisProduct` — 8/8 (100%) [OK]
- `features` — 1/8 (12%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `thread_size` eksik: 487988, SGGD166, SGGF181-57, 492361
- `compatible_machines` eksik: SGGD053, 26934.099.001, 487988, 26935.099.001, SGGD166, SGGF181-57, 492361, 26931.099.001
- `material` eksik: SGGD166
- `features` eksik: SGGD053, 26934.099.001, 487988, 26935.099.001, SGGD166, 492361, 26931.099.001

### `trigger_head` (n=4)
**Örnek SKU'lar:** 79643, 79258, 8410

**Mevcut top keys:**
- `features` — 4/4 (100%)
- `howToUse` — 4/4 (100%)
- `output_cc` — 4/4 (100%)
- `whenToUse` — 4/4 (100%)
- `gasket_type` — 4/4 (100%)
- `thread_size` — 4/4 (100%)
- `whyThisProduct` — 4/4 (100%)
- `color` — 3/4 (75%)

**Önerilen schema base (zorunlu):**
- `compatible_bottle` — 0/4 (0%) [GAP]
- `spray_pattern` — 0/4 (0%) [GAP]
- `material` — 0/4 (0%) [GAP]
- `chemical_resistance` — 0/4 (0%) [GAP]
- `howToUse` — 4/4 (100%) [OK]
- `whenToUse` — 4/4 (100%) [OK]
- `whyThisProduct` — 4/4 (100%) [OK]
- `features` — 4/4 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `compatible_bottle` eksik: 79643, 79258, 8410, 8447
- `spray_pattern` eksik: 79643, 79258, 8410, 8447
- `material` eksik: 79643, 79258, 8410, 8447
- `chemical_resistance` eksik: 79643, 79258, 8410, 8447

### `maintenance_kit` (n=3)
**Örnek SKU'lar:** 82671874, 81771874, 81676800

**Mevcut top keys:**
- `howToUse` — 3/3 (100%)
- `quantity` — 3/3 (100%)
- `whenToUse` — 3/3 (100%)
- `kit_contents` — 3/3 (100%)
- `whyThisProduct` — 3/3 (100%)
- `compatible_device` — 3/3 (100%)

**Önerilen schema base (zorunlu):**
- `contents` — 0/3 (0%) [GAP]
- `compatible_machines` — 0/3 (0%) [GAP]
- `part_count` — 0/3 (0%) [GAP]
- `howToUse` — 3/3 (100%) [OK]
- `whenToUse` — 3/3 (100%) [OK]
- `whyThisProduct` — 3/3 (100%) [OK]
- `features` — 0/3 (0%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `contents` eksik: 82671874, 81771874, 81676800
- `compatible_machines` eksik: 82671874, 81771874, 81676800
- `part_count` eksik: 82671874, 81771874, 81676800
- `features` eksik: 82671874, 81771874, 81676800

### `repair_part` (n=2)
**Örnek SKU'lar:** SGYC011, SGYC010

**Mevcut top keys:**
- `howToUse` — 2/2 (100%)
- `part_type` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `whyThisProduct` — 2/2 (100%)
- `compatible_device` — 2/2 (100%)
- `material` — 1/2 (50%)

**Önerilen schema base (zorunlu):**
- `compatible_machines` — 0/2 (0%) [GAP]
- `part_type` — 2/2 (100%) [OK]
- `howToUse` — 2/2 (100%) [OK]
- `whenToUse` — 2/2 (100%) [OK]
- `whyThisProduct` — 2/2 (100%) [OK]
- `features` — 0/2 (0%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `compatible_machines` eksik: SGYC011, SGYC010
- `features` eksik: SGYC011, SGYC010

### `carbon_brush` (n=2)
**Örnek SKU'lar:** 399647, 336807

**Mevcut top keys:**
- `howToUse` — 2/2 (100%)
- `quantity` — 2/2 (100%)
- `part_type` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `whyThisProduct` — 2/2 (100%)
- `compatible_device` — 2/2 (100%)

**Önerilen schema base (zorunlu):**
- `compatible_machines` — 0/2 (0%) [GAP]
- `dimensions_mm` — 0/2 (0%) [GAP]
- `quantity` — 2/2 (100%) [OK]
- `howToUse` — 2/2 (100%) [OK]
- `whenToUse` — 2/2 (100%) [OK]
- `whyThisProduct` — 2/2 (100%) [OK]
- `features` — 0/2 (0%) [GAP]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `compatible_machines` eksik: 399647, 336807
- `dimensions_mm` eksik: 399647, 336807
- `features` eksik: 399647, 336807

### `hose` (n=2)
**Örnek SKU'lar:** 82671836, 83371836

**Mevcut top keys:**
- `features` — 2/2 (100%)
- `howToUse` — 2/2 (100%)
- `length_m` — 2/2 (100%)
- `whenToUse` — 2/2 (100%)
- `whyThisProduct` — 2/2 (100%)
- `compatible_device` — 2/2 (100%)
- `diameter_mm` — 1/2 (50%)
- `type` — 1/2 (50%)

**Önerilen schema base (zorunlu):**
- `length_m` — 2/2 (100%) [OK]
- `diameter_mm` — 1/2 (50%) [GAP]
- `material` — 0/2 (0%) [GAP]
- `pressure_rating` — 0/2 (0%) [GAP]
- `howToUse` — 2/2 (100%) [OK]
- `whenToUse` — 2/2 (100%) [OK]
- `whyThisProduct` — 2/2 (100%) [OK]
- `features` — 2/2 (100%) [OK]

**Eksik SKU listesi (zorunlu key eksikleri):**
- `diameter_mm` eksik: 83371836
- `material` eksik: 82671836, 83371836
- `pressure_rating` eksik: 82671836, 83371836

### `nozzle` (n=1)
**Örnek SKU'lar:** 83371602

**Mevcut top keys:**
- `howToUse` — 1/1 (100%)
- `part_type` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `compatible_device` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `handle` (n=1)
**Örnek SKU'lar:** 82671872

**Mevcut top keys:**
- `howToUse` — 1/1 (100%)
- `material` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `compatible_device` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `charger` (n=1)
**Örnek SKU'lar:** 417882

**Mevcut top keys:**
- `voltage` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `weight_gr` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `input_voltage` — 1/1 (100%)
- `charge_current` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `nozzle_kit` (n=1)
**Örnek SKU'lar:** 81771871

**Mevcut top keys:**
- `howToUse` — 1/1 (100%)
- `quantity` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `kit_contents` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `compatible_device` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `extension_kit` (n=1)
**Örnek SKU'lar:** 458813

**Mevcut top keys:**
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `thread_type` — 1/1 (100%)
- `kit_contents` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `compatible_device` — 1/1 (100%)
- `max_pad_diameter_mm` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `trigger_gun` (n=1)
**Örnek SKU'lar:** 83371816

**Mevcut top keys:**
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `compatible_device` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

### `battery` (n=1)
**Örnek SKU'lar:** 445894

**Mevcut top keys:**
- `voltage` — 1/1 (100%)
- `capacity` — 1/1 (100%)
- `features` — 1/1 (100%)
- `howToUse` — 1/1 (100%)
- `weight_gr` — 1/1 (100%)
- `whenToUse` — 1/1 (100%)
- `whyThisProduct` — 1/1 (100%)
- `compatible_device` — 1/1 (100%)

**Schema base önerilmedi** (sub_type merge önerisi olabilir; aşağıdaki merge bölümüne bakın).

## Merge önerileri
| Tier | From | To | n | Gerekçe |
|---|---|---|---:|---|
| P0 | `nozzle_kit` | `nozzle` | 1 | Tek ürün; nozzle vs nozzle_kit semantik aynı |
| P0 | `trigger_gun` | `trigger_head` | 1 | Tek ürün; trigger_gun = trigger_head (tetikli sprey kafa) |
| P0 | `extension_kit` | `maintenance_kit` | 1 | Tek ürün; uzatma kiti bakım kiti şemsiyesi |
| P1 | `handle` | `repair_part` | 1 | Tek ürün; sap = onarım parçası (jenerik) |
| P1 | `charger` | `battery` | 1 | Tek ürün; şarj cihazı batarya aksesuarı; "power_accessory" olarak yeni sub düşünülebilir |

## Ürünle ilgisiz key tespiti (delete önerisi)
Toplam 1 adet ilgisiz key kullanımı bulundu.
| Key | Adet |
|---|---:|
| specs.hardness | 1 |