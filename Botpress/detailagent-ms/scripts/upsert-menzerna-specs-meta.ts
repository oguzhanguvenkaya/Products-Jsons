/**
 * Paket L.4 — Upsert specs (55 Menzerna) + rebuild meta for Menzerna SKUs.
 *
 * Meta: EAV table, no single keyColumn. Strategy:
 *   1. Delete all Menzerna SKU's meta rows
 *   2. Insert new ones from updated product_meta.csv
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_DIR = resolve(PROJECT_ROOT, 'data', 'csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  console.log('🔧 Paket L.4 — Upsert specs + refresh meta for Menzerna');
  const master = readCsv(resolve(CSV_DIR, 'products_master.csv'));
  const menzSkus = new Set(master.filter(r => r.brand?.toUpperCase() === 'MENZERNA').map(r => r.sku));
  console.log(`Menzerna SKUs in master: ${menzSkus.size}`);

  // --- 1. Upsert specs ---
  const specs = readCsv(resolve(CSV_DIR, 'product_specs.csv')).filter(r => menzSkus.has(r.sku));
  console.log(`\n• productSpecsTable: upserting ${specs.length} rows`);
  const BATCH = 25;
  let sp_upd = 0;
  for (let i = 0; i < specs.length; i += BATCH) {
    const res = await (client as any).upsertTableRows({
      table: 'productSpecsTable', rows: specs.slice(i, i + BATCH), keyColumn: 'sku',
    });
    sp_upd += (res?.updated || []).length;
  }
  console.log(`  ✓ specs updated: ${sp_upd}`);

  // --- 2. Delete old meta rows for Menzerna SKUs ---
  console.log(`\n• productMetaTable: delete old Menzerna meta rows`);
  let deleted = 0;
  for (const sku of menzSkus) {
    const r = await client.findTableRows({
      table: 'productMetaTable', filter: { sku: { $eq: sku } } as any, limit: 100,
    });
    if (r.rows.length) {
      const ids = r.rows.map((x) => x.id).filter(Boolean);
      await (client as any).deleteTableRows({ table: 'productMetaTable', ids });
      deleted += ids.length;
    }
  }
  console.log(`  ✓ deleted: ${deleted} rows`);

  // --- 3. Insert new meta rows for Menzerna SKUs ---
  const allMeta = readCsv(resolve(CSV_DIR, 'product_meta.csv'));
  const menzMeta = allMeta.filter(r => menzSkus.has(r.sku));
  console.log(`\n• productMetaTable: insert ${menzMeta.length} new rows`);

  const prepared = menzMeta.map(r => ({
    sku: r.sku,
    key: r.key,
    value_text: r.value_text?.trim() || null,
    value_numeric: r.value_numeric?.trim() ? parseFloat(r.value_numeric) : null,
    value_boolean: r.value_boolean?.trim() ? (r.value_boolean.trim().toLowerCase() === 'true') : null,
  }));

  let inserted = 0;
  for (let i = 0; i < prepared.length; i += BATCH) {
    const res = await (client as any).createTableRows({
      table: 'productMetaTable', rows: prepared.slice(i, i + BATCH),
    });
    inserted += (res?.rows || []).length;
  }
  console.log(`  ✓ inserted: ${inserted} rows`);

  console.log('\n✅ Paket L.4 done');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
