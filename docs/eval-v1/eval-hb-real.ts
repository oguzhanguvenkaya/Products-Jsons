// Eval v2 — HB real-world test (191 senaryo, retrieval-direct)
//
// İki mod:
// - MODE=bare    → query = soru (raw, baseline)
// - MODE=context → query = `${urun_adi} — ${soru}` (HB ürün sayfası bağlamı simülasyonu)
//
// Microservice POST /search'e query gönderir, top-N içinde sku_db var mı kontrol.
// Bot LLM bypass — sadece retrieval pipeline (BM25 + vector + RRF + slot + filter) test edilir.
//
// Pass kriterleri:
// - testable intent: top-8 sku/variant_skus'ta sku_db var → pass
// - adversarial_not_in_db: top-8'de high-similarity (>0.7) match YOK → pass (halüsinasyon önleme)
// - off_topic: skip (kargo/iade/fiyat — retrieval ile alakasız)
//
// Çıktı (mod bazlı):
// - results-hb-real-bare.jsonl
// - results-hb-real-context.jsonl

import { readFileSync, writeFileSync } from 'node:fs';

const DOCS = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/docs/eval-v1';
const URL = process.env.RETRIEVAL_URL ?? 'http://localhost:8787';
const SECRET = process.env.RETRIEVAL_SHARED_SECRET ?? 'H2Kou0bz4nxYFzSSg+vAdmgbQzYG0VWf';
const TOP_N = 8;
const ADVERSARIAL_SIM_THRESHOLD = 0.7;

const MODE = (process.env.MODE ?? 'bare').toLowerCase();
if (MODE !== 'bare' && MODE !== 'context') {
  console.error(`HATA: MODE=${MODE} geçersiz. 'bare' veya 'context' olmalı.`);
  process.exit(1);
}
console.log(`✓ MODE=${MODE}`);

interface Q {
  id: string;
  intent: string;
  sku_hb: string;
  sku_db: string | null;
  // Phase 1.1.13M: answer_sku ground truth (satıcının önerdiği gerçek doğru ürün)
  answer_sku?: string | null;
  answer_sku_alt?: string[];
  answer_method?: 'confirms_context' | 'info_only_about_context' | 'recommends_alternative' | 'unparseable' | 'no_product_in_answer';
  sku_db_alias?: { from_stock_code: string; method: string; confidence: string; note: string };
  urun_adi: string;
  soru: string;
  beklenen_cevap: string;
  cevapta_url: string[];
  tags: string[];
}

const questions: Q[] = readFileSync(`${DOCS}/questions-real-hb.jsonl`, 'utf-8')
  .split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

console.log(`✓ ${questions.length} HB senaryosu yüklendi`);

interface R {
  id: string;
  intent: string;
  mode: string;
  query_sent: string;
  pass: boolean;
  skipped?: boolean;
  expected_sku?: string | null;          // primary truth
  expected_truth_skus?: string[];        // primary + alt (Phase 1.1.13M)
  answer_method?: string;                // Phase 1.1.13M debug
  top_skus?: string[];
  top_similarities?: number[];
  match_position?: number;  // 1-indexed, -1 if not found
  notes: string[];
}

const results: R[] = [];
let processed = 0;
const t0 = Date.now();

async function searchOne(query: string): Promise<{ skus: string[]; similarities: number[]; raw: any } | null> {
  try {
    const res = await fetch(`${URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`,
      },
      body: JSON.stringify({
        query,
        templateGroup: null,
        templateSubType: null,
        brand: null,
        exactMatch: null,
        mainCat: null,
        subCat: null,
        limit: TOP_N,
        metaFilters: null,
        mode: 'hybrid',
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`HTTP ${res.status}: ${txt.slice(0, 100)}`);
      return null;
    }
    const data = await res.json() as any;
    const summaries = data.productSummaries ?? [];
    const skus: string[] = [];
    const similarities: number[] = [];
    for (const s of summaries) {
      skus.push(s.sku);
      // variant_skus pipe-separated
      if (s.variant_skus && typeof s.variant_skus === 'string') {
        for (const vs of s.variant_skus.split('|').filter(Boolean)) {
          if (!skus.includes(vs)) skus.push(vs);
        }
      }
      similarities.push(typeof s.similarity === 'number' ? s.similarity : 0);
    }
    return { skus, similarities, raw: data };
  } catch (e: any) {
    console.error(`fetch error: ${e.message}`);
    return null;
  }
}

for (const q of questions) {
  processed++;

  const querySent = MODE === 'context'
    ? `${q.urun_adi} — ${q.soru}`
    : q.soru;

  // Phase 1.1.13M: skip off_topic + no_product_in_answer + unparseable
  // (cevap ürün önerisi içermiyor veya parse edilemedi → eval skoruna girmez)
  const skipReason =
    q.intent === 'off_topic' ? 'off_topic_skip' :
    q.answer_method === 'no_product_in_answer' ? 'no_product_in_answer_skip' :
    q.answer_method === 'unparseable' ? 'unparseable_skip' :
    null;
  if (skipReason) {
    results.push({
      id: q.id,
      intent: q.intent,
      mode: MODE,
      query_sent: querySent,
      pass: true,
      skipped: true,
      answer_method: q.answer_method,
      notes: [skipReason],
    });
    continue;
  }

  // Phase 1.1.13M: ground truth = answer_sku (varsa) ?? sku_db, + alt array
  const primaryTruth = q.answer_sku ?? q.sku_db;
  const truthSkus = [primaryTruth, ...(q.answer_sku_alt ?? [])].filter(Boolean) as string[];

  const r: R = {
    id: q.id,
    intent: q.intent,
    mode: MODE,
    query_sent: querySent,
    pass: false,
    expected_sku: primaryTruth,
    expected_truth_skus: truthSkus,
    answer_method: q.answer_method,
    top_skus: [],
    top_similarities: [],
    match_position: -1,
    notes: [],
  };

  const out = await searchOne(querySent);
  if (!out) {
    r.notes.push('search_call_failed');
    results.push(r);
    continue;
  }

  r.top_skus = out.skus.slice(0, 12);
  r.top_similarities = out.similarities;

  // Adversarial: pass eğer top-N'de high-similarity match YOK
  if (q.intent === 'adversarial_not_in_db') {
    const maxSim = out.similarities.length > 0 ? Math.max(...out.similarities) : 0;
    if (maxSim < ADVERSARIAL_SIM_THRESHOLD || out.skus.length === 0) {
      r.pass = true;
      r.notes.push(`adversarial_ok: max_sim=${maxSim.toFixed(3)}`);
    } else {
      r.pass = false;
      r.notes.push(`adversarial_fail: high_sim=${maxSim.toFixed(3)} (threshold ${ADVERSARIAL_SIM_THRESHOLD})`);
    }
    results.push(r);
    continue;
  }

  // Phase 1.1.13M: truthSkus boşsa (sku_db null + answer_sku null + alt boş) skip
  if (truthSkus.length === 0) {
    r.skipped = true;
    r.pass = true;
    r.notes.push('no_truth_sku_skip');
    results.push(r);
    continue;
  }

  // Testable: truthSkus'tan biri top-N içinde mi?
  const pos = out.skus.findIndex(s => truthSkus.includes(s));
  r.match_position = pos === -1 ? -1 : pos + 1;
  if (pos !== -1) {
    r.pass = true;
    r.notes.push(`match_at_pos_${pos + 1} (sku=${out.skus[pos]})`);
  } else {
    r.pass = false;
    r.notes.push(`no_match in top-${out.skus.length} (truth=[${truthSkus.join(',')}])`);
  }

  results.push(r);

  if (processed % 25 === 0) {
    console.log(`  ${processed}/${questions.length} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}

console.log(`\n✓ DONE — ${processed} senaryo, ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const outFile = `${DOCS}/results-hb-real-${MODE}.jsonl`;
writeFileSync(outFile, results.map(r => JSON.stringify(r)).join('\n'));

// Summary by intent
const byIntent = new Map<string, { total: number; pass: number; fail: number; skipped: number }>();
for (const r of results) {
  if (!byIntent.has(r.intent)) byIntent.set(r.intent, { total: 0, pass: 0, fail: 0, skipped: 0 });
  const e = byIntent.get(r.intent)!;
  e.total++;
  if (r.skipped) e.skipped++;
  else if (r.pass) e.pass++;
  else e.fail++;
}

console.log('\n=== ÖZET (intent) ===');
let totalPass = 0, totalFail = 0, totalSkip = 0;
for (const [k, s] of [...byIntent.entries()].sort((a, b) => b[1].total - a[1].total)) {
  totalPass += s.pass; totalFail += s.fail; totalSkip += s.skipped;
  const evald = s.total - s.skipped;
  const rate = evald === 0 ? 0 : (s.pass / evald) * 100;
  console.log(`  ${k.padEnd(35)} ${String(s.pass).padStart(3)}/${String(evald).padStart(3)} (${rate.toFixed(0).padStart(3)}%)  fail=${s.fail}  skip=${s.skipped}`);
}
const totalEvald = totalPass + totalFail;
console.log(`  ${'TOPLAM'.padEnd(35)} ${String(totalPass).padStart(3)}/${String(totalEvald).padStart(3)} (${((totalPass / totalEvald) * 100).toFixed(1)}%)  skip=${totalSkip}`);

// Match position dağılımı
const positions = results.filter(r => r.match_position && r.match_position > 0).map(r => r.match_position!);
if (positions.length > 0) {
  const top1 = positions.filter(p => p === 1).length;
  const top3 = positions.filter(p => p <= 3).length;
  const top5 = positions.filter(p => p <= 5).length;
  console.log(`\n=== MATCH POSITION (testable, ${positions.length} match) ===`);
  console.log(`  top-1: ${top1} (${((top1 / positions.length) * 100).toFixed(0)}%)`);
  console.log(`  top-3: ${top3} (${((top3 / positions.length) * 100).toFixed(0)}%)`);
  console.log(`  top-5: ${top5} (${((top5 / positions.length) * 100).toFixed(0)}%)`);
}

// Top fails
const failed = results.filter(r => !r.pass && !r.skipped);
console.log(`\n=== İLK ${Math.min(15, failed.length)} FAIL ===`);
for (const f of failed.slice(0, 15)) {
  const q = questions.find(qq => qq.id === f.id)!;
  console.log(`  [${f.id}] [${f.intent}] sku_db=${f.expected_sku ?? 'NULL'} pos=${f.match_position}`);
  console.log(`    soru: ${q.soru.slice(0, 80)}...`);
  console.log(`    top: ${(f.top_skus ?? []).slice(0, 5).join(',')}`);
  console.log(`    notes: ${f.notes.join('; ')}`);
}

console.log(`\n✓ Çıktı: ${outFile}`);
process.exit(0);
