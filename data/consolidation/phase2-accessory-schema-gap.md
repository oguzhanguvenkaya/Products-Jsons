# accessory — Schema Base & Gap

## Sub_type dağılımı (1 ürün)
- (null sub_type): 1 (26942.099.001 — MENZERNA Mikrofiber Bez Seti 320 GSM 4'lü)

## Specs durumu
- Tek ürün, sadece `howToUse` mevcut. Diğer tüm spec alanları yok.

## Önerilen aksiyon
1. **template_sub_type ataması** → `microfiber_cloth` (P0 — orphan giderme).
2. **template_group eritme** → `storage_accessories` (mikrofiber/bez ürünleri zaten orada). Tek ürünlü grup gereksiz.
   - storage_accessories template_group altında microfiber_cloth sub_type var mı? Phase 2A çıktısı kontrol edilmeli.
3. Specs zenginleştirme önerisi: gsm (320), set_count (4), size (40x40cm), color_coding (4 renk: kırmızı/sarı/yeşil/mavi), washable (boolean), max_wash_temp_c (40).

## Merge önerisi
- P0: template_sub_type=microfiber_cloth ataması
- P1: template_group accessory → storage_accessories (büyük değişiklik, ayrı CSV — staging.ts whitelist eklemesi sonrası)
