# Agentic RAG Customer Support Chatbot Mimarileri — Botpress, Dış SQL/Vector ve Sizin Projeniz İçin Doğru Yön

**Yazar:** Manus AI  
**Tarih:** 15 Nisan 2026

## Yönetici Özeti

Bu araştırmanın odağını özellikle sizin yeni kısıtınıza göre belirledim: **tool sayısını azaltmadan, tablo sayısını azaltmadan** mevcut Botpress ADK kurulumunun neden Claude/ChatGPT kadar iyi ürün öneremediğini ve bunun gerçekten Botpress kaynaklı bir sınır mı, yoksa daha çok mimari ve instruction tasarımı problemi mi olduğunu inceledim.

Vardığım ana sonuç şudur: **sizi esas kısıtlayan şey Botpress’in tek başına varlığı değil; Botpress içindeki orchestration, retrieval ve response-render katmanlarının birbirine fazla sıkı bağlanmış ve yetersiz ölçümlenmiş olması**. Yani sorun “Botpress kötü” değil; sorun, Botpress içinde kurduğunuz ajan akışının şu anda hem retrieval kararını, hem tool seçimini, hem de presentation/render kararını aynı model döngüsüne yüklemesi. Claude veya ChatGPT’ye aynı tabloları verdiğinizde daha iyi sonuç almanızın önemli sebeplerinden biri de bu: o ortamda model çoğu zaman **tek bir görev** yapıyor — veri içinden en alakalı ürünü seçip açıklıyor. Sizin botta ise model aynı anda ürün buluyor, filtre mantığı kuruyor, UI bileşeni üretiyor, tool argümanları belirliyor, follow-up butonlarını tasarlıyor ve conversational state yönetiyor. Hata yüzeyi dramatik biçimde büyüyor.

Ek araştırma ayrıca şunu da gösteriyor: modern production agentic RAG sistemleri basit bir “vector search + cevap üret” kurgusundan ibaret değil. İyi sistemlerde **retrieval**, **ranking/reranking**, **grounding**, **response generation**, **guardrails**, **monitoring**, **evaluation** ve çoğu zaman **fallback routing** ayrı katmanlar halinde düşünülüyor.[1] [2] [3] Bu açıdan bakınca sizin mevcut yapı, bazı ileri seviye parçaları barındırıyor olsa da bunları operasyonel olarak birbirinden yeterince ayırmıyor.

Bu nedenle benim net kanaatim şudur:

> **Botpress sizi mutlak olarak kısıtlamıyor.**  
> Ama **Botpress’in içinde, ürün seçimi ile agent orchestration’ı aynı LLM döngüsüne fazla bırakırsanız**, Claude/ChatGPT’nin “tabloyu oku ve en iyi ürünü seç” performansına yaklaşmak zorlaşıyor.

Bunun çözümü de ilk düşündüğünüz kadar radikal olmak zorunda değil. Dışarıda Supabase + pgvector + SQL tabanlı hybrid retrieval katmanı kurmak mümkündür ve ciddi artıları vardır; ancak bunu sadece “daha hızlı olur” diye değil, **retrieval kararını deterministik ve ölçülebilir hale getirmek** için düşünmek gerekir.[4] [5] [6]

## Modern Agentic RAG Customer Support Mimarileri Nasıl Kuruluyor?

Güncel kaynaklar, müşteri destek ve ürün öneri botlarında kullanılan mimarilerin ortak olarak birkaç katmana ayrıldığını gösteriyor. Humanloop, basit RAG desenlerinden corrective RAG ve agentic RAG'e uzanan mimarilerde kritik farkın yalnızca retrieval yapmak değil, **retrieval kalitesini de değerlendirmek** olduğunu vurguluyor.[1] Evidently ise RAG sistemlerinde retrieval ve generation performansının ayrı ayrı ölçülmesi gerektiğini açık şekilde anlatıyor.[3]

Aşağıdaki tablo, bugün iyi çalışan agentic customer support botlarının tipik katmanlarını özetliyor:

| Katman | Rolü | İyi sistemlerde nasıl çalışır? |
|---|---|---|
| Query understanding | Kullanıcı niyetini çıkarır | Ürün arama, teknik soru, karşılaştırma, fiyat filtresi gibi intent ayrımı yapar |
| Retrieval planning | Hangi veri kaynağına nasıl gidileceğini seçer | Keyword, metadata filter, semantic search ve relation lookup arasında yönlendirme yapar |
| Candidate retrieval | Aday ürünleri çeker | İlk aşamada geniş ama kontrollü bir aday havuzu döndürür |
| Ranking / reranking | Adayları gerçekten uygun olana göre sıralar | Sadece vector similarity’ye bırakmaz; marka, kategori, boyut, fiyat, stok ve intent uyumunu da hesaba katar |
| Grounding | Cevabın hangi kaynağa dayandığını sabitler | Yanıta girecek alanları veri katmanından doğrular |
| Response composition | Kullanıcı cevabını üretir | Doğrulanmış veriyle kısa açıklama, kart, CTA ve follow-up üretir |
| Guardrails | Hatalı tool/output akışını engeller | Boş URL, eksik görsel, yanlış kategori, invalid payload gibi durumları keser |
| Evaluation | Sistemin nerede bozulduğunu ölçer | Retrieval başarısı ile final answer kalitesini ayrı ölçer |

Sizin projede bu katmanların çoğu bir şekilde mevcut; fakat pratikte **candidate retrieval**, **ranking**, **response composition** ve **guardrails** birbirinden yeterince ayrılmamış durumda. Bu yüzden model yanlış ürünü seçtiğinde de, doğru ürünü bulup yanlış kart ürettiğinde de, gözlem seviyesinde ikisi birbirine karışıyor.

## Claude/ChatGPT Aynı Tablolarla Neden Daha İyi Ürün Öneriyor Gibi Görünüyor?

Bu sorunun cevabı çok kritik. Çünkü burada asıl fark genellikle modelin “daha zeki” olması değil, **görev düzeninin daha sade olması**dır.

Claude veya ChatGPT’ye tabloları doğrudan verdiğinizde çoğu zaman aşağıdaki üç avantaj oluşur:

| Avantaj | Neden önemli? | Sizin botta eksik kalan taraf |
|---|---|---|
| Tek görev modu | Model sadece ilişki kurup ürün seçer | Sizde model aynı anda tool orchestration + UI rendering yapıyor |
| Büyük bağlam esnekliği | Model tabloyu doğrudan bağlam içinde okuyabilir | Sizde retrieval katmanı önce yanlış kandidate havuz oluşturabiliyor |
| Düşük integration yüzeyi | JSON schema, card payload, button value, trace retry gibi ekstra riskler yok | Sizde her biri ayrı failure mode oluşturuyor |

Redis’in uzun context ve RAG karşılaştırması da bunu destekliyor. Büyük context pencereleri bazı görevlerde çok güçlüdür; özellikle model veri setinin büyük bölümünü bir defada görüp örüntü kurabiliyorsa avantaj sağlayabilir. Ancak aynı kaynak, production ortamında hız, maliyet ve doğruluk açısından çoğu retrieval tipi kullanımda RAG’in daha uygun kaldığını, en iyi yaklaşımın da çoğu zaman hibrit katmanlama olduğunu söylüyor.[6]

Buradan şu sonuca varıyoruz:

> Claude/ChatGPT’nin daha iyi görünmesi, sizin use case’inizde bazen **“retrieval problemi çözülmüş gibi”** hissettirebilir.  
> Fakat gerçekte çoğu zaman model, daha geniş bağlamı tek görevli bir ortamda işlediği için daha iyi sonuç veriyordur.

Yani sizin sorunuzu doğrudan cevaplayayım: **Hayır, bu tek başına Botpress’in model kalitesi yüzünden değil.** Daha çok şu yüzden:

1. **Aday ürün seçimi ile final cevap üretimi ayrılmamış.**  
2. **Retrieval sonrası reranking yok veya yeterince deterministik değil.**  
3. **UI/render ve agent loop hataları, retrieval başarısını maskeliyor.**  
4. **Instruction seti, modeli hem “ürün uzmanı” hem de “UI runtime yazarı” yapmaya çalışıyor.**

## Sizin Projede Büyük İhtimalle Neyi Yanlış Yapıyorsunuz?

Mevcut trace’ler, tool tanımları ve conversation prompt’una birlikte bakınca bana göre en olası hata kümeleri aşağıdaki gibidir.

### 1. Retrieval ile recommendation aynı şey sanılıyor

`searchProducts` aracı iyi bir retrieval başlangıcı sağlıyor olabilir; fakat iyi retrieval, tek başına iyi recommendation demek değildir. Modern recommendation akışlarında sıklıkla iki aşama vardır:

| Aşama | Ne yapar? |
|---|---|
| Retrieval | 20–100 aday ürün çıkarır |
| Ranking / reranking | Bu adaylar içinden kullanıcı niyetine en uygun 3–5 ürünü seçer |

Sizde retrieval sonrası bu ikinci aşama yeterince açık görünmüyor. `searchProducts` sonucu doğrudan kullanıcıya sunuluyor. Oysa kullanıcı “pH nötr, seramik dostu, günlük yıkama için şampuan” dediğinde sadece similarity skoru değil; kategori doğruluğu, ürünün gerçekten pH nötr olması, seramik dostu iddiasının veri kaynağında açık geçmesi ve kullanım amacına uygunluğu da dikkate alınmalı.

### 2. Tool orchestration ile UI generation fazla iç içe

Botpress tools dokümantasyonu, tool’ların dış sistemlerle etkileşim kurabilen fonksiyonlar olduğunu ve input/output şemasının model için kritik olduğunu vurguluyor.[4] Sizde ise tool şemaları zengin olsa da, **tool sonucunun kullanıcıya nasıl dönüştürüleceği** güvenli bir katmana alınmamış. Model tool’dan çıkan veriyi doğrudan TSX/message yapısına çevirmeye çalışıyor. Trace’lerde görülen invalid carousel/action hataları bunun açık göstergesi.

Bu mimaride problem şu olur: retrieval doğru olsa bile final cevap yine bozulur. Sonra ekip retrieval’ı suçlar; oysa asıl sorun presentation katmanıdır.

### 3. Evaluation eksikliği nedeniyle gerçek arıza katmanı ölçülemiyor

Evidently’nin de vurguladığı gibi retrieval ve generation ayrı değerlendirilmelidir.[3] Sizde ise pratikte şu metrikler yok gibi görünüyor:

| Metrik | Neden gerekli? |
|---|---|
| Top-k retrieval doğruluğu | Doğru ürün ilk 5 aday içine giriyor mu? |
| Rank-1 doğruluğu | İlk önerilen ürün gerçekten doğru mu? |
| Attribute grounding | Ürünün pH, hacim, marka, kategori gibi özellikleri doğru mu aktarılıyor? |
| Render success rate | Tool sonucu valid rich message’a dönüşüyor mu? |
| Retry rate | Aynı soru için kaç kez ikinci deneme yapılıyor? |
| Null field failure rate | Boş URL/görsel/payload yüzünden kaç cevap düşüyor? |

Bu ölçümler olmayınca “bot yanlış ürün öneriyor” cümlesi çok geniş kalıyor. Oysa sorun şu parçalardan biri olabilir: yanlış retrieval, yanlış ranking, yanlış grounding, yanlış render, yanlış follow-up.

### 4. Instruction seti çok yoğun ve çok rollü

Bugün iyi agentic sistemlerde prompt uzun olabilir; ama rol ayrımı nettir. Sizin prompt, modele aynı anda şu rolleri yüklüyor:

- ürün danışmanı,
- kategori uzmanı,
- tool router,
- query normalizer,
- UI component yazarı,
- fiyat formatlayıcı,
- retry policy yöneticisi.

Bu kadar çok rol aynı tekil agent loop’a yüklendiğinde, modelin hatasız ve tutarlı davranması zorlaşır. Özellikle customer support product recommendation gibi hem doğruluk hem hız gerektiren use case’lerde bu, kaliteyi düşürür.

## Botpress Sizi Gerçekten Kısıtlıyor mu?

Burada ayrımı dikkatle yapmak lazım.

### Botpress’in güçlü tarafı

Botpress ADK araç mantığı, conversation handler, state ve dış sistemlere bağlanabilen tool handler modeli açısından aslında uygun bir orkestrasyon çatısı sunuyor. Resmi dokümantasyon, tool’ların “external systems” ile etkileşebileceğini açıkça söylüyor.[4] Bu şu demek: **Botpress içinde Supabase’e, kendi API’nize, Postgres’inize veya harici reranker servisinize gitmeniz mümkündür**.

### Botpress’in sizi zorlayabileceği taraf

Botpress, özellikle response rendering ve channel payload sözleşmelerinde disiplin ister. Eğer modelin ürettiği rich output ile runtime kontratı arasında en küçük uyumsuzluk oluşursa, cevap düşebilir. Ayrıca tool çağrıları model ajanı üzerinden tetiklendiği için retrieval stratejisi fazla özgür bırakılırsa istikrarsızlık artabilir.

Bu yüzden benim cevabım şu:

| Soru | Cevap |
|---|---|
| Botpress ile iyi ürün öneri botu yapılabilir mi? | Evet |
| Aynı tool ve tablolarla kalite artırılabilir mi? | Evet |
| Botpress sizi bazı açılardan zorlar mı? | Evet, özellikle render sözleşmesi ve orchestration disiplini tarafında |
| Esas problem platform mu? | Hayır, daha çok mimari ayrıştırma ve evaluation eksikliği |

## Supabase + Dış SQL/Vector Katmanı Kurmak Mümkün mü?

Evet, mümkündür ve Botpress buna mimari olarak engel değildir. En doğal model şu olur:

1. **Botpress conversation layer** kullanıcıyla konuşur.  
2. **Botpress tool** harici API’ye gider.  
3. Harici API, **Supabase/Postgres/pgvector** üstünde hybrid retrieval çalıştırır.  
4. API yalnızca **sade, temiz, render-ready product candidates** döndürür.  
5. Botpress bu sonucu kullanıcıya sunar.

Supabase’in agents ve vector querying dokümantasyonu, semantic search, filtered similarity search ve relational verilerle birleşen hybrid search desenlerini desteklediğini gösteriyor.[5] [6] Özellikle ürün önerisi örneğinde metadata filtreleriyle similarity search birleştiriliyor; bu tam olarak sizin use case’inize yakın.

## Supabase’e Geçmenin Artıları

Eğer dış retrieval katmanına çıkarsanız, asıl kazanacağınız şey sadece hız değil, **kontrol** olur.

| Artı | Neden önemli? |
|---|---|
| Deterministik hybrid search | Önce marka/kategori/fiyat filtreleri, sonra semantic search uygulayabilirsiniz |
| SQL ile açıklanabilirlik | Hangi ürün neden geldiğini daha kolay izlersiniz |
| Reranking katmanı ekleme | Top-k sonrası kural tabanlı veya LLM tabanlı rerank eklenebilir |
| Metadata filtreleri | Hacim, stok, fiyat aralığı, kategori, marka gibi alanları daha sağlam yönetirsiniz |
| Observability | Hangi sorguda hangi adayların geldiğini loglamak kolaylaşır |
| Offline evaluation | Aynı sorgu seti üzerinde farklı retrieval stratejilerini kıyaslayabilirsiniz |
| Veri bağımsızlığı | Botpress iç tablosuna bağlı kalmadan veri katmanını ayrı evrimleştirebilirsiniz |

Özellikle sizin gibi ürün öneride doğruluk peşinde olan bir sistemde, bence en güçlü argüman hız değil; **retrieval’ı açıkça kontrol etme ve ölçebilme kabiliyeti**dir.

## Supabase’e Geçmenin Riskleri ve Yeni Sorunları

Elbette bunun bedelsiz olmadığını da net söylemek gerekir.

| Risk | Açıklama |
|---|---|
| Ek ağ gecikmesi | Botpress → API → Supabase → API → Botpress zinciri oluşur |
| Operasyonel karmaşıklık | Ayrı veri katmanı, API, auth, rate limit, error handling yönetmeniz gerekir |
| Veri senkronizasyonu | Botpress tabloları ile Supabase arasında kaynak otoritesi karışabilir |
| Debug zorlaşması | Sorun modelde mi, API’de mi, DB’de mi ayırt etmek gerekir |
| Güvenlik yüzeyi büyür | Service key, RLS, API auth, timeout ve abuse koruması gerekir |
| Maliyet bileşimi değişir | Botpress + DB + embedding + API host birlikte yönetilir |

### Hız çok mu düşer?

İyi tasarlanırsa çoğu zaman “çok yavaş” olmaz. Redis’in RAG ve long context karşılaştırması, retrieval katmanının tipik olarak onlarca ila birkaç yüz milisaniye aralığında optimize edilebildiğini; asıl ağır maliyetin çoğu zaman gereksiz büyük context veya kötü tasarlanmış orchestration olduğunu gösteriyor.[6] Tabii Supabase üzerinde sorgu tasarımı, index, payload boyutu ve embedding stratejisi burada belirleyici olur.

Dolayısıyla pratik cevap şu olur:

> **Evet, ek network hop gecikme getirir.**  
> Ama doğru tasarımla bu genellikle kullanıcı deneyimini bozacak ana darboğaz olmaz.  
> Asıl risk, retrieval’ı dışarı taşıyıp orchestration’ı içerde bırakırken sorumluluk sınırlarını net çizmemektir.

## En Doğru Mimari Yön Nedir?

Tool ve tablo sayısını koruyacağınızı söylediğiniz için benim önerim “azaltma” değil, **sorumlulukları yeniden ayırma** yönünde.

### Önerdiğim yön

| Katman | Nerede olmalı? | Sorumluluk |
|---|---|---|
| Conversation / dialogue policy | Botpress | Kullanıcı niyeti, clarifying question, konuşma akışı |
| Tool routing | Botpress | Hangi yeteneğin çağrılacağına karar |
| Retrieval execution | Mümkünse dış servis veya deterministik katman | Candidate ürünleri çekmek |
| Ranking / reranking | Dış servis veya ayrı tool | Adayları kullanıcı niyetine göre sıralamak |
| Rendering | Botpress içinde ama deterministik mapper ile | Ürünleri güvenli card/carousel formatına çevirmek |
| Observability & eval | Ayrı log/eval katmanı | Retrieval, ranking, render başarılarını ölçmek |

Bu öneri, Botpress’i tamamen bırakmayı gerektirmiyor. Aksine Botpress’i daha doğru yerde kullanıyor: **conversation orchestration**. Veriye en çok kontrol gerektiren katmanı ise dışarı almayı bir opsiyon haline getiriyor.

## Benim Net Teşim: Şu Anda Nerede Takılıyorsunuz?

Eğer en dürüst özetleyecek olursam, sizde problem şu soruda düğümleniyor:

> “Model gerçekten hangi ürünü önermesi gerektiğini mi bilmiyor, yoksa biz ona doğru retrieval/ranking yapısını ve güvenli cevap boru hattını mı vermiyoruz?”

Benim cevabım ikinci seçenek yönünde çok daha güçlü.

Siz büyük ihtimalle şuralarda takılıyorsunuz:

1. **Top-k candidate set yeterince güvenilir değil.**  
2. **Candidate içinden final recommendation seçimi deterministik değil.**  
3. **Attribute grounding ayrı aşama değil.**  
4. **Response rendering retrieval ile aynı döngüde bozuluyor.**  
5. **Retrieval başarısı ile answer başarısını ayrı ölçmüyorsunuz.**

Bu durumda dış vector DB/SQL geçişi mantıklı olabilir; fakat bunu “Botpress’i bypass etmek” için değil, **retrieval ve ranking’i ayrı bir mühendislik katmanına dönüştürmek** için yapmak gerekir.

## Karar Çerçevesi

Aşağıdaki karar tablosu, sizin için daha pratik olabilir:

| Soru | Eğer cevabınız “evet” ise | Önerim |
|---|---|---|
| Mevcut tool’lar kalsın mı? | Evet | Tool isimleri kalsın; ama iç handler’ların retrieval mantığı dış servise taşınabilir |
| Mevcut tablolar kalsın mı? | Evet | Tablo şemaları korunur; ama retrieval için kaynak otoritesi Botpress yerine dış DB olabilir |
| En büyük sorun yanlış ürün seçimi mi? | Evet | Reranking ve grounding katmanını ayrılaştırın |
| En büyük sorun runtime/render kırılması mı? | Evet | Presentation mapper katmanını deterministic yapın |
| Hem kalite hem kontrol istiyor musunuz? | Evet | Supabase/Postgres + hybrid search + Botpress orchestration düşünün |
| En düşük operasyon yükünü mü istiyorsunuz? | Evet | Önce Botpress içinde eval + rerank + render guard katmanını düzeltin |

## Sonuç

Bu araştırmanın sonucunda benim net görüşüm şudur:

> **Sizi şu anda en çok sınırlayan şey Botpress değil; retrieval, ranking, grounding ve rendering’in aynı agent döngüsü içinde fazla iç içe kalmasıdır.**

Claude/ChatGPT ile elde ettiğiniz daha iyi sonuçlar, büyük ölçüde onların daha sade görev çerçevesi ve geniş bağlamı daha doğrudan kullanabilmesinden geliyor. Production customer support mimarileri ise bunu agentic RAG ile şu şekilde çözüyor: retrieval’ı daha kontrollü hale getiriyor, ranking’i ayrı düşünüyor, generation’ı grounded tutuyor ve bunların hepsini ölçüyor.[1] [2] [3]

Bu nedenle iki gerçekçi yön var:

| Yol | Ne zaman mantıklı? |
|---|---|
| Botpress içinde kalıp instruction + reranking + render guard + eval katmanını düzeltmek | Eğer operasyon yükünü artırmadan kaliteyi yükseltmek istiyorsanız |
| Botpress’i orchestration katmanı bırakıp Supabase/Postgres/pgvector ile dış retrieval servisi kurmak | Eğer recommendation kalitesini, kontrolü ve gözlemlenebilirliği ciddi biçimde artırmak istiyorsanız |

Benim profesyonel önerim şudur: **önce mimari sorumlulukları ayırın; sonra retrieval katmanını dışarı alma kararını verin.** Çünkü şu anda dışarı çıkmadan da iyileştirebileceğiniz büyük bir alan var. Ama uzun vadede, sizin use case’inizde **Supabase + hybrid retrieval + Botpress orchestration** kombinasyonu oldukça mantıklı bir hedef mimari olabilir.[4] [5] [6]

## Sonraki Adım İçin Önerim

İsterseniz bir sonraki adımda üç şeyden birini doğrudan hazırlayabilirim:

| Seçenek | İçerik |
|---|---|
| Botpress içinde kalacak yeni mimari | Tool/table sayısını koruyarak instruction, reranking, grounding ve render guard tasarımı |
| Supabase hedef mimarisi | Botpress → API → Supabase/pgvector → reranker → Botpress akışının teknik taslağı |
| Karşılaştırmalı geçiş planı | “Şimdi Botpress içinde düzelt”, “sonra dış retrieval’a geç” şeklinde aşamalı roadmap |

Benim önerim, önce ikinci değil birinciyle başlamanızdır: yani **önce Botpress içinde hangi katmanın yanlış çalıştığını netleştiren hedef mimariyi** çıkaralım. Sonra dış SQL/vector kararı çok daha sağlıklı verilir.

## References

[1]: https://humanloop.com/blog/rag-architectures "8 Retrieval Augmented Generation (RAG) Architectures You Should Know in 2025 - Humanloop"
[2]: https://www.tigerdata.com/blog/agentic-rag-best-practices-guide-for-building-ai-apps-with-postgresql "Agentic RAG Best Practices - Tiger Data"
[3]: https://www.evidentlyai.com/llm-guide/rag-evaluation "A complete guide to RAG evaluation - Evidently AI"
[4]: https://botpress.com/docs/adk/concepts/tools "Tools - Botpress"
[5]: https://supabase.com/solutions/agents "Supabase for Agents"
[6]: https://supabase.com/docs/guides/storage/vector/querying-vectors "Querying Vectors - Supabase Docs"
[7]: https://redis.io/blog/rag-vs-large-context-window-ai-apps/ "RAG vs Large Context Window: Real Trade-offs for AI Apps - Redis"
