/**
 * Semantic + token-overlap duplicate check (v2).
 * Samples 15 diverse Gyeon FAQs across question patterns and uses Jaccard
 * token overlap on (question + answer) to score similarity since Botpress
 * doesn't expose similarity via this endpoint.
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

const STOP = new Set(['ve','bir','bu','ile','için','olan','mi','mı','mu','mü','de','da','en','ne','nasıl','ya','olarak','daha','çok','her','tüm','o','şu','o','ya','veya','yok','var','olur','iyi','sonra','önce','sırasında']);

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

async function main() {
  const all = readCsv(CSV_PATH);
  const product = all.filter((r) => !r.sku.startsWith('_BRAND:'));

  // Diverse sample: pick rows whose question STARTS with one of these tokens, 1-2 per group
  const patterns = [
    'Birden fazla',
    'Çıkarılabilir',
    'Ne kadar dayanır',
    'Bu ürünle kaplı',
    'Nasıl uygulanır',
    'Nasıl kullanılır',
    'High spot',
    'Boncuklanma',
    'Açıldıktan sonra',
    'Üzerine ek',
    'Wax üzerine',
    'Nereye uygulanır',
    'PPF/Mat',
    'Kaplama uygulamadan',
    'Boyaya zarar',
  ];

  const sample: typeof product = [];
  const usedKeys = new Set<string>();
  for (const pat of patterns) {
    const candidate = product.find(
      (r) => r.question.toLowerCase().startsWith(pat.toLowerCase()) && !usedKeys.has(`${r.sku}::${r.question}`),
    );
    if (candidate) {
      sample.push(candidate);
      usedKeys.add(`${candidate.sku}::${candidate.question}`);
    }
  }
  console.log(`Sampled ${sample.length} diverse FAQs across question patterns\n`);

  let strongDupe = 0, near = 0, weak = 0;

  for (const row of sample) {
    // Pull all rows for this SKU (the universe to compare against)
    const r: any = await client.findTableRows({
      table: 'productFaqTable',
      filter: { sku: { $eq: row.sku } } as any,
      limit: 100,
    });
    const skuRows = (r.rows || []) as Array<{ id: string; sku: string; question: string; answer: string }>;
    const ourTokens = tokens(`${row.question} ${row.answer}`);
    const ourQ = row.question.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

    // Score every other row for this SKU; exclude exact-question matches
    const scored = skuRows
      .filter((x) => x.question.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') !== ourQ)
      .map((x) => ({ row: x, sim: jaccard(ourTokens, tokens(`${x.question} ${x.answer}`)) }))
      .sort((a, b) => b.sim - a.sim);

    const top = scored[0];

    console.log(`─── ${row.sku} (${skuRows.length} total FAQs in DB for this SKU) ───`);
    console.log(`  NEW Q: ${row.question}`);
    console.log(`  NEW A: ${row.answer.slice(0, 120)}`);
    if (!top) {
      console.log(`  ✓ no other FAQs to compare`);
      console.log();
      continue;
    }
    const tag = top.sim >= 0.5 ? '🔴 STRONG' : top.sim >= 0.3 ? '🟡 NEAR' : top.sim >= 0.15 ? '🟢 WEAK' : '✓ different';
    if (top.sim >= 0.5) strongDupe++;
    else if (top.sim >= 0.3) near++;
    else if (top.sim >= 0.15) weak++;
    console.log(`  TOP MATCH (Jaccard=${top.sim.toFixed(3)}) ${tag}`);
    console.log(`    EXISTING Q: ${top.row.question.slice(0, 100)}`);
    console.log(`    EXISTING A: ${top.row.answer.slice(0, 120)}`);
    if (scored[1] && scored[1].sim >= 0.2) {
      console.log(`  RUNNER-UP (Jaccard=${scored[1].sim.toFixed(3)})`);
      console.log(`    Q: ${scored[1].row.question.slice(0, 80)}`);
    }
    console.log();
  }

  console.log(`\nSummary: 🔴 strong: ${strongDupe} | 🟡 near: ${near} | 🟢 weak: ${weak} | of ${sample.length} sampled`);
  console.log(`\nNote: Jaccard ≥ 0.5 = high content overlap (likely duplicate).`);
  console.log(`      Jaccard ≥ 0.3 = same topic with different phrasing (potential dupe).`);
  console.log(`      Jaccard 0.15–0.3 = related but distinct.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
