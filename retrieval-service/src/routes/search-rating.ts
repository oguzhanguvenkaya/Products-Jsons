/**
 * POST /search/rating — Manufacturer rating top-N with durability fallback.
 *
 * Phase 4 revision (issue #8): specs.ratings is subjective 1-5 and sparse
 * (only 15/23 ceramic_coating products carry it; some brands have none).
 * specs.durability_months is objective and more broadly populated. For
 * `metric='durability'` we now rank by a composite: COALESCE(ratings.durability
 * normalized, durability_months / 12) — preserving rating-ordered results
 * where available, but surfacing MX-PRO / INNOVACAR etc. that lack ratings
 * but have concrete month/km durability figures.
 *
 * Response also includes specs.durability_months, specs.durability_km, and
 * specs.hardness so the LLM can cite concrete numbers rather than just
 * the subjective rating.
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
  durability_months: string | number | null;
  durability_km: string | number | null;
  hardness: string | null;
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

    const tg = templateGroup ?? null;

    // Durability metric: composite sort so products with concrete
    // durability_months (but no rating) still surface. Rating scale 1-5,
    // months scale 12-60 — we normalize months to a 0-5.5 scale via /10.
    // Other metrics (beading, self_cleaning) keep the rating-only sort.
    let rows: RatingRow[];
    if (metric === 'durability') {
      rows = await sql<RatingRow[]>`
        SELECT sku, name, brand, price, url, image_url,
               (specs #>> ARRAY['ratings','durability'])::numeric AS rating_value,
               (specs #>> ARRAY['ratings','durability'])::numeric AS durability,
               (specs #>> ARRAY['ratings','beading'])::numeric    AS beading,
               (specs #>> ARRAY['ratings','self_cleaning'])::numeric AS self_cleaning,
               (specs ->> 'durability_months')::numeric AS durability_months,
               (specs ->> 'durability_km')::numeric     AS durability_km,
                specs ->> 'hardness'                    AS hardness,
               COUNT(*) OVER () AS total_candidates
        FROM products
        WHERE (
                specs #>> ARRAY['ratings','durability'] IS NOT NULL
                OR specs ->> 'durability_months' IS NOT NULL
              )
          AND (${tg}::text IS NULL OR template_group = ${tg})
        ORDER BY
          COALESCE(
            (specs #>> ARRAY['ratings','durability'])::numeric,
            (specs ->> 'durability_months')::numeric / 10.0
          ) DESC NULLS LAST,
          name ASC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql<RatingRow[]>`
        SELECT sku, name, brand, price, url, image_url,
               (specs #>> ARRAY['ratings', ${metric}])::numeric AS rating_value,
               (specs #>> ARRAY['ratings','durability'])::numeric AS durability,
               (specs #>> ARRAY['ratings','beading'])::numeric    AS beading,
               (specs #>> ARRAY['ratings','self_cleaning'])::numeric AS self_cleaning,
               (specs ->> 'durability_months')::numeric AS durability_months,
               (specs ->> 'durability_km')::numeric     AS durability_km,
                specs ->> 'hardness'                    AS hardness,
               COUNT(*) OVER () AS total_candidates
        FROM products
        WHERE specs #>> ARRAY['ratings', ${metric}] IS NOT NULL
          AND (${tg}::text IS NULL OR template_group = ${tg})
        ORDER BY rating_value DESC NULLS LAST, name ASC
        LIMIT ${limit}
      `;
    }

    const totalCandidates = rows[0]
      ? Number(rows[0].total_candidates)
      : 0;

    const rankedProducts: RankedProduct[] = rows.map((r) => {
      const price = toNumberOrNull(r.price) ?? 0;
      const rv = toNumberOrNull(r.rating_value) ?? 0;
      const months = toNumberOrNull(r.durability_months);
      const km = toNumberOrNull(r.durability_km);
      const label = metricLabel(metric);
      const url = (r.url ?? '').trim();

      // Subtitle prefers concrete data: "GYEON • 50 ay / 50.000 km • 7.250 TL"
      // Falls back to rating if no months data.
      const durabilityBadge =
        metric === 'durability' && months != null
          ? `${months} ay${km != null ? ` / ${km.toLocaleString('tr-TR')} km` : ''}`
          : `${label}: ${rv}`;
      const subtitle = `${r.brand ?? ''} • ${durabilityBadge} • ${formatPriceTL(price)} TL`;

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
        durabilityMonths: months,
        durabilityKm: km,
        hardness: r.hardness,
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
