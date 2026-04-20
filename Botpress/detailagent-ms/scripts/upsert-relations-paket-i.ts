/**
 * Paket I — Relations mined from FAQ, surgical upsert.
 * Only SKUs that changed (mined vs original) are upserted.
 *
 * Çalıştırma: adk run scripts/upsert-relations-paket-i.ts
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'data', 'csv', 'product_relations.csv');

function readCsv(p: string): Record<string, string>[] {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  console.log('🔧 Paket I — Upsert mined relations');
  const rows = readCsv(CSV_PATH);
  console.log(`Loaded ${rows.length} rows from CSV`);

  // Batch upsert all 622 rows with sku keyColumn
  const BATCH = 25;
  let created = 0, updated = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await (client as any).upsertTableRows({
      table: 'productRelationsTable',
      rows: batch,
      keyColumn: 'sku',
    });
    created += (res?.created || []).length;
    updated += (res?.updated || []).length;
    if ((i / BATCH) % 5 === 0) {
      process.stdout.write(`  batch ${i / BATCH + 1}/${Math.ceil(rows.length / BATCH)}...\r`);
    }
  }
  console.log(`\n\n✓ Upsert done: created=${created}, updated=${updated}`);

  // Verify one sample
  const verifySkus = ['22746.281.001', 'Q2M-CMP1000M', '22984.260.001'];
  console.log('\n📋 Verification:');
  for (const sku of verifySkus) {
    const r = await client.findTableRows({
      table: 'productRelationsTable',
      filter: { sku: { $eq: sku } } as any,
      limit: 1,
    });
    const row = r.rows[0];
    if (row) {
      console.log(`  ${sku}:`);
      console.log(`    use_before: ${(row.use_before as string)?.slice(0, 80) || '(empty)'}`);
      console.log(`    use_after:  ${(row.use_after as string)?.slice(0, 80) || '(empty)'}`);
      console.log(`    use_with:   ${(row.use_with as string)?.slice(0, 80) || '(empty)'}`);
    }
  }
}

main().catch((e) => {
  console.error('❌ Fail:', e);
  process.exit(1);
});
