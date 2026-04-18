/**
 * Paket M.0 — Delete Menzerna 2500 5lt + Menzerna 3800 5lt (stokta yok).
 * All 9 tables cleaned.
 */
import { client } from '@botpress/runtime';

const TARGET_SKUS = ['22828.251.001', '22992.251.001'];

const TABLES = [
  'productsMasterTable', 'productSearchIndexTable', 'productSpecsTable',
  'productContentTable', 'productFaqTable', 'productRelationsTable',
  'productDescPart1Table', 'productDescPart2Table', 'productMetaTable',
];

async function main() {
  console.log('🔧 Paket M.0 — Delete Menzerna 2500 5lt + 3800 5lt');
  console.log(`Targets: ${TARGET_SKUS.join(', ')}\n`);

  for (const table of TABLES) {
    console.log(`• ${table}:`);
    for (const sku of TARGET_SKUS) {
      const r = await client.findTableRows({
        table, filter: { sku: { $eq: sku } } as any, limit: 100,
      });
      if (r.rows.length === 0) {
        console.log(`    ${sku}: 0 rows (already absent)`);
        continue;
      }
      const ids = r.rows.map((x) => x.id).filter(Boolean);
      await (client as any).deleteTableRows({ table, ids });
      console.log(`    ${sku}: deleted ${ids.length} rows`);
    }
  }

  console.log('\n📋 Verification:');
  for (const sku of TARGET_SKUS) {
    const m = await client.findTableRows({
      table: 'productsMasterTable', filter: { sku: { $eq: sku } } as any, limit: 1,
    });
    console.log(`  ${sku}: ${m.rows.length} remaining in master`);
  }
  console.log('\n✅ Paket M.0 done');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
