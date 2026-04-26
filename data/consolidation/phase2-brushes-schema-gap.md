# brushes — Schema Base & Gap

## Sub_type dağılımı (6 ürün)
- wheel_brush: 3 (Q2M-BL, SGGD049, SGGD294*)
- detail_brush: 1 (SGGD421)
- leather_brush: 1 (Q2M-LB)
- tire_brush: 1 (Q2M-TB)

(*) SGGD294 etiketi yanlış — tire_brush olmalı.

## Top spec key coverage (grup içi)
| Key | Coverage |
|-----|----------|
| bristle_material | 100% |
| brush_size | 100% |
| brush_type | 100% |
| set_count | 100% |
| target_surface | 100% |
| howToUse / whenToUse / whyThisProduct | 100% |
| safe_for | 66% |
| handle_material | 50% |
| flexibility | 33% (wheel_brush'ta yararlı) |

## Önerilen schema base (zorunlu)
- bristle_material (canonical — bristle_type, bristle_types, bristle_spec drop)
- brush_size, brush_type, set_count
- target_surface (array)
- handle_material
- safe_for (array — suitable_for ile dup; safe_for canonical)
- howToUse / whenToUse / whyThisProduct

## Sub_type bazlı opsiyonel
- wheel_brush: flexibility, handle_length, chemical_resistant
- tire_brush: chemical_resistant
- leather_brush: design (premium görsel)
- detail_brush: set_content / set_count multi

## Merge önerisi
- P0 yok (4 sub-type birbirinden net farklı: jant, lastik, deri, detay).
- P0 mislabel fix: SGGD294 wheel_brush → tire_brush.

## Sub_type konsolidasyon riski
- Tire ve wheel ayrı kalmalı (kimyasal direnç + kıl tipi farklı). Birleştirme önerilmez.
