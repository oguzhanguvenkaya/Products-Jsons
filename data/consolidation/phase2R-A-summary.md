# Phase 2R-A — Özet (8 grup, 49 merge)

**Tarih:** 2026-04-23  
**Kapsam:** abrasive_polish, applicators, car_shampoo, ceramic_coating, clay_products, contaminant_solvers, interior_cleaner, microfiber  
**Metodoloji:** 5-kriter rubriği (primary kategori / hedef yüzey / kullanım senaryosu / formülasyon / filter mantığı) → APPROVE (5/5) / REJECT (1+ ihlal) / ASK (%60-89 belirsiz)

## Genel Sonuç

| Karar | Sayı | Oran |
|---|---|---|
| APPROVE | 35 | %71.4 |
| REJECT | 9 | %18.4 |
| ASK | 5 | %10.2 |
| **Toplam** | **49** | %100 |

**Staging preview doğrulama:** `total=35, planned=35, unsupported=0, skipped=0` — tüm APPROVED değişiklikler uygulamaya hazır.

## Grup Bazında Breakdown

| Grup | Toplam | Approve | Reject | Ask |
|---|---:|---:|---:|---:|
| abrasive_polish | 3 | 3 | 0 | 0 |
| applicators | 3 | 3 | 0 | 0 |
| car_shampoo | 4 | 1 | 3 | 0 |
| ceramic_coating | 13 | 10 | 2 | 1 |
| clay_products | 3 | 3 | 0 | 0 |
| contaminant_solvers | 5 | 4 | 1 | 0 |
| interior_cleaner | 11 | 7 | 2 | 2 |
| microfiber | 7 | 5 | 0 | 2 |
| **Toplam** | **49** | **35** | **9** | **5** |

## En Önemli Bulgular

### 1. `car_shampoo` grubu en yüksek red oranına sahip (%75)
3/4 merge reddedildi:
- **towel_wash × 2** (701422, Q2M-TWYA500M): Mikrofiber bez deterjanı araç şampuanı DEĞİL — hedef yüzey bez, araç gövdesi değil.
- **rinseless_wash → prewash_foaming**: Susuz yıkama (nötr, düşük kir) ↔ agresif ön yıkama (alkali) — ters agresiflik yönü.
- Tek APPROVED: `ppf_shampoo → ph_neutral_shampoo` (ph=7 nötr doğrulandı).

### 2. `ceramic_coating` — paint_coating ailesi sağlam, ama substrat-farklı 3 ürün ayrı kalmalı
10 merge APPROVED (paint/PPF/top coat/kit vs.) ama:
- `tire_coating` (REJECT): kauçuk substrat ≠ boya
- `leather_coating` (REJECT): deri substrat ≠ kumaş (fabric_coating hedefi yanlış)
- `interior_coating` (REJECT): multi-surface antibakteriyel; fabric_coating'a merge olursa semantik kaybı
- `trim_coating` (ASK): plastik trim; substrat farklı ama mekanik benzer — öneri `trim_coating` korunsun

### 3. `interior_cleaner` — marine/wood ürünleri yanlış grupta
- SKU **77192** (wood_protector, REJECT) ve **75132** (wood_cleaner, ASK): marin tik/ahşap ürünleri `interior_cleaner` grubunda doğru değil. Phase 3'te `marine_care` veya `wood_care` yeni template_group önerisi.
- SKU **75277** (fabric_protector, REJECT): koruyucu (water repellent) ↔ temizleyici tamamen farklı işlev.

### 4. `contaminant_solvers` — 1 kritik düzeltme
- SKU **Q2M-PYA4000M** yanlış template_group'ta (contaminant_solvers); Gyeon QM Prep seramik öncesi hazırlayıcı → `ceramic_coating` grubuna + `surface_prep` sub'a taşındı (tek payload'da iki değişiklik: group + sub).

### 5. Bilinen REJECT adayları tümü teyit edildi
Kullanıcı listesindeki 5 bilinen şüphe tam olarak doğrulandı:
- towel_wash → ph_neutral_shampoo ✓ REJECT (R2, R3)
- rinseless_wash → prewash_foaming_shampoo ✓ REJECT (R1)
- tire_coating → paint_coating ✓ REJECT (R6)
- wood_protector → plastic_dressing ✓ REJECT (R8)
- fabric_protector → fabric_cleaner_concentrate ✓ REJECT (R9)

## Çıktı Dosyaları

| Dosya | İçerik | Satır |
|---|---|---:|
| `phase2R-A-approved.csv` | 35 APPROVED merge CSV | 36 (header + 35) |
| `phase2R-A-approved-payload.json` | Staging API payload | 35 changes |
| `phase2R-A-rejected.md` | 9 REJECT markdown tablo | — |
| `phase2R-A-questions.md` | 5 ASK soru + alternatif | — |
| `phase2R-A-summary.md` | Bu dosya | — |

## Sonraki Adım

1. **5 ASK sorusu kullanıcıya yöneltilecek** — kararlar alındıktan sonra APPROVED havuzuna eklenip ikinci tur staging preview çalıştırılacak.
2. **9 REJECT merge için taxonomy güncelleme önerileri** (`tire_coating`, `wood_protector`, `fabric_protector` yeni sub veya yeni template_group olarak kalsın).
3. **Commit YOK** — sadece staging payload hazır; kullanıcı onayı sonrası `POST /admin/staging/apply` çağrısı yapılabilir.
