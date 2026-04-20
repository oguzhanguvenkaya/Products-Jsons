/**
 * Paket K.3 — Seed derived booleans into productMetaTable.
 *
 * Reads data/csv/product_meta_derived.csv (75 rows).
 * Skips rows that already exist for same (sku, key) to avoid duplicates.
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'data', 'csv', 'product_meta_derived.csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  console.log('🔧 Paket K.3 — Seed derived booleans');
  const rows = readCsv(CSV_PATH);
  console.log(`Loaded ${rows.length} derived rows`);

  // Fetch existing (sku, key) pairs from productMetaTable where key is one of our derived keys
  const derivedKeys = ['silicone_free', 'voc_free', 'contains_sio2'];
  const existingSet = new Set<string>();
  for (const key of derivedKeys) {
    const res = await client.findTableRows({
      table: 'productMetaTable',
      filter: { key: { $eq: key } } as any,
      limit: 1000,
    });
    for (const r of res.rows) {
      existingSet.add(`${r.sku}|${r.key}`);
    }
  }
  console.log(`Existing (sku,key) pairs for derived keys: ${existingSet.size}`);

  // Filter to only new rows
  const toInsert = rows
    .filter((r) => !existingSet.has(`${r.sku}|${r.key}`))
    .map((r) => ({
      sku: r.sku,
      key: r.key,
      value_text: null as string | null,
      value_numeric: null as number | null,
      value_boolean: r.value_boolean?.trim().toLowerCase() === 'true',
    }));

  console.log(`New rows to insert: ${toInsert.length}`);
  if (toInsert.length === 0) {
    console.log('⚠️  Nothing new to insert');
    return;
  }

  const BATCH = 25;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const res = await (client as any).createTableRows({
      table: 'productMetaTable',
      rows: batch,
    });
    inserted += (res?.rows || []).length;
  }
  console.log(`\n✓ Inserted: ${inserted}/${toInsert.length}`);

  // Verify
  console.log('\n📋 Verification — query silicone_free=true:');
  const sf = await client.findTableRows({
    table: 'productMetaTable',
    filter: { key: { $eq: 'silicone_free' }, value_boolean: { $eq: true } } as any,
    limit: 10,
  });
  console.log(`  Products with silicone_free=true: ${sf.rows.length}`);
  for (const r of sf.rows.slice(0, 5)) {
    console.log(`    ${r.sku}`);
  }

  console.log('\n✅ Paket K.3 tamamlandı');
}

main().catch((e) => {
  console.error('❌ Fail:', e);
  process.exit(1);
});
