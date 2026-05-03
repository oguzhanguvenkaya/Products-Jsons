# detailagent-ms (v10) — Microservice Bot

> **Son güncelleme:** 2026-04-27 · **Branch:** `feat/phase-4.9-catalog-atelier` · **Status:** ACTIVE production-ready

MTS Kimya CARCAREAİ — Türkçe ürün danışmanı. Botpress LLMz Autonomous + Gemini 3 Flash + sibling `retrieval-service/` (Bun + Hono + Supabase + pgvector).

> **Tam mimari ve referans:** [`/docs/PROJECT_BRIEFING.md`](../../docs/PROJECT_BRIEFING.md) (1.339 satır, master doc)

## Mevcut durum (özet)

- **Tool handler'lar microservice HTTP'ye cutover edildi** — `src/lib/retrieval-client.ts` üzerinden 7 tool retrieval-service'e POST atıyor
- **Bot tarafında veri layer YOK** — Botpress Cloud Tables kullanılmıyor; tüm veri Supabase Postgres üzerinde, microservice arabuluyor
- **Phase 1, 2R, 4 ve 19 TAMAMLANDI** — canonical key migration, taxonomy refactor, tool cutover, post-feedback fixes hepsi DB'ye uygulandı
- **Phase 4.9 admin UI shipped** — sibling [admin-ui/](../../admin-ui/) Catalog Atelier (staging→commit workflow)
- **Phase 5/6 (shadow mode + production cutover) bekliyor** — şu an dev/staging'de

## Identity

| Alan | Değer |
|---|---|
| botId (devId) | `f29b900e-643e-4851-9866-f7c62cdeab73` ([agent.local.json](agent.local.json)) |
| Workspace | `wkspace_01KCCKM30YFWT88HC0NBHXP4J7` |
| Model | **Gemini 3 Flash** (`google-ai:gemini-3-flash`, temp 0.2) |
| Embedding (microservice) | Gemini `text-embedding-001` (768 dim, LRU cache TTL 24h) |

## State şeması (sadece 2 field — 2026-04-26 cleanup)

```ts
state: z.object({
  lastProducts: array<{sku, productName, brand, price}>  // max 5, multi-turn context
  lastFocusSku: string | null                            // searchFaq SKU-filtre
})
```

Eski `selectedBrand/selectedCategory/surfaceType/lastFaqAnswer` field'ları **kaldırıldı** (transcript LLMz tarafından zaten gönderiliyor, redundant). Detay: PROJECT_BRIEFING §8.2.

## Kritik dosyalar

| Dosya | Rol |
|---|---|
| [src/conversations/index.ts](src/conversations/index.ts) | Conversation handler + onAfterTool hook (searchProducts/searchByPriceRange/rankBySpec → state.lastProducts) + instruction (Phase 1.1 sonrası refactor edilmiş) |
| [src/tools/](src/tools/) | 7 tool — searchProducts, searchFaq, getProductDetails, getApplicationGuide, searchByPriceRange, rankBySpec, getRelatedProducts |
| [src/lib/retrieval-client.ts](src/lib/retrieval-client.ts) | HTTP client, Bearer auth, **5000ms timeout** (Phase 1.1: 3s'den çıkartıldı, cold Gemini embedding call'larında ERROR yaşanıyordu) |
| [agent.config.ts](agent.config.ts) | Bot config: model, bot.state (botName/storeUrl/contactInfo) |
| `.env` | `RETRIEVAL_SERVICE_URL`, `RETRIEVAL_SHARED_SECRET`, `BOTPRESS_TOKEN` |

## 7 Tool — Hızlı referans

| Tool | Amaç | Endpoint |
|---|---|---|
| `searchProducts` | Hibrit ürün arama (BM25 + vector + RRF + slot extraction + meta filter) | POST /search |
| `searchFaq` | FAQ semantic (SKU-bypass + confidence tier high/low/none) | POST /faq |
| `getProductDetails` | Tek ürün full bilgi (specs Phase 1 canonical, ratings, FAQs, variants) | GET /products/:sku |
| `getApplicationGuide` | Hafif uygulama rehberi (howToUse + videoCard) | GET /products/:sku/guide |
| `searchByPriceRange` | Variant-aware fiyat sıralama (asc/desc) | POST /search/price |
| `rankBySpec` | Numeric/rating universal ranker — 11 sortKey (durability, volume, cut_level, rating_*, ...) | POST /search/rank-by-spec |
| `getRelatedProducts` | İlişkili ürün (use_with/use_before/use_after/alternatives/accessories) | GET /products/:sku/related |

## Microservice ile eşleşme

Bu bot kendi başına çalışmaz. Sibling servisler:
- **`retrieval-service/`** — HTTP endpoint'leri sağlar (Bun + Hono, port 8787)
- **Supabase Postgres** (us-east-1) — 511 ürün + 3.156 FAQ + 1.287 relation + 1.961 EAV meta + 37 synonym

## Çalıştırma (dev)

3 terminal:

```bash
# Tab 1 — Microservice (önce başlat)
cd retrieval-service
bun run dev                               # :8787

# Tab 2 — Bot
cd Botpress/detailagent-ms
adk dev                                   # :3000, hot-reload tunnel

# Tab 3 — Test (opsiyonel CLI; Carousel için browser webchat tercih)
PATH="$HOME/.bun/bin:$PATH" adk chat
```

`adk dev` çıktısındaki tunnel URL'i veya Botpress Cloud studio chat panel'i webchat'e erişim sağlar.

## Build / Typecheck

```bash
adk build          # 0 error/warning beklenir
npx tsc --noEmit   # hızlı typecheck
```

`.adk/bot/bot.definition.ts` autogen dosyasında integration config TS error'u (`configuration` missing) **pre-existing** ve build'i etkilemiyor — ignorable.

## Phase 1.1 ile çözülenler

- ✅ **slotExtractor `metal parlatici` duplicate** — polish'ten silindi, sadece solid_compound altında
- ✅ **Instruction bloat** — rating kuralı 9→1 yer, Adım 2.5/2.6/2.7 tek YIELD ÖNCESİ KONTROL'e birleştirildi, Phase/version notları silindi
- ✅ **retrieval-client timeout 3s → 5s** — cold embedding ERROR'una karşı
- ✅ **searchByRating durability bug** — rankBySpec(durability_months desc) ile objektif ay sıralaması
- ✅ **Business boost no-op risk** — flag-disable (`BUSINESS_BOOST_ENABLED=false` default)
- ✅ **searchByPriceRange** — variant-aware ORDER BY + sortDirection (asc/desc)

## Açık riskler

- **Multi-step LLMz timeout** — agent 4-5 search call'lık döngülere girince 60-100s'de Botpress runtime timeout (instruction "MAX 5 TOOL/TURN" kuralı soft enforcement)
- **rankBySpec rating_* coverage düşük** — sadece ~20 GYEON ürünü `specs.ratings`'e sahip; backend `coverageNote` ile dinamik uyarıyor
- **`.adk/bot/bot.definition.ts` autogen TS error** — `configuration` missing, pre-existing ve build'i etkilemiyor

Detay + yol haritası: PROJECT_BRIEFING §14, §15.

## Bu bot'ta YAPILMAZ

- ❌ detailagent (v9.2 frozen) klasörünü değiştirmek
- ❌ Supabase'i doğrudan bot'tan çağırmak (her zaman microservice üzerinden)
- ❌ Feature flag instruction'ında ("select" pattern) — tek path saflığı
- ✅ Instruction sadeleştirme (rating consolidation, Adım 2.5/2.6/2.7 birleştir)
- ✅ slotExtractor pattern düzeltme (microservice tarafı)
- ✅ Yeni tool eklemek (microservice endpoint önce, bot tool sonra)

## Trace debugging

Bot tarafı:
```bash
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, status, ROUND(duration,0) as ms FROM spans WHERE conversation_id='conv_...' ORDER BY started_at;"
```

Token kullanımı:
```bash
sqlite3 .adk/bot/traces/traces.db \
  "SELECT json_extract(data,'\$.\"ai.system_length\"') FROM spans WHERE name='cognitive.request' ORDER BY started_at DESC LIMIT 5;"
```

Son test verileri (2026-04-26 conv `KQ7JF4`): 6 mesaj, 0 timeout, 0 ERROR, sistem prompt **17.5K token** (state cleanup öncesi 22K idi, %20 düşüş).

## ADK Primitives

| Klasör | Amaç |
|---|---|
| `src/conversations/` | Mesaj handler (channel: '*') |
| `src/tools/` | 7 tool, hepsi HTTP client kullanıyor |
| `src/lib/` | retrieval-client.ts, env.ts |
| `src/actions/`, `src/triggers/`, `src/workflows/` | (boş veya minimal) |
| `agent.config.ts` | Agent config + bot.state |

## ADK Dev Server MCP Tools

`adk dev` çalışırken:

| Tool | Ne için |
|---|---|
| `adk_send_message` | Test mesajı |
| `adk_query_traces` | Trace span sorgu |
| `adk_get_dev_logs` | Dev log |
| `adk_get_agent_info` | Proje bilgisi |

Kurulum: `adk mcp:init --all`.

## Faz tablosu (güncel)

| Faz | Durum | Çıktı |
|---|---|---|
| Phase 1 — Data layer | ✅ | Supabase 7 tablo + embedding |
| Phase 2 — Microservice scaffold | ✅ | Hono + auth + LRU cache |
| Phase 3 — Hybrid retrieval | ✅ | BM25 + vector + RRF (k=60) + slot + boost |
| Phase 4 — Tool cutover | ✅ | 7 tool → HTTP client |
| Phase 4.9 — Admin UI Catalog Atelier | ✅ | staging/commit workflow shipped |
| Phase 1 (canonical keys) | ✅ | durability_months, volume_ml, target_surface[] vb. |
| Phase 2R (taxonomy refactor) | ✅ | spare_part eridi, wash_tools yeni grup |
| Phase 19 (post-feedback) | ✅ | solid_compound, air_equipment rename, marin renormalize |
| Phase 5 — Shadow mode | ⏳ | Beklemede (eval corpus oluşturulacak) |
| Phase 6 — A/B + cutover | ⏳ | %10→%100 trafik |
