# Phase 2R-C — Kullanıcı Onayı Gereken 4 Soru

Aşağıdaki 4 öneri belirsiz olduğu için staging'e gönderilmedi. Seçiminiz sonrası ilgili payload'lar oluşturulup gönderilecek.

---

## Q1: leather_care / leather_conditioner → leather_protectant merge?

**Kaynak (1):** SKU `700468` — FRA-BER Cream Leather (deri besleme/nemlendirme kremi, sub_type=`leather_conditioner`)
**Hedef (1):** SKU `Q2-LCR500M` — GYEON Q Leather Coat (SiO2 bazlı deri koruma kaplaması, sub_type=`leather_protectant`)

**Belirsizlik:** Conditioner = besleme/nemlendirme (cream, yağ/nem bazlı — deriyi yumuşatır, çatlamayı önler). Protectant = SiO2/polimer kaplama (koruma odaklı — su/kir iter). Farklı fonksiyonlar, farklı kullanım senaryoları. Bot "deri bakım ürünü" sorgusunda ikisini de önerebilir ama kullanıcı spesifik "deri kremi/besleyici" isterse protectant'ın arasında karıştırmak yanlış sonuç üretir.

**Alternatifler:**
- **A)** İki sub_type ayrı kalsın (`leather_conditioner` + `leather_protectant` + mevcut `leather_kit`) — REJECT merge
- **B)** Tek `leather_kit` sub'ına birleştir (3 sub → 1) — ayrım tamamen kaybolur
- **C)** Sadece protectant + conditioner birleşsin, `leather_kit` ayrı kalsın (mevcut öneri — Faz 2C)

**Önerim:** **A (REJECT)** — fonksiyonel fark anlamlı, bot'un doğru ürün önerebilmesi için ayrım korunmalı.

---

## Q2: glass_care tgmerge — tek grup içinde 3 farklı use-case karışıyor?

**İlgili ürünler (7):**
- `701606`, `74955` → windscreen washer fluid additive (cam suyu deposu katkısı — **depoya dökülür**, sprey değildir)
- `700466`, `71176`, `700662` → sprey-sil cam temizleyici (dış cam, el temizliği)
- `Q2M-GPYA1000M` → glass_protectant (GYEON Q View — hidrofobik sealant/kaplama)
- `JC0101` → screen_cleaner (ekran/LCD temizleyici)

**Belirsizlik:** Merge sonrası `glass_care` template_group'u **4 farklı use-case** içerir. "Cam temizleyici öner" sorgusunda washer_additive de dönerse yanlış sonuç (kullanıcı cam suyu deposu katkısı istemiyor, sprey temizleyici istiyor). Sub_type ayrımı kritik.

**Alternatifler:**
- **A)** Tek `glass_care` template_group, **4 sub_type** net ayrılsın:
  - `washer_additive` (701606, 74955)
  - `glass_cleaner` (700466, 71176, 700662)
  - `glass_protectant` (Q2M-GPYA1000M)
  - `screen_cleaner` (JC0101)
- **B)** Mevcut 2 grubu korut (`glass_cleaner` + `glass_cleaner_protectant`), tgmerge REJECT — sub_type konsolide etme
- **C)** `washer_additive`'i başka gruba taşı (ör. yeni `windshield_fluid` grubu veya `contaminant_solvers`), kalan 5 ürünü `glass_care`'de birleştir

**Önerim:** **A** — tgmerge uygula + 4 sub_type net ayrımı (3 sub_type ürünlerde zaten var, sadece washer_additive için yeni sub_type açılması/atanması gerek).

---

## Q3: Q2M-PYA4000M için yeni `surface_prep` sub_type?

**İlgili ürün (1):** `Q2M-PYA4000M` — GYEON Q2M Prep (IPA bazlı panel wipe — polisaj/seramik kaplama öncesi yüzey hazırlama, yağ/silikon/polisaj artığı temizleme).

**Belirsizlik:** Faz 2B'de ürün yanlışlıkla `contaminant_solvers` grubunda kaldı. Doğru hedef `ceramic_coating` grubu (prep ürünü olduğu için kaplama workflow'unun parçası). Ama mevcut sub_type önerisi `single_layer_coating` **yanlış** — ürün coating **değil**, prep (yüzey hazırlama). `single_layer_coating` hem anlam olarak hem taksonomik olarak uyumsuz.

**Alternatifler:**
- **A)** `ceramic_coating` grubuna yeni `surface_prep` sub_type aç ve ürünü oraya ata
- **B)** `contaminant_solvers`'ta kalsın + yeni `surface_prep` sub_type aç (mevcut grup "temizleyici/sökücü" odaklı — uyum zayıf, kaplama workflow'unun parçası değil)
- **C)** Yeni küçük `prep_tools` template_group aç (çok küçük grup — 1 ürün için mantıksız)
- **D)** `paint_protection_quick` altına taşı (paint_protection_quick "hızlı koruma/cila" — prep değil, semantik uyumsuz)

**Önerim:** **A** — `ceramic_coating` grubu + yeni `surface_prep` sub_type. İlerisi için başka prep ürünleri (panel wipe, degreaser) eklendiğinde aynı sub_type genişletilebilir.

---

## Q4: 26942.099.001 accessory grubu eritme?

**İlgili ürün (1):** `26942.099.001` — MENZERNA Mikrofiber Bez Seti (4'lü).

**Belirsizlik:** `accessory` template_group'ta **tek başına 1 ürün**. Mevcut öneri sub_type=`microfiber_cloth` atıyor ama grubun kendisi anlamsız (1 SKU'luk özel grup). Zaten `microfiber` template_group'u var ve bu ürün oraya **doğal** olarak ait.

**Alternatifler:**
- **A)** `template_group=microfiber` + `sub_type=multi_purpose_cloth` (mevcut `microfiber` taksonomisiyle tam uyumlu — 4'lü set ≈ genel amaçlı bez)
- **B)** `template_group=microfiber` + yeni `sub_type=cloth_kit` (set/kit ayrımı için yeni sub)
- **C)** `accessory` grubu kalsın, sadece sub_type `microfiber_cloth` atansın (mevcut öneri — grup israfı devam eder)

**Önerim:** **A** — `accessory` grubunu eriterek taksonomi temizliği sağlanır. Ürün fonksiyonel olarak mikrofiber bez, doğal grubu `microfiber`.

---

## Karar sonrası aksiyon

Seçiminiz sonrası:
- **Q1=A** ise → değişiklik yok (staging'e gitmez)
- **Q2=A** ise → tgmerge-payload 7 SKU + washer_additive için sub_type ataması eklenir
- **Q3=A** ise → Q2M-PYA4000M için tg=ceramic_coating + sub=surface_prep staging'e eklenir
- **Q4=A** ise → orphan fix (26942.099.001) `template_group=microfiber` + `sub_type=multi_purpose_cloth` olarak güncellenir
