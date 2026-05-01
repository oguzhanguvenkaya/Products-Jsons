// Phase 1.1.13B.2 — scent minimalist cleanup
//
// İki mod:
//   bun run scripts/phase-1-1-13b2-scent.ts          → audit (DB'ye yazmaz)
//   bun run scripts/phase-1-1-13b2-scent.ts --apply  → audit + transaction
//
// İşlem:
// - Fragrance dışı JSON null scent key'lerini siler.
// - Fragrance grubunda scent'i eksik/null odor eliminator ürünlerini "Nötr/Kokusuz" doldurur.
// - Dolu scent değerlerine dokunmaz.
import { mkdirSync, writeFileSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');
const FRAGRANCE_FILL_VALUE = 'Nötr/Kokusuz';

const FILL_SKUS = [
  '701610',
  '74436',
  '79415',
  'ED1515',
  'EF1515',
  'Q2M-OR500M',
  'Q2M-ORP4P',
  'SC1515',
];

const DELETE_NULL_SKUS = [
  '700387',
  '700508',
  '701062',
  '701851',
  '701980',
  '70616',
  '70640',
  '70942',
  '72042',
  '74258',
  '75021',
  '78784',
  '79281',
  '79284',
  'Q2M-BYA4000M',
  'Q2M-FYA4000M',
  'Q2M-RW1000M',
  'Q2M-DT10P',
  '701606',
  '74955',
  '70933',
  '71110',
  '701010',
  '70723',
  '70894',
  '71676',
  '75277',
  '75404',
  '79298',
  'Q2M-APYA4000M',
  'Q2M-IDYA4000M',
  'Q2M-LCN1000M',
  'Q2M-LSN200M',
  'Q2M-LSSYA200M',
  '75132',
  '77192',
  '701908',
  '70868',
  '71706',
  'Q2M-TCYA1000M',
  'Q2M-TEYA1000M',
  '701422',
  'Q2M-TWYA500M',
];

const allSkus = [...FILL_SKUS, ...DELETE_NULL_SKUS];
const unique = new Set(allSkus);
if (unique.size !== allSkus.length) throw new Error('Duplicate SKU in scent action list');
if (FILL_SKUS.length !== 8) throw new Error(`Fill count expected 8, got ${FILL_SKUS.length}`);
if (DELETE_NULL_SKUS.length !== 43) throw new Error(`Delete count expected 43, got ${DELETE_NULL_SKUS.length}`);

mkdirSync('scripts/audit', { recursive: true });

console.log(`Mode: ${APPLY ? '--apply (audit + UPDATE)' : 'audit only'}`);
console.log(`Actions: ${FILL_SKUS.length} fill + ${DELETE_NULL_SKUS.length} delete-null`);

const rows = await sql<any[]>`
  SELECT sku, name, template_group, template_sub_type, specs
  FROM products
  WHERE sku = ANY(${allSkus})
  ORDER BY sku
`;

const found = new Set(rows.map((r) => r.sku));
const missing = allSkus.filter((sku) => !found.has(sku));
if (missing.length > 0) {
  console.error(`HATA: DB'de bulunamayan SKU: ${missing.join(', ')}`);
  process.exit(1);
}

const fillSet = new Set(FILL_SKUS);
const deleteSet = new Set(DELETE_NULL_SKUS);

for (const r of rows) {
  const before = r.specs?.scent ?? null;
  if (fillSet.has(r.sku)) {
    if (r.template_group !== 'fragrance') {
      throw new Error(`Fill SKU fragrance değil: ${r.sku} (${r.template_group})`);
    }
    if (before !== null && before !== undefined && before !== '') {
      throw new Error(`Fill SKU zaten dolu scent içeriyor: ${r.sku} (${before})`);
    }
  }
  if (deleteSet.has(r.sku)) {
    if (r.template_group === 'fragrance') {
      throw new Error(`Delete SKU fragrance grubunda: ${r.sku}`);
    }
    if (before !== null && before !== undefined) {
      throw new Error(`Delete SKU null scent değil: ${r.sku} (${before})`);
    }
  }
}

const audit = rows.map((r) => {
  const isFill = fillSet.has(r.sku);
  return {
    sku: r.sku,
    name: r.name,
    template_group: r.template_group,
    template_sub_type: r.template_sub_type,
    action: isFill ? 'fill_neutral_unscented' : 'delete_null_scent',
    before_scent: r.specs?.scent ?? null,
    after_scent: isFill ? FRAGRANCE_FILL_VALUE : null,
  };
});

writeFileSync(
  'scripts/audit/_phase-1-1-13b2-audit.json',
  JSON.stringify({
    stats: {
      total_actions: audit.length,
      fill_actions: FILL_SKUS.length,
      delete_null_actions: DELETE_NULL_SKUS.length,
      fill_value: FRAGRANCE_FILL_VALUE,
    },
    actions: audit,
  }, null, 2),
);

console.log('✓ Audit: scripts/audit/_phase-1-1-13b2-audit.json');

if (!APPLY) {
  console.log('--apply flag yok, DB\'ye yazma yapılmadı.');
  process.exit(0);
}

console.log('--apply: transaction başlıyor...');

await sql.begin(async (tx: any) => {
  let fillApplied = 0;
  let deleteApplied = 0;

  for (const r of rows) {
    const specs = { ...(r.specs ?? {}) };
    if (fillSet.has(r.sku)) {
      specs.scent = FRAGRANCE_FILL_VALUE;
      await tx`UPDATE products SET specs = ${specs}::jsonb WHERE sku = ${r.sku}`;
      fillApplied++;
    } else {
      delete specs.scent;
      await tx`UPDATE products SET specs = ${specs}::jsonb WHERE sku = ${r.sku}`;
      deleteApplied++;
    }
  }

  if (fillApplied !== 8) throw new Error(`Fill apply count expected 8, got ${fillApplied}`);
  if (deleteApplied !== 43) throw new Error(`Delete apply count expected 43, got ${deleteApplied}`);
  console.log(`✓ Transaction OK: ${fillApplied} fill + ${deleteApplied} delete-null`);
});

console.log('✓ Phase 1.1.13B.2 scent cleanup tamamlandı.');
process.exit(0);
