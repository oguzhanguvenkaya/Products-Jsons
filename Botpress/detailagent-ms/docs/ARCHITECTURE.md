# Mimari — detailagent-ms (v10, microservice variant)

> Phase 2 başlangıcı. Bu doküman **hedef mimariyi** (Phase 6 cutover sonrası) ve **bugünkü ara durumu** (v9.2 klonu) birlikte anlatır.

Son güncelleme: 2026-04-20

## 1. Genel bakış — hedef mimari

```
┌────────────────────────────────────────────────────────┐
│  Botpress Cloud Runtime (detailagent-ms bot, us-east)  │
│  • LLMz Autonomous (Gemini 2.5 Flash, temp 0.2)        │
│  • Conversation state (selectedBrand/Category/surface) │
│  • Transcript, widgets (Carousel/Card/Choice)          │
│                                                        │
│  Tool handler'lar — HTTP client + shared-secret auth:  │
│    searchProducts    ──┐                               │
│    searchFaq         ──┤                               │
│    getProductDetails ──┤                               │
│    getRelatedProducts──┼──→ HTTPS keep-alive pool      │
│    searchByPriceRange──┤                               │
│    searchByRating    ──┘                               │
└──────────────────┬─────────────────────────────────────┘
                   │ ~30-80ms (co-located AWS us-east-1)
                   ▼
┌────────────────────────────────────────────────────────┐
│  retrieval-service (Fly.io iad)                        │
│  Stack: Bun + Hono + postgres.js + Drizzle + zod       │
│  2 machine active-active, 256MB, keep-warm             │
│                                                        │
│  Endpoints:                                            │
│    POST /search          hybrid retrieval              │
│    POST /faq             FAQ search (scope-aware)      │
│    GET  /products/:sku   master + specs + content JOIN │
│    GET  /products/:sku/related                         │
│    POST /search/price                                  │
│    POST /search/rating                                 │
│    GET  /health, /metrics                              │
│                                                        │
│  Pipeline (her /search):                               │
│    1. zod validation + shared-secret auth              │
│    2. Turkish normalize (lower, unaccent)              │
│    3. Synonym expand (synonyms tablosu)                │
│    4. Slot extract (brand/cat/price regex)             │
│    5. Embedding: LRU cache → Gemini API                │
│    6. Parallel: BM25 (tsvector) + vector (HNSW)        │
│    7. RRF fusion (k=60)                                │
│    8. Business boosts (rating/stock/featured)          │
│    9. Format → {carouselItems, summaries, debug}       │
└────┬───────────────────────────────────────────────────┘
     │ 15-40ms
     ▼
┌──────────────────────────────────────────────────────┐
│  Supabase Postgres (us-east-1, pgvector 0.8+)        │
│  <project-ref>.supabase.co                           │
│                                                      │
│  Tablolar:                                           │
│    products              511 (canonical)             │
│    product_embeddings    511 (Gemini embedding-001)  │
│    product_search        511 (Turkish tsvector, GIN) │
│    product_faqs        3.156 (scope: product/brand/  │
│                               category, embedded)    │
│    product_relations   1.287                         │
│    product_meta        1.961 (EAV)                   │
│    synonyms               37 (TR detailing domain)   │
│                                                      │
│  RLS: tüm tablolarda enable, policy yok (deny-all    │
│       except service_role). Microservice service     │
│       role ile erişir.                               │
└──────────────────────────────────────────────────────┘
```

**Latency bütçesi (hedef):**

| Aşama | Süre |
|---|---|
| Botpress → microservice HTTP | 30-80ms |
| Query normalize + synonym | 2-5ms |
| Embedding cache hit / miss | 1-3ms / 80-150ms |
| BM25 + vector paralel | 15-40ms |
| RRF + boost + format | 5-10ms |
| **Toplam cache hit / miss** | **55-140ms / 130-290ms** |
| Mevcut Botpress Tables search | 300-500ms |
| **Net kazanç** | **~150-350ms/query** |

## 2. Bugünkü durum (Phase 2 başlangıcı)

Bu bot `detailagent/` v9.2'nin **rsync klonu.** `node_modules`, `.adk`, `output`, `.env`, `innovacar_blog`, `bun.lock` hariç tutuldu. Tool handler'lar hala Botpress Cloud Tables'a bağlı çünkü:

- `retrieval-service/` HTTP endpoint'leri henüz hazır değil (Phase 2 işi)
- Tool handler refactor Phase 4'te

Davranış şu an v9.2 ile aynı. Aradaki fark: hedef klasör yapısı ve identity farklı, Phase 4'te içerik evrilecek.

## 3. Faz faz geçiş

### Phase 1 — Data Layer ✅ (tamam)

Supabase us-east-1 projesi açıldı. 4 migration apply edildi:

- `001_extensions` — pgvector, unaccent, pg_trgm, btree_gin
- `002_core_schema` — 7 tablo + HNSW + GIN + generated tsvector + trigger
- `003_rls_lockdown` — tüm tablolarda RLS enable (service_role-only pattern)
- `004_security_hardening` — `touch_updated_at` search_path lock

Seed tamam: 511 ürün, 3.156 FAQ (product=2962, brand=184, category=10), 1.287 relation, 1.961 meta, 37 synonym. Tüm embedding'ler Gemini `gemini-embedding-001` ile 768 dim. Smoke test geçti (Menzerna vector top 5 aynı domain, Turkish FTS "seramik kaplama parlak" → hepsi GYEON).

### Phase 2 — Microservice İskelet 🟡 (başlıyor)

`retrieval-service/` içinde şu an var:
- `package.json`, `tsconfig`, [src/lib/env.ts](../../../retrieval-service/src/lib/env.ts), [src/lib/db.ts](../../../retrieval-service/src/lib/db.ts), [src/lib/embed.ts](../../../retrieval-service/src/lib/embed.ts)
- 8 seed/embed script

Phase 2'de eklenecek:
- Hono HTTP server + route'lar
- Shared-secret auth middleware
- `/health`, `/metrics`
- Keep-alive pool, 2s timeout
- In-memory LRU cache (`lru-cache` paketi)
- Fly.io `fly.toml` + `fly launch` + 2 machine iad

### Phase 3 — Hybrid Retrieval

`retrieval-service/src/search.ts` pipeline:

```typescript
async function search(input: SearchInput): Promise<SearchResult> {
  const { query, filters, limit = 10 } = input;
  const normalized = normalizeTurkish(query);
  const expanded = await expandSynonyms(normalized);
  const slots = extractSlots(expanded);  // brand, category, priceMax

  const embedding = await embedCached(expanded);  // LRU → Gemini

  const [bm25, vec] = await Promise.all([
    db.execute(sql`
      SELECT p.sku, ts_rank_cd(ps.search_vector, query) AS score
      FROM product_search ps
      JOIN products p USING (sku),
           plainto_tsquery('turkish', ${expanded}) query
      WHERE ps.search_vector @@ query ${buildFilterClause(filters, slots)}
      ORDER BY score DESC LIMIT 50
    `),
    db.execute(sql`
      SELECT p.sku, 1 - (pe.embedding <=> ${embedding}::vector) AS score
      FROM product_embeddings pe
      JOIN products p USING (sku)
      WHERE true ${buildFilterClause(filters, slots)}
      ORDER BY pe.embedding <=> ${embedding}::vector LIMIT 50
    `),
  ]);

  const fused = reciprocalRankFusion([bm25.rows, vec.rows], { k: 60 });
  const boosted = fused.map((r) => ({
    ...r,
    final: r.rrf_score
      * (1 + 0.08 * (r.rating ?? 3) / 5)
      * (r.stock_status === 'in_stock' ? 1.05 : 0.85)
      * (r.is_featured ? 1.10 : 1.0),
  })).sort((a, b) => b.final - a.final);

  return {
    carouselItems: boosted.slice(0, limit).map(toCarouselItem),
    textFallbackLines: boosted.slice(0, limit).map(toFallbackLine),
    productSummaries: boosted.slice(0, limit).map(toSummary),
    totalReturned: boosted.length,
    debug: { slots, bm25Count: bm25.rows.length, vecCount: vec.rows.length },
  };
}
```

### Phase 4 — Tool Cutover

6 tool handler'ı HTTP call'a çevir:

```typescript
// src/tools/search-products.ts (Phase 4 sonrası)
handler: async (input) => {
  const res = await fetch(`${env.RETRIEVAL_SERVICE_URL}/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RETRIEVAL_SHARED_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`Retrieval failed: ${res.status}`);
  return await res.json();
}
```

Feature flag değil — klasör duplicate'i + instruction saflığı: detailagent-ms'in tek bildiği path microservice.

### Phase 5 — Shadow Mode

Microservice production'a açılmadan önce dual-call:
- detailagent-ms Botpress Tables'ı çağırır (baseline)
- Aynı anda microservice'e de request atar (shadow)
- Top-3 overlap rate raporu, hedef ≥%85

### Phase 6 — A/B + Cutover

%10 trafik (48 saat) → %100. Rollback provası: feature flag ile 10dk içinde %100 Botpress Tables'a dönüş.

## 4. Instruction saflığı

LLM'e iki path göstermiyoruz. Tool'un adı/açıklaması/input contract'ı aynı; handler içinde HTTP call olduğunu LLM bilmez. Instruction dosyası Phase 4'te **yalnızca response alanları değiştiyse** (örn. yeni `debug` alanı) güncellenir.

## 5. Veri senkronizasyonu (cutover öncesi)

Phase 1-3 arasında Supabase source-of-truth kabul edildi ama Botpress Tables paralel seed'i devam. Cutover sonrası:

- `etl/refresh_data.py` sadece Postgres'e yazacak (Botpress Tables yazımı silinir)
- v9.2 detailagent deprecate edilir

**Bugün (Phase 2):** `etl/refresh_data.py` CSV üretir → hem `Botpress/detailagent/scripts/seed.ts` (Botpress Tables) hem `retrieval-service/scripts/seed-*.ts` (Supabase) aynı `data/csv/`'yi okur.

## 6. Risk + Mitigation

| Risk | Mitigation |
|---|---|
| Cross-region latency (Botpress region belirsiz) | Shadow mode'da gerçek p50/p95 ölç; >200ms sürekli artışta Botpress support'a sor |
| Embedding cache miss storm | LRU TTL 24h, top-500 popüler sorgu pre-warm |
| RRF ağırlık tuning | Offline Promptfoo eval harness, her değişiklik replay + recall@k |
| Gemini model değişimi → stale embedding | `embedding_version` alanı (zaten var: `gemini-embedding-001-v1`), periyodik re-index cron |
| Supabase pooler bottleneck | Transaction pooler (aws-1-us-east-1.pooler), pool size ≥20 |
| Data drift (Botpress vs PG) | PG source-of-truth, cutover sonrası Botpress Tables silinir |

## 7. Referanslar

- [Microservice kodu](../../../retrieval-service/)
- [Ana geçiş planı](../../../.claude/plans/products-jsons-klas-r-ndeki-dosyalara-dazzling-acorn.md)
- [Supabase MCP config](../../../.mcp.json)
- [detailagent (v9.2 frozen)](../../detailagent/docs/ARCHITECTURE.md)
- Görsel mimari: `docs/*.drawio`
