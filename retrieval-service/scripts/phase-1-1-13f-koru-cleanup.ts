// Phase 1.1.13F — KORU listesi mini cleanup (NULL + format hatası, 2 ürün)
//
// 2 manuel düzeltme:
//   - 26942.099.001 (microfiber/buffing_cloth): NULL → '|boya|boyalı yüzey|çok amaçlı|'
//   - SGGD004 (wash_tools/wash_mitt): 'Otomobil|...' (pipe yok + sadece araç tipi) → '|boya|boyalı yüzey|'
//
// İki mod:
//   bun run scripts/phase-1-1-13f-koru-cleanup.ts          → audit
//   bun run scripts/phase-1-1-13f-koru-cleanup.ts --apply  → audit + transactional UPDATE

import { writeFileSync, mkdirSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');
mkdirSync('scripts/audit', { recursive: true });

interface Mapping {
  sku: string;
  expected_old: string | null;
  new_value: string;
  reason: string;
}

const MAPPING: Mapping[] = [
  {
    sku: '26942.099.001',
    expected_old: null,
    new_value: '|boya|boyalı yüzey|çok amaçlı|',
    reason: 'NULL düzelt — microfiber buffing_cloth boya parlatma için canonical set',
  },
  {
    sku: 'SGGD004',
    expected_old: 'Otomobil|SUV|kamyon|motosiklet|bisiklet|tekne dış yüzeyleri',
    new_value: '|boya|boyalı yüzey|',
    reason: 'Format düzelt + araç tipi tokenları SİL + canonical yüzey ekle (wash_mitt boya yüzeyi için)',
  },
];

console.log(`Mode: ${APPLY ? '--apply (audit + UPDATE)' : 'audit only'}\n`);
console.log(`Mapping: ${MAPPING.length} SKU\n`);

// === Guard 1: 2 unique SKU ===
const skuSet = new Set(MAPPING.map(m => m.sku));
if (skuSet.size !== 2 || MAPPING.length !== 2) {
  console.error(`✗ Beklenen 2 unique SKU, gerçek: total=${MAPPING.length} unique=${skuSet.size}`);
  process.exit(1);
}

// === Guard 2: DB'deki mevcut değerle uyum ===
let mismatches = 0;
for (const m of MAPPING) {
  const r = await sql<any[]>`SELECT specs->>'target_surfaces' AS ts FROM products WHERE sku = ${m.sku}`;
  if (r.length === 0) {
    console.error(`✗ ${m.sku}: ürün DB'de YOK`);
    mismatches++;
    continue;
  }
  const dbVal = r[0].ts;
  if (m.expected_old === null && dbVal !== null) {
    console.error(`✗ ${m.sku}: DB'de target_surfaces dolu ('${dbVal}'), beklenen NULL`);
    mismatches++;
  } else if (m.expected_old !== null && dbVal !== m.expected_old) {
    console.error(`✗ ${m.sku}: DB değeri '${dbVal}' ≠ mapping bekleneni '${m.expected_old}'`);
    mismatches++;
  }
}

if (mismatches > 0) {
  console.error(`\n✗ ${mismatches} mismatch — abort`);
  process.exit(1);
}
console.log('✓ Guard 1+2 OK (2 SKU, mevcut değerler beklenenle eşleşiyor)\n');

// === Audit ===
const audit = {
  stats: { total: MAPPING.length },
  changes: MAPPING.map(m => ({
    sku: m.sku,
    before: m.expected_old,
    after: m.new_value,
    reason: m.reason,
  })),
};

writeFileSync('scripts/audit/_phase-1-1-13f-audit.json', JSON.stringify(audit, null, 2));
console.log('✓ Audit JSON: scripts/audit/_phase-1-1-13f-audit.json\n');

console.log('=== Değişiklikler ===');
for (const m of MAPPING) {
  console.log(`  ${m.sku}: '${m.expected_old}' → '${m.new_value}'`);
  console.log(`    ${m.reason}`);
}

if (!APPLY) {
  console.log(`\n--apply flag yok, DB güncellenmedi.`);
  console.log(`Apply edince: ${MAPPING.length} ürün UPDATE`);
  process.exit(0);
}

// === Apply (transaction) ===
console.log(`\n--apply: transaction başlıyor (${MAPPING.length} ürün)...`);

await sql.begin(async (tx: any) => {
  let n = 0;
  for (const m of MAPPING) {
    await tx`
      UPDATE products
      SET specs = jsonb_set(specs, '{target_surfaces}', to_jsonb(${m.new_value}::text), true)
      WHERE sku = ${m.sku}
    `;
    n++;
  }
  console.log(`✓ Transaction OK: ${n} ürün UPDATE`);
});

// === Post-apply verify ===
console.log(`\n=== POST-APPLY VERIFY ===`);
for (const m of MAPPING) {
  const r = await sql<any[]>`SELECT specs->>'target_surfaces' AS ts FROM products WHERE sku = ${m.sku}`;
  const ok = r[0].ts === m.new_value;
  console.log(`  ${m.sku}: ${ok ? '✓' : '✗'} ts='${r[0].ts}'`);
}

const total = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'target_surfaces'`;
console.log(`\n  Toplam target_surfaces: ${total[0].c} (beklenen 280)`);

console.log('\n✓ Phase 1.1.13F migration tamamlandı.');
process.exit(0);
