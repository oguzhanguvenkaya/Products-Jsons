# Phase 2R-B — ASK (Belirsiz Merge Kararları)

5 kriter rubriğinde %60-89 bandında kalan 10 merge. Kullanıcı onayı beklenir.

---

## Q1: polisher_machine / corded_rotary_polisher → rotary_polisher (3 ürün)

**Kaynak (3 ürün):**
- 373680 — FLEX 14-2 150 Rotary Yüksek Torklu Polisaj Makinesi 1400W
- 406813 — FLEX 14-3 125 Rotary Polisaj Makinesi 1400W
- SGGF179 — SGCB Rotary Yüksek Torklu Polisaj Makinesi 150mm 1200W

**Hedef:** `rotary_polisher` (533019 cordless ile birleştir → üst aile)

**Belirsizlik:** Corded ve cordless aynı hareket tipi (rotary) fakat güç kaynağı farklı. Müşteri genelde "kablosuz polisaj" veya "kablolu polisaj" olarak arar; RAG filter'ı power_source facet'i net desteklerse merge mantıklı. Ancak şu an `power_source` facet'inin filter katmanında kullanıldığı teyit edilmedi.

**Alternatifler:**
- A) Kalsın (corded / cordless ayrı — mevcut durum)
- B) Merge → `rotary_polisher` + `specs.power_source=corded|cordless` (ÖNERİLEN)
- C) Yeni sub_type: `rotary_corded`, `rotary_cordless` (adlandırma tutarlı)
- D) Farklı tg: polisher_machine içinde kalsın ama üst bir `rotary_polisher` + alt flag

**Önerim:** B — sub_type birleştir, specs.power_source ile ayrım. Koşul: retrieval-service facet config'ine `power_source` tag'i eklenmesi; aksi halde filtrelenemez → A.

---

## Q2: polisher_machine / cordless_rotary_polisher → rotary_polisher (1 ürün)

**Kaynak (1):** 533019 — FLEX PE 150 18-EC Set Rotary Çift Akülü Kablosuz Polisaj Makinesi Seti 18V

**Hedef:** `rotary_polisher` (Q1 ile birlikte uygulanır)

**Belirsizlik:** Tek ürün; Q1 ile paralel karar.

**Alternatifler:** Q1 ile aynı.

**Önerim:** B (Q1 kararıyla senkron).

---

## Q3: polisher_machine / forced_rotation_polisher → da_polisher (2 ürün)

**Kaynak (2):**
- 418072 — FLEX XCE 10-8 125 Pozitif Sürüş Random Orbital Polisaj Makinesi 1010W (Gear Driven Dual Action)
- 533020 — FLEX XCE 8 150 18-EC Set DA Orbital Çift Akülü Kablosuz Polisaj Makinesi Seti — Pozitif Sürüş

**Hedef:** `da_polisher` (standart random orbital DA ailesi)

**Belirsizlik:** Forced rotation (gear-driven DA / pozitif sürüş) ≠ klasik random orbital DA. Fark önemli: forced rotation kesim gücü daha yüksek, pad durmaz; normal DA pad direnç altında durabilir. Müşteri "pozitif sürüş" arıyorsa ayrı bulması gerekir.

**Alternatifler:**
- A) Kalsın (`forced_rotation_polisher` ayrı — drive_type ayrımı net)
- B) Merge → `da_polisher` + `specs.drive_type=forced|random_orbital`
- C) Yeni sub_type: `gear_driven_da` (pazar terminolojisine yakın)

**Önerim:** A — ayrı kalsın. Teknik olarak farklı araç, 2 ürün yeterli filtre hacmi; merge hata verir (kullanıcı "pozitif sürüş" aradığında klasik DA'yı da görür).

---

## Q4: storage_accessories / water_spray_gun → wash_accessory (1 ürün)

**Kaynak (1):** SGGD402 — SGCB 10 Desenli Su Püskürtme Sulama Tabancası — Ayarlanabilir Tazyik 10 Kademeli Bahçe Hortum

**Hedef:** `wash_accessory` (yıkama aksesuarı)

**Belirsizlik:** Ürün adı "Bahçe Hortum" içeriyor. Bu bir bahçe sulama tabancası; araç yıkama aksesuarı mı, yoksa genel bahçe ürünü mü? Mağazada aracı yıkamak için kullanılabilir fakat ürün tanımı araca özel değil. Kategori yanlış (storage_accessories içinde garip) olabilir.

**Alternatifler:**
- A) Kalsın (`water_spray_gun` sub_type — tek ürün fakat spesifik)
- B) Merge → `wash_accessory` (79472 kova ile aynı çatı)
- C) Farklı tg: `general_tool` veya `garden_accessory`
- D) Kategori dışına çıkar (kapsam dışı ürün — kaldır)

**Önerim:** A — `water_spray_gun` korunsun; araç yıkama amacıyla kullanılabildiği için storage_accessories'te tut. Merge, "wash_accessory" filtre bekleyen kullanıcıya bahçe sulama ürünü döndürme riski taşır.

---

## Q5: tire_care / tire_gel → tire_dressing (3 ürün)

**Kaynak (3):**
- 75138 — FRA-BER Gommanera Superlux Solvent Bazlı Uzun Süreli Lastik Parlatıcı - 5 lt
- 701908 — FRA-BER Superlux Suya Dayanıklı Lastik Parlatıcı Dış/İç Plastik Trim - 900 ml
- Q2M-TEYA1000M — GYEON QM Tire Express Lastik Parlatıcı ve Koruyucu - 1000 ml (Su Bazlı Jel Oto Lastik Cilası)

**Hedef:** `tire_dressing` (specs.formulation=gel ile ayırt edilir)

**Belirsizlik:**
1. **75138 vs 75140 variant tutarsızlığı kritik**: aynı ürün "Gommanera Superlux", 25 lt versiyonu `tire_dressing`, 5 lt versiyonu `tire_gel` işaretli. Bu açıkça bir veri hatası — aynı formül farklı ambalaj.
2. Gel formülasyonunun ayrı bir sub_type hak edip etmediği tartışmalı. Cilalayıcı olarak kullanım aynı; ancak uygulama kıvamı (köpük vs jel) müşteri açısından önemli.
3. Q2M-TEYA1000M ürün adı "Jel Oto Lastik Cilası" diye geçtiği için kullanıcı "jel" araması yaparsa spesifik sonuç beklentisi olur.

**Alternatifler:**
- A) Kalsın (`tire_gel` ayrı — 3 ürün yeterli; "jel" araması destekleniyor)
- B) Merge → `tire_dressing` + `specs.formulation=gel|foam|spray` (ÖNERİLEN — facet gel filtre destekliyorsa)
- C) Sadece 75138 düzelt (variant 75140 ile aynı `tire_dressing` yap), 701908 ve Q2M-TEYA1000M `tire_gel` kalsın
- D) Farklı yön: `tire_gel` tüm gel formüllerinin toplandığı spesifik sub_type olarak güçlendirilsin; 75140 `tire_gel`'e çekilsin

**Önerim:** C — 75138'i `tire_dressing`'e çek (75140 ile tutarlılık için); 701908 ve Q2M-TEYA1000M `tire_gel` kalsın çünkü "jel" formülasyonu ürün adında açıkça belirtilmiş ve aramada kritik. specs.form="Sıvı" hatası ayrıca düzeltilmeli (specs.formulation=gel). Eğer facet policy onaylanırsa B'ye geçilir.

---

**Toplam ASK:** 10 (Q1:3, Q2:1, Q3:2, Q4:1, Q5:3)
