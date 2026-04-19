/**
 * Per-SKU duplicate-question scan.
 * For each Gyeon SKU, list questions that appear 2+ times — both exact and
 * near-exact (after normalization: lowercase, strip punctuation/whitespace).
 */
import { client } from '@botpress/runtime';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'output', 'csv', 'gyeon_faqs.csv');
const OUT = resolve(import.meta.dirname ?? __dirname, '..', 'docs', 'gyeon-dupe-questions.json');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true }) as Record<string, string>[];
}

// Aggressive normalize: drop punctuation, whitespace, accents not preserved (Turkish ç,ş,ğ,ü,ö,ı kept).
function normQ(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

async function main() {
  const all = readCsv(CSV_PATH);
  const skus = [...new Set(all.filter((r) => !r.sku.startsWith('_BRAND:')).map((r) => r.sku))];
  console.log(`Scanning ${skus.length} Gyeon SKUs\n`);

  const skuRowsCache = new Map<string, Array<{ id: string; question: string; answer: string }>>();
  const BATCH = 30;
  for (let i = 0; i < skus.length; i += BATCH) {
    const batch = skus.slice(i, i + BATCH);
    const r: any = await client.findTableRows({
      table: 'productFaqTable',
      filter: { sku: { $in: batch } } as any,
      limit: 1000,
    });
    for (const row of r.rows) {
      const list = skuRowsCache.get(row.sku) || [];
      list.push({ id: row.id, question: row.question, answer: row.answer });
      skuRowsCache.set(row.sku, list);
    }
  }

  const dupesPerSku: any[] = [];
  let totalDupePairs = 0;

  for (const sku of skus) {
    const faqs = skuRowsCache.get(sku) || [];
    const buckets = new Map<string, Array<{ id: string; question: string; answer: string }>>();
    for (const f of faqs) {
      const key = normQ(f.question);
      if (!key) continue;
      const arr = buckets.get(key) || [];
      arr.push(f);
      buckets.set(key, arr);
    }
    const duplicates = [...buckets.values()].filter((arr) => arr.length > 1);
    if (duplicates.length === 0) continue;

    dupesPerSku.push({
      sku,
      total_faqs: faqs.length,
      dupe_groups: duplicates.length,
      groups: duplicates.map((arr) => ({
        question_canonical: arr[0].question,
        count: arr.length,
        rows: arr.map((x) => ({ id: x.id, question: x.question, answer: x.answer.slice(0, 200) })),
      })),
    });
    totalDupePairs += duplicates.reduce((acc, arr) => acc + (arr.length - 1), 0);
  }

  console.log(`SKUs with duplicate questions: ${dupesPerSku.length} / ${skus.length}`);
  console.log(`Total duplicate row count (excess copies): ${totalDupePairs}\n`);

  // Print top 20 most affected SKUs
  dupesPerSku.sort((a, b) => b.dupe_groups - a.dupe_groups);
  for (const entry of dupesPerSku.slice(0, 20)) {
    console.log(`─── ${entry.sku}  (${entry.total_faqs} total FAQs, ${entry.dupe_groups} duplicate groups) ───`);
    for (const g of entry.groups) {
      console.log(`  📌 "${g.question_canonical}"  ×${g.count}`);
      for (const row of g.rows) {
        console.log(`     • [${String(row.id).slice(-8)}] A: ${row.answer.slice(0, 110).replace(/\n/g, ' ')}`);
      }
    }
    console.log();
  }

  writeFileSync(OUT, JSON.stringify({ skus_with_dupes: dupesPerSku.length, total_excess_rows: totalDupePairs, entries: dupesPerSku }, null, 2), 'utf8');
  console.log(`→ wrote: ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
