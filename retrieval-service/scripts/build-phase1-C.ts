// Faz 1 — Aile C: pH (NULL-FIX'li versiyonlu)
// Canonical: ph_level + ph_tolerance
// Drop: ph (eski isim), ph_label (türetilebilir)
import { sql } from '../src/lib/db.ts';
import { writeFileSync } from 'fs';
import { makeDropChange, makeSetChange, type Change } from './build-phase1-helper.ts';

const rows = await sql<any[]>`
  SELECT sku,
    specs ? 'ph' AS has_ph,
    specs ? 'ph_level' AS has_ph_level,
    specs ? 'ph_label' AS has_ph_label,
    specs->>'ph' AS ph,
    specs->>'ph_level' AS ph_level,
    specs->>'ph_label' AS ph_label
  FROM products
  WHERE specs ?| array['ph','ph_level','ph_label']
  ORDER BY sku
`;
console.log(`✓ DB'den ${rows.length} ürün`);

const changes: Change[] = [];
for (const r of rows) {
  // Canonical ph_level set: mevcut ph_level > ph (rename)
  let phLevel: number|null = null;
  if (r.ph_level !== null && !isNaN(parseFloat(r.ph_level))) phLevel = parseFloat(r.ph_level);
  else if (r.ph !== null && !isNaN(parseFloat(r.ph))) phLevel = parseFloat(r.ph);

  if (phLevel !== null && (!r.has_ph_level || (r.ph_level !== null && parseFloat(r.ph_level) !== phLevel))) {
    changes.push(makeSetChange('C', r.sku, 'ph_level',
      r.has_ph_level ? (r.ph_level !== null ? parseFloat(r.ph_level) : null) : null,
      phLevel,
      `Phase 1C: ph_level=${phLevel} (canonical, ph eski isim → rename)`));
  }
  // ph eski adını drop (key var ise, değer ne olursa olsun)
  if (r.has_ph) {
    changes.push(makeDropChange('C', r.sku, 'ph',
      r.ph !== null ? (isNaN(parseFloat(r.ph)) ? r.ph : parseFloat(r.ph)) : null,
      `Phase 1C: alias ph drop (canonical ph_level)`));
  }
  // ph_label drop (key var ise, değer null bile olsa)
  if (r.has_ph_label) {
    changes.push(makeDropChange('C', r.sku, 'ph_label', r.ph_label,
      `Phase 1C: ph_label drop (türetilebilir: <6=asidik, 6-8=nötr, >8=alkali)`));
  }
}

writeFileSync('../data/consolidation/phase1-C-ph-payload.json', JSON.stringify({
  total_changes: changes.length, batch_count: 1, batches: [{ changes }],
}, null, 2));
console.log(`✓ ${changes.length} change yazıldı`);
process.exit(0);
