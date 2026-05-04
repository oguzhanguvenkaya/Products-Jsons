// Phase 1.1.13P — car_shampoo ürünlerine kostik_free meta key backfill
//
// Felsefe: "kostik içerir mi" gibi sorgular için DB'ye meta key + slot extractor
// (gelecek faz) genişlemesi. Prompt'a sıfır satır eklemek gerekir.
//
// İşlem:
//   1. car_shampoo 28 ürünün mevcut meta key'lerini listele
//   2. silikon/kostik/free/solvent benzeri var mı tespit et (varsa sil önerisi)
//   3. Her ürüne kostik_free=true meta ekle (varsayılan, user varsayımı)
//   4. ph_category='alkali' olanlar için UYARI bayrağı (kostik olabilir, manuel review)
//
// İki mod:
//   bun run scripts/phase-1-1-13p-shampoo-kostik-free.ts          → audit (read-only)
//   bun run scripts/phase-1-1-13p-shampoo-kostik-free.ts --apply  → audit + UPDATE
//
// Guard: car_shampoo rowcount != 28 → abort

import { sql } from '../src/lib/db.ts';
import { writeFileSync, mkdirSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
mkdirSync('scripts/audit', { recursive: true });

console.log(`Mode: ${APPLY ? '--apply (DB UPDATE)' : 'audit only (read-only)'}\n`);

// === 1) Tüm car_shampoo ürünlerini çek ===
const products = await sql<any[]>`
  SELECT p.sku, p.brand, p.name,
    (SELECT value_text FROM product_meta WHERE sku = p.sku AND key = 'ph_category') AS ph_category,
    (SELECT value_numeric FROM product_meta WHERE sku = p.sku AND key = 'ph_level') AS ph_level
  FROM products p
  WHERE p.template_group = 'car_shampoo'
  ORDER BY p.brand, p.name
`;

console.log(`=== car_shampoo ürünleri (${products.length}) ===\n`);

if (products.length !== 28) {
  console.error(`❌ ABORT: 28 car_shampoo bekleniyor, ${products.length} bulundu.`);
  await sql.end();
  process.exit(1);
}

// === 2) Mevcut "kostik/silicone/free" benzeri meta key var mı ===
const existingFlagKeys = await sql<any[]>`
  SELECT DISTINCT pm.key, COUNT(*)::int AS cnt
  FROM product_meta pm
  JOIN products p ON p.sku = pm.sku
  WHERE p.template_group = 'car_shampoo'
    AND (pm.key ILIKE '%silicon%' OR pm.key ILIKE '%kostik%' OR pm.key ILIKE '%caustic%'
      OR pm.key ILIKE '%free%' OR pm.key ILIKE '%solvent%')
  GROUP BY pm.key
`;

console.log(`Mevcut "free/silicon/kostik/solvent" benzeri meta key'ler:`);
if (existingFlagKeys.length === 0) {
  console.log(`  (yok — temiz başlangıç)`);
} else {
  for (const k of existingFlagKeys) {
    console.log(`  - ${k.key}: ${k.cnt} ürün`);
  }
}

// === 3) Tüm ürünleri sınıflandır ===
const lines: string[] = [];
lines.push(`# Phase 1.1.13P — Audit Raporu`);
lines.push(``);
lines.push(`**Tarih:** ${new Date().toISOString().slice(0,10)}`);
lines.push(`**Mode:** ${APPLY ? 'APPLY' : 'AUDIT'}`);
lines.push(`**Toplam car_shampoo:** ${products.length}`);
lines.push(``);
lines.push(`## Ürün Durum Tablosu (kostik_free aday değer)`);
lines.push(``);
lines.push(`| # | SKU | Brand | name (ilk 50) | ph_category | ph_level | kostik_free öneri |`);
lines.push(`|---|---|---|---|---|---|---|`);

const setTrue: string[] = [];
const setManualReview: { sku: string; reason: string }[] = [];

for (let i = 0; i < products.length; i++) {
  const p = products[i];
  let kostikFree = true;
  let reason = '';

  // Heuristik: ph_category=alkali → potansiyel kostik (manuel review)
  if (p.ph_category === 'alkali') {
    kostikFree = false;
    reason = 'ph_category=alkali → potansiyel kostik';
    setManualReview.push({ sku: p.sku, reason });
  } else {
    setTrue.push(p.sku);
  }

  const flag = kostikFree ? '✅ true' : '⚠️ MANUEL REVIEW (false aday)';
  lines.push(
    `| ${i+1} | \`${p.sku}\` | ${p.brand} | ${(p.name || '').slice(0, 50)}... | ${p.ph_category || '∅'} | ${p.ph_level || '∅'} | ${flag} |`,
  );
}

lines.push(``);
lines.push(`## Özet`);
lines.push(``);
lines.push(`- **kostik_free=true otomatik:** ${setTrue.length} ürün`);
lines.push(`- **Manuel review (alkali):** ${setManualReview.length} ürün`);
if (setManualReview.length > 0) {
  lines.push(``);
  lines.push(`### Manuel Review Listesi`);
  for (const m of setManualReview) {
    lines.push(`- \`${m.sku}\` — ${m.reason}`);
  }
  lines.push(``);
  lines.push(`**Not:** Bu script alkali ürünlere otomatik \`kostik_free=false\` set eder. Eğer bunlar gerçekte kostik İÇERMİYORSA (sadece pH alkali = "yumuşak alkali" ise), manuel olarak \`kostik_free=true\`'a güncellenmesi gerek.`);
}

const reportPath = `scripts/audit/phase-1-1-13p-${new Date().toISOString().slice(0,10)}.md`;
writeFileSync(reportPath, lines.join('\n'));
console.log(`\n📄 Audit raporu: ${reportPath}`);

console.log(`\n=== Özet ===`);
console.log(`  kostik_free=true (auto): ${setTrue.length}`);
console.log(`  kostik_free=false (alkali, manuel review aday): ${setManualReview.length}`);

if (!APPLY) {
  console.log(`\n💡 DB değişikliği yapılmadı (audit mode). Apply için: --apply flag\n`);
  await sql.end();
  process.exit(0);
}

// === 4) APPLY MODE: DB'ye UPSERT ===
console.log(`\n=== APPLY: DB UPDATE başlıyor ===`);

// Atomic transaction
await sql.begin(async (tx) => {
  let trueCount = 0;
  let falseCount = 0;

  for (const p of products) {
    const isAlkali = p.ph_category === 'alkali';
    const value = !isAlkali; // true (kostik içermez) or false (kostik içerebilir, alkali)

    await tx`
      INSERT INTO product_meta (sku, key, value_boolean)
      VALUES (${p.sku}, 'kostik_free', ${value})
      ON CONFLICT (sku, key) DO UPDATE SET
        value_boolean = EXCLUDED.value_boolean,
        value_text = NULL,
        value_numeric = NULL
    `;

    if (value) trueCount++;
    else falseCount++;
  }

  console.log(`  UPSERT: ${trueCount} kostik_free=true, ${falseCount} kostik_free=false`);

  // Doğrulama
  const verify = await tx<any[]>`
    SELECT COUNT(*)::int AS cnt
    FROM product_meta pm
    JOIN products p ON p.sku = pm.sku
    WHERE p.template_group = 'car_shampoo' AND pm.key = 'kostik_free'
  `;
  if (verify[0].cnt !== products.length) {
    throw new Error(`Verification failed: ${verify[0].cnt} kostik_free row, beklenen ${products.length}`);
  }
  console.log(`  ✅ Verification: ${verify[0].cnt}/${products.length} kostik_free meta kaydı oluştu`);
});

console.log(`\n✅ APPLY tamamlandı.`);
console.log(`💡 Sonraki adım: Fly retrieval-service redeploy (slot extractor değişmediyse opsiyonel — DB hazır)\n`);
await sql.end();
