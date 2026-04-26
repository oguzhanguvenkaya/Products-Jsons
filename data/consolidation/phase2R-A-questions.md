# Phase 2R-A — ASK (Belirsiz) Merges

5 merge %60-89 güven bandında; ilk-tur ajan label'ında da belirsizlik ifade edilmiş. Her biri için alternatifler + önerim.

---

## Q1: interior_cleaner / 79818 — `fabric_leather_cleaner → fabric_cleaner_concentrate` ?

**Kaynak (1):** SKU `79818` — INNOVACAR X2 Fabric&Leather Konsantre 4.54 lt (ph=9.5). "Koltuk, direksiyon, emniyet kemeri, halı, tavan" — çoklu yüzey (deri + kumaş).

**Hedef (1+):** SKU `Q2M-FCNA1000M` — Gyeon FabricCleaner 1000 ml (ph=10). SADECE kumaş.

**Belirsizlik:** %75 — Ürün hem deri hem kumaş kullanılıyor; `fabric_cleaner_concentrate` "fabric only" semantiğini zayıflatır. Filter mantığında "deri temizleyici öner" sorgusu bu ürünü dönebilir mi? Belirsiz.

**Alternatifler:**
- **A)** `fabric_leather_cleaner` sub olarak korunsun (çoklu yüzey multi-surface)
- **B)** Yeni sub aç: `upholstery_cleaner` (kumaş + deri ortak döşeme temizleyicisi)
- **C)** Hedef olarak `fabric_cleaner_concentrate` + `multi_surface=true` spec flag
- **D)** Farklı grup: `interior_detailer_concentrate` gibi concentrate alt-ekosistemi

**Önerim:** **B** — `upholstery_cleaner` yeni sub; döşeme (upholstery) semantik olarak hem kumaş hem deri içerir. Filter mantığı temiz, INNOVACAR X2 bu yeni sub'a oturur, Gyeon FabricCleaner `fabric_cleaner_concentrate`'de kalır.

---

## Q2: microfiber / Q2M-IPE4P — `kit → multi_purpose_cloth` ?

**Kaynak (1):** SKU `Q2M-IPE4P` — Gyeon InteriorPack EVO 4'lü iç aksam mikrofiber seti. İç konsol, torpido, plastik aksam, deri koltuk, Alcantara için.

**Hedef (1+):** `multi_purpose_cloth` — Jenerik çok amaçlı bez (örn. KLIN Green Monster 3219).

**Belirsizlik:** %70 — Kit "paket" ürün; tek bez değil 4'lü set. `multi_purpose_cloth` tekil item semantiği taşıyor. Filter'da "tek bez ver" sorgusunda pack dönerse yanıltıcı.

**Alternatifler:**
- **A)** `kit` sub olarak korunsun (paket ürün semantiği korunur)
- **B)** Yeni sub aç: `microfiber_pack` veya `cloth_set` (kit ürünler için)
- **C)** Hedef `interior_cloth` + `kit_flag=true` spec (interior-specific olduğundan)
- **D)** Hedef `multi_purpose_cloth` + `kit_flag=true` (kabul)

**Önerim:** **C** — IPE4P'nin ağırlıklı kullanımı iç mekan (konsol, torpido, deri, Alcantara). `interior_cloth` + `kit_flag=true` hem doğru yüzey hem doğru paket semantiği. B'den daha basit.

---

## Q3: microfiber / Q2M-GPE2P — `kit → multi_purpose_cloth` ?

**Kaynak (1):** SKU `Q2M-GPE2P` — Gyeon GlassPack EVO 2'li cam mikrofiber seti. Cam yüzey temizlik+koruma için.

**Hedef (1+):** `multi_purpose_cloth` jenerik bez.

**Belirsizlik:** %70 — GPE2P **cam-specific** (GlassPack isminden belli), `multi_purpose_cloth`'a merge edilirse cam-spesifik semantik kaybolur. Filter'da "cam bezi ver" sorgusunda Q2M-SEP1010C (glass_cloth) ile GPE2P birlikte dönmeli.

**Alternatifler:**
- **A)** `kit` sub olarak korunsun
- **B)** Hedef `glass_cloth` + `kit_flag=true` (cam-specific doğru ailede)
- **C)** Hedef `multi_purpose_cloth` + `kit_flag=true` (öneri — kabul)
- **D)** Yeni sub: `glass_pack`

**Önerim:** **B** — GlassPack EVO cam kaplama/silme için tasarlanmış; `glass_cloth` + `kit_flag=true` doğru ailede konumlandırır. İlk-tur ajan önerisi (C) yanlış yerleştirme.

---

## Q4: ceramic_coating / Q2-TRE30M — `trim_coating → paint_coating` ?

**Kaynak (1):** SKU `Q2-TRE30M` — Gyeon Q Trim EVO plastik trim koruyucu/yenileyici. "Solmuş plastikleri fabrika görünümüne döndür, piyano-black direkler ve farlar UV koruma".

**Hedef (çoğul):** paint_coating (boya kaplama, boya yüzeyi için).

**Belirsizlik:** %65 — Hedef yüzey **plastik trim**, boya değil. Substrat farklı (polyolefin plastik vs. clearcoat boya). Ama koruma mekaniği (SiO2 kristalleşme) aynı. İlk-tur label'da da "trim_coating yeni sub düşünülebilir" ifadesi var.

**Alternatifler:**
- **A)** `trim_coating` sub olarak korunsun (farklı substrat ayrı kalır)
- **B)** Yeni sub aç: `plastic_coating` (trim + piyano-black + headlight için)
- **C)** Hedef `paint_coating` + `target_surface=trim` spec flag
- **D)** Farklı template_group: `trim_protection` altında ayrı ekosistem

**Önerim:** **A** — `trim_coating` sub olarak korunsun. Substrat farkı (plastik ≠ boya) filter'da yanıltıcı sonuç yaratır ("boya seramik öner" sorgusunda trim ürünü dönmemeli). Benzer gerekçeyle Q2-LSE50M (leather_coating) ve Q2-TYA500M (tire_coating) da REJECT edildi.

---

## Q5: interior_cleaner / 75132 — `wood_cleaner → interior_apc` ?

**Kaynak (1):** SKU `75132` — FRA-BER Dory marin/tekne tik ve parke temizleyici 1:50 konsantre. "Güverte tik, kokpit, ahşap mobilya, kabin parkeleri".

**Hedef (çoğul):** `interior_apc` — araç iç mekan all-purpose cleaner (plastik, vinyl, kumaş vs.).

**Belirsizlik:** %65 — Hedef yüzey **ahşap (marin)**, araç iç mekanı değil. Wood_protector (77192) zaten REJECT edildi benzer gerekçeyle. Ama: tek başına bir `wood_cleaner` sub'u ayakta kalabilir mi?

**Alternatifler:**
- **A)** `wood_cleaner` sub olarak korunsun
- **B)** Yeni template_group: `marine_care` veya `wood_care` (77192 ile birlikte taşı)
- **C)** Hedef `interior_apc` + `target_surface=wood` (kabul)
- **D)** `interior_apc` ailesinin `wood_variant` alt-dalı

**Önerim:** **B** — `marine_care` template_group aç (77192 wood_protector + 75132 wood_cleaner + gelecekteki marin ürünler). Ahşap substrat interior_cleaner ekosistemine sığmıyor; filter mantığı tek bir yerde tutulmalı. Kısa vadede **A** ile başla, Phase 3'te B'ye evril.

---

## Özet

| Q | SKU | Merge | Önerim |
|---|---|---|---|
| Q1 | 79818 | fabric_leather → fabric_concentrate | B: yeni `upholstery_cleaner` sub |
| Q2 | Q2M-IPE4P | kit → multi_purpose_cloth | C: `interior_cloth` + kit_flag |
| Q3 | Q2M-GPE2P | kit → multi_purpose_cloth | B: `glass_cloth` + kit_flag |
| Q4 | Q2-TRE30M | trim_coating → paint_coating | A: `trim_coating` korunsun |
| Q5 | 75132 | wood_cleaner → interior_apc | A şimdilik; B ileride |

**Toplam: 5 ASK / 49 merge**
