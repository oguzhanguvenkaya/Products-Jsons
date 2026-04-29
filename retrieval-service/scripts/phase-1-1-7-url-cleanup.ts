// Phase 1.1.7 — URL'siz 8 SKU tam silme.
//
// FK cascade aktif (migrations/002_core_schema.sql line 62/82/103/139/140/154):
//   product_search, product_embeddings, product_meta, product_relations
//   (sku ve related_sku), product_faqs
// Tek `DELETE FROM products` cascade üzerinden hepsini siler.
//
// Modes: --dry-run | --commit
import { sql } from '../src/lib/db.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const args = new Set(process.argv.slice(2));
const MODE_DRY = args.has('--dry-run');
const MODE_COMMIT = args.has('--commit');
if ([MODE_DRY, MODE_COMMIT].filter(Boolean).length !== 1) {
  console.error('Usage: bun scripts/phase-1-1-7-url-cleanup.ts <--dry-run | --commit>');
  process.exit(1);
}

const REPO_ROOT = join(import.meta.dir, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'consolidation');
mkdirSync(OUT_DIR, { recursive: true });
const AUDIT_PATH = join(OUT_DIR, 'phase1.1.7-url-cleanup-audit.json');

const SKUS_TO_DELETE = [
  '24017.261.080', // MENZERNA PPC 200 (Tekne)
  '76006',         // FRA-BER Jant Temizleyici 750 ml
  '3218',          // KLIN Glass Shine Cam Silme Bezi
  '3213EMR',       // KLIN Drying DUO EVO
  '3221A-RD',      // KLIN Wash Mitt
  '3225A-BL',      // KLIN Wash Pad
  '75140',         // FRA-BER Gommanera Superlux 25 lt
  '75138',         // FRA-BER Gommanera Superlux 5 lt
];

console.log(`✓ Mode: ${MODE_DRY ? 'dry-run' : 'commit'}`);
console.log(`✓ Hedef SKU sayısı: ${SKUS_TO_DELETE.length}`);

// ─────────────────────────────────────────────────────────────────
// Pre-state counts
// ─────────────────────────────────────────────────────────────────

async function getCounts(skus: string[]) {
  const r1 = (await sql`SELECT COUNT(*)::int AS n FROM products WHERE sku = ANY(${skus})`) as any[];
  const r2 = (await sql`SELECT COUNT(*)::int AS n FROM product_meta WHERE sku = ANY(${skus})`) as any[];
  const r3 = (await sql`SELECT COUNT(*)::int AS n FROM product_search WHERE sku = ANY(${skus})`) as any[];
  const r4 = (await sql`SELECT COUNT(*)::int AS n FROM product_faqs WHERE sku = ANY(${skus})`) as any[];
  const r5 = (await sql`SELECT COUNT(*)::int AS n FROM product_relations WHERE sku = ANY(${skus}) OR related_sku = ANY(${skus})`) as any[];
  // product_embeddings (Phase 4) — exists check
  let embeddings = 0;
  try {
    const r6 = (await sql`SELECT COUNT(*)::int AS n FROM product_embeddings WHERE sku = ANY(${skus})`) as any[];
    embeddings = r6[0].n;
  } catch (e) {
    // table may not exist in some setups
  }
  return {
    products: r1[0].n,
    product_meta: r2[0].n,
    product_search: r3[0].n,
    product_faqs: r4[0].n,
    product_relations: r5[0].n,
    product_embeddings: embeddings,
  };
}

async function getTotalCounts() {
  const r = (await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE url IS NULL OR url = '')::int AS missing_url
    FROM products
  `) as any[];
  return r[0];
}

const beforeCounts = await getCounts(SKUS_TO_DELETE);
const beforeTotals = await getTotalCounts();

// Per-SKU detay (silinecek SKU'ların ürün adları + url durumu)
const targetDetails = (await sql`
  SELECT sku, name, brand, template_group, url, image_url
  FROM products
  WHERE sku = ANY(${SKUS_TO_DELETE})
  ORDER BY sku
`) as any[];

console.log(`\n=== ÖNCE ===`);
console.log(`  Toplam ürün:              ${beforeTotals.total}`);
console.log(`  URL eksik:                ${beforeTotals.missing_url}`);
console.log(`  Hedef SKU'ların DB'deki kayıtları:`);
console.log(`    products:               ${beforeCounts.products}`);
console.log(`    product_meta:           ${beforeCounts.product_meta}`);
console.log(`    product_search:         ${beforeCounts.product_search}`);
console.log(`    product_faqs:           ${beforeCounts.product_faqs}`);
console.log(`    product_relations:      ${beforeCounts.product_relations}`);
console.log(`    product_embeddings:     ${beforeCounts.product_embeddings}`);
console.log(`\n=== SİLİNECEK SKU LİSTESİ (${targetDetails.length}) ===`);
for (const d of targetDetails) {
  console.log(`  ${d.sku.padEnd(18)} | ${d.template_group.padEnd(20)} | url='${d.url ?? ''}' | ${d.name.slice(0, 60)}`);
}

const expectedFinal = beforeTotals.total - beforeCounts.products;
console.log(`\n=== HEDEF (commit sonrası) ===`);
console.log(`  Toplam ürün:              ${expectedFinal}`);
console.log(`  URL eksik:                0`);
console.log(`  deleted = ${beforeCounts.products} (kabul kriteri: 8)`);

// ─────────────────────────────────────────────────────────────────
// COMMIT
// ─────────────────────────────────────────────────────────────────

if (MODE_DRY) {
  const audit = {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    skusToDelete: SKUS_TO_DELETE,
    targetDetails,
    before: { totals: beforeTotals, perTable: beforeCounts },
    expected: { final_total: expectedFinal, deleted: beforeCounts.products },
  };
  writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2), 'utf8');
  console.log(`\n✓ DRY-RUN tamamlandı. DB değişmedi.`);
  console.log(`✓ Audit: ${AUDIT_PATH}`);
  await sql.end();
  process.exit(0);
}

console.log(`\n✓ COMMIT mode — DB DELETE başlıyor (FK cascade)...`);

const deleteResult = await sql`
  DELETE FROM products WHERE sku = ANY(${SKUS_TO_DELETE}) RETURNING sku
`;
console.log(`  ✓ products tablosundan silinen: ${deleteResult.length} satır`);
console.log(`  ✓ FK cascade kalan tabloları temizledi`);

// Verify
const afterTotals = await getTotalCounts();
const afterCounts = await getCounts(SKUS_TO_DELETE); // tüm sıfır olmalı

console.log(`\n=== SONRA ===`);
console.log(`  Toplam ürün:              ${afterTotals.total}`);
console.log(`  URL eksik:                ${afterTotals.missing_url}`);
console.log(`  Hedef SKU kayıtları (hepsi 0 olmalı):`);
console.log(`    products:               ${afterCounts.products}`);
console.log(`    product_meta:           ${afterCounts.product_meta}`);
console.log(`    product_search:         ${afterCounts.product_search}`);
console.log(`    product_faqs:           ${afterCounts.product_faqs}`);
console.log(`    product_relations:      ${afterCounts.product_relations}`);
console.log(`    product_embeddings:     ${afterCounts.product_embeddings}`);

const audit = {
  generatedAt: new Date().toISOString(),
  mode: 'commit',
  skusToDelete: SKUS_TO_DELETE,
  targetDetails,
  before: { totals: beforeTotals, perTable: beforeCounts },
  after: { totals: afterTotals, perTable: afterCounts },
  deleted: deleteResult.length,
  acceptanceCriteria: {
    deleted_eq_8: deleteResult.length === 8,
    products_missing_url_eq_0: afterTotals.missing_url === 0,
  },
};
writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2), 'utf8');
console.log(`\n✓ Audit: ${AUDIT_PATH}`);
console.log(`✓ Acceptance: deleted=${deleteResult.length}, missing_url=${afterTotals.missing_url}`);

await sql.end();
