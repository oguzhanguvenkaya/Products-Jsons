// Phase 1.1.11 Faz C.1 — proposals/*.json → _review-table.md birleştirme
//
// Çıktı: scripts/audit/_review-table.md
// Format: her ürün için 5 blok (fill/update/skip/data_gap/category_mismatch).
// Her satıra checkbox prefix: [ ] (kullanıcı [x] yapacak)
// skip + data_gap default işaretsiz (action gerektirmez); fill/update/category_mismatch onay gerektirir.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const PROPOSALS_DIR = 'scripts/audit/proposals';
const OUT = 'scripts/audit/_review-table.md';

interface Proposal {
  sku: string;
  sources: string[];
  proposed_changes: {
    fill: Array<{ key: string; value: any; evidence: string; confidence?: string }>;
    update: Array<{ key: string; current: any; proposed: any; evidence: string; confidence?: string }>;
    skip: Array<{ key: string; current: any; evidence?: string }>;
    data_gap: Array<{ key: string; reason: string }>;
    category_mismatch: Array<{ key: string; reason: string }>;
  };
  notes?: string;
}

const files = readdirSync(PROPOSALS_DIR).filter((f) => f.endsWith('.json')).sort();
const proposals: Proposal[] = files.map((f) => JSON.parse(readFileSync(`${PROPOSALS_DIR}/${f}`, 'utf-8')));

// DB'den ürün bilgilerini çek (isim/marka/sub_type)
const skus = proposals.map((p) => p.sku);
const products = await sql<any[]>`
  SELECT sku, name, brand, template_group, template_sub_type
  FROM products WHERE sku = ANY(${skus})
`;
const productMap = new Map(products.map((p) => [p.sku, p]));

const lines: string[] = [];
lines.push(`# Phase 1.1.11 — Review Table`);
lines.push(``);
lines.push(`Toplam ${proposals.length} ürün. Her ürün için 5 karar bloğu (fill/update/skip/data_gap/category_mismatch).`);
lines.push(``);
lines.push(`**Onay protokolü:**`);
lines.push(`- \`[x]\` → değişikliği ONAYLA (DB'ye yazılır)`);
lines.push(`- \`[ ]\` → REDDET (DB'ye yazılmaz)`);
lines.push(`- \`fill\` ve \`update\` default ✓ işaretli geliyor — istemediklerini \`[ ]\` yap`);
lines.push(`- \`skip\` (no-op) — checkbox yok, sadece bilgi`);
lines.push(`- \`data_gap\` — checkbox yok, sadece eksik veri raporu (sen elle dolduracaksın)`);
lines.push(`- \`category_mismatch\` default ✓ işaretli — onaylananlar product_meta + specs'ten SİLİNİR`);
lines.push(``);
lines.push(`---`);
lines.push(``);

// Toplam istatistik
const stats = {
  fill: 0, update: 0, skip: 0, data_gap: 0, category_mismatch: 0,
};
for (const p of proposals) {
  stats.fill += p.proposed_changes.fill.length;
  stats.update += p.proposed_changes.update.length;
  stats.skip += p.proposed_changes.skip.length;
  stats.data_gap += p.proposed_changes.data_gap.length;
  stats.category_mismatch += p.proposed_changes.category_mismatch.length;
}
lines.push(`## Toplam İstatistik`);
lines.push(``);
lines.push(`| Karar | Adet |`);
lines.push(`|---|---|`);
lines.push(`| **fill** (yeni doldurma) | ${stats.fill} |`);
lines.push(`| **update** (güncelle) | ${stats.update} |`);
lines.push(`| **skip** (DB doğru, no-op) | ${stats.skip} |`);
lines.push(`| **data_gap** (kaynakta yok) | ${stats.data_gap} |`);
lines.push(`| **category_mismatch** (anlamsız, sil) | ${stats.category_mismatch} |`);
lines.push(``);
lines.push(`Onayını bekleyen toplam: **${stats.fill + stats.update + stats.category_mismatch}** karar.`);
lines.push(``);
lines.push(`---`);
lines.push(``);

function renderValue(v: any): string {
  if (v === null || v === undefined) return '`null`';
  if (typeof v === 'boolean') return `\`${v}\``;
  if (typeof v === 'number') return `\`${v}\``;
  return `\`${String(v).replace(/`/g, "'")}\``;
}

// Her ürün için blok
for (const p of proposals) {
  const prod = productMap.get(p.sku);
  const name = prod?.name ?? '?';
  const brand = prod?.brand ?? '?';
  const subType = prod?.template_sub_type ?? '?';
  const group = prod?.template_group ?? '?';

  lines.push(`## ${p.sku} — ${brand} ${name}`);
  lines.push(``);
  lines.push(`**Group:** \`${group}\` · **Sub Type:** \`${subType}\` · **Sources:** ${p.sources.map((s) => `\`${s}\``).join(', ')}`);
  lines.push(``);

  // FILL
  if (p.proposed_changes.fill.length > 0) {
    lines.push(`### 🟢 fill (${p.proposed_changes.fill.length}) — yeni değer doldur`);
    lines.push(``);
    for (const f of p.proposed_changes.fill) {
      const conf = f.confidence ? ` [${f.confidence}]` : '';
      lines.push(`- [x] \`${f.key}\` = ${renderValue(f.value)}${conf}`);
      lines.push(`  - **evidence:** ${f.evidence}`);
    }
    lines.push(``);
  }

  // UPDATE
  if (p.proposed_changes.update.length > 0) {
    lines.push(`### 🟡 update (${p.proposed_changes.update.length}) — mevcut değeri güncelle`);
    lines.push(``);
    for (const u of p.proposed_changes.update) {
      const conf = u.confidence ? ` [${u.confidence}]` : '';
      lines.push(`- [x] \`${u.key}\`: ${renderValue(u.current)} → ${renderValue(u.proposed)}${conf}`);
      lines.push(`  - **evidence:** ${u.evidence}`);
    }
    lines.push(``);
  }

  // CATEGORY_MISMATCH
  if (p.proposed_changes.category_mismatch.length > 0) {
    lines.push(`### 🔴 category_mismatch (${p.proposed_changes.category_mismatch.length}) — bu key bu üründe anlamsız, SİL`);
    lines.push(``);
    for (const c of p.proposed_changes.category_mismatch) {
      lines.push(`- [x] \`${c.key}\` SİL`);
      lines.push(`  - **reason:** ${c.reason}`);
    }
    lines.push(``);
  }

  // SKIP
  if (p.proposed_changes.skip.length > 0) {
    lines.push(`### ⚪ skip (${p.proposed_changes.skip.length}) — DB doğru, no-op`);
    lines.push(``);
    const skipKeys = p.proposed_changes.skip.map((s) => `\`${s.key}\`=${renderValue(s.current)}`).join(', ');
    lines.push(skipKeys);
    lines.push(``);
  }

  // DATA_GAP
  if (p.proposed_changes.data_gap.length > 0) {
    lines.push(`### 🟣 data_gap (${p.proposed_changes.data_gap.length}) — kaynakta yok, sen elle doldur`);
    lines.push(``);
    for (const d of p.proposed_changes.data_gap) {
      lines.push(`- \`${d.key}\` — ${d.reason}`);
    }
    lines.push(``);
  }

  if (p.notes) {
    lines.push(`> **Notes:** ${p.notes}`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
}

writeFileSync(OUT, lines.join('\n'));
console.log(`✓ Yazıldı: ${OUT}`);
console.log(`  Toplam: ${proposals.length} ürün`);
console.log(`  Onayını bekleyen karar: ${stats.fill + stats.update + stats.category_mismatch}`);
console.log(`    fill: ${stats.fill}, update: ${stats.update}, category_mismatch: ${stats.category_mismatch}`);
console.log(`  Bilgi: skip: ${stats.skip}, data_gap: ${stats.data_gap}`);
process.exit(0);
