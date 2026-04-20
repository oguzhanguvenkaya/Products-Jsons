/**
 * Paket K.2 — Seed productMetaTable from data/csv/product_meta.csv
 *
 * ~2,663 EAV rows expected. Clean insert (table assumed empty after provisioning).
 *
 * Çalıştırma: adk run scripts/seed-meta-table.ts
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'data', 'csv', 'product_meta.csv');

const BATCH_SIZE = 25;

type RawRow = Record<string, string>;
interface MetaRow {
  sku: string;
  key: string;
  value_text?: string | null;
  value_numeric?: number | null;
  value_boolean?: boolean | null;
}

function readCsv(p: string): RawRow[] {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as RawRow[];
}

function transform(r: RawRow): MetaRow {
  const out: MetaRow = { sku: r.sku, key: r.key };
  if (r.value_text && r.value_text.trim()) {
    out.value_text = r.value_text;
  } else {
    out.value_text = null;
  }
  if (r.value_numeric && r.value_numeric.trim()) {
    const n = parseFloat(r.value_numeric);
    out.value_numeric = Number.isFinite(n) ? n : null;
  } else {
    out.value_numeric = null;
  }
  if (r.value_boolean && r.value_boolean.trim()) {
    out.value_boolean = r.value_boolean.trim().toLowerCase() === 'true';
  } else {
    out.value_boolean = null;
  }
  return out;
}

async function main() {
  console.log('🔧 Paket K.2 — Seed productMetaTable from CSV');
  const rows = readCsv(CSV_PATH);
  const prepared = rows.map(transform);
  console.log(`Loaded ${prepared.length} rows`);

  // Check if table already has data
  const existing = await client.findTableRows({
    table: 'productMetaTable',
    limit: 1,
  });
  if (existing.rows.length > 0) {
    console.log('⚠️  Table already has rows. Aborting to avoid duplicates.');
    console.log('   To re-seed: delete existing rows first.');
    return;
  }

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
    const batch = prepared.slice(i, i + BATCH_SIZE);
    const res = await (client as any).createTableRows({
      table: 'productMetaTable',
      rows: batch,
    });
    const created = (res?.rows || []).length;
    inserted += created;
    if (i % (BATCH_SIZE * 10) === 0) {
      process.stdout.write(`  ${inserted}/${prepared.length} inserted\r`);
    }
  }
  console.log(`\n✓ Total inserted: ${inserted}/${prepared.length}`);

  // Verify
  console.log('\n📋 Verification:');
  const sample = await client.findTableRows({
    table: 'productMetaTable',
    filter: { sku: { $eq: '22202.281.001' } } as any,
    limit: 20,
  });
  console.log(`  Menzerna 400 (22202.281.001) meta rows: ${sample.rows.length}`);
  for (const r of sample.rows) {
    const tval = r.value_text ?? '';
    const nval = r.value_numeric ?? '';
    const bval = r.value_boolean ?? '';
    console.log(`    ${r.key}: text='${tval}' num=${nval} bool=${bval}`);
  }

  console.log('\n✅ Paket K.2 seed completed');
}

main().catch((e) => {
  console.error('❌ Fail:', e);
  process.exit(1);
});
