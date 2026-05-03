# Slot Extractor Coverage Audit — Phase 1.1.14D-mini

**Tarih:** 2026-05-04
**Kaynak:** 2 prompt dosyası
**Mapping sayısı:** 48
**DB:** 24 template_group, 112 sub_type

## Özet

- Toplam phrase: **78**
- Slot extractor ile **kapsanan**: 20 (25.6%)
- **Kapsanmayan (GAP):** 58

## Detay Tablo

| # | Source:Line | Phrase | Beklenen canonical | slotExtractor sonuç | Coverage | DB var? | Tool schema? | Karar |
|---|---|---|---|---|---|---|---|---|
| 1 | `tools/search-products.ts:71` | `Seramik kaplama` | `ceramic_coating` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 2 | `tools/search-products.ts:72` | `cam için seramik` | `ceramic_coating/glass_coating` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 3 | `tools/search-products.ts:74` | `decon şampuan` | `car_shampoo/decon_shampoo` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 4 | `tools/search-products.ts:75` | `kil bar` | `contaminant_solvers` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 5 | `tools/search-products.ts:76` | `Su lekesi temizleyici` | `contaminant_solvers/water_spot_remover` | `contaminant_solvers/water_spot_remover` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 6 | `tools/search-products.ts:76` | `kireç çözücü` | `contaminant_solvers/water_spot_remover` | `contaminant_solvers/water_spot_remover` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 7 | `tools/search-products.ts:76` | `cam su lekesi` | `contaminant_solvers/water_spot_remover` | `contaminant_solvers/water_spot_remover` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 8 | `tools/search-products.ts:77` | `pH nötr şampuan` | `car_shampoo/ph_neutral_shampoo` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 9 | `tools/search-products.ts:78` | `Foam` | `car_shampoo/prewash_foaming_shampoo` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 10 | `tools/search-products.ts:78` | `ön yıkama köpüğü` | `car_shampoo/prewash_foaming_shampoo` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 11 | `tools/search-products.ts:79` | `Ağır çizik` | `abrasive_polish/heavy_cut_compound` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 12 | `tools/search-products.ts:79` | `kalın pasta` | `abrasive_polish/heavy_cut_compound` | `abrasive_polish/heavy_cut_compound` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 13 | `tools/search-products.ts:80` | `İnce hare` | `abrasive_polish/polish` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 14 | `tools/search-products.ts:80` | `finishing` | `abrasive_polish/polish` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 15 | `tools/search-products.ts:80` | `hassas boya` | `abrasive_polish/polish` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 16 | `tools/search-products.ts:81` | `Wetcoat` | `paint_protection_quick` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 17 | `tools/search-products.ts:81` | `quick detailer` | `paint_protection_quick` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 18 | `tools/search-products.ts:81` | `hızlı cila` | `paint_protection_quick` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 19 | `tools/search-products.ts:82` | `Kurulama havlusu` | `wash_tools` | `wash_tools/drying_towel` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 20 | `tools/search-products.ts:82` | `yıkama eldiveni` | `wash_tools` | `wash_tools/wash_mitt` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 21 | `tools/search-products.ts:82` | `köpük tabancası` | `wash_tools` | `wash_tools/foam_tool` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 22 | `tools/search-products.ts:82` | `sünger` | `wash_tools` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 23 | `tools/search-products.ts:83` | `Mikrofiber bez (genel temizlik` | `microfiber` | `microfiber/cleaning_cloth` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 24 | `tools/search-products.ts:83` | `cila silme)` | `microfiber` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 25 | `tools/search-products.ts:84` | `Polisaj makinesi` | `polisher_machine` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 26 | `tools/search-products.ts:85` | `Polisaj tabanlığı` | `polisher_machine` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 27 | `tools/search-products.ts:85` | `yedek akü` | `polisher_machine` | `polisher_machine/battery` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 28 | `tools/search-products.ts:85` | `şarj cihazı` | `polisher_machine` | `polisher_machine/charger` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 29 | `tools/search-products.ts:86` | `Sprayer yedek başlık` | `sprayers_bottles` | `sprayers_bottles/trigger_head` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 30 | `tools/search-products.ts:86` | `nozzle` | `sprayers_bottles` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 31 | `tools/search-products.ts:86` | `hortum` | `sprayers_bottles` | `sprayers_bottles/hose` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 32 | `tools/search-products.ts:87` | `Lastik parlatıcı` | `tire_care` | `tire_care/tire_dressing` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 33 | `tools/search-products.ts:88` | `Saf deri temizleyici (LeatherCleaner Strong` | `interior_cleaner/leather_cleaner` | `interior_cleaner/leather_cleaner` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 34 | `tools/search-products.ts:88` | `Natural)` | `interior_cleaner/leather_cleaner` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 35 | `tools/search-products.ts:89` | `Deri+kumaş kombine temizleyici` | `interior_cleaner/fabric_leather_cleaner` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 36 | `tools/search-products.ts:90` | `Deri koruyucu` | `interior_cleaner/leather_dressing` | `interior_cleaner/leather_dressing` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 37 | `tools/search-products.ts:90` | `deri bakım` | `interior_cleaner/leather_dressing` | `interior_cleaner/leather_dressing` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 38 | `tools/search-products.ts:90` | `leather conditioner` | `interior_cleaner/leather_dressing` | `interior_cleaner/leather_dressing` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 39 | `tools/search-products.ts:91` | `Deri set` | `interior_cleaner/leather_care_kit` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 40 | `tools/search-products.ts:91` | `leather kit` | `interior_cleaner/leather_care_kit` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 41 | `tools/search-products.ts:125` | `Superlux 5 litre` | `hacim` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 42 | `tools/search-products.ts:190` | `pH nötr şampuan` | `templateSubType` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 43 | `tools/search-products.ts:208` | `alüminyum` | `templateSubType` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 44 | `tools/search-products.ts:208` | `krom` | `templateSubType` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 45 | `tools/search-products.ts:208` | `paslanmaz katı pasta` | `templateSubType` | `industrial_products/solid_compound` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 46 | `tools/search-products.ts:209` | `heavy cut katı pasta` | `templateSubType` | `abrasive_polish/heavy_cut_compound` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 47 | `tools/search-products.ts:210` | `polisaj makinesi (aksesuar değil)` | `templateGroup` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 48 | `tools/search-products.ts:211` | `polisaj tabanlığı` | `templateGroup` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 49 | `conversations/index.ts:381` | `kaç km` | `durability_km` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 50 | `conversations/index.ts:381` | `yıl` | `durability_km` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 51 | `conversations/index.ts:381` | `ay` | `durability_km` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 52 | `conversations/index.ts:382` | `pH değeri` | `ph_level` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 53 | `conversations/index.ts:382` | `pH kaç` | `ph_level` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 54 | `conversations/index.ts:383` | `uyumlu pH aralığı` | `ph_tolerance` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 55 | `conversations/index.ts:383` | `kaplama pH dayanımı` | `ph_tolerance` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 56 | `conversations/index.ts:384` | `ne kadar tüketir` | `consumption_per_car_ml` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 57 | `conversations/index.ts:384` | `araç başına` | `consumption_per_car_ml` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 58 | `conversations/index.ts:385` | `9H` | `technicalSpecs` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 59 | `conversations/index.ts:385` | `hardness` | `technicalSpecs` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 60 | `conversations/index.ts:437` | `deri koruyucu` | `interior_cleaner` | `interior_cleaner/leather_dressing` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 61 | `conversations/index.ts:437` | `deri bakım` | `interior_cleaner` | `interior_cleaner/leather_dressing` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 62 | `conversations/index.ts:438` | `deri temizleyici` | `interior_cleaner` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 63 | `conversations/index.ts:439` | `su lekesi` | `contaminant_solvers` | `contaminant_solvers/water_spot_remover` | ✅ | ✅ | ✅ | **REMOVE** (slot extractor zaten kapsıyor) |
| 64 | `conversations/index.ts:439` | `kireç temizleme` | `contaminant_solvers` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 65 | `conversations/index.ts:440` | `kumaş koltuk koruyucu` | `ceramic_coating` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 66 | `conversations/index.ts:441` | `jant temizleyici` | `contaminant_solvers` | `∅` | ❌ | ✅ | ✅ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 67 | `conversations/index.ts:539` | `Gommanera Blue 5 kg` | `YASAK` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 68 | `conversations/index.ts:726` | `mikrofiber bez öner` | `ama` | `microfiber/cleaning_cloth` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 69 | `conversations/index.ts:727` | `abrasive polish` | `derinlik` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 70 | `conversations/index.ts:728` | `polisaj pedi öner` | `tip` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 71 | `conversations/index.ts:729` | `leather care` | `sor` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 72 | `conversations/index.ts:730` | `kil bar` | `sor` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 73 | `conversations/index.ts:731` | `cam temizleyici` | `sor` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 74 | `conversations/index.ts:732` | `lastik bakım` | `sor` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 75 | `conversations/index.ts:733` | `tornador` | `sor` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 76 | `conversations/index.ts:734` | `maskeleme bant` | `sor` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 77 | `conversations/index.ts:735` | `aplikatör` | `sor` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |
| 78 | `conversations/index.ts:744` | `GYEON Bathe 4000 ml` | `exactMatch` | `∅` | ❌ | ❌ | ⚠️ | **KEEP** (slot extractor kapsamıyor — promptta tut) |

## Coverage Gap'leri (REMOVE edilemez — promptta kalır)

- `Seramik kaplama` → beklenen `ceramic_coating`, slot çıkardı: `{}`
- `cam için seramik` → beklenen `ceramic_coating/glass_coating`, slot çıkardı: `{}`
- `decon şampuan` → beklenen `car_shampoo/decon_shampoo`, slot çıkardı: `{}`
- `kil bar` → beklenen `contaminant_solvers`, slot çıkardı: `{}`
- `pH nötr şampuan` → beklenen `car_shampoo/ph_neutral_shampoo`, slot çıkardı: `{}`
- `Foam` → beklenen `car_shampoo/prewash_foaming_shampoo`, slot çıkardı: `{}`
- `ön yıkama köpüğü` → beklenen `car_shampoo/prewash_foaming_shampoo`, slot çıkardı: `{}`
- `Ağır çizik` → beklenen `abrasive_polish/heavy_cut_compound`, slot çıkardı: `{}`
- `İnce hare` → beklenen `abrasive_polish/polish`, slot çıkardı: `{}`
- `finishing` → beklenen `abrasive_polish/polish`, slot çıkardı: `{}`
- `hassas boya` → beklenen `abrasive_polish/polish`, slot çıkardı: `{}`
- `Wetcoat` → beklenen `paint_protection_quick`, slot çıkardı: `{}`
- `quick detailer` → beklenen `paint_protection_quick`, slot çıkardı: `{}`
- `hızlı cila` → beklenen `paint_protection_quick`, slot çıkardı: `{}`
- `sünger` → beklenen `wash_tools`, slot çıkardı: `{}`
- `cila silme)` → beklenen `microfiber`, slot çıkardı: `{}`
- `Polisaj makinesi` → beklenen `polisher_machine`, slot çıkardı: `{}`
- `Polisaj tabanlığı` → beklenen `polisher_machine`, slot çıkardı: `{}`
- `nozzle` → beklenen `sprayers_bottles`, slot çıkardı: `{}`
- `Natural)` → beklenen `interior_cleaner/leather_cleaner`, slot çıkardı: `{}`
- `Deri+kumaş kombine temizleyici` → beklenen `interior_cleaner/fabric_leather_cleaner`, slot çıkardı: `{}`
- `Deri set` → beklenen `interior_cleaner/leather_care_kit`, slot çıkardı: `{}`
- `leather kit` → beklenen `interior_cleaner/leather_care_kit`, slot çıkardı: `{}`
- `Superlux 5 litre` → beklenen `hacim`, slot çıkardı: `{}`
- `pH nötr şampuan` → beklenen `templateSubType`, slot çıkardı: `{}`
- `alüminyum` → beklenen `templateSubType`, slot çıkardı: `{}`
- `krom` → beklenen `templateSubType`, slot çıkardı: `{}`
- `paslanmaz katı pasta` → beklenen `templateSubType`, slot çıkardı: `{"templateGroup":"industrial_products","templateSubType":"solid_compound"}`
- `heavy cut katı pasta` → beklenen `templateSubType`, slot çıkardı: `{"templateGroup":"abrasive_polish","templateSubType":"heavy_cut_compound"}`
- `polisaj makinesi (aksesuar değil)` → beklenen `templateGroup`, slot çıkardı: `{}`
- `polisaj tabanlığı` → beklenen `templateGroup`, slot çıkardı: `{}`
- `kaç km` → beklenen `durability_km`, slot çıkardı: `{}`
- `yıl` → beklenen `durability_km`, slot çıkardı: `{}`
- `ay` → beklenen `durability_km`, slot çıkardı: `{}`
- `pH değeri` → beklenen `ph_level`, slot çıkardı: `{}`
- `pH kaç` → beklenen `ph_level`, slot çıkardı: `{}`
- `uyumlu pH aralığı` → beklenen `ph_tolerance`, slot çıkardı: `{}`
- `kaplama pH dayanımı` → beklenen `ph_tolerance`, slot çıkardı: `{}`
- `ne kadar tüketir` → beklenen `consumption_per_car_ml`, slot çıkardı: `{}`
- `araç başına` → beklenen `consumption_per_car_ml`, slot çıkardı: `{}`
- `9H` → beklenen `technicalSpecs`, slot çıkardı: `{}`
- `hardness` → beklenen `technicalSpecs`, slot çıkardı: `{}`
- `deri temizleyici` → beklenen `interior_cleaner`, slot çıkardı: `{}`
- `kireç temizleme` → beklenen `contaminant_solvers`, slot çıkardı: `{}`
- `kumaş koltuk koruyucu` → beklenen `ceramic_coating`, slot çıkardı: `{}`
- `jant temizleyici` → beklenen `contaminant_solvers`, slot çıkardı: `{}`
- `Gommanera Blue 5 kg` → beklenen `YASAK`, slot çıkardı: `{}`
- `mikrofiber bez öner` → beklenen `ama`, slot çıkardı: `{"templateGroup":"microfiber","templateSubType":"cleaning_cloth"}`
- `abrasive polish` → beklenen `derinlik`, slot çıkardı: `{}`
- `polisaj pedi öner` → beklenen `tip`, slot çıkardı: `{}`
- `leather care` → beklenen `sor`, slot çıkardı: `{}`
- `kil bar` → beklenen `sor`, slot çıkardı: `{}`
- `cam temizleyici` → beklenen `sor`, slot çıkardı: `{}`
- `lastik bakım` → beklenen `sor`, slot çıkardı: `{}`
- `tornador` → beklenen `sor`, slot çıkardı: `{}`
- `maskeleme bant` → beklenen `sor`, slot çıkardı: `{}`
- `aplikatör` → beklenen `sor`, slot çıkardı: `{}`
- `GYEON Bathe 4000 ml` → beklenen `exactMatch`, slot çıkardı: `{}`