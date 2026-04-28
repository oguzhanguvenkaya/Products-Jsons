// Phase 1.1.2 — Hedef-dışı volume_ml temizliği.
//
// 165 hedef SKU'da volume_ml canonicalize edildi (Phase 1.1.1). Bu script
// hedef-DIŞI SKU'lardan specs.volume_ml key'ini siler. Diğer key'lere
// (capacity_ml, weight_g, vb.) DOKUNMAZ.
//
// Sebep: sprayer'larda capacity_ml zaten doğru semantik; volume_ml duplicate
// veya yanlış data. Fragrance/storage/foam_tool/experience_set'te de
// volume_ml hedef scope dışında kalıyor.
//
// Modes: --dry-run | --commit
import { sql } from '../src/lib/db.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const args = new Set(process.argv.slice(2));
const MODE_DRY = args.has('--dry-run');
const MODE_COMMIT = args.has('--commit');
if ([MODE_DRY, MODE_COMMIT].filter(Boolean).length !== 1) {
  console.error('Usage: bun scripts/cleanup-misplaced-volume-ml.ts <--dry-run | --commit>');
  process.exit(1);
}

const REPO_ROOT = join(import.meta.dir, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'consolidation');
mkdirSync(OUT_DIR, { recursive: true });
const AUDIT_PATH = join(OUT_DIR, 'phase1.1.2-volume-ml-cleanup-audit.json');

const TARGETS_SQL = `(
  template_group IN (
    'car_shampoo','interior_cleaner','abrasive_polish','paint_protection_quick',
    'ceramic_coating','contaminant_solvers','tire_care','leather_care',
    'marin_products','glass_cleaner_protectant'
  )
  OR (template_group = 'industrial_products' AND template_sub_type IS DISTINCT FROM 'solid_compound')
  OR (template_group = 'ppf_tools' AND template_sub_type = 'ppf_install_solution')
  OR (template_group = 'clay_products' AND template_sub_type = 'clay_lubricant')
)`;

console.log(`✓ Mode: ${MODE_DRY ? 'dry-run' : 'commit'}`);

type Row = {
  sku: string;
  name: string;
  template_group: string;
  template_sub_type: string | null;
  before_value: string | null;
  capacity_ml: string | null;
  capacity_usable_ml: string | null;
  weight_g: string | null;
};

const rows = (await sql.unsafe(`
  SELECT
    sku,
    name,
    template_group,
    template_sub_type,
    specs->>'volume_ml' AS before_value,
    specs->>'capacity_ml' AS capacity_ml,
    specs->>'capacity_usable_ml' AS capacity_usable_ml,
    specs->>'weight_g' AS weight_g
  FROM products
  WHERE specs->>'volume_ml' IS NOT NULL
    AND NOT ${TARGETS_SQL}
  ORDER BY template_group, template_sub_type NULLS FIRST, sku
`)) as unknown as Row[];

console.log(`✓ ${rows.length} hedef-dışı SKU bulundu (volume_ml dolu)`);

// Categorize
const removals = rows.map((r) => {
  const vol = Number(r.before_value);
  const cap = r.capacity_ml ? Number(r.capacity_ml) : null;
  let category: 'duplicate' | 'mismatch' | 'info_loss' = 'info_loss';
  if (cap !== null) {
    category = vol === cap ? 'duplicate' : 'mismatch';
  }
  return {
    sku: r.sku,
    name: r.name,
    templateGroup: r.template_group,
    templateSubType: r.template_sub_type,
    removedValue: vol,
    capacityMl: cap,
    capacityUsableMl: r.capacity_usable_ml ? Number(r.capacity_usable_ml) : null,
    weightG: r.weight_g ? Number(r.weight_g) : null,
    category,
  };
});

const byCategory: Record<string, number> = { duplicate: 0, mismatch: 0, info_loss: 0 };
const byTemplate: Record<string, number> = {};
for (const r of removals) {
  byCategory[r.category]++;
  const k = `${r.templateGroup}/${r.templateSubType ?? '(null)'}`;
  byTemplate[k] = (byTemplate[k] ?? 0) + 1;
}

const audit = {
  generatedAt: new Date().toISOString(),
  mode: MODE_DRY ? 'dry-run' : 'commit',
  summary: {
    totalAffected: removals.length,
    byCategory,
    byTemplate,
  },
  removals,
};

writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2), 'utf8');
console.log(`✓ Audit yazıldı: ${AUDIT_PATH}`);
console.log(`  duplicate=${byCategory.duplicate}, mismatch=${byCategory.mismatch}, info_loss=${byCategory.info_loss}`);

if (MODE_DRY) {
  console.log('\n✓ DRY-RUN tamamlandı. DB değişmedi.');
  await sql.end();
  process.exit(0);
}

// COMMIT
console.log('\n✓ COMMIT mode — DB UPDATE başlıyor...');
const skus = removals.map((r) => r.sku);
const result = await sql`
  UPDATE products
  SET specs = specs - 'volume_ml'
  WHERE sku = ANY(${skus})
  RETURNING sku
`;
console.log(`  ✓ products.specs güncellendi: ${result.length} SKU`);

// product_meta orphan cleanup — EAV projection script volume_ml satırını
// silmez (sadece UPSERT eder), bu yüzden silinen specs için product_meta'da
// orphan kayıt kalır. Burada explicit temizlik yapıyoruz.
const orphanResult = await sql`
  DELETE FROM product_meta
  WHERE key = 'volume_ml' AND sku = ANY(${skus})
  RETURNING sku
`;
console.log(`  ✓ product_meta orphan satır silindi: ${orphanResult.length} SKU`);

// Verify
const verify = (await sql.unsafe(`
  SELECT
    COUNT(*) FILTER (WHERE specs->>'volume_ml' IS NOT NULL)::int AS still_has,
    (SELECT COUNT(*)::int FROM products WHERE specs->>'volume_ml' IS NOT NULL AND ${TARGETS_SQL}) AS in_target
  FROM products WHERE NOT ${TARGETS_SQL}
`)) as unknown as { still_has: number; in_target: number }[];

console.log(`✓ Verification: hedef-dışı volume_ml=${verify[0].still_has} (0 olmalı), hedef-içi=${verify[0].in_target} (165 olmalı)`);

await sql.end();
