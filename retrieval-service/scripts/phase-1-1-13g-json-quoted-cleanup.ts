// Phase 1.1.13G — JSON-quoted strip + range normalize + target_surface stale SİL
//
// Eval v1 batch 1 (DB-direct) tespit etti:
//   - product_type JSON-quoted (50 ürün) → bot 'machine'/'accessory' filter broken
//   - purpose JSON-quoted (26 ürün) → solid_compound heavy/medium/finish broken
//   - consumption_per_car_ml string range (5 ürün) → '30-50' numeric cast fail
//   - target_surface (singular, 54 ürün) → Phase 1.1.11 Faz D'de target_surfaces'a (plural) migrate edildi, stale specs key
//   - finish/form/skill_level/formulation JSON-quoted (~64 ürün) → hijyen
//
// İki mod:
//   bun run scripts/phase-1-1-13g-json-quoted-cleanup.ts          → audit
//   bun run scripts/phase-1-1-13g-json-quoted-cleanup.ts --apply  → audit + UPDATE

import { writeFileSync, mkdirSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');
mkdirSync('scripts/audit', { recursive: true });

// JSON-quoted strip hedef key'ler
const QUOTED_KEYS = ['product_type', 'purpose', 'finish', 'form', 'skill_level', 'formulation', 'secondary_use'];

// SİL hedef key'ler (stale)
const DELETE_KEYS = ['target_surface']; // singular, Phase 1.1.11 Faz D'de target_surfaces'a (plural) migrate edildi

console.log(`Mode: ${APPLY ? '--apply' : 'audit only'}\n`);

// === A. JSON-quoted strip ===
console.log('=== A. JSON-quoted strip ===');
const aChanges: { key: string; sku: string; before: string; after: string }[] = [];
for (const k of QUOTED_KEYS) {
  const r = await sql<any[]>`SELECT sku, specs->>${k} AS v FROM products WHERE specs->>${k} LIKE '"%'`;
  console.log(`  ${k.padEnd(30)} ${r.length} ürün`);
  for (const x of r as any[]) {
    let cleaned = x.v;
    try {
      const parsed = JSON.parse(x.v);
      if (typeof parsed === 'string') cleaned = parsed;
      else if (Array.isArray(parsed)) cleaned = parsed.join('|'); // Array için pipe-separated
    } catch { cleaned = x.v.replace(/^"|"$/g, ''); }
    aChanges.push({ key: k, sku: x.sku, before: x.v, after: cleaned });
  }
}

// === B. consumption_per_car_ml range normalize ===
console.log('\n=== B. consumption_per_car_ml range normalize ===');
const cons = await sql<any[]>`SELECT sku, specs->>'consumption_per_car_ml' AS v FROM products WHERE specs->>'consumption_per_car_ml' !~ '^[0-9.]+$' AND specs ? 'consumption_per_car_ml'`;
console.log(`  ${cons.length} ürün range/string`);
const bChanges: { sku: string; before: string; after: number }[] = [];
for (const x of cons as any[]) {
  const m = x.v.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  let val: number;
  if (m) val = (parseFloat(m[1]) + parseFloat(m[2])) / 2; // orta nokta
  else {
    const n = parseFloat(x.v);
    if (!isNaN(n)) val = n;
    else continue; // parse edilemez, skip
  }
  bChanges.push({ sku: x.sku, before: x.v, after: val });
  console.log(`    ${x.sku}: '${x.v}' → ${val}`);
}

// === C. target_surface (singular) SİL ===
console.log('\n=== C. target_surface (singular) stale SİL ===');
const ts = await sql<any[]>`SELECT sku FROM products WHERE specs ? 'target_surface'`;
console.log(`  ${ts.length} ürün`);
const cChanges = ts.map((x: any) => x.sku);

// === Audit ===
const audit = {
  stats: {
    json_quoted_changes: aChanges.length,
    consumption_normalized: bChanges.length,
    target_surface_deleted: cChanges.length,
    total: aChanges.length + bChanges.length + cChanges.length,
  },
  json_quoted: aChanges.slice(0, 50),
  consumption: bChanges,
  target_surface_skus: cChanges,
};

writeFileSync('scripts/audit/_phase-1-1-13g-audit.json', JSON.stringify(audit, null, 2));
console.log('\n✓ Audit JSON: scripts/audit/_phase-1-1-13g-audit.json');
console.log(`  Toplam aksiyon: ${audit.stats.total}`);

if (!APPLY) {
  console.log('\n--apply yok, DB güncellenmedi.');
  process.exit(0);
}

// === Apply (transaction) ===
console.log(`\n--apply: transaction başlıyor...`);

await sql.begin(async (tx: any) => {
  // A. JSON-quoted strip
  let nA = 0;
  for (const c of aChanges) {
    await tx`UPDATE products SET specs = jsonb_set(specs, ${[c.key]}, to_jsonb(${c.after}::text), true) WHERE sku = ${c.sku}`;
    nA++;
  }
  console.log(`  ✓ A. JSON-quoted strip: ${nA} update`);

  // B. consumption normalize
  let nB = 0;
  for (const c of bChanges) {
    await tx`UPDATE products SET specs = jsonb_set(specs, '{consumption_per_car_ml}', to_jsonb(${c.after}::numeric), true) WHERE sku = ${c.sku}`;
    nB++;
  }
  console.log(`  ✓ B. consumption normalize: ${nB} update`);

  // C. target_surface SİL
  let nC = 0;
  for (const sku of cChanges) {
    await tx`UPDATE products SET specs = specs - 'target_surface' WHERE sku = ${sku}`;
    nC++;
  }
  console.log(`  ✓ C. target_surface SİL: ${nC} update`);
});

// Verify
console.log('\n=== POST-APPLY VERIFY ===');
const v1 = await sql`SELECT COUNT(*) AS c FROM products WHERE specs->>'product_type' LIKE '"%'`;
console.log(`  product_type JSON-quoted: ${v1[0].c} (beklenen 0)`);
const v2 = await sql`SELECT COUNT(*) AS c FROM products WHERE specs->>'purpose' LIKE '"%'`;
console.log(`  purpose JSON-quoted: ${v2[0].c} (beklenen 0)`);
const v3 = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'target_surface'`;
console.log(`  target_surface (singular) kalan: ${v3[0].c} (beklenen 0)`);
const v4 = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'consumption_per_car_ml' AND jsonb_typeof(specs->'consumption_per_car_ml') <> 'number'`;
console.log(`  consumption_per_car_ml non-number: ${v4[0].c} (beklenen 0)`);

console.log('\n✓ Phase 1.1.13G tamamlandı.');
process.exit(0);
