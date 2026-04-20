# detailagent-retrieval

Hybrid retrieval microservice for the detailagent Botpress bot. Replaces Botpress Tables' opaque semantic search with explicit BM25 (Turkish FTS) + vector (pgvector cosine) + business boosts.

## Stack

- **Runtime:** Bun 1.3+ with Hono HTTP server
- **DB:** Supabase Postgres us-east-1 + pgvector 0.8 + `turkish` text search
- **Embedding:** Gemini `text-embedding-004` (768 dim)
- **Cache:** In-memory LRU (`lru-cache`)
- **Deploy:** Fly.io `iad` (Virginia, AWS us-east-1)

## Development

```bash
bun install
cp .env.example .env
# .env'i doldur (SUPABASE_DB_URL, GEMINI_API_KEY, RETRIEVAL_SHARED_SECRET)

bun run dev              # localhost:8787
bun run typecheck
```

## Seeding

```bash
bun run seed:all         # products + faqs + synonyms + relations + meta
bun run embed:products   # 622 products × Gemini embed (~$0.10, ~2dk)
bun run embed:faqs       # 3200 FAQs × embed (~$0.30, ~5dk)
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/search` | Hybrid product search (BM25 + vector + boosts) |
| POST | `/faq` | FAQ search (product/brand/category scoped) |
| GET | `/products/:sku` | Product details (with joined specs, sizes) |
| GET | `/products/:sku/related` | Related products (variant/complement/alternative) |
| POST | `/search/price` | Price range + category filter |
| POST | `/search/rating` | Rating-sorted search |
| GET | `/health` | Health check |

All non-health endpoints require `X-Retrieval-Secret` header.

## Source data

CSV sources in `../output/csv/`:
- `products_master.csv` — base product info
- `product_search_index.csv` — enriched `search_text`
- `product_content.csv` — howToUse/whenToUse/whyThisProduct
- `product_desc_part1.csv` + `product_desc_part2.csv` — full description (joined back into single `full_description`)
- `product_specs.csv` — specs JSONB
- `product_faq.csv` — product-scoped FAQ
- `gyeon_faqs.csv`, `menzerna_brand_faqs.csv` — brand-scoped FAQ
- `category_faqs.csv` — category-scoped FAQ
- `product_relations.csv` — relations (use_before/use_after/use_with/accessories/alternatives)
- `product_meta.csv` — EAV meta
