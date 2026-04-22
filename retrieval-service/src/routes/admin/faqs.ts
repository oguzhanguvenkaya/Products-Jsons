/**
 * GET /admin/faqs?sku=&scope=&brand=&q=&limit=&offset=
 *   Paginated FAQ listing for the Catalog Atelier FAQ manager.
 *   Filters are optional and composable; `q` does a case-insensitive
 *   match against question + answer.
 *
 * GET /admin/faqs/:id
 *   Single FAQ lookup by integer id.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from '../../lib/db.ts';

type AppVariables = { requestId: string };

export const adminFaqsRoutes = new Hono<{ Variables: AppVariables }>();

const ListSchema = z.object({
  sku: z.string().trim().min(1).optional(),
  scope: z.enum(['product', 'brand', 'category']).optional(),
  brand: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

type Row = {
  id: number;
  sku: string | null;
  scope: string;
  brand: string | null;
  category: string | null;
  question: string;
  answer: string;
  created_at: Date | null;
  product_name: string | null;
};

adminFaqsRoutes.get('/faqs', zValidator('query', ListSchema), async (c) => {
  const { sku, scope, brand, category, q, limit, offset } =
    c.req.valid('query');

  const ilike = q ? `%${q}%` : null;

  const rows = await sql<Row[]>`
    SELECT f.id, f.sku, f.scope, f.brand, f.category,
           f.question, f.answer, f.created_at,
           p.name AS product_name
    FROM product_faqs f
    LEFT JOIN products p ON p.sku = f.sku
    WHERE
      (${sku ?? null}::text IS NULL OR f.sku = ${sku ?? null})
      AND (${scope ?? null}::text IS NULL OR f.scope = ${scope ?? null})
      AND (${brand ?? null}::text IS NULL OR f.brand = ${brand ?? null})
      AND (${category ?? null}::text IS NULL OR f.category = ${category ?? null})
      AND (
        ${ilike}::text IS NULL
        OR f.question ILIKE ${ilike}
        OR f.answer ILIKE ${ilike}
      )
    ORDER BY f.created_at DESC NULLS LAST, f.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const totalRow = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM product_faqs f
    WHERE
      (${sku ?? null}::text IS NULL OR f.sku = ${sku ?? null})
      AND (${scope ?? null}::text IS NULL OR f.scope = ${scope ?? null})
      AND (${brand ?? null}::text IS NULL OR f.brand = ${brand ?? null})
      AND (${category ?? null}::text IS NULL OR f.category = ${category ?? null})
      AND (
        ${ilike}::text IS NULL
        OR f.question ILIKE ${ilike}
        OR f.answer ILIKE ${ilike}
      )
  `;

  // Scope distribution for the UI header chips (on the unfiltered-by-q set)
  const scopeCountsRow = await sql<
    { scope: string; total: number }[]
  >`
    SELECT scope, COUNT(*)::int AS total
    FROM product_faqs
    GROUP BY scope
    ORDER BY total DESC
  `;

  return c.json({
    total: totalRow[0]?.total ?? 0,
    limit,
    offset,
    scopeCounts: Object.fromEntries(
      scopeCountsRow.map((r) => [r.scope, r.total]),
    ),
    items: rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      scope: r.scope,
      brand: r.brand,
      category: r.category,
      question: r.question,
      answer: r.answer,
      createdAt: r.created_at?.toISOString() ?? null,
      productName: r.product_name,
    })),
  });
});

adminFaqsRoutes.get('/faqs/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id)) {
    return c.json({ error: 'invalid_id' }, 400);
  }
  const [row] = await sql<Row[]>`
    SELECT f.id, f.sku, f.scope, f.brand, f.category,
           f.question, f.answer, f.created_at,
           p.name AS product_name
    FROM product_faqs f
    LEFT JOIN products p ON p.sku = f.sku
    WHERE f.id = ${id}
    LIMIT 1
  `;
  if (!row) return c.json({ error: 'faq_not_found', id }, 404);
  return c.json({
    id: row.id,
    sku: row.sku,
    scope: row.scope,
    brand: row.brand,
    category: row.category,
    question: row.question,
    answer: row.answer,
    createdAt: row.created_at?.toISOString() ?? null,
    productName: row.product_name,
  });
});
