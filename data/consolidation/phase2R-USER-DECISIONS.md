# Phase 2R — Kullanıcı Cevapları + Konsolidasyon Planı

**Tarih:** 2026-04-23
**Format:** Soru → Cevap → Uygulama (hangi SKU'lar + hangi field + before/after)

---

## Tur 1

### Q1: 79818 (INNOVACAR X2 Fabric & Leather) sub_type
**Cevap:** `fabric_leather_cleaner` kapsayıcı yapılsın. `fabric_cleaner` + `fabric_cleaner_concentrate` altındaki tüm ürünler buraya merge. Ayrım meta key ile (compatibility: leather/fabric/fabric+leather).

**Uygulama:**
- 79818 (79818 INNOVACAR X2) → zaten fabric_leather_cleaner, kalır
- Q2M-FCNA1000M (Gyeon FabricCleaner) : fabric_cleaner → fabric_leather_cleaner
- 70723 (FRA-BER Lava Interni B) : fabric_cleaner_concentrate → fabric_leather_cleaner
- 71676 (FRA-BER Lava Interni Ultra) : fabric_cleaner_concentrate → fabric_leather_cleaner
- 73378 (FRA-BER Liquid Powder B8) : fabric_cleaner_concentrate → fabric_leather_cleaner
- 75404 (FRA-BER Lava Interni B Aroma) : fabric_cleaner_concentrate → fabric_leather_cleaner

**Toplam: 5 sub_type UPDATE**

### Q2 + Q3: IPE4P + GPE2P + interior_cloth + glass_cloth → cleaning_cloth
**Cevap:** cleaning_cloth tek havuz, ayrım meta key ile (purpose/target_surface).

**Uygulama:**
- 3219 (Green Monster) → zaten cleaning_cloth, kalır
- Q2M-IPE4P (InteriorPack) : kit → cleaning_cloth
- Q2M-GPE2P (GlassPack) : kit → cleaning_cloth
- Q2M-IWE40402P (InteriorWipe) : interior_cloth → cleaning_cloth
- Q2M-LWE40402P (LeatherWipe) : interior_cloth → cleaning_cloth
- 3218 (Glass Shine) : glass_cloth → cleaning_cloth
- 3218-1 (Glass Shine HD) : glass_cloth → cleaning_cloth
- Q2M-GWE4040 (GlassWipe EVO) : glass_cloth → cleaning_cloth
- Q2M-WD4060C (Waffle Dryer) : glass_cloth → cleaning_cloth

**Toplam: 8 sub_type UPDATE**

### Q4: 26942.099.001 (MENZERNA Mikrofiber Bez Seti)
**Cevap:** microfiber grubu + buffing_cloth sub. Meta key ile pasta/cila sonrası silme + hafif kir alma kullanım senaryoları önerilsin.

**Uygulama:**
- 26942.099.001 : template_group accessory → microfiber, sub_type null → buffing_cloth

**Toplam: 1 tg + 1 sub UPDATE (2 change)**

---

## Tur 2

### Q1: TRE30M trim_coating
**Cevap:** `trim_coating` sub korunsun (merge yok).

**Uygulama:** Değişiklik yok. İlk tur ajanın `trim_coating → paint_coating` önerisi iptal edildi.

### Q2: 75132 + 77192 → marin_products / interior_detailer
**Cevap:** Her iki ürün marin_products grubuna, interior_detailer sub_type'ına.

**Uygulama:**
- 75132 (FRA-BER Dory tik/parke) : tg interior_cleaner → marin_products, sub wood_cleaner → interior_detailer
- 77192 (FRA-BER Starboard wood_protector) : tg interior_cleaner → marin_products, sub wood_protector → interior_detailer

**Toplam: 4 change (2 tg + 2 sub)**

### Q3: Leather conditioner + protectant birleştir
**Cevap:** Birleştir. İngilizce sub_type adı: **`leather_treatment`** (besleme + koruma kapsayıcı).

**Uygulama:**
- 700468 (FRA-BER Cream Leather) : leather_conditioner → leather_treatment
- Q2-LCR500M (GYEON Q Leather Coat) : leather_protectant → leather_treatment

**Toplam: 2 sub UPDATE**

### Q4: Q2M-PYA4000M + 79292 → contaminant_solvers / surface_prep
**Cevap:** Her ikisi contaminant_solvers grubunda kalır, sub_type surface_prep olur.

**Uygulama:**
- Q2M-PYA4000M (GYEON Prep) : sub single_layer_coating → surface_prep (tg contaminant_solvers zaten)
- 79292 (INNOVACAR D2 Check) : sub oil_degreaser → surface_prep

**Toplam: 2 sub UPDATE**

---

## Tur 3

### Q1: Rotary corded + cordless → rotary
**Cevap:** Tek `rotary` sub + specs.power_source meta key.

**Uygulama:**
- 373680 (FLEX 14-2) : corded_rotary_polisher → rotary
- 406813 (FLEX 14-3) : corded_rotary_polisher → rotary
- SGGF179 (SGCB Rotary) : corded_rotary_polisher → rotary
- 533019 (FLEX PE 150 cordless) : cordless_rotary_polisher → rotary

**Toplam: 4 sub UPDATE** (+ meta key specs.power_source ekleme — sonraki aşamada)

### Q2: forced_rotation + mini rotary/orbital → dual_action_polisher
**Cevap:** Yeni sub adı `dual_action_polisher`. forced_rotation 2 + mini rotary/orbital 2 = 4 ürün.

**Uygulama:**
- 418072 (FLEX XCE 10-8 Pozitif Sürüş) : forced_rotation_polisher → dual_action_polisher
- 533020 (FLEX XCE 8 Pozitif Sürüş) : forced_rotation_polisher → dual_action_polisher
- 418102 (FLEX PXE 80 rotary/orbital) : mini_cordless_polisher → dual_action_polisher
- SGGF273 (SGCB mini rotary/orbital) : mini_cordless_polisher → dual_action_polisher

**Toplam: 4 sub UPDATE**

### Q3: da_polisher → orbital
**Cevap:** da_polisher → orbital (yeni yapı).

**Uygulama:**
- 418080 (FLEX XFE 7-15) : da_polisher → orbital
- 447129 (FLEX XFE 7-12 80) : da_polisher → orbital
- 533021 (FLEX XFE 15 cordless) : da_polisher → orbital
- SGGF181 (SGCB Orbital) : da_polisher → orbital

**Toplam: 4 sub UPDATE**

### Q4: Glass care — glass_cleaner template_group → glass_cleaner_protectant
**Cevap:** 2 ürün template_group rename.

**Uygulama:**
- 701606 (FRA-BER Cristal Clear) : tg glass_cleaner → glass_cleaner_protectant, sub glass_cleaner_additive korunur
- 74955 (FRA-BER Cristal Pro) : tg glass_cleaner → glass_cleaner_protectant, sub glass_cleaner_additive korunur

**Toplam: 2 tg UPDATE**

### Q5: SGGD402 (bahçe tabancası) → accessory
**Cevap:** accessory grubuna taşı.

**Uygulama:**
- SGGD402 : tg storage_accessories → accessory, sub water_spray_gun → (korunsun veya water_spray_gun kalsın)

**Toplam: 1 tg UPDATE**

---

## Tur 4

### Q1: tire_gel → tire_dressing (3 ürün)
**Cevap:** Hepsi tire_dressing'e merge.

**Uygulama:**
- 75138 (Gommanera Superlux 5lt) : tire_gel → tire_dressing
- 701908 (Superlux 900ml) : tire_gel → tire_dressing
- Q2M-TEYA1000M (Tire Express jel) : tire_gel → tire_dressing

**Toplam: 3 sub UPDATE**

### Q2: JC0101 (screen_cleaner) → DELETE
**Cevap:** DB'den tamamen sil.

**Uygulama:**
- DELETE FROM products WHERE sku='JC0101'
- İlgili product_faqs, product_relations, product_meta cascade delete gerekecek

**Toplam: 1 product DELETE (+ cascade)**

### Q3: polisher_machine orphan 4 ürün → accessory
**Cevap:** Hepsi accessory grubuna.

**Uygulama:**
- 532579 (FLEX HG 650 heat gun) : tg polisher_machine → accessory, sub other → (uygun sub, heat_gun kalabilir)
- SGGC055 (SGCB Tornador) : tg polisher_machine → accessory, sub other → tornador_gun
- SGGC086 (SGCB Air Blow) : tg polisher_machine → accessory, sub other → air_blow_gun
- SGGS003 (SCCB Kısa Nozul) : tg polisher_machine → accessory, sub other → air_blow_gun
- **516112 (FLEX FS 140 extension_shaft)**: kullanıcı spesifik söylemedi, ancak polisher_machine'in `machine_kit` veya `spare_part` olarak kalması mantıklı. Şimdilik machine_kit'te bırak veya **spare_part**'a taşı (FLEX PXE 80 için esnek uzatma aparatı = aksesuar yedek). Güvenli yol: kullanıcıya sor (ama zaten az ürün).

**Toplam: 4 change (tg + sub)**, 516112 için **ek soru gerekecek**.

---

## Tur 5

### Q1: Polisher_machine sub_type yapısı
**Cevap:** sander / rotary / orbital / dual_action_polisher / machine_kit (5 sub)

**Mevcut → yeni mapping zaten Tur 3'te yapıldı.**

### Q2: 513547-01 (matkap seti) → accessory
**Cevap:** accessory grubuna.

**Uygulama:**
- 513547-01 : tg polisher_machine → accessory, sub mini_cordless_polisher → (uygun sub, muhtemelen tool_kit veya brush_kit)

### Q3: 530537 (FLEX BW Blower) → accessory
**Cevap:** accessory grubuna.

**Uygulama:**
- 530537 : tg polisher_machine → accessory, sub mini_cordless_polisher → air_blow_gun veya blower

### Q4: GPRO6555 (cila süngeri) → polishing_pad
**Cevap:** polishing_pad grubuna.

**Uygulama:**
- GPRO6555 : tg polisher_machine → polishing_pad, sub mini_cordless_polisher → foam_pad

---

## Ek açık noktalar (kullanıcıya ek soru gerekebilir)

1. **513547 (FLEX Pasta Cila Vidalama ve Temizlik Fırça Seti)** — machine_kit sub'ında tek ürün. İçerik: PXE80 Mini Polisaj + DD 2G Matkap + 3'lü Fırça. Karma içerik. Polisher_machine'de machine_kit olarak kalması mantıklı (gerçek bir polisaj makinesi kit'i).

2. **516112 (FLEX FS 140 extension_shaft)** — PXE 80 için esnek uzatma aparatı. **Mantıklı sub_type: machine_kit (polisher_machine'de kalsın)** veya **spare_part'a taşı**. Kullanıcının "ben taşı demeden taşıma" kuralı → sormak güvenli.

3. **accessory grubunda yeni sub_type isimleri:** heat_gun, tornador_gun, air_blow_gun, water_spray_gun, garden_tool, blower, tool_kit — bunlar yeni sub_type olacak. Ajan oluştururken dikkat.

4. **marin_products interior_detailer** — mevcut sub_type'lar içinde interior_detailer var mı kontrol edilmeli. Yoksa yeni sub_type.

5. **Meta key eklemeleri (sonraki aşama, bu payload kapsamında DEĞİL):**
   - specs.power_source (corded/cordless) — polisher_machine/rotary+orbital
   - specs.motion_type (rotary/orbital/dual_action) — polisher_machine
   - specs.compatibility (array: leather/fabric) — fabric_leather_cleaner, cleaning_cloth
   - specs.use_case (cleaning/buffing/drying/applicator) — cleaning_cloth
   - specs.target_surface (glass/interior_plastic/leather/paint/trim/tire) — cleaning_cloth, trim_coating, vs.
   - specs.formulation (gel/foam/spray/cream) — tire_dressing, leather_treatment

---

## Özet: Toplam change sayısı

| Tur | Change | Tip |
|---|---:|---|
| Tur 1 Q1 (fabric merge) | 5 | sub_type |
| Tur 1 Q2+Q3 (cleaning_cloth merge) | 8 | sub_type |
| Tur 1 Q4 (MENZERNA) | 2 | tg + sub |
| Tur 2 Q2 (marin) | 4 | tg + sub |
| Tur 2 Q3 (leather_treatment) | 2 | sub |
| Tur 2 Q4 (surface_prep) | 2 | sub |
| Tur 3 Q1 (rotary) | 4 | sub |
| Tur 3 Q2 (dual_action) | 4 | sub |
| Tur 3 Q3 (orbital) | 4 | sub |
| Tur 3 Q4 (glass merge) | 2 | tg |
| Tur 3 Q5 (SGGD402) | 1 | tg |
| Tur 4 Q1 (tire_dressing) | 3 | sub |
| Tur 4 Q2 (JC0101 DELETE) | 1 | product DELETE |
| Tur 4 Q3 (polisher orphan 4) | 8 | tg + sub |
| Tur 5 Q2-Q4 (513547-01, 530537, GPRO6555) | 6 | tg + sub |
| 516112 (ek karar gerekebilir) | 0-2 | sub |
| **Toplam** | **~58** | — |

Önceki Faz 2R-A + 2R-B + 2R-C APPROVE toplamı **51** idi. User kararları ile **58** (+ silme + tg rename detayları).

---

## Sonraki adım

1. 516112 için son soru (veya machine_kit'te bırakma kararı)
2. Tüm 58 change'i REVISED payload'a konsolide et (`phase2R-FINAL-payload.json`)
3. `/staging/preview` ile doğrula → 58/58 planned beklenen
4. Kullanıcı commit onayı
5. Commit → audit_log
6. Faz 6 smoke test (bot eval + searchByQuery)
7. **Sonraki faz:** Meta key'leri ekleme (compatibility, use_case, target_surface, power_source, motion_type, formulation)
