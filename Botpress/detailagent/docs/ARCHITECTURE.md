# Mimari — detailagent (v9.2, FROZEN)

> **Donmuş sürüm.** Yeni retrieval gelişimi `Botpress/detailagent-ms/` + `retrieval-service/` altında. Burada yalnızca bugfix + içerik güncellemesi.

Son güncelleme: 2026-04-20

## 1. Genel bakış

detailagent bir **Botpress ADK LLMz Autonomous agent**'ıdır. Kullanıcı mesajı geldiğinde LLM (Gemini 2.5 Flash), 6 tool arasından uygun olanı çağıran **TypeScript kodu üretir**. Kod sandbox'ta çalışır, tool'lar Botpress Cloud Tables üzerinden sorgu atar, sonuç JSX payload olarak kullanıcıya döner.

```
User msg
  │
  ▼
Conversation handler (src/conversations/index.ts)
  │  instructions (~615 satır) + 6 tool + state + temp 0.2
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
Runtime message payload validation → User (webchat, CLI)
```

## 2. Katmanlar

### 2.1 Conversation handler

[src/conversations/index.ts](../src/conversations/index.ts) — Tek conversation (`channel: '*'`).

- `state` — `selectedBrand`, `selectedCategory`, `surfaceType` (konuşma boyunca LLM günceller)
- `handler` — LLMz `execute()`: tools + instructions + temperature 0.2

**Instructions** (~615 satır) LLM'e şunu öğretir:
- Rol ve kapsam (MTS Kimya ürün danışmanı, sipariş/kargo kapsam dışı)
- 6 tool'un her biri için ne zaman/nasıl kullanılacağı
- Tool seçimi karar tablosu
- Clarifying question pattern'ları (mikrofiber, şampuan, pasta için)
- JSX component syntax kuralları (Card leaf, Carousel items, Choice options, URL null fallback)
- Yanıt stil/format kuralları

### 2.2 Tablolar (`src/tables/`)

7 tablolu ilişkisel model. Her tablo Zod schema ile tanımlı. Sadece `sku` + search-text kolonları `searchable: true`.

| Tablo | Satır (CSV) | Amaç | Kritik kolonlar |
|---|---:|---|---|
| `productsMasterTable` | 511 | Ana ürün kataloğu (canonical) | sku, barcode, product_name, brand, price, image_url, main_cat, sub_cat, sub_cat2, target_surface, template_group, template_sub_type, **url** |
| `productSearchIndexTable` | 511 | Semantik arama + filter kolonları | sku, product_name, brand, main_cat, price, image_url, url, sub_cat, sub_cat2, target_surface, **template_group**, **template_sub_type**, **search_text** (searchable) |
| `productContentTable` | 511 | Uygulama rehberi | sku, fullDescription, howToUse, whenToUse, whyThisProduct |
| `productSpecsTable` | 511 | Teknik özellikler (JSON string) | sku, template_group, template_sub_type, specs_object |
| `productFaqTable` | ~2.400 | Ürün başına SSS | sku, question (searchable), answer (searchable) |
| `productRelationsTable` | 511 | İlişkiler (virgül-ayrılmış SKU list) | sku, use_before, use_after, use_with, accessories, alternatives |
| `productCategoriesTable` | 75 | Kategori taksonomisi (pasif) | main_cat, sub_cat, sub_cat2 |

**Toplam:** ~5.300 satır. `template_group` (25 değer) ve `template_sub_type` (157 değer) chatbot-odaklı custom taxonomy.

### 2.3 Tool katmanı (`src/tools/`)

6 Autonomous Tool. Pattern: `Autonomous.Tool({ name, description, input: Zod, output: Zod, handler })`.

#### searchProducts (en kritik)

Hibrit retrieval — Botpress Tables'ın semantik search'ü üstüne kendi post-processing'imiz:

1. **Pre-filter** (MongoDB-style): `templateGroup`, `templateSubType`, `brand`, `mainCat`, `subCat`
2. **Semantic search** (`search` param): `search_text` vector index
3. **Post-filter** (`exactMatch`): `product_name` içinde substring kontrol (v9.1'de query-token aware multi-match sort eklendi)
4. Oversample: `exactMatch` varsa `limit×5`, yoksa `limit`

```ts
const filter: Record<string, unknown> = {};
if (templateGroup)   filter.template_group = { $eq: templateGroup };
if (templateSubType) filter.template_sub_type = { $eq: templateSubType };
if (brand)           filter.brand = { $eq: brand };
if (mainCat)         filter.main_cat = { $regex: mainCat, $options: 'i' };
if (subCat)          filter.sub_cat = { $regex: subCat, $options: 'i' };

const res = await client.findTableRows({
  table: 'productSearchIndexTable',
  search: query,           // vector
  filter,                  // pre-filter
  limit: fetchLimit,
});

if (exactMatch) {
  filteredRows = filteredRows.filter(r =>
    r.product_name.toLowerCase().includes(exactMatch.toLowerCase())
  );
}
```

#### searchFaq

`productFaqTable.question+answer` üzerinde vector search. v9.1'de SKU sağlanmışsa semantic ranking bypass edilip tüm FAQ'lar döndürülür (P3 fix).

#### getProductDetails

4 tablo paralel sorgu: master + specs + faq + content. Zengin JSON: URL, görsel, teknik specs, FAQs, howToUse.

#### getRelatedProducts

İki aşamalı: relations tablosundan SKU listesi oku (virgül-split) → master'dan `$in` ile tam satırları çek.

#### searchByPriceRange

`productsMasterTable` üzerinde `$gte`/`$lte` + `orderBy: 'price'`. "Wetcoat'tan pahalı" gibi sorgular.

#### searchByRating (v9.2 eklendi)

Backend-ranked rating tool. `productsMasterTable.rating` üzerinde sort + threshold filter.

### 2.4 JSX Render contract

Botpress runtime'ın kabul ettiği component şeması `@botpress/runtime/dist/runtime/chat/components.d.ts`'de. Kritik noktalar:

| Component | Props | Children? |
|---|---|---|
| `<Message>` | `type?: "error"\|"info"\|"success"\|"prompt"` | Evet |
| `<Card>` | `title` (req), `subtitle?`, `imageUrl?`, `actions: [{action,label,value}]` | **YOK** (leaf) |
| `<Carousel>` | `items: CardItem[]` | **YOK** (items prop) |
| `<Choice>` | `text`, `options: [{label,value}]` | **YOK** (options prop) |
| `<Image>` | `imageUrl` (req), `title?` | YOK |
| `<Button>` | **COMPONENT DEĞİL** — `Card.actions`/`Choice.options` içinde object | — |

**`actions[].value` NON-EMPTY string olmak zorunda.** Boş URL crash verir. ~8 ürün için URL boş — instructions bunları text fallback'e düşürüyor.

```tsx
const validResults = results.filter(p => p.url && p.url.length > 0);
const textOnly = results.filter(p => !p.url);

if (validResults.length > 0) {
  yield <Message>
    <Carousel items={validResults.map(p => ({
      title: p.productName,
      subtitle: `${p.price.toLocaleString('tr-TR')} TL`,
      imageUrl: p.imageUrl || undefined,
      actions: [{ action: "url", label: "Ürün Sayfasına Git", value: p.url }]
    }))} />
  </Message>
}
if (textOnly.length > 0) {
  // Plain text listesi
}
```

## 3. Veri akışı (ingestion pipeline)

```
assets/Products_with_barcode.csv    ←  URL + barcode otorite
       │
       ▼
etl/refresh_data.py                 ←  Manuel URL + SKU match + enrichment
       │  Öncelik sırası:
       │  1. Manual URLs (en yüksek)
       │  2. Barcode match
       │  3. SKU direct match
       │  4. Normalized SKU (leading zero, nokta)
       │  5. Normalized product name
       ▼
data/csv/products_master.csv        ←  13 kolon (+url)
data/csv/product_search_index.csv   ←  13 kolon (+sub_cat, +target_surface, +template_group, +template_sub_type)
data/csv/product_content.csv        ←  5 kolon (dedup uygulanmış)
data/csv/product_faq.csv            ←  ~2.400 satır
data/csv/product_relations.csv      ←  511 satır (virgül-ayrılmış SKU)
data/csv/product_specs.csv          ←  511 satır (JSON specs_object)
data/csv/product_categories.csv     ←  75 satır
       │
       ▼
scripts/seed.ts                     ←  Bun/TS, batch 100/call
       │  client.createTableRows({table, rows})
       ▼
Botpress Cloud Tables (canonical storage)
       │
       ▼
searchProducts tool → findTableRows({search, filter}) → LLM → Card/Carousel
```

**Not:** `data/csv/` hem bu bot'un hem de `retrieval-service/` seed script'inin ortak kaynağı. Rename geçmişi: `output/` → `data/` (2026-04-20), `Scripts/` → `etl/` (2026-04-20).

## 4. v9.2 bilinen sınırlamalar

Bu limitler microservice cutover'ın temel motivasyonu ([detaylı plan](../../../.claude/plans/products-jsons-klas-r-ndeki-dosyalara-dazzling-acorn.md)):

### 4.1 Retrieval limitleri (microservice'te çözülecek)

| Problem | Bugünkü etki | Microservice çözümü |
|---|---|---|
| İngilizce ağırlıklı tokenizer | Türkçe eş anlamlı kaçıyor (cila=polisaj) | Postgres `turkish` FTS + `synonyms` tablosu |
| `$or`/`$and` filter kırık | Kompleks filter yazılamıyor | Native SQL WHERE |
| Word-boundary yok | "Menzerna 400"→2500 false positive | BM25 exact + confidence threshold |
| 4KB row limit | `fullDescription` parçalanmış, 6 paralel query | Tek SQL JOIN, `full_description` tek alan |
| Prompt caching yok | Her turn full cost | LiteLLM cache_control (retrieval-side) |
| Explainability yok | Niye bu ürün geldi belirsiz | `{slots, bm25_score, vec_score, rrf_score}` debug payload |

### 4.2 ADK platform bug'ları (upstream, workaround'lu)

**`tables` block code-gen bug** — `adk dev` startup'ında "Table X was previously defined but is not present in your bot definition" uyarıları. Fonksiyonel etki yok (client.findTableRows runtime'da ID ile erişiyor). Upstream fix gerekiyor, biz workaround'layamayız.

**`deleteTable` runtime'da yok** — `@botpress/runtime` wrapper client `deleteTable` expose etmiyor. `scripts/clear-tables.ts` kullanılır (tabloyu değil satırları async job ile siler).

**`adk run` bun PATH gereksinimi** — `PATH="$HOME/.bun/bin:$PATH" adk run ...`.

## 5. Faz geçmişi (özet)

| Faz | Ne yapıldı |
|---|---|
| v1-v4 | Instructions iterasyonları (retry loop, BUTTON crash) |
| v5 | JSX contract fix (Button→Choice, Carousel items, Card leaf) — 38 error → 0 |
| v5.4-v5.5 | Schema + data refresh, manuel URL backfill |
| v6.0 | Knowledge cleanup + dokümantasyon |
| v7.2 | SKU/content fix, dedup-shared, verify-sync |
| v8.2 | Context retention fix (state'e `selectedBrand/Category/surfaceType`) |
| v9.0 | GYEON enrichment + search/routing fix snapshot |
| v9.1 | Semantic fallback + SKU-aware FAQ + instruction guardrail |
| v9.2 | Query-token aware multi-match sort, searchByRating tool, FAQ SKU bypass |
| **v10** (planlı) | **Microservice** — `detailagent-ms/` + `retrieval-service/` |

## 6. Referanslar

- [Botpress ADK Docs](https://botpress.com/docs/adk)
- [`@botpress/runtime` components.d.ts](../node_modules/@botpress/runtime/dist/runtime/chat/components.d.ts)
- [LLMz Autonomous paradigma](https://botpress.com/docs/adk/concepts/autonomous)
- [Microservice geçiş planı](../../../.claude/plans/products-jsons-klas-r-ndeki-dosyalara-dazzling-acorn.md)
- Görsel mimari: [`bot-architecture.drawio`](./bot-architecture.drawio), [`bot-scenarios.drawio`](./bot-scenarios.drawio), [`system-blueprint.drawio`](./system-blueprint.drawio)
