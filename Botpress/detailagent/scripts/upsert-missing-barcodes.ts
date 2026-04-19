/**
 * Update 3 missing barcodes in productsMasterTable:
 *   Menzerna 1000 250ml (22984.281.001) → 4262517330865
 *   Menzerna 1000 1kg (22984.260.001)   → 4262517330902
 *   Klin Wash Mitt (3221A-RD)           → 8683492660963
 *
 * Çalıştırma: adk run scripts/upsert-missing-barcodes.ts
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const MASTER_CSV = resolve(PROJECT_ROOT, 'output', 'csv', 'products_master.csv');

const TARGET_SKUS = new Set([
  '22984.281.001', '22984.260.001', '3221A-RD',
  'Q2M-CMP1000M', 'SGGD421', '8410', 'P0140AK1#26263',
]);

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  console.log('🔧 Upsert 3 missing barcodes');
  const rows = readCsv(MASTER_CSV);
  const targets = rows
    .filter((r) => TARGET_SKUS.has(r.sku))
    .map((r) => ({
      ...r,
      price: r.price ? parseInt(r.price, 10) : 0,
    }));
  console.log(`Loaded ${targets.length}/${TARGET_SKUS.size} target rows`);

  const res = await (client as any).upsertTableRows({
    table: 'productsMasterTable',
    rows: targets,
    keyColumn: 'sku',
  });
  console.log(`✓ Upserted: updated=${(res?.updated || []).length}`);

  console.log('\n📋 Verification:');
  for (const sku of TARGET_SKUS) {
    const r = await client.findTableRows({
      table: 'productsMasterTable',
      filter: { sku: { $eq: sku } } as any,
      limit: 1,
    });
    const row = r.rows[0];
    console.log(`  ${sku}: barcode=${row?.barcode ?? 'MISSING'}`);
  }
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
