# Conversation Trace Report
**Conversation ID:** conv_01KP99WS2BMRPZ9JGG2GSN000Y
**Bot ID:** bcfcd0c7-3697-41a4-ae14-090ca0683360
**Integration:** webchat
**Environment:** development
**Total Spans:** 100

## Runtime Versions
- **adk:** not-installed
- **runtime:** 1.17.0
- **sdk:** 6.3.1
- **llmz:** 0.0.60
- **zai:** 2.6.6
- **cognitive:** 0.4.2

## Özet İstatistikler

| Metrik | Değer |
|--------|-------|
| Gelen Mesaj | 1 |
| Giden Mesaj (Bot) | 7 |
| Tool Çağrısı | 5 |
| LLM İsteği | 4 |
| Hata | 4 |
| Toplam Input Token | 88,601 |
| Toplam Output Token | 3,529 |
| Toplam Maliyet | $0.0354 |
| Model | google-ai:gemini-2.5-flash |

## Gelen Mesajlar (Kullanıcı)

- **Timestamp:** 1776282135630.0002
  - **Mesaj:** "innovcar quick detailer ne işe yarar"
  - **Toplam İşlem Süresi:** 26918ms

## Giden Mesajlar (Bot)

### Bot Mesajı 1
- **Timestamp:** 1776282069841
- **Tip:** text
- **İçerik:** "Üzgünüm, bir hata oluştuğu için isteğinizi tam olarak yerine getiremedim. Farklı bir yöntemle deniyorum."

### Bot Mesajı 2
- **Timestamp:** 1776282070673
- **Tip:** text
- **İçerik:** "GYEON Wetcoat'tan (3100 TL) daha pahalı seramik kaplama ürünleri arasında size şunları önerebilirim:"

### Bot Mesajı 3
- **Timestamp:** 1776282070905.9998
- **Tip:** Carousel
- **İçerik:** "(carousel/card)"

### Bot Mesajı 4
- **Timestamp:** 1776282071129
- **Tip:** Choice
- **İçerik:** "Bu ürünlerle ilgili ne yapmak istersiniz?"

### Bot Mesajı 5
- **Timestamp:** 1776282150881.9998
- **Tip:** text
- **İçerik:** "Üzgünüm, Innovacar Quick Detailer hakkında detaylı bilgiye ulaşırken bir sorun oluştu. Tekrar deniyorum."

### Bot Mesajı 6
- **Timestamp:** 1776282159104
- **Tip:** text
- **İçerik:** "Üzgünüm, Innovacar Quick Detailer hakkında detaylı bilgiye ulaşırken sürekli bir sorun yaşıyorum. Ürünün bazı bağlantı bilgileri eksik olduğu için tam detayları şu anda getiremiyorum."

### Bot Mesajı 7
- **Timestamp:** 1776282159417.9998
- **Tip:** Choice
- **İçerik:** "Farklı bir arama yapabilir veya genel kategorilere göz atabilirsiniz."

## Tool Çağrıları

### searchProducts (status=success, 579ms)

**Input:**
```json
{
  "limit": 10,
  "query": "seramik kaplama",
  "subCat": "Seramik Kaplama Ürünleri"
}
```

**Output:**
```json
{"results":[{"sku":"MXP-CCN30KS","productName":"MTS KİMYA MX-PRO CRYSTAL Seramik Kaplama 30ml – Kutu Set","brand":"MX-PRO","mainCat":"DIŞ YÜZEY","price":2000,"imageUrl":"https://mgpolishing.com/wp-content/uploads/2025/11/MXP-CCN30KS_0.jpg","url":"https://mtskimya.com/dis-yuzey/seramik-kaplama-urunleri/seramik-kaplamalar/prd-mts-kimya-mx-pro-crystal-seramik-kaplama-30ml-kutu-set","snippet":"MTS KİMYA MX-PRO CRYSTAL Seramik Kaplama 30ml – Kutu Set | Marka: MX-PRO | Kategori: DIŞ YÜZEY > Seramik Kaplama Ürünleri > Seramik Kaplamalar | Hedef Yüzey: Araç boyası, vernik katı | Teknik: Temas Açısı: 110, 30ml | Uygulaması son derece kolay ama aynı zamanda son derece dayanıklı, yüksek parlaklı","similarity":"0.644"},{"sku":"MXP-CCN50KS","productName":"MTS KİMYA MX-PRO CRYSTAL Seramik Kaplama 50ml – Kutu Set","brand":"MX-PRO","mainCat":"DIŞ YÜZEY","price":2500,"imageUrl":"https://mgpolishing.com/wp-content/uploads/2025/11/MXP-CCN50KS_0.jpg","url":"https://mtskimya.com/dis-yuzey/seramik-kaplama-urunleri/seramik-kaplamal...(truncated)
```

### searchProducts (status=success, 549ms)

**Input:**
```json
{
  "brand": "INNOVACAR",
  "limit": 5,
  "query": "quick detailer",
  "subCat": "Boya Koruma Ürünleri"
}
```

**Output:**
```json
{"results":[{"sku":"79301","productName":"INNOVACAR W1 QUICK DETAILER Yüzey Koruyucu ve Parlatıcı Hızlı Cila - 500 ml","brand":"INNOVACAR","mainCat":"DIŞ YÜZEY","price":750,"imageUrl":"https://mgpolishing.com/wp-content/uploads/2025/08/79301_1.webp","url":"https://mtskimya.com/dis-yuzey/boya-koruma-urunleri/wax-ve-sprey-cilalar/prd-innovacar-w1-quick-detailer-yuzey-koruyucu-ve-parlatici-hizli-cila-500-ml","snippet":"INNOVACAR W1 QUICK DETAILER Yüzey Koruyucu ve Parlatıcı Hızlı Cila - 500 ml | Marka: INNOVACAR | Kategori: DIŞ YÜZEY > Boya Koruma Ürünleri > Wax ve Sprey Cilalar | Yüzey: Araç boyası, iç mekan plastikleri, cam yüzeyleri - hem dış hem iç yüzeylerde | INNOVACAR W1 QUICK DETAILER’IN FAYDALARI | Hızlı ","similarity":"0.537"},{"sku":"79304","productName":"INNOVACAR H2O COAT Anında Hidrofobik Etki Kazandırıcı Hızlı Cila Konsantre - 1 lt","brand":"INNOVACAR","mainCat":"DIŞ YÜZEY","price":930,"imageUrl":"https://mgpolishing.com/wp-content/uploads/2025/11/79304_0.jpg","url":"https://mtskimya.com/dis-yuzey...(truncated)
```

### getProductDetails (status=error, 261ms)

**Input:**
```json
{
  "sku": "79301"
}
```

**Error:** Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.

### searchProducts (status=success, 537ms)

**Input:**
```json
{
  "brand": "INNOVACAR",
  "limit": 5,
  "query": "quick detailer",
  "subCat": "Boya Koruma Ürünleri"
}
```

**Output:**
```json
{"results":[{"sku":"79301","productName":"INNOVACAR W1 QUICK DETAILER Yüzey Koruyucu ve Parlatıcı Hızlı Cila - 500 ml","brand":"INNOVACAR","mainCat":"DIŞ YÜZEY","price":750,"imageUrl":"https://mgpolishing.com/wp-content/uploads/2025/08/79301_1.webp","url":"https://mtskimya.com/dis-yuzey/boya-koruma-urunleri/wax-ve-sprey-cilalar/prd-innovacar-w1-quick-detailer-yuzey-koruyucu-ve-parlatici-hizli-cila-500-ml","snippet":"INNOVACAR W1 QUICK DETAILER Yüzey Koruyucu ve Parlatıcı Hızlı Cila - 500 ml | Marka: INNOVACAR | Kategori: DIŞ YÜZEY > Boya Koruma Ürünleri > Wax ve Sprey Cilalar | Yüzey: Araç boyası, iç mekan plastikleri, cam yüzeyleri - hem dış hem iç yüzeylerde | INNOVACAR W1 QUICK DETAILER’IN FAYDALARI | Hızlı ","similarity":"0.537"},{"sku":"79304","productName":"INNOVACAR H2O COAT Anında Hidrofobik Etki Kazandırıcı Hızlı Cila Konsantre - 1 lt","brand":"INNOVACAR","mainCat":"DIŞ YÜZEY","price":930,"imageUrl":"https://mgpolishing.com/wp-content/uploads/2025/11/79304_0.jpg","url":"https://mtskimya.com/dis-yuzey...(truncated)
```

### getProductDetails (status=error, 189ms)

**Input:**
```json
{
  "sku": "79301"
}
```

**Error:** Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.

## LLM İstekleri

### LLM İsteği 1
- **Model:** google-ai:gemini-2.5-flash
- **Temperature:** 0.2
- **Input Tokens:** 24,428
- **Output Tokens:** 741
- **Maliyet:** $0.009181
- **Cached:** False
- **Süre:** 5801ms
- **System Prompt Uzunluğu:** 73,639 karakter
- **Mesaj Sayısı:** 1

### LLM İsteği 2
- **Model:** google-ai:gemini-2.5-flash
- **Temperature:** 0.2
- **Input Tokens:** 26,006
- **Output Tokens:** 1,292
- **Maliyet:** $0.011032
- **Cached:** False
- **Süre:** 6769ms
- **System Prompt Uzunluğu:** 73,639 karakter
- **Mesaj Sayısı:** 3

### LLM İsteği 3
- **Model:** google-ai:gemini-2.5-flash
- **Temperature:** 0.2
- **Input Tokens:** 28,267
- **Output Tokens:** 1,250
- **Maliyet:** $0.011605
- **Cached:** False
- **Süre:** 7126ms
- **System Prompt Uzunluğu:** 73,896 karakter
- **Mesaj Sayısı:** 5

### LLM İsteği 4
- **Model:** google-ai:gemini-2.5-flash
- **Temperature:** ?
- **Input Tokens:** 9,900
- **Output Tokens:** 246
- **Maliyet:** $0.003585
- **Cached:** False
- **Süre:** 2294ms
- **System Prompt Uzunluğu:** 2,269 karakter
- **Mesaj Sayısı:** 1
- **Prompt Kategori:** zai:summarize

## Hatalar

### autonomous.iteration (iteration=0, 6930ms)
- **Status:** execution_error

**Exception:** CodeExecutionError: Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.

**Generated Code (LLM):**
```tsx
// Search for "innovacar quick detailer" to find the product SKU, then get its details.
const searchResult = await searchProducts({ query: "quick detailer", brand: "INNOVACAR", subCat: "Boya Koruma Ürünleri" });

if (searchResult.totalReturned === 0) {
  yield <Message>
    Üzgünüm, Innovacar Quick Detailer ürünü katalogumuzda bulunamadı. Farklı bir arama yapabilir veya kategorilere göz atabilirsiniz.
  </Message>
  yield <Choice
    text="Alternatif yollar:"
    options={[
      { label: "Kategorilere Göz At", value: "Kategorilere Göz At" },
      { label: "Marka Listesi", value: "Marka Listesi" }
    ]}
  />
  return { action: 'listen' }
}

const product = searchResult.results[0];
const productDetails = await getProductDetails({ sku: product.sku });

if (!productDetails || !productDetails.shortDescription) {
  yield <Message>
    Üzgünüm, **{product.productName}** için detaylı bilgilere ulaşırken bir sorun oluştu. Ürünün genel işlevi hakkında bilgi veremiyorum.
  </Message>
  yield <Choice
    text="Bu ürün...(truncated)
```

### autonomous.tool (iteration=, 261ms)
- **Status:** 

**Exception:** Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.
```
Error: Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.
    at ZZ.handler (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/src/tools/get-product-details.ts:85:13)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async ZZ.execute (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:1091:5790)
    at async /Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:3455:1627
    at async executeInSpan (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:3424:31625)
    at async ZZ.execute (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:1091:5790)
    at async withHooks (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dis...(truncated)
```

**Exception:** Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.
```
Error: Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.
    at ZZ.handler (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/src/tools/get-product-details.ts:85:13)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async ZZ.execute (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:1091:5790)
    at async /Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:3455:1627
    at async executeInSpan (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:3424:31625)
    at async ZZ.execute (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:1091:5790)
    at async withHooks (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dis...(truncated)
```

### autonomous.iteration (iteration=1, 7879ms)
- **Status:** execution_error

**Exception:** CodeExecutionError: Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.

**Generated Code (LLM):**
```tsx
// An error occurred in the previous turn due to a missing product URL. Re-attempting to find the product and its details, ensuring the product has a valid URL.
yield <Message>Üzgünüm, Innovacar Quick Detailer hakkında detaylı bilgiye ulaşırken bir sorun oluştu. Tekrar deniyorum.</Message>

const searchResult = await searchProducts({ query: "quick detailer", brand: "INNOVACAR", subCat: "Boya Koruma Ürünleri" });

if (searchResult.totalReturned === 0) {
  yield <Message>
    Innovacar Quick Detailer ürünü katalogumuzda bulunamadı. Farklı bir arama yapabilir veya kategorilere göz atabilirsiniz.
  </Message>
  yield <Choice
    text="Alternatif yollar:"
    options={[
      { label: "Kategorilere Göz At", value: "Kategorilere Göz At" },
      { label: "Marka Listesi", value: "Marka Listesi" }
    ]}
  />
  return { action: 'listen' }
}

const productsWithValidUrl = searchResult.results.filter(p => p.url && p.url.length > 0);

if (productsWithValidUrl.length === 0) {
  yield <Message>
    Innovacar Quick Detailer...(truncated)
```

### autonomous.tool (iteration=, 189ms)
- **Status:** 

**Exception:** Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.
```
Error: Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.
    at ZZ.handler (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/src/tools/get-product-details.ts:85:13)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async ZZ.execute (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:1091:5790)
    at async /Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:3455:1627
    at async executeInSpan (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:3424:31625)
    at async ZZ.execute (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:1091:5790)
    at async withHooks (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dis...(truncated)
```

**Exception:** Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.
```
Error: Ürünün URL'si eksik (sku=79301). Bu ürün Card/Carousel'de gösterilemez.
    at ZZ.handler (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/src/tools/get-product-details.ts:85:13)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async ZZ.execute (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:1091:5790)
    at async /Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:3455:1627
    at async executeInSpan (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:3424:31625)
    at async ZZ.execute (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dist/index.cjs:1091:5790)
    at async withHooks (/Users/projectx/Desktop/Claude Code Projects/Products Jsons/Botpress/detailagent/.adk/bot/.botpress/dis...(truncated)
```

## Autonomous Iterations

### Iteration 0 (status=error, 6930ms)
- **Model:** google-ai:google-ai:gemini-2.5-flash
- **Tokens:** 25,169
- **Cost:** $0.009181

**Generated Code:**
```tsx
// Search for "innovacar quick detailer" to find the product SKU, then get its details.
const searchResult = await searchProducts({ query: "quick detailer", brand: "INNOVACAR", subCat: "Boya Koruma Ürünleri" });

if (searchResult.totalReturned === 0) {
  yield <Message>
    Üzgünüm, Innovacar Quick Detailer ürünü katalogumuzda bulunamadı. Farklı bir arama yapabilir veya kategorilere göz atabilirsiniz.
  </Message>
  yield <Choice
    text="Alternatif yollar:"
    options={[
      { label: "Kategorilere Göz At", value: "Kategorilere Göz At" },
      { label: "Marka Listesi", value: "Marka Listesi" }
    ]}
  />
  return { action: 'listen' }
}

const product = searchResult.results[0];
const productDetails = await getProductDetails({ sku: product.sku });

if (!productDetails || !productDetails.shortDescription) {
  yield <Message>
    Üzgünüm, **{product.productName}** için detaylı bilgilere ulaşırken bir sorun oluştu. Ürünün genel işlevi hakkında bilgi veremiyorum.
  </Message>
  yield <Choice
    text="Bu ürün...(truncated)
```

### Iteration 1 (status=error, 7879ms)
- **Model:** google-ai:google-ai:gemini-2.5-flash
- **Tokens:** 27,298
- **Cost:** $0.011032

**Generated Code:**
```tsx
// An error occurred in the previous turn due to a missing product URL. Re-attempting to find the product and its details, ensuring the product has a valid URL.
yield <Message>Üzgünüm, Innovacar Quick Detailer hakkında detaylı bilgiye ulaşırken bir sorun oluştu. Tekrar deniyorum.</Message>

const searchResult = await searchProducts({ query: "quick detailer", brand: "INNOVACAR", subCat: "Boya Koruma Ürünleri" });

if (searchResult.totalReturned === 0) {
  yield <Message>
    Innovacar Quick Detailer ürünü katalogumuzda bulunamadı. Farklı bir arama yapabilir veya kategorilere göz atabilirsiniz.
  </Message>
  yield <Choice
    text="Alternatif yollar:"
    options={[
      { label: "Kategorilere Göz At", value: "Kategorilere Göz At" },
      { label: "Marka Listesi", value: "Marka Listesi" }
    ]}
  />
  return { action: 'listen' }
}

const productsWithValidUrl = searchResult.results.filter(p => p.url && p.url.length > 0);

if (productsWithValidUrl.length === 0) {
  yield <Message>
    Innovacar Quick Detailer...(truncated)
```

### Iteration 2 (status=ok, 7845ms)
- **Model:** google-ai:google-ai:gemini-2.5-flash
- **Tokens:** 29,517
- **Cost:** $0.011605

**Generated Code:**
```tsx
// Acknowledging the persistent error with fetching product details for Innovacar Quick Detailer and offering alternative actions.
yield <Message>
  Üzgünüm, Innovacar Quick Detailer hakkında detaylı bilgiye ulaşırken sürekli bir sorun yaşıyorum. Ürünün bazı bağlantı bilgileri eksik olduğu için tam detayları şu anda getiremiyorum.
</Message>
yield <Choice
  text="Farklı bir arama yapabilir veya genel kategorilere göz atabilirsiniz."
  options={[
    { label: "Kategorilere Göz At", value: "Kategorilere Göz At" },
    { label: "Marka Listesi", value: "Marka Listesi" },
    { label: "Farklı bir ürün ara", value: "Farklı bir ürün ara" }
  ]}
/>
return { action: 'listen' }
```

## Tüm Span Listesi

| # | Name | Status | Duration (ms) | Trace ID |
|---|------|--------|---------------|----------|
| 0 | chat.sendMessage | ok | 236 | 000cb985078a... |
| 1 | botpress.client | ok | 233 | 000cb985078a... |
| 2 | autonomous.tool | ok | 579 | 000cb985078a... |
| 3 | botpress.client | ok | 329 | 000cb985078a... |
| 4 | botpress.client | ok | 161 | 000cb985078a... |
| 5 | botpress.client | ok | 244 | 000cb985078a... |
| 6 | chat.sendMessage | ok | 229 | 000cb985078a... |
| 7 | botpress.client | ok | 227 | 000cb985078a... |
| 8 | chat.sendMessage | ok | 219 | 000cb985078a... |
| 9 | botpress.client | ok | 216 | 000cb985078a... |
| 10 | chat.sendMessage | ok | 238 | 000cb985078a... |
| 11 | botpress.client | ok | 235 | 000cb985078a... |
| 12 | botpress.client | ok | 170 | 000cb985078a... |
| 13 | tags.saveAllDirty | ok | 244 | 000cb985078a... |
| 14 | tags.save | ok | 243 | 000cb985078a... |
| 15 | botpress.client | ok | 240 | 000cb985078a... |
| 16 | botpress.client | ok | 237 | 000cb985078a... |
| 17 | chat.saveTranscript | ok | 216 | 000cb985078a... |
| 18 | botpress.client | ok | 210 | 000cb985078a... |
| 19 | request.incoming | ok | 26918 | b172fb434898... |
| 20 | handler.conversation | ok | 26891 | b172fb434898... |
| 21 | chat.fetchTranscript | ok | 1198 | b172fb434898... |
| 22 | state.loadAll | ok | 988 | b172fb434898... |
| 23 | tags.loadAll | ok | 1 | b172fb434898... |
| 24 | botpress.client | ok | 984 | b172fb434898... |
| 25 | botpress.client | ok | 1171 | b172fb434898... |
| 26 | state.load | ok | 785 | b172fb434898... |
| 27 | state.load | ok | 963 | b172fb434898... |
| 28 | state.load | ok | 961 | b172fb434898... |
| 29 | botpress.client | ok | 771 | b172fb434898... |
| 30 | botpress.client | ok | 959 | b172fb434898... |
| 31 | botpress.client | ok | 955 | b172fb434898... |
| 32 | interruption.check | ok | 22894 | b172fb434898... |
| 33 | autonomous.execution | ok | 22861 | b172fb434898... |
| 34 | botpress.client | ok | 383 | b172fb434898... |
| 35 | botpress.client | ok | 381 | b172fb434898... |
| 36 | autonomous.iteration | error | 6930 | b172fb434898... |
| 37 | cognitive.request | ok | 5801 | b172fb434898... |
| 38 | botpress.client | ok | 5792 | b172fb434898... |
| 39 | botpress.client | ok | 258 | b172fb434898... |
| 40 | botpress.client | ok | 193 | b172fb434898... |
| 41 | botpress.client | ok | 182 | b172fb434898... |
| 42 | botpress.client | ok | 316 | b172fb434898... |
| 43 | botpress.client | ok | 176 | b172fb434898... |
| 44 | botpress.client | ok | 246 | b172fb434898... |
| 45 | autonomous.tool | ok | 549 | b172fb434898... |
| 46 | botpress.client | ok | 333 | b172fb434898... |
| 47 | botpress.client | ok | 209 | b172fb434898... |
| 48 | autonomous.tool | error | 261 | b172fb434898... |
| 49 | botpress.client | ok | 258 | b172fb434898... |
| 50 | botpress.client | ok | 256 | b172fb434898... |
| 51 | botpress.client | ok | 258 | b172fb434898... |
| 52 | botpress.client | ok | 257 | b172fb434898... |
| 53 | botpress.client | ok | 282 | b172fb434898... |
| 54 | autonomous.iteration | error | 7879 | b172fb434898... |
| 55 | cognitive.request | ok | 6769 | b172fb434898... |
| 56 | botpress.client | ok | 6764 | b172fb434898... |
| 57 | botpress.client | ok | 170 | b172fb434898... |
| 58 | botpress.client | ok | 185 | b172fb434898... |
| 59 | botpress.client | ok | 232 | b172fb434898... |
| 60 | botpress.client | ok | 167 | b172fb434898... |
| 61 | botpress.client | ok | 165 | b172fb434898... |
| 62 | botpress.client | ok | 187 | b172fb434898... |
| 63 | botpress.client | ok | 179 | b172fb434898... |
| 64 | chat.sendMessage | ok | 243 | b172fb434898... |
| 65 | botpress.client | ok | 239 | b172fb434898... |
| 66 | botpress.client | ok | 211 | b172fb434898... |
| 67 | autonomous.tool | ok | 537 | b172fb434898... |
| 68 | botpress.client | ok | 342 | b172fb434898... |
| 69 | botpress.client | ok | 188 | b172fb434898... |
| 70 | autonomous.tool | error | 189 | b172fb434898... |
| 71 | botpress.client | ok | 177 | b172fb434898... |
| 72 | botpress.client | ok | 179 | b172fb434898... |
| 73 | botpress.client | ok | 185 | b172fb434898... |
| 74 | botpress.client | ok | 174 | b172fb434898... |
| 75 | autonomous.iteration | ok | 7845 | b172fb434898... |
| 76 | cognitive.request | ok | 7126 | b172fb434898... |
| 77 | botpress.client | ok | 7119 | b172fb434898... |
| 78 | botpress.client | ok | 186 | b172fb434898... |
| 79 | botpress.client | ok | 176 | b172fb434898... |
| 80 | botpress.client | ok | 248 | b172fb434898... |
| 81 | botpress.client | ok | 199 | b172fb434898... |
| 82 | botpress.client | ok | 174 | b172fb434898... |
| 83 | botpress.client | ok | 170 | b172fb434898... |
| 84 | botpress.client | ok | 252 | b172fb434898... |
| 85 | botpress.client | ok | 180 | b172fb434898... |
| 86 | chat.sendMessage | ok | 311 | b172fb434898... |
| 87 | botpress.client | ok | 308 | b172fb434898... |
| 88 | chat.sendMessage | ok | 299 | b172fb434898... |
| 89 | botpress.client | ok | 295 | b172fb434898... |
| 90 | botpress.client | ok | 164 | b172fb434898... |
| 91 | tags.saveAllDirty | ok | 228 | b172fb434898... |
| 92 | tags.save | ok | 227 | b172fb434898... |
| 93 | botpress.client | ok | 223 | b172fb434898... |
| 94 | botpress.client | ok | 183 | b172fb434898... |
| 95 | chat.saveTranscript | ok | 2596 | b172fb434898... |
| 96 | chat.compactTranscript | ok | 2389 | b172fb434898... |
| 97 | cognitive.request | ok | 2294 | b172fb434898... |
| 98 | botpress.client | ok | 2290 | b172fb434898... |
| 99 | botpress.client | ok | 204 | b172fb434898... |
