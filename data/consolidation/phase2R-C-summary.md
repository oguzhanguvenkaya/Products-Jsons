# Phase 2R-C — Özet

**Tarih:** 2026-04-23
**Kapsam:** leather_care, brushes, glass_cleaner_protectant, glass_care tgmerge, Q2M-PYA4000M, 6 orphan fix

## Karar Özeti

| Kategori | Adet |
|----------|------|
| **APPROVE** (staging'e hazır) | **7** |
| **REJECT** (doğrudan reddedilen) | **0** |
| **ASK** (kullanıcı onayı gereken) | **4** |
| Toplam değerlendirilen öneri | 11 |

## APPROVE Listesi (7)

| # | SKU | Field | Before | After | Gerekçe |
|---|-----|-------|--------|-------|---------|
| 1 | SGGD294 | template_sub_type | wheel_brush | tire_brush | Ürün adı "Tire Cleaning Brush" + targetSurface=Lastik mislabel fix |
| 2 | Q2M-GPYA1000M | template_sub_type | glass_hydrophobic_sealant | glass_protectant | Simetri iyileşmesi (tek sub_type altında konsolidasyon) |
| 3 | 516112 | template_sub_type | other | extension_shaft | specs.accessory_type canonical (FLEX FS 140) |
| 4 | 532579 | template_sub_type | other | heat_gun | specs.product_type canonical (FLEX HG 650) |
| 5 | SGGC055 | template_sub_type | other | tornador_gun | ürün adı + subCat2 (SGCB Tornador) |
| 6 | SGGC086 | template_sub_type | other | air_blow_gun | specs.product_type canonical |
| 7 | SGGS003 | template_sub_type | other | air_blow_gun | specs.product_type canonical |

## ASK Listesi (4) — `phase2R-C-questions.md`

| # | Soru | Önerim |
|---|------|--------|
| Q1 | leather_conditioner → leather_protectant merge? | A (REJECT merge — ayrı kalsın) |
| Q2 | glass_care tgmerge 7 SKU + sub_type ayrımı? | A (merge kabul + 4 sub_type: washer_additive / glass_cleaner / glass_protectant / screen_cleaner) |
| Q3 | Q2M-PYA4000M için yeni `surface_prep` sub_type? | A (ceramic_coating grubu + surface_prep) |
| Q4 | 26942.099.001 `accessory` grubunu eritip `microfiber`'a taşı? | A (tg=microfiber + sub=multi_purpose_cloth) |

## Bilgi Notu (aksiyon yok)

`polisher_machine` template_group adı yanıltıcı — heat_gun, tornador_gun, air_blow_gun, extension_shaft gibi alet/ekipman ürünleri de bu grupta. Gelecek phase'de `machine_equipment` (veya benzeri) olarak rename edilmesi önerilir.

## Doğrulama Sonucu (staging/preview)

```
{
  "total": 7,
  "planned": 7,
  "unsupported": 0,
  "skipped": 0
}
```

**7/7 planned** — tüm APPROVE değişiklikleri staging API tarafından kabul edildi, unsupported/skipped yok. Commit yapılmadı (onay bekleniyor).

## Çıktı Dosyaları

- `data/consolidation/phase2R-C-approved.csv` — 7 APPROVE (CSV)
- `data/consolidation/phase2R-C-approved-payload.json` — Staging API payload
- `data/consolidation/phase2R-C-rejected.md` — REJECT yok notu
- `data/consolidation/phase2R-C-questions.md` — 4 soru (tam detay)
- `data/consolidation/phase2R-C-summary.md` — bu dosya

## Sonraki Adım

Kullanıcı Q1–Q4 sorularına karar verdikten sonra:
1. Q3/Q4=A seçilirse → ilgili payload'lar güncellenip ek staging preview çalıştırılacak
2. Q2=A seçilirse → glass_care tgmerge + washer_additive sub_type ataması için birleşik payload üretilecek
3. Tüm onaylar sonrası tek commit + staging apply
