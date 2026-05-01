// Phase 1.1.13D — compatibility consolidation + 32 X_safe/compat key cleanup
//
// Aksiyon kategorileri:
//   A. KESİN SİL (5 key, NULL ağırlıklı, bilgi kaybı YOK)
//   B. SİL + TRUE bilgisi compatibility'ye merge (18 key, ~30 ürün)
//   C. SİL + bilgisi target_surfaces'a merge (3 key, 9 ürün)
//   D. SİL + compatibility free-text merge (6 key, ~75 ürün — machine_compatibility dahil)
//   E. KORU (2 key: food_safe, safety_valve)
//   F. compatibility mevcut 10 ürün canonical Türkçe normalize
//
// İki mod:
//   bun run scripts/phase-1-1-13d-compat-consolidation.ts          → audit
//   bun run scripts/phase-1-1-13d-compat-consolidation.ts --apply  → audit + transactional UPDATE

import { writeFileSync, mkdirSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');
mkdirSync('scripts/audit', { recursive: true });

// === A: NULL ağırlıklı SİL ===
const A_DELETE_KEYS = [
  'safe_on_screens', 'safe_on_surfaces', 'compatible_with_ceramic_coatings',
  'irl_safe', 'glass_safe',
];

// === B: SİL + TRUE → compat'a merge (boolean veya tek değer) ===
// Format: { key: string, true_token: string | null (null=ihmal/sil) }
const B_BOOLEAN_KEYS: Array<{ key: string; true_token: string | null }> = [
  { key: 'ppf_safe',            true_token: 'ppf' },
  { key: 'safe_on_ppf',         true_token: 'ppf' },
  { key: 'coating_safe',        true_token: 'seramik kaplama' },
  { key: 'safe_on_paint',       true_token: 'boya' },
  { key: 'safe_on_plastic',     true_token: 'plastik' },
  { key: 'plastic_safe',        true_token: 'plastik' },
  { key: 'safe_on_tint',        true_token: 'cam filmi' },
  { key: 'mat_safe',            true_token: 'mat boya' },
  { key: 'matte_safe',          true_token: 'mat boya' },
  { key: 'tarpaulin_safe',      true_token: 'branda' },
  { key: 'osmosis_compatible',  true_token: null }, // bilgi kaybı kabul
  { key: 'substrate_safe',      true_token: null }, // target_surfaces zaten tutuyor
  { key: 'bodyshop_safe',       true_token: 'boyahane güvenli' },
  { key: 'safe_for_soft_paint', true_token: 'yumuşak boya güvenli' },
  { key: 'safety_edge',         true_token: null }, // parça feature, compat'a girmez
  { key: 'child_pet_safe',      true_token: 'çocuk evcil güvenli' },
  { key: 'scratch_safe',        true_token: 'çizik yapmaz' },
  { key: 'wet_sanding_safe',    true_token: 'ıslak zımpara' },
];

// === C: SİL + bilgisi target_surfaces'a merge (array → Türkçe canonical) ===
const C_ARRAY_KEYS = ['safe_for', 'safe_surfaces', 'compatible_surfaces'];

// Türkçe canonical normalize map (Phase 1.1.13A canonical ile uyumlu)
const TR_CANONICAL: Record<string, string> = {
  // Yüzeyler
  'jant': 'jant', 'krom': 'krom',
  'boyalı yüzeyler': 'boyalı yüzey', 'boyalı yüzey': 'boyalı yüzey', 'boyalı sac': 'boya',
  'deri': 'deri', 'plastik': 'plastik', 'vinil': 'vinil', 'vinil kaplama': 'vinil kaplama',
  'lastik': 'lastik', 'davlumbaz': 'davlumbaz', 'paspas': 'paspas', 'kauçuk': 'kauçuk',
  'cam': 'cam', 'kristal': 'kristal', 'lake mobilya': 'lake mobilya',
  'vernik': 'vernik', 'alüminyum': 'alüminyum', 'şeffaf plastik': 'şeffaf plastik',
  'alcantara': 'alcantara', 'değerli metaller': 'değerli metaller',
};

function tokensToCanonical(tokens: string[]): string[] {
  return tokens.map(t => {
    const lower = t.trim().toLocaleLowerCase('tr');
    return TR_CANONICAL[lower] ?? lower; // bilinmiyorsa lowercase aynen al
  });
}

// === D: SİL + compatibility free-text merge ===
// Bunlar TRUE değerleri direkt compat'a (string/array) eklenir
const D_FREETEXT_KEYS = [
  'compatible_device', 'machine_compatible', 'compatible_machine',
  'compatible_product', 'compatible_with', 'machine_compatibility',
];

// === F: compatibility mevcut 10 ürün Türkçe canonical normalize ===
const F_CANONICAL_MAPPING: Record<string, string[]> = {
  '700507': ['seramik kaplama'],
  '71490': ['seramik kaplama'],
  '79290': ['seramik kaplama'],
  'Q2M-EW1000M': ['seramik kaplama'],
  'Q2M-RWYA1000M': ['seramik kaplama'],
  'PPF-L500M': ['ppf', 'vinil'],
  'Q2M-PPFSL4000M': ['ppf', 'vinil'],
  // 3 aksesuar (KORU mevcut free-text):
  'SGGD135': ['Karcher K Serisi'],
  '81671901': ['IK 1.5/2 litre tanklar'],
  'SGPM008': ['10 cm standart ragleler'],
};

const ALL_DELETE_KEYS = [
  ...A_DELETE_KEYS,
  ...B_BOOLEAN_KEYS.map(b => b.key),
  ...C_ARRAY_KEYS,
  ...D_FREETEXT_KEYS,
];

console.log(`Mode: ${APPLY ? '--apply (audit + UPDATE)' : 'audit only'}`);
console.log(`SİL listesi: ${ALL_DELETE_KEYS.length} key (A:${A_DELETE_KEYS.length} + B:${B_BOOLEAN_KEYS.length} + C:${C_ARRAY_KEYS.length} + D:${D_FREETEXT_KEYS.length})\n`);

// === Compat merge planı topla — sku → tokens (canonical + free-text) + new compat ===
const skuCompat = new Map<string, { canonical: Set<string>; freetext: Set<string> }>();

function addToken(sku: string, token: string, isFreeText = false) {
  if (!skuCompat.has(sku)) skuCompat.set(sku, { canonical: new Set(), freetext: new Set() });
  const e = skuCompat.get(sku)!;
  if (isFreeText) e.freetext.add(token);
  else e.canonical.add(token);
}

// F: mevcut compatibility canonical mapping
for (const [sku, tokens] of Object.entries(F_CANONICAL_MAPPING)) {
  for (const t of tokens) {
    // SGGD135/81671901/SGPM008 free-text aksesuar
    const isFreeText = ['SGGD135', '81671901', 'SGPM008'].includes(sku);
    addToken(sku, t, isFreeText);
  }
}

// B: boolean key TRUE değerleri (true_token != null olanlar)
for (const b of B_BOOLEAN_KEYS) {
  if (!b.true_token) continue;
  const r = await sql<any[]>`
    SELECT sku FROM products
    WHERE specs->>${b.key} = 'true'
       OR (jsonb_typeof(specs->${b.key}) = 'boolean' AND (specs->${b.key})::text = 'true')
  `;
  for (const x of r) addToken(x.sku, b.true_token!, false); // canonical
}

// D: free-text + array değerleri compat'a merge
for (const k of D_FREETEXT_KEYS) {
  const r = await sql<any[]>`SELECT sku, specs->${k} AS v FROM products WHERE specs ? ${k}`;
  for (const x of r as any[]) {
    const v = x.v;
    if (v === null || v === undefined) continue;
    if (typeof v === 'boolean') {
      if (v === true) addToken(x.sku, 'makine', false); // machine_compatible:true
      // false ihmal
    } else if (Array.isArray(v)) {
      for (const item of v) {
        const tok = String(item).trim();
        if (tok.length > 0) {
          // machine_compatibility lowercase (rotary, orbital)
          const out = k === 'machine_compatibility' ? tok.toLocaleLowerCase('tr') : tok;
          addToken(x.sku, out, k !== 'machine_compatibility'); // machine_compatibility canonical, diğer free-text
        }
      }
    } else if (typeof v === 'string') {
      const cleaned = v.replace(/^"|"$/g, '').trim(); // JSON-quoted string ise temizle
      if (cleaned.length > 0) addToken(x.sku, cleaned, true); // free-text
    }
  }
}

// C: target_surfaces merge planı
interface TargetMerge { sku: string; old_ts: string | null; new_ts: string; }
const targetMerges: TargetMerge[] = [];

for (const k of C_ARRAY_KEYS) {
  const r = await sql<any[]>`SELECT sku, specs->>'target_surfaces' AS old_ts, specs->${k} AS v FROM products WHERE specs ? ${k}`;
  for (const x of r as any[]) {
    const v = x.v;
    if (!Array.isArray(v) || v.length === 0) continue;
    const cTokens = tokensToCanonical(v);
    const oldTokens = (x.old_ts ?? '').split('|').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    const merged = new Set<string>([...oldTokens, ...cTokens]);
    const newTs = '|' + Array.from(merged).join('|') + '|';
    if (newTs !== x.old_ts) targetMerges.push({ sku: x.sku, old_ts: x.old_ts, new_ts: newTs });
  }
}

// === Audit ===
const compatPlan: Array<{ sku: string; new_compat: string[] }> = [];
for (const [sku, e] of skuCompat.entries()) {
  const all = [...e.canonical, ...e.freetext];
  if (all.length > 0) compatPlan.push({ sku, new_compat: all });
}

const audit = {
  stats: {
    delete_keys: ALL_DELETE_KEYS.length,
    compat_changes: compatPlan.length,
    target_merges: targetMerges.length,
  },
  delete_keys: ALL_DELETE_KEYS,
  compat_changes: compatPlan,
  target_merges: targetMerges,
};

writeFileSync('scripts/audit/_phase-1-1-13d-audit.json', JSON.stringify(audit, null, 2));

console.log('=== STATS ===');
console.log(JSON.stringify(audit.stats, null, 2));
console.log('\n✓ Audit JSON: scripts/audit/_phase-1-1-13d-audit.json');
console.log(`\nCompat değişikliği: ${compatPlan.length} ürün`);
console.log(`Target merge: ${targetMerges.length} ürün`);
console.log(`SİL: ${ALL_DELETE_KEYS.length} key (etkilenen ürün sayısı re-project sonrası kontrol)`);

if (!APPLY) {
  console.log('\n--apply flag yok, DB güncellenmedi.');
  process.exit(0);
}

// === Apply (transaction) ===
console.log(`\n--apply: transaction başlıyor...`);

await sql.begin(async (tx: any) => {
  // 1. Target merges (C)
  let nT = 0;
  for (const t of targetMerges) {
    await tx`UPDATE products SET specs = jsonb_set(specs, '{target_surfaces}', to_jsonb(${t.new_ts}::text), true) WHERE sku = ${t.sku}`;
    nT++;
  }
  console.log(`  ✓ Target merge: ${nT} ürün`);

  // 2. Compat updates (B + D + F)
  let nC = 0;
  for (const p of compatPlan) {
    const jsonArr = JSON.stringify(p.new_compat);
    await tx`UPDATE products SET specs = jsonb_set(specs, '{compatibility}', ${jsonArr}::jsonb, true) WHERE sku = ${p.sku}`;
    nC++;
  }
  console.log(`  ✓ Compat update: ${nC} ürün`);

  // 3. SİL: 32 key
  let nD = 0;
  for (const k of ALL_DELETE_KEYS) {
    const r = await tx`UPDATE products SET specs = specs - ${k} WHERE specs ? ${k} RETURNING sku`;
    nD += r.length;
  }
  console.log(`  ✓ Key SİL: ${nD} row toplam (${ALL_DELETE_KEYS.length} key × etkilenen ürün)`);
});

// === Post-apply verify ===
console.log(`\n=== POST-APPLY VERIFY ===`);
let totalRemaining = 0;
for (const k of ALL_DELETE_KEYS) {
  const r = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? ${k}`;
  totalRemaining += Number(r[0].c);
}
console.log(`  Silinen 32 key kalan toplam ürün: ${totalRemaining} (beklenen 0) ${totalRemaining === 0 ? '✓' : '✗'}`);

const compatTotal = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'compatibility'`;
console.log(`  compatibility ürün: ${compatTotal[0].c}`);

const koruFood = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'food_safe'`;
const koruValve = await sql`SELECT COUNT(*) AS c FROM products WHERE specs ? 'safety_valve'`;
console.log(`  KORU: food_safe=${koruFood[0].c} (1) safety_valve=${koruValve[0].c} (17)`);

console.log(`\n✓ Phase 1.1.13D migration tamamlandı.`);
process.exit(0);
