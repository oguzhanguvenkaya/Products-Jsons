# Phase 2C — Consolidation Summary (5 group + orphans)

Tarih: 2026-04-23
Snapshot: 2026-04-23T01:46:02.473Z (511 ürün, 26 grup, 165 sub_type)

## Sorumluluk
| Grup | Ürün | Sub | Aksiyon |
|------|------|-----|---------|
| leather_care | 7 | 4 | conditioner→protectant merge (P0); 9 specs key cleanup |
| brushes | 6 | 4 | mislabel fix (SGGD294 wheel→tire); 11 specs key cleanup |
| glass_cleaner_protectant | 5 | 3 | hydrophobic_sealant→protectant rename (P1); 7 key cleanup; tg merge |
| glass_cleaner | 2 | 1 | tg merge (glass_cleaner→glass_care); 15 key cleanup (yanlış kategori specs) |
| accessory | 1 | 0 | sub_type=microfiber_cloth ataması (P0); group eritme önerisi |
| **orphans (511 tarama)** | 6 | — | hepsi sub_type ataması ile çözülüyor |

## Doğrulama (preview)
- 4 örnek change (sub_type + specs delete) → `planned: 4 / unsupported: 0` ✓
- 1 template_group remap → `unsupported: 1` (beklenen)

## Kritik bulgu — staging.ts whitelist
- `retrieval-service/src/routes/admin/staging.ts:62` `SupportedProductField = 'price' | 'base_name' | 'template_sub_type'`
- `template_group` whitelist'te yok → **glass_cleaner→glass_care merge bu hâliyle commit edilemez**.
- Aksiyon: `phase2-tgmerge-glass-need-staging-update.md` dosyasında staging.ts patch'i ve sonrasında üretilecek payload taslağı var. Asıl payload **üretilmedi** (bekleniyor).

## Üretilen dosyalar (15 dosya)
- 5 × `phase2-<group>-subtype-merge.csv`
- 5 × `phase2-<group>-key-delete.csv`
- 5 × `phase2-<group>-schema-gap.md`
- `phase2-orphans-fix.csv` (6 SKU)
- `phase2-orphans.md`
- `phase2-tgmerge-glass-need-staging-update.md`
- `phase2C-summary.md`

## Toplam değişiklik sayısı (CSV'lerde)
- template_sub_type UPDATE: **9** (leather_care 1 + brushes 1 + glass_protectant 1 + accessory 1 + orphans 6 — toplam 10, 1 dup overlap accessory↔orphan)
- specs key DELETE: **44** (leather_care 9 + brushes 11 + glass_protectant 7 + glass_cleaner 15 + accessory 1 info-only + 1 dup)
- template_group UPDATE (deferred): **7** (glass_cleaner 2 + glass_cleaner_protectant 5)

## Önemli notlar
- Hiçbir commit yapılmadı (talimat gereği).
- Pseudo SKU yok; tüm SKU'lar /admin/products endpoint'inden çekilen gerçek değerler.
- Batch limit 500'ün altında (toplam ~50 satır).
- Phase 2 polisher_machine/storage_accessories sahibi ile koordinasyon gerek: orphan'ların 5'i polisher_machine grubunda, accessory eritme storage_accessories'e bağlı.

## Anahtar gözlemler
1. **glass_cleaner_additive yanlış kategori specs taşıyor** (uv_protection, safe_on_screens, anti_bacterial — cam suyu deposu katkısı bu özelliklerin hiçbirini sağlamaz). 11 bozuk key tek seferde temizlenmeli.
2. **brushes spec key naming çok dağınık** (bristle_material/bristle_type/bristle_types/bristle_spec — 4 farklı varyant aynı şey için). Faz 1 normalize sonrası bile tekrar gözden geçirilmeli.
3. **leather_care 4 sub_type → 3'e indirme yeterli** (conditioner ve protectant aslında aynı use-case). Daha agresif merge (3→1 leather_kit) gerekçesi yok — kit, cleaner ve protectant farklı UX.
4. **Polisher_machine "other" temizliği** (5 ürün) aslında template_group rename gerektirebilir; air_blow_gun/heat_gun "polish makinesi" değil "havalı/ısıl alet".
