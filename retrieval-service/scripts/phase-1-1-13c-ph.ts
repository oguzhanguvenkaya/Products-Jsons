// Phase 1.1.13C — ph_level numeric normalize + ph_category enum (asidik|nötr|alkali)
//
// İki mod:
//   bun run scripts/phase-1-1-13c-ph.ts           → audit (DB'ye yazmaz, sadece rapor)
//   bun run scripts/phase-1-1-13c-ph.ts --apply   → audit + transactional UPDATE
//
// Kapsam: 60 üründe specs.ph_level dirty (40 distinct format).
// - 48 üründe pure numeric'e normalize edilir + ph_category enum atanır
// - 12 üründe ph_level DELETE (sadece kategori string, sayı yok) + ph_category enum
//
// Eşik: <6 asidik, 6-8 nötr (eşik 6 dahil → nötr), >8 alkali
// SSOT: ph_neutral_shampoo template_sub_type Phase 1.1.10 kararı, dokunulmuyor.
//
// JSON typing: ph_level number olarak yazılır (string değil) — to_jsonb($::numeric).
// Guards: 60 SKU bulundu mu, mevcut değer beklenen eski değerle uyuşuyor mu, ph_category enum dışı mı.

import { writeFileSync, mkdirSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');
mkdirSync('scripts/audit', { recursive: true });

type PhCat = 'asidik' | 'nötr' | 'alkali';
interface Mapping {
  sku: string;
  expected_old: string;
  new_ph_level: number | null; // null = DELETE
  new_ph_category: PhCat;
}

// Per-SKU deterministic mapping (60 ürün)
const MAPPING: Mapping[] = [
  // Asidik (<6) — 6 numeric
  { sku: '75130',         expected_old: 'Asidik (pH < 2)', new_ph_level: 2,    new_ph_category: 'asidik' },
  { sku: '701350',        expected_old: 'Asidik (pH 1.5)', new_ph_level: 1.5,  new_ph_category: 'asidik' },
  { sku: 'Q2M-WSYA1000M', expected_old: 'Asidik (pH 2)',   new_ph_level: 2,    new_ph_category: 'asidik' },
  { sku: '79290',         expected_old: '3 (Asidik)',      new_ph_level: 3,    new_ph_category: 'asidik' },
  { sku: '79301',         expected_old: '3.50',            new_ph_level: 3.5,  new_ph_category: 'asidik' },
  { sku: '71331',         expected_old: '4.75',            new_ph_level: 4.75, new_ph_category: 'asidik' },

  // Nötr (6-8) — 26 numeric
  { sku: '700507',        expected_old: '6.0',             new_ph_level: 6,    new_ph_category: 'nötr' },
  { sku: '700508',        expected_old: '6.0',             new_ph_level: 6,    new_ph_category: 'nötr' },
  { sku: 'Q2M-BPYA1000M', expected_old: '6-7 (Nötr)',      new_ph_level: 6.5,  new_ph_category: 'nötr' },
  { sku: 'Q2M-BYA4000M',  expected_old: '6 (Nötr)',        new_ph_level: 6,    new_ph_category: 'nötr' },
  { sku: 'Q2M-RW1000M',   expected_old: '6 (Hafif Asidik)',new_ph_level: 6,    new_ph_category: 'nötr' },
  { sku: 'Q2M-RWYA1000M', expected_old: '6 (Hafif Asidik)',new_ph_level: 6,    new_ph_category: 'nötr' },
  { sku: '79286',         expected_old: '6.50',            new_ph_level: 6.5,  new_ph_category: 'nötr' },
  { sku: '79298',         expected_old: '6.5',             new_ph_level: 6.5,  new_ph_category: 'nötr' },
  { sku: '79304',         expected_old: '6.5',             new_ph_level: 6.5,  new_ph_category: 'nötr' },
  { sku: '700097',        expected_old: '7.00',            new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: '701851',        expected_old: '7',               new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: '70616',         expected_old: '7',               new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: '71132',         expected_old: 'Nötr (7.0)',      new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: '79284',         expected_old: '7.0 (Nötr)',      new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: '79291',         expected_old: 'Nötr (pH 7)',     new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2-LCR500M',    expected_old: 'Nötr (pH 7)',     new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2M-FYA4000M',  expected_old: 'Nötr (~7)',       new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2M-GPYA1000M', expected_old: 'Nötr (pH 7)',     new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2M-IR4000M',   expected_old: 'Nötr (pH 7)',     new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2M-IWCR4000M', expected_old: 'Nötr (pH 7)',     new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2M-LSN200M',   expected_old: '7',               new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2M-OR500M',    expected_old: '~7 (nötr)',       new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2M-PPFW500M',  expected_old: '7 (Nötr)',        new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2M-QDYA1000M', expected_old: '7',               new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: 'Q2M-TWYA500M',  expected_old: '7 (Nötr)',        new_ph_level: 7,    new_ph_category: 'nötr' },
  { sku: '700468',        expected_old: 'Nötr (7.29)',     new_ph_level: 7.29, new_ph_category: 'nötr' },

  // Alkali (>8) — 16 numeric
  { sku: '79292',         expected_old: '9',                       new_ph_level: 9,     new_ph_category: 'alkali' },
  { sku: '79415',         expected_old: '9.50',                    new_ph_level: 9.5,   new_ph_category: 'alkali' },
  { sku: '79818',         expected_old: '9.5',                     new_ph_level: 9.5,   new_ph_category: 'alkali' },
  { sku: '701980',        expected_old: '10',                      new_ph_level: 10,    new_ph_category: 'alkali' },
  { sku: 'Q2M-FCNA1000M', expected_old: '10',                      new_ph_level: 10,    new_ph_category: 'alkali' },
  { sku: 'Q2M-LSSYA200M', expected_old: '10',                      new_ph_level: 10,    new_ph_category: 'alkali' },
  { sku: '79771',         expected_old: '10.5',                    new_ph_level: 10.5,  new_ph_category: 'alkali' },
  { sku: '76008',         expected_old: 'Alkali (10.5)',           new_ph_level: 10.5,  new_ph_category: 'alkali' },
  { sku: '71490',         expected_old: '10.35 (Alkali)',          new_ph_level: 10.35, new_ph_category: 'alkali' },
  { sku: 'Q2M-TCYA1000M', expected_old: '10 (Alkali)',             new_ph_level: 10,    new_ph_category: 'alkali' },
  { sku: 'Q2M-BGYA1000M', expected_old: 'Alkali (pH 11)',          new_ph_level: 11,    new_ph_category: 'alkali' },
  { sku: '72042',         expected_old: '11.4 (Alkali)',           new_ph_level: 11.4,  new_ph_category: 'alkali' },
  { sku: '79281',         expected_old: '11.50 (Alkali)',          new_ph_level: 11.5,  new_ph_category: 'alkali' },
  { sku: 'Q2M-APYA4000M', expected_old: '12',                      new_ph_level: 12,    new_ph_category: 'alkali' },
  { sku: 'Q2M-LCSYA1000M',expected_old: 'Alkali (pH 12)',          new_ph_level: 12,    new_ph_category: 'alkali' },
  { sku: '700387',        expected_old: '13.9 (Yüksek Alkali)',    new_ph_level: 13.9,  new_ph_category: 'alkali' },

  // Pure category (sayı yok) — 12 ürün, ph_level DELETE + ph_category INSERT
  { sku: '700210',        expected_old: 'Hafif asidik',            new_ph_level: null, new_ph_category: 'asidik' },
  { sku: '700888',        expected_old: 'Asidik',                  new_ph_level: null, new_ph_category: 'asidik' },
  { sku: '70864',         expected_old: 'Nötr (asidik olmayan)',   new_ph_level: null, new_ph_category: 'nötr' },
  { sku: '79293',         expected_old: 'Nötr',                    new_ph_level: null, new_ph_category: 'nötr' },
  { sku: 'Q2M-CLR500M',   expected_old: 'Nötr',                    new_ph_level: null, new_ph_category: 'nötr' },
  { sku: 'Q2M-DT10P',     expected_old: 'Nötr',                    new_ph_level: null, new_ph_category: 'nötr' },
  { sku: 'Q2M-EW1000M',   expected_old: 'Nötr',                    new_ph_level: null, new_ph_category: 'nötr' },
  { sku: 'Q2M-LCN1000M',  expected_old: 'Nötr',                    new_ph_level: null, new_ph_category: 'nötr' },
  { sku: 'Q2M-PM500M',    expected_old: 'Nötr',                    new_ph_level: null, new_ph_category: 'nötr' },
  { sku: 'Q2M-TR4000M',   expected_old: 'Nötr',                    new_ph_level: null, new_ph_category: 'nötr' },
  { sku: 'Q2M-TRC500M',   expected_old: 'Nötr',                    new_ph_level: null, new_ph_category: 'nötr' },
  { sku: '77019',         expected_old: 'Alkali',                  new_ph_level: null, new_ph_category: 'alkali' },
];

// === Guard 1: enum sınırı ===
const VALID_CATS: PhCat[] = ['asidik', 'nötr', 'alkali'];
for (const m of MAPPING) {
  if (!VALID_CATS.includes(m.new_ph_category)) {
    console.error(`✗ Invalid ph_category for ${m.sku}: ${m.new_ph_category}`);
    process.exit(1);
  }
}

// === Guard 2: 60 unique SKU ===
const skuSet = new Set(MAPPING.map(m => m.sku));
if (skuSet.size !== 60 || MAPPING.length !== 60) {
  console.error(`✗ Beklenen 60 unique SKU, gerçek: total=${MAPPING.length} unique=${skuSet.size}`);
  process.exit(1);
}

// === Guard 3: DB'deki mevcut değerle uyum ===
console.log(`Mode: ${APPLY ? '--apply (audit + UPDATE)' : 'audit only'}`);
console.log(`Mapping: ${MAPPING.length} SKU\n`);

const dbRows = await sql<any[]>`SELECT sku, specs->>'ph_level' AS ph_text FROM products WHERE specs ? 'ph_level'`;
const dbMap = new Map(dbRows.map(r => [r.sku, r.ph_text]));

let mismatches = 0;
for (const m of MAPPING) {
  const dbVal = dbMap.get(m.sku);
  if (dbVal === undefined) {
    console.error(`✗ ${m.sku}: DB'de ph_level YOK (mapping bekliyor: '${m.expected_old}')`);
    mismatches++;
  } else if (dbVal !== m.expected_old) {
    console.error(`✗ ${m.sku}: DB değeri '${dbVal}' ≠ mapping bekleneni '${m.expected_old}'`);
    mismatches++;
  }
}

// DB'de var ama mapping'de yok → ekstra ürün
const mappedSkus = new Set(MAPPING.map(m => m.sku));
for (const r of dbRows) {
  if (!mappedSkus.has(r.sku)) {
    console.error(`✗ DB ürünü mapping'de YOK: ${r.sku} (ph_level='${r.ph_text}')`);
    mismatches++;
  }
}

if (mismatches > 0) {
  console.error(`\n✗ ${mismatches} mismatch — abort`);
  process.exit(1);
}
console.log('✓ Guard 1+2+3 OK (60 SKU, mevcut değerler beklenenle eşleşiyor)\n');

// === Audit ===
const stats = {
  total: MAPPING.length,
  ph_level_normalize: 0,
  ph_level_delete: 0,
  ph_category_insert: 0,
  by_category: { asidik: 0, 'nötr': 0, alkali: 0 } as Record<string, number>,
};

interface ChangeLog { sku: string; before: string; after_ph_level: number | null; after_ph_category: PhCat }
const changes: ChangeLog[] = [];

for (const m of MAPPING) {
  if (m.new_ph_level === null) stats.ph_level_delete++;
  else stats.ph_level_normalize++;
  stats.ph_category_insert++;
  stats.by_category[m.new_ph_category]++;
  changes.push({
    sku: m.sku,
    before: m.expected_old,
    after_ph_level: m.new_ph_level,
    after_ph_category: m.new_ph_category,
  });
}

writeFileSync(
  'scripts/audit/_phase-1-1-13c-audit.json',
  JSON.stringify({ stats, changes }, null, 2),
);

console.log('=== STATS ===');
console.log(JSON.stringify(stats, null, 2));
console.log('\n✓ Audit: scripts/audit/_phase-1-1-13c-audit.json');

if (!APPLY) {
  console.log(`\n--apply flag yok, DB'ye yazma yapılmadı.`);
  console.log(`Apply edince ${MAPPING.length} ürün UPDATE edilecek.`);
  process.exit(0);
}

// === Apply (transaction) ===
console.log(`\n--apply: transaction başlıyor (${MAPPING.length} ürün)...`);

await sql.begin(async (tx: any) => {
  let n = 0;
  for (const m of MAPPING) {
    if (m.new_ph_level === null) {
      // ph_level DELETE + ph_category INSERT (tek statement)
      await tx`
        UPDATE products
        SET specs = jsonb_set(specs - 'ph_level', '{ph_category}', to_jsonb(${m.new_ph_category}::text), true)
        WHERE sku = ${m.sku}
      `;
    } else {
      // ph_level numeric (number tipi) + ph_category INSERT
      await tx`
        UPDATE products
        SET specs = jsonb_set(
          jsonb_set(specs, '{ph_level}', to_jsonb(${m.new_ph_level}::numeric), true),
          '{ph_category}',
          to_jsonb(${m.new_ph_category}::text),
          true
        )
        WHERE sku = ${m.sku}
      `;
    }
    n++;
  }
  console.log(`✓ Transaction OK: ${n} ürün UPDATE`);
});

// === Post-apply verify ===
const phNumOk = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'ph_level' AND jsonb_typeof(specs->'ph_level') <> 'number'`;
const phCatCount = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'ph_category'`;
const phCatDistinct = await sql`SELECT specs->>'ph_category' AS c, COUNT(*) AS n FROM products WHERE specs ? 'ph_category' GROUP BY 1 ORDER BY 1`;

console.log(`\n=== POST-APPLY VERIFY ===`);
console.log(`  ph_level non-number: ${phNumOk[0].c} (beklenen 0) ${phNumOk[0].c == 0 ? '✓' : '✗'}`);
console.log(`  ph_category total: ${phCatCount[0].c} (beklenen 60) ${phCatCount[0].c == 60 ? '✓' : '✗'}`);
console.log(`  ph_category distribution:`);
for (const r of phCatDistinct as any[]) console.log(`    ${r.c}: ${r.n}`);

console.log(`\n✓ Phase 1.1.13C migration tamamlandı.`);
console.log(`Sıradaki: project-specs-to-meta.ts SCALAR_KEYS'e ph_category ekle, re-project, search-text regen + embed.`);
process.exit(0);
