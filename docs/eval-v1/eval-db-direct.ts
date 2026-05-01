// Eval v1 — DB-direct validation (retrieval-service HTTP bypass)
//
// 270 sorudan testable kısmı (D/E/F/G/H/I/C — yaklaşık 165) DB sorguları ile
// cross-check eder. Bot LLM ve HTTP layer bypass — sadece veri katmanı validation.
//
// Çıktı: docs/eval-v1/results-db-direct.jsonl + summary console
//
// Kapsam:
// - D (filter): metaFilter sorgusu DB'de kaç ürün döner? Beklenen >0
// - E (rank): DB ORDER BY ile sample ilk 5 SKU
// - F (budget): price filter
// - G (compare): SKU varlığı
// - H (related): product_relations'ta var mı
// - I (FAQ): faq tablosunda match
// - C (detail): SKU var mı, specs alanları dolu mu

import { readFileSync, writeFileSync } from 'node:fs';
import { sql } from '../../retrieval-service/src/lib/db.ts';

const DOCS = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/docs/eval-v1';
interface Q { id: string; cat: string; turns: { u: string }[]; exp: any; tags: string[] }
const questions: Q[] = readFileSync(`${DOCS}/all-questions.jsonl`, 'utf-8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

const TESTABLE = new Set(['filter', 'rank', 'budget', 'compare', 'related', 'faq', 'detail']);

interface R {
  id: string; cat: string; query: string;
  pass: boolean; result_count?: number; sample_skus?: string[];
  notes: string[]; expected_summary?: string;
}
const results: R[] = [];

let processed = 0;
const t0 = Date.now();

for (const q of questions) {
  if (!TESTABLE.has(q.cat)) continue;
  const exp = q.exp;
  const r: R = { id: q.id, cat: q.cat, query: q.turns[0].u, pass: true, notes: [], expected_summary: '' };

  try {
    // ---- C (detail) ----
    if (q.cat === 'detail' && exp.sku) {
      const row = await sql`SELECT sku, name, specs FROM products WHERE sku=${exp.sku}`;
      r.result_count = row.length;
      if (row.length === 0) { r.pass = false; r.notes.push(`sku_not_found: ${exp.sku}`); }
      else { r.sample_skus = [exp.sku]; r.expected_summary = `getProductDetails(${exp.sku})`; }
    }
    else if (q.cat === 'detail' && !exp.sku) {
      // Generic ürün adı sorgusu — search_text'te match (FIX: sku ambiguous → ps.sku)
      const row = await sql<any[]>`SELECT ps.sku, p.name FROM product_search ps JOIN products p ON p.sku=ps.sku WHERE ps.search_text ILIKE ${'%' + q.turns[0].u.split(' ').slice(0,2).join('%') + '%'} LIMIT 5`;
      r.result_count = row.length;
      r.sample_skus = row.map(x => x.sku);
      if (row.length === 0) { r.pass = false; r.notes.push('search_text_no_match'); }
    }

    // ---- D (filter) ----
    else if (q.cat === 'filter') {
      const filters = exp.metaFilter_must ?? exp.metaFilter_must_any ?? [];
      let where = '';
      const params: any[] = [];

      // Build WHERE from metaFilter_must
      const conds: string[] = [];
      for (const f of (Array.isArray(filters) ? filters : [filters])) {
        if (!f.key) continue;
        if (f.op === 'eq') {
          if (typeof f.value === 'boolean') conds.push(`(specs->>'${f.key}')::boolean = ${f.value}`);
          else if (typeof f.value === 'number') conds.push(`(specs->>'${f.key}')::numeric = ${f.value}`);
          else conds.push(`specs->>'${f.key}' = '${String(f.value).replace(/'/g, "''")}'`);
        } else if (f.op === 'gte') conds.push(`(specs->>'${f.key}')::numeric >= ${f.value}`);
        else if (f.op === 'lte') conds.push(`(specs->>'${f.key}')::numeric <= ${f.value}`);
        else if (f.op === 'gt') conds.push(`(specs->>'${f.key}')::numeric > ${f.value}`);
        else if (f.op === 'lt') conds.push(`(specs->>'${f.key}')::numeric < ${f.value}`);
        else if (f.op === 'regex') conds.push(`specs->>'${f.key}' ILIKE '%${String(f.value).replace(/'/g, "''")}%'`);
      }
      if (exp.templateGroup) conds.push(`template_group = '${exp.templateGroup}'`);
      if (exp.templateSubType) conds.push(`template_sub_type = '${exp.templateSubType}'`);

      if (conds.length === 0) { r.pass = false; r.notes.push('no_filter_inferred'); }
      else {
        const sqlStr = `SELECT sku FROM products WHERE ${conds.join(' AND ')} LIMIT 5`;
        const row = await sql.unsafe(sqlStr);
        r.result_count = row.length;
        r.sample_skus = (row as any[]).map(x => x.sku);
        r.expected_summary = sqlStr.substring(0, 100);
        if (row.length === 0) { r.pass = false; r.notes.push('zero_result'); }
      }
    }

    // ---- E (rank) ----
    else if (q.cat === 'rank' && exp.params?.sortKey) {
      const dir = exp.params.direction === 'desc' ? 'DESC NULLS LAST' : 'ASC NULLS LAST';
      const grp = exp.params.templateGroup ?? null;
      const sub = exp.params.templateSubType ?? null;
      const limit = exp.params.limit ?? 5;
      const sk = exp.params.sortKey;
      // FIX: rating_* nested specs.ratings → product_meta'dan oku
      if (sk.startsWith('rating_')) {
        const conds: string[] = [`pm.key='${sk}'`, `pm.value_numeric IS NOT NULL`];
        if (grp) conds.push(`p.template_group='${grp}'`);
        if (sub) conds.push(`p.template_sub_type='${sub}'`);
        const sqlStr = `SELECT pm.sku, pm.value_numeric AS v FROM product_meta pm JOIN products p ON p.sku=pm.sku WHERE ${conds.join(' AND ')} ORDER BY v ${dir} LIMIT ${limit}`;
        const row = await sql.unsafe(sqlStr);
        r.result_count = row.length;
        r.sample_skus = (row as any[]).map(x => x.sku);
        r.expected_summary = `rank by ${sk} (product_meta) ${exp.params.direction}`;
        if (row.length === 0) { r.pass = false; r.notes.push('no_rank_results'); }
      } else {
        const conds: string[] = [`specs->>'${sk}' IS NOT NULL`, `specs->>'${sk}' ~ '^[0-9.]+$'`];
        if (grp) conds.push(`template_group='${grp}'`);
        if (sub) conds.push(`template_sub_type='${sub}'`);
        const sqlStr = `SELECT sku, (specs->>'${sk}')::numeric AS v FROM products WHERE ${conds.join(' AND ')} ORDER BY v ${dir} LIMIT ${limit}`;
        const row = await sql.unsafe(sqlStr);
        r.result_count = row.length;
        r.sample_skus = (row as any[]).map(x => x.sku);
        r.expected_summary = `rank by ${sk} ${exp.params.direction}`;
        if (row.length === 0) { r.pass = false; r.notes.push('no_rank_results'); }
      }
    }

    // ---- F (budget) ----
    else if (q.cat === 'budget' && exp.params) {
      const conds: string[] = ['price IS NOT NULL'];
      if (exp.params.templateGroup) conds.push(`template_group='${exp.params.templateGroup}'`);
      if (exp.params.templateSubType) conds.push(`template_sub_type='${exp.params.templateSubType}'`);
      if (exp.params.maxPrice) conds.push(`price <= ${exp.params.maxPrice}`);
      if (exp.params.minPrice) conds.push(`price >= ${exp.params.minPrice}`);
      const dir = exp.params.sortDirection === 'desc' ? 'DESC' : (exp.params.sortDirection === 'asc' ? 'ASC' : '');
      const order = dir ? `ORDER BY price ${dir}` : '';
      const sqlStr = `SELECT sku, price FROM products WHERE ${conds.join(' AND ')} ${order} LIMIT 5`;
      const row = await sql.unsafe(sqlStr);
      r.result_count = row.length;
      r.sample_skus = (row as any[]).map(x => x.sku);
      r.expected_summary = sqlStr.substring(0, 100);
      if (row.length === 0) { r.pass = false; r.notes.push('zero_budget_result'); }
    }

    // ---- G (compare) ----
    else if (q.cat === 'compare') {
      // SKU veya isim ile arama (FIX: SKU pattern direkt sku kolonu, isim ise name)
      const mentions = exp.must_mention_both ?? [];
      let foundCount = 0;
      for (const m of mentions) {
        const isSku = /^Q2[-M]/.test(m) || /^\d{5,}/.test(m);
        const row = isSku
          ? await sql<any[]>`SELECT sku FROM products WHERE sku=${m} OR ${m} = ANY(variant_skus) LIMIT 1`
          : await sql<any[]>`SELECT sku FROM products WHERE name ILIKE ${'%' + m + '%'} LIMIT 1`;
        if (row.length > 0) foundCount++;
      }
      r.result_count = foundCount;
      r.expected_summary = `compare ${mentions.join(' vs ')}`;
      if (foundCount < mentions.length) { r.pass = false; r.notes.push(`compare_skus_partial: ${foundCount}/${mentions.length}`); }
    }

    // ---- H (related) ----
    else if (q.cat === 'related') {
      const sku = exp.sku;
      if (sku) {
        const row = await sql<any[]>`SELECT related_sku, relation_type FROM product_relations WHERE sku=${sku} LIMIT 5`;
        r.result_count = row.length;
        r.sample_skus = row.map(x => x.related_sku);
        if (row.length === 0) { r.pass = false; r.notes.push('no_relations'); }
      } else {
        // Genel — sadece relation_type sayım
        const rt = exp.relation_type ?? 'use_with';
        const row = await sql<any[]>`SELECT COUNT(*) AS c FROM product_relations WHERE relation_type=${rt}`;
        r.result_count = Number(row[0].c);
        r.expected_summary = `total relations type=${rt}`;
      }
    }

    // ---- I (FAQ) ----
    else if (q.cat === 'faq') {
      // FIX: SKU varsa product_faqs.sku ile direkt sorgu
      if (exp.sku) {
        const row = await sql<any[]>`SELECT id, question FROM product_faqs WHERE sku=${exp.sku} LIMIT 3`;
        r.result_count = row.length;
        r.expected_summary = `faq for sku=${exp.sku}`;
        if (row.length === 0) { r.pass = false; r.notes.push(`faq_no_match_sku: ${exp.sku}`); }
      } else {
        // Generic — soru kelimesinden ilk 3 keyword (SKU pattern atla)
        const keywords = q.turns[0].u.split(' ').filter(w => w.length > 3 && !/^Q2|^\d{5,}/.test(w)).slice(0, 3);
        if (keywords.length === 0) { r.pass = false; r.notes.push('no_keywords'); }
        else {
          const row = await sql<any[]>`SELECT id, question FROM product_faqs WHERE question ILIKE ${'%' + keywords[0] + '%'} LIMIT 3`;
          r.result_count = row.length;
          r.expected_summary = `faq match keyword=${keywords[0]}`;
          if (row.length === 0) { r.pass = false; r.notes.push(`faq_no_match: ${keywords[0]}`); }
        }
      }
    }

    else { r.notes.push('cat_not_handled'); }
  } catch (e: any) {
    r.pass = false; r.notes.push(`error: ${e.message?.substring(0, 100)}`);
  }

  results.push(r);
  processed++;
  if (processed % 25 === 0) console.log(`  ${processed} işlendi (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

console.log(`\n✓ DB validation DONE — ${results.length} senaryo, ${((Date.now() - t0) / 1000).toFixed(1)}s`);

writeFileSync(`${DOCS}/results-db-direct.jsonl`, results.map(r => JSON.stringify(r)).join('\n'));

// Summary
const byCategory = new Map<string, { total: number; pass: number; fail: number }>();
for (const r of results) {
  if (!byCategory.has(r.cat)) byCategory.set(r.cat, { total: 0, pass: 0, fail: 0 });
  const e = byCategory.get(r.cat)!;
  e.total++; if (r.pass) e.pass++; else e.fail++;
}

console.log('\n=== ÖZET (kategori) ===');
let tP = 0, tF = 0;
for (const [c, s] of [...byCategory.entries()].sort()) {
  tP += s.pass; tF += s.fail;
  console.log(`  ${c.padEnd(10)} ${String(s.pass).padStart(3)}/${String(s.total).padStart(3)} (${((s.pass / s.total) * 100).toFixed(0).padStart(3)}%)  fail=${s.fail}`);
}
console.log(`  ${'TOPLAM'.padEnd(10)} ${String(tP).padStart(3)}/${String(tP + tF).padStart(3)} (${((tP / (tP + tF)) * 100).toFixed(1)}%)`);

// Top fails
const failed = results.filter(r => !r.pass);
console.log(`\n=== TOP ${Math.min(20, failed.length)} FAIL ===`);
for (const f of failed.slice(0, 20)) {
  console.log(`  [${f.id}] ${f.query.substring(0, 50).padEnd(50)} | ${f.notes.join('; ')}`);
}

console.log(`\n✓ Çıktı: ${DOCS}/results-db-direct.jsonl`);
process.exit(0);
