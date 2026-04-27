/**
 * POST /search/price — Structured price-range search.
 *
 * Mirrors the Botpress searchByPriceRange tool: variant-aware sort
 * (asc → cheapest in-range variant first, desc → most expensive),
 * optional templateGroup and brand filters. Deterministic SQL (no
 * embeddings).
 *
 * Phase 1.1: ORDER BY now uses the in-range variant MIN (asc) or MAX
 * (desc), falling back to primary `price`. Without this, a product
 * whose primary is 4800 TL but whose 30ml variant is 1950 TL would
 * pass a "3000 TL altı" filter (via the EXISTS branch) yet sort by
 * the irrelevant 4800 TL primary. NULLIF(s->>'price', '') guards
 * against rows where size objects carry empty-string prices.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sql } from '../lib/db.ts';
import type { ProductRow } from '../types.ts';
import {
  PriceSearchInputSchema,
  PriceSearchResultSchema,
} from '../types.ts';
import {
  toCarouselItemsWithVariants,
  toLiteProductSummary,
  toTextFallbackLinesFromVariants,
} from '../lib/formatters.ts';

type AppVariables = { requestId: string };

export const searchPriceRoutes = new Hono<{ Variables: AppVariables }>();

searchPriceRoutes.post(
  '/search/price',
  zValidator('json', PriceSearchInputSchema),
  async (c) => {
    const { minPrice, maxPrice, templateGroup, brand, limit, sortDirection } =
      c.req.valid('json');

    // Two SQL branches (asc / desc) — avoids dynamic ORDER BY direction
    // interpolation. Variant filter mirrors the WHERE EXISTS clause's
    // null-short-circuit pattern.
    const rows =
      sortDirection === 'desc'
        ? await sql<ProductRow[]>`
            SELECT sku, name, base_name, brand, main_cat, sub_cat, sub_cat2,
                   template_group, template_sub_type, target_surface,
                   price, rating, stock_status, url, image_url,
                   short_description, full_description, specs, sizes,
                   variant_skus, is_featured
            FROM products
            WHERE price IS NOT NULL AND price > 0
              AND (
                (
                  (${minPrice ?? null}::numeric IS NULL OR price >= ${minPrice ?? null})
                  AND (${maxPrice ?? null}::numeric IS NULL OR price <= ${maxPrice ?? null})
                )
                OR EXISTS (
                  SELECT 1 FROM jsonb_array_elements(COALESCE(sizes, '[]'::jsonb)) s
                  WHERE (${minPrice ?? null}::numeric IS NULL OR NULLIF(s->>'price', '')::numeric >= ${minPrice ?? null})
                    AND (${maxPrice ?? null}::numeric IS NULL OR NULLIF(s->>'price', '')::numeric <= ${maxPrice ?? null})
                    AND NULLIF(s->>'price', '')::numeric > 0
                )
              )
              AND (${templateGroup ?? null}::text IS NULL OR template_group = ${templateGroup ?? null})
              AND (${brand ?? null}::text IS NULL OR brand = ${brand ?? null})
            ORDER BY COALESCE(
              (SELECT MAX(NULLIF(s->>'price', '')::numeric)
               FROM jsonb_array_elements(COALESCE(sizes, '[]'::jsonb)) s
               WHERE (${minPrice ?? null}::numeric IS NULL OR NULLIF(s->>'price', '')::numeric >= ${minPrice ?? null})
                 AND (${maxPrice ?? null}::numeric IS NULL OR NULLIF(s->>'price', '')::numeric <= ${maxPrice ?? null})
                 AND NULLIF(s->>'price', '')::numeric > 0),
              price
            ) DESC NULLS LAST, sku ASC
            LIMIT ${limit}
          `
        : await sql<ProductRow[]>`
            SELECT sku, name, base_name, brand, main_cat, sub_cat, sub_cat2,
                   template_group, template_sub_type, target_surface,
                   price, rating, stock_status, url, image_url,
                   short_description, full_description, specs, sizes,
                   variant_skus, is_featured
            FROM products
            WHERE price IS NOT NULL AND price > 0
              AND (
                (
                  (${minPrice ?? null}::numeric IS NULL OR price >= ${minPrice ?? null})
                  AND (${maxPrice ?? null}::numeric IS NULL OR price <= ${maxPrice ?? null})
                )
                OR EXISTS (
                  SELECT 1 FROM jsonb_array_elements(COALESCE(sizes, '[]'::jsonb)) s
                  WHERE (${minPrice ?? null}::numeric IS NULL OR NULLIF(s->>'price', '')::numeric >= ${minPrice ?? null})
                    AND (${maxPrice ?? null}::numeric IS NULL OR NULLIF(s->>'price', '')::numeric <= ${maxPrice ?? null})
                    AND NULLIF(s->>'price', '')::numeric > 0
                )
              )
              AND (${templateGroup ?? null}::text IS NULL OR template_group = ${templateGroup ?? null})
              AND (${brand ?? null}::text IS NULL OR brand = ${brand ?? null})
            ORDER BY COALESCE(
              (SELECT MIN(NULLIF(s->>'price', '')::numeric)
               FROM jsonb_array_elements(COALESCE(sizes, '[]'::jsonb)) s
               WHERE (${minPrice ?? null}::numeric IS NULL OR NULLIF(s->>'price', '')::numeric >= ${minPrice ?? null})
                 AND (${maxPrice ?? null}::numeric IS NULL OR NULLIF(s->>'price', '')::numeric <= ${maxPrice ?? null})
                 AND NULLIF(s->>'price', '')::numeric > 0),
              price
            ) ASC NULLS LAST, sku ASC
            LIMIT ${limit}
          `;

    const variantFilter = {
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
    };
    const carouselItems = rows.flatMap((r) =>
      toCarouselItemsWithVariants(r, variantFilter),
    );
    const textFallbackLines = rows.flatMap((r) =>
      toTextFallbackLinesFromVariants(r, variantFilter),
    );
    const productSummaries = rows.map(toLiteProductSummary);

    const result = PriceSearchResultSchema.parse({
      carouselItems,
      textFallbackLines,
      productSummaries,
      totalReturned: rows.length,
    });

    return c.json(result);
  },
);
