// Phase 1.1.13K — leather_care → interior_cleaner consolidation (7 ürün)
//
// 7 SKU template_group güncellenir, template_sub_type aynı kalır:
//   leather_cleaner (3): 71132, Q2M-LCN1000M, Q2M-LCSYA1000M
//   leather_dressing (2): 700468, Q2-LCR500M
//   leather_care_kit (2): Q2M-LSN200M, Q2M-LSSYA200M
//
// Guard: 7 SKU'nun tamamı leather_care altında olmalı, rowcount != 7 → abort.
//
// İki mod:
//   bun run scripts/phase-1-1-13k-leather-consolidation.ts          → audit
//   bun run scripts/phase-1-1-13k-leather-consolidation.ts --apply  → audit + UPDATE + embedding null

import { writeFileSync, mkdirSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');
mkdirSync('scripts/audit', { recursive: true });

const EXPECTED_SKUS = [
  '71132', 'Q2M-LCN1000M', 'Q2M-LCSYA1000M',
  '700468', 'Q2-LCR500M',
  'Q2M-LSN200M', 'Q2M-LSSYA200M',
];

console.log(`Mode: ${APPLY ? '--apply' : 'audit only'}\n`);

// === Pre-state audit ===
const before = await sql<any[]>`
  SELECT sku, name, template_group, template_sub_type
  FROM products
  WHERE sku = ANY(${EXPECTED_SKUS})
  ORDER BY template_sub_type, sku
`;
console.log('=== Pre-state (7 SKU) ===');
for (const r of before as any[]) {
  console.log(`  [${r.sku.padEnd(15)}] ${r.template_group}/${r.template_sub_type}  ${r.name?.slice(0, 60)}`);
}

// === Guard ===
const wrongState = before.filter((r: any) => r.template_group !== 'leather_care');
const missing = EXPECTED_SKUS.filter(s => !before.some((r: any) => r.sku === s));

if (before.length !== 7) {
  console.error(`\n❌ ABORT: 7 SKU bekleniyor, ${before.length} bulundu.`);
  if (missing.length) console.error(`   Eksik: ${missing.join(', ')}`);
  process.exit(1);
}
if (wrongState.length > 0) {
  console.error(`\n❌ ABORT: ${wrongState.length} SKU leather_care altında değil:`);
  for (const r of wrongState) console.error(`   ${r.sku}: ${r.template_group}`);
  process.exit(1);
}

// === leather_care toplam ürün (7'den fazla mı?) ===
const allLeather = await sql<any[]>`
  SELECT sku FROM products WHERE template_group='leather_care'
`;
if (allLeather.length !== 7) {
  console.error(`\n❌ ABORT: leather_care altında toplam ${allLeather.length} ürün var (beklenen 7).`);
  console.error(`   Beklenmeyen SKU'lar: ${allLeather.filter((r: any) => !EXPECTED_SKUS.includes(r.sku)).map((r: any) => r.sku).join(', ')}`);
  process.exit(1);
}

console.log(`\n✓ Guard pass: 7 SKU leather_care altında, başka ürün yok.`);

// === Audit JSON ===
const audit: any = {
  phase: '1.1.13K',
  mode: APPLY ? 'apply' : 'audit',
  expected_skus: EXPECTED_SKUS,
  before: before,
  after: null,
  embedding_null_count: null,
};

if (!APPLY) {
  writeFileSync('scripts/audit/_phase-1-1-13k-audit.json', JSON.stringify(audit, null, 2));
  console.log(`\n✓ Audit JSON: scripts/audit/_phase-1-1-13k-audit.json`);
  console.log(`\n--apply yok, DB güncellenmedi.`);
  process.exit(0);
}

// === Apply: atomik transaction ===
console.log(`\n--apply: transaction başlıyor...`);

await sql.begin(async (tx: any) => {
  // 1. Template group taşıma
  const r1 = await tx`
    UPDATE products
    SET template_group = 'interior_cleaner'
    WHERE template_group = 'leather_care' AND sku = ANY(${EXPECTED_SKUS})
    RETURNING sku, template_sub_type
  `;
  console.log(`  ✓ template_group leather_care → interior_cleaner: ${r1.length} update`);

  // 2. product_embeddings null (search_text yenilenecek, embedding stale)
  const r2 = await tx`
    UPDATE product_embeddings
    SET embedding = NULL
    WHERE sku = ANY(${EXPECTED_SKUS})
    RETURNING sku
  `;
  console.log(`  ✓ product_embeddings.embedding = NULL: ${r2.length} update`);
});

// === Post-apply verify ===
console.log(`\n=== POST-APPLY VERIFY ===`);

const v1 = await sql`SELECT COUNT(*)::int AS c FROM products WHERE template_group='leather_care'`;
console.log(`  leather_care kalan: ${v1[0].c} (beklenen 0)`);

const v2 = await sql`SELECT COUNT(*)::int AS c FROM products WHERE template_group='interior_cleaner'`;
console.log(`  interior_cleaner toplam: ${v2[0].c} (beklenen 30)`);

const v3 = await sql<any[]>`
  SELECT template_sub_type, COUNT(*)::int AS c
  FROM products WHERE template_group='interior_cleaner'
  GROUP BY template_sub_type ORDER BY template_sub_type
`;
console.log(`  interior_cleaner sub_type breakdown:`);
for (const r of v3 as any[]) console.log(`    ${r.template_sub_type}: ${r.c}`);

const v4 = await sql`
  SELECT COUNT(*)::int AS c FROM product_embeddings
  WHERE sku = ANY(${EXPECTED_SKUS}) AND embedding IS NULL
`;
console.log(`  embedding null (7 SKU): ${v4[0].c} (beklenen 7 — refresh sonrası 0 olacak)`);

// === Audit JSON post-apply ===
const after = await sql<any[]>`
  SELECT sku, name, template_group, template_sub_type
  FROM products WHERE sku = ANY(${EXPECTED_SKUS})
  ORDER BY template_sub_type, sku
`;
audit.after = after;
audit.embedding_null_count = v4[0].c;
writeFileSync('scripts/audit/_phase-1-1-13k-audit.json', JSON.stringify(audit, null, 2));
console.log(`\n✓ Audit JSON: scripts/audit/_phase-1-1-13k-audit.json`);

console.log('\n✓ Phase 1.1.13K migration tamamlandı.');
console.log('   Sıradaki: bun run scripts/regenerate-search-text.ts');
console.log('   Sonra:    bun run scripts/embed-products.ts (7 null embedding)');
process.exit(0);
