/**
 * Paket G — Sub_type düzeltmeleri surgical upsert.
 *
 * Hedef:
 *   - Menzerna 2500 (1lt, 250ml) heavy_cut_compound → polish
 *   - Industrial Menzerna (11 SKU) interior_detailer → metal_polish
 *   - GYEON Total Remover (2 SKU) paint_protection_quick → contaminant_solvers
 *
 * CSV önceden Scripts/fix_subtype_corrections.py ile güncellendi.
 * Bu script Botpress Cloud tablolarına upsert yapar (keyColumn: sku).
 *
 * Çalıştırma: adk run scripts/fix-subtype-paket-g.ts
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_DIR = resolve(PROJECT_ROOT, 'output', 'csv');

const TARGET_SKUS = new Set([
  // Menzerna 2500
  '22828.261.001',
  '22828.281.001',
  // Industrial Menzerna
  '12001.056.001',
  '12002.056.001',
  '06008.056.001',
  '07001.056.001',
  '07006.056.001',
  '07008.056.001',
  '07163.056.001',
  '07201.056.001',
  '07933.056.001',
  '07945.056.001',
  '07984.056.001',
  // GYEON Total Remover
  'Q2M-TOTR500M',
  'Q2M-TOTR1000M',
]);

function readCsv(path: string): Record<string, string>[] {
  const raw = readFileSync(path, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

function coercePrice(row: Record<string, unknown>): Record<string, unknown> {
  if (typeof row.price === 'string' && row.price) {
    row.price = parseInt(row.price as string, 10);
  }
  return row;
}

async function upsertTable(tableName: string, csvFile: string, needsPrice = false) {
  const allRows = readCsv(resolve(CSV_DIR, csvFile));
  const rows = allRows.filter((r) => TARGET_SKUS.has(r.sku));
  const prepared = needsPrice ? rows.map((r) => coercePrice({ ...r })) : rows;
  console.log(`• ${tableName}: ${prepared.length}/${TARGET_SKUS.size} rows`);
  if (prepared.length === 0) return;
  const res = await (client as any).upsertTableRows({
    table: tableName,
    rows: prepared,
    keyColumn: 'sku',
  });
  const updated = (res?.updated || []).length;
  const created = (res?.created || []).length;
  console.log(`  ✓ upserted (updated=${updated}, created=${created})`);
}

async function main() {
  console.log('🔧 Paket G — Sub_type correction surgical upsert');
  console.log(`Target: ${TARGET_SKUS.size} SKUs across 3 tables\n`);

  await upsertTable('productsMasterTable', 'products_master.csv', true);
  await upsertTable('productSearchIndexTable', 'product_search_index.csv', true);
  await upsertTable('productSpecsTable', 'product_specs.csv', false);

  // Verification
  console.log('\n📋 Verification:');
  for (const sku of TARGET_SKUS) {
    const r = await client.findTableRows({
      table: 'productSearchIndexTable',
      filter: { sku: { $eq: sku } } as any,
      limit: 1,
    });
    const row = r.rows[0];
    if (row) {
      console.log(`  ${sku}: tg=${row.template_group}, sub=${row.template_sub_type}`);
    } else {
      console.log(`  ${sku}: NOT FOUND`);
    }
  }
  console.log('\n✅ Paket G tamamlandı');
}

main().catch((e) => {
  console.error('❌ Fail:', e);
  process.exit(1);
});
