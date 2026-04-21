/**
 * POST /search/price — Structured price-range search.
 *
 * Mirrors the Botpress searchByPriceRange tool: ascending price
 * order, optional templateGroup and brand filters. This is a
 * deterministic SQL query (no embeddings).
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
    const { minPrice, maxPrice, templateGroup, brand, limit } =
      c.req.valid('json');

    // Each filter is optional; we build the WHERE inline with
    // postgres.js's $param interpolation + IS NULL short-circuits.
    const rows = await sql<ProductRow[]>`
      SELECT sku, name, brand, main_cat, sub_cat, sub_cat2,
             template_group, template_sub_type, target_surface,
             price, rating, stock_status, url, image_url,
             short_description, full_description, specs, sizes,
             variant_skus, is_featured
      FROM products
      WHERE price IS NOT NULL
        AND (${minPrice ?? null}::numeric IS NULL OR price >= ${minPrice ?? null})
        AND (${maxPrice ?? null}::numeric IS NULL OR price <= ${maxPrice ?? null})
        AND (${templateGroup ?? null}::text IS NULL OR template_group = ${templateGroup ?? null})
        AND (${brand ?? null}::text IS NULL OR brand = ${brand ?? null})
      ORDER BY price ASC
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
