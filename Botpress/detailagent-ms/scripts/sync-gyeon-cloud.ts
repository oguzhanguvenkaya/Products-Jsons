/**
 * Sync GYEON data from local CSV to Cloud (Faz 3a/3b/3c/3d).
 *
 * Steps:
 *   1. productSpecsTable — upsert 99 GYEON rows (includes spec fixes + ratings)
 *   2. productContentTable — upsert 99 GYEON rows (includes HYBRID HTU)
 *   3. productFaqTable — delete all existing GYEON rows, insert all 803 fresh
 *
 * Idempotent for specs/content (keyColumn=sku). FAQ: full replace.
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const MASTER = resolve(PROJECT_ROOT, 'data', 'csv', 'products_master.csv');
const SPECS = resolve(PROJECT_ROOT, 'data', 'csv', 'product_specs.csv');
const CONTENT = resolve(PROJECT_ROOT, 'data', 'csv', 'product_content.csv');
const FAQ = resolve(PROJECT_ROOT, 'data', 'csv', 'product_faq.csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  console.log('🚀 GYEON Cloud Sync — Faz 3a/3b/3c/3d\n');

  // Build GYEON SKU set from master
  const masterRows = readCsv(MASTER);
  const gyeonSkus = new Set(
    masterRows.filter((r) => (r.brand || '').toUpperCase() === 'GYEON').map((r) => r.sku),
  );
  console.log(`GYEON primary SKUs: ${gyeonSkus.size}`);

  const isGyeonSku = (sku: string) =>
    gyeonSkus.has(sku) || sku.startsWith('Q2-') || sku.startsWith('Q2M-');

  // ── 1. SPECS (3a + 3d) ──
  console.log('\n── 1. productSpecsTable ──');
  const specsAll = readCsv(SPECS);
  const specsGy = specsAll.filter((r) => isGyeonSku(r.sku));
  console.log(`GYEON specs rows: ${specsGy.length}`);

  {
    const BATCH = 25;
    let updated = 0;
    for (let i = 0; i < specsGy.length; i += BATCH) {
      const res = await (client as any).upsertTableRows({
        table: 'productSpecsTable',
        rows: specsGy.slice(i, i + BATCH),
        keyColumn: 'sku',
      });
      updated += (res?.updated || []).length + (res?.created || []).length;
    }
    console.log(`  ✓ upserted ${updated}/${specsGy.length}`);
  }

  // ── 2. CONTENT (3b) ──
  console.log('\n── 2. productContentTable ──');
  const contentAll = readCsv(CONTENT);
  const contentGy = contentAll.filter((r) => isGyeonSku(r.sku));
  console.log(`GYEON content rows: ${contentGy.length}`);

  {
    const BATCH = 25;
    let updated = 0;
    for (let i = 0; i < contentGy.length; i += BATCH) {
      const res = await (client as any).upsertTableRows({
        table: 'productContentTable',
        rows: contentGy.slice(i, i + BATCH),
        keyColumn: 'sku',
      });
      updated += (res?.updated || []).length + (res?.created || []).length;
    }
    console.log(`  ✓ upserted ${updated}/${contentGy.length}`);
  }

  // ── 3. FAQ (3c) — delete existing GYEON FAQs, insert fresh ──
  console.log('\n── 3. productFaqTable (delete + insert) ──');
  const faqAll = readCsv(FAQ);
  const faqGy = faqAll.filter((r) => isGyeonSku(r.sku));
  console.log(`GYEON FAQ rows in CSV: ${faqGy.length}`);

  // Fetch existing Cloud GYEON FAQs (in batches to avoid limit cap)
  console.log('  Fetching existing Cloud GYEON FAQs...');
  const existing: any[] = [];
  let offset = 0;
  while (true) {
    const res = await client.findTableRows({
      table: 'productFaqTable',
      filter: { sku: { $regex: '^Q2[-M]', $options: 'i' } } as any,
      limit: 500,
      offset,
    } as any);
    if (res.rows.length === 0) break;
    existing.push(...res.rows);
    if (res.rows.length < 500) break;
    offset += 500;
  }
  console.log(`  Existing Cloud GYEON FAQs: ${existing.length}`);

  if (existing.length > 0) {
    const ids = existing.map((r: any) => r.id).filter(Boolean);
    console.log(`  Deleting ${ids.length} existing rows...`);
    const DEL_BATCH = 100;
    for (let i = 0; i < ids.length; i += DEL_BATCH) {
      await (client as any).deleteTableRows({
        table: 'productFaqTable',
        ids: ids.slice(i, i + DEL_BATCH),
      });
    }
    console.log(`  ✓ deleted`);
  }

  console.log(`  Inserting ${faqGy.length} fresh GYEON FAQs...`);
  const INS_BATCH = 25;
  let inserted = 0;
  for (let i = 0; i < faqGy.length; i += INS_BATCH) {
    const res = await (client as any).createTableRows({
      table: 'productFaqTable',
      rows: faqGy.slice(i, i + INS_BATCH),
    });
    inserted += (res?.rows || []).length;
  }
  console.log(`  ✓ inserted ${inserted}/${faqGy.length}`);

  console.log('\n✅ Sync complete. Run verify-gyeon-sync.ts to confirm.');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
