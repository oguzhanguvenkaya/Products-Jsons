# Ürün–Varyant Modeli Değerlendirmesi

Yalnızca sizin işaret ettiğiniz iki alanı dikkate alarak inceleme yaptım: `Botpress/detailagent/` ve `output/`. Mevcut yapıda hem `products_master.csv` hem `product_search_index.csv` hem de Botpress tablo tanımları **satır = SKU = varyant** mantığıyla kurulmuş durumda. Yani aynı ürünün 250 ml, 500 ml ve 1 lt versiyonları bugün sistem tarafından ayrı ürün satırı gibi ele alınıyor. Buna karşılık `output/product_size_groups.json` dosyasında zaten ikinci bir mantık daha var: burada aynı baz ürüne ait varyantlar `group_id`, `base_name`, `variant_count` ve `sizes[]` ile gruplanmış.[1]

Bu nedenle sizin öneriniz, yani **ürün için tekil bir kimlik tanımlayıp size bilgisini varyant düzeyine indirmek**, veri modeli açısından doğru yönde bir adım. Ancak bunu mevcut sistemde “tüm tabloları artık tek ürün satırı olacak şekilde” doğrudan uygularsanız, Botpress tarafındaki bugünkü araçların önemli bir kısmını kırarsınız. Çünkü mevcut araçların çoğu SKU’ya göre çalışıyor; ürün detayları, ilişkiler, FAQ, specs, içerik ve açıklama tablolarının tamamı fiilen varyant-anahtarlı tasarlanmış.[2] [3] [4]

## Mevcut Durumun Teknik Özeti

Aşağıdaki tablo, bugün sistemin hangi düzeyde veri tuttuğunu özetliyor.

| Alan | Mevcut anahtar | Gözlem |
| --- | --- | --- |
| `products_master` | `sku` | Her satır ayrı varyant; URL ve barkod satır düzeyinde tutuluyor. |
| `product_search_index` | `sku` | Semantik arama varyant satırlarını döndürüyor. |
| `getProductDetails` | `sku` | Ürün detayını 6 farklı tablodan SKU ile join ediyor. |
| `getRelatedProducts` | `sku` | İlişkiler SKU listeleri üzerinden yürüyor. |
| `searchByPriceRange` | satır bazlı | Fiyat sıralamasında varyantları ayrı ürün gibi döndürüyor. |
| `product_size_groups.json` | `group_id` | Varyant kümeleri zaten ayrı bir dosyada türetilmiş durumda. |

Buradaki ana çıkarım şudur: **gruplama bilgisi output tarafında var, ama detailagent bunu henüz kullanmıyor**. Dolayısıyla en güvenli çözüm, mevcut SKU-temelli sistemi tamamen kaldırmak değil; onun üstüne ürün-grubu semantiği eklemektir.

## Önerinizin Doğru Olan Kısmı

Sizin tarif ettiğiniz ihtiyaç aslında iki farklı görünümü aynı anda istiyor. Birinci ihtiyaç, veri tarafında aynı baz ürünün her size’ını ayrı ürün gibi çoğaltmamak. İkinci ihtiyaç ise kullanıcıya gösterimde, özellikle carousel içinde, varyantları yine ayrı kartlar olarak gösterebilmek. Bu iki hedef birbiriyle çelişmiyor; fakat **tek katmanlı değil, iki katmanlı model** gerektiriyor.

Benim değerlendirmeme göre doğru model şu olmalı: ürünün kendisi için bir **grup kimliği** tutulmalı; size, barcode, url, fiyat ve gerekiyorsa görsel ise **varyant düzeyinde** kalmalı. Böylece sistem hem “bu üç satır aslında aynı ürün ailesi” bilgisini bilir, hem de kullanıcıya “250 ml / 500 ml / 1 lt” seçeneklerini ayrı kartlar halinde gösterebilir.

## En Güvenli Mimari Öneri

Mevcut kod tabanı için en güvenli yaklaşım, satırları tekilleştirmek yerine satırlara **grup alanları eklemek** olacaktır.

| Alan | Önerilen seviye | Amaç |
| --- | --- | --- |
| `product_group_id` veya `product_uniq` | ürün grubu | Aynı baz ürüne ait varyantları bağlamak |
| `base_product_name` | ürün grubu | Size’dan arındırılmış temel ürün adı |
| `variant_label` | varyant | `250 ml`, `1 lt`, `5 kg`, `kısa nozul` gibi kullanıcıya gösterilecek varyant etiketi |
| `variant_type` | varyant | `size`, `pack`, `length`, `color` gibi varyant türü |
| `barcode` | varyant | Varyanta özel kalmalı |
| `url` | varyant | Varyanta özel kalmalı |
| `price` | varyant | Varyanta özel kalmalı |
| `image_url` | tercihen varyant | Varyanta özel görsel varsa korunmalı |
| `is_primary_variant` | varyant | Grup temsilcisi seçmek gerektiğinde kullanılmalı |
| `variant_count` | grup veya türetilmiş | Aynı ürün ailesindeki seçenek sayısı |

Buradaki önemli nokta şudur: `sku` yine sistemde kalmalı ve teknik anahtar olmaya devam etmelidir. Çünkü mevcut join’lerin ve ilişkilerin tamamı buna dayanıyor. `product_group_id` ise ikinci bir anlam katmanı olarak eklenmelidir.

## Neden “Tüm Tabloları Tekil Ürün Satırı” Yaklaşımını Önermiyorum?

Eğer `products_master`, `product_search_index`, `product_specs`, `product_faq`, `product_content`, `product_desc_part1/2` ve ilişkileri gerçekten “tekil ürün” seviyesine indirirseniz, birkaç sorun ortaya çıkar. İlk olarak, varyanta özel URL ve barkod bilgisini ayrıca yan tabloda yönetmeniz gerekir. İkinci olarak, `getProductDetails` gibi araçlar bugün tek bir SKU ile bütün veriyi çekiyor; tekil ürün modelinde bu akış önce ürün grubunu, sonra varsayılan varyantı, sonra ilgili varyant detaylarını çözmek zorunda kalır. Üçüncü olarak, fiyat araması ve ilişkili ürün akışı artık hangi varyantı döndüreceğine ayrıca karar vermek zorunda kalır. Bu da sadece veri değişikliği değil, araç sözleşmelerinin de revizyonu anlamına gelir.

Kısacası, mevcut kod tabanında tam normalizasyon teknik olarak mümkün olsa da, **yüksek kırılma riski** taşır. Buna karşılık grup alanı ekleme yaklaşımı hem sizin ihtiyacınızı karşılar hem de mevcut akışları minimum değişiklikle korur.

## Detailagent İçin En Uygun Uygulama Stratejisi

Ben olsam bunu iki fazda uygularım.

### Faz 1 — Şemayı zenginleştir, mevcut davranışı bozma

İlk fazda `output/csv/products_master.csv` ve `output/csv/product_search_index.csv` içine şu alanlar eklenir: `product_group_id`, `base_product_name`, `variant_label`, `variant_type`, `is_primary_variant`. Aynı alanlar Botpress tablo tanımlarına da eklenir. Bu aşamada satır sayısı değişmez; yani her varyant yine ayrı satırdır, sadece artık hangi aileye bağlı olduğu bilinir.

Bu fazın avantajı şudur: `getProductDetails`, `getRelatedProducts` ve `searchByPriceRange` hemen kırılmaz. Sadece daha zengin veri taşımaya başlarlar.

### Faz 2 — Araçlar grup bilinci kazanır

İkinci fazda `searchProducts` için iki gösterim modu eklenebilir. Birinci modda, bugünkü gibi varyantlar ayrı ayrı döner; bu, sizin “carousel’de ayrı ayrı yine gözüksün” isteğiniz için gerekli. İkinci modda ise gerekirse aynı `product_group_id` altındaki sonuçlar gruplanıp önce baz ürün seviyesinde özetlenebilir, sonra varyantlar alt seçenek olarak verilebilir.

Bu fazda ayrıca şu davranışlar mümkün olur:

| Araç | Önerilen yeni davranış |
| --- | --- |
| `searchProducts` | Aynı grup içindeki varyantları tanıyabilir; ister ayrı kart döndürür, ister grup + varyant mantığıyla sunar. |
| `searchByPriceRange` | Aynı ürünün tüm size’larını üst üste dökmek yerine grup içinde sıralı sunum yapabilir. |
| `getProductDetails` | Gerekirse seçili SKU’nun yanında aynı `product_group_id` altındaki diğer varyantları da döndürebilir. |
| `getRelatedProducts` | İlişkileri SKU düzeyinde korur ama sunum sırasında grup bilgisini gösterebilir. |

## Sizin İsteğinize En Net Cevabım

Evet, **uniq ürün kimliği eklemek doğru**. Evet, **size bilgisini varyant olarak tutmak doğru**. Evet, **url ve barcode varyanta göre kalmalı**. Ve evet, **carousel’de yine ayrı ayrı gösterilebilir**. Ancak bunun doğru uygulanma şekli, mevcut tabloları tamamen “tek ürün satırı” haline çevirmek değil; mevcut varyant satırlarına bir **ürün grubu katmanı** eklemektir.

Başka bir deyişle, önerinizi şu şekilde revize ederek onaylıyorum:

> Her satır yine bir varyant olarak kalsın; fakat her varyant bir `product_group_id` ile aynı baz ürüne bağlansın. Size, URL, barkod ve fiyat varyant düzeyinde tutulsun. Arama ve gösterim tarafı ise ihtiyaç halinde bu grup bilgisini kullansın.

Bu yaklaşım hem veri tarafında “aynı ürünün size’ları farklı ürün sanılması” problemini azaltır, hem de kullanıcı deneyiminde varyantların ayrı ayrı gösterilmesini korur.

## İsterseniz Bir Sonraki Adımda Ne Yapabilirim?

Bir sonraki adımda bunu doğrudan uygulanabilir bir patch planına çevirebilirim. Bunun için yalnızca ilgili iki klasörde kalıp şu teslimatı hazırlayabilirim: hangi CSV başlıkları değişecek, hangi TypeScript tablo tanımları güncellenecek, hangi tool output’larına yeni alanlar eklenecek ve `searchProducts` içinde grup-varyant davranışı nasıl kurgulanacak.

## İncelenen Dosyalar

| Yol | Amaç |
| --- | --- |
| `output/csv/products_master.csv` | Mevcut ürün satırı yapısını doğrulamak |
| `output/csv/product_search_index.csv` | Arama indeksinin varyant bazlı olduğunu doğrulamak |
| `output/product_size_groups.json` | Var olan grup mantığını görmek |
| `Botpress/detailagent/src/tables/products-master.ts` | Ana tablo şemasını görmek |
| `Botpress/detailagent/src/tables/product-search-index.ts` | Arama tablo şemasını görmek |
| `Botpress/detailagent/src/tools/search-products.ts` | Arama sonucunun nasıl döndüğünü görmek |
| `Botpress/detailagent/src/tools/search-by-price-range.ts` | Fiyat aramasının satır bazlı olduğunu görmek |
| `Botpress/detailagent/src/tools/get-product-details.ts` | Detay akışının SKU bazlı join yaptığını görmek |
| `Botpress/detailagent/src/tools/get-related-products.ts` | İlişkilerin SKU listeleriyle kurulduğunu görmek |

## References

[1]: file://output/product_size_groups.json "output/product_size_groups.json"
[2]: file://Botpress/detailagent/src/tables/products-master.ts "Botpress/detailagent/src/tables/products-master.ts"
[3]: file://Botpress/detailagent/src/tables/product-search-index.ts "Botpress/detailagent/src/tables/product-search-index.ts"
[4]: file://Botpress/detailagent/src/tools/search-products.ts "Botpress/detailagent/src/tools/search-products.ts"
[5]: file://Botpress/detailagent/src/tools/search-by-price-range.ts "Botpress/detailagent/src/tools/search-by-price-range.ts"
[6]: file://Botpress/detailagent/src/tools/get-product-details.ts "Botpress/detailagent/src/tools/get-product-details.ts"
[7]: file://Botpress/detailagent/src/tools/get-related-products.ts "Botpress/detailagent/src/tools/get-related-products.ts"
