# glass_cleaner_protectant — Schema Base & Gap

## Sub_type dağılımı (5 ürün)
- glass_cleaner: 3 (700466, 700662, 71176)
- glass_hydrophobic_sealant: 1 (Q2M-GPYA1000M)
- screen_cleaner: 1 (JC0101)

## Top spec key coverage
| Key | Coverage |
|-----|----------|
| function / hydrophobic_effect / product_purpose / volume | 100% |
| howToUse / whenToUse / whyThisProduct | 100% |
| concentrate / concentration / dilution_ratio | 60% |
| streak_free / cleaning_power | 60% |
| ammonia_free | 40% |
| safe_on_tint | 40% |

## Önerilen schema base (ortak)
- function, product_purpose
- volume (canonical)
- streak_free (boolean)
- howToUse / whenToUse / whyThisProduct
- target_surface (array — application_area + suitable_for + safe_surfaces birleşik)

## Sub_type bazlı
- glass_cleaner: concentrate, dilution, dilution_ratio, ammonia_free, cleaning_power
- glass_hydrophobic_sealant: hydrophobic_effect, durability_label/months, protection_duration, requires_pre_cleaning, anti_static
- screen_cleaner: portable, target_surface (LED/screen)

## Merge önerisi
- glass_cleaner alt-sub'ı (3) ayrı kalmalı (cleaner ≠ protectant ≠ screen).
- `glass_hydrophobic_sealant` → `glass_protectant` rename (terminoloji sadeleştirme).
- screen_cleaner ayrı kalmalı (cihaz/ekran target).
