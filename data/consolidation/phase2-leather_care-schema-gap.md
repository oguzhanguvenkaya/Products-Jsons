# leather_care — Schema Base & Gap

## Sub_type dağılımı (7 ürün)
- leather_cleaner: 3 (71132, Q2M-LCN1000M, Q2M-LCSYA1000M)
- leather_care_kit: 2 (Q2M-LSN200M, Q2M-LSSYA200M)
- leather_conditioner: 1 (700468 — FRA-BER Cream Leather)
- leather_protectant: 1 (Q2-LCR500M — GYEON Q Leather Coat)

## Top spec key coverage (grup içi)
| Key | Coverage | Not |
|-----|----------|-----|
| howToUse / whenToUse / whyThisProduct | 100% | base zorunlu |
| ph_level | 100% | core kimyasal alan |
| dilution | 71% | cleaner'larda kritik |
| scent | 71% | tüketici tercihi |
| features | 57% | serbest metin |
| finish | 57% | matte/satin/glossy |
| volume | 57% | volume_ml ile dup |
| function | 42% | leather_cleaner=temizleme, conditioner=besleme — sub_type ile zaten infer edilebilir |
| sub_type (specs) | 42% | template_sub_type ile dup |
| target_surfaces | 42% | leather_care'de "deri" sabit — düşük bilgi |
| uv_protection | 42% | protectant/kit için kritik |

## Önerilen schema base (ortak zorunlu)
- howToUse, whenToUse, whyThisProduct
- ph_level (kimyasal güvenlik)
- volume (canonical, volume_ml drop)
- scent
- features (array)

## Sub_type bazlı gerekli alanlar
- leather_cleaner: dilution, function="cleaning", finish, rinse_required
- leather_conditioner / leather_protectant: durability_months, uv_protection, finish
- leather_care_kit: kit_contents (array), coverage, protection_duration

## Merge önerisi (P0)
- `leather_conditioner` (1 ürün) → `leather_protectant` (1 ürün) → tek `leather_protectant` (2 ürün). Cream Leather içerik olarak conditioner ama temel iş "bakım + koruma"; protectant ile aynı raf.
- `leather_care_kit` ayrı kalmalı (multi-parça paket — tek-üründen farklı UX).
- `leather_cleaner` ayrı kalmalı (temizleme funktor'u).

## P1 — sonradan
- 3 leather_cleaner specs `sub_type` alanını drop (template_sub_type ile dup).
- volume_ml → volume canonicalization (Faz 1 kalıntısı).
