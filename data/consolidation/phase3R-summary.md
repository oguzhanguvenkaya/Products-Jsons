# Phase 3R — Category-Aware Filter Summary

- **Input:** 478 changes (phase3a=101, phase3b=65, phase3c=312)
- **Kept:**    **84**
- **Rejected:** **394**
- **Phase 2R FINAL overrides applied:** 83 SKU sub_type + 14 group
- **Overrides that flipped a decision (kept side):** 27
- **Overrides that flipped a decision (reject side):** 58

## Breakdown per meta key

| Key | Kept | Rejected | Total |
|---|---:|---:|---:|
| `application_method` | 12 | 171 | 183 |
| `application_temperature_max_c` | 4 | 6 | 10 |
| `application_temperature_min_c` | 4 | 6 | 10 |
| `confidence_level` | 0 | 23 | 23 |
| `cure_time_hours` | 9 | 0 | 9 |
| `durability_months` | 2 | 20 | 22 |
| `dwell_time_minutes` | 12 | 11 | 23 |
| `indoor_use` | 3 | 8 | 11 |
| `outdoor_use` | 0 | 5 | 5 |
| `pre_coating_safe` | 0 | 1 | 1 |
| `rinse_required` | 10 | 37 | 47 |
| `skill_level` | 8 | 106 | 114 |
| `volume_ml` | 20 | 0 | 20 |

## Breakdown per category (template_group)

| Group | Kept | Rejected | Total |
|---|---:|---:|---:|
| `abrasive_polish` | 14 | 6 | 20 |
| `accessory` | 0 | 10 | 10 |
| `car_shampoo` | 6 | 14 | 20 |
| `ceramic_coating` | 18 | 10 | 28 |
| `clay_products` | 0 | 2 | 2 |
| `contaminant_solvers` | 5 | 6 | 11 |
| `fragrance` | 0 | 26 | 26 |
| `glass_cleaner_protectant` | 0 | 2 | 2 |
| `industrial_products` | 0 | 4 | 4 |
| `interior_cleaner` | 14 | 5 | 19 |
| `leather_care` | 0 | 6 | 6 |
| `marin_products` | 0 | 4 | 4 |
| `masking_tapes` | 0 | 1 | 1 |
| `microfiber` | 0 | 10 | 10 |
| `paint_protection_quick` | 2 | 9 | 11 |
| `polisher_machine` | 5 | 15 | 20 |
| `polishing_pad` | 0 | 38 | 38 |
| `ppf_tools` | 1 | 19 | 20 |
| `product_sets` | 2 | 3 | 5 |
| `spare_part` | 0 | 48 | 48 |
| `sprayers_bottles` | 16 | 101 | 117 |
| `storage_accessories` | 1 | 40 | 41 |
| `tire_care` | 0 | 15 | 15 |

## Top 5 insights

1. **`confidence_level` tamamen kaldırıldı:** 23 change silindi (hiç onaylanmadı). 'Garanti eder / iddia' gibi pazarlama kelimelerinden türetilmiş, ölçülemez bir key — bot filter'ı için değer yok.

2. **`application_method` en büyük hatalı grup:** Faz 3'te 183 change üretilmişti; bunun çoğunluğu (171 tanesi) sprey şişe / bez / aksesuar / makine gibi 'hand/machine/both' ayrımının anlamsız olduğu kategorilerden geldi. Top reddedilen gruplar: `sprayers_bottles`=47, `polishing_pad`=33, `spare_part`=27, `storage_accessories`=21, `ppf_tools`=14.

3. **`skill_level` abuse:** 106 change silindi. Şampuan/sprey şişe/bez için 'diy/pro' ayrımı anlamsız; sadece cila makineleri, agresif pastalar ve 2+ katman seramik kaplamada korunmalı. Top reddedilen gruplar: `sprayers_bottles`=30, `spare_part`=20, `storage_accessories`=16, `fragrance`=7, `polishing_pad`=5.

4. **Sprey şişe / aksesuar temizliği:** `sprayers_bottles` grubunda 101 change silindi — SKU 12918 gibi boş şişeler için `application_method=both`, `skill_level=pro` gibi keyler tamamen anlamsızdı (şişe kendisi kimyasal değil).

5. **Mikrofiber / aksesuar temizliği:** `microfiber` grubunda 10 change silindi — bez kendisi kimyasal değil, rinse/application_method/skill_level keyleri uygulanamaz.

## Phase 2R FINAL override etkisi

- Phase 2R FINAL'da 83 SKU'nun `template_sub_type`'ı değişiyor.
- 27 kabul edilen change, yeni sub_type ile kural kontrolünden geçti.
- 58 reddedilen change, yeni sub_type ile kural kontrolünde düştü (tutarlılık).

---

Çıktı dosyaları:
- `data/consolidation/phase3R-FINAL-payload.json`
- `data/consolidation/phase3R-FINAL.csv`
- `data/consolidation/phase3R-rejected.csv`