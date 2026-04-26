# Phase 2R-C — REJECTED

Bu revizyonda doğrudan REJECT edilen değişiklik **yoktur**.

Belirsiz 4 öneri `phase2R-C-questions.md` dosyasında soru olarak tutulmuştur — karar kullanıcıya bırakılmıştır. Bu 4 öneri kararlaştırılana kadar staging'e **gönderilmeyecektir**.

## Belirsiz önerilerin özet durumu

| Öneri | Neden belirsiz | Önerim |
|-------|----------------|--------|
| leather_conditioner → leather_protectant (SKU 700468) | Conditioner (besleme) ≠ Protectant (SiO2 kaplama). Farklı fonksiyonlar. | REJECT (ayrı kalsın) |
| glass_care tgmerge içinde 3 use-case | washer_additive / glass_cleaner / glass_protectant / screen_cleaner karışıyor. | Merge kabul, 4 sub_type ayrımı |
| Q2M-PYA4000M sub_type (`single_layer_coating`) | Ürün coating değil, IPA prep (surface prep). | Yeni `surface_prep` sub_type |
| 26942.099.001 accessory grubu (1 SKU) | `accessory` template_group'ta yalnız 1 ürün. Mantıksız. | tg=microfiber + sub=multi_purpose_cloth |

## Bilgi notu (gelecek phase için)

`polisher_machine` template_group adı yanıltıcı: heat_gun, tornador_gun, air_blow_gun, extension_shaft gibi ürünler de bu grubun altında. Grubun içeriği "polisaj makinesi"nden çok "genel alet/ekipman". Gelecek bir phase'de `machine_equipment` (veya `power_tools_equipment`) olarak rename edilmesi önerilir. Bu phase kapsamında aksiyon alınmıyor.
