/**
 * Paket L.0 — Delete 3 Menzerna products not present in products-export.json.
 *
 * Targets:
 *   22202.251.001 — MENZERNA YENİ 400 Ağır Çizik Giderici 5 litre
 *   22746.281.001 — MENZERNA 300 Süper Ağır Çizik Giderici 250 ml
 *   22747.251.001 — MENZERNA Endless Shine 5 Litre
 *
 * Silinecek tablolar (her ürün için):
 *   - productsMasterTable        (1 row per sku)
 *   - productSearchIndexTable    (1 row)
 *   - productSpecsTable          (1 row)
 *   - productContentTable        (1 row)
 *   - productFaqTable            (multiple — by sku)
 *   - productRelationsTable      (1 row)
 *   - productDescPart1Table      (0-1 row)
 *   - productDescPart2Table      (0-1 row)
 *   - productMetaTable           (multiple — by sku)
 */
import { client } from '@botpress/runtime';

const TARGET_SKUS = [
  '22202.251.001',
  '22746.281.001',
  '22747.251.001',
];

const TABLES = [
  'productsMasterTable',
  'productSearchIndexTable',
  'productSpecsTable',
  'productContentTable',
  'productFaqTable',
  'productRelationsTable',
  'productDescPart1Table',
  'productDescPart2Table',
  'productMetaTable',
];

async function deleteRowsForSku(table: string, sku: string): Promise<number> {
  // Find all rows with this sku
  const res = await client.findTableRows({
    table,
    filter: { sku: { $eq: sku } } as any,
    limit: 100, // multi-row tables like faq and meta can have many
  });
  if (res.rows.length === 0) return 0;

  const ids = res.rows.map((r) => r.id).filter(Boolean);
  if (ids.length === 0) return 0;

  try {
    await (client as any).deleteTableRows({ table, ids });
    return ids.length;
  } catch (e) {
    console.error(`    ❌ delete fail (${table}, sku=${sku}):`, (e as Error).message);
    return -1;
  }
}

async function main() {
  console.log('🔧 Paket L.0 — Delete 3 Menzerna products');
  console.log(`Targets: ${TARGET_SKUS.join(', ')}\n`);

  const summary: Record<string, Record<string, number>> = {};
  for (const sku of TARGET_SKUS) summary[sku] = {};

  for (const table of TABLES) {
    console.log(`\n• ${table}:`);
    for (const sku of TARGET_SKUS) {
      const deleted = await deleteRowsForSku(table, sku);
      summary[sku][table] = deleted;
      console.log(`    ${sku}: ${deleted === -1 ? 'ERROR' : deleted + ' rows deleted'}`);
    }
  }

  console.log('\n📋 Summary:');
  for (const sku of TARGET_SKUS) {
    const total = Object.values(summary[sku]).reduce((a, b) => a + Math.max(b, 0), 0);
    console.log(`  ${sku}: ${total} total rows deleted`);
  }

  // Verify
  console.log('\n✅ Verification (should all be 0):');
  for (const sku of TARGET_SKUS) {
    for (const table of ['productsMasterTable', 'productFaqTable', 'productMetaTable']) {
      const r = await client.findTableRows({
        table,
        filter: { sku: { $eq: sku } } as any,
        limit: 1,
      });
      console.log(`  ${table}/${sku}: ${r.rows.length} remaining`);
    }
  }
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
