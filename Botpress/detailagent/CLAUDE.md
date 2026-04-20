# detailagent (v9.2) — Botpress Tables Bot

> **Status: FROZEN (v9.2).** Yeni retrieval iyileştirmeleri **`Botpress/detailagent-ms/`** (microservice varyantı) üzerinden geliyor. Buraya yalnızca **bugfix** veya **içerik güncellemesi** (manuel URL, yeni FAQ, barcode) amacıyla dokun.

## Ne yapar bu bot?

MTS Kimya CARCAREAİ (auto detailing) ürün danışmanı. Kullanıcı Türkçe sorar; LLM (Gemini 2.5 Flash, **Botpress LLMz Autonomous** paradigması), 6 tool arasından uygun olanı TypeScript kod olarak üretir, Botpress Cloud Tables üzerinde arar, `<Carousel>` / `<Card>` / `<Choice>` JSX ile döner.

**Identity:**

- botId: `7228621c-573d-427d-afad-f759553e0bc2` ([agent.json](agent.json))
- Workspace: `wkspace_01KCCKM30YFWT88HC0NBHXP4J7`
- Model: Gemini 2.5 Flash, temperature 0.2
- Channel: `*`

## Hangi dokümanı ne zaman okumalı?

| Amaç | Dosya |
|---|---|
| **Ne yapıyor + akış + tablo şeması** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Nasıl çalıştırılır + deploy + trace debug** | [docs/RUNBOOK.md](docs/RUNBOOK.md) |
| **Microservice geçiş planı** | `/Users/projectx/.claude/plans/products-jsons-klas-r-ndeki-dosyalara-dazzling-acorn.md` |
| **Görsel mimari** | `docs/*.drawio` (3 diagram) |

## Kritik dosyalar

- [src/conversations/index.ts](src/conversations/index.ts) — Tek conversation handler + ~615 satır instructions (tool seçimi, JSX kuralları, stil)
- [src/tools/](src/tools/) — 6 Autonomous Tool: `search-products`, `search-faq`, `get-product-details`, `get-related-products`, `search-by-price-range`, `search-by-rating`
- [src/tables/](src/tables/) — 7 Zod-tipli Botpress Cloud table tanımı (~5.300 satır veri)
- [scripts/seed.ts](scripts/seed.ts) — `data/csv/*.csv` → Botpress Cloud, batch 100
- [scripts/full-refresh.ts](scripts/full-refresh.ts) — `etl/refresh_data.py` + clear + reseed pipeline
- [scripts/update-urls.ts](scripts/update-urls.ts) — Cerrahi URL upsert (manuel URL haritası)

## Veri kaynağı

Root'taki **`data/csv/*.csv`** (`output/` değil — 2026-04-20'de rename edildi). ETL: **`etl/refresh_data.py`** (`Scripts/` değil — aynı tarihte rename). Ham JSON'lar: `product-groups/`.

## Çalıştırma komutları

```bash
adk dev                                                     # hot-reload dev server
PATH="$HOME/.bun/bin:$PATH" adk run scripts/seed.ts         # tabloları yükle
PATH="$HOME/.bun/bin:$PATH" adk run scripts/full-refresh.ts # tam reseed pipeline
adk build && adk deploy                                     # prod deploy
adk chat                                                    # CLI'den test
```

> `adk run` bun binary'sine ihtiyaç duyar ve PATH'e eklemez — her seferinde `PATH="$HOME/.bun/bin:$PATH"` yaz (veya `.zshrc`'e kalıcı ekle).

## v9.2 kısıtları (microservice'e geçiş sebebi)

Mevcut Botpress Tables retrieval'i şu limitlere takılıyor:

1. Semantik search tokenizer İngilizce ağırlıklı → Türkçe eş anlamlı kaçıyor (cila = polisaj = pasta)
2. `$or`/`$and` filter kırık → kompleks filter yazılamıyor
3. DB-side word-boundary yok → "Menzerna 400" aramasında 2500 de çıkıyor (false positive)
4. 4KB row limit → `fullDescription` parçalanmış, 6 paralel query = ~500ms latency
5. Prompt caching yok, re-ranker yok, query-level explainability yok

**Çözüm:** `retrieval-service/` (Fly.io + Supabase pgvector + Gemini embed + Turkish FTS + HNSW + RRF fusion). detailagent-ms tool handler'ları bu microservice'e HTTP call atacak. Planın Phase 4-6'sı.

## Bu bot'ta YAPILMAZ

- ❌ Instructions veya tool contract değişikliği (production paritesi korunuyor)
- ❌ Yeni tablo şeması (microservice tarafında Supabase'e gidiyor)
- ❌ Feature flag / "seç" mantığı (LLM tek path bilmeli — saflık)
- ✅ Manuel URL ekleme, yeni FAQ seed, barcode fix, içerik düzeltme
- ✅ Kritik production bug (JSX crash, filter hatası) fix

Yeni iyileştirme önerisi gelirse → detailagent-ms'te yap, buraya dokunma.

## Build / Typecheck

```bash
adk build          # 0 error/warning beklenir
npx tsc --noEmit   # hızlı typecheck
```

Deploy öncesi ikisi de temiz olmalı.

---

## ADK Primitives (referans)

| Klasör | Amaç |
|---|---|
| `src/conversations/` | Mesaj handler (primary user interaction) |
| `src/tools/` | LLM'in çağırabileceği fonksiyonlar |
| `src/tables/` | Cloud table tanımları (Zod) |
| `src/actions/` | Reusable business logic (şu an kullanılmıyor) |
| `src/workflows/` | Long-running background processes (şu an kullanılmıyor) |
| `src/knowledge/` | RAG KB sources (şu an kullanılmıyor) |
| `src/triggers/` | Event-based triggers (şu an kullanılmıyor) |
| `agent.config.ts` | Agent config: model, state schema, dependencies |

## ADK Dev Server MCP Tools

`adk dev` çalışırken AI coding assistant'lara şu tool'lar açık:

| Tool | Ne için |
|---|---|
| `adk_send_message` | Bot'a test mesajı gönder |
| `adk_query_traces` | Conversation trace span'larını sorgula |
| `adk_get_dev_logs` | Dev server log / build output |
| `adk_get_agent_info` | Proje bilgisi (name, version, primitives) |
| `adk_list_workflows` / `adk_start_workflow` | Workflow yönetimi |

Kurulum: `adk mcp:init --all`.
