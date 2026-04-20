
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const MASTER_CSV = resolve(PROJECT_ROOT, 'data', 'csv', 'products_master.csv');
const INDEX_CSV = resolve(PROJECT_ROOT, 'data', 'csv', 'product_search_index.csv');

function readCsv(path: string): Record<string, string>[] {
  const raw = readFileSync(path, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
}

function coercePrice(row: Record<string, unknown>): Record<string, unknown> {
  if (typeof row.price === 'string' && row.price) row.price = parseInt(row.price as string, 10);
  return row;
}

const TARGET_SKUS = new Set(["Q2M-PYA500M", "Q2M-PYA4000M", "Q2M-CRYA100M", "Q2-PR120M", "71110"]);

async function main() {
  console.log('🔧 v6.3 template_group fix — 5 SKU cerrahi upsert');

  const masterRows = readCsv(MASTER_CSV).filter(r => TARGET_SKUS.has(r.sku)).map(coercePrice);
  const indexRows = readCsv(INDEX_CSV).filter(r => TARGET_SKUS.has(r.sku)).map(coercePrice);

  console.log(`Master: ${masterRows.length} rows, Index: ${indexRows.length} rows`);

  const mRes = await (client as any).upsertTableRows({ table: 'productsMasterTable', rows: masterRows, keyColumn: 'sku' });
  console.log(`✅ Master upsert: ${(mRes.updated || []).length} updated`);

  const iRes = await (client as any).upsertTableRows({ table: 'productSearchIndexTable', rows: indexRows, keyColumn: 'sku' });
  console.log(`✅ Index upsert: ${(iRes.updated || []).length} updated`);

  // Verify
  for (const sku of TARGET_SKUS) {
    const r = await client.findTableRows({ table: 'productsMasterTable', filter: { sku: { $eq: sku } }, limit: 1 });
    const row = r.rows[0];
    console.log(`  ${sku}: template_group=${row?.template_group}`);
  }
  console.log('\n✅ v6.3 veri fix tamamlandı');
}

main().catch(e => { console.error(e); process.exit(1); });

