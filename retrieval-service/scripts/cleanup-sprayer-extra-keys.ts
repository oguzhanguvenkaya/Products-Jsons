// Phase 1.1.5 — sprayers_bottles ek meta key temizliği (user-direktif).
//
// 7 key sprayer'lardan tamamen siliniyor:
//   weight_g, compatible_device, continuous_spray_lock,
//   hose_length_m, flow_rate_lpm, gun_length_cm, kit_contents
//
// Not: weight_g rankBySpec enum'unda + SCALAR_KEYS'te → product_meta'da
// projection ediliyor. Sprayer SKU'larındaki weight_g satırları orphan
// DELETE ile temizlenmeli (fragrance/vent_clip vb. başka kategorilerdeki
// weight_g satırları KORUNUYOR).
//
// Modes: --dry-run | --commit
import { sql } from '../src/lib/db.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const args = new Set(process.argv.slice(2));
const MODE_DRY = args.has('--dry-run');
const MODE_COMMIT = args.has('--commit');
if ([MODE_DRY, MODE_COMMIT].filter(Boolean).length !== 1) {
  console.error('Usage: bun scripts/cleanup-sprayer-extra-keys.ts <--dry-run | --commit>');
  process.exit(1);
}

const REPO_ROOT = join(import.meta.dir, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'consolidation');
mkdirSync(OUT_DIR, { recursive: true });
const AUDIT_PATH = join(OUT_DIR, 'phase1.1.5-sprayer-extra-keys-audit.json');

const KEYS_TO_DROP = [
  'weight_g',
  'compatible_device',
  'continuous_spray_lock',
  'hose_length_m',
  'flow_rate_lpm',
  'gun_length_cm',
  'kit_contents',
];

console.log(`✓ Mode: ${MODE_DRY ? 'dry-run' : 'commit'}`);

// Audit: snapshot all current values before drop
const rows = (await sql.unsafe(`
  SELECT
    sku,
    name,
    template_sub_type,
    specs->>'weight_g' AS weight_g,
    specs->'compatible_device' AS compatible_device,
    specs->>'continuous_spray_lock' AS continuous_spray_lock,
    specs->>'hose_length_m' AS hose_length_m,
    specs->>'flow_rate_lpm' AS flow_rate_lpm,
    specs->>'gun_length_cm' AS gun_length_cm,
    specs->'kit_contents' AS kit_contents
  FROM products
  WHERE template_group = 'sprayers_bottles'
    AND (${KEYS_TO_DROP.map((k) => `specs ? '${k}'`).join(' OR ')})
  ORDER BY template_sub_type NULLS FIRST, sku
`)) as unknown as any[];

const removals = rows.map((r) => ({
  sku: r.sku,
  name: r.name,
  templateSubType: r.template_sub_type,
  before: {
    weight_g: r.weight_g ?? null,
    compatible_device: r.compatible_device ?? null,
    continuous_spray_lock: r.continuous_spray_lock ?? null,
    hose_length_m: r.hose_length_m ?? null,
    flow_rate_lpm: r.flow_rate_lpm ?? null,
    gun_length_cm: r.gun_length_cm ?? null,
    kit_contents: r.kit_contents ?? null,
  },
}));

const audit = {
  generatedAt: new Date().toISOString(),
  mode: MODE_DRY ? 'dry-run' : 'commit',
  keysDropped: KEYS_TO_DROP,
  affectedSkus: removals.length,
  removals,
};
writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2), 'utf8');
console.log(`✓ Audit: ${AUDIT_PATH}`);
console.log(`  affected SKU=${removals.length}`);

if (MODE_DRY) {
  console.log('\n✓ DRY-RUN tamamlandı. DB değişmedi.');
  await sql.end();
  process.exit(0);
}

// COMMIT
console.log('\n✓ COMMIT mode — DB UPDATE başlıyor...');

// 1) Specs'ten 7 key'i sil
const dropExpr = KEYS_TO_DROP.map((k) => `- '${k}'`).join(' ');
const r1 = await sql.unsafe(`
  UPDATE products
  SET specs = specs ${dropExpr}
  WHERE template_group = 'sprayers_bottles'
  RETURNING sku
`);
console.log(`  ✓ specs key sil: ${r1.length} sprayer SKU güncellendi`);

// 2) product_meta orphan DELETE (sadece sprayer SKU'larındaki weight_g satırları)
const r2 = await sql`
  DELETE FROM product_meta
  WHERE key = 'weight_g'
    AND sku IN (SELECT sku FROM products WHERE template_group = 'sprayers_bottles')
  RETURNING sku
`;
console.log(`  ✓ product_meta.weight_g orphan DELETE (sadece sprayer): ${r2.length} satır`);

// Verify
const verify = (await sql.unsafe(`
  SELECT
    ${KEYS_TO_DROP.map((k) => `COUNT(*) FILTER (WHERE specs ? '${k}')::int AS ${k}`).join(',\n    ')}
  FROM products WHERE template_group = 'sprayers_bottles'
`)) as any[];
console.log(`✓ Verify (hepsi 0 olmalı): ${JSON.stringify(verify[0])}`);

const wgCheck = (await sql.unsafe(`
  SELECT COUNT(*)::int AS n FROM product_meta WHERE key = 'weight_g'
`)) as any[];
console.log(`✓ product_meta.weight_g toplam: ${wgCheck[0].n} (sprayer'lar dışında kalanlar — fragrance vb.)`);

await sql.end();
