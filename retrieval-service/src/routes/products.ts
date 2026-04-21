/**
 * /products/:sku and /products/:sku/related
 *
 * Deterministic lookups (no embedding, no ranking). Everything the
 * Botpress getProductDetails / getRelatedProducts tools need comes
 * from direct SQL against Supabase.
 *
 * The Phase 1 seed pipeline embeds howToUse / whenToUse /
 * whyThisProduct inside products.specs JSONB, so unpackProductContent
 * splits them back out for the response.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sql } from '../lib/db.ts';
import type { ProductRow, FaqRow } from '../types.ts';
import {
  ProductDetailsSchema,
  ProductGuideSchema,
  RelatedInputSchema,
  RelatedResultSchema,
} from '../types.ts';
import {
  asNumber,
  formatVideoCard,
  targetSurfaceToString,
  toCarouselItemsWithVariants,
  toLiteProductSummary,
  toTextFallbackLinesFromVariants,
  unpackProductContent,
} from '../lib/formatters.ts';

type AppVariables = { requestId: string };

export const productsRoutes = new Hono<{ Variables: AppVariables }>();

// ─────────────────────────────────────────────────────────────────
// Shared: lookup primary product by direct SKU or variant_skus
// ─────────────────────────────────────────────────────────────────

async function findProductByAnySku(inputSku: string): Promise<ProductRow | null> {
  // Direct lookup first
  const direct = await sql<ProductRow[]>`
    SELECT sku, name, brand, main_cat, sub_cat, sub_cat2,
           template_group, template_sub_type, target_surface,
           price, rating, stock_status, url, image_url,
           short_description, full_description, specs, sizes,
           variant_skus, is_featured, video_url
    FROM products
    WHERE sku = ${inputSku}
    LIMIT 1
  `;
  if (direct.length > 0) return direct[0]!;

  // Fall back: inputSku may be a secondary variant listed in variant_skus[]
  const viaVariant = await sql<ProductRow[]>`
    SELECT sku, name, brand, main_cat, sub_cat, sub_cat2,
           template_group, template_sub_type, target_surface,
           price, rating, stock_status, url, image_url,
           short_description, full_description, specs, sizes,
           variant_skus, is_featured, video_url
    FROM products
    WHERE ${inputSku} = ANY(variant_skus)
    LIMIT 1
  `;
  return viaVariant[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────
// GET /products/:sku
// ─────────────────────────────────────────────────────────────────

productsRoutes.get('/products/:sku', async (c) => {
  const inputSku = c.req.param('sku');

  const row = await findProductByAnySku(inputSku);
  if (!row) {
    return c.json(
      {
        error: 'product_not_found',
        sku: inputSku,
        request_id: c.get('requestId'),
      },
      404,
    );
  }

  const faqs = await sql<FaqRow[]>`
    SELECT id, scope, sku, brand, category, question, answer
    FROM product_faqs
    WHERE scope = 'product' AND sku = ${row.sku}
    ORDER BY id
    LIMIT 50
  `;

  const unpacked = unpackProductContent(row.specs);

  const details = ProductDetailsSchema.parse({
    sku: row.sku,
    inputSku,
    baseName: row.name, // base_name column not yet populated in products (Phase 3/4 TODO)
    productName: row.name,
    brand: row.brand ?? '',
    price: asNumber(row.price),
    imageUrl: row.image_url,
    url: row.url ?? '',
    mainCat: row.main_cat ?? '',
    subCat: row.sub_cat,
    sub_cat2: row.sub_cat2,
    targetSurface: targetSurfaceToString(row.target_surface),
    templateGroup: row.template_group ?? '',
    templateSubType: row.template_sub_type ?? '',
    technicalSpecs: unpacked.technicalSpecs,
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    howToUse: unpacked.howToUse,
    whenToUse: unpacked.whenToUse,
    whyThisProduct: unpacked.whyThisProduct,
    fullDescription: row.full_description,
    variants: row.sizes ?? [],
  });

  return c.json(details);
});

// ─────────────────────────────────────────────────────────────────
// GET /products/:sku/guide
//
// getApplicationGuide tool mirror: hafif payload (14 alan) + videoCard.
// getProductDetails'in faqs[] + technicalSpecs + variants[] alanlarını
// DÖNMEZ — "nasıl uygulanır" sorularında LLM context'i 3-4x daha küçük.
// ─────────────────────────────────────────────────────────────────

productsRoutes.get('/products/:sku/guide', async (c) => {
  const inputSku = c.req.param('sku');

  const row = await findProductByAnySku(inputSku);
  if (!row) {
    return c.json(
      {
        error: 'product_not_found',
        sku: inputSku,
        request_id: c.get('requestId'),
      },
      404,
    );
  }

  const unpacked = unpackProductContent(row.specs);

  const guide = ProductGuideSchema.parse({
    sku: row.sku,
    productName: row.name,
    brand: row.brand ?? '',
    price: asNumber(row.price),
    imageUrl: row.image_url,
    url: row.url ?? '',
    targetSurface: targetSurfaceToString(row.target_surface),
    templateGroup: row.template_group ?? '',
    templateSubType: row.template_sub_type ?? '',
    howToUse: unpacked.howToUse,
    whenToUse: unpacked.whenToUse,
    whyThisProduct: unpacked.whyThisProduct,
    fullDescription: row.full_description,
    videoCard: formatVideoCard(row.video_url, row.name),
  });

  return c.json(guide);
});

// ─────────────────────────────────────────────────────────────────
// GET /products/:sku/related?relationType=use_with
// ─────────────────────────────────────────────────────────────────

productsRoutes.get(
  '/products/:sku/related',
  zValidator('query', RelatedInputSchema),
  async (c) => {
    const inputSku = c.req.param('sku');
    const { relationType } = c.req.valid('query');

    const primary = await findProductByAnySku(inputSku);
    if (!primary) {
      return c.json(
        {
          error: 'product_not_found',
          sku: inputSku,
          request_id: c.get('requestId'),
        },
        404,
      );
    }

    const related = await sql<ProductRow[]>`
      SELECT p.sku, p.name, p.brand, p.main_cat, p.sub_cat, p.sub_cat2,
             p.template_group, p.template_sub_type, p.target_surface,
             p.price, p.rating, p.stock_status, p.url, p.image_url,
             p.short_description, p.full_description, p.specs, p.sizes,
             p.variant_skus, p.is_featured
      FROM product_relations r
      JOIN products p ON p.sku = r.related_sku
      WHERE r.sku = ${primary.sku}
        AND r.relation_type = ${relationType}
      ORDER BY r.confidence DESC NULLS LAST, p.name ASC
      LIMIT 20
    `;

    const carouselItems = related.flatMap(toCarouselItemsWithVariants);
    const textFallbackLines = related.flatMap(toTextFallbackLinesFromVariants);
    const productSummaries = related.map(toLiteProductSummary);

    const result = RelatedResultSchema.parse({
      sku: primary.sku,
      relationType,
      carouselItems,
      textFallbackLines,
      productSummaries,
      totalReturned: related.length,
    });

    return c.json(result);
  },
);
