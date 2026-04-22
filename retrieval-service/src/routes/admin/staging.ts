/**
 * POST /admin/staging/preview
 *   Returns the SQL that would be executed for the supplied staging
 *   payload, without touching the database. Lets the Catalog Atelier
 *   UI render a trustworthy diff before the operator hits commit.
 *
 * POST /admin/staging/commit
 *   Executes the translated SQL inside a single transaction. Any row
 *   that fails short-circuits the whole commit (no partial writes).
 *
 * Supported scopes in this cut:
 *   - product       (fields: price, base_name, template_sub_type)
 *   - product.specs (field prefix: specs.<key> — JSONB set / remove)
 *
 * Out of scope yet (returned as "unsupported"):
 *   - product.sizes, faq, relation — commit plumbing for these lands in
 *     4.9.8b once the FAQ/relation staging items are battle-tested.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from '../../lib/db.ts';

type AppVariables = { requestId: string };

export const adminStagingRoutes = new Hono<{ Variables: AppVariables }>();

const ChangeSchema = z.object({
  id: z.string().min(1),
  scope: z.enum([
    'product',
    'product.specs',
    'product.sizes',
    'faq',
    'relation',
  ]),
  sku: z.string().min(1),
  field: z.string().min(1),
  before: z.unknown(),
  after: z.unknown(),
  at: z.string().optional(),
  label: z.string().optional(),
});

const BatchSchema = z.object({
  changes: z.array(ChangeSchema).min(1).max(500),
});

type Change = z.infer<typeof ChangeSchema>;

type PlannedStep = {
  id: string;
  sku: string;
  scope: string;
  field: string;
  sql: string;
  status: 'planned' | 'unsupported' | 'skipped';
  reason?: string;
};

type SupportedProductField = 'price' | 'base_name' | 'template_sub_type';
const PRODUCT_FIELD_WHITELIST: readonly SupportedProductField[] = [
  'price',
  'base_name',
  'template_sub_type',
];

function isSupportedProductField(f: string): f is SupportedProductField {
  return PRODUCT_FIELD_WHITELIST.includes(f as SupportedProductField);
}

/** Formats a literal for SQL preview only — NEVER used as an exec input */
function formatLiteral(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

function plan(change: Change): PlannedStep {
  const base: PlannedStep = {
    id: change.id,
    sku: change.sku,
    scope: change.scope,
    field: change.field,
    sql: '',
    status: 'unsupported',
  };

  if (change.sku.includes('-1') && /\bceramic_coating-/.test(change.sku)) {
    // Pseudo SKU produced by taxonomy-remap wizard preview
    return {
      ...base,
      status: 'skipped',
      reason: 'pseudo SKU (preview only, gerçek ürün listesi API bekliyor)',
    };
  }

  if (change.scope === 'product' && isSupportedProductField(change.field)) {
    return {
      ...base,
      status: 'planned',
      sql: `UPDATE products SET ${change.field} = ${formatLiteral(
        change.after,
      )} WHERE sku = ${formatLiteral(change.sku)}`,
    };
  }

  if (change.scope === 'product.specs' && change.field.startsWith('specs.')) {
    const key = change.field.slice('specs.'.length);
    if (change.after === null) {
      return {
        ...base,
        status: 'planned',
        sql: `UPDATE products SET specs = specs - ${formatLiteral(
          key,
        )} WHERE sku = ${formatLiteral(change.sku)}`,
      };
    }
    const jsonStr = JSON.stringify(change.after).replace(/'/g, "''");
    return {
      ...base,
      status: 'planned',
      sql: `UPDATE products SET specs = jsonb_set(specs, ARRAY[${formatLiteral(
        key,
      )}], '${jsonStr}'::jsonb, true) WHERE sku = ${formatLiteral(
        change.sku,
      )}`,
    };
  }

  return {
    ...base,
    reason:
      change.scope === 'faq' || change.scope === 'relation'
        ? 'faq/relation commit plumbing Phase 4.9.8b'
        : `${change.scope}/${change.field} henüz desteklenmiyor`,
  };
}

adminStagingRoutes.post(
  '/staging/preview',
  zValidator('json', BatchSchema),
  (c) => {
    const { changes } = c.req.valid('json');
    const steps = changes.map(plan);
    return c.json({
      total: steps.length,
      planned: steps.filter((s) => s.status === 'planned').length,
      unsupported: steps.filter((s) => s.status === 'unsupported').length,
      skipped: steps.filter((s) => s.status === 'skipped').length,
      steps,
    });
  },
);

adminStagingRoutes.post(
  '/staging/commit',
  zValidator('json', BatchSchema),
  async (c) => {
    const { changes } = c.req.valid('json');
    const steps = changes.map(plan);
    const planned = steps.filter((s) => s.status === 'planned');

    if (planned.length === 0) {
      return c.json(
        {
          error: 'no_planned_changes',
          steps,
          hint: 'Preview sonuçlarını kontrol et; hiçbir diff execute edilebilir değildi.',
        },
        422,
      );
    }

    let applied = 0;
    const outcome: Array<{
      id: string;
      sku: string;
      status: 'applied' | 'error';
      rows?: number;
      error?: string;
    }> = [];

    const auditRows: Array<{
      sku: string;
      scope: string;
      field: string;
      before: unknown;
      after: unknown;
      changeId: string;
    }> = [];

    try {
      await sql.begin(async (tx) => {
        for (const c of changes) {
          const step = plan(c);
          if (step.status !== 'planned') continue;

          if (c.scope === 'product' && isSupportedProductField(c.field)) {
            const res = await tx`
              UPDATE products SET ${tx(c.field)} = ${c.after as string | number | null}
              WHERE sku = ${c.sku}
            `;
            applied += res.count ?? 0;
            outcome.push({
              id: c.id,
              sku: c.sku,
              status: 'applied',
              rows: res.count ?? 0,
            });
            auditRows.push({
              sku: c.sku,
              scope: c.scope,
              field: c.field,
              before: c.before,
              after: c.after,
              changeId: c.id,
            });
            continue;
          }

          if (c.scope === 'product.specs' && c.field.startsWith('specs.')) {
            const key = c.field.slice('specs.'.length);
            if (c.after === null) {
              const res = await tx`
                UPDATE products
                   SET specs = specs - ${key}
                 WHERE sku = ${c.sku}
              `;
              applied += res.count ?? 0;
              outcome.push({
                id: c.id,
                sku: c.sku,
                status: 'applied',
                rows: res.count ?? 0,
              });
            } else {
              const value = JSON.stringify(c.after);
              const res = await tx`
                UPDATE products
                   SET specs = jsonb_set(
                     COALESCE(specs, '{}'::jsonb),
                     ARRAY[${key}],
                     ${value}::jsonb,
                     true
                   )
                 WHERE sku = ${c.sku}
              `;
              applied += res.count ?? 0;
              outcome.push({
                id: c.id,
                sku: c.sku,
                status: 'applied',
                rows: res.count ?? 0,
              });
            }
            auditRows.push({
              sku: c.sku,
              scope: c.scope,
              field: c.field,
              before: c.before,
              after: c.after,
              changeId: c.id,
            });
          }
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json(
        {
          error: 'commit_failed',
          message,
          applied_before_failure: applied,
          outcome,
          hint: 'Transaction rolled back — hiçbir değişiklik kaydedilmedi.',
        },
        500,
      );
    }

    // Fire-and-forget audit writes. Absent table = silent skip; the
    // commit itself has already succeeded, so users never see this fail.
    const requestId = c.get('requestId');
    let auditInserted = 0;
    if (auditRows.length > 0) {
      try {
        for (const r of auditRows) {
          await sql`
            INSERT INTO audit_log
              (sku, scope, field, before_value, after_value, change_id, request_id)
            VALUES
              (${r.sku}, ${r.scope}, ${r.field},
               ${JSON.stringify(r.before)}::jsonb,
               ${JSON.stringify(r.after)}::jsonb,
               ${r.changeId}, ${requestId})
          `;
          auditInserted++;
        }
      } catch {
        // audit table absent; swallow — commit already durable
      }
    }

    return c.json({
      committed_at: new Date().toISOString(),
      total_applied: applied,
      planned: planned.length,
      unsupported: steps.filter((s) => s.status === 'unsupported').length,
      skipped: steps.filter((s) => s.status === 'skipped').length,
      audit_logged: auditInserted,
      outcome,
    });
  },
);

/* ---------------------------------------- read-only audit surface */

adminStagingRoutes.get('/audit/recent', async (c) => {
  const limit = Math.min(
    Number(new URL(c.req.url).searchParams.get('limit') ?? '25') || 25,
    200,
  );
  try {
    const rows = await sql<
      Array<{
        id: number;
        happened_at: Date;
        actor: string;
        sku: string | null;
        scope: string;
        field: string;
        before_value: unknown;
        after_value: unknown;
      }>
    >`
      SELECT id, happened_at, actor, sku, scope, field,
             before_value, after_value
      FROM audit_log
      ORDER BY happened_at DESC
      LIMIT ${limit}
    `;
    return c.json({
      count: rows.length,
      items: rows.map((r) => ({
        id: r.id,
        at: r.happened_at.toISOString(),
        actor: r.actor,
        sku: r.sku,
        scope: r.scope,
        field: r.field,
        before: r.before_value,
        after: r.after_value,
      })),
    });
  } catch (err) {
    return c.json({
      count: 0,
      items: [],
      hint: 'audit_log tablosu yok (migration 008 henüz uygulanmamış) ya da okunamadı',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

adminStagingRoutes.get('/audit/by-sku/:sku', async (c) => {
  const sku = c.req.param('sku');
  try {
    const rows = await sql<
      Array<{
        id: number;
        happened_at: Date;
        actor: string;
        scope: string;
        field: string;
        before_value: unknown;
        after_value: unknown;
      }>
    >`
      SELECT id, happened_at, actor, scope, field,
             before_value, after_value
      FROM audit_log
      WHERE sku = ${sku}
      ORDER BY happened_at DESC
      LIMIT 100
    `;
    return c.json({
      sku,
      count: rows.length,
      items: rows.map((r) => ({
        id: r.id,
        at: r.happened_at.toISOString(),
        actor: r.actor,
        scope: r.scope,
        field: r.field,
        before: r.before_value,
        after: r.after_value,
      })),
    });
  } catch (err) {
    return c.json({
      sku,
      count: 0,
      items: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
