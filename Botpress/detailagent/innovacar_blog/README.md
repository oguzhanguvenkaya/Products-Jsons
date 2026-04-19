# Innovacar Blog Entegrasyonu — İnceleme Klasörü

> **DURUM:** ÖN HAZIRLIK — bot ve tablolara herhangi bir değişiklik yapılmamıştır. Aşağıdaki dosyalar yalnızca inceleme ve onay içindir.
> **Hazırlanma tarihi:** 2026-04-18
> **Kaynak:** 5 Innovacar blog makalesi (bkz. `../docs/innovacar-blogs-scraped.md`)

## Dosya Listesi

| Dosya | İçerik | Boyut/Satır |
|---|---|---|
| `README.md` | Bu dosya — genel bakış ve inceleme rehberi | — |
| `01-analysis-report.md` | Detaylı durum analizi: hangi ürün bizde var/yok, eşdeğerlik kararları | Okuma öncelikli |
| `02-equivalents-map.csv` | Blog ürünü → bizdeki eşdeğer SKU haritası | ~35 satır |
| `03-procedures.csv` | 5 faz detailing akışı; her adım için eşdeğer SKU atanmış | ~40 satır |
| `04-category-faqs.csv` | Blog özetlerinden türetilen kategori-seviyesi FAQ'lar | ~12 satır |
| `05-product-relations-draft.csv` | `use_before / use_after / use_with` taslağı (mevcut tabloya merge için) | ~60 satır |

## İnceleme Sırası (Önerilen)

1. **`01-analysis-report.md`** — önce durum raporunu oku, genel tablo netleşsin
2. **`02-equivalents-map.csv`** — eşdeğerliklerin doğruluğunu kontrol et; özellikle `confidence=low` olanlar
3. **`03-procedures.csv`** — 5 faz akışının eşdeğer SKU'larla yeniden yazılmış halini gözden geçir
4. **`04-category-faqs.csv`** — kategori seviyesindeki cevap metinlerini onayla
5. **`05-product-relations-draft.csv`** — mevcut relations tablosuna merge edilecek satırları değerlendir

## Onay Sonrası Yapılacaklar (şu an YAPILMADI)

Bu dosyalar onaylandıktan sonra aşağıdaki işlemler yapılacak (ayrı iş emri ile):

1. **Seed scriptleri yazılır** (`scripts/seed-innovacar-*.ts`)
   - `scripts/upsert-relations-paket-i.ts` kalıbı referans alınır
   - `scripts/seed-category-faqs.ts` kalıbı referans alınır
2. **Eval kalıpları eklenir** (`evals/` altında yeni soru grubu)
3. **Seed çalıştırılır** ve `adk build` + `adk_send_message` ile end-to-end doğrulama yapılır
4. **Regresyon kontrolü** — mevcut eval'ler bozulmamalı

## Önemli Notlar

- Bot persona / conversation dosyaları **değişmedi**.
- Tablo şemaları **değişmedi**.
- `productRelationsTable`'a girilecek her satır, **mevcut relations ile dedup** edilerek birleştirilmelidir (üstüne yazma yok).
- `confidence=low` olan eşdeğerlikler (örn. G1 GLOSSY glaze karşılığı) için kullanıcı onayı olmadan seed yapılmamalı.
- Micron/aplikatör eşdeğerleri farklı markalardan (KLIN, GYEON, SGCB) geliyor — bu bilinçli bir marka-agnostik yaklaşımdır.
