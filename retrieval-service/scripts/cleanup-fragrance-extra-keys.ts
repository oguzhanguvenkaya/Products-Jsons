// Phase 1.1.6 — fragrance + air_blow_gun(SGGS003) + work_light(463302)
// boyut/ağırlık meta key temizliği + volume_ml restore.
//
// AKSIYONLAR:
//   A) SİL — fragrance kategorisi TÜM sub'lar + 2 SKU:
//      weight_g, weight_kg, weight_net_kg, weight_net_g, volume (string), volume_lt
//   B) RESTORE — Phase 1.1.2'de silinen 14 SKU (spray_perfume + odor_eliminator)
//      volume_ml değerlerini audit JSON'dan geri yükle.
//   C) product_meta orphan DELETE — fragrance SKU'ları + 2 SKU'da weight_g.
//   (D) volume_ml satırları EAV scripti tekrar çalıştığında otomatik yazılır.
//
// Modes: --dry-run | --commit
import { sql } from '../src/lib/db.ts';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const args = new Set(process.argv.slice(2));
const MODE_DRY = args.has('--dry-run');
const MODE_COMMIT = args.has('--commit');
if ([MODE_DRY, MODE_COMMIT].filter(Boolean).length !== 1) {
  console.error('Usage: bun scripts/cleanup-fragrance-extra-keys.ts <--dry-run | --commit>');
  process.exit(1);
}

const REPO_ROOT = join(import.meta.dir, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'consolidation');
mkdirSync(OUT_DIR, { recursive: true });
const AUDIT_PATH = join(OUT_DIR, 'phase1.1.6-fragrance-cleanup-audit.json');
const PHASE_112_AUDIT = join(OUT_DIR, 'phase1.1.2-volume-ml-cleanup-audit.json');

const KEYS_TO_DROP = ['weight_g', 'weight_kg', 'weight_net_kg', 'weight_net_g', 'volume', 'volume_lt'];
const EXTRA_SKUS = ['SGGS003', '463302']; // air_blow_gun + work_light

console.log(`✓ Mode: ${MODE_DRY ? 'dry-run' : 'commit'}`);

// ─────────────────────────────────────────────────────────────────
// A) SİL planı (audit için before-value snapshot)
// ─────────────────────────────────────────────────────────────────

const dropTargets = (await sql.unsafe(`
  SELECT
    sku, name, template_group, template_sub_type,
    specs->>'weight_g' AS weight_g,
    specs->>'weight_kg' AS weight_kg,
    specs->>'weight_net_kg' AS weight_net_kg,
    specs->>'weight_net_g' AS weight_net_g,
    specs->>'volume' AS volume,
    specs->>'volume_lt' AS volume_lt
  FROM products
  WHERE (template_group = 'fragrance' OR sku = ANY(${`ARRAY['${EXTRA_SKUS.join("','")}']::text[]`}))
    AND (${KEYS_TO_DROP.map((k) => `specs ? '${k}'`).join(' OR ')})
  ORDER BY template_group, template_sub_type NULLS FIRST, sku
`)) as any[];

console.log(`✓ Sil-aday SKU sayısı: ${dropTargets.length}`);

// ─────────────────────────────────────────────────────────────────
// B) RESTORE planı (Phase 1.1.2 audit'inden)
// ─────────────────────────────────────────────────────────────────

const phase112 = JSON.parse(readFileSync(PHASE_112_AUDIT, 'utf8'));
const restorePlan = phase112.removals.filter(
  (r: any) =>
    r.templateGroup === 'fragrance' &&
    (r.templateSubType === 'spray_perfume' || r.templateSubType === 'odor_eliminator'),
).map((r: any) => ({
  sku: r.sku,
  templateSubType: r.templateSubType,
  volumeMl: r.removedValue,
  name: r.name,
}));
console.log(`✓ Restore plan: ${restorePlan.length} SKU (volume_ml geri yüklenecek)`);

// ─────────────────────────────────────────────────────────────────
// Audit dump
// ─────────────────────────────────────────────────────────────────

const audit = {
  generatedAt: new Date().toISOString(),
  mode: MODE_DRY ? 'dry-run' : 'commit',
  keysToDrop: KEYS_TO_DROP,
  extraSkus: EXTRA_SKUS,
  summary: {
    dropTargetCount: dropTargets.length,
    restoreCount: restorePlan.length,
  },
  dropTargets,
  restorePlan,
};
writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2), 'utf8');
console.log(`✓ Audit: ${AUDIT_PATH}`);

if (MODE_DRY) {
  console.log('\n✓ DRY-RUN tamamlandı. DB değişmedi.');
  await sql.end();
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────
// COMMIT
// ─────────────────────────────────────────────────────────────────

console.log('\n✓ COMMIT mode — DB UPDATE başlıyor...');

// A) SİL
const dropExpr = KEYS_TO_DROP.map((k) => `- '${k}'`).join(' ');
const r1 = await sql.unsafe(`
  UPDATE products
  SET specs = specs ${dropExpr}
  WHERE template_group = 'fragrance' OR sku = ANY($1::text[])
  RETURNING sku
`, [EXTRA_SKUS]);
console.log(`  ✓ A) SİL: ${r1.length} SKU specs güncellendi`);

// B) RESTORE volume_ml
let restored = 0;
for (const r of restorePlan) {
  await sql`
    UPDATE products
    SET specs = specs || jsonb_build_object('volume_ml', ${r.volumeMl}::numeric)
    WHERE sku = ${r.sku}
  `;
  restored++;
}
console.log(`  ✓ B) RESTORE volume_ml: ${restored} SKU`);

// C) product_meta orphan DELETE — sadece weight_g (volume_ml zaten EAV'de yok bu kategoride)
const r3 = await sql`
  DELETE FROM product_meta
  WHERE key = 'weight_g'
    AND (
      sku IN (SELECT sku FROM products WHERE template_group = 'fragrance')
      OR sku = ANY(${EXTRA_SKUS})
    )
  RETURNING sku
`;
console.log(`  ✓ C) product_meta.weight_g orphan DELETE: ${r3.length} satır`);

// Verify
const verify = (await sql.unsafe(`
  SELECT
    COUNT(*) FILTER (WHERE specs ? 'weight_g')::int AS wg,
    COUNT(*) FILTER (WHERE specs ? 'weight_kg')::int AS wkg,
    COUNT(*) FILTER (WHERE specs ? 'weight_net_kg')::int AS wnk,
    COUNT(*) FILTER (WHERE specs ? 'weight_net_g')::int AS wng,
    COUNT(*) FILTER (WHERE specs ? 'volume')::int AS vol,
    COUNT(*) FILTER (WHERE specs ? 'volume_lt')::int AS vlt,
    COUNT(*) FILTER (WHERE specs->>'volume_ml' IS NOT NULL)::int AS vml
  FROM products WHERE template_group='fragrance'
`)) as any[];
console.log(`✓ Verify (fragrance): ${JSON.stringify(verify[0])}`);
console.log('  (wg/wkg/wnk/wng/vol/vlt = 0; vml = 14 olmalı)');

const verifyExtra = (await sql.unsafe(`
  SELECT sku,
    specs ? 'weight_g' AS has_wg
  FROM products WHERE sku = ANY($1::text[])
`, [EXTRA_SKUS])) as any[];
console.log(`✓ Verify (extra SKUs): ${JSON.stringify(verifyExtra)}`);

await sql.end();
