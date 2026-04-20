/**
 * Paket M.2 — Apply primary_map to Botpress Cloud:
 * 1. Delete non-primary SKUs from master + search_index
 * 2. Upsert primary rows (511) with new base_name, variant_skus, sizes
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
  console.log('🔧 Paket M.2 — Apply primary_map (delete non-primary + upsert primary)');

  // Get non-primary SKUs from primary_map
  const primaryMap = readCsv(resolve(CSV_DIR, 'primary_map.csv'));
  const nonPrimarySkus = primaryMap.filter(r => r.is_primary === '0').map(r => r.sku);
  console.log(`Non-primary SKUs to delete: ${nonPrimarySkus.length}`);

  // --- 1. Delete non-primary from master + search_index ---
  for (const table of ['productsMasterTable', 'productSearchIndexTable']) {
    console.log(`\n• ${table}: delete non-primary`);
    let deleted = 0;
    const BATCH = 20;
    for (let i = 0; i < nonPrimarySkus.length; i += BATCH) {
      const batch = nonPrimarySkus.slice(i, i + BATCH);
      // Find rows
      for (const sku of batch) {
        const r = await client.findTableRows({
          table, filter: { sku: { $eq: sku } } as any, limit: 1,
        });
        if (r.rows.length) {
          const ids = r.rows.map(x => x.id).filter(Boolean);
          await (client as any).deleteTableRows({ table, ids });
          deleted += ids.length;
        }
      }
    }
    console.log(`  ✓ deleted: ${deleted}`);
  }

  // --- 2. Upsert primary rows ---
  console.log('\n• productsMasterTable: upsert 511 primary rows');
  const masterRows = readCsv(resolve(CSV_DIR, 'products_master.csv')).map(r => ({
    ...r,
    price: r.price ? parseInt(r.price, 10) : 0,
  }));
  const BATCH = 25;
  let m_upd = 0;
  for (let i = 0; i < masterRows.length; i += BATCH) {
    const res = await (client as any).upsertTableRows({
      table: 'productsMasterTable',
      rows: masterRows.slice(i, i + BATCH),
      keyColumn: 'sku',
    });
    m_upd += (res?.updated || []).length + (res?.created || []).length;
  }
  console.log(`  ✓ upserted: ${m_upd}`);

  console.log('\n• productSearchIndexTable: upsert 511 primary rows');
  const siRows = readCsv(resolve(CSV_DIR, 'product_search_index.csv')).map(r => ({
    ...r,
    price: r.price ? parseInt(r.price, 10) : 0,
  }));
  let si_upd = 0;
  for (let i = 0; i < siRows.length; i += BATCH) {
    const res = await (client as any).upsertTableRows({
      table: 'productSearchIndexTable',
      rows: siRows.slice(i, i + BATCH),
      keyColumn: 'sku',
    });
    si_upd += (res?.updated || []).length + (res?.created || []).length;
  }
  console.log(`  ✓ upserted: ${si_upd}`);

  // --- 3. Verify ---
  console.log('\n📋 Verification:');
  const sample = await client.findTableRows({
    table: 'productsMasterTable',
    filter: { sku: { $eq: '22202.260.001' } } as any,
    limit: 1,
  });
  if (sample.rows[0]) {
    const r = sample.rows[0];
    console.log(`  Menzerna 400 primary (22202.260.001):`);
    console.log(`    base_name: ${r.base_name}`);
    console.log(`    variant_skus: ${r.variant_skus}`);
    console.log(`    sizes (first 200): ${(r.sizes as string)?.slice(0, 200)}`);
  }
  const deletedCheck = await client.findTableRows({
    table: 'productsMasterTable',
    filter: { sku: { $eq: '22202.281.001' } } as any,
    limit: 1,
  });
  console.log(`  Non-primary 22202.281.001 remaining: ${deletedCheck.rows.length}`);

  console.log('\n✅ Paket M.2 done');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
