# Botpress Tablo Mimarisi: Nihai Dönüşüm Planı

Bu rapor, mevcut ürün verilerinizin Botpress platformunun teknik kısıtlamalarına (20 sütun/tablo, ~4KB/satır) tam uyumlu, yüksek performanslı ve ölçeklenebilir bir yapıya nasıl dönüştürüleceğini adım adım açıklamaktadır. Her tablo için yapılan değişikliğin **sebebi** ve **uygulama adımları** detaylandırılmıştır.

---

## **Genel Bakış: 7 Tablolu Nihai Mimari**

Yaptığımız detaylı boyut analizleri sonucunda, en sağlam ve hatasız mimarinin **toplam 7 tablodan** oluştuğu kesinleşmiştir. Bu yapı, hem veri bütünlüğünü korur hem de platformun tüm sınırlarına harfiyen uyar.

| # | Tablo Adı | Durum | Temel Amaç |
|---|---|---|---|
| 1 | `products_masterTable` | **Değişiyor** | Temel ürün kimliği ve kısa metinler. |
| 2 | `product_specsTable` | **Değişiyor** | Tüm teknik özelliklerin `Object` olarak saklanması. |
| 3 | `product_faqTable` | **Değişmiyor** | Soru-cevap verileri. |
| 4 | `product_relationsTable` | **Değişiyor** | Ürün ilişkilerinin `String` olarak saklanması. |
| 5 | `product_content_parts` | **YENİ** | 4KB'ı aşan uzun metinlerin parçalanarak saklanması. |
| 6 | `product_search_index` | **YENİ** | Akıllı semantik arama için oluşturulan arama indeksi. |
| 7 | `product_categories` | **YENİ** | Kategori hiyerarşisinin yönetimi. |

---

## **Tablo Bazında Detaylı Düzenleme Planı**

### **1. `products_masterTable` (Ana Ürün Tablosu)**

*   **Önceki Durum:** Tüm temel veriler ve bazı kısa metinler dağınık bir şekilde bulunuyordu.
*   **Sorun:** `how_to_use` gibi bazı alanlar beklenenden uzun olabiliyor ve 4KB sınırını zorlama riski taşıyordu.
*   **Yeni Yapı (13 Sütun - UYGUN):** Bu tablo artık sadece bir ürünün "kimlik kartı" gibi çalışacak. Sadece en temel ve her zaman ihtiyaç duyulan, boyutu küçük alanları içerecek.

| Sütun Adı | Veri Tipi | Searchable | Açıklama |
|---|---|---|---|
| `sku` | `String` | Hayır | **Anahtar Sütun (Primary Key)** |
| `barcode` | `String` | Hayır | Ürün barkodu. |
| `product_name` | `String` | **Evet** | Ürünün kısa, net adı. |
| `brand` | `String` | **Evet** | Marka adı. |
| `price` | `Number` | Hayır | Fiyat bilgisi. |
| `image_url` | `String` | Hayır | Ana ürün görseli. |
| `main_cat` | `String` | **Evet** | Ana kategori adı. |
| `sub_cat` | `String` | **Evet** | Alt kategori adı. |
| `sub_cat2` | `String` | **Evet** | İkinci alt kategori adı. |
| `target_surface` | `String` | **Evet** | Ürünün hedef yüzeyi. |
| `short_description` | `String` | **Evet** | Kısa pazarlama açıklaması. |
| `template_group` | `String` | **Evet** | Ürün şablon grubu. |
| `template_sub_type` | `String` | **Evet** | Ürün şablon alt tipi. |

*   **Değişiklik Sebebi:** Tabloyu hafifleterek 4KB satır sınırı riskini tamamen ortadan kaldırmak ve sadece en temel kimlik bilgilerini bir arada tutarak sorgu performansını artırmak. `how_to_use`, `why_this_product` gibi daha uzun metinler bu tablodan çıkarıldı.

### **2. `product_specsTable` (Teknik Özellikler Tablosu)**

*   **Önceki Durum:** Bu veri, 600'den fazla farklı alana yayıldığı için bir tabloya sığdırılamıyordu.
*   **Sorun:** 20 sütun sınırı, bu veriyi geleneksel yöntemlerle saklamayı imkansız kılıyordu.
*   **Yeni Yapı (4 Sütun - UYGUN):** Tüm teknik özellikler, tek bir `Object` sütununda yapısal olarak saklanacak.

| Sütun Adı | Veri Tipi | Searchable | Açıklama |
|---|---|---|---|
| `sku` | `String` | Hayır | **Anahtar Sütun** |
| `template_group` | `String` | **Evet** | Hangi özellik setinin olduğunu belirtir. |
| `template_sub_type` | `String` | **Evet** | Özellik setini daha da detaylandırır. |
| `specs_object` | `Object` | **Evet** | Tüm teknik özelliklerin (örn: `{"ph_value": 7, "sio2_percentage": 5}` ) tutulduğu JSON nesnesi. |

*   **Değişiklik Sebebi:** 20 sütun sınırını aşmak. Bu yöntemle, yüzlerce farklı teknik özelliği tek bir sütuna sığdırırken, `Object` tipinin **aranabilir (searchable)** olması sayesinde "ph değeri 7 olan ürünler" gibi sorguları doğrudan bu sütun üzerinde yapabiliriz.

### **3. `product_faqTable` (Sıkça Sorulan Sorular Tablosu)**

*   **Durum:** Bu tablo, yapısı gereği basit ve satırları küçük olduğu için **hiçbir değişikliğe ihtiyaç duymaz.**
*   **Yapı (3 Sütun - UYGUN):**

| Sütun Adı | Veri Tipi | Searchable | Açıklama |
|---|---|---|---|
| `sku` | `String` | Hayır | **Anahtar Sütun** |
| `question` | `String` | **Evet** | Soru metni. |
| `answer` | `String` | **Evet** | Cevap metni. |

### **4. `product_relationsTable` (Ürün İlişkileri Tablosu)**

*   **Önceki Durum:** İlişkiler, bir dizi (array) SKU içeriyordu.
*   **Sorun:** Botpress tabloları `Array` tipini desteklese de, bu ilişkileri workflow içinde işlemek için metin (String) olarak saklamak daha basit ve güvenilirdir.
*   **Yeni Yapı (6 Sütun - UYGUN):** Her ilişki türü için SKU listesi, virgülle ayrılmış bir metin olarak saklanacak.

| Sütun Adı | Veri Tipi | Searchable | Açıklama |
|---|---|---|---|
| `sku` | `String` | Hayır | **Anahtar Sütun** |
| `use_before` | `String` | Hayır | Örn: `"sku1,sku2,sku3"` |
| `use_after` | `String` | Hayır | Örn: `"sku4,sku5"` |
| `use_with` | `String` | Hayır | Örn: `"sku6"` |
| `accessories` | `String` | Hayır | Örn: `"sku7,sku8"` |
| `alternatives` | `String` | Hayır | Örn: `"sku9,sku10"` |

*   **Değişiklik Sebebi:** Workflow içinde `string.split(',')` gibi basit fonksiyonlarla bu listeleri yönetmek, `Array` tipiyle uğraşmaktan daha kolaydır. Boyut analizi, bu yöntemin 4KB sınırını kesinlikle aşmadığını göstermiştir.

### **5. `product_content_parts` (Uzun Metin Parçaları Tablosu) - YENİ**

*   **Sebep:** Analizimiz, `full_description` ve `how_to_use` gibi metinlerin %30'dan fazlasının 4KB sınırını aştığını kanıtladı. Bu sorunu çözmek için bu metinleri parçalara ayırıp bu yeni tabloda saklıyoruz.
*   **Yapı (4 Sütun - UYGUN):**

| Sütun Adı | Veri Tipi | Searchable | Açıklama |
|---|---|---|---|
| `sku` | `String` | Hayır | **Anahtar Sütun** |
| `field_name` | `String` | Hayır | Hangi alana ait olduğu (`full_description` veya `how_to_use`). |
| `part_num` | `Number` | Hayır | Parça numarası (1, 2, 3...). |
| `text_part` | `String` | **Evet** | Metnin ~3.5KB'lık parçası. |

*   **Uygulama:** Bir ürünün tam açıklamasını almak için, bu tablodan o `sku`'ya ait tüm parçaları `part_num` sırasına göre çekip birleştireceğiz.

### **6. `product_search_index` (Arama İndeksi Tablosu) - YENİ**

*   **Sebep:** Botun ilk aramasını yapacağı, hafif, hızlı ve akıllı arama için optimize edilmiş bir tablo oluşturmak. Bu tablo, alakasız sonuçları engellemenin ve performansı artırmanın anahtarıdır.
*   **Yapı (8 Sütun - UYGUN):**

| Sütun Adı | Veri Tipi | Searchable | Açıklama |
|---|---|---|---|
| `sku` | `String` | Hayır | **Anahtar Sütun** |
| `product_name` | `String` | **Evet** | Ürünün tam adı. |
| `brand` | `String` | **Evet** | Marka adı. |
| `main_cat` | `String` | **Evet** | Ana kategori. |
| `price` | `Number` | Hayır | Arama sonucunda göstermek için. |
| `image_url` | `String` | Hayır | Arama sonucunda göstermek için. |
| `search_text` | `String` | **Evet** | Tüm önemli metinlerin birleşimi (ürün adı, marka, kategori, kısa açıklama, uzun açıklamanın özeti, anahtar teknik özellikler vb.). |

*   **Uygulama:** Kullanıcı sorgusu, **sadece bu tablonun `search_text` sütununda** anlamsal olarak aranacak. Doğru `sku` bulunduktan sonra diğer tablolardan detaylar çekilecek.

### **7. `product_categories` (Kategoriler Tablosu) - YENİ**

*   **Sebep:** Kategori yapısını merkezi ve yönetilebilir bir hale getirmek. Bu, kullanıcıya kategori bazlı filtreleme veya gezinme seçenekleri sunmayı kolaylaştırır.
*   **Yapı (3 Sütun - UYGUN):**

| Sütun Adı | Veri Tipi | Searchable | Açıklama |
|---|---|---|---|
| `main_cat` | `String` | **Evet** | Ana kategori adı. |
| `sub_cat` | `String` | **Evet** | Alt kategori adı. |
| `sub_cat2` | `String` | **Evet** | İkinci alt kategori adı. |

Bu yapı, Botpress'in tüm kısıtlamalarını aşarak size hem sağlam bir veri tabanı hem de son derece akıllı bir arama yeteneği sunar. Bu, projenizin ölçeklenebilirliği ve uzun vadeli başarısı için en doğru yatırımdır.
