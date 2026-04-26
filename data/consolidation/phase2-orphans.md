# Phase 2C — Orphan Sub_type Analizi

## Tarama
- Toplam ürün: 511
- Orphan kriteri: `template_sub_type IS NULL` veya `IN ('null','general','other')`
- Bulunan: **6 ürün** (1.17%)

## Dağılım
| Group | Count | Notu |
|-------|-------|------|
| accessory | 1 | sub_type IS NULL |
| polisher_machine | 5 | sub_type='other' (FLEX/SGCB/SCCB makina/aparat) |

## Atama önerisi (Phase 2C — `phase2-orphans-fix.csv`)

| SKU | Group | Mevcut | Önerilen | Gerekçe |
|-----|-------|--------|----------|---------|
| 26942.099.001 | accessory | NULL | `microfiber_cloth` | Ürün adı: MENZERNA Mikrofiber Bez Seti 4'lü |
| 516112 | polisher_machine | other | `extension_shaft` | FLEX FS 140 Esnek Uzatma Aparatı; specs.accessory_type=extension_shaft |
| 532579 | polisher_machine | other | `heat_gun` | FLEX HG 650 Sıcak Hava Tabancası; specs.product_type=heat_gun |
| SGGC055 | polisher_machine | other | `tornador_gun` | SGCB Tornador Detaylı Temizlik Tabancası; specs.product_type=tornador_cleaning_gun |
| SGGC086 | polisher_machine | other | `air_blow_gun` | SGCB Air Blow Gun; specs.product_type=air_blow_gun |
| SGGS003 | polisher_machine | other | `air_blow_gun` | SCCB Kısa Nozul Hava Tabancası; specs.product_type=air_blow_gun |

## Notlar
- 5 polisher_machine orphan'ı aslında **3 yeni sub_type** gerektiriyor: heat_gun, air_blow_gun (×2), tornador_gun, extension_shaft.
- Bu sub'lar polisher_machine taxonomisini "polish makinesi" sınırından çıkarıyor → asıl çözüm muhtemelen template_group rename (`machine_equipment` veya `power_tools`). Bu büyük değişiklik Phase 2 polisher_machine sahibinin (başka agent) merge önerisinde değerlendirilmeli.
- accessory grubu (1 ürün) eritme önerisi: `storage_accessories` (mikrofiber bez/havlu için doğru raf).
