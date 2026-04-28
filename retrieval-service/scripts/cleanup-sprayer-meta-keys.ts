// Phase 1.1.4 — sprayers_bottles meta key temizliği.
//
// (A) HEPSİ NULL key'ler: nozzle_types, pressure_relief_valve, spare_seals_included → spec'ten sil.
// (B) DUPLICATE semantic: weight_net_kg/weight_net_g → weight_g, capacity_lt/usable_capacity_liters
//     → capacity_ml/capacity_usable_ml, pressure_bar → max_pressure_bar, flow_rate (string) → flow_rate_lpm.
// (C) product_meta orphan DELETE — Phase 1.1.2 pattern.
//
// Modes: --dry-run | --commit
import { sql } from '../src/lib/db.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const args = new Set(process.argv.slice(2));
const MODE_DRY = args.has('--dry-run');
const MODE_COMMIT = args.has('--commit');
if ([MODE_DRY, MODE_COMMIT].filter(Boolean).length !== 1) {
  console.error('Usage: bun scripts/cleanup-sprayer-meta-keys.ts <--dry-run | --commit>');
  process.exit(1);
}

const REPO_ROOT = join(import.meta.dir, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'consolidation');
mkdirSync(OUT_DIR, { recursive: true });
const AUDIT_PATH = join(OUT_DIR, 'phase1.1.4-sprayer-cleanup-audit.json');

console.log(`✓ Mode: ${MODE_DRY ? 'dry-run' : 'commit'}`);

// ─────────────────────────────────────────────────────────────────
// Pre-state snapshot
// ─────────────────────────────────────────────────────────────────

type Row = {
  sku: string;
  name: string;
  template_sub_type: string | null;
  weight_net_kg: string | null;
  weight_net_g: string | null;
  weight_g: string | null;
  capacity_ml: string | null;
  capacity_lt: string | null;
  capacity_usable_ml: string | null;
  usable_capacity_liters: string | null;
  pressure_bar: string | null;
  max_pressure_bar: string | null;
  flow_rate_str: string | null;
  flow_rate_lpm: string | null;
  has_nozzle_types: boolean;
  has_pressure_relief_valve: boolean;
  has_spare_seals_included: boolean;
};

const rows = (await sql.unsafe(`
  SELECT
    sku, name, template_sub_type,
    specs->>'weight_net_kg' AS weight_net_kg,
    specs->>'weight_net_g' AS weight_net_g,
    specs->>'weight_g' AS weight_g,
    specs->>'capacity_ml' AS capacity_ml,
    specs->>'capacity_lt' AS capacity_lt,
    specs->>'capacity_usable_ml' AS capacity_usable_ml,
    specs->>'usable_capacity_liters' AS usable_capacity_liters,
    specs->>'pressure_bar' AS pressure_bar,
    specs->>'max_pressure_bar' AS max_pressure_bar,
    specs->>'flow_rate' AS flow_rate_str,
    specs->>'flow_rate_lpm' AS flow_rate_lpm,
    specs ? 'nozzle_types' AS has_nozzle_types,
    specs ? 'pressure_relief_valve' AS has_pressure_relief_valve,
    specs ? 'spare_seals_included' AS has_spare_seals_included
  FROM products
  WHERE template_group = 'sprayers_bottles'
  ORDER BY template_sub_type NULLS FIRST, sku
`)) as unknown as Row[];

console.log(`✓ ${rows.length} sprayer SKU yüklendi`);

// ─────────────────────────────────────────────────────────────────
// Plan: A (NULL sil) + B (canonicalize)
// ─────────────────────────────────────────────────────────────────

type Transform = {
  sku: string;
  name: string;
  changes: Array<{
    type: 'A_null_remove' | 'B1_weight' | 'B2_capacity' | 'B2_usable' | 'B3_pressure' | 'B4_flow';
    removedKeys: string[];
    setKey?: string;
    setValue?: number;
    sourceValue?: unknown;
  }>;
};

function parseNum(v: string | null): number | null {
  if (v === null || v === undefined || v === 'null') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const transforms: Transform[] = [];
for (const r of rows) {
  const t: Transform = { sku: r.sku, name: r.name, changes: [] };

  // A) NULL key'ler — varsa sil
  const aRemove: string[] = [];
  if (r.has_nozzle_types) aRemove.push('nozzle_types');
  if (r.has_pressure_relief_valve) aRemove.push('pressure_relief_valve');
  if (r.has_spare_seals_included) aRemove.push('spare_seals_included');
  if (aRemove.length > 0) {
    t.changes.push({ type: 'A_null_remove', removedKeys: aRemove });
  }

  // B1) Ağırlık → weight_g
  // Önce kaynak: weight_net_kg ×1000, sonra weight_net_g, sonra weight_g (zaten varsa dokunma)
  let newWeightG: number | null = null;
  let weightSource: { key: string; value: unknown } | null = null;
  const wnk = parseNum(r.weight_net_kg);
  const wng = parseNum(r.weight_net_g);
  const wg = parseNum(r.weight_g);
  if (wnk !== null) {
    newWeightG = Math.round(wnk * 1000);
    weightSource = { key: 'weight_net_kg', value: r.weight_net_kg };
  } else if (wng !== null && wg === null) {
    newWeightG = Math.round(wng);
    weightSource = { key: 'weight_net_g', value: r.weight_net_g };
  }
  // Drop legacy keys regardless of value (key var ama null ise kaldır)
  const b1Drop: string[] = [];
  if (r.weight_net_kg !== null || r.weight_net_kg === null) {
    // check key existence via sql (we already SELECT'ed, null vs missing not distinguishable here)
    // Drop them safely — `specs - 'X'` no-op if not present
  }
  // Listede her zaman dene; SQL `-` operatörü key yoksa no-op
  b1Drop.push('weight_net_kg', 'weight_net_g');
  if (newWeightG !== null) {
    t.changes.push({
      type: 'B1_weight',
      removedKeys: b1Drop,
      setKey: 'weight_g',
      setValue: newWeightG,
      sourceValue: weightSource,
    });
  } else if (wnk === null && wng === null) {
    // weight_g zaten varsa sadece kaldır legacy keys, set yok
    if (r.weight_net_kg !== null || r.weight_net_g !== null) {
      t.changes.push({ type: 'B1_weight', removedKeys: b1Drop });
    }
  }

  // B2) capacity_lt → capacity_ml
  const clt = parseNum(r.capacity_lt);
  if (clt !== null) {
    t.changes.push({
      type: 'B2_capacity',
      removedKeys: ['capacity_lt'],
      setKey: 'capacity_ml',
      setValue: Math.round(clt * 1000),
      sourceValue: r.capacity_lt,
    });
  }

  // B2) usable_capacity_liters → capacity_usable_ml
  const ucl = parseNum(r.usable_capacity_liters);
  if (ucl !== null) {
    t.changes.push({
      type: 'B2_usable',
      removedKeys: ['usable_capacity_liters'],
      setKey: 'capacity_usable_ml',
      setValue: Math.round(ucl * 1000),
      sourceValue: r.usable_capacity_liters,
    });
  }

  // B3) pressure_bar → max_pressure_bar
  const pb = parseNum(r.pressure_bar);
  if (pb !== null) {
    t.changes.push({
      type: 'B3_pressure',
      removedKeys: ['pressure_bar'],
      setKey: 'max_pressure_bar',
      setValue: pb,
      sourceValue: r.pressure_bar,
    });
  }

  // B4) flow_rate (string) → flow_rate_lpm
  if (r.flow_rate_str) {
    // Parse "0.50 l/dk" → 0.5
    const m = r.flow_rate_str.match(/(\d+(?:[.,]\d+)?)/);
    const num = m ? parseNum(m[1]) : null;
    if (num !== null) {
      t.changes.push({
        type: 'B4_flow',
        removedKeys: ['flow_rate'],
        setKey: 'flow_rate_lpm',
        setValue: num,
        sourceValue: r.flow_rate_str,
      });
    }
  }

  if (t.changes.length > 0) transforms.push(t);
}

// Summary
const summary = {
  totalSprayers: rows.length,
  affected: transforms.length,
  byType: {
    A_null_remove: transforms.filter((t) => t.changes.some((c) => c.type === 'A_null_remove')).length,
    B1_weight: transforms.filter((t) => t.changes.some((c) => c.type === 'B1_weight')).length,
    B2_capacity: transforms.filter((t) => t.changes.some((c) => c.type === 'B2_capacity')).length,
    B2_usable: transforms.filter((t) => t.changes.some((c) => c.type === 'B2_usable')).length,
    B3_pressure: transforms.filter((t) => t.changes.some((c) => c.type === 'B3_pressure')).length,
    B4_flow: transforms.filter((t) => t.changes.some((c) => c.type === 'B4_flow')).length,
  },
};

const audit = { generatedAt: new Date().toISOString(), mode: MODE_DRY ? 'dry-run' : 'commit', summary, transforms };
writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2), 'utf8');
console.log(`✓ Audit: ${AUDIT_PATH}`);
console.log(`  affected SKU=${summary.affected}, byType=${JSON.stringify(summary.byType)}`);

if (MODE_DRY) {
  console.log('\n✓ DRY-RUN tamamlandı. DB değişmedi.');
  await sql.end();
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────
// COMMIT
// ─────────────────────────────────────────────────────────────────

console.log('\n✓ COMMIT mode — DB UPDATE başlıyor...');

let updates = 0;

// A) NULL key'leri toplu sil — tüm sprayer SKU'larında
const aResult = await sql`
  UPDATE products
  SET specs = specs - 'nozzle_types' - 'pressure_relief_valve' - 'spare_seals_included'
  WHERE template_group = 'sprayers_bottles'
  RETURNING sku
`;
console.log(`  ✓ A) NULL key sil: ${aResult.length} sprayer SKU güncellendi`);

// A2) Legacy weight key'leri (weight_net_kg/g) — value-null olanlar dahil toplu sil.
// Bu key'ler artık `weight_g` canonical'a taşındı; geride kalan null-value entry'ler
// idempotency için temizleniyor.
const a2Result = await sql`
  UPDATE products
  SET specs = specs - 'weight_net_kg' - 'weight_net_g'
  WHERE template_group = 'sprayers_bottles'
    AND (specs ? 'weight_net_kg' OR specs ? 'weight_net_g')
  RETURNING sku
`;
console.log(`  ✓ A2) Legacy weight key bulk-drop: ${a2Result.length} SKU`);

// B) Per-SKU canonicalize transformations
for (const t of transforms) {
  for (const c of t.changes) {
    if (c.type === 'A_null_remove') continue; // zaten yapıldı
    if (c.setKey !== undefined && c.setValue !== undefined) {
      const removeKeys = c.removedKeys.map((k) => sql`- ${k}`);
      // Build: specs - 'k1' - 'k2' || jsonb_build_object('setKey', $setValue::numeric)
      // postgres-js doesn't compose `-` operators with template literals safely; use unsafe
      const skuRemoveSQL = c.removedKeys.map((k) => `- '${k.replace(/'/g, "''")}'`).join(' ');
      await sql.unsafe(`
        UPDATE products
        SET specs = (specs ${skuRemoveSQL}) || jsonb_build_object('${c.setKey}', $1::numeric)
        WHERE sku = $2
      `, [c.setValue, t.sku]);
    } else {
      // sadece sil
      const skuRemoveSQL = c.removedKeys.map((k) => `- '${k.replace(/'/g, "''")}'`).join(' ');
      await sql.unsafe(`
        UPDATE products
        SET specs = specs ${skuRemoveSQL}
        WHERE sku = $1
      `, [t.sku]);
    }
    updates++;
  }
}
console.log(`  ✓ B) Canonicalize: ${updates} transformasyon`);

// C) product_meta orphan DELETE
const orphanResult = await sql`
  DELETE FROM product_meta
  WHERE key IN (
    'weight_net_kg', 'weight_net_g',
    'capacity_lt', 'usable_capacity_liters',
    'pressure_bar', 'flow_rate',
    'nozzle_types', 'pressure_relief_valve', 'spare_seals_included'
  )
  RETURNING sku, key
`;
console.log(`  ✓ C) product_meta orphan DELETE: ${orphanResult.length} satır`);

// Verify
const verify = (await sql.unsafe(`
  SELECT
    COUNT(*) FILTER (WHERE specs ? 'nozzle_types')::int AS nt,
    COUNT(*) FILTER (WHERE specs ? 'pressure_relief_valve')::int AS prv,
    COUNT(*) FILTER (WHERE specs ? 'spare_seals_included')::int AS ssi,
    COUNT(*) FILTER (WHERE specs ? 'weight_net_kg')::int AS wnk,
    COUNT(*) FILTER (WHERE specs ? 'weight_net_g')::int AS wng,
    COUNT(*) FILTER (WHERE specs ? 'weight_g' AND specs->>'weight_g' IS NOT NULL)::int AS wg,
    COUNT(*) FILTER (WHERE specs ? 'capacity_lt')::int AS clt,
    COUNT(*) FILTER (WHERE specs ? 'usable_capacity_liters')::int AS ucl,
    COUNT(*) FILTER (WHERE specs ? 'pressure_bar')::int AS pb,
    COUNT(*) FILTER (WHERE specs ? 'flow_rate')::int AS fr_str
  FROM products WHERE template_group = 'sprayers_bottles'
`)) as any[];
console.log(`✓ Verify: ${JSON.stringify(verify[0])}`);

await sql.end();
