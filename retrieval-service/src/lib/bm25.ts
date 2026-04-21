/**
 * bm25.ts — Turkish FTS query builder for hybrid retrieval.
 *
 * Postgres gives us BM25-style ranking via `ts_rank_cd` on a
 * Turkish-stemmed tsvector. `product_search.search_vector` was
 * generated with weight 'A' at seed time, so the ranker already
 * treats the text as the primary field.
 *
 * The query text passed in here should be the expanded, normalized
 * form (output of `expandQuery().expanded`) so synonyms line up
 * with the indexed vocabulary.
 *
 * Filters mirror the pure-vector path so Phase 3.6 can fuse the two
 * result sets against the same candidate pool without diverging on
 * which rows are eligible.
 */

import { sql } from './db.ts';

export interface BM25Filters {
  brand?: string | null;
  templateGroup?: string | null;
  templateSubType?: string | null;
  /** Pre-expanded sub_type family. If provided, takes precedence over
   *  templateSubType — useful when paint_coating should also match
   *  paint_coating_kit, multi_step_coating_kit, single_layer_coating. */
  templateSubTypeFamily?: string[] | null;
  mainCat?: string | null;
  subCat?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  /** SKU allow-list (e.g. output of metaFilters resolution). */
  allowSkus?: string[] | null;
}

export interface BM25Hit {
  sku: string;
  score: number;
}

const DEFAULT_LIMIT = 50;

/**
 * Convert a free-text (normalized, synonym-expanded) query into a
 * `to_tsquery`-compatible OR-expression. We split on whitespace,
 * drop anything that isn't a letter or digit, keep tokens of length
 * ≥ 2, and join with ` | `. Postgres turkish FTS still stems each
 * lexeme server-side.
 *
 * Example:
 *   "cila polisaj pasta polish compound"
 *     → "cila | polisaj | pasta | polish | compound"
 *
 * Returns empty string when there are no usable tokens; callers
 * should treat that as "no BM25 candidates" without ever reaching
 * the DB.
 */
function tokensToOrTsQuery(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length >= 2)
    .join(' | ');
}

/**
 * Runs a Turkish FTS BM25-style query and returns the top matching
 * SKUs with their `ts_rank_cd` score.
 *
 * Returns an empty array when the query text is empty or when
 * `plainto_tsquery` produces no lexemes (e.g. query was all
 * punctuation).
 */
export async function runBm25Query(
  queryText: string,
  filters: BM25Filters = {},
  limit: number = DEFAULT_LIMIT,
): Promise<BM25Hit[]> {
  const text = queryText.trim();
  if (!text) return [];

  const tsQueryExpr = tokensToOrTsQuery(text);
  if (!tsQueryExpr) return [];

  const tg = filters.templateGroup ?? null;
  const tst = filters.templateSubType ?? null;
  const tstFamily =
    filters.templateSubTypeFamily && filters.templateSubTypeFamily.length > 0
      ? filters.templateSubTypeFamily
      : tst
        ? [tst]
        : null;
  const br = filters.brand ?? null;
  const mc = filters.mainCat ?? null;
  const sc = filters.subCat ?? null;
  const allow = filters.allowSkus && filters.allowSkus.length > 0 ? filters.allowSkus : null;

  // websearch_to_tsquery treats space-separated tokens as OR when no
  // operator is given, which is what we want for a synonym-expanded
  // query: "cila polisaj pasta polish compound" should match any
  // product that mentions ANY of those lexemes, not ALL of them.
  // plainto_tsquery would use AND semantics and yield zero matches
  // once expansion adds 4+ aliases.
  const priceMin = filters.priceMin ?? null;
  const priceMax = filters.priceMax ?? null;
  const rows = await sql<Array<{ sku: string; score: string | number }>>`
    SELECT p.sku,
           ts_rank_cd(ps.search_vector, to_tsquery('turkish', ${tsQueryExpr})) AS score
    FROM product_search ps
    JOIN products p USING (sku)
    WHERE ps.search_vector @@ to_tsquery('turkish', ${tsQueryExpr})
      AND (${tg}::text IS NULL OR p.template_group = ${tg})
      AND (${tstFamily}::text[] IS NULL OR p.template_sub_type = ANY(${tstFamily}))
      AND (${br}::text IS NULL OR p.brand = ${br})
      AND (${mc}::text IS NULL OR p.main_cat ILIKE ${mc ? `%${mc}%` : null})
      AND (${sc}::text IS NULL OR p.sub_cat ILIKE ${sc ? `%${sc}%` : null})
      AND (${priceMin}::numeric IS NULL OR p.price >= ${priceMin})
      AND (${priceMax}::numeric IS NULL OR p.price <= ${priceMax})
      AND (${allow}::text[] IS NULL OR p.sku = ANY(${allow}))
    ORDER BY score DESC, p.sku ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    sku: r.sku,
    score: typeof r.score === 'string' ? Number(r.score) : r.score,
  }));
}
