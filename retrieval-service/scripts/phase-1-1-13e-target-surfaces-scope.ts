// Phase 1.1.13E — target_surfaces scope hijyeni
//
// 214 ürün: target_surfaces SİL (yüzeye dokunmayan kategoriler)
// 4 ürün: masking_tapes target_surfaces SET = '|boya|cam|ahşap|plastik|deri|metal|'
//
// İki mod:
//   bun run scripts/phase-1-1-13e-target-surfaces-scope.ts          → audit (DB'ye yazmaz)
//   bun run scripts/phase-1-1-13e-target-surfaces-scope.ts --apply  → audit + transactional UPDATE
//
// SİL kuralları (programatik):
//   - template_group IN ('fragrance','sprayers_bottles','polisher_machine',
//                        'storage_accessories','air_equipment','product_sets')
//   - VEYA template_group='wash_tools' AND template_sub_type IN ('bucket','foam_tool','towel_wash')
//   - VEYA template_group='ppf_tools' AND template_sub_type IN ('consumable','positioning_tool')
//
// SET kuralı:
//   - template_group='masking_tapes' → '|boya|cam|ahşap|plastik|deri|metal|'
//
// KORU (DOKUNULMAZ): wash_mitt, drying_towel, microfiber, polishing_pad, applicators,
//                    brushes, ppf_tools/squeegee+application_kit+ppf_install_solution
//                    + tüm kimyasal ürünler

import { writeFileSync, mkdirSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');
mkdirSync('scripts/audit', { recursive: true });

const SET_VALUE = '|boya|cam|ahşap|plastik|deri|metal|';

const DELETE_GROUPS = ['fragrance', 'sprayers_bottles', 'polisher_machine', 'storage_accessories', 'air_equipment', 'product_sets'];
const DELETE_WASH_TOOLS = ['bucket', 'foam_tool', 'towel_wash'];
const DELETE_PPF_TOOLS = ['consumable', 'positioning_tool'];
const SET_GROUP = 'masking_tapes';

console.log(`Mode: ${APPLY ? '--apply (audit + UPDATE)' : 'audit only'}\n`);

// === Adım 1: SİL listesi (214) ===
const silRows = await sql<any[]>`
  SELECT sku, template_group, template_sub_type, specs->>'target_surfaces' AS old_ts
  FROM products
  WHERE specs ? 'target_surfaces'
    AND (
      template_group = ANY(${DELETE_GROUPS})
      OR (template_group = 'wash_tools' AND template_sub_type = ANY(${DELETE_WASH_TOOLS}))
      OR (template_group = 'ppf_tools' AND template_sub_type = ANY(${DELETE_PPF_TOOLS}))
    )
  ORDER BY template_group, template_sub_type, sku
`;
console.log(`✓ SİL listesi: ${silRows.length} ürün (beklenen 214)`);

// === Adım 2: SET listesi (4) ===
const setRows = await sql<any[]>`
  SELECT sku, template_group, template_sub_type, specs->>'target_surfaces' AS old_ts
  FROM products
  WHERE template_group = ${SET_GROUP}
  ORDER BY sku
`;
console.log(`✓ SET listesi: ${setRows.length} ürün (beklenen 4)`);

// === Guard 1: KORU listesi etkilenmemeli ===
const koruRows = await sql<any[]>`
  SELECT COUNT(*) AS c FROM products
  WHERE specs ? 'target_surfaces'
    AND (
      (template_group = 'wash_tools' AND template_sub_type IN ('wash_mitt', 'drying_towel'))
      OR template_group IN ('microfiber', 'polishing_pad', 'applicators', 'brushes')
      OR (template_group = 'ppf_tools' AND template_sub_type IN ('squeegee', 'application_kit', 'ppf_install_solution'))
    )
`;
console.log(`✓ KORU listesi: ${koruRows[0].c} ürün (dokunulmayacak, beklenen 95)`);

// === Guard 2: Silme öncesi & sonrası total target_surfaces sayısı ===
const totalBefore = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'target_surfaces'`;
console.log(`✓ Mevcut toplam target_surfaces: ${totalBefore[0].c} (beklenen 493)`);
const expectedAfter = Number(totalBefore[0].c) - silRows.length;
console.log(`✓ Beklenen sonuç: ${expectedAfter} (493 - ${silRows.length} = ${expectedAfter})\n`);

// Sayım kontrolleri
if (silRows.length !== 214) {
  console.error(`✗ SİL listesi 214 değil: ${silRows.length}`);
  if (silRows.length < 200) process.exit(1);
}
if (setRows.length !== 4) {
  console.error(`✗ SET listesi 4 değil: ${setRows.length}`);
  if (setRows.length < 1) process.exit(1);
}

// === Audit JSON ===
const audit = {
  stats: {
    total_before_target_surfaces: Number(totalBefore[0].c),
    sil_count: silRows.length,
    set_count: setRows.length,
    koru_count: Number(koruRows[0].c),
    expected_after: expectedAfter,
    set_value: SET_VALUE,
  },
  sil_list: silRows.map((r: any) => ({
    sku: r.sku,
    template_group: r.template_group,
    template_sub_type: r.template_sub_type,
    old_target_surfaces: r.old_ts,
  })),
  set_list: setRows.map((r: any) => ({
    sku: r.sku,
    template_group: r.template_group,
    template_sub_type: r.template_sub_type,
    before: r.old_ts,
    after: SET_VALUE,
  })),
};

writeFileSync('scripts/audit/_phase-1-1-13e-audit.json', JSON.stringify(audit, null, 2));
console.log('✓ Audit JSON: scripts/audit/_phase-1-1-13e-audit.json');

// SİL listesi grup bazında özet
const silByGroup = new Map<string, number>();
for (const r of silRows as any[]) {
  const k = `${r.template_group}/${r.template_sub_type}`;
  silByGroup.set(k, (silByGroup.get(k) ?? 0) + 1);
}
console.log('\n=== SİL dağılımı (grup/sub_type) ===');
for (const [k, c] of [...silByGroup.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(c).padStart(3)} × ${k}`);
}

console.log('\n=== SET listesi (4 masking_tape) ===');
for (const r of setRows as any[]) {
  console.log(`  ${r.sku}: '${r.old_ts}' → '${SET_VALUE}'`);
}

if (!APPLY) {
  console.log('\n--apply flag yok, DB güncellenmedi.');
  console.log(`Apply edince: ${silRows.length} DELETE + ${setRows.length} SET = ${silRows.length + setRows.length} UPDATE`);
  process.exit(0);
}

// === Apply (transaction) ===
console.log(`\n--apply: transaction başlıyor (${silRows.length} DELETE + ${setRows.length} SET)...`);

await sql.begin(async (tx: any) => {
  let nDel = 0;
  for (const r of silRows as any[]) {
    await tx`UPDATE products SET specs = specs - 'target_surfaces' WHERE sku = ${r.sku}`;
    nDel++;
  }
  console.log(`  ✓ DELETE: ${nDel} ürün`);

  let nSet = 0;
  for (const r of setRows as any[]) {
    await tx`
      UPDATE products
      SET specs = jsonb_set(specs, '{target_surfaces}', to_jsonb(${SET_VALUE}::text), true)
      WHERE sku = ${r.sku}
    `;
    nSet++;
  }
  console.log(`  ✓ SET: ${nSet} ürün`);
});

// === Post-apply verify ===
const totalAfter = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'target_surfaces'`;
const fragCount = await sql`SELECT COUNT(*) AS c FROM products WHERE template_group='fragrance' AND specs ? 'target_surfaces'`;
const sprCount = await sql`SELECT COUNT(*) AS c FROM products WHERE template_group='sprayers_bottles' AND specs ? 'target_surfaces'`;
const polCount = await sql`SELECT COUNT(*) AS c FROM products WHERE template_group='polisher_machine' AND specs ? 'target_surfaces'`;
const maskingCount = await sql`SELECT COUNT(*) AS c FROM products WHERE template_group='masking_tapes' AND specs->>'target_surfaces' = ${SET_VALUE}`;
const koruAfter = await sql<any[]>`
  SELECT COUNT(*) AS c FROM products
  WHERE specs ? 'target_surfaces'
    AND (
      (template_group = 'wash_tools' AND template_sub_type IN ('wash_mitt', 'drying_towel'))
      OR template_group IN ('microfiber', 'polishing_pad', 'applicators', 'brushes')
      OR (template_group = 'ppf_tools' AND template_sub_type IN ('squeegee', 'application_kit', 'ppf_install_solution'))
    )
`;

console.log(`\n=== POST-APPLY VERIFY ===`);
console.log(`  total target_surfaces: ${totalAfter[0].c} (beklenen ${expectedAfter}) ${Number(totalAfter[0].c) === expectedAfter ? '✓' : '✗'}`);
console.log(`  fragrance: ${fragCount[0].c} (beklenen 0) ${Number(fragCount[0].c) === 0 ? '✓' : '✗'}`);
console.log(`  sprayers_bottles: ${sprCount[0].c} (beklenen 0) ${Number(sprCount[0].c) === 0 ? '✓' : '✗'}`);
console.log(`  polisher_machine: ${polCount[0].c} (beklenen 0) ${Number(polCount[0].c) === 0 ? '✓' : '✗'}`);
console.log(`  masking_tapes canonical: ${maskingCount[0].c} (beklenen 4) ${Number(maskingCount[0].c) === 4 ? '✓' : '✗'}`);
console.log(`  KORU dokunulmaz: ${koruAfter[0].c} (beklenen 95) ${Number(koruAfter[0].c) === 95 ? '✓' : '✗'}`);

console.log('\n✓ Phase 1.1.13E migration tamamlandı.');
console.log('Sıradaki: project-specs-to-meta.ts re-project, search-text regen + 218 embedding refresh.');
process.exit(0);
