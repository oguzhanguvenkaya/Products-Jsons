/**
 * Semantic duplicate check between newly-inserted Gyeon FAQs and pre-existing
 * FAQs for the same SKUs.
 *
 * For each sampled Gyeon FAQ:
 *  1. Query Botpress semantic search constrained by sku.
 *  2. Skip the row that matches our exact text (the one we just inserted).
 *  3. Report top match if similarity > 0.75.
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'output', 'csv', 'gyeon_faqs.csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true }) as Record<string, string>[];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const all = readCsv(CSV_PATH);
  const product = all.filter((r) => !r.sku.startsWith('_BRAND:'));
  console.log(`Loaded ${product.length} Gyeon product FAQs`);

  // Sample 15 across different SKUs (variety)
  const seenSku = new Set<string>();
  const sample: typeof product = [];
  for (const r of product) {
    if (seenSku.has(r.sku)) continue;
    seenSku.add(r.sku);
    sample.push(r);
    if (sample.length >= 15) break;
  }
  console.log(`Sampled ${sample.length} unique-SKU FAQs\n`);

  let dupes = 0;
  let near = 0;

  for (const row of sample) {
    const r: any = await client.findTableRows({
      table: 'productFaqTable',
      filter: { sku: { $eq: row.sku } } as any,
      search: row.question,
      limit: 5,
    });

    // Find best match that is NOT our just-inserted row (compare normalized question text)
    const ourQ = norm(row.question);
    const candidates = (r.rows || []).filter((x: any) => norm(x.question) !== ourQ);
    const top = candidates[0];

    console.log(`─── ${row.sku} ───`);
    console.log(`  NEW Q: ${row.question.slice(0, 80)}`);
    console.log(`  NEW A: ${row.answer.slice(0, 100)}`);
    if (!top) {
      console.log(`  ✓ no other FAQs for this SKU (only the new one)`);
      console.log();
      continue;
    }
    const sim = (top._score ?? top.similarity ?? top.score) as number | undefined;
    const simStr = typeof sim === 'number' ? sim.toFixed(3) : 'n/a';
    console.log(`  EXISTING Q (top match, sim=${simStr}): ${(top.question as string).slice(0, 80)}`);
    console.log(`  EXISTING A: ${(top.answer as string).slice(0, 100)}`);
    if (typeof sim === 'number') {
      if (sim >= 0.85) {
        console.log(`  🔴 LIKELY DUPLICATE (sim ≥ 0.85)`);
        dupes++;
      } else if (sim >= 0.75) {
        console.log(`  🟡 NEAR DUPLICATE (0.75 ≤ sim < 0.85)`);
        near++;
      } else {
        console.log(`  ✓ different topic (sim < 0.75)`);
      }
    }
    console.log();
  }

  console.log(`\nSummary: 🔴 likely dupes: ${dupes} | 🟡 near dupes: ${near} | of ${sample.length} sampled`);
}

main().catch((e) => { console.error(e); process.exit(1); });
