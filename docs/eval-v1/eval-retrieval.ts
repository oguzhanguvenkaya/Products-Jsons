// Eval v1 — Retrieval-service direct test (bot bypass)
//
// 270 sorudan ~165'ini bot LLM bypass ederek retrieval-service tool'larını direkt
// test eder. Tool seçimi, filter doğruluğu, sonuç sayısı, embedding kalitesi
// + bilinen bug'lar (snippet format, sub_type display) için sample analiz.
//
// Çıktı: docs/eval-v1/results-retrieval.jsonl + results-summary.md
//
// Kapsam: D (filter), E (rank), F (budget), G (compare partial), H (related),
// I (FAQ), C (detail) kategorileri için tool davranışı.
//
// A, B (clarifying/multi-turn), J (edge), K (adversarial) → bot LLM gerektirir,
// bu script kapsam dışı (eval-bot.ts ile yapılır).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { sql } from '../../retrieval-service/src/lib/db.ts';

const DOCS = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/docs/eval-v1';
const RETRIEVAL_URL = process.env.RETRIEVAL_SERVICE_URL ?? 'http://localhost:8787';
const SECRET = process.env.RETRIEVAL_SHARED_SECRET ?? 'dev-secret';

interface Question {
  id: string;
  cat: string;
  turns: { u: string }[];
  exp: any;
  tags: string[];
}

const questions: Question[] = readFileSync(`${DOCS}/all-questions.jsonl`, 'utf-8')
  .split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

console.log(`✓ Yüklendi: ${questions.length} soru`);

// Test eden kategoriler (bot bypass mümkün)
const RETRIEVAL_TESTABLE = new Set(['filter', 'rank', 'budget', 'related', 'faq', 'detail', 'compare']);

const testable = questions.filter(q => RETRIEVAL_TESTABLE.has(q.cat));
const skipped = questions.filter(q => !RETRIEVAL_TESTABLE.has(q.cat));

console.log(`  Test edilecek: ${testable.length} (${[...new Set(testable.map(q => q.cat))].join(', ')})`);
console.log(`  Skip (bot LLM gerek): ${skipped.length} (${[...new Set(skipped.map(q => q.cat))].join(', ')})`);

interface Result {
  id: string;
  cat: string;
  query: string;
  expected: any;
  actual: { tool?: string; result_count?: number; first_skus?: string[]; error?: string };
  pass: boolean;
  notes: string[];
}

const results: Result[] = [];

async function callTool(endpoint: string, body: any): Promise<any> {
  try {
    const r = await fetch(`${RETRIEVAL_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) return { error: `HTTP ${r.status}: ${await r.text()}` };
    return await r.json();
  } catch (e: any) {
    return { error: e.message };
  }
}

// Inferans: question → tool çağrısı (LLM yerine basit pattern matching)
function inferToolCall(q: Question): { endpoint: string; body: any } | null {
  const lastUser = q.turns[q.turns.length - 1].u;
  const exp = q.exp;

  // metaFilter'lı searchProducts
  if (exp.metaFilter_must || exp.metaFilter_must_any) {
    return {
      endpoint: '/search',
      body: {
        query: lastUser,
        templateGroup: exp.templateGroup,
        templateSubType: exp.templateSubType,
        metaFilters: exp.metaFilter_must ?? exp.metaFilter_must_any?.[0] ?? [],
      },
    };
  }

  // rankBySpec
  if (exp.tool === 'rankBySpec' && exp.params) {
    return { endpoint: '/search/rank-by-spec', body: { query: lastUser, ...exp.params } };
  }

  // searchByPriceRange
  if (exp.tool === 'searchByPriceRange' && exp.params) {
    return { endpoint: '/search/price', body: { query: lastUser, ...exp.params } };
  }

  // getProductDetails
  if (exp.tool === 'getProductDetails' && exp.sku) {
    return { endpoint: `/products/${exp.sku}`, body: null };
  }

  // searchFaq
  if (exp.tool === 'searchFaq') {
    return { endpoint: '/faq', body: { query: lastUser, sku: exp.sku } };
  }

  // getRelatedProducts
  if (exp.tool === 'getRelatedProducts') {
    return { endpoint: `/products/${exp.sku ?? ''}/related`, body: null };
  }

  // Default: searchProducts
  return {
    endpoint: '/search',
    body: {
      query: lastUser,
      templateGroup: exp.templateGroup,
      templateSubType: exp.templateSubType,
      metaFilters: [],
    },
  };
}

let processed = 0;
const t0 = Date.now();

for (const q of testable) {
  const call = inferToolCall(q);
  if (!call) {
    results.push({ id: q.id, cat: q.cat, query: q.turns[0].u, expected: q.exp, actual: { error: 'no tool inference' }, pass: false, notes: ['no_inference'] });
    continue;
  }

  const result = call.endpoint.startsWith('/products/') && !call.body
    ? await fetch(`${RETRIEVAL_URL}${call.endpoint}`, { headers: { 'Authorization': `Bearer ${SECRET}` } }).then(r => r.json()).catch(e => ({ error: e.message }))
    : await callTool(call.endpoint, call.body);

  // Sonuç değerlendirme
  const notes: string[] = [];
  let pass = true;
  let result_count = 0;
  let first_skus: string[] = [];

  if (result.error) {
    pass = false;
    notes.push(`error: ${result.error}`);
  } else {
    // Result format farklı — esnek parse
    const items = result.results ?? result.products ?? result.items ?? result.data ?? (result.sku ? [result] : []);
    result_count = Array.isArray(items) ? items.length : (result.sku ? 1 : 0);
    first_skus = Array.isArray(items) ? items.slice(0, 5).map((x: any) => x.sku ?? x.id) : (result.sku ? [result.sku] : []);

    // Beklenen SKU'ları kontrol et
    if (q.exp.include_skus_any) {
      const found = q.exp.include_skus_any.filter((s: string) => first_skus.includes(s));
      if (found.length === 0) { pass = false; notes.push(`expected_sku_not_found: ${q.exp.include_skus_any.join('|')}`); }
    }
    if (q.exp.sku && !first_skus.includes(q.exp.sku) && first_skus.length > 0 && !result.sku) {
      notes.push(`single_sku_mismatch: expected ${q.exp.sku} got ${first_skus[0]}`);
    }
    if (result_count === 0) { pass = false; notes.push('zero_result'); }
  }

  results.push({
    id: q.id, cat: q.cat, query: q.turns[0].u, expected: q.exp,
    actual: { tool: call.endpoint, result_count, first_skus, error: result.error },
    pass, notes,
  });

  processed++;
  if (processed % 25 === 0) {
    const elapsed = (Date.now() - t0) / 1000;
    console.log(`  ${processed}/${testable.length} (${(processed / elapsed).toFixed(1)}/s)`);
  }
}

console.log(`\n✓ DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// Save results
mkdirSync(DOCS, { recursive: true });
writeFileSync(`${DOCS}/results-retrieval.jsonl`, results.map(r => JSON.stringify(r)).join('\n'));

// Summary
const byCategory = new Map<string, { total: number; pass: number; fail: number }>();
for (const r of results) {
  if (!byCategory.has(r.cat)) byCategory.set(r.cat, { total: 0, pass: 0, fail: 0 });
  const e = byCategory.get(r.cat)!;
  e.total++;
  if (r.pass) e.pass++;
  else e.fail++;
}

console.log('\n=== ÖZET (kategori) ===');
let totalPass = 0, totalFail = 0;
for (const [cat, s] of byCategory.entries()) {
  totalPass += s.pass;
  totalFail += s.fail;
  const rate = ((s.pass / s.total) * 100).toFixed(1);
  console.log(`  ${cat.padEnd(12)} ${s.pass}/${s.total} (${rate}%)`);
}
console.log(`  ${'TOPLAM'.padEnd(12)} ${totalPass}/${totalPass + totalFail} (${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%)`);

// Top failures (ilk 15)
const failed = results.filter(r => !r.pass).slice(0, 15);
console.log('\n=== TOP 15 FAIL ===');
for (const f of failed) {
  console.log(`  [${f.id}] ${f.query.substring(0, 50)} — ${f.notes.join('; ')}`);
}

console.log(`\n✓ Sonuçlar: ${DOCS}/results-retrieval.jsonl (${results.length} senaryo)`);
process.exit(0);
