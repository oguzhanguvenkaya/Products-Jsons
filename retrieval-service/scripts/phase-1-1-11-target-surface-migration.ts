// Phase 1.1.11 Faz D — products.target_surface → specs.target_surfaces migration + DROP COLUMN
//
// İki phase:
//   bun run scripts/phase-1-1-11-target-surface-migration.ts          → audit only (sync DRY-RUN, kolon korunur)
//   bun run scripts/phase-1-1-11-target-surface-migration.ts --apply  → SYNC + DROP COLUMN (geri alınamaz)
//
// Audit önce 494 ürün için durum raporlar. Apply modunda:
//   1. UPDATE: specs.target_surfaces NULL/missing olan + kolon dolu olan satırlarda kolon değerini specs'e taşı
//   2. ALTER TABLE products DROP COLUMN target_surface
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');

console.log(`Mode: ${APPLY ? '--apply (SYNC + DROP COLUMN)' : 'audit only (dry-run)'}\n`);

// 1. Mevcut durum
const stats = await sql<any[]>`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE target_surface IS NOT NULL AND array_length(target_surface, 1) > 0)::int AS has_column,
    COUNT(*) FILTER (WHERE specs ? 'target_surfaces' AND specs->>'target_surfaces' IS NOT NULL AND specs->>'target_surfaces' <> '')::int AS has_specs,
    COUNT(*) FILTER (WHERE
      target_surface IS NOT NULL AND array_length(target_surface, 1) > 0
      AND NOT (specs ? 'target_surfaces' AND specs->>'target_surfaces' IS NOT NULL AND specs->>'target_surfaces' <> '')
    )::int AS needs_sync
  FROM products
`;
const s = stats[0];
console.log(`=== Mevcut durum ===`);
console.log(`Toplam ürün: ${s.total}`);
console.log(`Kolon dolu (target_surface): ${s.has_column}`);
console.log(`Specs dolu (specs.target_surfaces): ${s.has_specs}`);
console.log(`Sync gereken (kolon dolu + specs boş): ${s.needs_sync}\n`);

if (s.needs_sync === 0 && !APPLY) {
  console.log(`Sync gerekmiyor — tüm kolon değerleri zaten specs'te.`);
}

// 2. Sync örneği (audit için)
const sample = await sql<any[]>`
  SELECT sku, name, target_surface, specs->>'target_surfaces' AS specs_value
  FROM products
  WHERE target_surface IS NOT NULL AND array_length(target_surface, 1) > 0
    AND NOT (specs ? 'target_surfaces' AND specs->>'target_surfaces' IS NOT NULL AND specs->>'target_surfaces' <> '')
  LIMIT 10
`;
if (sample.length > 0) {
  console.log(`=== Sync örneği (ilk 10) ===`);
  for (const r of sample) {
    const colVal = Array.isArray(r.target_surface) ? r.target_surface.join('|') : '?';
    console.log(`  ${r.sku.padEnd(18)} kolon=[${r.target_surface?.join(',')}]  →  specs.target_surfaces="${colVal}"`);
  }
  console.log();
}

if (!APPLY) {
  console.log(`--apply flag yok. DB'ye yazma yapılmadı.\n`);
  console.log(`Apply uygulayınca:`);
  console.log(`  1. UPDATE: ${s.needs_sync} ürünün kolon değeri specs.target_surfaces'a taşınacak`);
  console.log(`  2. ALTER TABLE products DROP COLUMN target_surface (geri alınamaz)`);
  process.exit(0);
}

// --apply: transaction
console.log(`--apply: transaction başlıyor...\n`);

await sql.begin(async (tx: any) => {
  // Sync: kolondaki array değeri pipe-separated string'e çevir, specs.target_surfaces'a yaz
  // SADECE specs.target_surfaces yoksa veya boşsa — mevcut Phase 1.1.11 değerleri korunur
  const synced = await tx`
    UPDATE products
    SET specs = jsonb_set(
      COALESCE(specs, '{}'::jsonb),
      '{target_surfaces}',
      to_jsonb(array_to_string(target_surface, '|')),
      true
    )
    WHERE target_surface IS NOT NULL
      AND array_length(target_surface, 1) > 0
      AND NOT (specs ? 'target_surfaces' AND specs->>'target_surfaces' IS NOT NULL AND specs->>'target_surfaces' <> '')
    RETURNING sku
  `;
  console.log(`✓ Sync: ${synced.length} ürün için specs.target_surfaces yazıldı (kolon → specs)`);

  // Verify: hiç ürün kolon dolu + specs boş kalmadı
  const remaining = await tx`
    SELECT COUNT(*)::int AS c
    FROM products
    WHERE target_surface IS NOT NULL AND array_length(target_surface, 1) > 0
      AND NOT (specs ? 'target_surfaces' AND specs->>'target_surfaces' IS NOT NULL AND specs->>'target_surfaces' <> '')
  `;
  if (remaining[0].c > 0) {
    throw new Error(`Sync başarısız: ${remaining[0].c} ürün hâlâ specs'siz`);
  }

  // ALTER TABLE
  console.log(`✓ ALTER TABLE products DROP COLUMN target_surface ...`);
  await tx`ALTER TABLE products DROP COLUMN target_surface`;
  console.log(`✓ Kolon silindi`);
});

console.log(`\n✓ Faz D.1 + D.2 tamamlandı.`);
console.log(`Sıradaki: TypeScript schema güncellemeleri (types.ts, routes/*, scripts/*)`);
process.exit(0);
