// product_meta: EAV store from product_meta.csv
// Columns: sku,key,value_text,value_numeric,value_boolean

import { readCsv, coerceNumber, coerceBool } from './_csv.ts';
import { sql } from '../src/lib/db.ts';

interface MetaRow {
  sku: string;
  key: string;
  value_text: string;
  value_numeric: string;
  value_boolean: string;
}

async function main() {
  console.log('[seed-meta] loading CSV...');
  const rows = readCsv<MetaRow>('product_meta.csv');
  console.log(`[seed-meta] source rows: ${rows.length}`);

  const validSkus = new Set(
    (await sql<{ sku: string }[]>`SELECT sku FROM products`).map((r) => r.sku),
  );

  const prepared: Array<{
    sku: string;
    key: string;
    value_text: string | null;
    value_numeric: number | null;
    value_boolean: boolean | null;
  }> = [];

  const skipped = { invalidSku: 0, emptyKey: 0, dup: 0 };
  const seen = new Set<string>();

  for (const r of rows) {
    if (!validSkus.has(r.sku)) {
      skipped.invalidSku++;
      continue;
    }
    if (!r.key) {
      skipped.emptyKey++;
      continue;
    }
    const uniqKey = `${r.sku}|${r.key}`;
    if (seen.has(uniqKey)) {
      skipped.dup++;
      continue;
    }
    seen.add(uniqKey);
    prepared.push({
      sku: r.sku,
      key: r.key,
      value_text: r.value_text || null,
      value_numeric: coerceNumber(r.value_numeric),
      value_boolean: coerceBool(r.value_boolean),
    });
  }

  console.log(`[seed-meta] prepared=${prepared.length} skipped:`, skipped);

  await sql`TRUNCATE TABLE product_meta`;

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < prepared.length; i += BATCH) {
    const batch = prepared.slice(i, i + BATCH);
    await sql`
      INSERT INTO product_meta ${sql(
        batch as any,
        'sku', 'key', 'value_text', 'value_numeric', 'value_boolean',
      )}
      ON CONFLICT (sku, key) DO UPDATE SET
        value_text = EXCLUDED.value_text,
        value_numeric = EXCLUDED.value_numeric,
        value_boolean = EXCLUDED.value_boolean
    `;
    inserted += batch.length;
    console.log(`  ${inserted}/${prepared.length}`);
  }

  console.log(`[seed-meta] DONE. inserted=${inserted}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
