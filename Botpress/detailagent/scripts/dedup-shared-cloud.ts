/**
 * Paket M.3-M.6 (Cloud) — Apply dedup to shared tables:
 *   specs, content, desc1/2, meta — delete non-primary rows
 *   FAQ — delete non-primary (moved ones will be re-inserted via CSV upsert later)
 *   relations — delete non-primary + upsert primary rows (with remapped targets)
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_DIR = resolve(PROJECT_ROOT, 'output', 'csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  const primaryMap = readCsv(resolve(CSV_DIR, 'primary_map.csv'));
  const nonPrimarySkus = new Set(primaryMap.filter(r => r.is_primary === '0').map(r => r.sku));
  const skuToPrimary = new Map(primaryMap.map(r => [r.sku, r.primary_sku]));
  console.log(`Non-primary SKUs: ${nonPrimarySkus.size}`);

  // --- 1. Simple delete from specs/content/desc1/2/meta ---
  for (const table of ['productSpecsTable', 'productContentTable',
                       'productDescPart1Table', 'productDescPart2Table']) {
    console.log(`\n• ${table}: delete non-primary`);
    let deleted = 0;
    for (const sku of nonPrimarySkus) {
      const r = await client.findTableRows({
        table, filter: { sku: { $eq: sku } } as any, limit: 1,
      });
      if (r.rows.length) {
        await (client as any).deleteTableRows({
          table, ids: r.rows.map(x => x.id).filter(Boolean),
        });
        deleted++;
      }
    }
    console.log(`  ✓ deleted: ${deleted}`);
  }

  // Meta: multiple rows per SKU
  console.log('\n• productMetaTable: delete non-primary (EAV)');
  let metaDel = 0;
  for (const sku of nonPrimarySkus) {
    const r = await client.findTableRows({
      table: 'productMetaTable', filter: { sku: { $eq: sku } } as any, limit: 100,
    });
    if (r.rows.length) {
      await (client as any).deleteTableRows({
        table: 'productMetaTable', ids: r.rows.map(x => x.id).filter(Boolean),
      });
      metaDel += r.rows.length;
    }
  }
  console.log(`  ✓ deleted: ${metaDel}`);

  // --- 2. FAQ: delete all non-primary rows (moved ones will re-insert from CSV) ---
  console.log('\n• productFaqTable: delete non-primary + re-sync from CSV');
  let faqDel = 0;
  for (const sku of nonPrimarySkus) {
    const r = await client.findTableRows({
      table: 'productFaqTable', filter: { sku: { $eq: sku } } as any, limit: 100,
    });
    if (r.rows.length) {
      await (client as any).deleteTableRows({
        table: 'productFaqTable', ids: r.rows.map(x => x.id).filter(Boolean),
      });
      faqDel += r.rows.length;
    }
  }
  console.log(`  ✓ deleted: ${faqDel}`);
  // Now insert FAQ rows that were moved to primary (exist in CSV but not in Cloud)
  const faqCsv = readCsv(resolve(CSV_DIR, 'product_faq.csv'));
  // Filter: only primary SKU rows that weren't already in Cloud
  // Simplest approach: re-insert all primary FAQ rows? No, that would duplicate.
  // Better: for each "moved" row (was non-primary in Cloud, now primary in CSV, and there might be duplicate hashes we resolved locally),
  // we need to insert ONLY the ones that we moved (not dup).
  // To be safe: delete all Menzerna-specific (and other multi-variant groups) primary FAQ, then re-insert from CSV.
  // Even simpler: Check each CSV row for primary SKU — if not in Cloud, insert.
  // But that's a lot of calls. Let me do smart: for each primary SKU, fetch existing Cloud hashes, compare with CSV, insert missing.

  const primarySkus = new Set(primaryMap.filter(r => r.is_primary === '1').map(r => r.sku));
  let faqIns = 0;
  const BATCH = 25;
  for (const sku of primarySkus) {
    const csvRows = faqCsv.filter(r => r.sku === sku);
    if (csvRows.length === 0) continue;
    const cloudRes = await client.findTableRows({
      table: 'productFaqTable', filter: { sku: { $eq: sku } } as any, limit: 100,
    });
    const cloudHashes = new Set(
      cloudRes.rows.map(r => `${r.question}|${r.answer}`)
    );
    const toInsert = csvRows.filter(r => !cloudHashes.has(`${r.question}|${r.answer}`));
    if (toInsert.length > 0) {
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const res = await (client as any).createTableRows({
          table: 'productFaqTable', rows: toInsert.slice(i, i + BATCH),
        });
        faqIns += (res?.rows || []).length;
      }
    }
  }
  console.log(`  ✓ newly inserted (moved FAQs): ${faqIns}`);

  // --- 3. Relations: delete non-primary + upsert primary (with remapped targets) ---
  console.log('\n• productRelationsTable: delete non-primary + upsert primary');
  let relDel = 0;
  for (const sku of nonPrimarySkus) {
    const r = await client.findTableRows({
      table: 'productRelationsTable', filter: { sku: { $eq: sku } } as any, limit: 1,
    });
    if (r.rows.length) {
      await (client as any).deleteTableRows({
        table: 'productRelationsTable', ids: r.rows.map(x => x.id).filter(Boolean),
      });
      relDel++;
    }
  }
  console.log(`  ✓ deleted non-primary: ${relDel}`);

  const relRows = readCsv(resolve(CSV_DIR, 'product_relations.csv'));
  let relUpd = 0;
  for (let i = 0; i < relRows.length; i += BATCH) {
    const res = await (client as any).upsertTableRows({
      table: 'productRelationsTable', rows: relRows.slice(i, i + BATCH), keyColumn: 'sku',
    });
    relUpd += (res?.updated || []).length + (res?.created || []).length;
  }
  console.log(`  ✓ upserted primary relations: ${relUpd}`);

  console.log('\n✅ Paket M.3-M.6 done');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
