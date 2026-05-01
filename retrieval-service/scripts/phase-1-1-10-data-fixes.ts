// Phase 1.1.10 — DB veri zenginleştirme + pH fix
//
// İki mod:
//   bun run scripts/phase-1-1-10-data-fixes.ts          → audit only (default)
//   bun run scripts/phase-1-1-10-data-fixes.ts --apply  → audit + transaction update
//
// Audit JSON: scripts/audit/phase-1-1-10-audit.json (DB-read, name DB'den)
// Update: 8 SKU contains_sio2=true + 9 SKU =false + 1 SKU sub_type + 2 SKU ph_level=7
//
// SKU SSOT: ürün adları DB'den okunur. Plan'da uydurulan adlar yok.
// Önkoşul: project-specs-to-meta.ts SCALAR_KEYS + STALE_KEYS contains_sio2 içermeli.
import { mkdirSync, writeFileSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

mkdirSync('scripts/audit', { recursive: true });

const SKUS_SIO2_TRUE = [
  '26919.271.001', '700096', '700097', '74062', '79304',
  'Q2M-CDYA1000M', 'Q2M-WCYA4000M', 'Q2-QV120M',
];
const SKUS_SIO2_FALSE = [
  '22070.261.001', '22870.261.001', '70545', '71331',
  '74059', '75182', '78779', '79301', 'Q2-W175G',
];
const SKUS_PH = ['71490', '70616', '701851'];
const ALL = [...SKUS_SIO2_TRUE, ...SKUS_SIO2_FALSE, ...SKUS_PH];
const APPLY = process.argv.includes('--apply');

console.log(`Mode: ${APPLY ? '--apply (audit + UPDATE)' : 'audit only'}`);
console.log(`Toplam ${ALL.length} SKU okunacak`);

const rows = await sql<any[]>`
  SELECT sku, name, brand, template_group, template_sub_type,
         specs->>'contains_sio2' as current_sio2,
         specs->>'ph_level' as current_ph
  FROM products WHERE sku = ANY(${ALL})
`;

const found = new Set(rows.map((r) => r.sku));
const missing = ALL.filter((s) => !found.has(s));
if (missing.length > 0) {
  console.error("HATA: DB'de bulunamayan SKU'lar:", missing);
  process.exit(1);
}

const audit = {
  contains_sio2_true: rows
    .filter((r) => SKUS_SIO2_TRUE.includes(r.sku))
    .map((r) => ({
      sku: r.sku,
      name: r.name,
      brand: r.brand,
      template_group: r.template_group,
      template_sub_type: r.template_sub_type,
      current_contains_sio2: r.current_sio2,
      new_value: true,
    })),
  contains_sio2_false: rows
    .filter((r) => SKUS_SIO2_FALSE.includes(r.sku))
    .map((r) => ({
      sku: r.sku,
      name: r.name,
      brand: r.brand,
      template_group: r.template_group,
      template_sub_type: r.template_sub_type,
      current_contains_sio2: r.current_sio2,
      new_value: false,
    })),
  ph_fix: SKUS_PH.map((sku) => {
    const r = rows.find((x) => x.sku === sku)!;
    if (sku === '71490') {
      return {
        sku,
        name: r.name,
        brand: r.brand,
        current_sub_type: r.template_sub_type,
        new_sub_type: 'prewash_foaming_shampoo',
      };
    }
    return {
      sku,
      name: r.name,
      brand: r.brand,
      current_ph: r.current_ph,
      new_ph: 7,
      ...(sku === '701851' && r.current_ph === null
        ? { source: 'manual_decision' }
        : {}),
    };
  }),
};

writeFileSync(
  'scripts/audit/phase-1-1-10-audit.json',
  JSON.stringify(audit, null, 2),
);

console.log(
  `\nAUDIT: ${audit.contains_sio2_true.length} true + ${audit.contains_sio2_false.length} false + ${audit.ph_fix.length} pH`,
);
console.log('Dosya: scripts/audit/phase-1-1-10-audit.json');

if (!APPLY) {
  console.log('\n--apply flag yok, DB\'ye yazma yapılmadı.');
  console.log('Audit JSON\'u inceleyip onay sonrası --apply ile çalıştır.');
  process.exit(0);
}

console.log('\n--apply: transaction başlıyor...');

await sql.begin(async (tx: any) => {
  // contains_sio2 = true (8)
  const r1 = await tx`
    UPDATE products
    SET specs = jsonb_set(COALESCE(specs, '{}'::jsonb), '{contains_sio2}', 'true'::jsonb, true)
    WHERE sku = ANY(${SKUS_SIO2_TRUE})
    RETURNING sku
  `;
  if (r1.length !== 8) {
    throw new Error(`true update count beklenen 8, alınan ${r1.length}`);
  }

  // contains_sio2 = false (9)
  const r2 = await tx`
    UPDATE products
    SET specs = jsonb_set(COALESCE(specs, '{}'::jsonb), '{contains_sio2}', 'false'::jsonb, true)
    WHERE sku = ANY(${SKUS_SIO2_FALSE})
    RETURNING sku
  `;
  if (r2.length !== 9) {
    throw new Error(`false update count beklenen 9, alınan ${r2.length}`);
  }

  // 71490 sub_type
  const r3 = await tx`
    UPDATE products SET template_sub_type='prewash_foaming_shampoo'
    WHERE sku='71490' RETURNING sku
  `;
  if (r3.length !== 1) {
    throw new Error(`71490 sub_type fix bulunamadı (count=${r3.length})`);
  }

  // 70616 + 701851 ph_level=7
  const r4 = await tx`
    UPDATE products
    SET specs = jsonb_set(COALESCE(specs, '{}'::jsonb), '{ph_level}', '7'::jsonb, true)
    WHERE sku IN ('70616','701851')
    RETURNING sku
  `;
  if (r4.length !== 2) {
    throw new Error(`ph_level fix beklenen 2, alınan ${r4.length}`);
  }

  console.log(
    `✓ Transaction OK: ${r1.length} true + ${r2.length} false + ${r3.length} sub_type + ${r4.length} ph`,
  );
});

console.log('\n✓ Step 2b tamamlandı. Sırada Step 3: bun run scripts/project-specs-to-meta.ts');
process.exit(0);
