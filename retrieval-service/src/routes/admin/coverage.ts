/**
 * GET /admin/coverage
 *
 * Two sections:
 *   - global: top-N specs key coverage across every product
 *   - perGroup: for the group passed via ?group=, key-level coverage
 *
 * Counts are derived from jsonb_each(products.specs), so the exact set
 * of keys emerges from the data — no hardcoded list. Null-safe against
 * products with empty specs (COALESCE to '{}'::jsonb).
 *
 * Query contract:
 *   GET /admin/coverage                  → global only
 *   GET /admin/coverage?group=ceramic_coating
 *                                        → global + that group's detail
 *   GET /admin/coverage?group=X&limit=40 → override top-N (default 25)
 */

import { Hono } from 'hono';
import { sql } from '../../lib/db.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type AppVariables = { requestId: string };

export const adminCoverageRoutes = new Hono<{ Variables: AppVariables }>();

const QuerySchema = z.object({
  group: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(80).default(25),
});

type GlobalRow = { key: string; product_count: number; total: number };
type GroupRow = { key: string; product_count: number; total: number };

adminCoverageRoutes.get(
  '/coverage',
  zValidator('query', QuerySchema),
  async (c) => {
    const { group, limit } = c.req.valid('query');

    const [global, groupTotalRow] = await Promise.all([
      sql<GlobalRow[]>`
        WITH ex AS (
          SELECT jsonb_object_keys(COALESCE(specs, '{}'::jsonb)) AS key
          FROM products
        ),
        base AS (
          SELECT (SELECT COUNT(*)::int FROM products) AS total
        )
        SELECT ex.key,
               COUNT(*)::int AS product_count,
               (SELECT total FROM base) AS total
        FROM ex
        GROUP BY ex.key
        ORDER BY product_count DESC
        LIMIT ${limit}
      `,
      group
        ? sql<{ total: number }[]>`
            SELECT COUNT(*)::int AS total
            FROM products
            WHERE template_group = ${group}
          `
        : Promise.resolve([{ total: 0 } as { total: number }]),
    ]);

    const totalProducts = global[0]?.total ?? 0;
    const globalKeys = global.map((r) => ({
      key: r.key,
      productCount: r.product_count,
      coverage: totalProducts > 0 ? r.product_count / totalProducts : 0,
    }));

    let groupDetail: null | {
      group: string;
      total: number;
      keys: { key: string; productCount: number; coverage: number }[];
    } = null;

    const groupTotal = groupTotalRow[0]?.total ?? 0;
    if (group && groupTotal > 0) {
      const rows = await sql<GroupRow[]>`
        WITH ex AS (
          SELECT jsonb_object_keys(COALESCE(specs, '{}'::jsonb)) AS key
          FROM products
          WHERE template_group = ${group}
        ),
        base AS (
          SELECT COUNT(*)::int AS total
          FROM products
          WHERE template_group = ${group}
        )
        SELECT ex.key,
               COUNT(*)::int AS product_count,
               (SELECT total FROM base) AS total
        FROM ex
        GROUP BY ex.key
        ORDER BY product_count DESC
      `;

      groupDetail = {
        group,
        total: groupTotal,
        keys: rows.map((r) => ({
          key: r.key,
          productCount: r.product_count,
          coverage: groupTotal > 0 ? r.product_count / groupTotal : 0,
        })),
      };
    }

    return c.json({
      snapshot_at: new Date().toISOString(),
      totalProducts,
      global: globalKeys,
      groupDetail,
    });
  },
);
