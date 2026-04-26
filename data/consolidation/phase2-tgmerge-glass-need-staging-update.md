# Phase 2C — Template Group Merge: glass_cleaner → glass_care

## Hedef
İki template_group'u tek `glass_care` çatısı altında birleştirmek:
- `glass_cleaner` (2 ürün, sub: glass_cleaner_additive) → glass_care
- `glass_cleaner_protectant` (5 ürün, sublar: glass_cleaner, glass_hydrophobic_sealant, screen_cleaner) → glass_care

Sonuç: glass_care (7 ürün, 4 sub: cleaner, additive, protectant, screen_cleaner).

## Doğrulama
Test payload (1 SKU, glass_cleaner → glass_care) gönderildi:
```bash
curl -sH "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
  -d @data/consolidation/_phase2c-tg-test-payload.json \
  http://localhost:8787/admin/staging/preview
```
Yanıt:
```json
{"total":1,"planned":0,"unsupported":1,"skipped":0,
 "steps":[{"id":"phase2c-tgmerge-test-1","sku":"701606","scope":"product",
           "field":"template_group","sql":"","status":"unsupported",
           "reason":"product/template_group henüz desteklenmiyor"}]}
```

## Engel — staging.ts whitelist
Dosya: `retrieval-service/src/routes/admin/staging.ts:62`
```ts
type SupportedProductField = 'price' | 'base_name' | 'template_sub_type';
const SUPPORTED_PRODUCT_FIELDS = ['price', 'base_name', 'template_sub_type'];
```
`template_group` whitelist'te yok → preview ve commit pipeline'ında **silently rejected** (unsupported).

## Aksiyon (kullanıcı onayı bekliyor)
1. `staging.ts` whitelist'e `'template_group'` ekle:
   - `SupportedProductField` tipine ekle (line 62)
   - `SUPPORTED_PRODUCT_FIELDS` array'ine ekle (line 66 civarı)
2. Sonra Phase 2C'nin gerçek payload'ı üretilebilir:
   ```csv
   id,scope,sku,field,before,after,label
   phase2-tgmerge-glass-1,product,701606,template_group,glass_cleaner,glass_care,P0 grup birleştirme
   phase2-tgmerge-glass-2,product,74955,template_group,glass_cleaner,glass_care,P0 grup birleştirme
   phase2-tgmerge-glass-3,product,700466,template_group,glass_cleaner_protectant,glass_care,P0 grup birleştirme
   phase2-tgmerge-glass-4,product,700662,template_group,glass_cleaner_protectant,glass_care,P0 grup birleştirme
   phase2-tgmerge-glass-5,product,71176,template_group,glass_cleaner_protectant,glass_care,P0 grup birleştirme
   phase2-tgmerge-glass-6,product,Q2M-GPYA1000M,template_group,glass_cleaner_protectant,glass_care,P0 grup birleştirme
   phase2-tgmerge-glass-7,product,JC0101,template_group,glass_cleaner_protectant,glass_care,P0 grup birleştirme
   ```

## Risk
- template_group rename büyük etki: bot taxonomy reverse-mapping, embed key cache, search index hepsi etkilenir.
- Önce dry-run, sonra search/embedding yeniden yapılmalı.

## Asıl payload üretilmedi
Whitelist eklenmesini bekliyor.
