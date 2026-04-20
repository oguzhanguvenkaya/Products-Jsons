/**
 * Paket L.7 — Seed 74 Menzerna brand-level FAQs (_BRAND:menzerna:<category>)
 * scraped from menzerna.com/car-care/training-tips/faqs, translated to Turkish.
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'data', 'csv', 'menzerna_brand_faqs.csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  console.log('🔧 Paket L.7 — Seed Menzerna brand FAQs');
  const rows = readCsv(CSV_PATH);
  console.log(`Loaded ${rows.length} rows`);

  // Idempotency: delete existing _BRAND:menzerna:* rows if present
  const existing = await client.findTableRows({
    table: 'productFaqTable',
    filter: { sku: { $regex: '^_BRAND:menzerna:' } } as any,
    limit: 200,
  });
  if (existing.rows.length > 0) {
    console.log(`  Deleting ${existing.rows.length} existing _BRAND:menzerna:* rows`);
    const ids = existing.rows.map(r => r.id).filter(Boolean);
    await (client as any).deleteTableRows({ table: 'productFaqTable', ids });
  }

  const BATCH = 25;
  let ins = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const res = await (client as any).createTableRows({
      table: 'productFaqTable', rows: rows.slice(i, i + BATCH),
    });
    ins += (res?.rows || []).length;
  }
  console.log(`  ✓ inserted: ${ins}/${rows.length}`);

  // Verification
  console.log('\n📋 Semantic search test:');
  const q = 'araba nasıl cila yapılır';
  const sr = await client.findTableRows({
    table: 'productFaqTable',
    search: q,
    limit: 3,
  });
  console.log(`  Query: "${q}"`);
  for (const r of sr.rows) {
    console.log(`    sku=${r.sku} sim=${r.similarity} Q=${(r.question as string).slice(0, 60)}`);
  }

  console.log('\n✅ Paket L.7 done');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
