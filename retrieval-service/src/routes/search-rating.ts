/**
 * POST /search/rating — Manufacturer rating top-N.
 *
 * Mirrors the Botpress searchByRating tool. Supabase `products.specs`
 * JSONB holds a `ratings` object with `durability`, `beading`,
 * `self_cleaning` keys (mostly seeded for GYEON Phase 3d enrichment;
 * other brands carry nulls). We extract the chosen metric inline
 * with the jsonb path operator and return descending by rating.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sql } from '../lib/db.ts';
import {
  RatingSearchInputSchema,
  RatingSearchResultSchema,
  type RankedProduct,
} from '../types.ts';
import { formatPriceTL, hasRenderableUrl } from '../lib/formatters.ts';

type AppVariables = { requestId: string };

export const searchRatingRoutes = new Hono<{ Variables: AppVariables }>();

interface RatingRow {
  sku: string;
  name: string;
  brand: string | null;
  price: string | number | null;
  url: string | null;
  image_url: string | null;
  rating_value: string | number | null;
  durability: string | number | null;
  beading: string | number | null;
  self_cleaning: string | number | null;
  total_candidates: string | number;
}

function metricLabel(metric: 'durability' | 'beading' | 'self_cleaning'): string {
  switch (metric) {
    case 'durability':
      return 'Dayanıklılık';
    case 'beading':
      return 'Beading';
    case 'self_cleaning':
      return 'Self-Cleaning';
  }
}

function toNumberOrNull(
  v: string | number | null | undefined,
): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

searchRatingRoutes.post(
  '/search/rating',
  zValidator('json', RatingSearchInputSchema),
  async (c) => {
    const { metric, templateGroup, limit } = c.req.valid('json');

    // Extract the chosen metric via jsonb path. The total_candidates
    // window function gives us the pre-LIMIT count without a second
    // roundtrip. `tg` is explicitly cast to text so postgres.js can
    // bind NULL.
    const tg = templateGroup ?? null;
    const rows = await sql<RatingRow[]>`
      SELECT sku,
             name,
             brand,
             price,
             url,
             image_url,
             (specs #>> ARRAY['ratings', ${metric}])::numeric AS rating_value,
             (specs #>> ARRAY['ratings','durability'])::numeric AS durability,
             (specs #>> ARRAY['ratings','beading'])::numeric AS beading,
             (specs #>> ARRAY['ratings','self_cleaning'])::numeric AS self_cleaning,
             COUNT(*) OVER () AS total_candidates
      FROM products
      WHERE specs #>> ARRAY['ratings', ${metric}] IS NOT NULL
        AND (${tg}::text IS NULL OR template_group = ${tg})
      ORDER BY rating_value DESC NULLS LAST, name ASC
      LIMIT ${limit}
    `;

    const totalCandidates = rows[0]
      ? Number(rows[0].total_candidates)
      : 0;

    const rankedProducts: RankedProduct[] = rows.map((r) => {
      const price = toNumberOrNull(r.price) ?? 0;
      const rv = toNumberOrNull(r.rating_value) ?? 0;
      const label = metricLabel(metric);
      const url = (r.url ?? '').trim();
      const subtitle = `${r.brand ?? ''} \u2022 ${label}: ${rv} \u2022 ${formatPriceTL(price)} TL`;
      return {
        sku: r.sku,
        productName: r.name,
        brand: r.brand ?? '',
        ratingValue: rv,
        allRatings: {
          durability: toNumberOrNull(r.durability),
          beading: toNumberOrNull(r.beading),
          self_cleaning: toNumberOrNull(r.self_cleaning),
        },
        price,
        url,
        imageUrl: r.image_url,
        carouselCard: {
          title: r.name,
          subtitle,
          imageUrl: r.image_url ?? undefined,
          actions: hasRenderableUrl(url)
            ? [
                {
                  action: 'url',
                  label: 'Ürün Sayfasına Git',
                  value: url,
                },
              ]
            : [],
        },
      };
    });

    const result = RatingSearchResultSchema.parse({
      metric,
      rankedProducts,
      totalCandidates,
    });

    return c.json(result);
  },
);
