# Phase 2R-A — REJECTED Merges

8 grup / 49 ilk-tur öneri içinden **9 merge reddedildi**. 5-kriter rubriği (primary kategori, hedef yüzey, kullanım senaryosu, formülasyon ailesi, filter mantığı) ihlallerine göre.

---

## R1. `car_shampoo / Q2M-EW1000M: rinseless_wash -> prewash_foaming_shampoo`

| Kriter | Durum | Not |
|---|---|---|
| 1. Primary kategori | PASS | İkisi de car_shampoo |
| 2. Hedef yüzey | PASS | Boya/gövde |
| 3. Kullanım senaryosu | **FAIL** | rinseless = düşük-kir, susuz temizlik; prewash_foaming = agresif ön yıkama (durulamalı) |
| 4. Formülasyon ailesi | **FAIL** | Rinseless seramik-katkılı nötr; prewash alkali agresif kir sökücü |
| 5. Filter mantığı | **FAIL** | Bot "susuz yıkama" sorusunda agresif prewash öneremez |

**Karar:** REJECT  
**Alternatif:** `rinseless_wash` ayrı sub olarak korunmalı; yeni alt-tipe gerek yok, mevcut kalsın. İleride `ph_neutral_shampoo`'nun altına `waterless_variant=true` flag eklenebilir.

---

## R2. `car_shampoo / 701422: towel_wash -> ph_neutral_shampoo`

| Kriter | Durum | Not |
|---|---|---|
| 1. Primary kategori | PASS | car_shampoo içi |
| 2. Hedef yüzey | **FAIL** | Hedef = mikrofiber bez/sünger/ped — araç gövdesi DEĞİL |
| 3. Kullanım senaryosu | **FAIL** | Bez bakımı ≠ araç yıkama |
| 4. Formülasyon ailesi | PASS | ph-nötr konsantre |
| 5. Filter mantığı | **FAIL** | "araç şampuanı öner" filtresi bez deterjanı dönmemeli |

**Karar:** REJECT  
**Alternatif:** `towel_wash` ayrı sub olarak korunmalı; `accessory_care_detergent` yeni sub açılabilir veya farklı template_group (`laundry_care` / `microfiber_care`) düşünülebilir.

---

## R3. `car_shampoo / Q2M-TWYA500M: towel_wash -> ph_neutral_shampoo`

R2 ile aynı gerekçe — Gyeon TowelWash mikrofiber bez/ped yıkama deterjanı, araç gövdesi şampuanı değil.

**Karar:** REJECT  
**Alternatif:** R2 ile aynı (towel_wash kalsın veya yeni sub).

---

## R4. `ceramic_coating / Q2-PC100M: interior_coating -> fabric_coating`

| Kriter | Durum | Not |
|---|---|---|
| 1. Primary kategori | PASS | ceramic_coating |
| 2. Hedef yüzey | **FAIL** | PurifyCoat multi-surface: plastik + deri + kumaş; fabric_coating sadece kumaş |
| 3. Kullanım senaryosu | PARTIAL | Koruma → ortak |
| 4. Formülasyon ailesi | PARTIAL | Antibakteriyel özel katkı; fabric_coating hidrofobik öncelikli |
| 5. Filter mantığı | **FAIL** | "deri koltuk koruma seramik" sorgusunda antibakteriyel multi-surface ürün döner — yanıltıcı |

**Karar:** REJECT  
**Alternatif:** `interior_coating` ayrı sub olarak korunsun (çoklu yüzey iç mekan seramik kaplaması için); paint_coating ile fabric_coating arasında üçüncü ekosistem.

---

## R5. `ceramic_coating / Q2-LSE50M: leather_coating -> fabric_coating`

| Kriter | Durum | Not |
|---|---|---|
| 1. Primary kategori | PASS | ceramic_coating |
| 2. Hedef yüzey | **FAIL** | Deri yüzey ≠ kumaş yüzey — substrat ve bakım protokolü farklı |
| 3. Kullanım senaryosu | PARTIAL | İç mekan koruma |
| 4. Formülasyon ailesi | **FAIL** | Deri esnek film + nefes alabilirlik; fabric DWR impregnation — kimya farklı |
| 5. Filter mantığı | **FAIL** | "deri koltuk seramik kaplama" sorgusunda kumaş ürün önerilmemeli |

**Karar:** REJECT  
**Alternatif:** `leather_coating` sub olarak korunsun; `interior_coating` grubu altında deri/kumaş ayrı subler halinde kalsın.

---

## R6. `ceramic_coating / Q2-TYA500M: tire_coating -> paint_coating`

| Kriter | Durum | Not |
|---|---|---|
| 1. Primary kategori | PASS | ceramic_coating (Gyeon Q Tire seramik bazlı jel) |
| 2. Hedef yüzey | **FAIL** | Kauçuk lastik ≠ boya yüzeyi; farklı substrat kimyası |
| 3. Kullanım senaryosu | **FAIL** | Lastik parlatma ≠ boya koruma |
| 4. Formülasyon ailesi | **FAIL** | Jel formülü + UV koruma lastik için; paint_coating sıvı seramik |
| 5. Filter mantığı | **FAIL** | "lastik parlatıcı" filter sonucu paint_coating dönerse yanıltıcı |

**Karar:** REJECT (bilinen aday teyit edildi)  
**Alternatif:** `tire_coating` ayrı sub; tire_care template_group'a taşınması da değerlendirilebilir (ASK sorusu ile sor).

---

## R7. `contaminant_solvers / Q2M-TOTR1000M: wax_remover -> tar_glue_remover`

| Kriter | Durum | Not |
|---|---|---|
| 1. Primary kategori | PASS | contaminant_solvers |
| 2. Hedef yüzey | PARTIAL | Her ikisi de boya/PPF/vinyl |
| 3. Kullanım senaryosu | **FAIL** | Wax/cila/mum çözücü ≠ zift/yapıştırıcı sökücü — hedef kontaminant farklı |
| 4. Formülasyon ailesi | PARTIAL | İkisi de solvent bazlı ama farklı solventler |
| 5. Filter mantığı | **FAIL** | "fabrika mumunu sök" sorgusunda tar_glue dönerse semantik kayma |

**Karar:** REJECT  
**Alternatif:** `wax_remover` sub olarak korunsun; `coating_prep_solvent` üst ailesi düşünülebilir (ama ayrı sub'lar altında).

---

## R8. `interior_cleaner / 77192: wood_protector -> plastic_dressing`

| Kriter | Durum | Not |
|---|---|---|
| 1. Primary kategori | PASS | interior_cleaner (zorlama) |
| 2. Hedef yüzey | **FAIL** | Ahşap (tik/parke) ≠ plastik — tamamen farklı substrat |
| 3. Kullanım senaryosu | **FAIL** | Marin ahşap koruma ≠ araç plastik dressing |
| 4. Formülasyon ailesi | **FAIL** | Ahşap yağ emprenye; plastik dressing silikon/polimer film |
| 5. Filter mantığı | **FAIL** | "tik bakımı" sorgusunda plastik ürün önerilmemeli |

**Karar:** REJECT (bilinen aday teyit edildi)  
**Alternatif:** `wood_protector` sub olarak korunsun; muhtemelen `marine_care` veya `wood_care` yeni template_group'a taşınmalı (ASK sorusu olarak sor).

---

## R9. `interior_cleaner / 75277: fabric_protector -> fabric_cleaner_concentrate`

| Kriter | Durum | Not |
|---|---|---|
| 1. Primary kategori | PASS | interior_cleaner |
| 2. Hedef yüzey | PASS | Kumaş |
| 3. Kullanım senaryosu | **FAIL** | KORUYUCU (su itici, kirlenmeyi önle) ≠ TEMİZLEYİCİ (leke sök) |
| 4. Formülasyon ailesi | **FAIL** | DWR/fluorocarbon hidrofobik; temizleyici yüzey aktif madde — zıt kimya |
| 5. Filter mantığı | **FAIL** | "kumaş koltuk leke temizle" sorgusunda koruyucu ürün önerilmemeli |

**Karar:** REJECT (bilinen aday teyit edildi)  
**Alternatif:** `fabric_protector` sub olarak korunsun; muhtemelen `fabric_protection` veya `textile_protector` yeni sub olarak interior_cleaner altında kalsın (ya da `paint_protection_quick` ile benzer bir koruma grubuna taşınsın — ASK sorusu).

---

## Özet

| # | SKU | Merge | Gerekçe |
|---|---|---|---|
| R1 | Q2M-EW1000M | rinseless→prewash | Agresiflik ters |
| R2 | 701422 | towel_wash→ph_neutral | Bez ≠ araç |
| R3 | Q2M-TWYA500M | towel_wash→ph_neutral | Bez ≠ araç |
| R4 | Q2-PC100M | interior→fabric_coating | Multi-surface ≠ sadece kumaş |
| R5 | Q2-LSE50M | leather→fabric_coating | Deri ≠ kumaş |
| R6 | Q2-TYA500M | tire→paint_coating | Lastik ≠ boya |
| R7 | Q2M-TOTR1000M | wax→tar_glue | Farklı kontaminant |
| R8 | 77192 | wood→plastic_dressing | Ahşap ≠ plastik |
| R9 | 75277 | fabric_protector→fabric_cleaner | Koruma ≠ temizlik |

**Toplam: 9 REJECT / 49 merge**
