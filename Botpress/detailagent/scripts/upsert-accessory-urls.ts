/**
 * Upsert 4 Menzerna accessory SKU URL + price to Cloud.
 * SKUs: 26900.223.010/011/012 (pads, 420 TL) + 26942.099.001 (cloth set, 600 TL)
 *
 * Updates productsMasterTable (with sizes JSON) and productSearchIndexTable.
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const MASTER_CSV = resolve(PROJECT_ROOT, 'output', 'csv', 'products_master.csv');
const SEARCH_CSV = resolve(PROJECT_ROOT, 'output', 'csv', 'product_search_index.csv');

const TARGETS = new Set([
  '26900.223.010', '26900.223.011', '26900.223.012', '26942.099.001',
]);

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  console.log('🔧 Upsert 4 Menzerna accessory URLs + prices');

  const masterAll = readCsv(MASTER_CSV);
  const searchAll = readCsv(SEARCH_CSV);

  const masterRows = masterAll
    .filter((r) => TARGETS.has(r.sku))
    .map((r) => ({ ...r, price: r.price ? parseInt(r.price, 10) : 0 }));
  const searchRows = searchAll
    .filter((r) => TARGETS.has(r.sku))
    .map((r) => ({ ...r, price: r.price ? parseInt(r.price, 10) : 0 }));

  console.log(`Master rows: ${masterRows.length} | Search rows: ${searchRows.length}`);

  const m = await (client as any).upsertTableRows({
    table: 'productsMasterTable',
    rows: masterRows,
    keyColumn: 'sku',
  });
  console.log(`  master: updated=${m?.updated?.length ?? 0} created=${m?.created?.length ?? 0}`);

  const s = await (client as any).upsertTableRows({
    table: 'productSearchIndexTable',
    rows: searchRows,
    keyColumn: 'sku',
  });
  console.log(`  search_index: updated=${s?.updated?.length ?? 0} created=${s?.created?.length ?? 0}`);

  // Verify
  const verify = await client.findTableRows({
    table: 'productsMasterTable',
    filter: { sku: { $in: Array.from(TARGETS) } } as any,
    limit: 10,
  });
  console.log('\n📋 Verification:');
  for (const r of verify.rows) {
    const urlShort = ((r.url as string) || '').slice(0, 60);
    console.log(`  ${r.sku} price=${r.price} url=${urlShort}`);
  }

  console.log('\n✅ Done');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
