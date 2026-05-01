// Phase 1.1.13A — target_surfaces canonical normalize + surface merge/deprecate
//
// İki mod:
//   bun run scripts/phase-1-1-13a-canonical-surfaces.ts          → audit (DB'ye yazmaz)
//   bun run scripts/phase-1-1-13a-canonical-surfaces.ts --apply  → audit + transaction
//
// İşlem:
// 1. mapping JSON yükle (target_surfaces + surface birleşik)
// 2. Tüm 494 ürün:
//    a. specs.target_surfaces parse (pipe veya JSON array)
//    b. specs.surface parse (varsa, JSON array)
//    c. Mapping uygula (mapping[token] varsa canonical'a çevir, yoksa orijinal)
//    d. surface tokenları target_surfaces'a merge
//    e. Deduplicate
//    f. Yeni pipe-separated string
// 3. UPDATE products SET specs = specs - 'surface' || target_surfaces patch
// 4. Audit JSON: changedMappings, identityMappings, unmapped raporu
import { readFileSync, writeFileSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const APPLY = process.argv.includes('--apply');

const mappingFile = JSON.parse(
  readFileSync('scripts/audit/_canonical-mapping-target_surfaces.json', 'utf-8'),
);
const MAPPING: Record<string, string> = mappingFile.mapping;
const UNMAPPED_SET = new Set<string>(mappingFile.unmapped);

console.log(`Mode: ${APPLY ? '--apply (audit + UPDATE)' : 'audit only'}`);
console.log(`Mapping: ${Object.keys(MAPPING).length} entry, ${UNMAPPED_SET.size} unmapped`);

function parseField(v: unknown): string[] {
  if (!v) return [];
  if (typeof v !== 'string') return [];
  if (v.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
    } catch {}
  }
  return v.split('|').map((t) => t.trim()).filter(Boolean);
}

interface ProductChange {
  sku: string;
  before_target_surfaces: string | null;
  before_surface: string | null;
  after_target_surfaces: string;
  changed_tokens: { from: string; to: string }[];
  identity_tokens: string[];
  unmapped_tokens: string[];
  surface_merged: string[]; // surface'tan target_surfaces'a taşınan canonical değerler
}

const changes: ProductChange[] = [];
const stats = {
  total_products: 0,
  changed_products: 0,
  surface_merged: 0,
  total_changed_tokens: 0,
  total_identity_tokens: 0,
  total_unmapped_tokens: 0,
};

const rows = await sql<any[]>`
  SELECT sku, specs FROM products
  WHERE specs ? 'target_surfaces' OR specs ? 'surface'
`;

stats.total_products = rows.length;
console.log(`\nİşlenecek ürün: ${rows.length}`);

const productUpdates: { sku: string; specs: any }[] = [];

for (const r of rows) {
  const specs = (r.specs ?? {}) as Record<string, any>;
  const tsTokens = parseField(specs.target_surfaces);
  const sfTokens = parseField(specs.surface);
  const allTokens = [...tsTokens, ...sfTokens];

  const change: ProductChange = {
    sku: r.sku,
    before_target_surfaces: specs.target_surfaces ?? null,
    before_surface: specs.surface ?? null,
    after_target_surfaces: '',
    changed_tokens: [],
    identity_tokens: [],
    unmapped_tokens: [],
    surface_merged: [],
  };

  const canonicalSet = new Set<string>();
  for (const tok of allTokens) {
    const canonical = MAPPING[tok];
    if (canonical !== undefined) {
      canonicalSet.add(canonical);
      if (canonical === tok) {
        change.identity_tokens.push(tok);
        stats.total_identity_tokens++;
      } else {
        change.changed_tokens.push({ from: tok, to: canonical });
        stats.total_changed_tokens++;
      }
    } else if (UNMAPPED_SET.has(tok)) {
      // Unmapped: legacy aynen kalır (canonical'a girmez ama target_surfaces'ta yer alır)
      canonicalSet.add(tok);
      change.unmapped_tokens.push(tok);
      stats.total_unmapped_tokens++;
    } else {
      // Mapping JSON'da yok ama unmapped listesinde de yok — uyarı, aynen alıkoy
      canonicalSet.add(tok);
      change.unmapped_tokens.push(tok);
      stats.total_unmapped_tokens++;
    }
  }

  // surface tokenlarının canonical'larını ayrıca raporla (audit için)
  if (sfTokens.length > 0) {
    for (const sfTok of sfTokens) {
      const c = MAPPING[sfTok] ?? sfTok;
      change.surface_merged.push(c);
    }
    stats.surface_merged++;
  }

  const newTargetSurfaces = '|' + Array.from(canonicalSet).join('|') + '|';
  change.after_target_surfaces = newTargetSurfaces;

  // Değişiklik var mı?
  const beforeNorm = '|' + tsTokens.join('|') + '|';
  if (beforeNorm !== newTargetSurfaces || sfTokens.length > 0) {
    stats.changed_products++;
    changes.push(change);

    // Apply için new specs
    const newSpecs = { ...specs };
    newSpecs.target_surfaces = newTargetSurfaces;
    delete newSpecs.surface;
    productUpdates.push({ sku: r.sku, specs: newSpecs });
  }
}

writeFileSync(
  'scripts/audit/_phase-1-1-13a-audit.json',
  JSON.stringify({ stats, changes }, null, 2),
);

console.log(`\n=== STATS ===`);
console.log(JSON.stringify(stats, null, 2));
console.log(`\n✓ Audit: scripts/audit/_phase-1-1-13a-audit.json`);

if (!APPLY) {
  console.log(`\n--apply flag yok, DB'ye yazma yapılmadı.`);
  console.log(`Apply edince ${stats.changed_products} ürün UPDATE edilecek.`);
  process.exit(0);
}

console.log(`\n--apply: transaction başlıyor (${productUpdates.length} ürün)...`);

await sql.begin(async (tx: any) => {
  let applied = 0;
  for (const u of productUpdates) {
    await tx`UPDATE products SET specs = ${u.specs}::jsonb WHERE sku = ${u.sku}`;
    applied++;
  }
  console.log(`✓ Transaction OK: ${applied} ürün UPDATE`);
});

console.log(`\n✓ Faz B tamamlandı.`);
console.log(`Sıradaki: Faz C (projector update + re-project)`);
process.exit(0);
