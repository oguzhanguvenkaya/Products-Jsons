# Phase 2A — Sub_type Konsolidasyon Özet (8 grup)

Snapshot: detail snapshot from /admin/products and /admin/products/<sku>

## Genel tablo
| Grup | Ürün | Sub (önce) | Sub (sonra) | Merge öneri | P0 | P1 | P2 | Etk. SKU | Sil önerisi |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sprayers_bottles | 48 | 4 | 3 | 1 | 1 | 0 | 0 | 1 | 0 |
| polishing_pad | 33 | 4 | 2 | 2 | 0 | 0 | 2 | 2 | 0 |
| microfiber | 31 | 12 | 6 | 6 | 5 | 1 | 0 | 7 | 24 |
| car_shampoo | 30 | 7 | 4 | 3 | 0 | 2 | 1 | 4 | 6 |
| spare_part | 28 | 13 | 8 | 5 | 3 | 2 | 0 | 5 | 1 |
| interior_cleaner | 25 | 16 | 5 | 11 | 6 | 3 | 2 | 11 | 4 |
| abrasive_polish | 24 | 6 | 3 | 3 | 2 | 1 | 0 | 3 | 0 |
| ceramic_coating | 23 | 15 | 3 | 12 | 5 | 4 | 3 | 13 | 4 |

**Toplam:** 46 sub_type değişikliği, 39 ilgisiz key silme önerisi.

## Çıktı dosyaları (her grup için)
- `phase2-<group>-subtype-merge.csv` — taxonomy-remap staging payload
- `phase2-<group>-key-delete.csv` — ilgisiz specs key silme staging payload
- `phase2-<group>-schema-gap.md` — insan review için schema base + eksik SKU listesi + merge gerekçesi

## Doğrulama (`/admin/staging/preview` 2026-04-23)
Toplam 13 payload (8 sub_type-merge + 5 key-delete; üç grupta key-delete boş).
| Grup / Kind | total | planned | unsupported | skipped |
|---|---:|---:|---:|---:|
| sprayers_bottles / subtype-merge | 1 | 1 | 0 | 0 |
| polishing_pad / subtype-merge | 2 | 2 | 0 | 0 |
| microfiber / subtype-merge | 7 | 7 | 0 | 0 |
| microfiber / key-delete | 24 | 24 | 0 | 0 |
| car_shampoo / subtype-merge | 4 | 4 | 0 | 0 |
| car_shampoo / key-delete | 6 | 6 | 0 | 0 |
| spare_part / subtype-merge | 5 | 5 | 0 | 0 |
| spare_part / key-delete | 1 | 1 | 0 | 0 |
| interior_cleaner / subtype-merge | 11 | 11 | 0 | 0 |
| interior_cleaner / key-delete | 4 | 4 | 0 | 0 |
| abrasive_polish / subtype-merge | 3 | 3 | 0 | 0 |
| ceramic_coating / subtype-merge | 13 | 13 | 0 | 0 |
| ceramic_coating / key-delete | 4 | 4 | 0 | 0 |

Tüm 85 değişiklik (46 sub_type + 39 key-delete) `planned`. Hiç `unsupported` veya `skipped` yok.

## Notlar
- Tüm merge önerileri MEVCUT taxonomy enum'larına yönlendirir (yeni sub_type oluşturulmadı).
- P0 = tek ürünlü veya kesin semantik çakışma; P1 = önerilen; P2 = ileride veri zenginleşince.
- Schema-gap raporları sadece RAPOR; eksik key'leri OTOMATIK doldurmaz (Faz 3).
- Hiçbir CSV 500 satırı aşmıyor; tek batch yeterli.
- Key-delete CSV'leri null değerli ilgisiz key'leri de yakalıyor (özellikle microfiber'da 3 ürünün spec'ine sızmış sprayer alanları → 24 null silme).
- Ürünle ilgisiz key tipleri: cross-template leak (microfiber'a sprayer alanı), kategoride anlamsız metrik (shampoo'da `cure_time_hours`, ceramic'te `cut_level`, spare_part'ta `hardness`).