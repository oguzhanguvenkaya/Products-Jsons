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
  mainCat?: string | null;
  subCat?: string | null;
  /** SKU allow-list (e.g. output of metaFilters resolution). */
  allowSkus?: string[] | null;
}

export interface BM25Hit {
  sku: string;
  score: number;
}

const DEFAULT_LIMIT = 50;

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

  const tg = filters.templateGroup ?? null;
  const tst = filters.templateSubType ?? null;
  const br = filters.brand ?? null;
  const mc = filters.mainCat ?? null;
  const sc = filters.subCat ?? null;
  const allow = filters.allowSkus && filters.allowSkus.length > 0 ? filters.allowSkus : null;

  const rows = await sql<Array<{ sku: string; score: string | number }>>`
    SELECT p.sku,
           ts_rank_cd(ps.search_vector, plainto_tsquery('turkish', ${text})) AS score
    FROM product_search ps
    JOIN products p USING (sku)
    WHERE ps.search_vector @@ plainto_tsquery('turkish', ${text})
      AND (${tg}::text IS NULL OR p.template_group = ${tg})
      AND (${tst}::text IS NULL OR p.template_sub_type = ${tst})
      AND (${br}::text IS NULL OR p.brand = ${br})
      AND (${mc}::text IS NULL OR p.main_cat ILIKE ${mc ? `%${mc}%` : null})
      AND (${sc}::text IS NULL OR p.sub_cat ILIKE ${sc ? `%${sc}%` : null})
      AND (${allow}::text[] IS NULL OR p.sku = ANY(${allow}))
    ORDER BY score DESC, p.sku ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    sku: r.sku,
    score: typeof r.score === 'string' ? Number(r.score) : r.score,
  }));
}
