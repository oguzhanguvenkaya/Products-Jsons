/**
 * Paket L.6 — Insert 5 new Menzerna products to Botpress (all 9 tables).
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_DIR = resolve(PROJECT_ROOT, 'data', 'csv');

const NEW_SKUS = new Set([
  '24017.261.080', '26900.223.010', '26900.223.011',
  '26900.223.012', '26942.099.001',
]);

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
  }) as Record<string, string>[];
}

async function insertForTable(table: string, csvFile: string, coercePrice = false, transform?: (r: any) => any) {
  const rows = readCsv(resolve(CSV_DIR, csvFile)).filter(r => NEW_SKUS.has(r.sku));
  const prepared = rows.map(r => {
    let row: any = { ...r };
    if (coercePrice && row.price) row.price = parseInt(row.price, 10);
    if (transform) row = transform(row);
    return row;
  });
  console.log(`  ${table}: ${prepared.length} rows to insert`);
  if (prepared.length === 0) return 0;
  const res = await (client as any).createTableRows({ table, rows: prepared });
  const n = (res?.rows || []).length;
  console.log(`    ✓ inserted ${n}`);
  return n;
}

async function main() {
  console.log('🔧 Paket L.6 — Insert 5 new Menzerna products');

  await insertForTable('productsMasterTable', 'products_master.csv', true);
  await insertForTable('productSearchIndexTable', 'product_search_index.csv', true);
  await insertForTable('productSpecsTable', 'product_specs.csv');
  await insertForTable('productContentTable', 'product_content.csv');
  await insertForTable('productRelationsTable', 'product_relations.csv');
  await insertForTable('productDescPart1Table', 'product_desc_part1.csv');
  await insertForTable('productDescPart2Table', 'product_desc_part2.csv');

  // FAQ: filter directly by SKU
  const faqAll = readCsv(resolve(CSV_DIR, 'product_faq.csv'));
  const faqNew = faqAll.filter(r => NEW_SKUS.has(r.sku));
  console.log(`  productFaqTable: ${faqNew.length} rows to insert`);
  const BATCH = 25;
  let faqIns = 0;
  for (let i = 0; i < faqNew.length; i += BATCH) {
    const res = await (client as any).createTableRows({
      table: 'productFaqTable', rows: faqNew.slice(i, i + BATCH),
    });
    faqIns += (res?.rows || []).length;
  }
  console.log(`    ✓ inserted ${faqIns}`);

  // Meta: filter by SKU, prepare types
  const metaAll = readCsv(resolve(CSV_DIR, 'product_meta.csv'));
  const metaNew = metaAll.filter(r => NEW_SKUS.has(r.sku)).map(r => ({
    sku: r.sku,
    key: r.key,
    value_text: r.value_text?.trim() || null,
    value_numeric: r.value_numeric?.trim() ? parseFloat(r.value_numeric) : null,
    value_boolean: r.value_boolean?.trim() ? r.value_boolean.trim().toLowerCase() === 'true' : null,
  }));
  console.log(`  productMetaTable: ${metaNew.length} rows to insert`);
  let metaIns = 0;
  for (let i = 0; i < metaNew.length; i += BATCH) {
    const res = await (client as any).createTableRows({
      table: 'productMetaTable', rows: metaNew.slice(i, i + BATCH),
    });
    metaIns += (res?.rows || []).length;
  }
  console.log(`    ✓ inserted ${metaIns}`);

  console.log('\n✅ Paket L.6 done');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
