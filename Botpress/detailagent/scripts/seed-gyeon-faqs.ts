/**
 * Seed Gyeon FAQs into productFaqTable.
 *
 * Source: 659 Q&A pairs from gyeon.zendesk.com, translated to Turkish.
 *   - 549 product-specific (mapped to 68 GYEON primary SKUs)
 *   - 110 brand/category-level (_BRAND:gyeon:<sub>)
 *
 * Idempotency:
 *   - Deletes existing _BRAND:gyeon:* rows before insert.
 *   - For product-specific rows, dedupes by (sku, question) hash on insert.
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'output', 'csv', 'gyeon_faqs.csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

function rowKey(sku: string, question: string): string {
  return `${sku}::${question}`;
}

async function main() {
  console.log('🔧 Seed Gyeon FAQs');
  const rows = readCsv(CSV_PATH);
  console.log(`Loaded ${rows.length} rows from ${CSV_PATH}`);

  const brandRows = rows.filter((r) => r.sku.startsWith('_BRAND:gyeon:'));
  const productRows = rows.filter((r) => !r.sku.startsWith('_BRAND:gyeon:'));
  console.log(`  brand: ${brandRows.length}, product: ${productRows.length}`);

  // Size sanity check (Botpress 4KB row limit)
  const oversized = rows.filter(
    (r) => r.sku.length + r.question.length + r.answer.length > 3800,
  );
  if (oversized.length > 0) {
    console.warn(`⚠️  ${oversized.length} oversized rows (>3800 chars)`);
  }

  // 1. Delete existing _BRAND:gyeon:* rows
  console.log('\n• Deleting existing _BRAND:gyeon:* rows');
  const existingBrand = await client.findTableRows({
    table: 'productFaqTable',
    filter: { sku: { $regex: '^_BRAND:gyeon:' } } as any,
    limit: 500,
  });
  if (existingBrand.rows.length > 0) {
    const ids = existingBrand.rows.map((r) => r.id).filter(Boolean);
    await (client as any).deleteTableRows({ table: 'productFaqTable', ids });
    console.log(`  deleted: ${ids.length}`);
  } else {
    console.log('  none found');
  }

  // 2. Build dedupe set for product rows: pull existing FAQs for our target SKUs
  console.log('\n• Building dedupe set for product SKUs');
  const targetSkus = [...new Set(productRows.map((r) => r.sku))];
  const existingProductKeys = new Set<string>();
  const BATCH_QUERY = 50;
  for (let i = 0; i < targetSkus.length; i += BATCH_QUERY) {
    const batch = targetSkus.slice(i, i + BATCH_QUERY);
    const r = await client.findTableRows({
      table: 'productFaqTable',
      filter: { sku: { $in: batch } } as any,
      limit: 500,
    });
    for (const row of r.rows) {
      existingProductKeys.add(rowKey(row.sku as string, row.question as string));
    }
  }
  console.log(`  existing product (sku,question) keys: ${existingProductKeys.size}`);

  // 3. Filter product rows by dedupe
  const productToInsert = productRows.filter(
    (r) => !existingProductKeys.has(rowKey(r.sku, r.question)),
  );
  const productSkipped = productRows.length - productToInsert.length;
  console.log(`  product to insert: ${productToInsert.length} (${productSkipped} dedup-skipped)`);

  // 4. Insert all (brand + product to insert) in batches
  const toInsert = [...brandRows, ...productToInsert];
  console.log(`\n• Inserting ${toInsert.length} rows in batches of 25`);
  const BATCH = 25;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const res = await (client as any).createTableRows({
      table: 'productFaqTable',
      rows: batch,
    });
    const created = (res?.rows || []).length;
    inserted += created;
    if ((i / BATCH) % 5 === 0) {
      console.log(`  batch ${i / BATCH + 1}: +${created} (running total: ${inserted})`);
    }
  }
  console.log(`  ✓ inserted: ${inserted}/${toInsert.length}`);

  // 5. Verification — semantic search
  console.log('\n📋 Verification:');
  const queries = [
    'Q² Mohs EVO ile One EVO arasındaki fark',
    'Gyeon distribütörlüğü nasıl alınır',
    'kaplama uyguladıktan sonra ne kadar beklemeli',
  ];
  for (const q of queries) {
    const sr = await client.findTableRows({
      table: 'productFaqTable',
      search: q,
      limit: 3,
    });
    console.log(`  "${q}":`);
    for (const r of sr.rows) {
      console.log(`    sku=${r.sku} sim=${(r as any).similarity?.toFixed?.(3)} Q=${(r.question as string).slice(0, 60)}`);
    }
  }

  console.log('\n✅ Gyeon FAQ seed complete');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
