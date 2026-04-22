/**
 * GET /admin/products
 *   Paginated product listing with filters for the Catalog Atelier.
 *
 * GET /admin/products/:sku
 *   Full editor-grade product detail: base row, related tables, history
 *   placeholder. Admin API equivalent of /products/:sku but exposes
 *   everything the UI needs rather than the LLM-facing subset.
 *
 * History (audit log) returns [] until migration 008 ships; the shape is
 * already in place so the UI can render the timeline card without new
 * plumbing later.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from '../../lib/db.ts';

type AppVariables = { requestId: string };

export const adminProductsRoutes = new Hono<{ Variables: AppVariables }>();

// ───────────────────────────────────── GET /admin/products

const ListQuerySchema = z.object({
  group: z.string().trim().min(1).optional(),
  sub: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

type ListRow = {
  sku: string;
  name: string;
  base_name: string | null;
  brand: string | null;
  template_group: string | null;
  template_sub_type: string | null;
  price: string | number | null;
  image_url: string | null;
  variant_count: number;
  faq_count: number;
  specs_key_count: number;
};

adminProductsRoutes.get(
  '/products',
  zValidator('query', ListQuerySchema),
  async (c) => {
    const { group, sub, brand, q, limit, offset } = c.req.valid('query');

    const ilike = q ? `%${q}%` : null;

    const rows = await sql<ListRow[]>`
      SELECT
        p.sku,
        p.name,
        p.base_name,
        p.brand,
        p.template_group,
        p.template_sub_type,
        p.price,
        p.image_url,
        COALESCE(jsonb_array_length(p.sizes), 0)::int AS variant_count,
        (SELECT COUNT(*)::int FROM product_faqs f WHERE f.sku = p.sku) AS faq_count,
        COALESCE(
          (SELECT COUNT(*)::int FROM jsonb_object_keys(COALESCE(p.specs, '{}'::jsonb))),
          0
        ) AS specs_key_count
      FROM products p
      WHERE
        (${group ?? null}::text IS NULL OR p.template_group = ${group ?? null})
        AND (${sub ?? null}::text IS NULL OR p.template_sub_type = ${sub ?? null})
        AND (${brand ?? null}::text IS NULL OR p.brand = ${brand ?? null})
        AND (
          ${ilike}::text IS NULL
          OR p.sku ILIKE ${ilike}
          OR p.name ILIKE ${ilike}
          OR p.base_name ILIKE ${ilike}
        )
      ORDER BY p.template_group NULLS LAST, p.brand NULLS LAST, p.name
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalRow = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM products p
      WHERE
        (${group ?? null}::text IS NULL OR p.template_group = ${group ?? null})
        AND (${sub ?? null}::text IS NULL OR p.template_sub_type = ${sub ?? null})
        AND (${brand ?? null}::text IS NULL OR p.brand = ${brand ?? null})
        AND (
          ${ilike}::text IS NULL
          OR p.sku ILIKE ${ilike}
          OR p.name ILIKE ${ilike}
          OR p.base_name ILIKE ${ilike}
        )
    `;

    return c.json({
      total: totalRow[0]?.total ?? 0,
      limit,
      offset,
      items: rows.map((r) => ({
        sku: r.sku,
        name: r.name,
        baseName: r.base_name ?? r.name,
        brand: r.brand,
        templateGroup: r.template_group,
        templateSubType: r.template_sub_type,
        price: r.price === null ? null : Number(r.price),
        imageUrl: r.image_url,
        variantCount: r.variant_count,
        faqCount: r.faq_count,
        specsKeyCount: r.specs_key_count,
      })),
    });
  },
);

// ───────────────────────────────────── GET /admin/products/:sku

type DetailRow = {
  sku: string;
  name: string;
  base_name: string | null;
  brand: string | null;
  main_cat: string | null;
  sub_cat: string | null;
  sub_cat2: string | null;
  template_group: string | null;
  template_sub_type: string | null;
  target_surface: string[] | null;
  price: string | number | null;
  rating: string | number | null;
  stock_status: string | null;
  url: string | null;
  image_url: string | null;
  short_description: string | null;
  full_description: string | null;
  specs: unknown;
  sizes: unknown;
  variant_skus: string[] | null;
  is_featured: boolean | null;
  video_url: string | null;
  updated_at: Date | null;
};

type FaqRow = {
  id: number;
  sku: string | null;
  scope: string;
  brand: string | null;
  category: string | null;
  question: string;
  answer: string;
  created_at: Date | null;
};

type RelRow = {
  sku: string;
  related_sku: string;
  relation_type: string;
  confidence: string | number | null;
  related_name: string | null;
  related_brand: string | null;
};

type MetaRow = {
  key: string;
  value_text: string | null;
  value_numeric: string | null;
  value_boolean: boolean | null;
};

adminProductsRoutes.get('/products/:sku', async (c) => {
  const sku = c.req.param('sku');

  const [[product], faqs, relations, meta] = await Promise.all([
    sql<DetailRow[]>`
      SELECT sku, name, base_name, brand, main_cat, sub_cat, sub_cat2,
             template_group, template_sub_type, target_surface,
             price, rating, stock_status, url, image_url,
             short_description, full_description, specs, sizes,
             variant_skus, is_featured, video_url, updated_at
      FROM products
      WHERE sku = ${sku} OR ${sku} = ANY(variant_skus)
      LIMIT 1
    `,
    sql<FaqRow[]>`
      SELECT id, sku, scope, brand, category, question, answer, created_at
      FROM product_faqs
      WHERE sku = ${sku}
      ORDER BY created_at NULLS LAST, id
    `,
    sql<RelRow[]>`
      SELECT r.sku, r.related_sku, r.relation_type, r.confidence,
             p.name AS related_name, p.brand AS related_brand
      FROM product_relations r
      LEFT JOIN products p ON p.sku = r.related_sku
      WHERE r.sku = ${sku}
      ORDER BY r.relation_type, r.related_sku
    `,
    sql<MetaRow[]>`
      SELECT key, value_text, value_numeric, value_boolean
      FROM product_meta
      WHERE sku = ${sku}
      ORDER BY key
    `,
  ]);

  if (!product) {
    return c.json(
      {
        error: 'product_not_found',
        sku,
        request_id: c.get('requestId'),
      },
      404,
    );
  }

  return c.json({
    product: {
      sku: product.sku,
      name: product.name,
      baseName: product.base_name ?? product.name,
      brand: product.brand,
      categories: {
        mainCat: product.main_cat,
        subCat: product.sub_cat,
        subCat2: product.sub_cat2,
      },
      templateGroup: product.template_group,
      templateSubType: product.template_sub_type,
      targetSurface: product.target_surface,
      price: product.price === null ? null : Number(product.price),
      rating: product.rating === null ? null : Number(product.rating),
      stockStatus: product.stock_status,
      url: product.url,
      imageUrl: product.image_url,
      shortDescription: product.short_description,
      fullDescription: product.full_description,
      specs: product.specs,
      sizes: product.sizes,
      variantSkus: product.variant_skus ?? [],
      isFeatured: product.is_featured ?? false,
      videoUrl: product.video_url,
      updatedAt: product.updated_at?.toISOString() ?? null,
    },
    faqs: faqs.map((f) => ({
      id: f.id,
      sku: f.sku,
      scope: f.scope,
      brand: f.brand,
      category: f.category,
      question: f.question,
      answer: f.answer,
      createdAt: f.created_at?.toISOString() ?? null,
    })),
    relations: relations.map((r) => ({
      sourceSku: r.sku,
      targetSku: r.related_sku,
      relationType: r.relation_type,
      confidence: r.confidence === null ? null : Number(r.confidence),
      targetName: r.related_name,
      targetBrand: r.related_brand,
    })),
    meta: meta.map((m) => ({
      key: m.key,
      valueText: m.value_text,
      valueNumeric: m.value_numeric === null ? null : Number(m.value_numeric),
      valueBoolean: m.value_boolean,
    })),
    history: [] as Array<{
      when: string;
      who: string;
      action: string;
      diff?: string;
    }>,
  });
});
