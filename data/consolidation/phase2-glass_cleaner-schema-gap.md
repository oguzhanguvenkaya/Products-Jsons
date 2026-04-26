# glass_cleaner — Schema Base & Gap

## Sub_type dağılımı (2 ürün)
- glass_cleaner_additive: 2 (701606, 74955) — her ikisi de FRA-BER cam suyu katkısı

## Top spec key coverage
Hepsi 2/2 (100%) ama key listesi yanlış — bu ürünler "cam suyu katkısı" (windshield washer fluid additive); cam temizleyici değil. Mevcut key seti araç içi temizleme ürünü (anti_bacterial, safe_on_screens, uv_protection, finish=parfümlü) gibi anlamsız etiketler içeriyor.

## Önerilen schema (cam suyu katkısı için)
- volume (canonical)
- dilution_ratio (su:konsantre)
- bug_remover (boolean)
- scent
- concentrate (boolean)
- howToUse / whenToUse / whyThisProduct

## P0 — template_group merge
İki ürün glass_cleaner_protectant ile birleştirilip yeni `glass_care` grubu altında olmalı.
Görüş: glass_cleaner_additive sub_type **glass_care** grubunda yeni sub olarak korunmalı; semantik (depo katkısı) cleaner spreyden farklı.

## Merge stratejisi
- `glass_cleaner` template_group → `glass_care` (5 + 2 = 7 ürün, sub'lar: cleaner, protectant, screen_cleaner, additive)
- `glass_cleaner_protectant` template_group → `glass_care`

**ENGEL:** staging.ts `product` scope whitelist'inde `template_group` yok → tek tek SKU UPDATE çalışmaz. Detay: `phase2-tgmerge-glass-need-staging-update.md`.
