// Faz 1 — Aile F: Substrate / Compatibility / Target Surface (3 ayrı array)
// Canonical:
//   target_surface (string|string[]) — ürünün asıl yüzeyi (zaten var)
//   compatibility (string[]) — üzerine uygulanabilir mevcut katman (PPF, ceramic_coating)
//   substrate_safe (string[]) — zarar vermediği malzeme (aluminum, fiberglass, plexiglass)
// Migration:
//   safe_on_ceramic_coatings: true → compatibility: [...,"ceramic_coating"]
//   safe_on_ppf_wrap: true → compatibility: [...,"ppf"]
//   aluminum_safe/fiberglass_safe/plexiglass_safe: true → substrate_safe: [...,name]
import { sql } from '../src/lib/db.ts';
import { writeFileSync } from 'fs';
import { makeDropChange, makeSetChange, type Change } from './build-phase1-helper.ts';

const rows = await sql<any[]>`
  SELECT sku,
    specs ? 'compatibility' AS h_compat, specs->'compatibility' AS compat,
    specs ? 'substrate_safe' AS h_subsafe, specs->'substrate_safe' AS subsafe,
    specs ? 'safe_on_ceramic_coatings' AS h_sc, specs->>'safe_on_ceramic_coatings' AS sc,
    specs ? 'safe_on_ppf_wrap' AS h_sp, specs->>'safe_on_ppf_wrap' AS sp,
    specs ? 'aluminum_safe' AS h_alu, specs->>'aluminum_safe' AS alu,
    specs ? 'fiberglass_safe' AS h_fib, specs->>'fiberglass_safe' AS fib,
    specs ? 'plexiglass_safe' AS h_plex, specs->>'plexiglass_safe' AS plex
  FROM products
  WHERE specs ?| array['safe_on_ceramic_coatings','safe_on_ppf_wrap','aluminum_safe','fiberglass_safe','plexiglass_safe']
  ORDER BY sku
`;
console.log(`✓ DB'den ${rows.length} ürün`);

const changes: Change[] = [];

const isTrue = (v: any) => v === 'true' || v === true || v === 't' || v === '1';

for (const r of rows) {
  // === compatibility array oluştur (mevcut + yeni) ===
  const existingCompat: string[] = Array.isArray(r.compat) ? r.compat as string[] : [];
  const newCompat = new Set(existingCompat);
  if (isTrue(r.sc)) newCompat.add('ceramic_coating');
  if (isTrue(r.sp)) newCompat.add('ppf');

  if (newCompat.size > existingCompat.length) {
    changes.push(makeSetChange('F', r.sku, 'compatibility', existingCompat.length ? existingCompat : null, [...newCompat],
      `Phase 1F: compatibility=[${[...newCompat].join(',')}] (safe_on_X migrate)`));
  }

  // === substrate_safe array ===
  const existingSubSafe: string[] = Array.isArray(r.subsafe) ? r.subsafe as string[] : [];
  const newSubSafe = new Set(existingSubSafe);
  if (isTrue(r.alu)) newSubSafe.add('aluminum');
  if (isTrue(r.fib)) newSubSafe.add('fiberglass');
  if (isTrue(r.plex)) newSubSafe.add('plexiglass');

  if (newSubSafe.size > existingSubSafe.length) {
    changes.push(makeSetChange('F', r.sku, 'substrate_safe', existingSubSafe.length ? existingSubSafe : null, [...newSubSafe],
      `Phase 1F: substrate_safe=[${[...newSubSafe].join(',')}] (X_safe migrate)`));
  }

  // === Drops ===
  if (r.h_sc) changes.push(makeDropChange('F', r.sku, 'safe_on_ceramic_coatings', r.sc, `Phase 1F: migrated to compatibility[]`));
  if (r.h_sp) changes.push(makeDropChange('F', r.sku, 'safe_on_ppf_wrap', r.sp, `Phase 1F: migrated to compatibility[]`));
  if (r.h_alu) changes.push(makeDropChange('F', r.sku, 'aluminum_safe', r.alu, `Phase 1F: migrated to substrate_safe[]`));
  if (r.h_fib) changes.push(makeDropChange('F', r.sku, 'fiberglass_safe', r.fib, `Phase 1F: migrated to substrate_safe[]`));
  if (r.h_plex) changes.push(makeDropChange('F', r.sku, 'plexiglass_safe', r.plex, `Phase 1F: migrated to substrate_safe[]`));
}

writeFileSync('../data/consolidation/phase1-F-substrate-payload.json', JSON.stringify({
  total_changes: changes.length, batch_count: 1, batches: [{ changes }],
}, null, 2));
console.log(`✓ ${changes.length} change`);
process.exit(0);
