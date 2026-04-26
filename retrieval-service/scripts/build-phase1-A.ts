// Faz 1 — Aile A: Volume/Capacity (NULL-FIX'li)
// volume_ml (içerik), capacity_ml (sprayer tank), capacity_usable_ml (opsiyonel)
// kg → ml 1:1 (kullanıcı kararı), liters × 1000
import { sql } from '../src/lib/db.ts';
import { writeFileSync } from 'fs';
import { makeDropChange, makeSetChange, type Change } from './build-phase1-helper.ts';

const rows = await sql<any[]>`
  SELECT sku, template_group,
    specs ? 'volume_ml' AS h_volume_ml,
    specs ? 'volume_liters' AS h_volume_liters,
    specs ? 'volume_kg' AS h_volume_kg,
    specs ? 'capacity_ml' AS h_capacity_ml,
    specs ? 'capacity_liters' AS h_capacity_liters,
    specs ? 'capacity_total_lt' AS h_capacity_total_lt,
    specs ? 'capacity_usable_lt' AS h_capacity_usable_lt,
    specs->>'volume_ml' AS volume_ml,
    specs->>'volume_liters' AS volume_liters,
    specs->>'volume_kg' AS volume_kg,
    specs->>'capacity_ml' AS capacity_ml,
    specs->>'capacity_liters' AS capacity_liters,
    specs->>'capacity_total_lt' AS capacity_total_lt,
    specs->>'capacity_usable_lt' AS capacity_usable_lt
  FROM products
  WHERE specs ?| array['volume_ml','volume_liters','volume_kg','capacity_ml','capacity_liters','capacity_total_lt','capacity_usable_lt']
  ORDER BY sku
`;
console.log(`✓ DB'den ${rows.length} ürün`);

const changes: Change[] = [];
const fnum = (v: any) => v !== null && !isNaN(parseFloat(v)) ? parseFloat(v) : null;

for (const r of rows) {
  // === volume_ml hesapla ===
  let volMl: number|null = null, volSrc = '';
  if (fnum(r.volume_ml) !== null) { volMl = Math.round(fnum(r.volume_ml)!); volSrc = 'volume_ml'; }
  else if (fnum(r.volume_liters) !== null) { volMl = Math.round(fnum(r.volume_liters)! * 1000); volSrc = `volume_liters=${r.volume_liters}×1000`; }
  else if (fnum(r.volume_kg) !== null) { volMl = Math.round(fnum(r.volume_kg)! * 1000); volSrc = `volume_kg=${r.volume_kg}×1000 (1:1)`; }

  if (volMl !== null && (!r.h_volume_ml || fnum(r.volume_ml) !== volMl)) {
    changes.push(makeSetChange('A', r.sku, 'volume_ml', fnum(r.volume_ml), volMl,
      `Phase 1A: volume_ml=${volMl} (${volSrc})`));
  }
  // Aliases drop (key VARSA)
  if (r.h_volume_liters) changes.push(makeDropChange('A', r.sku, 'volume_liters', fnum(r.volume_liters), `Phase 1A: alias drop (canonical volume_ml)`));
  if (r.h_volume_kg) changes.push(makeDropChange('A', r.sku, 'volume_kg', fnum(r.volume_kg), `Phase 1A: alias drop (canonical volume_ml)`));

  // === capacity_ml ===
  let capMl: number|null = null, capSrc = '';
  if (fnum(r.capacity_ml) !== null) { capMl = Math.round(fnum(r.capacity_ml)!); capSrc = 'capacity_ml'; }
  else if (fnum(r.capacity_liters) !== null) { capMl = Math.round(fnum(r.capacity_liters)! * 1000); capSrc = `capacity_liters×1000`; }
  else if (fnum(r.capacity_total_lt) !== null) { capMl = Math.round(fnum(r.capacity_total_lt)! * 1000); capSrc = `capacity_total_lt×1000`; }

  if (capMl !== null && (!r.h_capacity_ml || fnum(r.capacity_ml) !== capMl)) {
    changes.push(makeSetChange('A', r.sku, 'capacity_ml', fnum(r.capacity_ml), capMl, `Phase 1A: capacity_ml=${capMl} (${capSrc})`));
  }
  if (r.h_capacity_liters) changes.push(makeDropChange('A', r.sku, 'capacity_liters', fnum(r.capacity_liters), `Phase 1A: alias drop (canonical capacity_ml)`));
  if (r.h_capacity_total_lt) changes.push(makeDropChange('A', r.sku, 'capacity_total_lt', fnum(r.capacity_total_lt), `Phase 1A: alias drop (canonical capacity_ml)`));

  // === capacity_usable_ml ===
  if (fnum(r.capacity_usable_lt) !== null) {
    const usableMl = Math.round(fnum(r.capacity_usable_lt)! * 1000);
    changes.push(makeSetChange('A', r.sku, 'capacity_usable_ml', null, usableMl, `Phase 1A: capacity_usable_ml=${usableMl}`));
  }
  if (r.h_capacity_usable_lt) changes.push(makeDropChange('A', r.sku, 'capacity_usable_lt', fnum(r.capacity_usable_lt), `Phase 1A: alias drop (canonical capacity_usable_ml)`));
}

writeFileSync('../data/consolidation/phase1-A-volume-capacity-payload.json', JSON.stringify({
  total_changes: changes.length, batch_count: 1, batches: [{ changes }],
}, null, 2));
console.log(`✓ ${changes.length} change yazıldı`);
process.exit(0);
