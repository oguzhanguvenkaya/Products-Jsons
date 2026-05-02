// Phase 1.1.13H — Mini cleanup (3 fix, 32 ürün)
//
// Phase 1.1.13G denetim raporundan:
// A. product_type 7 ürün yanlış değer (sub_type adı tutuyor) → 'accessory'
// B. purpose 1 ürün anomali ('Lastik parlatıcı uygulaması') → 'coating_application'
// C. finish 24 ürün JSON null → specs - 'finish'
//
// İki mod:
//   bun run scripts/phase-1-1-13h-mini-cleanup.ts          → audit
//   bun run scripts/phase-1-1-13h-mini-cleanup.ts --apply  → audit + UPDATE

import { writeFileSync, mkdirSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');
mkdirSync('scripts/audit', { recursive: true });

console.log(`Mode: ${APPLY ? '--apply' : 'audit only'}\n`);

// === A. product_type 7 ürün ===
const A_SKUS = ['SGGC086', 'SGGS003', 'SGGC055', 'GPRO6555', '463302', '486728', '530375'];

console.log('=== A. product_type 7 ürün → accessory ===');
const aBefore = await sql<any[]>`
  SELECT sku, template_group, template_sub_type, specs->>'product_type' AS pt
  FROM products WHERE sku = ANY(${A_SKUS}) ORDER BY sku
`;
console.log(`  ${aBefore.length} ürün bulundu (beklenen 7)`);
for (const r of aBefore as any[]) console.log(`    ${r.sku.padEnd(15)} [${r.template_group}/${r.template_sub_type}] ${r.pt} → accessory`);

// === B. purpose Türkçe anomali ===
const bBefore = await sql<any[]>`
  SELECT sku, template_group, template_sub_type, specs->>'purpose' AS p
  FROM products WHERE specs->>'purpose' = 'Lastik parlatıcı uygulaması'
`;
console.log(`\n=== B. purpose 'Lastik parlatıcı uygulaması' → coating_application ===`);
console.log(`  ${bBefore.length} ürün bulundu (beklenen 1)`);
for (const r of bBefore as any[]) console.log(`    ${r.sku.padEnd(15)} [${r.template_group}/${r.template_sub_type}]`);

// === C. finish JSON null cleanup ===
const cBefore = await sql<any[]>`
  SELECT sku, template_group, template_sub_type
  FROM products WHERE specs->'finish' = 'null'::jsonb
`;
console.log(`\n=== C. finish JSON null SİL ===`);
console.log(`  ${cBefore.length} ürün bulundu (beklenen 24)`);

// === Audit JSON ===
const audit = {
  stats: {
    a_product_type: aBefore.length,
    b_purpose: bBefore.length,
    c_finish_null: cBefore.length,
    total: aBefore.length + bBefore.length + cBefore.length,
  },
  a_product_type_changes: aBefore,
  b_purpose_changes: bBefore,
  c_finish_skus: cBefore.map((r: any) => r.sku),
};

writeFileSync('scripts/audit/_phase-1-1-13h-audit.json', JSON.stringify(audit, null, 2));
console.log(`\n✓ Audit JSON: scripts/audit/_phase-1-1-13h-audit.json`);
console.log(`  Toplam aksiyon: ${audit.stats.total}`);

if (!APPLY) {
  console.log('\n--apply yok, DB güncellenmedi.');
  process.exit(0);
}

// === Apply ===
console.log(`\n--apply: transaction başlıyor...`);

await sql.begin(async (tx: any) => {
  // A. product_type 7 ürün → accessory
  let nA = 0;
  for (const sku of A_SKUS) {
    await tx`UPDATE products SET specs = jsonb_set(specs, '{product_type}', to_jsonb('accessory'::text), true) WHERE sku = ${sku}`;
    nA++;
  }
  console.log(`  ✓ A. product_type → accessory: ${nA} update`);

  // B. purpose anomali
  const rB = await tx`UPDATE products SET specs = jsonb_set(specs, '{purpose}', to_jsonb('coating_application'::text), true) WHERE specs->>'purpose' = 'Lastik parlatıcı uygulaması' RETURNING sku`;
  console.log(`  ✓ B. purpose normalize: ${rB.length} update`);

  // C. finish JSON null SİL
  const rC = await tx`UPDATE products SET specs = specs - 'finish' WHERE specs->'finish' = 'null'::jsonb RETURNING sku`;
  console.log(`  ✓ C. finish null SİL: ${rC.length} update`);
});

// === Post-apply verify ===
console.log(`\n=== POST-APPLY VERIFY ===`);

const v1 = await sql`SELECT COUNT(*) AS c FROM products WHERE specs->>'product_type' = 'accessory'`;
console.log(`  product_type='accessory' toplam: ${v1[0].c} (beklenen 21 = 14 mevcut + 7 yeni)`);

const v2 = await sql`SELECT COUNT(*) AS c FROM products WHERE specs->>'product_type' IN ('air_blow_gun','pen_inspection_light','professional_work_light','tower_work_light','mini_polishing_pad','tornador_cleaning_gun')`;
console.log(`  product_type yanlış değerler kalan: ${v2[0].c} (beklenen 0)`);

const v3 = await sql`SELECT COUNT(*) AS c FROM products WHERE specs->>'purpose' = 'Lastik parlatıcı uygulaması'`;
console.log(`  purpose anomali kalan: ${v3[0].c} (beklenen 0)`);

const v4 = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'finish' AND specs->'finish' = 'null'::jsonb`;
console.log(`  finish JSON null kalan: ${v4[0].c} (beklenen 0)`);

const v5 = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'finish'`;
console.log(`  finish toplam coverage: ${v5[0].c} (beklenen 7 = sadece anlamlı değerli)`);

console.log('\n✓ Phase 1.1.13H tamamlandı.');
process.exit(0);
