# detailagent-ms (v10) — Microservice Bot

> **Status: ACTIVE — Phase 2 (microservice HTTP endpoints).** Bu bot `detailagent/` v9.2'nin klonu olarak doğdu; tool handler'ları cutover tamamlandığında Botpress Cloud Tables yerine `retrieval-service/` microservice'ine (Fly.io + Supabase pgvector) HTTP call atacak. Şu an tool'lar hala v9.2 davranışında, **HTTP refactoring Phase 4** işi.

## Ne yapar bu bot?

Aynı MTS Kimya CARCAREAİ ürün danışmanı — **ama retrieval layer'ı Botpress'in dışına taşındı.** Botpress bunu korur:

- LLMz Autonomous paradigması (TS kod üretimi)
- Conversation state, transcript, widget rendering
- Tool contract'ları (input/output şeması aynı)

Botpress'in dışına taşınan:

- Ürün/FAQ/meta/relations storage → **Supabase Postgres** (us-east-1)
- Semantic search → **hybrid retrieval** (Turkish FTS + HNSW vector + RRF fusion)
- Embedding → **Gemini embedding-001** (768 dim)
- Tool handler'lar → **HTTP call** (shared-secret auth, microservice `/search`, `/faq`, `/products/:sku`, vs.)

Kullanıcı için tek fark: aramalar daha doğru, daha hızlı, açıklanabilir.

**Identity:**

- botId: `REPLACE_WITH_NEW_BOT_ID` ← Botpress Cloud'da yeni bot oluşturulduğunda doldurulacak ([agent.json](agent.json))
- Workspace: `wkspace_01KCCKM30YFWT88HC0NBHXP4J7` (detailagent ile aynı workspace)
- Model: Gemini 2.5 Flash (şimdilik detailagent ile aynı; microservice-tarafında Gemini embedding-001 de kullanılıyor)

> ⚠️ **detailagent ile aynı botId KULLANMA.** İki bot aynı token kullanırsa çakışır. Yeni Botpress Cloud bot'u aç, botId'yi `agent.json` ve `.env`'ye yaz.

## Hangi dokümanı ne zaman okumalı?

| Amaç | Dosya |
|---|---|
| **Microservice hedef mimari + fazlar** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Dev/deploy + microservice ile koordinasyon** | [docs/RUNBOOK.md](docs/RUNBOOK.md) |
| **Retrieval servisinin kendisi** | `retrieval-service/` (monorepo sibling) |
| **Ana geçiş planı** | `/Users/projectx/.claude/plans/products-jsons-klas-r-ndeki-dosyalara-dazzling-acorn.md` |

## Kritik dosyalar

- [src/conversations/index.ts](src/conversations/index.ts) — Conversation handler (şu an detailagent ile bire bir, Phase 4'te instruction rewrite)
- [src/tools/](src/tools/) — 6 tool (şu an Botpress Tables handler; Phase 4'te HTTP client'a çevrilecek)
- [agent.json](agent.json) — botId + workspaceId (Botpress Cloud kimliği)
- `.env` — `RETRIEVAL_SERVICE_URL`, `RETRIEVAL_SHARED_SECRET` (Phase 4'te eklenecek)

## Microservice ile eşleşme

Bu bot kendi başına çalışmaz. Sibling servisler:

- **`retrieval-service/`** (monorepo'da, Fly.io'ya deploy edilecek) — HTTP endpoint'leri sağlar: `/search`, `/faq`, `/products/:sku`, `/products/:sku/related`, `/search/price`, `/search/rating`
- **Supabase us-east-1** (proje URL'si `.env`'de tutulur) — 511 ürün + 3.156 FAQ + 1.287 relation + 1.961 meta + 37 synonym (Phase 1'de seed edildi, embedding'ler hazır)

## Çalıştırma komutları

Şu an (Phase 2 başlangıcı) — tool'lar hala Botpress Tables'a bağlı:

```bash
cd Botpress/detailagent-ms
bun install                                 # bağımlılıklar (node_modules klonlanmadı)
adk dev                                     # hot-reload dev server
adk build                                   # 0 error beklenir
npx tsc --noEmit                            # hızlı typecheck
```

**Microservice'i ayağa kaldırmak için** (ayrı terminal):

```bash
cd retrieval-service
bun install
bun run dev                                 # :8787, Phase 2'de implemente edilecek
```

## Geçiş fazları

| Faz | Durum | Çıktı |
|---|---|---|
| Phase 1 — Data layer | ✅ Tamam | Supabase 7 tablo seed + embedding (511 ürün, 3.156 FAQ) |
| Phase 2 — Microservice endpoints | 🟡 Başlıyor | `/health`, `/search` stub, auth middleware, Fly.io deploy |
| Phase 3 — Hybrid retrieval | ⏳ Sonraki | BM25 + vector + RRF + synonym expand + slots + boosts |
| Phase 4 — Tool cutover | ⏳ | 6 tool handler → HTTP call, feature flag, fallback |
| Phase 5 — Shadow mode | ⏳ | Dual-call diff, eval replay, top-3 overlap ≥85% |
| Phase 6 — A/B + cutover | ⏳ | %10 trafik → %100, rollback prova |

## Bu bot'ta YAPILMAZ

- ❌ detailagent'ı değiştirmek (o bot frozen, bu bot'un ikizi)
- ❌ Feature flag / "select" LLM instruction'ında (tek path, saflık)
- ❌ Supabase'i doğrudan bot'tan çağırmak (her zaman microservice üzerinden → auth + cache + observability tek yer)
- ✅ Tool handler'ı HTTP client'a çevirmek (Phase 4)
- ✅ Instruction'ı microservice response contract'ına göre ince ayar (Phase 5+)
- ✅ Yeni tool eklemek (microservice endpoint'i önce, bot tool'u sonra)

## Build / Typecheck

```bash
adk build          # 0 error/warning beklenir
npx tsc --noEmit   # hızlı typecheck
```

Phase 4'te HTTP client refactoring öncesi ikisi de temiz olmalı.

---

## ADK Primitives (referans)

| Klasör | Amaç |
|---|---|
| `src/conversations/` | Mesaj handler |
| `src/tools/` | LLM-callable fonksiyonlar (Phase 4'te HTTP'ye dönecek) |
| `src/tables/` | Cloud table tanımları (Phase 4'te sadeleşebilir) |
| `agent.config.ts` | Agent config |

## ADK Dev Server MCP Tools

`adk dev` çalışırken:

| Tool | Ne için |
|---|---|
| `adk_send_message` | Test mesajı |
| `adk_query_traces` | Trace span sorgu |
| `adk_get_dev_logs` | Dev log |
| `adk_get_agent_info` | Proje bilgisi |

Kurulum: `adk mcp:init --all`.
