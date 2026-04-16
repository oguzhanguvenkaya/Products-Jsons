# detailagent — MTS Kimya CARCAREAİ

Botpress ADK üzerinde çalışan Türkçe ürün danışmanı chatbot. 622 ürün, 13 marka (GYEON, Menzerna, FRA-BER, Innovacar, Klin, Flex, Little Joe, SGCB, EPOCA, MG PS, MX-PRO, Q1 Tapes, IK Sprayers) içeren araç detailing/bakım ürünleri kataloğu üzerinde semantik arama, ürün önerisi, karşılaştırma ve uygulama rehberliği sunar.

## Mimari özet

- **Runtime:** `@botpress/runtime` 1.17.0, `@botpress/sdk` 6.3.1
- **Agent tipi:** Autonomous (LLMz — kod-üreten ajan)
- **Model:** `google-ai:gemini-2.5-flash`
- **Retrieval:** Botpress Tables built-in vector search (`findTableRows({ search })`)
- **Rendering:** Runtime JSX components (`<Card>`, `<Carousel>`, `<Choice>`) — leaf payload, children değil
- **Tablolar:** 7 tablo, toplam ~5304 satır (master, search_index, content, specs, faq, relations, categories)

Detaylı mimari için bkz. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Hızlı başlangıç

### Ön gereksinimler

```bash
# Node.js (20+)
# Bun (scripts için) — https://bun.sh
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

# ADK CLI
npm install -g @botpress/cli
adk auth login
```

### Projeyi başlat

```bash
cd Botpress/detailagent

# Bağımlılıklar
npm install

# Dev sunucusunu çalıştır (hot reload ile)
adk dev
```

`adk dev` ayaktayken başka terminal:

```bash
# CLI chat ile test
PATH="$HOME/.bun/bin:$PATH" adk chat
```

### Veri yükleme (ilk kurulum)

```bash
# CSV'leri kaynak verilerden üret
cd ../..  # Products Jsons kök klasörüne
python3 Scripts/refresh_data.py

# Botpress tablolarına yükle
cd Botpress/detailagent
PATH="$HOME/.bun/bin:$PATH" adk run scripts/seed.ts
```

Detaylı operasyonel rehber için bkz. [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Proje yapısı

```
detailagent/
├── agent.config.ts            # Bot adı, model, state, dependencies
├── src/
│   ├── conversations/index.ts # Ana conversation handler + instructions
│   ├── tables/                # 7 tablo tanımı
│   │   ├── products-master.ts
│   │   ├── product-search-index.ts
│   │   ├── product-content.ts
│   │   ├── product-specs.ts
│   │   ├── product-faq.ts
│   │   ├── product-relations.ts
│   │   └── product-categories.ts
│   ├── tools/                 # 6 autonomous tool
│   │   ├── search-products.ts
│   │   ├── search-faq.ts
│   │   ├── get-product-details.ts
│   │   ├── get-application-guide.ts
│   │   ├── search-by-price-range.ts
│   │   └── get-related-products.ts
│   ├── actions/               # (şu an boş)
│   ├── workflows/             # (şu an boş)
│   └── triggers/              # (şu an boş)
└── scripts/
    ├── seed.ts                # Tüm tabloları CSV'den yükle
    ├── clear-tables.ts        # Tablo satırlarını temizle (drop değil)
    ├── update-urls.ts         # Cerrahi URL upsert (v5.5)
    ├── verify-schema.ts       # Şema ve veri doğrulama
    └── full-refresh.ts        # Tek komut full pipeline
```

## Temel komutlar

| Komut | Amaç |
|---|---|
| `adk dev` | Dev sunucu + hot reload |
| `adk build` | Tip kontrolü + bundle üret |
| `adk chat` | CLI chat ile test |
| `adk deploy` | Production'a deploy |
| `adk run scripts/seed.ts` | Tabloları yükle (ilk seed) |
| `adk run scripts/verify-schema.ts` | Şema + filter doğrulama |
| `adk run scripts/full-refresh.ts` | Tam pipeline (destructive) |

## Araçlar (tools)

1. **`searchProducts`** — Hibrit semantik arama. Filter parametreleri: `templateGroup` (25 kategori), `templateSubType` (157 granüler tip), `brand`, `exactMatch`, `mainCat`, `subCat`.
2. **`searchFaq`** — 2,119 SSS üzerinde semantik arama (ürün-başına Q&A)
3. **`getProductDetails`** — SKU üzerinden 4 tablo join (master + specs + faq + content)
4. **`getApplicationGuide`** — Yapılandırılmış uygulama rehberi (howToUse, whenToUse, whyThisProduct)
5. **`searchByPriceRange`** — Fiyat aralığı + kategori + marka filtresi
6. **`getRelatedProducts`** — Relations tablosundan use_with/alternatives/accessories

## Veri kaynakları

- `../../output/csv/*.csv` — 7 tablo CSV'leri (Scripts/ altındaki Python pipeline ile üretiliyor)
- `../../assets/Products_with_barcode.csv` — URL ve barkod otorite kaynağı
- `../../assets/manual_urls.csv` — Manuel eşleştirilmiş URL'ler (v5.5)

## Bilinen konular

- **tables block bug (ADK v1.17.0):** `adk build` çıktısındaki `bot.definition.ts` dosyasında `tables: {...}` bloğu oluşturulmuyor. `adk dev` startup'ında "Table X was previously defined but is not present" uyarıları çıkar. Fonksiyonel etki yok — runtime tablolara doğrudan `client.findTableRows` ile erişebiliyor. Detay: [`docs/RUNBOOK.md`](docs/RUNBOOK.md#bilinen-adk-bugları).

## Geçmiş fazlar

- **Faz 1** (v5): JSX contract fix — runtime component şemasına uyumlu instructions (Button→Choice, Carousel items array, Card leaf payload)
- **Faz 1.1** (v5.4): Schema + data refresh — URL backfill, template_group/sub_type search_index'e taşıma, productContentTable temizliği
- **Faz 1.1** (v5.5): Cerrahi URL upsert — 5 manuel URL mapping (609/622 → 614/622 matched)
- **Faz 2** (v6.0): Knowledge ölü kod temizliği + dokümantasyon (bu)

## Lisans

İç proje. MTS Kimya için özelleştirilmiş.
