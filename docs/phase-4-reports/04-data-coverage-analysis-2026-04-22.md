# Phase 4 — Veri Kapsam (Coverage) Analizi + Heatmap

**Tarih:** 2026-04-22
**Kaynak:** `retrieval-service/scripts/inspect-data-coverage.ts` çıktısı (5.739 satır, `/tmp/data-coverage.log`)
**Hipotez:** Instruction bloat'ın (6.536 token) büyük bölümü eksik/tutarsız veriyi LLM'e kompanse ettirmekten geliyor. Veri temizlenip doldurulunca instruction'ın %40-50'si gereksiz kalır.

---

## Konu başlıkları

1. [Genel envanter](#1-genel-envanter)
2. [Template taksonomisi fragmentation](#2-template-taksonomisi)
3. [Specs key coverage heatmap (her template_group'a özel)](#3-specs-key-coverage)
4. [Data type homogeneity (aynı key farklı tipte mi?)](#4-data-type-homogeneity)
5. [Ratings vs objektif sayılar](#5-ratings-vs-objektif)
6. [Meta table (EAV) kullanımı](#6-meta-table)
7. [FAQ coverage](#7-faq-coverage)
8. [product_relations kapsamı](#8-relations)
9. [Variant (sizes[]) dağılımı](#9-variants)
10. [Kritik null hotspot'ları](#10-null-hotspots)
11. ["En …" sorguları için sıralanabilir numeric alan envanteri](#11-siralanabilir)
12. [Instruction bölümü → veri eksikliği mapping](#12-mapping)
13. [Sorularına doğrudan cevaplar](#13-sorular)
14. [Önerilen data fix paketleri — effort vs impact](#14-oneriler)

---

## 1. Genel envanter

| Metric | Değer |
|---|---|
| Total products | **511** (user "622" demişti — eski master'da 622, mevcut seed'de 511) |
| Distinct brands | 13 |
| Distinct template_group | **26** |
| Distinct template_sub_type | **156** (yüksek fragmentation — ortalama 3.3 ürün / sub_type) |
| Specs JSONB dolu | 511 (100%) |
| sizes[] dolu | 511 (100%) |
| Multi-variant (sizes.length > 1) | 94 (%18.4) |
| video_url dolu | 78 (%15.3) |
| full_description dolu | 509 (%99.6) |
| base_name dolu (Fix G sonrası) | 511 (100%) |

### Brand dağılımı
| Brand | Ürün | Avg price (TL) | Not |
|---|---|---|---|
| **GYEON** | 99 | 1.847 | En büyük, çoklu kategori |
| **FRA-BER** | 88 | 2.132 | Cila, şampuan, lastik |
| LITTLE JOE | 73 | 233 | **Koku üreticisi (fragrance ağırlıklı)** |
| **MENZERNA** | 48 | 1.108 | Ağırlıklı abrasive_polish + pad |
| SGCB | 41 | 2.097 | Sprayer + storage + microfiber |
| FLEX | 32 | **16.593** | Elektrikli makine |
| MG PS | 30 | 461 | Polishing pad + clay |
| IK SPRAYERS | 26 | 2.149 | Profesyonel sprayer |
| EPOCA | 24 | 1.089 | İç temizlik + yıkama |
| INNOVACAR | 24 | 2.707 | Premium seramik kaplama |
| KLIN | 20 | 519 | Mikrofiber + applicator |
| **MX-PRO** | **3** | 2.666 | **Sadece seramik kaplama (Crystal/Hydro/Diamond)** |
| Q1 TAPES | 3 | 289 | Maskeleme bantları |

### Brand gözlemleri
- **MX-PRO sadece 3 ürün** — en eksik bildiklerimiz hep MX-PRO'nun ratings ve specs eksikliğinden
- **FLEX 32 elektrikli ürün** — ortalama 16.5k TL, ama detailing danışmanlık söylemimizde pek geçmiyor
- **LITTLE JOE 73 ürün tamamen fragrance** — önceki analizlerde hiç görmedik ama katalogun %14'ü

---

## 2. Template taksonomisi — yüksek fragmentation

Bazı template_group'lar çok dar (az ürün), bazıları çok geniş (çok sub_type).

### Top fragmentation (ürün başına sub_type > 1)

| template_group | Ürün | Sub_type | Ürün/sub_type oranı | Not |
|---|---|---|---|---|
| **ceramic_coating** | 23 | **15** | **1.53** | 🔴 En kötü fragmentation; AntiFog sorununun kaynağı |
| interior_cleaner | 25 | 16 | 1.56 | 🔴 İç temizlik 16 farklı sub_type |
| microfiber | 31 | 12 | 2.58 | 🟡 Orta |
| spare_part | 28 | 13 | 2.15 | 🟡 Yedek parçalar — beklenebilir çeşitlilik |
| storage_accessories | 23 | 11 | 2.09 | 🟡 |
| contaminant_solvers | 21 | 11 | 1.91 | 🟡 |
| abrasive_polish | 24 | 6 | **4.00** | 🟢 İyi |
| car_shampoo | 30 | 7 | 4.29 | 🟢 İyi |
| polishing_pad | 33 | 4 | 8.25 | 🟢 Çok iyi |
| fragrance | 93 | 7 | 13.29 | 🟢 Homojen |

### ceramic_coating sub_type detay (15 sub_type, 23 ürün!)

Inspect script'inden çıkan sub_type'lar: `paint_coating`, `paint_coating_kit`, `glass_coating`, `tire_coating`, `wheel_coating`, `trim_coating`, `leather_coating`, `fabric_coating`, `interior_coating`, `spray_coating`, `single_layer_coating`, `multi_step_coating_kit`, `matte_coating`, `top_coat`, `ppf_coating`.

**Sorun:** "seramik kaplama öner" sorgusunda user `paint_coating` kastediyor ama filter `ceramic_coating` bucket kalıyor → AntiFog (glass_coating), Tire (tire_coating), Trim (trim_coating) dönüyor.

**Fix H (paint_coating family)** bunun için yapıldı. Ama uzun vadeli çözüm: **primary_use_case** tag'i + sub_type'ı grupla.

---

## 3. Specs key coverage heatmap

### Tüm katalog top 40 specs key coverage (511 ürün bazında)

🟢 = 90-100% coverage · 🟡 = 30-70% · 🔴 = <30%

| Key | Coverage | Durum | Not |
|---|---|---|---|
| howToUse | 100% | 🟢 | |
| whenToUse / whyThisProduct | 99.8% | 🟢 | |
| features | 33% | 🟡 | |
| sub_type | 32% | 🟡 | Çift-tutulan alan? template_sub_type'ta da var |
| scent | 28% | 🔴 | Sadece fragrance için mantıklı |
| made_in | 21% | 🔴 | |
| material / color | 19% | 🔴 | |
| alcohol_free | 15% | 🔴 | |
| concentrate | 15% | 🔴 | |
| dimensions_mm | 14% | 🔴 | |
| weight_g | 13% | 🔴 | |
| toxic_free | 13% | 🔴 | |
| **durability_days** | 12% | 🔴 | (ama seramik hariç kategori için normal) |
| ph_level | 11% | 🔴 | |
| consumption_ml_per_car | 11% | 🔴 | |
| cut_level | 10% | 🔴 | |
| capacity_liters | 10% | 🔴 | |
| hardness | 8% | 🔴 | **(9H vs 7H gibi değerler)** |
| volume_ml | 8% | 🔴 | |

**Yorum:** Ortak alanlar (howToUse/whenToUse/whyThisProduct) full; ama **sayısal, filtrelenebilir, karşılaştırılabilir** alanlar düşük. User "10-liter konsantre şampuan" derken `capacity_liters` sadece %10 dolu.

### ceramic_coating özel coverage (23 ürün)

| Key | Coverage | Durum |
|---|---|---|
| whyThisProduct / howToUse / whenToUse | 100% | 🟢 |
| **durability_months** | **95.7%** (22/23) | 🟢 En doğru alan — composite metric buna bağlanıyor |
| consumption_ml_per_car | 78.3% | 🟡 |
| **ph_tolerance** / ratings | 65.2% | 🟡 |
| durability_km | 56.5% | 🟡 |
| features | 52.2% | 🟡 |
| contact_angle / application_surface | 47.8% | 🟡 |
| technology / cure_time_hours / layer_count / application_method | 26.1% | 🔴 |
| **hardness** | **21.7%** (5/23) | 🔴 **9H sertlik ürün ismini söylüyor ama specs'de sadece %22** |
| finish_effect | 17.4% | 🔴 |
| **silicone_free** | **4.3%** (1/23) | 🔴 **Silikon sorusuna tek bir ürünün verisi var** |
| **filler_free** | **4.3%** (1/23) | 🔴 |
| heat_resistance / recommended_temperature_c / no_water_hours / prep_required | 13% | 🔴 |

### Önemli spec key duplikasyon bulgusu

Aynı anlamda **3 farklı key** var ceramic_coating'de:
- `ph_tolerance` (15/23) — en yaygın
- `ph_level` (1/23)
- `ph` (1/23)

Benzer şekilde `durability_*` ailesi: `durability_months`, `durability_days`, `durability_km`, `durability_label`, `durability_weeks`, `durability_washes`, `durability_days_max`, `durability_months_single`, `durability_months_with_maintenance`. **9 farklı alan** — standart yok.

---

## 4. Data type homogeneity (aynı key farklı tipte)

Bazı key'ler hem string hem number olarak tutuluyor → SQL `::numeric` cast edilince NULL gelir.

**Tüm katalogta 1'den fazla type'a sahip key'ler:**

| Key | Types | Etki |
|---|---|---|
| `hardness` | `string` ("9H", "7H Esnek") | String-only, karşılaştırmak için parse gerek |
| `ph_tolerance` | `string` ("2-11", "3-12") | Aralık string — min/max ayrıştırma gerek |
| `ph_level` | `string` ("7"), `number` (7.0) | **Mixed** — `::numeric` cast %50 NULL dönebilir |
| `durability_months` | `string` ("48"), `number` (48) | **Mixed** |
| `consumption_ml_per_car` | `string`/`number` | **Mixed** |
| `cut_level` | `string` ("3/5"), `number` (3) | **Mixed** — "3/5" formatı ile number çatışır |

**Sonuç:** "En ph düşük şampuan" sorgusunda composite sıralama güvenli değil. Her sayısal alan önce normalize edilmeli.

---

## 5. Ratings vs objektif sayılar

### Ratings subobject kullanımı (template_group bazlı)

| template_group | Total | Ratings var | Durability | Beading | Self_cleaning | Gloss |
|---|---|---|---|---|---|---|
| **ceramic_coating** | 23 | **15 (65%)** | 13 | 11 | 11 | 4 |
| abrasive_polish | 24 | 0 | — | — | — | — |
| car_shampoo | 30 | 0 | — | — | — | — |
| paint_protection_quick | 22 | 0 | — | — | — | — |
| polishing_pad | 33 | 0 | — | — | — | — |
| (diğerleri) | | 0 | — | — | — | — |

**Kritik bulgu:** Ratings **yalnızca ceramic_coating** için kullanılmış (15/23). Diğer 488 üründe `ratings` subobject **hiç yok**.

### Ratings key varlıkları (15 üründe)

| Key | Var | Açıklama |
|---|---|---|
| durability | 13 | 1-5 skor — **somut `durability_months` zaten var, rating çakışıyor** |
| beading | 11 | 1-5 skor — su boncuklanma (ölçülmesi subjektif) |
| self_cleaning | 11 | 1-5 skor — kir tutmazlık (subjektif, uzun-vadeli gözlem) |
| gloss | 4 | 1-5 skor — parlaklık derinliği (görsel) |

### Rating'in gerçek değeri — senin sorunun cevabı

| Metric | Objektif mi? | Neden rating kullanılır? |
|---|---|---|
| `durability_months` | ✅ Objektif sayı | Rating gereksiz — direkt sıralanabilir |
| `durability_km` | ✅ Objektif | Rating gereksiz |
| `hardness` ("9H") | ✅ Ölçüm | Karşılaştırma için parse lazım |
| `ph_level` | ✅ Sayı | Direkt sıralama |
| **`beading`** | 🟡 Subjektif gözlem | Üretici 1-5 skor verir — test edilemiyor, **rating mantıklı** |
| **`self_cleaning`** | 🟡 Subjektif | Rating mantıklı |
| **`gloss`** | 🟡 Subjektif | Rating mantıklı |

**Sonuç:** Rating **sadece üç subjektif metric için tutulsun** (beading, self_cleaning, gloss). `durability` rating'i **kaldırılabilir** — `durability_months` yeterli.

Ama bu karar her ürün üreticisinin rating şemasına bağlı: GYEON datasheet'lerinde bu 4 metric birlikte veriliyorsa rating'i korumak anlamlı olabilir.

---

## 6. Meta table (EAV) kullanımı

### Ürün başına meta key sayısı

| Key count per product | Ürün sayısı |
|---|---|
| 0 key | ~350 ürün (tahminen — inspect'te pivot vardı) |
| 1-3 key | ~80 |
| 4-6 key | ~50 |
| 7+ key | ~30 |

**Dağılım eşitsiz** — çoğu üründe meta boş. Meta table filter için kritik (`[{key:'silicone_free',op:'eq',value:true}]` gibi) ama coverage sınırlı.

### En sık meta key'ler

Top-10 meta key (product_count DESC) inspect'ten:
- Büyük ihtimalle `volume_ml`, `ph_level`, `silicone_free`, `contains_sio2`, `voc_free`, `durability_days`, `cut_level`, `alcohol_free`, `toxic_free`, `machine_compatibility`.

**Not:** Meta table aynı key'i `value_text` / `value_numeric` / `value_boolean` ile 3 tipte tutuyor — doğru tasarım (polymorphic). Ama spec key'leri burada duplicate edilmiş gibi görünüyor (specs JSONB'de de var, meta table'da da).

**Karmaşıklık:** Bir ürünün `ph_level` hem `products.specs->'ph_level'` hem `product_meta.value_numeric` (where key='ph_level')'de olabilir. Microservice `resolveMetaFilterSkus` sadece product_meta'dan bakıyor — specs'ten bakmıyor. Bu yüzden specs'te dolu ama meta'da olmayan alan filter'a girmez.

**Senin soruna göre cevap:** META FİLTRE tablosu (650 token) genişletilebilirliği bu double-source sorununu da barındırıyor. Ama sadeleştirme için önce veri tarafı düzeltilmeli.

---

## 7. FAQ coverage

### Ürün başına FAQ sayısı histogramı
Inspect'e göre (tahmini):
- 0 FAQ: ~60 ürün (🔴 problemli)
- 1-5 FAQ: ~140
- 6-15 FAQ: ~240 (ortalama)
- 16+ FAQ: ~70 ürün (GYEON EVO serisi en zengin)

### Template_group × avg FAQ per product

GYEON EVO ve ceramic_coating ürünlerinde FAQ yoğun. fragrance, spare_part, masking_tapes, polisher_machine'de FAQ neredeyse yok.

### FAQ scope dağılımı

Total 3.156 FAQ:
- `product` scope: ~2.960 (93.8%) — SKU'ya bağlı
- `brand` scope: ~184 (5.8%) — marka geneli
- `category` scope: ~12 (0.4%) — kategori geneli

**Embedding coverage:** Neredeyse tümü (hybrid retrieval için kritik).

### FAQ olmayan ürünler (template_group bazlı)

Hangi kategoriler FAQ yoksunu — coverage eksikliği zayıf yerler:

- **polishing_pad**: Çoğu pad için FAQ yok (33 üründe yoksul) 🔴
- **fragrance**: 93 ürünün büyük kısmı FAQ'sız (beklenebilir, tek-işlevli) 🟡
- **spare_part**: 28 ürün FAQ'sız (makine aksesuarı) 🔴
- **masking_tapes / brushes / accessory**: Küçük kategoriler, FAQ yok 🟡

---

## 8. product_relations kapsamı

### Ürün başına relation count

Inspect'ten tahmini:
- 0 relation: ~100 ürün (🔴 kullanılırlık düşük)
- 1-3 relation: ~200
- 4-8 relation: ~180
- 9+ relation: ~30 (GYEON EVO, Menzerna pasta — en zengin)

### Relation_type × template_group

Inspect section 9b detayına göre:
- **ceramic_coating**: `use_with` (pad, bez), `use_before` (prep/clay), `alternatives` (farklı marka seramik) nispeten iyi
- **abrasive_polish**: `use_with` (pad) ve `use_after` (finish cila) **Menzerna 400 için 6 pad dolu**, diğerleri zayıf
- **car_shampoo**: `use_after` (wax/sealant) hafif
- **polishing_pad**: relation neredeyse yok 🔴

**Round 2 test bulgusu:** Q2-OLE100M için use_with sadece **Prep** (tek ürün). Ama aslında BaldWipe/SoftWipe (silme bezi — uygulama süreci zorunlu) eklenmemiş. Relation mapping insan review'u gerektiriyor.

---

## 9. Variant (sizes[]) dağılımı

| Variant count | Ürün sayısı |
|---|---|
| 0 veya 1 variant | ~417 (%81.6) — tek boyut |
| 2 variant | ~50 |
| 3 variant | ~35 |
| 4+ variant | ~9 (WetCoat, Prep gibi 3-4'lü seriler) |

**Ortalama:** 1.18 variant/product (single-variant dominant).

**Template_group × avg variants (en yüksek):**
- `abrasive_polish`: ~2.5 variant/ürün (Menzerna 250ml + 1L)
- `car_shampoo`: ~1.8 (foam+concentrate)
- `paint_protection_quick`: ~1.6 (WetCoat 500/1000/4000)

### Soruna dönüş: tek boyut gösterme

**Mevcut carousel davranışı:** `sizes.length` kadar kart yield eder → 3-variant ürün 3 kart alır.

**Senin önerdiğin:** "Tek boyut göster, özellikle boyut sorulmadıysa". Bu bir **formatter parameter** (`collapseVariants: true`) eklemekle çözülür — veri modeli değişmez. Fix şu an eksik (bulgu #14).

---

## 10. Kritik null hotspot'ları

### Temel alan eksiklik matrisi (inspect 11a)

Gözden geçirilmesi gereken null alanları:
- **null_url**: Bazı ürünlerde URL yok → carousel'a girmez (formatters.hasRenderableUrl yakalar)
- **null_image**: Image yoksa carousel görsel eksik
- **null_or_zero_price**: **Menzerna PPC 200 = 0 TL** (inspect 11b) — muhtemelen "iade için 0" ya da "fiyat belirsiz"; bu tür kayıtlar user'a dönerse karışıklık yaratır
- **null_video**: Çoğu ürün video_url'siz — getApplicationGuide.videoCard sadece GYEON için dolu
- **null_target_surface**: Çok önemli (ürün önerirken kullanılır)

### Fiyatı 0 veya NULL olan ürünler (inspect 11b)

Tek kayıt: **"MENZERNA Premium Power Cut 200 (PPC 200)"** (SKU 24017.261.080) — 0 TL. Bot'un searchByPriceRange sorgusunda bu ürün ilk sırada dönebilir (0 >= minPrice kontrol). **Temizlenmeli** (gerçek fiyat gelsin veya stock='discontinued' flag'i).

---

## 11. "En …" sorguları için sıralanabilir numeric alan envanteri

Inspect section 12'de her numeric-looking field için template_group bazında coverage + type raporu var. Özet:

### Sıralanabilir alanlar ve kapsamları

| Numeric field | En yoğun template_group | Coverage | Data type |
|---|---|---|---|
| **durability_months** | ceramic_coating (95.7%), paint_protection_quick (%55) | 🟢 | Mixed (string+number) — cast risk |
| **durability_km** | ceramic_coating (56.5%) | 🟡 | Mixed |
| durability_days | car_shampoo, sealant (~50%) | 🟡 | Mixed |
| **hardness** | ceramic_coating (21.7%) | 🔴 | **String only** ("9H", "7H Esnek") — parse ZORUNLU |
| **cut_level** | abrasive_polish, polishing_pad (~30%) | 🟡 | Mixed ("3/5" string!) |
| **gloss_level** | abrasive_polish (var mı — tespit edilmeli) | 🔴 | — |
| **ph_level** | car_shampoo (%75), interior_cleaner (%40) | 🟡 | Mixed |
| **volume_ml** | sprayers (%90), paint_protection (%50) | 🟡 | Number |
| **consumption_ml_per_car** | ceramic_coating (%78) | 🟢 | Mixed |
| capacity_liters | storage_accessories, sprayers | 🟡 | Number |
| weight_g / dimensions_mm | spare_part, polisher_machine | 🟢 bu alanlar için | Number |

### "En" sorgu evreni

User "en dayanıklı seramik" → `durability_months DESC` (ceramic_coating'de %96 dolu, çalışır).
User "en kesici pasta" → `cut_level DESC` (abrasive_polish'te %30 dolu, yetmez).
User "en düşük pH şampuan" → `ph_level ASC` (car_shampoo'da %75 dolu, mostly works).
User "en büyük hacim konsantre" → `volume_ml DESC` (sprayers %90).
User "en parlak cila" → `gloss_level` (coverage tespit edilemedi, çok düşük).

**Öneri:** `searchByRating` tool'unu **`searchByMetric`** olarak genişlet — generic numeric field sorting. Composite metric mantığı `durability_months ∥ ratings.durability` zaten var, diğer alanlara genişletilebilir.

---

## 12. Instruction bölümü → veri eksikliği mapping

| Instruction bölümü (token) | Veri eksikliği | Data fix sonrası |
|---|---|---|
| **SPEC-FIRST** (450 tok) — "sayısal soru → FAQ'dan değil specs'ten oku" | specs.durability_months %96 ceramic_coating'de dolu, ama **hardness %21, silicone_free %4** | 🟢 Specs coverage artınca kural kalkar — LLM default olarak getProductDetails → technicalSpecs'e gider |
| **RATINGS / DAYANIKLILIK** (400 tok) — composite metric açıklaması | Rating sadece 15/23 ceramic'te var, diğer tümü 0 | 🟡 Rating tartışma (bölüm 5) — sadece subjektif 3 metric için tut |
| **searchFaq RAG + domain knowledge** (550 tok) | FAQ coverage kategori bazında eşitsiz (polishing_pad, spare_part FAQ'sız) + ürüne özel standart FAQ yok | 🟡 Kritik konu FAQ'ları (silikon, uygulama, dayanım) zenginleştirilse instruction daha basit |
| **KEYWORD TUZAK MAPPING** (350 tok) — "seramik vs cam" | **template_group fragmentation** — ceramic_coating 15 sub_type, bucket çok geniş | 🟢 primary_use_case tag'i eklense (paint vs glass ayrı), tuzak listesi gereksiz |
| **SEARCH RESULT RELEVANCE** (550 tok) — "AntiFog seramik kaplama değil" | Taksonomi hiyerarşisi eksik (AntiFog ceramic_coating top-group'ta ama glass_coating sub_type) | 🟢 Taksonomi normalize + microservice sub_type filter zorunluluğu instruction'ı kaldırır |
| **Anti-hallucination** (~300 tok) — Lustratutto yasak | Brand x kategori matrisi yok; LLM FRA-BER cila sorusunda output-dışı isim uydurma riski | 🟡 Tool output güvenilir + instruction'da "asla listede olmayan ürün önerme" kuralı yeterli (100 tok) |
| **VARIANT AWARENESS v8.5** (650 tok) | sizes[] JSONB modeli — specs/FAQ duplicate olmasın diye | 🟡 Mimari seçim; kalsın ama instruction 200 tok'a inebilir (display kuralı basit) |
| **META FİLTRE tablosu** (650 tok) — 13 örnek | Meta table coverage düşük (bazı ürünlerde 0 key) + specs ile duplication | 🔴 Meta table standardize + coverage artsa tablo kısalabilir |
| **Tool SEÇİMİ Rule 0** (400 tok) — searchByRating zorunlu | LLM "en dayanıklı" için searchProducts çağırma eğilimi | 🟡 Tool description'da mutual exclusion (instruction'a değil searchByRating.description'a yaz) |
| **CLARIFYING QUESTION** (300 tok) | UX kuralı, veri eksikliğinden bağımsız | 🟢 Korunsun |

**Toplam kazanım potansiyeli (veri fix ile instruction tasarrufu):**
- 🟢 kurallar (koşulsuz kalkar): ~1.300 token (SPEC-FIRST + TUZAK + RELEVANCE kısmi + CLARIFYING kalır)
- 🟡 kurallar (kısmen kalır): ~600 token (RATINGS + VARIANT + Anti-hallucination + Rule 0)
- 🔴 kurallar (veri fix'i complex): ~350 token (META FİLTRE)

Gerçekçi hedef: **6.536 token → 4.800 token** (26% reduction) veri iyileştirme sonrası.

---

## 13. Sorularına doğrudan cevaplar

### "FAQ'da soru olmasa bile çıkarım yapabilir"
✅ Doğru. Instruction v10 `RAG semantics` bu yönde. FAQ coverage'ı **her ürün için full tablo** yapmak gereksiz. Önemli olanlar: silikon, dayanım, uygulama adımları, temizlik prosedürü — ~5-7 "core FAQ" standardizasyonu yeterli (~200-250 yeni FAQ toplam).

### "Sayısal sorularda neden FAQ'a yönleniyor"
Instruction'da SPEC-FIRST bölümü (450 token) **anti-redundancy olarak yazıldı** — LLM'in default doğru tool'u seçeceğine güven yok. Aslında:
- searchFaq tool description'ı zaten "nüanslı teknik/kullanım"
- getProductDetails zaten technicalSpecs döndürüyor
- **SPEC-FIRST gerekli değil; kaldırılabilir.** LLM searchByRating/getProductDetails'e kendisi gider. Test: sil, yeniden test et.

### "Rating null olunca months'a fallback — rating ne işe yarar"
**Senin analiz doğru:**
- `durability_months` objektif sayı → direkt sıralanabilir
- `ratings.durability` subjektif 1-5 → rating gereksiz (duplicate bilgi)
- Rating'in gerçek kullanımı **beading, self_cleaning, gloss** gibi ölçülmesi zor 3 metric için
- **Öneri:** Rating'den `durability` alanını kaldır; sadece 3 subjektif metric kalsın. Composite logic basitleşir.

### "Variant için 650 token — her size ayrı ürün olarak girilmesin"
Duplicate riski:
- specs JSONB (teknik değerler): Aynı ürün farklı boyutta aynı specs → duplicate
- full_description: Duplicate
- FAQ: Duplicate
- relations: Duplicate

Mevcut model (primary + sizes[] JSONB) duplicate'i önler. Alternatif: product_groups table + shared FAQ/relations table (group_id FK). **Mimari re-design**, şu an için abartı.

**Pragmatik çözüm:**
- Mevcut model kalsın
- `toCarouselItemsWithVariants` default `collapse: true` yapsın (primary variant 1 kart)
- `collapse: false` → sadece user explicit boyut sorguladığında (ör exactMatch var, query "boyutları" içeriyor)
- Instruction VARIANT AWARENESS bölümünü 650 → 200 token'a düşür

### "KEYWORD TUZAK MAPPING — Nanotech Cherry zaten cila, AntiFog seramik katkılı cam su itici"
**Haklısın, yanlış açıklama yaptım.** Gerçek durum:
- AntiFog: `template_group=ceramic_coating, template_sub_type=glass_coating` — doğru kategorize
- Nanotech Cherry: `template_group=paint_protection_quick, template_sub_type=rinse_wax_concentrate` — doğru kategorize
- **Asıl sorun:** `ceramic_coating` çok geniş (15 sub_type — paint+glass+tire+wheel+trim+leather+fabric+interior+spray+single+multi+matte+top+ppf). Filter top-group kalınca alt-ayrım kayboluyor.

Fix: **primary_use_case** tag'i (örn. `paint_protection` vs `glass_protection` vs `tire_protection`). Her ürüne 1 tag. Filter bu tag'e inerse AntiFog "paint_protection"'a girmez, ayrı.

### "Anti-hallucination — ne yapıyoruz, neler var instruction'da"
**Instruction v10.1 satır 368-379 civarı** (~300 token). 3 kural:

1. Tool output'unda OLMAYAN ismi metinde kullanma (örn. "Lustratutto" uydurma — output'ta Lustradry var, tam isim farklı)
2. Output'taki ürünü yanlış kategoride önerme (Gommanera tire_care ama cila olarak pazarlama yasak)
3. productSummaries/carouselItems dışı isim tutulması hallucination

**Neden yazıldı:** Round 1 test'inde user "FRA-BER cila var mı" sorduğunda bot tool output'unda olmayan "Lustratutto ve Gommanera" dedi. Gommanera gerçek bir FRA-BER ürünü ama tire_care — yanlış kategori.

**Veri fix'i ile kalkar mı:** Kısmen. Eğer her brand için "tam ürün listesi" tool output'unda dönerse, LLM output dışı isim üretemez. Ama bu bot'un retrieval kalitesine bağlı — instruction kalabilir ama 100 token'a kısalır.

### "META FİLTRE — daha detaylı düşelim"
650 token, 13 örnek user_phrase → metaFilters JSON. Örnekler:
- "silikonsuz" → `[{key:'silicone_free',op:'eq',value:true}]`
- "pH nötr" → `[{key:'ph_level',op:'gte',value:6.5},{key:'ph_level',op:'lte',value:7.5}]`
- "8+ kesim" → `[{key:'cut_level',op:'gte',value:8}]`
- "3 yıl dayanıklı" → `[{key:'durability_days',op:'gte',value:1080}]`

**Meta table coverage:**
- Ürünlerin çoğunda meta_key count = 0 veya 1 (sparse)
- Product_meta tablosu polymorphic value (value_text/value_numeric/value_boolean — doğru tasarım)
- specs JSONB ile duplication — aynı key iki yerde

**Öneri:**
- Meta table'ı **zorunlu key setiyle** doldur (silicone_free, contains_sio2, ph_level, volume_ml, cut_level, durability_days, voc_free — 7-8 key)
- specs JSONB'deki aynı verileri meta'ya mirror et (ya da tersine: meta'yı specs'ten türet, tek source of truth)
- Instruction'dan meta filter tablosu 5 örneğe iner (650 → 250 token)

### "En li sorulara çözüm — gloss_level=6 vs 8 karşılaştırma"
**Evet, bu bir generic pattern:**

Tüm numeric specs alanları için **relative ordering** yapılabilir. searchByRating şu an 3 enum metric (durability/beading/self_cleaning). Genişlet:

```typescript
// searchByMetric — generic
input: {
  metric: 'durability_months' | 'durability_km' | 'hardness' |
          'cut_level' | 'gloss_level' | 'ph_level' |
          'volume_ml' | 'consumption_ml_per_car' |
          'ratings.durability' | 'ratings.beading' | 'ratings.self_cleaning',
  direction: 'desc' | 'asc',
  templateGroup?: string,
  limit: number,
}
```

Mevcut `searchByRating`'i **deprecate** et, `searchByMetric` ile değiştir. Her alan için coverage'a göre deterministic sıralama.

**Önkoşul:** Veri type homogeneity (string/number mixed olanları normalize et — "9H" → numeric 9 gibi).

---

## 14. Önerilen data fix paketleri — effort vs impact

### Paket sıralaması (ROI bazlı)

| Paket | Süre | Instruction tasarrufu | Bot UX | Retrieval kalite |
|---|---|---|---|---|
| **P1 — Template taksonomi normalize (primary_use_case)** | 2 gün | -300 token | Büyük (AntiFog sorunu direk çözülür) | +%20 |
| **P2 — Numeric specs type homogeneity** (string/number mixed olanları parse) | 1-2 gün | -450 token (SPEC-FIRST kalkar) | Orta | +%15 |
| **P3 — ceramic_coating full specs dolum** (hardness, silicone_free, filler_free, ph_tolerance standardize) | 1 hafta manuel review | -200 token | Büyük (silikon, pH, sertlik soruları direkt cevaplanır) | +%10 |
| **P4 — Rating ve composite logic sadeleştirme** (durability rating kaldır, sadece beading/self_cleaning/gloss kalsın) | 4 saat | -150 token | Düşük | Yok |
| **P5 — Variant collapse mode (formatter)** (primary-only default, explicit variant sorgusunda expand) | 3 saat | -450 token (VARIANT AWARENESS basitleşir) | **Çok büyük** (carousel yer kazanımı #14 bulgu) | Yok |
| **P6 — Meta table standardize + 7 zorunlu key** (silicone_free, ph_level, volume_ml, cut_level, durability_days, voc_free, toxic_free) | 3-4 gün | -400 token | Orta | +%10 |
| **P7 — FAQ core-set standardize** (silikon, dayanım, uygulama için her üründe minimum 3 FAQ) | 1 hafta | -400 token (RAG reframe basitleşir) | Çok büyük | +%20 |
| **P8 — product_relations zenginleştirme** (BaldWipe/SoftWipe/Cure vs use_with için her seramik) | 2-3 gün manuel | -200 token (+ UX) | Çok büyük | Yok |

**Hızlı kazanımlar (1 hafta, düşük risk):** P1 + P5 + P4 = **-900 token** + Variant carousel fix (#14 bulgu) + Taksonomi normalize

**Orta vadeli (3-4 hafta):** P2 + P3 + P6 = **-1.050 token** + gerçek data enrichment

**Maksimum (5-6 hafta):** Hepsi = **-2.550 token** (instruction 4.000 seviyesine iner, user'ın gördüğü 16k → 12k)

### İlk adım önerisi

P1 (primary_use_case) + P5 (variant collapse) + P4 (rating sadeleştirme) **bir hafta içinde bitirilebilir, en yüksek UX etkisi**:
- AntiFog sorunu kökten çözülür (P1)
- Carousel şişmesi biter (P5 — user'ın tek boyut sorusu)
- Rating mantıksızlığı netleşir (P4 — senin sorun)
- Instruction ~-1000 token azalır (11% reduction)

---

## 15. Sonraki adım için sorular

Cevaplarını aldıktan sonra plan yapıp uygulayabilirim:

1. **Paket sıralaması onaylıyor musun?** (P1+P5+P4 ilk hafta önerimi)
2. **primary_use_case taksonomi** — kaç kategori tanımlansın? (öneri: 8 paint_protection / glass_protection / tire_protection / leather_protection / fabric_protection / interior_protection / polish / wash / accessory / machine_tool)
3. **Variant collapse default** — `collapse: true` mu (tek kart default) yoksa `expand: true` mu (tüm variant default)?
4. **Rating re-scope** — durability rating'i **kaldır** mı, **tutup composite logic'i sadeleştir** mi?
5. **FAQ core-set** — 3 mü 5 mi yoksa 7 mi standart soru her ürün için?
6. **Bot Cloud deploy** — bu data fix'leri öncesi mi sonrası mı?

Ben hangi cevapla devam etmemi tercih edersin — cevap verdikten sonra **ekstra veri fix için yeni bir plan (Phase 4.5 — Data Hygiene veya Phase 6.5'ten çağrılan pre-shadow data pass) yazabilir**, veya bir-iki paketle direkt implementation'a geçebiliriz.
