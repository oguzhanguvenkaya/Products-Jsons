# Mimari — detailagent

## 1. Genel bakış

detailagent bir **Autonomous Botpress ADK agent**'ıdır. Kullanıcı mesajı geldiğinde LLM (Gemini 2.5 Flash), verilen 6 tool arasından uygun olanı çağıran **TypeScript kodu üretir** (LLMz paradigma). Bu kod sandbox'ta çalıştırılır, tool'lar Botpress Cloud tablolarına sorgu atar, sonuçlar JSX payload olarak kullanıcıya gönderilir.

```
User msg
  │
  ▼
Conversation handler (src/conversations/index.ts)
  │  ─ instructions (sistem prompt)
  │  ─ tools: [searchProducts, searchFaq, getProductDetails, ...]
  │  ─ temperature: 0.2
  ▼
LLMz runtime (Autonomous)
  │  LLM TypeScript kod üretir → sandbox'ta çalıştırır
  ▼
Tool çağrısı (örn: searchProducts)
  │  client.findTableRows({table, search, filter})
  ▼
Botpress Cloud Tables
  │  built-in vector search (searchable: true kolonlar)
  ▼
Tool output → LLM → JSX yield (<Carousel>, <Card>, <Choice>)
  │
  ▼
Runtime message payload validation
  │
  ▼
User (webchat, CLI chat, vs.)
```

## 2. Katmanlar

### 2.1 Conversation handler

[`src/conversations/index.ts`](../src/conversations/index.ts) — Tek bir Conversation:

- `channel: '*'` — tüm kanalları yakalar
- `state` — `selectedBrand`, `selectedCategory`, `surfaceType` (konuşma boyunca LLM günceller)
- `handler` — LLMz `execute()` çağrısı: tools + instructions + temperature

**Instructions** (~615 satır) LLM'e şunu öğretir:
- Rol ve kapsam (MTS Kimya ürün danışmanı, sipariş/kargo kapsam dışı)
- 6 tool'un her birinin nasıl/ne zaman kullanılacağı
- Tool seçimi karar tablosu
- Clarifying question patterns (mikrofiber, şampuan, pasta için)
- JSX component syntax kuralları (Card leaf, Carousel items, Choice options, URL null fallback)
- Yanıt stil ve format kuralları

### 2.2 Tablolar (`src/tables/`)

7 tablolu ilişkisel model. Her tablo Zod schema ile tanımlı. Sadece `sku` (+ search_text için search_index) kolonları `searchable: true`.

| Tablo | Satır | Amaç | Önemli kolonlar |
|---|---|---|---|
| `productsMasterTable` | 622 | Ana ürün kataloğu (canonical) | sku, barcode, product_name, brand, price, image_url, main_cat, sub_cat, sub_cat2, target_surface, template_group, template_sub_type, **url** |
| `productSearchIndexTable` | 622 | Semantik arama + filter kolonları | sku, product_name, brand, main_cat, price, image_url, url, sub_cat, sub_cat2, target_surface, **template_group**, **template_sub_type**, **search_text** (searchable) |
| `productContentTable` | 622 | Uygulama rehberi | sku, fullDescription, howToUse, whenToUse, whyThisProduct |
| `productSpecsTable` | 622 | Teknik özellikler (JSON string) | sku, template_group, template_sub_type, specs_object |
| `productFaqTable` | 2,119 | Ürün başına SSS | sku, question (searchable), answer (searchable) |
| `productRelationsTable` | 622 | İlişkiler (virgül-ayrılmış SKU list) | sku, use_before, use_after, use_with, accessories, alternatives |
| `productCategoriesTable` | 75 | Kategori taksonomisi (pasif) | main_cat, sub_cat, sub_cat2 |

**Toplam:** 5,304 satır. `templateGroup` (25 değer) ve `template_sub_type` (157 değer) chatbot-odaklı custom taxonomy.

### 2.3 Tool katmanı (`src/tools/`)

6 Autonomous Tool. Her biri `Autonomous.Tool({ name, description, input: Zod, output: Zod, handler })` pattern.

#### searchProducts (en kritik)
Hibrit retrieval:
1. **Pre-filter** (MongoDB-style): `templateGroup`, `templateSubType`, `brand`, `mainCat`, `subCat`
2. **Semantic search** (`search` param): `search_text` vector index
3. **Post-filter** (`exactMatch`): `product_name` içinde substring kontrol
4. Oversample: exactMatch varsa limit×5, değilse limit kadar

```ts
const filter: Record<string, unknown> = {};
if (templateGroup)   filter.template_group = { $eq: templateGroup };
if (templateSubType) filter.template_sub_type = { $eq: templateSubType };
if (brand)           filter.brand = { $eq: brand };
if (mainCat)         filter.main_cat = { $regex: mainCat, $options: 'i' };
if (subCat)          filter.sub_cat = { $regex: subCat, $options: 'i' };

const res = await client.findTableRows({
  table: 'productSearchIndexTable',
  search: query,           // vector search
  filter,                  // pre-filter
  limit: fetchLimit,
});

// Post-filter
if (exactMatch) {
  filteredRows = filteredRows.filter(r =>
    r.product_name.toLowerCase().includes(exactMatch.toLowerCase())
  );
}
```

#### getProductDetails
4 tablo paralel sorgu: master + specs + faq + content. Zengin JSON döndürür (URL, görsel, teknik specs, FAQs, howToUse).

#### getApplicationGuide
master + content paralel. Uygulama odaklı hafif varyant (specs/faq olmadan).

#### searchByPriceRange
`productsMasterTable` üzerinde `$gte`/`$lte` filter + `orderBy: 'price'`. "Wetcoat'tan pahalı" gibi sorguları handle eder.

#### getRelatedProducts
İki aşamalı: relations tablosundan SKU listesi oku (virgül-split) → master'dan `$in` ile tam satırları çek.

#### searchFaq
`productFaqTable.question+answer` üzerinde vector search. LLM'in FAQ'ı ayrı çağırması için.

### 2.4 JSX Render contract

Botpress runtime'ın kabul ettiği component şeması `@botpress/runtime/dist/runtime/chat/components.d.ts`'de yazılı. Kritik noktalar:

| Component | Props | Children? |
|---|---|---|
| `<Message>` | `type?: "error"\|"info"\|"success"\|"prompt"` | Evet (string veya component) |
| `<Card>` | `title` (req), `subtitle?`, `imageUrl?`, `actions: [{action, label, value}]` | **YOK** (leaf) |
| `<Carousel>` | `items: CardItem[]` | **YOK** (items prop only) |
| `<Choice>` | `text`, `options: [{label, value}]` | **YOK** (options prop only) |
| `<Image>` | `imageUrl` (req), `title?` | YOK |
| `<Button>` | **COMPONENT DEĞİL** — Card.actions veya Choice.options içinde `{action, label, value}` object | — |

**`actions[].value` NON-EMPTY string olmak zorunda.** Boş URL crash verir.

15 ürün için URL boş olabilir (site'de yok). Instructions bunları text fallback olarak gösteriyor:

```tsx
const validResults = results.filter(p => p.url && p.url.length > 0);
const textOnly = results.filter(p => !p.url);

if (validResults.length > 0) {
  yield <Message>
    <Carousel items={validResults.map(p => ({
      title: p.productName,
      subtitle: p.price.toLocaleString('tr-TR') + ' TL',
      imageUrl: p.imageUrl || undefined,
      actions: [{ action: "url", label: "Ürün Sayfasına Git", value: p.url }]
    }))} />
  </Message>
}
if (textOnly.length > 0) {
  // Plain text listesi, URL yok
}
```

## 3. Veri akışı (ingestion pipeline)

```
assets/Products_with_barcode.csv   ←  URL + barcode otorite
       │
       ▼
Scripts/refresh_data.py             ←  Manual URLs + SKU match + enrichment
       │  1. Manual URLs (en yüksek öncelik)
       │  2. Barcode match
       │  3. SKU direct match
       │  4. Normalized SKU (leading zero, noktalar)
       │  5. Normalized product name
       ▼
output/csv/products_master.csv      ←  13 kolon (+url)
output/csv/product_search_index.csv ←  13 kolon (+sub_cat, +target_surface, +template_group, +template_sub_type)
output/csv/product_content.csv      ←  5 kolon (duplicate'lar silindi)
       │
       ▼
Botpress/detailagent/scripts/seed.ts   ←  Bun/TS script, batch 100/call
       │  client.createTableRows({table, rows})
       ▼
Botpress Cloud Tables (canonical storage)
       │
       ▼
searchProducts tool → findTableRows({search, filter}) → LLM → Card/Carousel
```

## 4. Bilinen ADK sınırlamaları

### 4.1 `tables` block bug (v1.17.0)

`.adk/bot/bot.definition.ts` dosyasında `tables: {...}` bloğu code-gen tarafından oluşturulmuyor. `.adk/bot/src/tables.ts` 7 tabloyu doğru import ediyor ama BotDefinition constructor'una enjekte edilmiyor.

**Etki:**
- `adk dev` startup log'unda 7 uyarı: "Table X was previously defined but is not present in your bot definition"
- Cloud dashboard'da tablo visibility eksik olabilir
- Şema migration otomatik değil (biz manuel clear+reseed yapıyoruz)

**Kritik olmayan** — `client.findTableRows` runtime'da tablolara ID ile erişebiliyor. 874-span test'te 0 error. Fonksiyonel etki yok.

**Çözüm yok** — ADK binary code-gen'de fix gerekiyor, Botpress team'e upstream.

### 4.2 `deleteTable` runtime'da yok

`@botpress/client` paketinde `deleteTable` var ama `@botpress/runtime`'daki wrapper client bu metodu expose etmiyor. Tablo silmek için Botpress Cloud dashboard'a manuel girmek gerekiyor.

**Workaround:** `scripts/clear-tables.ts` kullan — tabloları silmez, sadece satırları temizler (async job via `deleteTableRows`). Sonra seed yeniden yüklüyor.

### 4.3 `adk run` için bun PATH gereksinimi

`adk run` komutu bun binary'ye ihtiyaç duyar ama PATH'e eklemez. Her komut öncesinde:

```bash
PATH="$HOME/.bun/bin:$PATH" adk run scripts/X.ts
```

## 5. Faz geçmişi

| Faz | Konu | Sonuç |
|---|---|---|
| v1-v4 | Instructions iterasyonları | Retry loop'lar, BUTTON crash'ler |
| v5 | **JSX contract fix** — Button→Choice, Carousel items, Card leaf | 38 error → 0 error |
| v5.1 | Text fallback (iptal, v5.4 ile birleşti) | — |
| v5.4 | **Schema + data refresh** — URL backfill, template_group/sub_type search_index'e | 609/622 URL dolu, 0 crash |
| v5.5 | **Cerrahi URL upsert** — 5 manuel URL | 614/622 URL dolu |
| v6.0 | **Knowledge cleanup + docs** | Ölü kod silindi, dokümantasyon yazıldı |

## 6. Referanslar

- [Botpress ADK Docs](https://botpress.com/docs/adk)
- [`@botpress/runtime` components.d.ts](../node_modules/@botpress/runtime/dist/runtime/chat/components.d.ts)
- [LLMz paradigma](https://botpress.com/docs/adk/concepts/autonomous)
