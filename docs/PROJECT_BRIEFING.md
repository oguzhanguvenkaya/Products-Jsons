# MTS Kimya CARCAREAİ — Proje Briefing'i

> Bu doküman **farklı bir AI'ya proje context'i vermek** için yazılmıştır. RAG ve agentic AI literatürü ile karşılaştırılabilecek detayda yazıldı; her iddianın `file:line` referansı var.
>
> **Frozen snapshot:** 2026-04-27. Branch: `feat/phase-4.9-catalog-atelier`. Last commit: `0a7e7f5`.

---

## 0. İçindekiler

1. [Yönetici Özeti](#1-yönetici-özeti)
2. [Mimari Genel Bakış](#2-mimari-genel-bakış)
3. [Tech Stack ve Bağımlılıklar](#3-tech-stack-ve-bağımlılıklar)
4. [Veri Katmanı (Supabase)](#4-veri-katmanı-supabase)
5. [Taxonomy: 25 template_group](#5-taxonomy-25-template_group)
6. [Phase Migration Tarihçesi (1 / 2R / 19)](#6-phase-migration-tarihçesi)
7. [Microservice (retrieval-service) Derin Dalış](#7-microservice-retrieval-service-derin-dalış)
8. [Bot (detailagent-ms) Derin Dalış](#8-bot-detailagent-ms-derin-dalış)
9. [6 Tool — Tek Tek Spec](#9-6-tool--tek-tek-spec)
10. [Instruction / Prompt Mimarisi](#10-instruction--prompt-mimarisi)
11. [Anti-Hallucination Stratejileri](#11-anti-hallucination-stratejileri)
12. [Admin UI — Catalog Atelier](#12-admin-ui--catalog-atelier)
13. [Performans, Maliyet, Trace Verisi](#13-performans-maliyet-trace-verisi)
14. [Bilinen Sorunlar ve Açık Sorular](#14-bilinen-sorunlar-ve-açık-sorular)
15. [Yol Haritası](#15-yol-haritası)
16. [RAG / Agentic AI Literatürü ile Karşılaştırma](#16-rag--agentic-ai-literatürü-ile-karşılaştırma)
17. [Önemli Dosya Ağacı](#17-önemli-dosya-ağacı)
18. [Sözlük](#18-sözlük)

---

## 1. Yönetici Özeti

**Proje:** MTS Kimya'nın e-ticaret kataloğu için Türkçe konuşan **ürün danışmanı chatbot**. Otomotiv detailing, polisaj, seramik kaplama, yıkama ve bakım ürünleri (511 SKU, 9 marka).

**Kapsam:** SADECE ürün danışmanlığı (sipariş/kargo/iade kapsam dışı, kullanıcı iletişim sayfasına yönlendirilir).

**Mevcut bot çiftleri:**
- `Botpress/detailagent/` — **v9.2 frozen** (production, Botpress Cloud Tables backend)
- `Botpress/detailagent-ms/` — **v10 microservice variant** (active development; Phase 4 cutover'da retrieval-service'e HTTP call atacak)

**Ana karar:** İkinci bot Phase 6'da production'a alınacak; ilkin shadow mode + A/B test.

**Üç katmanlı sistem:**
```
┌─────────────────────────────────────────────────┐
│  Botpress Cloud (LLMz Autonomous + Gemini 3 F) │  ← bot tarafı
└──────────────────┬──────────────────────────────┘
                   │ HTTPS (Bearer auth)
                   ▼
┌─────────────────────────────────────────────────┐
│  retrieval-service (Bun + Hono, Fly.io iad)    │  ← RAG pipeline
└──────────────────┬──────────────────────────────┘
                   │ postgres.js
                   ▼
┌─────────────────────────────────────────────────┐
│  Supabase Postgres + pgvector (us-east-1)      │  ← veri
└─────────────────────────────────────────────────┘
```

**Veri:** 511 ürün, 3.156 FAQ, 1.287 relation, 1.961 EAV meta, 37 synonym (TR detailing domain).

**LLM:** Google Gemini 3 Flash (`google-ai:gemini-3-flash`), temperature 0.2 — `Botpress/detailagent-ms/agent.config.ts:26`.

**Embedding:** Gemini `text-embedding-001` 768-dim, LRU cache (max 1000, TTL 24h) — `retrieval-service/src/lib/embed.ts:8`.

**Sibling proje:** `admin-ui/` (Next.js + Catalog Atelier design plan, Phase 4.9.0–4.9.12 tamamlandı) — kataloğu yöneten staging→preview→commit workflow.

---

## 2. Mimari Genel Bakış

### Kabaca veri akışı (bir mesaj için)

1. **User** webchat'e mesaj yazar.
2. **Botpress Cloud** mesajı alır → `Conversation` handler'ını tetikler (`detailagent-ms/src/conversations/index.ts`).
3. **State load**: Conversation DB'den `state` (lastProducts + lastFocusSku) ~900ms.
4. **LLMz iteration başlar:**
   - LLM input: System prompt (LLMz wrapper + bizim instruction + tool desc + state) ≈ **17.5K-22K token**
   - LLM TSX kod üretir: `■fn_start ... yield <Carousel items={result.carouselItems} /> ... ■fn_end`
   - TSX parse → tool çağrılır → `retrievalClient.search(...)` HTTP POST → microservice
5. **retrieval-service** pipeline: query normalize → synonym expand → slot extract → embedding (cache lookup) → BM25 + vector parallel → RRF fusion → business boost → format → JSON return.
6. **Tool output** LLM context'e geri injekte → LLM cevap metni + (varsa) Carousel render.
7. **onAfterTool hook** state mutate (`lastProducts`, `lastFocusSku`).
8. **State save** ~300ms.
9. **Output mesajları** kullanıcıya widget olarak yansır.

Tipik turn: **7–15 saniye** (3-7 LLMz iteration × 3-5s LLM + 200-700ms tool latency × N).

### Latency Bütçesi (hedef vs gerçekleşen)

| Aşama | Hedef (ARCHITECTURE.md) | Gerçekleşen (trace, 26 Apr) |
|---|---|---|
| Botpress → microservice HTTP | 30-80ms | 200-700ms (cold), ~200ms warm |
| Query normalize + synonym | 2-5ms | ~3ms |
| Embedding cache hit / miss | 1-3ms / 80-150ms | ~1ms hit / 150-800ms cold |
| BM25 + vector paralel | 15-40ms | ~30-50ms |
| RRF + boost | 5-10ms | ~5ms |
| Total /search | 30-100ms | 200-700ms |
| **Total LLM cognitive call** | — | **3-5s (her iteration)** |
| **Total turn** | — | **7-15s typical, 60-103s edge case** |

---

## 3. Tech Stack ve Bağımlılıklar

### Bot (`Botpress/detailagent-ms/`)

```json
"dependencies": {
  "@botpress/runtime": "^1.17.0",
  "csv-parse": "^6.2.1"
},
"devDependencies": {
  "@botpress/adk": "^1.17.0",
  "typescript": "^5.9.3"
}
```

- **Runtime:** Botpress ADK 1.17 (CLI: `adk dev` / `adk build` / `adk deploy`)
- **Pattern:** LLMz Autonomous (`Botpress/detailagent-ms/agent.config.ts:26` → `defaultModels.autonomous: 'google-ai:gemini-3-flash'`)
- **Channel:** `'*'` — webchat + chat + SDK kanalları (`src/conversations/index.ts:36`)
- **State persistence:** Botpress Cloud conversations DB (load ~900ms, save ~300ms)

### Microservice (`retrieval-service/`)

```json
"dependencies": {
  "@google/genai": "^1.30.0",      // Gemini embedding + LLM client
  "@hono/node-server": "^1.17.1",
  "@hono/zod-validator": "^0.7.6",
  "hono": "^4.9.13",                // Web framework
  "lru-cache": "^11.2.2",           // Embedding cache
  "postgres": "^3.4.7",             // postgres.js (low-level)
  "zod": "^4.1.13"                  // Schema validation
},
"devDependencies": { "@types/bun": "^1.3.0", "csv-parse": "^6.2.1", "typescript": "^5.9.3" }
```

- **Runtime:** Bun (devle hot-reload `bun --watch`, prod `bun src/server.ts`)
- **Deploy hedefi:** Fly.io iad region (Dockerfile + fly.toml mevcut)
- **Port:** 8787 (env'den, `retrieval-service/src/lib/env.ts:19`)

### Veri (Supabase)

- **Postgres** (us-east-1) + **pgvector** 0.8+ (HNSW indeksleme)
- **postgres.js** client (3.4.7) — düşük seviye, prepared statement
- **Migration:** `retrieval-service/migrations/*.sql` (manuel apply, no ORM)

### Admin UI (`admin-ui/`)

- **Next.js 15** (App Router, Server Components — `admin-ui/AGENTS.md` "This is NOT the Next.js you know" uyarısı)
- **Tailwind CSS** (design tokens, "Warm Archive Atelier" tema)
- **Zustand** (catalog state management)
- **Port:** 3005 (ADK 3000/3001'i tutuyor — `admin-ui/CLAUDE.md`)

---

## 4. Veri Katmanı (Supabase)

### 4.1. Tablolar

Migration: `retrieval-service/migrations/002_core_schema.sql`

**`products` (511 satır)** — `migrations/002_core_schema.sql:13-56`

```sql
CREATE TABLE products (
  sku             TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  brand           TEXT NOT NULL,
  main_cat        TEXT,
  sub_cat         TEXT,
  sub_cat2        TEXT,
  template_group  TEXT NOT NULL,           -- 25-enum
  template_sub_type TEXT,                  -- 100+ değer
  target_surface  TEXT[],                  -- array
  price           NUMERIC(10,2),
  rating          NUMERIC(3,2),            -- 0-5
  stock_status    TEXT,                    -- in_stock | out_of_stock
  url             TEXT,
  image_url       TEXT,
  short_description TEXT,
  full_description  TEXT,
  specs           JSONB,                   -- Phase 1 canonical
  sizes           JSONB,                   -- variant array
  variant_skus    TEXT[],
  is_featured     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX idx_products_template_group ON products (template_group);
CREATE INDEX idx_products_brand ON products (brand);
CREATE INDEX idx_products_price ON products (price);
CREATE INDEX idx_products_rating ON products (rating DESC);
CREATE INDEX idx_products_target_surface ON products USING GIN (target_surface);
CREATE INDEX idx_products_specs ON products USING GIN (specs);
CREATE INDEX idx_products_featured ON products (sku) WHERE is_featured = true;
-- Trigger: touch_updated_at on UPDATE
```

**`product_embeddings` (511 satır)** — `migrations/002_core_schema.sql:61-76`

```sql
CREATE TABLE product_embeddings (
  sku               TEXT PRIMARY KEY REFERENCES products(sku) ON DELETE CASCADE,
  embedding         VECTOR(768) NOT NULL,           -- Gemini embedding-001
  embedding_version TEXT,
  source_text       TEXT,                            -- "search_text" snapshot
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_product_embeddings_hnsw ON product_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**`product_search` (511 satır)** — `migrations/002_core_schema.sql:81-95`

```sql
CREATE TABLE product_search (
  sku           TEXT PRIMARY KEY REFERENCES products(sku) ON DELETE CASCADE,
  search_text   TEXT NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', coalesce(search_text, '')), 'A')
  ) STORED,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_product_search_fts ON product_search USING GIN (search_vector);
CREATE INDEX idx_product_search_trgm ON product_search USING GIN (search_text gin_trgm_ops);
```

**`product_faqs` (3.156 satır)** — `migrations/002_core_schema.sql:100-122`

```sql
CREATE TABLE product_faqs (
  id                BIGSERIAL PRIMARY KEY,
  scope             TEXT NOT NULL CHECK (scope IN ('product','brand','category')),
  sku               TEXT REFERENCES products(sku),    -- scope=product ise dolu
  brand             TEXT,                              -- scope=brand
  category          TEXT,                              -- scope=category
  question          TEXT NOT NULL,
  answer            TEXT NOT NULL,
  embedding         VECTOR(768),
  embedding_version TEXT,
  question_vector   TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('turkish', question)
  ) STORED,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_product_faqs_sku ON product_faqs (sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_product_faqs_brand ON product_faqs (brand) WHERE brand IS NOT NULL;
CREATE INDEX idx_product_faqs_scope ON product_faqs (scope);
CREATE INDEX idx_product_faqs_embedding ON product_faqs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_product_faqs_question_vector ON product_faqs USING GIN (question_vector);
```

**`product_relations` (1.287 satır)** — `migrations/002_core_schema.sql:138-148`

```sql
CREATE TABLE product_relations (
  sku           TEXT NOT NULL REFERENCES products(sku),
  related_sku   TEXT NOT NULL REFERENCES products(sku),
  relation_type TEXT NOT NULL,            -- use_with | use_before | use_after | alternatives | accessories
  confidence    NUMERIC(3,2),             -- 0-1
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sku, related_sku, relation_type)
);
CREATE INDEX idx_product_relations_related_sku ON product_relations (related_sku);
CREATE INDEX idx_product_relations_type ON product_relations (relation_type);
```

**`product_meta` (1.961 satır, EAV)** — `migrations/002_core_schema.sql:153-165`

```sql
CREATE TABLE product_meta (
  sku            TEXT NOT NULL REFERENCES products(sku),
  key            TEXT NOT NULL,           -- canonical (Phase 1)
  value_text     TEXT,                    -- array key'lerde pipe-separated: "|chrome|aluminum|"
  value_numeric  NUMERIC,
  value_boolean  BOOLEAN,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sku, key)
);
-- Partial index'ler değer tipine göre
CREATE INDEX idx_product_meta_text   ON product_meta (key, value_text)    WHERE value_text IS NOT NULL;
CREATE INDEX idx_product_meta_num    ON product_meta (key, value_numeric) WHERE value_numeric IS NOT NULL;
CREATE INDEX idx_product_meta_bool   ON product_meta (key, value_boolean) WHERE value_boolean IS NOT NULL;
```

**`synonyms` (37 satır)** — `migrations/002_core_schema.sql:126-133`

```sql
CREATE TABLE synonyms (
  term       TEXT PRIMARY KEY,        -- canonical (örn: "wash mitt")
  aliases    TEXT[] NOT NULL,         -- ["yıkama eldiveni", "yikama eldiveni", "wash sponge"]
  category   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_synonyms_aliases ON synonyms USING GIN (aliases);
```

**`audit_log`** (admin UI commit history için) — `retrieval-service/migrations/006_audit_log.sql`

### 4.2. RLS

**Tüm tablolarda RLS enable, policy yok = deny-all except `service_role`**. Microservice service_role secret ile bağlanır.

### 4.3. EAV Projection — Phase 1 Canonical Keys

Script: [retrieval-service/scripts/project-specs-to-meta.ts](retrieval-service/scripts/project-specs-to-meta.ts)

Akış:
1. **DELETE 22 stale key** (`durability_days`, `volume_liters`, `consumption_ml_per_car` vb.)
2. `products.specs` JSONB'den her ürün için key/value oku
3. Tip-aware INSERT:
   - **Scalar keys** (12): `volume_ml`, `capacity_ml`, `capacity_usable_ml`, `durability_months`, `durability_km`, `ph_level`, `ph_tolerance`, `consumption_per_car_ml`, `cut_level`, `hardness`, `product_type`, `purpose` → tip kontrolü ile `value_text` XOR `value_numeric` XOR `value_boolean`
   - **Array keys** (5): `target_surface`, `compatibility`, `substrate_safe`, `surface`, `features` → pipe-separated `value_text` (örn: `|chrome|aluminum|brass|`) — `regex` operatörüyle queryleniyor

Bot bu EAV'ı `searchProducts.metaFilters` parametresiyle kullanıyor:

```ts
metaFilters: [
  { key: 'durability_months', op: 'gte', value: 36 },
  { key: 'target_surface', op: 'regex', value: 'ceramic' }
]
```

`op: 'regex'` ARRAY key'lerde **substring match** (Postgres `value_text ~* 'ceramic'`).

---

## 5. Taxonomy: 25 template_group

Enum: `retrieval-service/src/types.ts:18-45`

| # | template_group | Açıklama | Sub_type örnekleri |
|---|---|---|---|
| 1 | `abrasive_polish` | Sıvı pasta cila | `heavy_cut_compound`, `polish`, `finish`, `one_step_polish`, `metal_polish` |
| 2 | `air_equipment` | (Phase 19) Eski "accessory" | `air_blow_gun`, `tornador_gun`, `tornador_part` |
| 3 | `applicators` | Aplikatör pedleri | `foam_applicator`, `microfiber_applicator` |
| 4 | `brushes` | Detay/jant fırçası | `wheel_brush`, `detail_brush` |
| 5 | `car_shampoo` | Yıkama şampuanı | `ph_neutral_shampoo`, `prewash_foaming_shampoo`, `ceramic_infused`, `decon_shampoo` |
| 6 | `ceramic_coating` | Seramik kaplama | `paint_coating`, `glass_coating`, `wheel_coating`, `fabric_coating`, `top_coat`, `single_layer_coating`, `paint_coating_kit` |
| 7 | `clay_products` | Kil bar / mitt | `clay_bar`, `clay_mitt`, `synthetic_clay` |
| 8 | `contaminant_solvers` | Demir/zift sökücü | `iron_remover`, `tar_remover`, `surface_prep`, `wheel_iron_remover` |
| 9 | `fragrance` | Oto kokusu | (kapsam dışı) |
| 10 | `glass_cleaner` | Cam temizleyici | `glass_cleaner_concentrate`, `glass_cleaner_ready` |
| 11 | `glass_cleaner_protectant` | (Phase 2A merge) | (yeni) |
| 12 | `industrial_products` | Endüstriyel | `solid_compound` (Phase 19, katı pasta) |
| 13 | `interior_cleaner` | İç mekan temizleyici | `fabric_leather_cleaner`, `interior_apc`, `plastic_dressing` |
| 14 | `leather_care` | Deri bakım | `leather_dressing` |
| 15 | `marin_products` | Tekne/marin | `marine_polish`, `marine_metal_cleaner`, `marine_surface_cleaner`, `marine_general_cleaner`, `marine_wood_care` |
| 16 | `masking_tapes` | Maskeleme bantı | `trim_tape` |
| 17 | `microfiber` | Bez/havlu | `cleaning_cloth`, `buffing_cloth`, `multi_purpose_cloth` |
| 18 | `paint_protection_quick` | Hızlı sealant/sprey | `spray_sealant`, `quick_detailer` |
| 19 | `polisher_machine` | Polisaj makinesi | `rotary`, `orbital`, `dual_action_polisher`, `sander`, **+ accessory'ler** (`backing_plate`, `battery`, `charger`, `carbon_brush`) |
| 20 | `polishing_pad` | Polisaj pedi | `foam_pad`, `wool_pad` (Phase 19 NPMW6555) |
| 21 | `ppf_tools` | PPF aletleri | (kapsam dışı) |
| 22 | `product_sets` | Hazır setler | `bundle` |
| 23 | `sprayers_bottles` | Sprey şişe | `pump_sprayer`, `trigger_sprayer`, **+ part'lar** (`trigger_head`, `nozzle`, `maintenance_kit`, `hose`, `handle`) |
| 24 | `storage_accessories` | Saklama | `wash_accessory`, `container_kit` |
| 25 | `tire_care` | Lastik bakım | `tire_dressing` (Phase 2R'de tire_coating buraya merge), `tire_cleaner` |
| **+** | `wash_tools` | (Phase 2R) Yeni grup | `wash_mitt`, `drying_towel`, `foam_tool`, `towel_wash`, `bucket` |

**Sub_type pattern'leri** `retrieval-service/src/lib/slotExtractor.ts:78-448` — toplam **148 entry, ~280 distinct Türkçe phrase**.

---

## 6. Phase Migration Tarihçesi

Master rapor: [data/consolidation/CHANGE-REPORT.md](data/consolidation/CHANGE-REPORT.md). Toplam **1.641 değişiklik**, **420 SKU etkilendi (%82)**.

### 6.1. Phase 1 — Canonical key normalize (892 değişiklik, 296 SKU)

**Motivasyon:** 6 duplicate key ailesi tek canonical formata indirildi.

| Family | Değişiklik | SKU | Canonical key | Script |
|---|---:|---:|---|---|
| VOLUME / CAPACITY | 337 | 165 | `volume_ml`, `capacity_ml`, `weight_g` | `build-phase1-A.ts` |
| DURABILITY | 144 | 73 | `durability_months`, `durability_km` | `build-phase1-B.ts` |
| PH | 39 | 36 | `ph_level`, `ph_tolerance` | `build-phase1-C.ts` |
| DILUTION | 81 | 28 | `dilution_ratio`, `dilution_methods` (nested) | `build-phase1-D.ts` |
| CONSUMPTION | 50 | 30 | `consumption_per_car_ml` | `build-phase1-E.ts` |
| SAFE_ON / COMPAT | 101 | 44 | `compatibility[]` | `build-phase1-F.ts` |
| Specs subtype drop | 140 | — | (orphan cleanup) | `build-phase1-G.ts` |

**Drop edilen legacy key'ler:** `durability_days` (63), `volume` (28), `weight_kg` (25), `capacity_liters` (20), `consumption` (15), `safe_for_soft_paint` (13), `bodyshop_safe` (13), `ph` / `ph_label`.

**Birim dönüşümleri:** kg→g (×1000), L→ml (×1000), days→months (÷30), weeks→months (÷4).

### 6.2. Phase 2R — Taxonomy refactor (450+ değişiklik)

**Motivasyon:** Sub_type sayısı azalt, semantik tutarlılık.

Örnekler ([data/consolidation/phase2R-FINAL-payload.json](data/consolidation/phase2R-FINAL-payload.json), 109KB):
- **`spare_part` template_group ERİDİ** → parts sub_type'ları `polisher_machine` ve `sprayers_bottles`'a taşındı
- **`wash_tools` yeni template_group** (15 ürün): wash_mitt + drying_towel + foam_tool + towel_wash + bucket. Yıkama eldivenleri microfiber'dan buraya
- **ceramic_coating sub merge:** `leather_coating` + `interior_coating` → `fabric_coating`; `spray_coating` → `paint_coating`; `tire_coating` → `tire_care/tire_dressing`
- **abrasive_polish sub merge:** `one_step_polish` + `metal_polish` → `polish` (Menzerna 23003.391.001 dahil); `sanding_paste` → `heavy_cut_compound`

### 6.3. Phase 19 — Post-Phase18 user feedback (48 değişiklik)

[retrieval-service/scripts/build-phase19-payload.ts](retrieval-service/scripts/build-phase19-payload.ts):
- **NPMW6555** (keçe) → `polishing_pad/wool_pad` (microfiber DEĞİL)
- **11 industrial `metal_polish` → `solid_compound`** (`industrial_products` group), her birine `specs.purpose` (heavy_cut/medium_cut/finish/super_finish) + `specs.surface[]` (chrome/aluminum/brass/stainless_steel/zamak vb.) eklendi
- **`accessory` template_group → `air_equipment`** (rename), 3 sub: `air_blow_gun`, `tornador_gun`, `tornador_part`
- **`marin_products` 5 sub'a renormalize**: `marine_polish`, `marine_metal_cleaner`, `marine_surface_cleaner`, `marine_general_cleaner`, `marine_wood_care`. `interior_detailer`, `iron_remover`, `water_spot_remover`, `one_step_polish` marin'den **kaldırıldı** (yanlış isimlendirme)
- **7 SKU silindi** ([data/consolidation/_pre-7sku-delete-20260425-200707/](data/consolidation/_pre-7sku-delete-20260425-200707/))

### 6.4. Re-embed + EAV Projection

Migration sonrası:
- [retrieval-service/scripts/regenerate-search-text.ts](retrieval-service/scripts/regenerate-search-text.ts) — `search_text` columns yeniden hesapla, embedding refresh
- [retrieval-service/scripts/regenerate-affected-search-text.ts](retrieval-service/scripts/regenerate-affected-search-text.ts) — sadece etkilenen SKU'ları (Phase 19 delta)
- [retrieval-service/scripts/project-specs-to-meta.ts](retrieval-service/scripts/project-specs-to-meta.ts) (26 Apr 00:12) — `specs` JSONB → `product_meta` EAV projection, 22 stale DELETE + 17 canonical key INSERT

---

## 7. Microservice (retrieval-service) Derin Dalış

### 7.1. Bootstrap

[retrieval-service/src/server.ts:1-65](retrieval-service/src/server.ts) — Hono app:

```
1. Logger middleware (request ID + JSON log + sub-ms latency)
2. Auth middleware (timing-safe Bearer token vs RETRIEVAL_SHARED_SECRET)
3. Error handler (HTTPException + stack capture)
4. Routes:
   POST /search          → searchCore.searchHybrid()
   POST /faq             → faq.handler (SKU-bypass + confidence tier)
   GET  /products/:sku
   GET  /products/:sku/guide
   GET  /products/:sku/related?relationType=...
   POST /search/price
   POST /search/rating
   GET  /admin/*         → admin-auth (RETRIEVAL_ADMIN_SECRET veya fallback)
   GET  /health
```

**Env config** ([env.ts:9-21](retrieval-service/src/lib/env.ts)):
- `PORT` default 8787
- `RETRIEVAL_SHARED_SECRET` min 16 char (bot tooling auth)
- `RETRIEVAL_ADMIN_SECRET` opsiyonel (admin UI separate auth)
- `GEMINI_API_KEY` min 10 char
- `LOG_LEVEL` enum

### 7.2. Hybrid Retrieval Pipeline (KRİTİK)

[retrieval-service/src/lib/searchCore.ts:360-563](retrieval-service/src/lib/searchCore.ts) — `searchHybrid()`

**Aşamalar:**

1. **Query expansion** (line 394) — `expandQuery()`:
   - Türkçe normalize: ş/ç/ğ/ö/ü letters fenced (sentinel chars), lowercase, NFD decompose, restore. Önce: "Cilâ POLISAJ" → Sonra: "cila polisaj".
   - Synonym lookup: `synonyms` tablosundan longest-pattern-first match. Forward (canonical→aliases) + reverse (alias≥4 char→canonical+siblings, `MIN_ALIAS_LENGTH_FOR_REVERSE=4`).
   - Output: `{original, normalized, expanded (normalized + aliases), addedAliases}`

2. **Slot extraction** (line 394-413) — `extractSlots()`:
   - **43 brand pattern** (GYEON, MENZERNA, FRA-BER, vb.) — word-boundary regex
   - **Price ranges** (line 520-531):
     - MAX: `/(\d{2,7})\s*(?:tl|₺)?\s*(?:altı|altında|ye kadar)/i`
     - MIN: `/(\d{2,7})\s*(?:tl|₺)?\s*(?:üstü|üstünde|ve üzeri)/i`
   - **Sub_type pattern'leri** (148 entry, 280+ distinct phrase) — longest-first sort (line 451-456)
   - **Rating hint** (line 535-537) — `/\b(en iyi|en güçlü|top|en dayanıklı|...)/i` → `slots.ratingHint=true` (LLM tarafından kullanılmıyor, retrieval'a etki etmiyor — placeholder)
   - **Typo tolerance:** Dotless-ı ↔ dotted-i folding (line 460-462)

3. **Parallel BM25 + Vector** (line 419) — `Promise.all([runBm25Query, vectorSearch])`:
   - **BM25** ([bm25.ts:75-129](retrieval-service/src/lib/bm25.ts)):
     - SQL: `to_tsquery('turkish', <token1 | token2 | ...>)` on `product_search.search_vector`
     - Tokenization: whitespace split, drop non-alphanumeric, ≥2 chars, OR semantics (` | `)
     - Ranking: `ts_rank_cd()` + SKU tie-break
     - Limit: `HYBRID_CANDIDATE_LIMIT=50` (searchCore.ts:306)
   - **Vector**:
     - Embed query (Gemini text-embedding-001) — LRU cache (max 1000, TTL 24h, `cache.ts:27-31`)
     - SQL: `product_embeddings <=> $1::vector` (cosine distance, HNSW index)
     - Same filter (templateGroup, templateSubType, brand, mainCat, subCat ILIKE)
     - Limit: 50

4. **Reciprocal Rank Fusion** (line 453-457) — [rrf.ts:35-82](retrieval-service/src/lib/rrf.ts):
   ```
   score(sku) = Σ_i 1/(k + rank_i(sku))
   k = HYBRID_RRF_K = 60   // TREC default (Cormack/Clarke/Buettcher 2009)
   ```
   - Tie-break: RRF score → # lists with finite ranks → SKU lex
   - Returns `[{sku, rrf_score, ranks: [bm25_rank, vec_rank]}]`

5. **Business boosts** (line 481-496):
   - `BOOST_RATING_COEF = 0.08` → rating × 1.0 ile 1.08 arası multiplier (5-yıldız ürün %8 boost)
   - `BOOST_IN_STOCK = 1.05`, `BOOST_OUT_OF_STOCK = 0.85`
   - `BOOST_FEATURED = 1.10`
   - `finalScore = rrfScore × ratingMult × stockMult × featuredMult`

6. **Post-filter — exactMatch** (line 148-180):
   - Strict word-boundary: `\b<needle>(?![+\w])` on product name
   - Cascade: strict → broad substring → original order
   - `OVERSAMPLE_FACTOR = 5` (searchCore.ts:37) — exactMatch varsa `limit*5` adet çek

7. **Format** ([formatters.ts](retrieval-service/src/lib/formatters.ts)):
   - **`carouselItems[]`** — URL renderable cards (title, subtitle, imageUrl, actions)
   - **`textFallbackLines[]`** — markdown text fallback
   - **`productSummaries[]`** — `{sku, name, brand, price, templateGroup, snippet, similarity, variant_skus, sizes[]}`

### 7.3. /faq Endpoint — Confidence Tier

[retrieval-service/src/routes/faq.ts:80-156](retrieval-service/src/routes/faq.ts):

1. Embed query
2. **SKU-bypass mode** (sku verildiyse): scope='product', sadece o SKU'nun FAQ'ları
3. **Cross-product**: tüm `product_faqs.embedding`'lerine cosine distance
4. **Confidence classification:**
   - `HIGH_THRESHOLD = 0.75` → `confidence='high'` — bot FAQ'ı paraphrase eder, multiple varsa sentezler
   - `LOW_THRESHOLD = 0.55` → `confidence='low'` — bot kendi domain bilgisini önceler, FAQ destekleyici
   - <0.55 → `confidence='none'` — boş results, bot scratch'tan cevap
5. Output `recommendation` field: bot için davranış talimatı (rec string'i server-side seçilir)

### 7.4. Önemli Sabitler / Magic Numbers

| Constant | Değer | Yer | Amaç |
|---|---:|---|---|
| `HYBRID_CANDIDATE_LIMIT` | 50 | searchCore.ts:306 | BM25 + vec her biri max 50 candidate |
| `HYBRID_RRF_K` | 60 | searchCore.ts:307 | RRF damping (TREC default) |
| `OVERSAMPLE_FACTOR` | 5 | searchCore.ts:37 | exactMatch için fetch çarpanı |
| `BOOST_RATING_COEF` | 0.08 | searchCore.ts:311 | Max %8 rating boost |
| `BOOST_IN_STOCK` | 1.05 | searchCore.ts:312 | Stok bonusu |
| `BOOST_OUT_OF_STOCK` | 0.85 | searchCore.ts:313 | Stok yok cezası |
| `BOOST_FEATURED` | 1.10 | searchCore.ts:314 | Featured çarpan |
| `embedCache.max` | 1000 | cache.ts:28 | LRU embedding cache |
| `embedCache.ttl` | 24h | cache.ts:29 | Embedding cache TTL |
| `EMBEDDING_DIM` | 768 | embed.ts:8 | Gemini embedding-001 |
| `HIGH_THRESHOLD` | 0.75 | faq.ts:46 | FAQ high confidence |
| `LOW_THRESHOLD` | 0.55 | faq.ts:47 | FAQ low confidence |
| `MIN_ALIAS_LENGTH_FOR_REVERSE` | 4 | synonymExpander.ts:35 | Reverse synonym match min |
| Bot side `RETRIEVAL_TIMEOUT_MS` | 3000 | retrieval-client.ts:19 | Bot HTTP client timeout |

### 7.5. /products + /related Endpoint'leri

[retrieval-service/src/routes/products.ts:73-222](retrieval-service/src/routes/products.ts):

- **`GET /products/:sku`** — Master row (specs JSONB unpack: howToUse, whenToUse, whyThisProduct), `ProductDetailsSchema`. variant_skus array → secondary SKU lookup.
- **`GET /products/:sku/guide`** — Hafif (14 field), application guide spesifik (videoCard YouTube embed), specs/FAQ/variants içermez.
- **`GET /products/:sku/related?relationType=use_with`** — `product_relations` JOIN, confidence DESC sort.

### 7.6. Eksik / Sorunlu Yerler

1. **Eval framework var ama corpus yok** — `retrieval-service/eval/run-eval.ts` 150-query metric (brand_hit@k, tg_hit@k, sku_hit@k, MRR), `HIGH_THRESHOLD=0.05 recall@5` ama `eval/corpus.jsonl` mevcut değil
2. **SlotExtractor pattern duplicate** — `metal parlatici` 2 yerde (line 171 polish + line 390 solid_compound). First-match wins → polish kazanır → industrial katı pasta sorguları yanlış kategoriye düşer
3. **Synonym tablosu sadece 37 entry** — TR detailing domain için zenginleştirilebilir (kategori bazlı: brand-specific, size-specific, color-specific)
4. **Embedding cache cold start** — Yeni query 150-800ms. Hot key warming yok.

---

## 8. Bot (detailagent-ms) Derin Dalış

### 8.1. ADK / LLMz Autonomous Pattern

Botpress ADK 1.17 — agent her turn'de **stateless function** çalıştırır. LLM, **TSX** (TypeScript JSX) syntax'ında kod üretir: özel sentinel'lar arası (`■fn_start ... ■fn_end`).

**Örnek:**
```tsx
■fn_start
const result = await searchProducts({
  query: 'GYEON şampuan',
  templateGroup: 'car_shampoo',
  limit: 5
});
yield <Carousel items={result.carouselItems} />
return { action: 'listen' };
■fn_end
```

Botpress runtime TSX'i:
1. Parse eder
2. `searchProducts(...)` çağrılır → `retrievalClient.search(...)` HTTP POST
3. Result LLM context'ine geri injekte
4. LLM yeni iteration yapar (multi-step) veya `return { action: 'listen' }` ile turn'ü kapatır

**Multi-step iteration:** 3-7 round tipik. Botpress runtime 60-120s upper bound; aşılırsa `Runtime execution has timed out`.

### 8.2. Conversation Handler

[Botpress/detailagent-ms/src/conversations/index.ts:35-631](Botpress/detailagent-ms/src/conversations/index.ts):

```ts
export default new Conversation({
  channel: '*',
  state: z.object({
    lastProducts: z.array(z.object({sku,productName,brand,price})).default([]),
    lastFocusSku: z.string().nullable().default(null),
  }),
  handler: async ({ execute, state }) => {
    await execute({
      tools: [searchProducts, searchFaq, getProductDetails,
              getApplicationGuide, searchByPriceRange, getRelatedProducts],
      temperature: 0.2,
      hooks: {
        onAfterTool: async ({ tool, output }) => {
          // searchProducts/searchByPriceRange → state.lastProducts (max 5)
          // getProductDetails/getApplicationGuide → state.lastFocusSku
        }
      },
      instructions: `... 19K char Türkçe instruction ...`,
    });
  }
});
```

**State kullanımı:**
- `lastProducts` (max 5 ürün) — multi-turn context retention. Kullanıcı "ikincinin fiyatı" deyince tool çağırmadan cevap.
- `lastFocusSku` — last `getProductDetails`/`getApplicationGuide` SKU. searchFaq SKU-filtreli yapılmasında kullanılır.

**Önceki versiyonda 4 dead/half-dead field vardı** (`selectedBrand`, `selectedCategory`, `surfaceType`, `lastFaqAnswer`) — 26 Apr commit'inde kaldırıldı (transcript LLMz tarafından zaten gönderiliyor, redundant).

### 8.3. Bot.config (`agent.config.ts`)

[Botpress/detailagent-ms/agent.config.ts:13-68](Botpress/detailagent-ms/agent.config.ts):

```ts
defaultConfig({
  name: 'detailagent-ms',
  defaultModels: {
    autonomous: 'google-ai:gemini-3-flash',
    zai: 'google-ai:gemini-3-flash',
  },
  bot: {
    state: z.object({
      botName: z.string().default('CARCAREAİ — MTS Kimya Ürün Danışmanı'),
      storeUrl: z.string().default('https://mtskimya.com'),
      contactInfo: z.string().default('mtskimya.com/pages/iletisim'),
      supportScope: z.string().default('Ürün danışmanlığı (sipariş, kargo, iade kapsam dışıdır)'),
    }),
  },
  user: { state: z.object({}) },
  dependencies: {
    integrations: {
      webchat: { version: 'webchat@0.3.0', enabled: true },
      chat: { version: 'chat@1.0.0', enabled: true },
    }
  },
})
```

3 state seviyesi:
- **`bot.state`** — global, tüm conversations için sabit (botName, storeUrl, contactInfo)
- **`Conversation.state`** — per-conversation (lastProducts, lastFocusSku)
- **`user.state`** — per-user across conversations (şu an boş `{}`)

---

## 9. 6 Tool — Tek Tek Spec

Tüm tool'lar `Botpress/detailagent-ms/src/tools/` altında. Her biri `@botpress/runtime`'ın `Autonomous.Tool` API'sıyla tanımlanır. Handler `retrievalClient.<endpoint>()` çağrısı yapar (HTTP POST/GET).

### 9.1. `searchProducts` — Ana arama tool'u

[search-products.ts](Botpress/detailagent-ms/src/tools/search-products.ts) (294 satır)

**Input** (Zod):
```ts
{
  query: string,                     // Semantic arama (zorunlu)
  templateGroup?: enum25,            // 25 template_group enum
  templateSubType?: string,          // 100+ değer (free string)
  brand?: string,                    // GYEON | MENZERNA | FRA-BER | ...
  exactMatch?: string,               // Ürün adında MUTLAKA geçecek substring
  mainCat?: string,                  // (legacy)
  subCat?: string,                   // (legacy)
  limit?: 1-10 (default 5),
  metaFilters?: Array<{key, op:'eq'|'gte'|'lte'|'gt'|'lt'|'regex', value}>
}
```

**Output**: `{carouselItems[], textFallbackLines[], productSummaries[], totalReturned, filtersApplied, debug?}`

**Handler:** `retrievalClient.search(input)` → microservice `/search`

**Kullanım örnekleri (instruction'da):**
- "GYEON şampuan öner" → `{query: "GYEON şampuan", templateGroup: "car_shampoo"}`
- "1000 TL altı seramik" → `{query: "seramik kaplama 1000 TL altı", templateGroup: "ceramic_coating"}` — microservice priceMax slot otomatik extract eder
- "Bathe+" → `{query: "GYEON Bathe+", brand: "GYEON", exactMatch: "Bathe+", templateGroup: "car_shampoo"}`

**Tool description boyutu:** 15.136 char ≈ **3.8K token** (en büyük tool, 25 templateGroup enum + 157 templateSubType hint + Phase 1 metaFilter table).

### 9.2. `searchFaq` — FAQ semantic search

[search-faq.ts](Botpress/detailagent-ms/src/tools/search-faq.ts) (91 satır)

**Input:** `{query, sku?, limit}`. SKU verilirse SKU-bypass (sadece o ürün FAQ'ları). LLM'e instruction der: spesifik ürün biliniyorsa SKU geç, yoksa null.

**Output:** `{results: [{sku, question, answer, similarity}], totalReturned, topSimilarity, confidence: 'high'|'low'|'none', recommendation: string}`

**Handler:** `retrievalClient.faq(input)` → microservice `/faq`. Confidence threshold logic server-side (`HIGH=0.75`, `LOW=0.55`).

**Token cost:** 3.667 char ≈ 917 token

### 9.3. `getProductDetails` — Tüm bilgi tek çağrıda

[get-product-details.ts](Botpress/detailagent-ms/src/tools/get-product-details.ts) (77 satır)

**Input:** `{sku}` (variant SKU verilirse master'a resolve)

**Output:** Master row + `technicalSpecs` (Phase 1 canonical: `ph_level`, `ph_tolerance`, `durability_months`, `durability_km`, `volume_ml`, `capacity_ml`, `consumption_per_car_ml`, `dilution` nested, `target_surface[]`, `compatibility[]`, `substrate_safe[]`, `product_type`, `purpose`, `surface[]`, `hardness`, `ratings`) + `faqs[]` + `howToUse` + `whenToUse` + `whyThisProduct` + `fullDescription` + `variants[]` (sizes JSON).

**Handler:** `retrievalClient.getProduct(sku)` → microservice `GET /products/:sku`

**Token cost:** 3.950 char ≈ 988 token (input desc); output 5K+ token.

### 9.4. `getApplicationGuide` — Hafif uygulama rehberi

[get-application-guide.ts](Botpress/detailagent-ms/src/tools/get-application-guide.ts) (64 satır)

`getProductDetails`'in compact versionu — sadece `howToUse`, `whenToUse`, `whyThisProduct`, `fullDescription` + `videoCard` (YouTube embed). FAQ ve specs içermez.

**Output token:** ~1.5K (vs `getProductDetails` 5K+) — context tasarrufu.

### 9.5. `searchByPriceRange` — Pure fiyat filtresi

[search-by-price-range.ts](Botpress/detailagent-ms/src/tools/search-by-price-range.ts) (96 satır)

**Input:** `{minPrice?, maxPrice?, templateGroup?, brand?, limit (1-20)}`

**Output:** `searchProducts` ile aynı format (carouselItems + summaries)

**Handler:** `retrievalClient.searchPrice()` → microservice `POST /search/price`. Fiyat artan sıra.

**Not:** searchProducts query slot extraction yapıyor → "1000 TL altı X" sorgusu searchProducts'a da gönderilebilir. searchByPriceRange sadece **pure fiyat filtresi** (X-Y TL arası) için.

### 9.6. `searchByRating` — Üretici puanı top-N

[search-by-rating.ts](Botpress/detailagent-ms/src/tools/search-by-rating.ts) (96 satır)

**Input:** `{metric: 'durability'|'beading'|'self_cleaning', templateGroup?, limit (1-10)}`

**Output:** `{metric, rankedProducts: [{sku, productName, brand, ratingValue, allRatings, price, url, imageUrl, carouselCard}], totalCandidates}`

**Handler:** `retrievalClient.searchRating()` → microservice `POST /search/rating`.

**Veri kapsamı:** **28 GYEON ürünü** (Faz 3d enrichment) `specs.ratings`'e sahip — diğer markalar için null. Composite metric (v10): `durability` için rating + `durability_months` birleşik kullanılır → null rating'li ürünler de dahil olur (örn. INNOVACAR SINH 48 ay, rating null).

**Tool desc:** 3.539 char ≈ 885 token. Çok detaylı, sadeleştirilebilir (planlanıyor — bkz. §15).

### 9.7. `getRelatedProducts` — İlişkili ürün

[get-related-products.ts](Botpress/detailagent-ms/src/tools/get-related-products.ts) (80 satır)

**Input:** `{sku, relationType: 'use_with'|'use_before'|'use_after'|'alternatives'|'accessories'}`

**Output:** `searchProducts` formatında.

**Handler:** `retrievalClient.getRelated(sku, relationType)` → `GET /products/:sku/related?relationType=...`

### 9.8. HTTP Client

[Botpress/detailagent-ms/src/lib/retrieval-client.ts](Botpress/detailagent-ms/src/lib/retrieval-client.ts):

- **Base URL:** `RETRIEVAL_SERVICE_URL` env (Phase 4'te eklenecek)
- **Auth:** `Authorization: Bearer ${RETRIEVAL_SHARED_SECRET}` header
- **Timeout:** **3000ms** (line 19) — cold Gemini embedding call'larında sıkıntı (5000ms'e çıkarılması planlanıyor)
- **Retry:** YOK — hata user'a "Üzgünüm" mesajıyla yansır
- **Body:** JSON stringify (metaFilters büyük olabilir, ~5KB)

---

## 10. Instruction / Prompt Mimarisi

### 10.1. Sayısal genel bakış

| Bileşen | Char | Token tahmin |
|---|---:|---:|
| Bizim instruction (`conversations/index.ts` template literal) | 39.947 | ~10.000 |
| 6 tool description (toplam) | 35.619 | ~8.900 |
| LLMz wrapper ("Important Instructions", TSX kuralları) | ~12.000 | ~3.000 |
| State schema serialize | ~500 | ~125 |
| **Toplam system prompt (her LLM çağrısında)** | **~88.000** | **~22.000** |

**Trace verisi (26 Apr son test):**
- `ai.system_length` her cognitive.request span'ında: 86,567 → 89,032 char
- Doğrulanmış: ~22K token / istek

**26 Apr state cleanup sonrası:**
- system_length: 66,914 → 77,298 char (test boyunca conversation history birikiyor)
- ~16.7K → 19.3K token / istek
- **20% maliyet düşüşü doğrulandı**

### 10.2. Bizim instruction — 18 ana bölüm

[conversations/index.ts:116-628](Botpress/detailagent-ms/src/conversations/index.ts), template literal:

| # | Bölüm | Satır | Rol |
|---|---|---|---|
| 1 | GÖREV | 95-100 | 5 ana sorumluluk + ton ("Türkçe, samimi, profesyonel, KISA") |
| 2 | TOOL SEÇİMİ — Karar Tablosu | 102-121 | 7 satır karar ağacı, searchByRating ZORUNLU üst kuralı |
| 3 | CONTEXT-AWARE TOOL ÇAĞRI KURALI (v8.2) | 128-156 | state.lastProducts injection, takip sorularında tool çağırmama |
| 4 | SET / PAKET / BAKIM KİTİ (v8.4) | 158-194 | Multi-kategori workflow recipe (yıkama→decon→polisaj→koruma→aksesuar) |
| 5 | RENDER KURALLARI | 196-224 | Carousel vs textFallbackLines, videoCard, template literal yasakları |
| 6 | SPEC-FIRST (v9.0) | 226-246 | Sayısal sorularda FAQ skip, getProductDetails.technicalSpecs tercih |
| 7 | RATINGS Alanı (v9.0) | 248-259 | technicalSpecs.ratings format açıklaması |
| 8 | searchFaq Tool Kullanımı (v9.1) | 261-281 | SKU-aware, confidence tier davranışı |
| 9 | template_group FILTER (v9.1, Phase 2R + 19) | 285-315 | 25 enum + Phase 2R/19 değişiklikleri (tire_coating→tire_dressing, vb.) |
| 10 | RATINGS / DAYANIKLILIK Karşılaştırma (v10) | 317-355 | searchByRating ZORUNLULUĞU + composite metric açıklaması |
| 11 | PROACTIVE FALLBACK (v10) | 358-372 | Boş sonuç 2-step (filter gevşet + alternatif sun) |
| 12 | SEARCH RESULT RELEVANCE CHECK (v10.1) | 374-434 | Yield öncesi kontrol: Adım 1 (uyumsuzluk %30), Adım 2 (anti-hallucination), 2.5/2.6/2.7 (T4/T11 fix), Adım 3 (kategori) |
| 13 | CLARIFYING QUESTION | 442-465 | Çok genel sorularda sor, spesifik sorduysa sorma |
| 14 | TOOL ÇAĞRI KURALLARI | 467-486 | exactMatch zorunluluğu, MAX 5 tool/turn, multi-turn re-tool |
| 15 | searchFaq KULLANIM (v10) | 488-509 | RAG semantiği, multi-FAQ sentez, FAQ question gizleme |
| 16 | VARIANT (BOYUT) AWARENESS (v8.5) | 512-541 | product_group seviyesi, master.sizes JSON |
| 17 | META FİLTRE KULLANIMI (v10.2 — Phase 1 canonical) | 544-588 | 19-row canonical key tablosu (durability_months, volume_ml, target_surface[], compatibility[], substrate_safe[], product_type, purpose, surface vb.) |
| 18 | YANIT KURALLARI + KAPSAM DIŞI | 590-616 | Format, scope (sipariş/kargo dışı) |

### 10.3. Tekrar / Bloat (Bilinen, planlı temizlenecek)

**Rating kuralı 9 yerde tekrar** (~500 token israf):
- L128 + L137 + L264-268 + L273-283 + L342-355 + L411 + L426-429 + L465 + search-by-rating.ts:21-27

**Adım 2.5/2.6/2.7 üç başlık aynı konu** (~400 token):
- 2.5: "carousel doluysa metinde 'yok' deme" (KRİTİK)
- 2.6: "filter post-check" (T11)
- 2.7: 2.5'in tekrarı + multi-volume (T4) + ranking

**Phase notları 13+ yerde** (~260 token, LLM'e bilgi vermeyen):
- "v8.2 Context retention", "v9.1", "v10 (Phase 4 cutover)", "Phase 2R commit edildi 2026-04-25" vb.
- LLM bot bu bilgilere değil, "şu anki kuralı uygula"ya ihtiyaç duyar — CLAUDE.md'ye taşınmalı

### 10.4. v9.2 (frozen) → v10 (current) instruction büyümesi

| Metrik | v9.2 (detailagent) | v10 (detailagent-ms) | Δ |
|---|---:|---:|---:|
| Instruction satır | 347 | 631 | **+82%** |
| Instruction char | ~18.963 | 39.947 | +110% |
| Tool desc char | ~10.000 | 35.619 | **+256%** (Phase 2R + Phase 1 enum/hint inflation) |

**Sebep:** Phase 1 + 2R + 19 değişikliklerini her tool'un description'ına inline yazılmış olması. Sadeleştirilebilir.

---

## 11. Anti-Hallucination Stratejileri

Bot 4 katmanlı defense ile halüsinasyonları azaltmaya çalışır:

### 11.1. Tool output verification (Adım 2, satır 388-393)

> "Metin cevabında ürün ismi/brand geçiriyorsan, o isim **mutlaka tool output'undaki productSummaries veya carouselItems içinde olmalı**."

❌ Yasak: "FRA-BER markasının Lustratutto cilası..." (tool output'ta Lustratutto yoksa)
✅ Doğru: Sadece output'taki isimleri kullan

### 11.2. Carousel vs metin çelişkisi (Adım 2.5, satır 395-404)

> "productSummaries.length > 0 ise mutlaka SAY ve metinde belirt: 'X kategoride N ürün buldum'"

❌ Yasak: "tool çağırdım ama uygun bulamadım" + carousel yield (kullanıcı carousel görür ama metin "yok" der)

### 11.3. Filter post-check (Adım 2.6, satır 406-411)

> "`durability_months >= 36` filter sonrası dönen ürünleri **technicalSpecs.durability_months ile karşılaştır**. 24 ay olan ürünü filter koşulunu sağlamadığı halde göstermek yasak."

Sebep: Microservice oversample yapabilir; LLM filter post-check ile süzmeli.

### 11.4. Anti-hallucination ranking (Adım 2.7, satır 426-429)

> "searchByRating sonucu **rankedProducts veya productSummaries[].technicalSpecs** içinde durability_months yer alıyorsa, **METİNDE BU SAYIYI VER**. Yanlış sayı UYDURMA: tool sonucu 50 ay diyorsa, sen '24 ay' deme."

### 11.5. Bilinen hata pattern'leri

- **T1**: pH karışıklığı (`ph_level` ürünün kendi pH'ı vs `ph_tolerance` kaplamanın dayandığı yüzey)
- **T4**: Multi-volume confusion (kullanıcı "5 kg" istedi, tool 25kg+5kg karışık döndü)
- **T11**: Ranking hallucination (durability_months yanlış sayı)

---

## 12. Admin UI — Catalog Atelier

[admin-ui/](admin-ui/) — sibling Next.js app, **"Warm Archive Atelier"** tema. Phase 4.9.0–4.9.12 + polish commits tamamlandı.

### 12.1. Sayfa ağacı (admin-ui/app/)

- `/` — Dashboard (heatmap + alerts)
- `/catalog` — Master catalog tree drilldown
- `/products/[sku]` — 6-tab editor (info, specs, FAQ, relations, variants, history)
- `/faq` — FAQ Manager (scope: product/brand/category)
- `/relations` — Relation graph
- `/bulk` — Batch operations
  - `/bulk/specs-normalize`
  - `/bulk/taxonomy-remap`
- `/staging` — Staging drawer (preview before commit)
- `/commit` — Commit workflow (audit + rollback)
- `/activity` — Change timeline
- `/heatmap` — Data coverage matrix
- `/architecture` — Schema diagrams + node glossary
- `/prompts` — Prompt Lab
  - `/prompts/agents/[agentId]` — Agent instruction viewer
  - `/prompts/tools/[toolName]` — Tool registry
  - `/prompts/playground` — Test arena
  - `/prompts/history` — Version history

### 12.2. Backend (`retrieval-service/src/routes/admin/`)

- `/admin/products` (CRUD)
- `/admin/faqs` (bulk upsert)
- `/admin/relations` (bulk upsert)
- `/admin/coverage` — Catalog completeness metrics (limit 80→2000 Phase 1 mega payload için)
- `/admin/staging/preview` — Payload validation + dry-run
- `/admin/staging/apply` — Atomic commit
- `/admin/audit-log` — Change history
- `/admin/tools` — Botpress tool registry endpoint

### 12.3. Workflow

```
Edit (UI) → Stage (drawer) → Preview (validation) → Commit (atomic) → Audit log
                                                          │
                                                          └→ regenerate-search-text + project-specs-to-meta
```

---

## 13. Performans, Maliyet, Trace Verisi

### 13.1. Son test session (26 Apr, conv `KQ7JF4`)

State cleanup + backtick fix sonrası **6 mesaj, 0 timeout, 0 ERROR**. Önceki test'te 14 mesajdan 3 timeout vardı.

| Mesaj | Süre | Tool çağrıları |
|---|---:|---|
| "GYEON şampuan öner" | 5.98s | (clarifying quick-reply) |
| "🧼 pH Nötr (Günlük Yıkama)" | 9.24s | searchProducts(metaFilter[ph_level]) |
| "bathe yok mu amk" | 7.30s | searchProducts(exactMatch:Bathe) |
| "ikincinin fiyatı" | 4.57s | YOK (state.lastProducts'tan cevap) |
| "GYEON Bathe+ detay" | 9.43s | searchProducts → getProductDetails → getApplicationGuide |
| "ph nötr mü" | 6.66s | searchFaq(sku=Q2M-BPYA1000M) → getProductDetails |

**Önceki test (25 Apr, post-Phase 19, pre-state-cleanup):** 14 mesaj, **3 timeout** (51s/60s/103s — Botpress runtime upper bound aşıldı). Multi-step LLMz 4-5 search call ile 60+ saniyeye çıkıyordu. State cleanup + backtick fix sonrası bu pattern azaldı.

### 13.2. Token Kullanımı

| Aşama | Char | Token |
|---|---:|---:|
| Önceki test (pre-cleanup) | 86-89K | **~22K / istek** |
| Sonraki test (post-cleanup, 26 Apr) | 67-77K | **~16.7-19.3K / istek** |
| Tasarruf | ~12-15K char | **~3-5K token (%18-23)** |

### 13.3. Maliyet (Gemini 3 Flash)

- **Input:** $0.50 / 1M token
- **Output:** $3.00 / 1M token
- **Embedding:** Gemini text-embedding-001 ~$0.00025/1K char

Per LLM call: 17K input × $0.0005 + ~500 output × $0.003 = **~$0.0095**
Per turn (3-7 LLM call): **$0.03 – $0.07** (~1.2–2.8 TL)
14-mesaj test session: **~$0.50 ≈ 20 TL**
Aylık 1000 turn projeksiyonu: **$30-70 ≈ 1200-2800 TL**

**Cache yok:** Botpress ADK Gemini implicit/explicit prompt caching desteklemiyor. Cache olsa input maliyeti %75 düşerdi → ~$0.0024 / call.

### 13.4. Tool latency (gerçekleşen)

`autonomous.tool` span'lerinden:

| Tool | Ortalama latency | Notlar |
|---|---:|---|
| searchProducts | 530ms | Cold embedding 800ms+ olabilir |
| searchFaq | 480ms | |
| getProductDetails | 240ms | Master row + JOIN |
| getApplicationGuide | 270ms | Hafif |
| getRelatedProducts | 1100ms | (en uzun: 2.5s) |
| 1 ERROR (timeout) | 3009ms | searchProducts cold call, `RETRIEVAL_TIMEOUT_MS=3000`'i geçti |

---

## 14. Bilinen Sorunlar ve Açık Sorular

### 14.1. SlotExtractor pattern duplicate
[slotExtractor.ts:171](retrieval-service/src/lib/slotExtractor.ts#L171) ve [:390](retrieval-service/src/lib/slotExtractor.ts#L390) — `metal parlatici / metal parlatıcı` 2 yerde tanımlı (polish ve solid_compound). First-match-wins → polish kazanır → **industrial katı pasta sorguları yanlış kategoriye düşer**. Düzeltme planlı.

**Bağlı tartışma:** 23003.391.001 (MENZERNA Metal Polish 125gr krem) ürünü taxonomy'ye nasıl yerleştirilsin?
- Şu an: `abrasive_polish/metal_polish` (Phase 2R'de polish'e merge edildi mi belirsiz)
- Karşı kategori: `industrial_products/solid_compound` (Phase 19, Menzerna 113GZ vb. katı bar pastalar)
- 3 öneri (kullanıcı tartışıyor):
  - A) `industrial_products/cream_metal_polish` (yeni sub_type, ucuz)
  - B) Yeni `metal_care` template_group (büyük migration, +200 token)
  - C) Pattern'i her iki kategoriden sil, semantic search'e güven

### 14.2. Rating kuralı 9 yerde tekrar
Instruction'da `searchByRating ZORUNLU` kuralı 9 farklı yerde söyleniyor. **Tek bölüme indirilirse ~500 token tasarruf** + LLM dikkat dağılımı azalır. Plan hazır.

### 14.3. Adım 2.5/2.6/2.7 üç başlık aynı konu
Anti-hallucination kuralları 3 başlığa bölünmüş, çoğu duplicate. Tek başlığa (4-madde checklist) indirilebilir. ~400 token.

### 14.4. Phase notları LLM'e gidiyor
Instruction'da 13+ yerde "Phase 2R", "v8.2", "commit edildi 2026-04-25" gibi notlar. **LLM'e değer katmıyor** (bot tarihi bilmek zorunda değil). CLAUDE.md / commit message'a taşınmalı. ~260 token.

### 14.5. searchByRating coverage düşük
Sadece 28 GYEON ürünü `specs.ratings`'e sahip (% 5.5). `beading` ve `self_cleaning` için sadece bu kapsam. `durability` composite (rating + durability_months) ile genişledi ama hâlâ sınırlı. **Diğer markalar için rating data toplama gerekiyor**.

### 14.6. retrieval-client timeout 3s
[retrieval-client.ts:19](Botpress/detailagent-ms/src/lib/retrieval-client.ts#L19) — Cold Gemini embedding call'larında ERROR riski. **5000ms'e çıkarılması planlanıyor**.

### 14.7. Multi-step LLMz timeout
Botpress runtime ~60-120s upper bound. Agent 4-5 search call'lık multi-step thinking'e girince timeout. Instruction'da "MAX 5 TOOL PER TURN" var ama soft enforcement değil. **3'e indirilebilir** veya soft enforcement (3+ search sonrası "önce sun, sonra refine" instruction'ı).

### 14.8. Eval framework var ama corpus yok
`retrieval-service/eval/run-eval.ts` — 150-query metric framework hazır ama `eval/corpus.jsonl` boş/yok. Production retrieval kalitesi unevaluated. Hybrid vs pure_vector A/B test yapılmadı.

### 14.9. Synonym tablosu sadece 37 entry
TR detailing domain için zenginleştirilebilir. Şu an sadece bazı brand alias'ları + birkaç sub_type alias'ı. Domain expert review + pattern mining önerilebilir.

### 14.10. Test transcript'i log'lanmıyor
ADK `.adk/logs/*.log` build event'leri içeriyor, **user mesajları yok**. Trace DB (`traces.db`) span'ler var ama natural language çıkarmak SQL gerektiriyor. Eval/regression test için transcript JSONL log'u yararlı olur.

### 14.11. 23003.391.001 — açık karar
Yukarıda 14.1'de bahsedildi — kullanıcının onayı bekleniyor.

---

## 15. Yol Haritası

### 15.1. Phase 4 — Tool cutover (devam ediyor)

Bot tool handler'ları Botpress Tables → microservice HTTP. Cutover yapıldı (Phase 3 hybrid retrieval) ama bazı edge case'ler henüz test edilmemiş.

### 15.2. P0 acil düzeltmeler

- **A1.** SlotExtractor `metal parlatici` duplicate düzelt (5dk)
- **A2.** retrieval-client timeout 3s → 5s (1dk)

### 15.3. P1 token / LLM kalite

- **B1.** Rating kuralı 9 → 1 yer (~500 token tasarruf)
- **B2.** Adım 2.5/2.6/2.7 birleştir (~400 token)
- **B3.** Phase notları CLAUDE.md'ye taşı (~260 token)
- **B4.** Tool desc enum tekrarlarını çıkar (templateGroup enum tek yer)

**Tahmini toplam: ~22K → ~14-16K token (%30-35 maliyet düşüşü)**

### 15.4. P2 stability

- **C1.** Multi-step LLMz max 3 search/turn (timeout azalt)
- **C2.** Embedding cache warm-up script (cold start riski)

### 15.5. P3 long-term

- **D1.** Gemini prompt caching (Botpress ADK desteklemiyor — alternative çözüm: microservice tarafında LLM call?)
- **D2.** Test transcript JSONL log → eval pipeline
- **D3.** Eval corpus oluştur + hybrid vs pure_vector A/B test
- **D4.** Synonym tablosu zenginleştir
- **D5.** searchByRating coverage genişlet (28 → 200+ ürün)
- **D6.** 23003.391.001 metal polish karar (cream_metal_polish vs metal_care)

### 15.6. Phase 5 — Shadow mode + A/B test

- detailagent (v9.2) ve detailagent-ms (v10) paralel çalıştır
- Aynı user mesajı her ikisine
- Diff: top-3 product overlap ≥ %85, response benzerliği
- Sonuç eşitlendiğinde Phase 6'ya geç

### 15.7. Phase 6 — Production cutover

- %10 trafik → %25 → %50 → %100
- Rollback prova
- Eski botu deprecate

---

## 16. RAG / Agentic AI Literatürü ile Karşılaştırma

### 16.1. Hybrid retrieval — RRF

**Akademik:** Cormack, Clarke & Buettcher (SIGIR 2009) — *"Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods"*

**Bizim:** [rrf.ts:35-82](retrieval-service/src/lib/rrf.ts), formula:
```
score(sku) = Σ_i 1/(k + rank_i(sku))
k = HYBRID_RRF_K = 60   // TREC default
```

**Soru:** k parametresi domain-specific tune edilmedi. TREC default'u (60) Türkçe e-ticaret retrieval için optimal mi? Eval corpus oluşturulduğunda k ∈ {30, 40, 60, 80, 100} grid search yapılabilir.

### 16.2. Dense retrieval — pgvector HNSW

**Akademik:** Malkov & Yashunin (2018) — *"Hierarchical Navigable Small World"*; ANN benchmarks

**Bizim:** pgvector 0.8+ HNSW, m=16, ef_construction=64, cosine distance.

**Soru:** ef_search runtime parameter (default 40) dynamic tune edilmedi. Recall vs latency trade-off için ef_search ∈ {20, 40, 80, 160} test edilebilir.

### 16.3. Sparse retrieval — BM25

**Akademik:** Robertson et al. — *"Probabilistic relevance framework: BM25 and beyond"*

**Bizim:** Postgres `to_tsvector('turkish')` + `ts_rank_cd()`. Turkish stemmer Postgres'in built-in dictionary'si — morfolojik kapsam sınırlı (compound noun, diminutive zayıf).

**Alternatif:** Snowball Turkish stemmer custom dictionary, veya **Zemberek-NLP** (Turkish NLP library) entegrasyonu — daha doğru tokenization.

### 16.4. Query expansion

**Akademik:** Carpineto & Romano (2012) — *"A Survey of Automatic Query Expansion in Information Retrieval"* (PRF, KL divergence, LDA)

**Bizim:** Manual synonym dictionary (37 entry), no PRF feedback. Static expansion only.

**Geliştirme:** PRF (top-K result'tan term mining → re-query) eklenebilir. Veya LLM-based expansion ("yıkama eldiveni" → ["wash mitt", "yıkama süngeri", "wash sponge"]).

### 16.5. Slot extraction

**Akademik:** Mesnil et al. (2015) — *"Using Recurrent Neural Networks for Slot Filling"*; Devlin et al. — BERT for NLU

**Bizim:** Regex pattern matching, longest-first sort, 280+ phrases (TR detailing). NLU model değil — **rule-based slot filling**.

**Geliştirme:** LLM-extracted slots (Gemini'nin kendisinin "{brand: GYEON, sub: ceramic_coating}" çıkarmasını ask et) — ama latency cost.

### 16.6. Agentic AI pattern — ReAct, Toolformer

**Akademik:** Yao et al. (ICLR 2023) — *"ReAct: Synergizing Reasoning and Acting"*; Schick et al. — Toolformer

**Bizim:** Botpress LLMz Autonomous = ReAct'ın yapılandırılmış versiyonu. Her iteration TSX kod üretir, kod sentinel'lar arasında parse edilir, tool call yapılır, output context'e re-inject edilir.

**Multi-step planning:** İmplicit (LLM kararı). Explicit planning (agent task decomposition) yok. **AutoGPT / BabyAGI tarzı top-level plan** olmadığı için bazen agent gereksiz multi-step döngülere giriyor (60s+ timeout).

**Soru:** Single-pass with all context vs multi-step iterative tool calling — hangi pattern Türkçe e-ticaret danışmanı için optimal? Eval gerekli.

### 16.7. RAG pattern — Tool selection rules

**Akademik:** Lewis et al. — RAG (NeurIPS 2020); Gao et al. (2023) — *"Retrieval-Augmented Generation for Large Language Models: A Survey"*

**Bizim:** Tool selection rule-based (instruction'da karar tablosu) + LLM judgment. **6 tool, hepsi farklı amaç**, LLM en uygun olanı seçer.

**Tool overuse:** LLM bazen searchProducts'ı 4-5 kez chain'liyor. ReAct paper'larında "tool budget" konsepti var — bizde "MAX 5 TOOL PER TURN" instruction kuralı var ama soft.

### 16.8. Anti-hallucination

**Akademik:** Yin et al. (2023) — *"Do Large Language Models Know What They Don't Know?"*; Manakul et al. — SelfCheckGPT

**Bizim:** 4 katmanlı defense (output verification, carousel-text consistency, filter post-check, ranking accuracy). **LLM-side verification, not external grounding check.**

**Geliştirme:** External grounding (tool output vs LLM response) Botpress runtime'da otomatik enforce edilmiyor. Programatik post-validation (tool output'taki SKU set vs LLM response'taki SKU mention) eklenebilir.

### 16.9. Structured output

**Akademik:** Function calling (OpenAI), Tool use (Anthropic), Constrained decoding (Outlines, jsonformer)

**Bizim:** TSX code generation + Zod validation (input/output). Output structured ama TSX parse error'ları olası (geçen "backtick" syntax error vakası).

### 16.10. Embedding fine-tuning

**Akademik:** Sentence-BERT (Reimers et al.); E5 (Wang et al. — multilingual)

**Bizim:** Off-the-shelf Gemini embedding-001 (768-dim, multi-lingual). **Domain fine-tuning yok.** Türkçe detailing terminology için fine-tune edilebilir (cila / pasta / hare farkları semantic representation'da).

---

## 17. Önemli Dosya Ağacı

```
Products Jsons/
├── Botpress/
│   ├── detailagent/                        # v9.2 frozen, prod
│   └── detailagent-ms/                     # v10, microservice variant (active)
│       ├── agent.config.ts                 # Bot config (model, state, integrations)
│       ├── agent.json                      # Botpress Cloud bot ID
│       ├── agent.local.json                # devId (f29b900e-...)
│       ├── package.json                    # @botpress/runtime ^1.17, ADK ^1.17
│       ├── CLAUDE.md                       # Bot README (eski, 21 Apr)
│       ├── docs/
│       │   ├── ARCHITECTURE.md             # 236 satır (eski, 21 Apr — Phase 1/2R/19 yok)
│       │   ├── RUNBOOK.md                  # 269 satır (operasyonel)
│       │   ├── system-blueprint.drawio
│       │   ├── bot-architecture.drawio
│       │   └── bot-scenarios.drawio
│       ├── src/
│       │   ├── conversations/
│       │   │   └── index.ts                # 631 satır — handler + onAfterTool + 19K char instruction
│       │   ├── tools/
│       │   │   ├── search-products.ts      # 294 satır, en büyük tool desc
│       │   │   ├── search-faq.ts           # 91 satır
│       │   │   ├── get-product-details.ts  # 77 satır
│       │   │   ├── get-application-guide.ts# 64 satır
│       │   │   ├── search-by-price-range.ts# 96 satır
│       │   │   ├── search-by-rating.ts     # 96 satır
│       │   │   └── get-related-products.ts # 80 satır
│       │   └── lib/
│       │       └── retrieval-client.ts     # HTTP client, 3s timeout
│       ├── evals/                          # 130+ ADK eval files
│       └── .adk/
│           ├── bot/traces/traces.db        # 30MB SQLite span DB
│           └── logs/*.log                  # build/runtime events (user msg yok)
│
├── retrieval-service/
│   ├── package.json                        # Bun + Hono + postgres + zod
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── fly.toml                            # 256MB, 2 machine, iad
│   ├── src/
│   │   ├── server.ts                       # Hono bootstrap, middleware sırası
│   │   ├── lib/
│   │   │   ├── env.ts                      # Zod env validation
│   │   │   ├── db.ts                       # postgres.js client
│   │   │   ├── embed.ts                    # Gemini embedding-001 (768-dim)
│   │   │   ├── cache.ts                    # LRU cache (max 1000, TTL 24h)
│   │   │   ├── searchCore.ts               # Hybrid retrieval pipeline
│   │   │   ├── slotExtractor.ts            # 148 entry, 280+ phrase
│   │   │   ├── synonymExpander.ts          # Synonym lookup
│   │   │   ├── turkishNormalize.ts         # ş/ç/ğ sentinel-based
│   │   │   ├── bm25.ts                     # tsvector BM25
│   │   │   ├── rrf.ts                      # RRF fusion (k=60)
│   │   │   ├── formatters.ts               # carouselItems output format
│   │   │   └── adminAuth.ts
│   │   ├── middleware/
│   │   │   ├── logger.ts                   # JSON log + request ID
│   │   │   ├── auth.ts                     # Bearer timing-safe
│   │   │   ├── error.ts                    # HTTPException handler
│   │   │   └── admin-auth.ts               # Separate admin secret
│   │   ├── routes/
│   │   │   ├── search.ts                   # POST /search
│   │   │   ├── faq.ts                      # POST /faq (confidence tier)
│   │   │   ├── products.ts                 # GET /products/:sku, /guide, /related
│   │   │   ├── search-price.ts
│   │   │   ├── search-rating.ts
│   │   │   └── admin/
│   │   │       ├── products.ts
│   │   │       ├── faqs.ts
│   │   │       ├── relations.ts
│   │   │       ├── coverage.ts
│   │   │       ├── staging.ts
│   │   │       ├── commit.ts
│   │   │       ├── audit-log.ts
│   │   │       └── tools.ts
│   │   └── types.ts                        # TEMPLATE_GROUPS enum (25)
│   ├── migrations/
│   │   ├── 001_extensions.sql              # pgvector, pg_trgm, unaccent
│   │   ├── 002_core_schema.sql             # 7 tablo + indeksler
│   │   ├── 003_*.sql                       # ek migration'lar
│   │   └── 006_audit_log.sql
│   ├── scripts/
│   │   ├── build-phase1-{A..G,helper}.ts
│   │   ├── build-phase19-payload.ts
│   │   ├── build-mega-payload.ts
│   │   ├── regenerate-search-text.ts
│   │   ├── regenerate-affected-search-text.ts
│   │   ├── project-specs-to-meta.ts        # Bugün eklendi (26 Apr)
│   │   ├── phase5-faq-merge.ts
│   │   ├── seed-products.ts
│   │   └── ...
│   └── eval/
│       ├── run-eval.ts                     # Framework hazır
│       ├── build-corpus.ts
│       └── (corpus.jsonl YOK)
│
├── admin-ui/                               # Next.js 15 Catalog Atelier
│   ├── app/
│   │   ├── catalog/, products/[sku]/, faq/, relations/, bulk/,
│   │   │   staging/, commit/, activity/, heatmap/, architecture/, prompts/
│   │   └── api/
│   ├── components/
│   ├── lib/
│   └── (Phase 4.9.0–4.9.12 + polish commits, frozen)
│
├── data/
│   ├── csv/                                # Seed kaynağı
│   │   ├── products_master.csv             # 511 satır
│   │   ├── product_faq.csv                 # ~3K satır
│   │   ├── product_meta.csv
│   │   └── ...
│   ├── consolidation/                      # Phase migration artifacts
│   │   ├── CHANGE-REPORT.md                # Master narrative (24KB)
│   │   ├── MEGA-payload.json               # Phase 1 + 19 atomic (370KB)
│   │   ├── phase1-{A..G}-*-payload.json
│   │   ├── phase19-payload.json
│   │   ├── phase2R-FINAL-payload.json
│   │   └── phase{2,3,4,5}-*.{md,csv,json}
│   └── instagram/                          # Future Instagram DM data
│
├── etl/
│   ├── refresh_data.py
│   └── resolve_phase1_review.py
│
├── docs/
│   ├── PROJECT_BRIEFING.md                 # ← BU DOSYA
│   ├── Ajan_Ajans_Manifesto_v2.md
│   ├── Botpress-Tablo-Mimarisi.md
│   ├── design/
│   │   └── admin-ui-design-plan.md         # Warm Archive Atelier (2436 satır)
│   └── phase-4-reports/
│
├── archive/                                # Eski çalışmalar (gitignored)
└── .gitignore
```

---

## 18. Sözlük

| Terim | Açıklama |
|---|---|
| **ADK** | Botpress Agent Development Kit (CLI: adk dev/build/deploy) |
| **LLMz Autonomous** | Botpress'in TSX-code generation pattern'i (■fn_start ... ■fn_end sentinel'lar arası) |
| **Phase 1** | 2026-04-25 canonical key migration (durability_months, volume_ml, vb.) |
| **Phase 2R** | Taxonomy refactor (spare_part eridi, wash_tools yeni grup) |
| **Phase 19** | Post-feedback fix'ler (solid_compound, air_equipment rename, marin renormalize) |
| **EAV** | Entity-Attribute-Value pattern (`product_meta` tablosu) |
| **RRF** | Reciprocal Rank Fusion (k=60, Cormack 2009) |
| **HNSW** | Hierarchical Navigable Small World (pgvector ANN index) |
| **BM25** | Probabilistic relevance ranking (Robertson et al.) |
| **PRF** | Pseudo-Relevance Feedback (akademik query expansion) |
| **NLU** | Natural Language Understanding |
| **Slot** | Sorgudan çıkarılan yapısal alan (brand, sub_type, price) |
| **Slot extraction** | Regex/LLM ile slot'ları extract etme |
| **Confidence tier** | FAQ similarity'e göre high (≥0.75) / low (≥0.55) / none |
| **Composite metric** | searchByRating'in `durability` için rating + durability_months birleşik kullanması |
| **Carousel** | Botpress widget — multi-card görsel ürün listesi |
| **textFallbackLines** | Carousel render edilmeyen kanalda markdown fallback |
| **productSummaries** | Yapısal ürün özeti (tool output'ta — LLM'in hallucination'ı azaltmak için) |
| **template_group** | Üst kategori (25 enum: ceramic_coating, abrasive_polish, vb.) |
| **template_sub_type** | Alt kategori (paint_coating, heavy_cut_compound, vb.) |
| **specs JSONB** | products tablosundaki ürün özellikleri (Phase 1 canonical key'ler) |
| **target_surface** | Ürünün uygulanacağı yüzeyler (paint, leather, glass, ppf) |
| **compatibility** | Üzerine uygulanabilir başka kaplama (ceramic_coating, ppf) |
| **substrate_safe** | Zarar vermediği malzeme (aluminum, fiberglass, plexiglass) |
| **purpose** | solid_compound için kesme şiddeti (heavy_cut, medium_cut, finish, super_finish) |
| **surface[]** | Industrial katı pasta için uyumlu metal listesi (chrome, brass, aluminum, vb.) |
| **shadow mode** | İki bot'u paralel çalıştırma — diff ile A/B test |
| **service_role** | Supabase'in RLS bypass eden role (microservice secret ile) |

---

## Kapanış

Bu doküman 26 Apr 2026 itibarıyla **frozen snapshot**. Branch `feat/phase-4.9-catalog-atelier`, last commit `0a7e7f5`. Bu tarihten sonraki değişiklikleri öğrenmek için `git log --oneline 0a7e7f5..HEAD` çalıştır veya CHANGE-REPORT.md güncelle.

**Sorular için:**
- Mimari: bkz. §2, §7, §8
- Veri: bkz. §4, §5, §6
- Tool: bkz. §9
- LLM/instruction: bkz. §10, §11
- Performance: bkz. §13
- Açık sorunlar: bkz. §14, §15
- Akademik karşılaştırma: bkz. §16

**İlgili kişi:** Oğuz Han Güvenkaya (`oguzhanguvenkaya@gmail.com`).
