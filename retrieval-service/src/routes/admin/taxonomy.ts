/**
 * GET /admin/taxonomy
 *
 * Returns every template_group with its nested template_sub_type list and
 * product counts. Admin-UI's left-rail catalog tree consumes this shape,
 * so the response is pre-ordered by product count DESC (most populated
 * groups first) and each sub list is ordered the same way.
 *
 * Single query, aggregated in memory — row counts are small (26 groups /
 * ~165 sub rows), no need for CTE gymnastics.
 */

import { Hono } from 'hono';
import { sql } from '../../lib/db.ts';

type AppVariables = { requestId: string };

export const adminTaxonomyRoutes = new Hono<{ Variables: AppVariables }>();

type RawRow = {
  template_group: string | null;
  template_sub_type: string | null;
  product_count: number;
};

adminTaxonomyRoutes.get('/taxonomy', async (c) => {
  const rows = await sql<RawRow[]>`
    SELECT
      template_group,
      template_sub_type,
      COUNT(*)::int AS product_count
    FROM products
    GROUP BY template_group, template_sub_type
    ORDER BY template_group NULLS LAST, product_count DESC
  `;

  const byGroup = new Map<string, {
    group: string;
    total: number;
    subs: { sub: string; count: number }[];
  }>();

  for (const r of rows) {
    const g = r.template_group ?? '(null)';
    const s = r.template_sub_type ?? '(null sub_type)';
    if (!byGroup.has(g)) byGroup.set(g, { group: g, total: 0, subs: [] });
    const entry = byGroup.get(g)!;
    entry.total += r.product_count;
    entry.subs.push({ sub: s, count: r.product_count });
  }

  const groups = [...byGroup.values()].sort((a, b) => b.total - a.total);

  return c.json({
    snapshot_at: new Date().toISOString(),
    total_products: groups.reduce((sum, g) => sum + g.total, 0),
    total_groups: groups.length,
    total_sub_types: groups.reduce((sum, g) => sum + g.subs.length, 0),
    groups,
  });
});
