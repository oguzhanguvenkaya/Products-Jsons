/**
 * searchCore.ts — Phase 2 baseline semantic search.
 *
 * Pure vector retrieval: embed the query with Gemini, cosine-rank
 * against product_embeddings (HNSW), join products for display data.
 * Pre-filter happens inside the SQL WHERE (brand, category, meta).
 * Post-filter happens in JS (exactMatch word-boundary), matching the
 * Botpress v9.x pattern so Phase 4 cutover stays a drop-in.
 *
 * Phase 3 will keep this function signature but layer BM25 + synonym
 * expansion + slot extraction + RRF fusion on top; tests can pin the
 * baseline by calling this module directly.
 */

import { sql } from './db.ts';
import { embedText } from './embed.ts';
import { cachedEmbed } from './cache.ts';
import {
  asNumber,
  toCarouselItemsWithVariants,
  toProductSummary,
  toTextFallbackLinesFromVariants,
} from './formatters.ts';
import type {
  MetaFilter,
  ProductRow,
  SearchInput,
  SearchResult,
} from '../types.ts';
import { expandQuery } from './synonymExpander.ts';
import { extractSlots } from './slotExtractor.ts';
import { runBm25Query } from './bm25.ts';
import { reciprocalRankFusion } from './rrf.ts';

// Buffer over `limit` so post-filter (exactMatch) can still hit
// `limit` results even after pruning unrelated variants.
const OVERSAMPLE_FACTOR = 5;

interface SearchHit extends ProductRow {
  similarity: number;
  search_text: string | null;
}

function vectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

/**
 * Resolve meta filters to a concrete SKU set. If any filter yields
 * zero matches, returns null → caller can short-circuit with an
 * empty response. AND semantics across filters.
 */
async function resolveMetaFilterSkus(
  filters: MetaFilter[],
): Promise<Set<string> | null> {
  if (filters.length === 0) return null;

  let accumulated: Set<string> | null = null;

  for (const mf of filters) {
    const rows = await sql<{ sku: string }[]>`
      SELECT sku
      FROM product_meta
      WHERE key = ${mf.key}
        AND ${buildMetaWhereFragment(mf)}
    `;
    const thisSet = new Set(rows.map((r) => r.sku));
    if (thisSet.size === 0) return new Set<string>(); // empty → short circuit
    if (accumulated === null) {
      accumulated = thisSet;
    } else {
      const current: Set<string> = accumulated;
      accumulated = new Set<string>(
        [...current].filter((s) => thisSet.has(s)),
      );
    }
    if (accumulated.size === 0) return accumulated;
  }
  return accumulated;
}

function buildMetaWhereFragment(mf: MetaFilter) {
  // postgres.js template returns a sql fragment. We branch on type +
  // op to pick the typed column (value_text / value_numeric / value_boolean).
  if (mf.op === 'eq' && typeof mf.value === 'boolean') {
    return sql`value_boolean = ${mf.value}`;
  }
  if (mf.op === 'eq' && typeof mf.value === 'number') {
    return sql`value_numeric = ${mf.value}`;
  }
  if (mf.op === 'eq' && typeof mf.value === 'string') {
    return sql`value_text = ${mf.value}`;
  }
  if (mf.op === 'regex' && typeof mf.value === 'string') {
    return sql`value_text ~* ${mf.value}`;
  }
  // numeric comparisons
  if (typeof mf.value === 'number') {
    switch (mf.op) {
      case 'gte':
        return sql`value_numeric >= ${mf.value}`;
      case 'lte':
        return sql`value_numeric <= ${mf.value}`;
      case 'gt':
        return sql`value_numeric > ${mf.value}`;
      case 'lt':
        return sql`value_numeric < ${mf.value}`;
    }
  }
  // Fallback no-op (match all). Should not happen given zod guard.
  return sql`TRUE`;
}

/**
 * Word-boundary post-filter. Mirrors the Botpress v9.0 pattern:
 * DB-side broad match, JS-side strict `\b<needle>(?![+\w])` regex.
 * Postgres POSIX `\b` is backspace, not word boundary, so strictness
 * must live in JS.
 */
function applyExactMatch(rows: SearchHit[], exactMatch: string, limit: number): SearchHit[] {
  const needle = exactMatch.trim();
  if (!needle) return rows.slice(0, limit);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const strictRegex = new RegExp(`\\b${escaped}(?![+\\w])`, 'i');

  const tokens = needle
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const strict = rows
    .filter((r) => strictRegex.test(String(r.name ?? '')))
    .sort((a, b) => {
      const nameA = (a.name ?? '').toLowerCase();
      const nameB = (b.name ?? '').toLowerCase();
      const mA = tokens.filter((t) => nameA.includes(t)).length;
      const mB = tokens.filter((t) => nameB.includes(t)).length;
      if (mA !== mB) return mB - mA;
      return nameA.length - nameB.length;
    });

  if (strict.length > 0) return strict.slice(0, limit);

  // Fallback 1: broad (case-insensitive substring)
  const broad = rows.filter((r) =>
    (r.name ?? '').toLowerCase().includes(needle.toLowerCase()),
  );
  if (broad.length > 0) return broad.slice(0, limit);

  // Fallback 2: original vector order — unchanged top-N.
  return rows.slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────

export async function searchPureVector(
  input: SearchInput,
): Promise<SearchResult> {
  const t0 = performance.now();
  const limit = input.limit;
  const fetchLimit = input.exactMatch
    ? Math.max(limit * OVERSAMPLE_FACTOR, 20)
    : limit;

  // 1. Meta filter → optional SKU allow-list
  const allowSkus = input.metaFilters
    ? await resolveMetaFilterSkus(input.metaFilters)
    : null;

  if (allowSkus !== null && allowSkus.size === 0) {
    return {
      carouselItems: [],
      textFallbackLines: [],
      productSummaries: [],
      totalReturned: 0,
      filtersApplied: {
        templateGroup: input.templateGroup ?? null,
        templateSubType: input.templateSubType ?? null,
        brand: input.brand ?? null,
        exactMatch: input.exactMatch ?? null,
      },
      debug: {
        mode: 'pure_vector',
        latencyMs: Math.round(performance.now() - t0),
        vecCount: 0,
        slots: { reason: 'meta_filter_empty' },
      },
    };
  }

  // 2. Embed (cache-aware)
  const { vector, cached } = await cachedEmbed(input.query, embedText);
  const vlit = vectorLiteral(vector);

  // 3. SQL with filters; postgres.js handles NULL short-circuits.
  const tg = input.templateGroup ?? null;
  const tst = input.templateSubType ?? null;
  const br = input.brand ?? null;
  const mc = input.mainCat ?? null;
  const sc = input.subCat ?? null;
  const skuList = allowSkus ? [...allowSkus] : null;

  const rows = await sql<SearchHit[]>`
    SELECT p.sku, p.name, p.brand, p.main_cat, p.sub_cat, p.sub_cat2,
           p.template_group, p.template_sub_type, p.target_surface,
           p.price, p.rating, p.stock_status, p.url, p.image_url,
           p.short_description, p.full_description, p.specs, p.sizes,
           p.variant_skus, p.is_featured,
           ps.search_text,
           (1 - (pe.embedding <=> ${vlit}::vector)) AS similarity
    FROM product_embeddings pe
    JOIN products p USING (sku)
    LEFT JOIN product_search ps USING (sku)
    WHERE (${tg}::text IS NULL OR p.template_group = ${tg})
      AND (${tst}::text IS NULL OR p.template_sub_type = ${tst})
      AND (${br}::text IS NULL OR p.brand = ${br})
      AND (${mc}::text IS NULL OR p.main_cat ILIKE ${mc ? `%${mc}%` : null})
      AND (${sc}::text IS NULL OR p.sub_cat ILIKE ${sc ? `%${sc}%` : null})
      AND (${skuList}::text[] IS NULL OR p.sku = ANY(${skuList}))
    ORDER BY pe.embedding <=> ${vlit}::vector
    LIMIT ${fetchLimit}
  `;

  // 4. Post-filter (exactMatch)
  const filtered = input.exactMatch
    ? applyExactMatch(rows, input.exactMatch, limit)
    : rows.slice(0, limit);

  // 5. Format
  const carouselItems = filtered.flatMap(toCarouselItemsWithVariants);
  const textFallbackLines = filtered.flatMap(
    toTextFallbackLinesFromVariants,
  );
  const productSummaries = filtered.map((r) =>
    toProductSummary({
      ...r,
      similarity: r.similarity,
      search_text: r.search_text,
    }),
  );

  return {
    carouselItems,
    textFallbackLines,
    productSummaries,
    totalReturned: filtered.length,
    filtersApplied: {
      templateGroup: input.templateGroup ?? null,
      templateSubType: input.templateSubType ?? null,
      brand: input.brand ?? null,
      exactMatch: input.exactMatch ?? null,
    },
    debug: {
      mode: 'pure_vector',
      latencyMs: Math.round(performance.now() - t0),
      vecCount: rows.length,
      slots: {
        embedCached: cached,
        oversampled: Boolean(input.exactMatch),
        fetchLimit,
        topSimilarity: rows[0]?.similarity ? asNumber(rows[0].similarity) : null,
        metaAllowListSize: allowSkus?.size ?? null,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Hybrid pipeline (Phase 3): normalize → synonym → slot → embed →
// [BM25 ∥ vector] → RRF → post-filter → format.
// ─────────────────────────────────────────────────────────────────

const HYBRID_CANDIDATE_LIMIT = 50;
const HYBRID_RRF_K = 60;

/**
 * Fetches full ProductRow + search_text for a SKU list, preserving
 * order via a `array_position` ORDER BY. Used after RRF to hydrate
 * the fused list into display-ready rows.
 */
async function hydrateByRankedSkus(
  orderedSkus: string[],
): Promise<SearchHit[]> {
  if (orderedSkus.length === 0) return [];
  const rows = await sql<SearchHit[]>`
    SELECT p.sku, p.name, p.brand, p.main_cat, p.sub_cat, p.sub_cat2,
           p.template_group, p.template_sub_type, p.target_surface,
           p.price, p.rating, p.stock_status, p.url, p.image_url,
           p.short_description, p.full_description, p.specs, p.sizes,
           p.variant_skus, p.is_featured,
           ps.search_text,
           0::numeric AS similarity
    FROM products p
    LEFT JOIN product_search ps USING (sku)
    WHERE p.sku = ANY(${orderedSkus})
    ORDER BY array_position(${orderedSkus}::text[], p.sku)
  `;
  return rows;
}

export async function searchHybrid(
  input: SearchInput,
): Promise<SearchResult> {
  const t0 = performance.now();
  const limit = input.limit;

  // 1. Meta filter → optional SKU allow-list (same as pure_vector)
  const allowSet = input.metaFilters
    ? await resolveMetaFilterSkus(input.metaFilters)
    : null;

  if (allowSet !== null && allowSet.size === 0) {
    return {
      carouselItems: [],
      textFallbackLines: [],
      productSummaries: [],
      totalReturned: 0,
      filtersApplied: {
        templateGroup: input.templateGroup ?? null,
        templateSubType: input.templateSubType ?? null,
        brand: input.brand ?? null,
        exactMatch: input.exactMatch ?? null,
      },
      debug: {
        mode: 'hybrid',
        latencyMs: Math.round(performance.now() - t0),
        vecCount: 0,
        bm25Count: 0,
        slots: { reason: 'meta_filter_empty' },
      },
    };
  }

  // 2. Normalize + synonym expand + slot extract.
  const expanded = await expandQuery(input.query);
  const slots = extractSlots(input.query);

  // Slot brand overrides input.brand ONLY if the caller did not
  // provide one explicitly. LLM-derived brands win over regex guesses.
  const effectiveBrand = input.brand ?? slots.brand ?? null;
  const priceMin = slots.priceMin ?? null;
  const priceMax = slots.priceMax ?? null;

  const allowArr = allowSet ? [...allowSet] : null;
  const tg = input.templateGroup ?? null;
  const tst = input.templateSubType ?? null;
  const mc = input.mainCat ?? null;
  const sc = input.subCat ?? null;

  // 3. Parallel: BM25 over expanded text + vector over original query.
  const { vector, cached } = await cachedEmbed(input.query, embedText);
  const vlit = vectorLiteral(vector);

  const [bm25Hits, vecHits] = await Promise.all([
    runBm25Query(
      expanded.expanded,
      {
        brand: effectiveBrand,
        templateGroup: tg,
        templateSubType: tst,
        mainCat: mc,
        subCat: sc,
        priceMin,
        priceMax,
        allowSkus: allowArr,
      },
      HYBRID_CANDIDATE_LIMIT,
    ),
    sql<Array<{ sku: string; similarity: string | number }>>`
      SELECT p.sku,
             (1 - (pe.embedding <=> ${vlit}::vector)) AS similarity
      FROM product_embeddings pe
      JOIN products p USING (sku)
      WHERE (${tg}::text IS NULL OR p.template_group = ${tg})
        AND (${tst}::text IS NULL OR p.template_sub_type = ${tst})
        AND (${effectiveBrand}::text IS NULL OR p.brand = ${effectiveBrand})
        AND (${mc}::text IS NULL OR p.main_cat ILIKE ${mc ? `%${mc}%` : null})
        AND (${sc}::text IS NULL OR p.sub_cat ILIKE ${sc ? `%${sc}%` : null})
        AND (${priceMin}::numeric IS NULL OR p.price >= ${priceMin})
        AND (${priceMax}::numeric IS NULL OR p.price <= ${priceMax})
        AND (${allowArr}::text[] IS NULL OR p.sku = ANY(${allowArr}))
      ORDER BY pe.embedding <=> ${vlit}::vector
      LIMIT ${HYBRID_CANDIDATE_LIMIT}
    `,
  ]);

  // 4. RRF fuse.
  const fused = reciprocalRankFusion(
    [bm25Hits.map((h) => ({ sku: h.sku })), vecHits.map((h) => ({ sku: h.sku }))],
    { k: HYBRID_RRF_K },
  );

  // Hydrate top (fetchLimit for exactMatch buffer, else limit).
  const fetchLimit = input.exactMatch
    ? Math.max(limit * OVERSAMPLE_FACTOR, 20)
    : limit;
  const topSkus = fused.slice(0, fetchLimit).map((f) => f.sku);
  const hydrated = await hydrateByRankedSkus(topSkus);

  // Attach per-row fused score for downstream boost / tie-break.
  const rrfLookup = new Map<string, number>();
  for (const f of fused) rrfLookup.set(f.sku, f.rrf_score);
  const vecLookup = new Map<string, number>();
  for (const v of vecHits) {
    vecLookup.set(v.sku, typeof v.similarity === 'string' ? Number(v.similarity) : v.similarity);
  }
  for (const row of hydrated) {
    // Put cosine similarity on the row so formatter / boost use it.
    row.similarity = vecLookup.get(row.sku) ?? 0;
  }

  // 5. Post-filter (exactMatch) — preserves RRF order within matches.
  const filtered = input.exactMatch
    ? applyExactMatch(hydrated, input.exactMatch, limit)
    : hydrated.slice(0, limit);

  // 6. Format
  const carouselItems = filtered.flatMap(toCarouselItemsWithVariants);
  const textFallbackLines = filtered.flatMap(
    toTextFallbackLinesFromVariants,
  );
  const productSummaries = filtered.map((r) =>
    toProductSummary({
      ...r,
      similarity: r.similarity,
      search_text: r.search_text,
    }),
  );

  return {
    carouselItems,
    textFallbackLines,
    productSummaries,
    totalReturned: filtered.length,
    filtersApplied: {
      templateGroup: input.templateGroup ?? null,
      templateSubType: input.templateSubType ?? null,
      brand: effectiveBrand,
      exactMatch: input.exactMatch ?? null,
    },
    debug: {
      mode: 'hybrid',
      latencyMs: Math.round(performance.now() - t0),
      vecCount: vecHits.length,
      bm25Count: bm25Hits.length,
      slots: {
        embedCached: cached,
        oversampled: Boolean(input.exactMatch),
        fetchLimit,
        rrfK: HYBRID_RRF_K,
        mergedCount: fused.length,
        topRrfScore: fused[0]?.rrf_score ?? null,
        addedAliases: expanded.addedAliases,
        extractedSlots: {
          brand: slots.brand ?? null,
          priceMin: slots.priceMin ?? null,
          priceMax: slots.priceMax ?? null,
          ratingHint: slots.ratingHint ?? null,
        },
        metaAllowListSize: allowSet?.size ?? null,
      },
    },
  };
}

/**
 * Entry point: routes by input.mode.
 */
export async function search(input: SearchInput): Promise<SearchResult> {
  return input.mode === 'pure_vector'
    ? searchPureVector(input)
    : searchHybrid(input);
}
