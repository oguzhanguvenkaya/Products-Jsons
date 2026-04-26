// Faz 1 — Aile B: Durability
// Canonical: durability_months + durability_km
// Drop: durability_label, durability_weeks, durability_days, durability_washes
// Migration: weeks/4.33, days/30, washes (Q2-TYA500M özel: durability_km=1000)
import { sql } from '../src/lib/db.ts';
import { writeFileSync } from 'fs';
import { makeDropChange, makeSetChange, type Change } from './build-phase1-helper.ts';

const rows = await sql<any[]>`
  SELECT sku,
    specs ? 'durability_months' AS h_months, specs->>'durability_months' AS months,
    specs ? 'durability_days' AS h_days, specs->>'durability_days' AS days,
    specs ? 'durability_weeks' AS h_weeks, specs->>'durability_weeks' AS weeks,
    specs ? 'durability_washes' AS h_washes, specs->>'durability_washes' AS washes,
    specs ? 'durability_km' AS h_km, specs->>'durability_km' AS km,
    specs ? 'durability_label' AS h_label, specs->>'durability_label' AS label
  FROM products
  WHERE specs ?| array['durability_months','durability_days','durability_weeks','durability_washes','durability_km','durability_label']
  ORDER BY sku
`;
console.log(`✓ DB'den ${rows.length} ürün`);

const fnum = (v: any) => v !== null && !isNaN(parseFloat(v)) ? parseFloat(v) : null;
const changes: Change[] = [];

for (const r of rows) {
  // === durability_months ===
  let months: number|null = null, src = '';
  if (fnum(r.months) !== null) { months = Math.round(fnum(r.months)!); src = 'months'; }
  else if (fnum(r.weeks) !== null) { months = Math.round(fnum(r.weeks)! / 4 * 10) / 10; src = `weeks/4`; }
  else if (fnum(r.days) !== null) { months = Math.round(fnum(r.days)! / 30 * 10) / 10; src = `days/30`; }

  if (months !== null && (!r.h_months || fnum(r.months) !== months)) {
    changes.push(makeSetChange('B', r.sku, 'durability_months', fnum(r.months), months, `Phase 1B: durability_months=${months} (${src})`));
  }

  // === durability_km — Q2-TYA500M özel: washes değil km kullanılacak ===
  if (r.sku === 'Q2-TYA500M' && r.h_washes) {
    changes.push(makeSetChange('B', r.sku, 'durability_km', null, 1000, `Phase 1B: Q2-TYA500M durability_km=1000 (kullanıcı kararı, washes→km)`));
  }

  // === Drop aliases ===
  if (r.h_days) changes.push(makeDropChange('B', r.sku, 'durability_days', fnum(r.days), `Phase 1B: alias drop (canonical durability_months)`));
  if (r.h_weeks) changes.push(makeDropChange('B', r.sku, 'durability_weeks', fnum(r.weeks), `Phase 1B: alias drop (canonical durability_months)`));
  if (r.h_washes) changes.push(makeDropChange('B', r.sku, 'durability_washes', r.washes, `Phase 1B: alias drop`));
  if (r.h_label) changes.push(makeDropChange('B', r.sku, 'durability_label', r.label, `Phase 1B: durability_label drop (numerik durability_months yeterli)`));
}

writeFileSync('../data/consolidation/phase1-B-durability-payload.json', JSON.stringify({
  total_changes: changes.length, batch_count: 1, batches: [{ changes }],
}, null, 2));
console.log(`✓ ${changes.length} change`);
process.exit(0);
