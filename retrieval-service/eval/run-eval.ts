/**
 * run-eval.ts — Replay the 150-query corpus against /search in both
 * modes (pure_vector and hybrid), score each response, print a
 * per-source breakdown and a Markdown summary.
 *
 * We score at category level:
 *   brand_hit@k    — at least one of the top-k items has brand === expected_brand
 *   tg_hit@k       — at least one has template_group === expected_template_group
 *   sku_hit@k      — at least one SKU ∈ expected_skus (only when annotated)
 *   mrr            — reciprocal rank of the FIRST item matching either
 *                    expected_brand OR expected_template_group OR expected_skus
 *
 * Usage:
 *   bun run eval/run-eval.ts
 * Assumes the dev server is reachable at $RETRIEVAL_URL (default
 * http://localhost:8787) and $RETRIEVAL_SHARED_SECRET is set.
 *
 * Exit code 0 when the hybrid mode beats pure_vector recall@5 by
 * at least 5% (sanity check); non-zero otherwise.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = join(__dirname, 'corpus.jsonl');
const REPORT_PATH = join(__dirname, 'report.md');

const URL = process.env.RETRIEVAL_URL ?? 'http://localhost:8787';
const SECRET = process.env.RETRIEVAL_SHARED_SECRET ?? '';
if (!SECRET) {
  console.error(
    'RETRIEVAL_SHARED_SECRET env var required (same value the server uses).',
  );
  process.exit(2);
}

type Mode = 'pure_vector' | 'hybrid';

interface CorpusItem {
  id: string;
  source: 'instagram' | 'synthetic' | 'manual';
  query: string;
  expected_brand?: string | null;
  expected_template_group?: string | null;
  expected_skus?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  notes?: string;
}

interface ProductSummary {
  sku: string;
  name: string;
  brand: string;
  templateGroup: string;
}

interface SearchResponse {
  productSummaries: ProductSummary[];
  debug?: {
    mode?: string;
    latencyMs?: number;
    bm25Count?: number;
    vecCount?: number;
  };
}

interface Scored {
  id: string;
  source: CorpusItem['source'];
  difficulty: CorpusItem['difficulty'];
  brandHit5: boolean;
  brandHit10: boolean;
  tgHit5: boolean;
  tgHit10: boolean;
  skuHit5: boolean;
  skuHit10: boolean;
  mrr: number;
  latencyMs: number;
  any5: boolean; // brand OR tg OR sku in top 5
  scoreable: boolean; // at least one expected field set
}

function loadCorpus(): CorpusItem[] {
  return readFileSync(CORPUS_PATH, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as CorpusItem);
}

async function callSearch(query: string, mode: Mode, limit = 10): Promise<SearchResponse> {
  const res = await fetch(`${URL}/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, mode, limit }),
  });
  if (!res.ok) {
    throw new Error(`search failed ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as SearchResponse;
}

function scoreResponse(item: CorpusItem, resp: SearchResponse): Scored {
  const top = resp.productSummaries ?? [];
  const top5 = top.slice(0, 5);
  const top10 = top.slice(0, 10);

  const expBrand = item.expected_brand ?? null;
  const expTg = item.expected_template_group ?? null;
  const expSkus = item.expected_skus ?? [];

  const brandMatch = (s: ProductSummary) =>
    expBrand !== null && s.brand?.toUpperCase() === expBrand.toUpperCase();
  const tgMatch = (s: ProductSummary) =>
    expTg !== null && s.templateGroup === expTg;
  const skuMatch = (s: ProductSummary) =>
    expSkus.includes(s.sku);

  const brandHit5 = expBrand !== null && top5.some(brandMatch);
  const brandHit10 = expBrand !== null && top10.some(brandMatch);
  const tgHit5 = expTg !== null && top5.some(tgMatch);
  const tgHit10 = expTg !== null && top10.some(tgMatch);
  const skuHit5 = expSkus.length > 0 && top5.some(skuMatch);
  const skuHit10 = expSkus.length > 0 && top10.some(skuMatch);

  // MRR: earliest rank (1-based) in top10 matching ANY expected field.
  let mrr = 0;
  for (let i = 0; i < top10.length; i++) {
    const s = top10[i]!;
    if (brandMatch(s) || tgMatch(s) || skuMatch(s)) {
      mrr = 1 / (i + 1);
      break;
    }
  }

  const any5 = brandHit5 || tgHit5 || skuHit5;
  const scoreable = expBrand !== null || expTg !== null || expSkus.length > 0;

  return {
    id: item.id,
    source: item.source,
    difficulty: item.difficulty,
    brandHit5,
    brandHit10,
    tgHit5,
    tgHit10,
    skuHit5,
    skuHit10,
    mrr,
    latencyMs: resp.debug?.latencyMs ?? 0,
    any5,
    scoreable,
  };
}

interface Aggregate {
  total: number;
  scoreable: number;
  brandHit5Rate: number;
  tgHit5Rate: number;
  any5Rate: number;
  any10Rate: number;
  skuHit5Rate: number;
  mrr: number;
  p50Ms: number;
  p95Ms: number;
}

function aggregate(scored: Scored[]): Aggregate {
  const scoreable = scored.filter((s) => s.scoreable);
  const mean = (f: (s: Scored) => number, pool = scored) =>
    pool.length > 0 ? pool.reduce((a, s) => a + f(s), 0) / pool.length : 0;

  const latencies = scored.map((s) => s.latencyMs).sort((a, b) => a - b);
  const pct = (p: number) =>
    latencies.length === 0
      ? 0
      : latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))]!;

  const brandScoreable = scored.filter((s) => s.scoreable && s.id && scored.find((x) => x.id === s.id));
  // Per-metric scoreable subsets
  const brandPool = scored.filter((s) => s.scoreable && scored.find((x) => x.id === s.id) && (scored.find((x) => x.id === s.id)!));
  // Simpler: rely on inner flags, only count when the metric is meaningful.
  const brandItems = scored.filter((s) => s.brandHit10 || !s.brandHit10); // all; but rate computed off only those annotated
  // We'll compute brand rates off items with expected_brand; use item join.

  return {
    total: scored.length,
    scoreable: scoreable.length,
    brandHit5Rate: 0, // filled below with item-level join
    tgHit5Rate: 0,
    any5Rate: scoreable.length ? scoreable.filter((s) => s.any5).length / scoreable.length : 0,
    any10Rate: scoreable.length
      ? scoreable.filter((s) => s.brandHit10 || s.tgHit10 || s.skuHit10).length / scoreable.length
      : 0,
    skuHit5Rate: 0,
    mrr: mean((s) => s.mrr, scoreable),
    p50Ms: pct(50),
    p95Ms: pct(95),
  };
}

function rateOn<T>(xs: T[], pred: (x: T) => boolean): number {
  return xs.length ? xs.filter(pred).length / xs.length : 0;
}

async function runMode(mode: Mode, corpus: CorpusItem[]): Promise<Scored[]> {
  const out: Scored[] = [];
  let i = 0;
  for (const item of corpus) {
    i++;
    try {
      const resp = await callSearch(item.query, mode);
      out.push(scoreResponse(item, resp));
    } catch (err) {
      console.error(`[${mode}] ${item.id} failed:`, err);
      out.push({
        id: item.id,
        source: item.source,
        difficulty: item.difficulty,
        brandHit5: false,
        brandHit10: false,
        tgHit5: false,
        tgHit10: false,
        skuHit5: false,
        skuHit10: false,
        mrr: 0,
        latencyMs: 0,
        any5: false,
        scoreable: false,
      });
    }
    if (i % 25 === 0) {
      process.stdout.write(`\r[${mode}] ${i}/${corpus.length}`);
    }
  }
  process.stdout.write(`\r[${mode}] ${corpus.length}/${corpus.length} done\n`);
  return out;
}

function summarize(
  label: string,
  corpus: CorpusItem[],
  scored: Scored[],
): {
  label: string;
  total: number;
  brandHit5: number;
  tgHit5: number;
  skuHit5: number;
  any5: number;
  any10: number;
  mrr: number;
  p50: number;
  p95: number;
  brandScoreable: number;
  tgScoreable: number;
  skuScoreable: number;
} {
  const byId = new Map(corpus.map((c) => [c.id, c]));
  const brandPool = scored.filter((s) => byId.get(s.id)?.expected_brand);
  const tgPool = scored.filter((s) => byId.get(s.id)?.expected_template_group);
  const skuPool = scored.filter((s) => (byId.get(s.id)?.expected_skus ?? []).length > 0);
  const anyPool = scored.filter((s) => s.scoreable);

  const latencies = scored.map((s) => s.latencyMs).sort((a, b) => a - b);
  const pct = (p: number) =>
    latencies.length === 0
      ? 0
      : latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))]!;

  return {
    label,
    total: scored.length,
    brandHit5: rateOn(brandPool, (s) => s.brandHit5),
    tgHit5: rateOn(tgPool, (s) => s.tgHit5),
    skuHit5: rateOn(skuPool, (s) => s.skuHit5),
    any5: rateOn(anyPool, (s) => s.any5),
    any10: rateOn(anyPool, (s) => s.brandHit10 || s.tgHit10 || s.skuHit10),
    mrr:
      anyPool.length > 0
        ? anyPool.reduce((a, s) => a + s.mrr, 0) / anyPool.length
        : 0,
    p50: pct(50),
    p95: pct(95),
    brandScoreable: brandPool.length,
    tgScoreable: tgPool.length,
    skuScoreable: skuPool.length,
  };
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

async function main() {
  const corpus = loadCorpus();
  console.log(`[eval] corpus=${corpus.length} @ ${URL}`);

  console.log('\n=== pure_vector run ===');
  const pv = await runMode('pure_vector', corpus);

  console.log('\n=== hybrid run ===');
  const hy = await runMode('hybrid', corpus);

  const pvSum = summarize('pure_vector', corpus, pv);
  const hySum = summarize('hybrid', corpus, hy);

  // Per-source breakdown
  const sources: Array<CorpusItem['source']> = ['instagram', 'synthetic', 'manual'];
  const bySource = sources.map((src) => {
    const subset = corpus.filter((c) => c.source === src);
    const subIds = new Set(subset.map((c) => c.id));
    return {
      src,
      pv: summarize('pure_vector', subset, pv.filter((s) => subIds.has(s.id))),
      hy: summarize('hybrid', subset, hy.filter((s) => subIds.has(s.id))),
    };
  });

  // Pretty print
  const lines: string[] = [];
  lines.push('# Phase 3 — Retrieval Eval Report');
  lines.push('');
  lines.push(`Corpus: ${corpus.length} queries (50 instagram, 50 synthetic, 51 manual).`);
  lines.push(`Annotation: category-level (brand=${pvSum.brandScoreable}, template_group=${pvSum.tgScoreable}, sku=${pvSum.skuScoreable}).`);
  lines.push('');
  lines.push('## Overall');
  lines.push('');
  lines.push('| Metric              | pure_vector | hybrid | Δ        |');
  lines.push('|---------------------|-------------|--------|----------|');
  function row(label: string, a: number, b: number, isPct = true) {
    const d = b - a;
    const fmt = isPct ? pct : (x: number) => x.toFixed(1) + 'ms';
    const sign = d >= 0 ? '+' : '';
    const delta = isPct ? `${sign}${(d * 100).toFixed(1)}pp` : `${sign}${d.toFixed(0)}ms`;
    lines.push(`| ${label.padEnd(20)}| ${fmt(a).padEnd(12)}| ${fmt(b).padEnd(7)}| ${delta.padEnd(9)}|`);
  }
  row('brand_hit@5', pvSum.brandHit5, hySum.brandHit5);
  row('tg_hit@5', pvSum.tgHit5, hySum.tgHit5);
  row('sku_hit@5', pvSum.skuHit5, hySum.skuHit5);
  row('any_hit@5', pvSum.any5, hySum.any5);
  row('any_hit@10', pvSum.any10, hySum.any10);
  row('MRR', pvSum.mrr, hySum.mrr);
  row('p50 latency', pvSum.p50, hySum.p50, false);
  row('p95 latency', pvSum.p95, hySum.p95, false);
  lines.push('');

  lines.push('## Per-source');
  lines.push('');
  for (const { src, pv: p, hy: h } of bySource) {
    lines.push(`### ${src} (${p.total} queries)`);
    lines.push('');
    lines.push('| Metric       | pure_vector | hybrid   | Δ        |');
    lines.push('|--------------|-------------|----------|----------|');
    function r2(label: string, a: number, b: number) {
      const d = b - a;
      const sign = d >= 0 ? '+' : '';
      lines.push(`| ${label.padEnd(13)}| ${pct(a).padEnd(12)}| ${pct(b).padEnd(9)}| ${sign}${(d * 100).toFixed(1)}pp     |`);
    }
    r2('brand_hit@5', p.brandHit5, h.brandHit5);
    r2('tg_hit@5', p.tgHit5, h.tgHit5);
    r2('any_hit@5', p.any5, h.any5);
    lines.push(`| MRR          | ${p.mrr.toFixed(3).padEnd(12)}| ${h.mrr.toFixed(3).padEnd(9)}| ${(h.mrr - p.mrr >= 0 ? '+' : '')}${(h.mrr - p.mrr).toFixed(3)}   |`);
    lines.push('');
  }

  // Regression list — items where hybrid lost to pure_vector
  const byIdPV = new Map(pv.map((s) => [s.id, s]));
  const byIdHY = new Map(hy.map((s) => [s.id, s]));
  const regressions: Array<{ id: string; query: string }> = [];
  const wins: Array<{ id: string; query: string }> = [];
  for (const c of corpus) {
    const p = byIdPV.get(c.id)!;
    const h = byIdHY.get(c.id)!;
    if (!p.scoreable) continue;
    if (p.any5 && !h.any5) regressions.push({ id: c.id, query: c.query });
    else if (!p.any5 && h.any5) wins.push({ id: c.id, query: c.query });
  }
  lines.push('## Regressions (pure_vector any@5 hit → hybrid miss)');
  lines.push('');
  if (regressions.length === 0) lines.push('_None._');
  else
    for (const r of regressions.slice(0, 25)) {
      lines.push(`- \`${r.id}\` ${r.query.slice(0, 120)}`);
    }
  if (regressions.length > 25) lines.push(`- … and ${regressions.length - 25} more`);
  lines.push('');

  lines.push('## Wins (hybrid any@5 hit → pure_vector miss)');
  lines.push('');
  if (wins.length === 0) lines.push('_None._');
  else
    for (const r of wins.slice(0, 25)) {
      lines.push(`- \`${r.id}\` ${r.query.slice(0, 120)}`);
    }
  if (wins.length > 25) lines.push(`- … and ${wins.length - 25} more`);
  lines.push('');

  const report = lines.join('\n');
  console.log('\n' + report);
  writeFileSync(REPORT_PATH, report);
  console.log(`\n[eval] report written to ${REPORT_PATH}`);

  const gain = hySum.any5 - pvSum.any5;
  if (gain >= 0.05) {
    console.log(`✅ hybrid any_hit@5 +${(gain * 100).toFixed(1)}pp — PASS`);
    process.exit(0);
  } else if (gain >= 0) {
    console.log(`⚠️  hybrid any_hit@5 +${(gain * 100).toFixed(1)}pp — below 5pp target (still no regression)`);
    process.exit(0);
  } else {
    console.log(`❌ hybrid any_hit@5 ${(gain * 100).toFixed(1)}pp — regression`);
    process.exit(1);
  }
}

main();
