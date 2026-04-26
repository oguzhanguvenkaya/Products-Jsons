// Faz 1 — Aile G: specs.sub_type drop (164 ürün)
// template_sub_type kolonu zaten var, JSONB içindeki kopya gereksiz
import { sql } from '../src/lib/db.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const rows = await sql<{ sku: string; sub_type: string }[]>`
  SELECT sku, specs->>'sub_type' AS sub_type
  FROM products
  WHERE specs ? 'sub_type'
  ORDER BY sku
`;

console.log(`✓ DB'den ${rows.length} ürün çekildi (specs.sub_type dolu)`);

const changes = rows.map((r) => ({
  id: `phase1G-${r.sku}-specs.sub_type-drop`,
  scope: 'product.specs' as const,
  sku: r.sku,
  field: 'specs.sub_type',
  before: r.sub_type,
  after: null,
  label: 'Phase 1G: redundant specs.sub_type drop (template_sub_type kolonu yeterli)',
}));

const outPath = '../data/consolidation/phase1-G-specs-subtype-drop-payload.json';
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({
  total_changes: changes.length,
  batch_count: 1,
  batches: [{ changes }],
}, null, 2));

console.log(`✓ Payload yazıldı: ${outPath}`);
console.log(`✓ Toplam ${changes.length} change`);
console.log(`\nİlk 5 sample:`);
for (const c of changes.slice(0, 5)) {
  console.log(`  ${c.sku.padEnd(20)} drop specs.sub_type='${c.before}'`);
}
process.exit(0);
