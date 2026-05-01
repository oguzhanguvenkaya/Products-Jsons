// Phase 1.1.11 Faz C.3 — Apply enrichment to DB
//
// İki mod:
//   bun run scripts/phase-1-1-11-apply-enrichment.ts          → audit only (default, DB'ye yazmaz)
//   bun run scripts/phase-1-1-11-apply-enrichment.ts --apply  → audit + transaction
//
// İşlemler:
//   - fill: jsonb_set(specs, '{key}', value, true)
//   - update: jsonb_set(specs, '{key}', value)
//   - skip: no-op (sadece bilgi)
//   - data_gap: no-op (sadece bilgi)
//   - category_mismatch: specs - 'key' (specs'ten kaldır) + product_meta DELETE
//
// Audit JSON: scripts/audit/_apply-audit.json
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const PROPOSALS_DIR = 'scripts/audit/proposals';
const APPLY = process.argv.includes('--apply');

interface Action {
  sku: string;
  type: 'fill' | 'update' | 'remove';
  key: string;
  value?: any; // fill/update için
  oldValue?: any; // update için
  evidence: string;
}

const files = readdirSync(PROPOSALS_DIR).filter((f) => f.endsWith('.json')).sort();
const actions: Action[] = [];

for (const f of files) {
  const sku = f.replace('.json', '');
  const p = JSON.parse(readFileSync(`${PROPOSALS_DIR}/${f}`, 'utf-8'));
  for (const x of p.proposed_changes.fill ?? []) {
    actions.push({ sku, type: 'fill', key: x.key, value: x.value, evidence: x.evidence });
  }
  for (const x of p.proposed_changes.update ?? []) {
    actions.push({
      sku, type: 'update', key: x.key, value: x.proposed, oldValue: x.current, evidence: x.evidence,
    });
  }
  for (const x of p.proposed_changes.category_mismatch ?? []) {
    actions.push({ sku, type: 'remove', key: x.key, evidence: x.reason });
  }
}

const stats = { fill: 0, update: 0, remove: 0 };
for (const a of actions) stats[a.type]++;

console.log(`Mode: ${APPLY ? '--apply (audit + DB write)' : 'audit only'}`);
console.log(`Toplam ${actions.length} action: ${stats.fill} fill, ${stats.update} update, ${stats.remove} remove`);

// Audit JSON
writeFileSync('scripts/audit/_apply-audit.json', JSON.stringify({ stats, actions }, null, 2));
console.log(`Audit yazıldı: scripts/audit/_apply-audit.json`);

if (!APPLY) {
  console.log(`\n--apply flag yok, DB'ye yazma yapılmadı. İncele ve --apply ile çalıştır.`);
  process.exit(0);
}

// SCHEMA NOT: products.specs JSONB kolonu. product_meta (sku, key, value_text, value_numeric, value_boolean).
// fill/update: products.specs[key] = value (jsonb_set, create_missing=true for fill)
// remove: products.specs - 'key' + DELETE FROM product_meta WHERE sku=? AND key=?
//   product_meta otomatik re-project ile yeniden üretilir; ama kategorize için SİL gerek.

console.log(`\n--apply: transaction başlıyor...`);

// SKU'ya göre grupla — her SKU için tek UPDATE specs query (multiple jsonb_set chain)
const bySku = new Map<string, Action[]>();
for (const a of actions) {
  if (!bySku.has(a.sku)) bySku.set(a.sku, []);
  bySku.get(a.sku)!.push(a);
}

let totalUpdates = 0;
let totalDeletes = 0;
let touchedSkus = 0;

await sql.begin(async (tx: any) => {
  for (const [sku, skuActions] of bySku) {
    let touched = false;

    // fill + update için: jsonb_set chain
    const fillUpdates = skuActions.filter((a) => a.type === 'fill' || a.type === 'update');
    const removes = skuActions.filter((a) => a.type === 'remove');

    if (fillUpdates.length > 0) {
      // Build dynamic JSONB merge
      // specs = jsonb_set(jsonb_set(COALESCE(specs,'{}'::jsonb), '{k1}', v1::jsonb, true), '{k2}', v2::jsonb, true) ...
      // Easier: read specs, mutate in JS, write back with single UPDATE
      const row = await tx`SELECT specs FROM products WHERE sku = ${sku}`;
      if (row.length === 0) {
        console.warn(`⚠️  SKU bulunamadı: ${sku} — atlandı`);
        continue;
      }
      const specs = row[0].specs ?? {};
      for (const a of fillUpdates) {
        specs[a.key] = a.value;
      }
      await tx`UPDATE products SET specs = ${specs}::jsonb WHERE sku = ${sku}`;
      totalUpdates += fillUpdates.length;
      touched = true;
    }

    if (removes.length > 0) {
      // specs key DELETE
      const row = await tx`SELECT specs FROM products WHERE sku = ${sku}`;
      if (row.length === 0) continue;
      const specs = row[0].specs ?? {};
      for (const a of removes) {
        delete specs[a.key];
      }
      await tx`UPDATE products SET specs = ${specs}::jsonb WHERE sku = ${sku}`;

      // product_meta'dan da SİL
      const removeKeys = removes.map((a) => a.key);
      await tx`DELETE FROM product_meta WHERE sku = ${sku} AND key = ANY(${removeKeys})`;
      totalDeletes += removes.length;
      touched = true;
    }

    if (touched) touchedSkus++;
  }

  console.log(`✓ Transaction OK: ${touchedSkus} SKU, ${totalUpdates} key güncellendi/eklendi, ${totalDeletes} key silindi`);
});

console.log(`\n✓ Faz C.3 tamamlandı. Sıradaki: bun run scripts/project-specs-to-meta.ts (re-project)`);
process.exit(0);
