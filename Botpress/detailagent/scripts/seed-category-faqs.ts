/**
 * Paket H — 10 jenerik kategori FAQ seed.
 *
 * SKU konvansiyonu: '_CAT:<template_group>' veya '_CAT:_workflow'
 * Mevcut productFaqTable'a incremental olarak eklenir (tablo silinmez).
 *
 * Çalıştırma: adk run scripts/seed-category-faqs.ts
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CATEGORY_FAQ_CSV = resolve(PROJECT_ROOT, 'output', 'csv', 'category_faqs.csv');

function readCsv(path: string): Record<string, string>[] {
  const raw = readFileSync(path, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  console.log('🔧 Paket H — Category FAQ seed');
  const rows = readCsv(CATEGORY_FAQ_CSV);
  console.log(`Reading ${rows.length} category FAQs`);

  // Sanity: SKUs are _CAT:*
  const invalid = rows.filter((r) => !r.sku.startsWith('_CAT:'));
  if (invalid.length > 0) {
    throw new Error(`Invalid SKU(s) found: ${invalid.map((r) => r.sku).join(', ')}`);
  }

  // Size check per row (Botpress 4KB limit)
  for (const r of rows) {
    const total = r.sku.length + r.question.length + r.answer.length;
    if (total > 3800) {
      console.warn(`  ⚠️  ${r.sku} size=${total}b — may hit 4KB limit`);
    }
  }

  // Check if any _CAT FAQs already exist (idempotency)
  const existing = await client.findTableRows({
    table: 'productFaqTable',
    filter: { sku: { $regex: '^_CAT:' } } as any,
    limit: 50,
  });
  console.log(`Existing _CAT FAQs in table: ${existing.rows.length}`);

  if (existing.rows.length > 0) {
    console.log('⚠️  _CAT FAQs already exist. Using upsert (keyColumn: sku, question)');
    // Upsert requires compound key — fall back to delete+insert
    // For simplicity: delete existing _CAT rows first, then insert
    const toDelete = existing.rows.map((r) => r.id || r.sku).filter(Boolean);
    if ((client as any).deleteTableRows && toDelete.length) {
      await (client as any).deleteTableRows({
        table: 'productFaqTable',
        ids: toDelete,
      });
      console.log(`  Deleted ${toDelete.length} existing _CAT rows`);
    }
  }

  // Insert new rows (createTableRows with batch)
  const BATCH_SIZE = 25;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const res = await (client as any).createTableRows({
      table: 'productFaqTable',
      rows: batch,
    });
    const created = (res?.rows || []).length;
    inserted += created;
    console.log(`  Batch ${i / BATCH_SIZE + 1}: +${created} rows`);
  }
  console.log(`\n✓ Total inserted: ${inserted}/${rows.length}`);

  // Verification: test semantic search
  console.log('\n📋 Verification via semantic search:');
  const testQuery = 'pastada silikonsuz olması neden önemli';
  const searchRes = await client.findTableRows({
    table: 'productFaqTable',
    search: testQuery,
    limit: 3,
  });
  console.log(`  Query: "${testQuery}"`);
  for (const r of searchRes.rows) {
    console.log(`    sku=${r.sku} sim=${r.similarity} Q=${(r.question as string).slice(0, 60)}`);
  }

  console.log('\n✅ Paket H tamamlandı');
}

main().catch((e) => {
  console.error('❌ Fail:', e);
  process.exit(1);
});
