// Phase 1.1.13B.1 — application_method minimalist normalize
//
// İki mod:
//   bun run scripts/phase-1-1-13b1-application-method.ts          → audit (DB'ye yazmaz)
//   bun run scripts/phase-1-1-13b1-application-method.ts --apply  → audit + transaction
//
// İşlem:
// - 41 SKU'da application_method değerini 6'lı Türkçe enum'a normalize eder.
// - 17 SKU'da application_method key'ini siler (paragraf/equipment/kapsam dışı/null).
// - Audit JSON yazar.
import { mkdirSync, writeFileSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');

const ENUM_BY_SKU: Record<string, string> = {
  // abrasive_polish
  '22029.261.001': 'makine ile',
  '22911.261.001': 'makine ile',
  '22992.261.001': 'makine ile',
  '22200.261.001': 'makine ile',
  '22202.260.001': 'makine ile',
  'Q2M-CM1000M': 'el ve makine',
  '22748.261.001': 'makine ile',
  '22771.261.001': 'makine ile',
  '22828.261.001': 'makine ile',
  '23003.391.001': 'el ve makine',
  'Q2M-GP250M': 'makine ile',
  'Q2M-PPR1000M': 'el ve makine',

  // ceramic_coating
  'Q2-PC100M': 'aplikatör ile',
  'Q2-AF120M': 'aplikatör ile',
  'Q2-VE20M': 'aplikatör ile',
  'MXP-CCN50KS': 'aplikatör ile',
  'MXP-DPCN50KS': 'aplikatör ile',
  'MXP-HC50KS': 'aplikatör ile',
  'Q2-MLE100M': 'aplikatör ile',
  'Q2-OLE100M': 'aplikatör ile',
  'Q2-PLE50M': 'aplikatör ile',
  'Q2-SLE50M': 'aplikatör ile',
  'Q2-CCE200M': 'sprey-sil',

  // paint_protection_quick
  '22070.261.001': 'el ve makine',
  '22870.261.001': 'el ve makine',
  'Q2-W175G': 'aplikatör ile',
  '75016': 'sprey-sil',
  '79301': 'sprey-sil',
  'Q2M-QDYA1000M': 'sprey-sil',
  '78779': 'sprey-durula',
  '700096': 'sprey-sil',
  '700097': 'sprey-sil',
  '74062': 'sprey-sil',
  '75182': 'sprey-sil',
  '79304': 'sprey-durula',
  'Q2M-CDYA1000M': 'sprey-sil',
  'Q2M-CMR500M': 'sprey-sil',
  'Q2M-CRYA250M': 'sprey-sil',
  'Q2M-PPFMR500M': 'sprey-sil',
  'Q2M-WCYA4000M': 'sprey-durula',
  '26919.271.001': 'sprey-sil',
};

const DELETE_SKUS = [
  // abrasive_polish null
  'Q2-PR1000M',

  // ceramic_coating paragraphs
  '79296',
  'Q2-LSE50M',
  'Q2-MTEL50M',
  'Q2-PPFE50M',
  'Q2-TRE30M',
  'Q2-RE30M',

  // paint_protection_quick paragraph/equipment
  'Q2-QV120M',
  '74059',

  // out-of-scope groups
  '701285',
  '70901',
  '73378',
  'Q2M-FCNA1000M',
  '79299',
  'Q2-FCNA400M',
  'Q2M-GPYA1000M',
  'Q2M-PYA4000M',
];

const enumSkus = Object.keys(ENUM_BY_SKU);
const allSkus = [...enumSkus, ...DELETE_SKUS];
const uniqueSkus = new Set(allSkus);
if (uniqueSkus.size !== allSkus.length) {
  throw new Error(`Duplicate SKU in action list: ${allSkus.length - uniqueSkus.size}`);
}
if (enumSkus.length !== 41) throw new Error(`Enum action count expected 41, got ${enumSkus.length}`);
if (DELETE_SKUS.length !== 17) throw new Error(`Delete action count expected 17, got ${DELETE_SKUS.length}`);

mkdirSync('scripts/audit', { recursive: true });

console.log(`Mode: ${APPLY ? '--apply (audit + UPDATE)' : 'audit only'}`);
console.log(`Actions: ${enumSkus.length} enum + ${DELETE_SKUS.length} delete`);

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

const audit = rows.map((r) => {
  const before = r.specs?.application_method ?? null;
  const action = Object.prototype.hasOwnProperty.call(ENUM_BY_SKU, r.sku) ? 'enum' : 'delete';
  const after = action === 'enum' ? ENUM_BY_SKU[r.sku] : null;
  return {
    sku: r.sku,
    name: r.name,
    template_group: r.template_group,
    template_sub_type: r.template_sub_type,
    action,
    before_application_method: before,
    after_application_method: after,
  };
});

writeFileSync(
  'scripts/audit/_phase-1-1-13b1-audit.json',
  JSON.stringify({
    stats: {
      total_actions: audit.length,
      enum_actions: enumSkus.length,
      delete_actions: DELETE_SKUS.length,
    },
    actions: audit,
  }, null, 2),
);

console.log(`✓ Audit: scripts/audit/_phase-1-1-13b1-audit.json`);

if (!APPLY) {
  console.log('--apply flag yok, DB\'ye yazma yapılmadı.');
  process.exit(0);
}

console.log('--apply: transaction başlıyor...');

await sql.begin(async (tx: any) => {
  let enumApplied = 0;
  let deleteApplied = 0;

  for (const r of rows) {
    const specs = { ...(r.specs ?? {}) };
    if (Object.prototype.hasOwnProperty.call(ENUM_BY_SKU, r.sku)) {
      specs.application_method = ENUM_BY_SKU[r.sku];
      await tx`UPDATE products SET specs = ${specs}::jsonb WHERE sku = ${r.sku}`;
      enumApplied++;
    } else {
      delete specs.application_method;
      await tx`UPDATE products SET specs = ${specs}::jsonb WHERE sku = ${r.sku}`;
      deleteApplied++;
    }
  }

  if (enumApplied !== 41) throw new Error(`Enum apply count expected 41, got ${enumApplied}`);
  if (deleteApplied !== 17) throw new Error(`Delete apply count expected 17, got ${deleteApplied}`);
  console.log(`✓ Transaction OK: ${enumApplied} enum + ${deleteApplied} delete`);
});

console.log('✓ Phase 1.1.13B.1 application_method normalize tamamlandı.');
process.exit(0);
