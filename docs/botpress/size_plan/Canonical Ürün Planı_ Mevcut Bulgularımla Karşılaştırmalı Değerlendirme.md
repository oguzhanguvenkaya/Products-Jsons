# Canonical Ürün Planı: Mevcut Bulgularımla Karşılaştırmalı Değerlendirme

Eklediğiniz planın yalnızca mevcut konuyla ilgili bölümünü ayıkladım; odak noktası, aynı ürünün farklı size'larının ayrı ürün gibi davranması sorununu **canonical_sku + group_id** yaklaşımıyla çözmek. Bu bölüm, önceki incelememde önerdiğim **"SKU kalsın, üstüne ürün-grubu katmanı eklensin"** yaklaşımıyla yüksek ölçüde örtüşüyor. Ancak sizin planınız, benim önceki önerimden daha ileri giderek bazı tabloları gerçekten canonical seviyeye indirmeyi, yani non-canonical satırları fiziksel olarak silmeyi de içeriyor.[1] [2]

## Kısa Sonuç

Ana fikir düzeyinde sizin planınızla benim bulgum **uyumlu**. Özellikle `productsMasterTable` ve `productSearchIndexTable` içinde grup kimliği ve canonical kimlik taşınması, kullanıcıya varyantların yine ayrı kartlar halinde gösterilmesi, fakat shared content'in tek kaynaktan alınması fikri teknik olarak tutarlı görünüyor.[1]

Buna karşılık benim önceki değerlendirmemde özellikle vurguladığım çekince de burada aynen geçerli: **shared-data tablolarında non-canonical row silme** kararı teorik olarak temiz görünse de, veri kaybı ve relation bozulması açısından asıl yüksek risk bu noktada birikiyor. Dolayısıyla planınızın en güçlü yanı mimari yönü; en kırılgan yanı ise veri dedup safhası.[2]

## Nerelerde Örtüşüyoruz?

Aşağıdaki tablo, sizin planınız ile benim önceki bulgularımın hangi noktalarda aynı çizgide olduğunu gösteriyor.

| Konu | Sizin planınız | Benim önceki bulgum | Değerlendirme |
| --- | --- | --- | --- |
| Aynı ürün ailesini bağlayan üst kimlik | `group_id` | `product_group_id` veya benzeri üst kimlik | Tam uyumlu |
| Varyantlar için teknik anahtar | `sku` korunuyor | `sku` korunmalı | Tam uyumlu |
| Grup temsilcisi | `canonical_sku` | Grup katmanı eklenmeli, SKU teknik anahtar kalmalı | Büyük ölçüde uyumlu |
| Kullanıcıya sunum | Carousel varyant seviyesinde kalıyor | Varyantlar ayrı kart olarak gösterilebilir | Tam uyumlu |
| URL ve barkod | Varyant düzeyinde kalıyor | URL ve barkod varyantta kalmalı | Tam uyumlu |
| Shared content kullanımı | Details/content canonical'dan gelsin | Ortak veri grup mantığıyla yönetilmeli | Uyumlu |
| Search behavior | Arama varyant seviyesinde kalıyor | Search tarafında varyant sunumu korunmalı | Tam uyumlu |

Burada en önemli ortak zemin şudur:

> Her satırı teknik olarak ürün varyantı olarak tutup, üstüne ürün ailesi bilgisi eklemek; fakat kullanıcı deneyiminde varyantları kaybetmemek.

Bu, önceki analizimde önerdiğim ana prensiple birebir örtüşüyor.[2]

## Sizin Planınızın Benim Önceki Önerimden Daha Güçlü Olduğu Noktalar

Planınız, benim ilk değerlendirmemde genel prensip düzeyinde bıraktığım bazı alanları daha operatif hale getirmiş. Özellikle üç nokta güçlü.

| Güçlü nokta | Neden önemli |
| --- | --- |
| `canonical_sku` alanını açıkça tanımlamanız | Grup düzeyi ile veri-erişim düzeyini ayırıyor |
| `size_display` ve `size_sort_value` eklemeniz | UX ve varsayılan varyant seçimi için gerekli deterministik temel sağlıyor |
| Paketleme sırası (`M.0 → M.6`) | Önce derive, sonra schema, sonra dedup, sonra tool update akışı mantıklı |

Özellikle `size_sort_value` eklenmesi, benim önceki önerimde sadece kavramsal kalan “default varyant nasıl seçilecek?” sorusuna iyi bir cevap veriyor. `getRelatedProducts` içinde en küçük boyut veya varsayılan varyant seçimi için bu alan gerçekten faydalı olur.[1]

Ayrıca `searchProducts` için yalnızca output'a `group_id` ve `size_display` ekleme yaklaşımınız da düşük riskli bir geçiş adımı. Bu, mevcut behavior'ı bozmazken sistemin variant-aware hale gelmesine yardım eder.[1]

## Benim Bulgularımla Karşılaştırınca Riskin Arttığı Noktalar

Asıl ayrışma burada başlıyor. Benim önceki değerlendirmemde ihtiyatlı davrandığım yer, sizin planda artık aktif dönüşüm adımı olarak tanımlanmış.

### 1. Shared-data tablolarında fiziksel silme

Siz `productSpecsTable`, `productContentTable`, `productDescPart1Table`, `productDescPart2Table`, `productMetaTable` ve kısmen `productFaqTable` için non-canonical row silmeyi planlıyorsunuz.[1] Bu mantık, yalnızca tüm varyant satırlarının gerçekten aynı içerik taşıdığı durumda güvenli.

Benim önceki bulgum şuydu:

> Grup katmanı eklemek güvenli; fakat canonical dışı satırları fiziksel olarak silmek, ancak farklılıkların sistematik biçimde kanıtlandığı durumda yapılmalı.

Burada özellikle `content`, `desc_part1/2` ve `faq` için risk farklı seviyede. Çünkü bu tablolar sadece “duplikat veri” değil, zaman içinde manuel zenginleştirme, Menzerna export merge veya varyant özel notlar da taşımış olabilir. Planınızdaki `hash dedup + canonical'a move` yaklaşımı bu riski azaltıyor, ama tamamen kaldırmıyor.[1]

### 2. Relations remap

Bu, benim de önceki notumda en riskli alan olarak işaret ettiğim bölümdü. Sizin yeni planınızda da zaten `YÜKSEK` risk olarak tanımlanmış olması doğru.[1]

Sorun şu: `productRelationsTable` hem kendi satır anahtarında hem de kolon içi SKU listelerinde ürün kimliğini taşıyor. Canonical remap yaptığınız anda sadece bir satır silmiyorsunuz; ilişki grafiğini yeniden yazmış oluyorsunuz.

Bu yüzden şu tespitimi koruyorum:

| Risk | Neden kritik | Benim görüşüm |
| --- | --- | --- |
| Source row dedup | İlişkinin hangi varyanttan çıktığı kaybolabilir | Yönetilebilir |
| Target SKU remap | Yanlış hedef aile veya yanlış canonical varyant seçilebilir | En kritik risk |
| Default variant fallback | Kullanıcıya yanlış boyut gösterilebilir | Orta risk |

Planınızdaki “20 örnek unit test + dry-run + sample review” maddesi burada çok yerinde. Hatta bence bu sayı özellikle Menzerna ve GYEON gibi çok varyantlı ailelerde daha da genişletilmeli.[1]

### 3. Canonical picker heuristiği

Siz canonical seçimi için “content + desc + FAQ toplam karakter sayısı en yüksek olan varyant” yaklaşımını öneriyorsunuz.[1] Bu iyi bir başlangıç heuristiği, ancak tek başına yeterli olmayabilir.

Çünkü en uzun içeriğe sahip varyant her zaman en doğru varyant anlamına gelmez. Örneğin bazı ailelerde 5 lt profesyonel varyant daha zengin açıklamaya sahip olabilir; ama kullanıcıya default göstermeyi daha mantıklı kılan varyant 250 ml veya 1 lt olabilir. Burada iki ayrı kavramın karışmaması gerekir:

| Kavram | Amaç |
| --- | --- |
| `canonical_sku` | Shared content'in teknik kaynağı |
| `default_variant_sku` | Kullanıcıya ilk gösterilecek varyant |

Bence planınızdaki en önemli eksiklerden biri bu ayrımın henüz net yazılmamış olmasıdır. Aynı SKU iki işi birden yapmak zorunda kalırsa, veri doğruluğu ile UX optimizasyonu birbirine karışır.

## Tablo Bazında Değerlendirme

Aşağıda eklediğiniz 10 varlığın, benim önceki bulgularımla birlikte tekrar değerlendirilmiş hali yer alıyor.

| Varlık | Sizin riskiniz | Benim güncel değerlendirmem | Not |
| --- | --- | --- | --- |
| `productsMasterTable` | Orta | Düşük-Orta | 4 kolon eklemek doğru; en güvenli adım bu |
| `productSearchIndexTable` | Düşük | Düşük | 2 kolon eklemek mantıklı; search_text bozulmazsa sorun az |
| `productSpecsTable` | Orta | Orta | Eğer gerçekten duplicate ise temizlenebilir |
| `productContentTable` | Orta | Orta-Yüksek | Varyant bazlı özgün metin olabilir |
| `productDescPart1/2Table` | Orta | Yüksek | Burada uzun açıklama farkları kaçabilir |
| `productFaqTable` | Orta | Orta-Yüksek | Hash dedup iyi, ama “farklı ama yararlı” cevaplar merge edilmeli |
| `productRelationsTable` | Yüksek | Çok yüksek | Planın en hassas noktası |
| `productMetaTable` | Düşük | Düşük-Orta | Meta çoğunlukla türetilmişse güvenli |
| `productCategoriesTable` | Dokunulmaz | Dokunulmaz | Katılıyorum |
| `search-by-price-range` / `search-faq` | Dokunulmaz | Dokunulmaz | Bu aşamada doğru karar |

## Tool Bazında Değerlendirme

Tool planınız da genel olarak mantıklı. Ancak burada iki kritik not ekliyorum.

| Tool | Planınız | Benim görüşüm |
| --- | --- | --- |
| `get-product-details` | canonical lookup + variants list | Doğru; en önemli tool değişikliği bu |
| `get-application-guide` | canonical lookup | Doğru; düşük risk |
| `search-products` | `group_id` + `size_display` ekle | Doğru; ilk aşamada yeterli |
| `get-related-products` | canonical relation target + default variant | Doğru ama relation remap doğrulanmadan riskli |
| `search-by-price-range` | dokunma | Doğru |
| `search-faq` | dokunma | Koşullu doğru; FAQ canonical'a taşındıktan sonra yine çalışır |

Burada benim ek önerim şudur: `get-product-details` çıktısına sadece `variants[]` değil, ayrıca `current_variant`, `default_variant` ve `variant_count` gibi alanlar eklenirse conversation layer daha temiz karar verir. Bu zorunlu değil, ama instruction karmaşasını azaltır.

## En Kritik Ayrışma: Benim Önceki “Güvenli Faz 1” Önerim ile Sizin Planınız

Benim önceki önerim daha kontrollüydü: önce schema genişletilsin, sonra tool'lar grup bilgisini taşısın, veri silme sonradan gelsin. Sizin planınız ise aynı program içinde schema genişletme ile data dedup'u birlikte düşünmüş.[2]

Bu farkı aşağıdaki gibi özetliyorum.

| Yaklaşım | Avantaj | Dezavantaj |
| --- | --- | --- |
| Benim önceki güvenli yaklaşımım | Düşük kırılma, kolay rollback | Duplicate veri geçici olarak yaşamaya devam eder |
| Sizin canonical planınız | Veri modeli daha temiz, uzun vadede daha doğru | İlk geçişte veri kaybı ve relation hatası riski yüksek |

Bu yüzden bugünkü kanaatim şu:

> Mimari hedef olarak sizin planınız daha olgun; uygulama sırası olarak ise benim önceki “önce zenginleştir, sonra sil” yaklaşımım hâlâ daha güvenli.

Yani iki planı birleştirirsek en iyi versiyon ortaya çıkar:

1. Önce `master` ve `search_index` genişlesin.
2. Tool'lar canonical farkındalığı kazansın.
3. Sonra `specs/content/desc/meta/faq` için raporlu dedup yapılsın.
4. En son `relations` remap uygulansın.

Bu birleşik yol, sizin planın hedefini korurken riskleri azaltır.

## Planınızda Şu An Eksik Gördüğüm 6 Nokta

| Eksik nokta | Neden önemli |
| --- | --- |
| `default_variant_sku` ile `canonical_sku` ayrımı | Teknik kaynak ile UX varsayılanı ayrışmalı |
| `image_url` varyant farkı raporu | Bazı varyantların görselleri farklı olabilir |
| `price` ve `url` dışında `product_name` normalize stratejisi | Base name ile varyant title üretimi netleşmeli |
| Dedup öncesi fark raporu | Silinmeden önce gerçekten farklı satırlar raporlanmalı |
| Relation remap sonrası referential integrity kontrolü | Hedef canonical SKU gerçekten master'da mevcut mu doğrulanmalı |
| Rollback için tablo başına restore komutu | Sadece backup yetmez; geri yükleme prosedürü deterministik olmalı |

Özellikle relation tarafında, remap sonrası hiçbir relation alanında “master'da bulunmayan SKU” kalmaması zorunlu bir kontrol olmalı.

## Güncel Nihai Görüşüm

Planınızdaki mevcut konuyla ilgili bölüm, benim önceki bulgularımla **yaklaşık %80-85 oranında uyumlu**. Ana mimari doğru. `group_id`, `canonical_sku`, `size_display`, `size_sort_value` seçimi yerinde. Tool etkileri doğru yerde öngörülmüş. `search-by-price-range` ve `search-faq` için dokunmama kararı da mantıklı.[1]

Ancak iki noktada temkinimi sürdürüyorum. Birincisi, canonical olmayan satırların toplu silinmesi ancak fark raporu ile yapılmalı. İkincisi, `productRelationsTable` dönüşümü ayrı bir mini proje ciddiyetinde ele alınmalı; çünkü burada hata, botun kullanıcıyı yanlış ürüne yönlendirmesi anlamına gelir.[1] [2]

Bu nedenle benim önerim, sizin planı şu şekilde revize ederek ilerletmek olur:

> `M.1` ve `M.5` öne alınsın; `M.2-M.4` ise dry-run raporları üretildikten sonra uygulanabilir hale getirilsin. Özellikle `relations` için apply öncesi zorunlu diff raporu ve referential integrity testi eklensin.

## Size En Net Kararım

Aşağıdaki tablo, şu an hangi maddeleri doğrudan desteklediğimi ve hangilerinde şartlı onay verdiğimi özetliyor.

| Madde | Kararım |
| --- | --- |
| `master` + `search_index` içine grup/canonical alanları eklemek | Destekliyorum |
| `search-products` output'una `group_id` + `size_display` eklemek | Destekliyorum |
| `get-product-details` içine `variants[]` eklemek | Güçlü biçimde destekliyorum |
| `get-application-guide` canonical lookup | Destekliyorum |
| `specs/content/desc/meta` canonical dedup | Şartlı destekliyorum |
| `FAQ` canonical dedup + move | Şartlı destekliyorum |
| `relations` remap + row dedup | Temkinli ve test şartıyla destekliyorum |
| `search-by-price-range` ve `search-faq` dokunmamak | Destekliyorum |

Bir sonraki adımda isterseniz bu planı daha da keskinleştirip, **"hemen uygulanabilir güvenli sıra"** olarak yeniden yazabilirim. Yani sizin M paketlerinizi benim risk önceliklendirmemle revize edip, hangi adımın önce, hangisinin ancak dry-run sonrası uygulanması gerektiğini net bir icra planına dönüştürebilirim.

## References

[1]: file:///home/ubuntu/upload/pasted_content_7.txt "pasted_content_7.txt"
[2]: file:///home/ubuntu/variant_model_assessment.md "variant_model_assessment.md"
