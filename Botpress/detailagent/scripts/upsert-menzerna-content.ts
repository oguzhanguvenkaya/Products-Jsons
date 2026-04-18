/**
 * Paket L.3 — Upsert Menzerna content changes to Botpress.
 * Tables: productContentTable, productDescPart1Table, productDescPart2Table, productSearchIndexTable
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_DIR = resolve(PROJECT_ROOT, 'output', 'csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
  }) as Record<string, string>[];
}

async function upsertMenzerna(tableName: string, csvFile: string, coercePrice = false) {
  const rows = readCsv(resolve(CSV_DIR, csvFile));
  const menz = rows.filter((r) => {
    const brand = (r.brand || '').toUpperCase();
    return brand === 'MENZERNA' || r.sku?.startsWith('22') || r.sku?.startsWith('26') || r.sku?.startsWith('06') || r.sku?.startsWith('07') || r.sku?.startsWith('12') || r.sku?.startsWith('14') || r.sku?.startsWith('20') || r.sku?.startsWith('24');
  });
  // We want only Menzerna sku from master SKU list — use master.csv brand column
  const master = readCsv(resolve(CSV_DIR, 'products_master.csv'));
  const menzSkus = new Set(master.filter(r => r.brand?.toUpperCase() === 'MENZERNA').map(r => r.sku));
  const filtered = rows.filter((r) => menzSkus.has(r.sku));

  const prepared = coercePrice
    ? filtered.map((r) => ({ ...r, price: r.price ? parseInt(r.price as any, 10) : 0 }))
    : filtered;

  const BATCH = 25;
  let created = 0, updated = 0;
  for (let i = 0; i < prepared.length; i += BATCH) {
    const batch = prepared.slice(i, i + BATCH);
    const res = await (client as any).upsertTableRows({
      table: tableName, rows: batch, keyColumn: 'sku',
    });
    created += (res?.created || []).length;
    updated += (res?.updated || []).length;
  }
  console.log(`  ${tableName}: upserted ${prepared.length} (created=${created}, updated=${updated})`);
}

async function main() {
  console.log('🔧 Paket L.3 — Upsert Menzerna content');
  await upsertMenzerna('productContentTable', 'product_content.csv');
  await upsertMenzerna('productDescPart1Table', 'product_desc_part1.csv');
  await upsertMenzerna('productDescPart2Table', 'product_desc_part2.csv');
  await upsertMenzerna('productSearchIndexTable', 'product_search_index.csv', true);
  console.log('\n✅ Done');
}
main().catch((e) => { console.error('❌', e); process.exit(1); });
