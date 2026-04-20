/**
 * Paket L.5 — Upsert Menzerna relations + refresh FAQ rows.
 *
 * Relations: upsert by sku.
 * FAQ: delete old Menzerna FAQ rows, insert new (fresh from export).
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
  console.log('🔧 Paket L.5 — Upsert Menzerna relations + refresh FAQ');
  const master = readCsv(resolve(CSV_DIR, 'products_master.csv'));
  const menzSkus = new Set(master.filter(r => r.brand?.toUpperCase() === 'MENZERNA').map(r => r.sku));

  // --- 1. Relations upsert ---
  const rel = readCsv(resolve(CSV_DIR, 'product_relations.csv')).filter(r => menzSkus.has(r.sku));
  console.log(`\n• productRelationsTable: upserting ${rel.length} rows`);
  const BATCH = 25;
  let relUpd = 0;
  for (let i = 0; i < rel.length; i += BATCH) {
    const res = await (client as any).upsertTableRows({
      table: 'productRelationsTable', rows: rel.slice(i, i + BATCH), keyColumn: 'sku',
    });
    relUpd += (res?.updated || []).length;
  }
  console.log(`  ✓ relations updated: ${relUpd}`);

  // --- 2. FAQ refresh ---
  console.log(`\n• productFaqTable: delete old Menzerna FAQ + insert new`);
  let deleted = 0;
  for (const sku of menzSkus) {
    const r = await client.findTableRows({
      table: 'productFaqTable', filter: { sku: { $eq: sku } } as any, limit: 100,
    });
    if (r.rows.length) {
      const ids = r.rows.map((x) => x.id).filter(Boolean);
      await (client as any).deleteTableRows({ table: 'productFaqTable', ids });
      deleted += ids.length;
    }
  }
  console.log(`  ✓ old FAQ deleted: ${deleted} rows`);

  const allFaq = readCsv(resolve(CSV_DIR, 'product_faq.csv'));
  const menzFaq = allFaq.filter(r => menzSkus.has(r.sku));
  console.log(`  Inserting new FAQ: ${menzFaq.length} rows`);
  let inserted = 0;
  for (let i = 0; i < menzFaq.length; i += BATCH) {
    const res = await (client as any).createTableRows({
      table: 'productFaqTable', rows: menzFaq.slice(i, i + BATCH),
    });
    inserted += (res?.rows || []).length;
  }
  console.log(`  ✓ inserted: ${inserted} rows`);

  console.log('\n✅ Paket L.5 done');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
