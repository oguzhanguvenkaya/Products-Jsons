# Botpress Müşteri Destek Chatbotu için Veri Entegrasyon Stratejisi Raporu

**Yazar:** Manus AI
**Tarih:** 11 Şubat 2026
**Revizyon:** 1.0

## 1. Yönetici Özeti

Bu rapor, `oguzhanguvenkaya/Products-Jsons` GitHub reposunda bulunan ürün ve kategori verilerinin, bir müşteri destek chatbotu oluşturmak amacıyla Botpress platformuna entegre edilmesi için kapsamlı bir strateji ve yol haritası sunmaktadır. Mevcut veri setinin geniş ve karmaşık yapısı (622 ürün, 600+ benzersiz teknik özellik), Botpress'in **tablo başına 20 sütunluk katı sınırı** ile doğrudan uyumsuzdur. Bu zorluğun üstesinden gelmek için, Botpress'in **Tables**, **Knowledge Base** ve **Workflows** yeteneklerini bir arada kullanan **hibrit bir veri mimarisi** önerilmektedir. Stratejimiz, veriyi normalize edilmiş çoklu tablolara ayırmayı, zengin metin içeriğini Bilgi Bankası (Knowledge Base) dokümanları olarak kullanmayı ve bu iki yapıyı akıllı iş akışları (Workflows) ile birleştirmeyi temel alır. Bu yaklaşım, hem yapılandırılmış filtreleme (kategori, marka, fiyat vb.) hem de anlamsal arama (ürün ne işe yarar, nasıl kullanılır vb.) yeteneklerini en üst düzeye çıkararak son kullanıcıya doğru ve hızlı yanıtlar sunan, ölçeklenebilir ve etkili bir chatbot altyapısı kurmayı hedeflemektedir.

## 2. Mevcut Veri Yapısının Analizi

Projenin temelini oluşturan GitHub veritabanının derinlemesine analizi, aşağıdaki temel bulguları ortaya koymuştur:

- **Ürün ve Kategori Sayısı:** Veri seti, 24 farklı JSON dosyasına dağılmış toplam **622 ürün** içermektedir.
- **Teknik Özellik (Template Fields) Çeşitliliği:** Ürünleri tanımlayan **602'den fazla benzersiz teknik özellik** bulunmaktadır. Bu özellikler, `abrasive_polish` (29 alan), `car_shampoo` (116 alan) ve `sprayers_bottles` (81 alan) gibi 25 farklı `template_group` altında toplanmıştır.
- **İçerik ve İlişki Yapısı:** Her ürün, `short_description`, `full_description` gibi 6 temel içerik alanına ve `use_before`, `use_after` gibi 5 farklı türde ürün ilişkisine sahiptir.

Bu analiz, veri setinin tek bir tabloya sığdırılmasının imkansız olduğunu net bir şekilde göstermektedir. En basit ürün grubu dahi, temel ürün bilgileri, kategori, içerik ve ilişki alanları eklendiğinde 20 sütunluk sınırı aşmaktadır. Örneğin, sadece 7 teknik özelliğe sahip `product_sets` grubu bile, diğer zorunlu alanlarla birlikte toplamda yaklaşık 27 sütun gerektirmektedir. Bu durum, veriyi Botpress'e aktarmadan önce dikkatli bir şekilde yeniden yapılandırma zorunluluğunu ortaya koymaktadır.

## 3. Botpress Platformu Yetenekleri

Önerilen stratejiyi anlamak için Botpress'in üç temel bileşenini kavramak önemlidir:

- **Tables (Tablolar):** Yapılandırılmış verileri (ürün SKU'ları, fiyatlar, stok durumu vb.) depolamak için idealdir. Ancak 20 sütun ve (ücretsiz planda) 10.000 satır gibi sınırlamalara sahiptir. Tablolara arayüzden, API'den veya iş akışları içindeki `Table Cards` (örn: `Find Records`) kullanılarak erişilebilir.
- **Knowledge Base (Bilgi Bankası):** Yapılandırılmamış veya yarı yapılandırılmış metin verilerini (ürün açıklamaları, kullanım kılavuzları, SSS) depolamak için tasarlanmıştır. Dokümanlar, web siteleri veya tablolar gibi çeşitli kaynakları destekler ve anlamsal (semantik) arama yeteneği sunar. Bu, kullanıcıların doğal dilde sorduğu 
sorulara (örn. "Bu cila silikon içerir mi?") anlamlı yanıtlar bulmasını sağlar.
- **Workflows (İş Akışları):** Chatbotun mantığını ve konuşma akışını tanımlar. İş akışları, `Autonomous Node` gibi yapay zeka tabanlı karar mekanizmaları veya `Standard Node`'lar içindeki kartlar (Cards) aracılığıyla Tablolardan veri çekebilir ve Bilgi Bankası'nda arama yapabilir. `Execute Code` kartı, birden fazla tabloyu birleştirme gibi karmaşık veri işleme görevleri için özel JavaScript kodu çalıştırma imkanı sunar.

## 4. Önerilen Veri Mimarisi ve Entegrasyon Stratejisi

Veri setinin karmaşıklığı ve Botpress platformunun yetenekleri göz önünde bulundurulduğunda, en etkili çözüm **hibrit bir mimari** kullanmaktır. Bu strateji, veriyi mantıksal olarak normalize edilmiş birden fazla tabloya bölerek yapılandırılmış sorguları mümkün kılarken, zengin metin ve teknik detayları Bilgi Bankası'na aktararak anlamsal arama gücünden faydalanır.

### 4.1. Veri Yapılandırması: Normalize Edilmiş Tablolar ve Bilgi Bankası

Veritabanı, aşağıdaki gibi mantıksal birimlere ayrılmalıdır:

| Tablo Adı | Sütun Sayısı (Yaklaşık) | Amaç ve İçerik | Aranabilir (Searchable) Alanlar | 
| :--- | :--- | :--- | :--- | 
| **products_master** | 15 | Tüm ürünler için temel, filtrelenebilir ve sık erişilen verileri içerir. Ana ürün tablosu olarak görev yapar. | `sku`, `product_name`, `brand`, `main_cat`, `sub_cat`, `sub_cat2`, `short_description`, `target_surface` | 
| **product_content** | 8 | Ürünlerin detaylı metin içeriklerini barındırır. Anlamsal arama için Bilgi Bankası'na da yüklenebilir. | `sku`, `product_name`, `full_description`, `how_to_use`, `when_to_use`, `why_this_product` | 
| **product_relations** | 8 | Ürünler arası ilişkileri (öncesinde/sonrasında kullanım, aksesuarlar vb.) depolar. Çapraz satış ve öneri için kullanılır. | `sku`, `product_name`, `use_before`, `use_after`, `use_with`, `accessories`, `alternatives` | 
| **product_faq** | 5 | Her ürüne özel Sıkça Sorulan Soruları ve yanıtlarını içerir. | `sku`, `product_name`, `question`, `answer` | 
| **product_specs** | 6 | 600+ benzersiz teknik özelliği, her ürün için tek bir JSON metni olarak depolar. Bu, sütun sınırını aşmak için kritik bir çözümdür. | `sku`, `product_name`, `template_group`, `template_sub_type`, `specs_json`, `specs_summary` | 

**Bilgi Bankası (Knowledge Base) Yapısı:**

- **Kaynak 1 (Dokümanlar):** GitHub reposundaki `chatbot_md` ve `knowledge_base_enriched_top50` klasörlerinde bulunan, önceden zenginleştirilmiş Markdown dosyaları doğrudan Bilgi Bankası'na yüklenmelidir. Bu dosyalar, ürünler hakkında anlatısal ve kapsamlı bir bilgi katmanı sunar.
- **Kaynak 2 (Tablolar):** Yukarıda tanımlanan **tüm tablolar**, Bilgi Bankası'na birer kaynak olarak eklenmelidir. Bu, Botpress'in `Knowledge Agent`'ının hem yapılandırılmış tablo verileri hem de dokümanlar üzerinde bütünsel bir arama yapmasını sağlar.

### 4.2. Workflow (İş Akışı) Tasarımı ve Değişken Yönetimi

Chatbotun beyni olan iş akışları, bu veri mimarisiyle etkileşim kurmak üzere tasarlanmalıdır.

- **Ana İş Akışı (Main Workflow):** Gelen kullanıcı mesajlarını karşılayan ve temel niyeti anlayan bir `Autonomous Node` içermelidir. Bu node, kullanıcının bir ürün aradığını, bir ürün hakkında soru sorduğunu veya genel bir destek talebi olduğunu belirlemelidir.
- **Ürün Arama Alt Akışı (Product Search Workflow):**
  1.  Kullanıcıdan arama kriterlerini (örn. "çizik giderici pasta", "seramik kaplamalar için şampuan") `Capture Information` kartı ile alın ve bir `workflow.query` değişkenine kaydedin.
  2.  `Autonomous Node` veya `Query Knowledge Bases` kartını kullanarak, hem dokümanlar hem de tablolar üzerinde bu sorguyla bir arama yapın.
  3.  Eğer kullanıcı SKU, marka gibi spesifik bir filtre belirtirse (`Find Records` kartı ile `products_master` tablosunda arama yapın), sonuçları bir `workflow.products` (Array) değişkenine atayın.
  4.  Bulunan ürünleri kullanıcıya sunun.
- **Ürün Detay Akışı (Product Detail Workflow):**
  1.  Kullanıcı bir ürün seçtiğinde, o ürünün SKU'su (`workflow.selectedSKU`) ile ilgili tüm tablolardan veri çekmek için bir `Execute Code` kartı kullanın. Bu kart, `botpress.client.findTableRows` fonksiyonunu kullanarak `product_content`, `product_relations`, `product_faq` ve `product_specs` tablolarını paralel olarak sorgulamalıdır.
  2.  Tüm bu verileri tek bir `workflow.productDetails` (Object) değişkeninde birleştirin.
  3.  Kullanıcının spesifik sorusuna (örn. "nasıl kullanılır?", "teknik özellikleri neler?") göre bu birleştirilmiş nesneden ilgili bilgiyi çekip sunun. `specs_json` alanını ayrıştırıp (parse) kullanıcıya okunaklı bir formatta göstermek için yine `Execute Code` kartı kullanılabilir.

**Değişken (Variable) Stratejisi:**

- **`user` Değişkenleri:** Kullanıcının adı, geçmiş siparişleri gibi oturumlar arası kalıcı olması gereken bilgiler için kullanılmalıdır.
- **`conversation` Değişkenleri:** Mevcut konuşma boyunca geçerli olan `conversation.history` gibi bilgiler için kullanılır.
- **`workflow` Değişkenleri:** `workflow.query`, `workflow.products`, `workflow.selectedSKU` gibi bir iş akışı içindeki geçici verileri depolamak için yoğun olarak kullanılacaktır.

## 5. Uygulama için Yol Haritası

1.  **Veri Hazırlama ve Dönüştürme (Ön İşleme):**
    -   GitHub'daki JSON dosyalarını işleyerek yukarıda tanımlanan 5 CSV dosyasına (products_master.csv, product_content.csv vb.) dönüştüren bir Python veya Node.js betiği hazırlayın.
    -   `product_specs` tablosu için, her ürünün `template.fields` nesnesini bir JSON metnine (string) dönüştürün. Ayrıca, bu JSON'dan okunabilir bir özet metin (`specs_summary`) oluşturun (örn. "Kesim: 10/10, Parlaklık: 6/10, Uyumluluk: Rotary, Orbital").
2.  **Botpress Ortamını Kurma:**
    -   Botpress'te yeni bir bot oluşturun.
    -   `Tables` bölümüne gidin ve 5 yeni tabloyu (products_master, product_content vb.) oluşturun. Sütun adlarını ve türlerini (String, Number, Boolean) tanımlayın. Hangi sütunların `searchable` olacağını dikkatlice işaretleyin.
    -   Oluşturulan CSV dosyalarını ilgili tablolara `Import CSV` özelliğini kullanarak yükleyin.
3.  **Bilgi Bankasını Doldurma:**
    -   `Knowledge Base` bölümüne gidin ve yeni bir bilgi bankası oluşturun.
    -   **Kaynak Ekle (Add Source) -> Dokümanlar:** `chatbot_md` ve `knowledge_base_enriched_top50` klasörlerindeki tüm Markdown dosyalarını yükleyin.
    -   **Kaynak Ekle -> Tablolar:** Oluşturduğunuz 5 tablonun tamamını kaynak olarak ekleyin.
4.  **İş Akışlarını (Workflows) Geliştirme:**
    -   Yukarıda Bölüm 4.2'de özetlenen `Main Workflow`, `Product Search Workflow` ve `Product Detail Workflow` yapılarını oluşturun.
    -   `Autonomous Node`'ların `Instructions` alanlarını, ajanın rolünü, yeteneklerini ve hangi durumlarda hangi alt akışa geçmesi gerektiğini net bir şekilde tanımlayacak biçimde doldurun.
    -   `Execute Code` kartlarını kullanarak tablolar arası veri birleştirme mantığını kodlayın.
5.  **Test ve İyileştirme:**
    -   Botu farklı senaryolarla (genel sorular, spesifik ürün aramaları, teknik özellik sorguları) kapsamlı bir şekilde test edin.
    -   Botpress Studio'daki `Inspect` penceresini kullanarak `Autonomous Node`'un karar verme sürecini ve `Knowledge Agent`'ın hangi kaynaklardan bilgi bulduğunu analiz edin.
    -   Gelen yanıtlara ve ajanın performansına göre `Instructions` metinlerini ve iş akışı mantığını iyileştirin.

## 6. Sonuç ve Öneriler

Önerilen bu hibrit mimari, Botpress'in platform kısıtlamalarını aşmak için tasarlanmış sağlam ve ölçeklenebilir bir çözüm sunmaktadır. Veriyi yapılandırılmış **Tablolar** ve anlamsal **Bilgi Bankası** dokümanları arasında akıllıca bölüştürerek, hem kesin filtreleme sorgularına hem de doğal dil tabanlı karmaşık sorulara etkili bir şekilde yanıt verebilen bir chatbot oluşturmak mümkündür. Bu yaklaşım, başlangıçta daha fazla veri hazırlama ve iş akışı geliştirme çabası gerektirse de, uzun vadede daha yüksek performans, daha kolay bakım ve üstün bir kullanıcı deneyimi sağlayacaktır.

[1]: Botpress Docs - Tables. https://botpress.com/docs/studio/concepts/tables
[2]: Botpress Docs - Knowledge Bases. https://botpress.com/docs/studio/concepts/knowledge-base/introduction
[3]: Botpress Docs - Workflows. https://botpress.com/docs/studio/concepts/workflows
[4]: Botpress Docs - Autonomous Node. https://botpress.com/docs/studio/concepts/nodes/autonomous-node
[5]: Botpress Docs - Execute Code. https://botpress.com/docs/studio/concepts/cards/execute-code
