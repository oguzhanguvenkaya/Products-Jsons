/**
 * Full scan: for every newly-inserted Gyeon product FAQ, find the highest-
 * Jaccard match among OTHER FAQs for the same SKU. Report all candidates
 * above threshold 0.3.
 */
import { client } from '@botpress/runtime';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'output', 'csv', 'gyeon_faqs.csv');
const OUT = resolve(import.meta.dirname ?? __dirname, '..', 'docs', 'gyeon-dupe-candidates.json');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true }) as Record<string, string>[];
}

const STOP = new Set(['ve','bir','bu','ile','için','olan','mi','mı','mu','mü','de','da','en','ne','nasıl','ya','olarak','daha','çok','her','tüm','o','şu','veya','yok','var','olur','iyi','sonra','önce','sırasında','gerek','olabilir','etmek','etmesi','olmak']);

function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function normalizeQ(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

async function main() {
  const all = readCsv(CSV_PATH);
  const product = all.filter((r) => !r.sku.startsWith('_BRAND:'));
  const skus = [...new Set(product.map((r) => r.sku))];
  console.log(`Scanning ${product.length} product FAQs across ${skus.length} SKUs\n`);

  // Pull all FAQ rows for our target SKUs once
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
  console.log(`Cached FAQ rows for ${skuRowsCache.size} SKUs`);
  let totalFaqs = 0;
  for (const list of skuRowsCache.values()) totalFaqs += list.length;
  console.log(`Total FAQ rows (Gyeon SKUs): ${totalFaqs}\n`);

  const candidates: any[] = [];
  for (const newRow of product) {
    const skuFaqs = skuRowsCache.get(newRow.sku) || [];
    const ourQ = normalizeQ(newRow.question);
    const ourTokens = tokens(`${newRow.question} ${newRow.answer}`);
    const others = skuFaqs.filter((x) => normalizeQ(x.question) !== ourQ);
    if (others.length === 0) continue;
    let best = { sim: 0, row: null as any };
    for (const other of others) {
      const sim = jaccard(ourTokens, tokens(`${other.question} ${other.answer}`));
      if (sim > best.sim) best = { sim, row: other };
    }
    if (best.sim >= 0.3) {
      candidates.push({
        sku: newRow.sku,
        sim: +best.sim.toFixed(3),
        new_q: newRow.question,
        new_a: newRow.answer,
        existing_q: best.row.question,
        existing_a: best.row.answer,
        existing_id: best.row.id,
      });
    }
  }

  candidates.sort((a, b) => b.sim - a.sim);

  const strong = candidates.filter((c) => c.sim >= 0.5);
  const near = candidates.filter((c) => c.sim >= 0.3 && c.sim < 0.5);
  console.log(`🔴 STRONG (Jaccard ≥ 0.5): ${strong.length}`);
  console.log(`🟡 NEAR   (0.3 ≤ Jaccard < 0.5): ${near.length}`);
  console.log(`Total candidates: ${candidates.length} of ${product.length} new FAQs\n`);

  console.log('--- TOP 25 candidates ---\n');
  for (const c of candidates.slice(0, 25)) {
    const tag = c.sim >= 0.5 ? '🔴' : '🟡';
    console.log(`${tag} ${c.sku}  Jaccard=${c.sim}`);
    console.log(`   NEW Q: ${c.new_q}`);
    console.log(`   NEW A: ${c.new_a.slice(0, 110)}`);
    console.log(`   OLD Q: ${c.existing_q}`);
    console.log(`   OLD A: ${c.existing_a.slice(0, 110)}`);
    console.log();
  }

  writeFileSync(OUT, JSON.stringify({ count: candidates.length, strong: strong.length, near: near.length, candidates }, null, 2), 'utf8');
  console.log(`→ wrote full report: ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
