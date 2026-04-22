/**
 * GET /admin/relations?sku=&relatedSku=&type=&limit=&offset=
 *   Paginated relation listing for the global Relations view.
 *   Joins both endpoints' product names so the UI can render brand
 *   + name without a follow-up fetch.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from '../../lib/db.ts';

type AppVariables = { requestId: string };

export const adminRelationsRoutes = new Hono<{ Variables: AppVariables }>();

const RELATION_TYPES = [
  'use_with',
  'use_before',
  'use_after',
  'accessories',
  'alternatives',
  'primary',
  'variant',
  'complement',
  'alternative',
] as const;

const ListSchema = z.object({
  sku: z.string().trim().min(1).optional(),
  relatedSku: z.string().trim().min(1).optional(),
  type: z.enum(RELATION_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

type Row = {
  sku: string;
  related_sku: string;
  relation_type: string;
  confidence: string | number | null;
  source_name: string | null;
  source_brand: string | null;
  related_name: string | null;
  related_brand: string | null;
};

adminRelationsRoutes.get(
  '/relations',
  zValidator('query', ListSchema),
  async (c) => {
    const { sku, relatedSku, type, limit, offset } = c.req.valid('query');

    const rows = await sql<Row[]>`
      SELECT r.sku, r.related_sku, r.relation_type, r.confidence,
             ps.name  AS source_name,  ps.brand AS source_brand,
             pr.name  AS related_name, pr.brand AS related_brand
      FROM product_relations r
      LEFT JOIN products ps ON ps.sku = r.sku
      LEFT JOIN products pr ON pr.sku = r.related_sku
      WHERE
        (${sku ?? null}::text IS NULL OR r.sku = ${sku ?? null})
        AND (${relatedSku ?? null}::text IS NULL OR r.related_sku = ${relatedSku ?? null})
        AND (${type ?? null}::text IS NULL OR r.relation_type = ${type ?? null})
      ORDER BY r.relation_type, r.sku, r.related_sku
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalRow = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM product_relations r
      WHERE
        (${sku ?? null}::text IS NULL OR r.sku = ${sku ?? null})
        AND (${relatedSku ?? null}::text IS NULL OR r.related_sku = ${relatedSku ?? null})
        AND (${type ?? null}::text IS NULL OR r.relation_type = ${type ?? null})
    `;

    const typeCountsRow = await sql<
      { relation_type: string; total: number }[]
    >`
      SELECT relation_type, COUNT(*)::int AS total
      FROM product_relations
      GROUP BY relation_type
      ORDER BY total DESC
    `;

    return c.json({
      total: totalRow[0]?.total ?? 0,
      limit,
      offset,
      typeCounts: Object.fromEntries(
        typeCountsRow.map((r) => [r.relation_type, r.total]),
      ),
      items: rows.map((r) => ({
        sourceSku: r.sku,
        sourceName: r.source_name,
        sourceBrand: r.source_brand,
        targetSku: r.related_sku,
        targetName: r.related_name,
        targetBrand: r.related_brand,
        relationType: r.relation_type,
        confidence: r.confidence === null ? null : Number(r.confidence),
      })),
    });
  },
);
