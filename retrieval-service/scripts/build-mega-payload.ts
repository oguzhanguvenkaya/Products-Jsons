// MEGA payload — Faz 1 (A-G) + Faz 3R + Faz 4 + Faz 5 birleştir
// 500 change/batch sınırı staging API'de var, batch'leme uygulanır
import { readFileSync, writeFileSync } from 'fs';

type Change = {
  id: string;
  scope: string;
  sku: string;
  field: string;
  before: unknown;
  after: unknown;
  label?: string;
};

const sources: { path: string; label: string; flat?: boolean }[] = [
  { path: '../data/consolidation/phase1-A-volume-capacity-payload.json', label: 'Faz1A' },
  { path: '../data/consolidation/phase1-B-durability-payload.json', label: 'Faz1B' },
  { path: '../data/consolidation/phase1-C-ph-payload.json', label: 'Faz1C' },
  { path: '../data/consolidation/phase1-D-dilution-payload.json', label: 'Faz1D' },
  { path: '../data/consolidation/phase1-E-consumption-payload.json', label: 'Faz1E' },
  { path: '../data/consolidation/phase1-F-substrate-payload.json', label: 'Faz1F' },
  { path: '../data/consolidation/phase1-G-specs-subtype-drop-payload.json', label: 'Faz1G' },
  { path: '../data/consolidation/phase3R-FINAL-payload.json', label: 'Faz3R' },
  { path: '../data/consolidation/phase4-relations-payload.json', label: 'Faz4', flat: true },
  { path: '../data/consolidation/phase5-faq-merge-payload.json', label: 'Faz5', flat: true },
];

const allChanges: Change[] = [];
const summary: Record<string, number> = {};

for (const src of sources) {
  const json = JSON.parse(readFileSync(src.path, 'utf-8'));
  const changes: Change[] = src.flat ? json.changes : json.batches[0].changes;
  allChanges.push(...changes);
  summary[src.label] = changes.length;
  console.log(`✓ ${src.label}: ${changes.length} change (toplam: ${allChanges.length})`);
}

// Conflict detection: aynı SKU+field birden fazla geçiyor mu?
const seen = new Map<string, Change>();
const conflicts: { sku: string; field: string; ids: string[] }[] = [];
for (const c of allChanges) {
  const key = `${c.sku}|${c.field}`;
  if (seen.has(key)) {
    const prev = seen.get(key)!;
    conflicts.push({ sku: c.sku, field: c.field, ids: [prev.id, c.id] });
  } else {
    seen.set(key, c);
  }
}
console.log(`\n=== Conflict check ===`);
console.log(`Toplam ${allChanges.length} change, ${conflicts.length} conflict (aynı SKU+field)`);
if (conflicts.length > 0 && conflicts.length <= 10) {
  for (const c of conflicts.slice(0, 10)) console.log(`  ${c.sku} ${c.field}: ${c.ids.join(' vs ')}`);
}

// Batch'le (500 max)
const BATCH_SIZE = 500;
const batches: Change[][] = [];
for (let i = 0; i < allChanges.length; i += BATCH_SIZE) {
  batches.push(allChanges.slice(i, i + BATCH_SIZE));
}
console.log(`\n=== Batch breakdown ===`);
for (let i = 0; i < batches.length; i++) console.log(`  Batch ${i + 1}: ${batches[i].length} change`);

writeFileSync('../data/consolidation/MEGA-payload.json', JSON.stringify({
  total_changes: allChanges.length,
  batch_count: batches.length,
  source_summary: summary,
  conflict_count: conflicts.length,
  batches: batches.map(changes => ({ changes })),
}, null, 2));
console.log(`\n✓ MEGA: ${allChanges.length} change, ${batches.length} batch yazıldı`);
process.exit(0);
