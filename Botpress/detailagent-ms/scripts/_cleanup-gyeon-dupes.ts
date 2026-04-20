/**
 * For every duplicate-question group in a Gyeon SKU, delete the OLD row(s)
 * and keep the NEW Gyeon Zendesk row.
 *
 * "NEW" identification: row.answer matches an answer in data/csv/gyeon_faqs.csv
 * for the same (sku, question). Anything else in that group is OLD → delete.
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'data', 'csv', 'gyeon_faqs.csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true }) as Record<string, string>[];
}

function normQ(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function normA(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

async function main() {
  const ours = readCsv(CSV_PATH).filter((r) => !r.sku.startsWith('_BRAND:'));

  // Build (sku, normQ) → expected new answer (normalized)
  const newMap = new Map<string, string>();
  for (const r of ours) {
    newMap.set(`${r.sku}::${normQ(r.question)}`, normA(r.answer));
  }
  console.log(`Loaded ${newMap.size} (sku, question) → expected-new-answer entries`);

  const skus = [...new Set(ours.map((r) => r.sku))];

  // Pull all FAQs for these SKUs
  const skuRows = new Map<string, Array<{ id: string; question: string; answer: string }>>();
  const BATCH = 30;
  for (let i = 0; i < skus.length; i += BATCH) {
    const batch = skus.slice(i, i + BATCH);
    const r: any = await client.findTableRows({
      table: 'productFaqTable',
      filter: { sku: { $in: batch } } as any,
      limit: 1000,
    });
    for (const row of r.rows) {
      const list = skuRows.get(row.sku) || [];
      list.push({ id: row.id, question: row.question, answer: row.answer });
      skuRows.set(row.sku, list);
    }
  }

  // Find dupe groups + classify
  type Decision = { sku: string; question: string; keepId: string; deleteIds: string[]; debug: any[] };
  const decisions: Decision[] = [];

  for (const [sku, faqs] of skuRows) {
    const buckets = new Map<string, typeof faqs>();
    for (const f of faqs) {
      const key = normQ(f.question);
      const arr = buckets.get(key) || [];
      arr.push(f);
      buckets.set(key, arr);
    }
    for (const [qkey, group] of buckets) {
      if (group.length < 2) continue;
      const expected = newMap.get(`${sku}::${qkey}`);
      let keep: typeof group[number] | null = null;
      const debug: any[] = [];
      for (const r of group) {
        const matches = expected ? normA(r.answer) === expected : false;
        debug.push({ id: r.id, matches, ansHead: r.answer.slice(0, 80) });
        if (!keep && matches) keep = r;
      }
      if (!keep) {
        // No row matches our CSV — keep newest (longest answer as proxy)
        keep = group.slice().sort((a, b) => b.answer.length - a.answer.length)[0];
      }
      const deleteIds = group.filter((r) => r.id !== keep!.id).map((r) => r.id);
      decisions.push({ sku, question: group[0].question, keepId: keep.id, deleteIds, debug });
    }
  }

  let totalDel = 0;
  for (const d of decisions) totalDel += d.deleteIds.length;
  console.log(`\n${decisions.length} duplicate groups found, total ${totalDel} rows to delete\n`);

  // Show what will happen
  console.log('--- Decision preview (first 20) ---\n');
  for (const d of decisions.slice(0, 20)) {
    console.log(`${d.sku} :: "${d.question}"`);
    console.log(`  KEEP: ${String(d.keepId).slice(-8)}`);
    for (const r of d.debug) {
      const tag = r.id === d.keepId ? '✓ KEEP' : '✗ DELETE';
      console.log(`    ${tag}  [${String(r.id).slice(-8)}] (matchesNew=${r.matches}) ${r.ansHead}`);
    }
    console.log();
  }

  // Execute deletes
  const allDelIds = decisions.flatMap((d) => d.deleteIds);
  console.log(`\n• Deleting ${allDelIds.length} rows in batches of 25...`);
  let deleted = 0;
  for (let i = 0; i < allDelIds.length; i += 25) {
    const batch = allDelIds.slice(i, i + 25);
    await (client as any).deleteTableRows({ table: 'productFaqTable', ids: batch });
    deleted += batch.length;
  }
  console.log(`  ✓ deleted: ${deleted}`);

  console.log('\n✅ Cleanup complete');
}

main().catch((e) => { console.error(e); process.exit(1); });
