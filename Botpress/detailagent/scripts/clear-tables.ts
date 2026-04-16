/**
 * scripts/clear-tables.ts — Tabloları boşalt (silmez, içini siler).
 *
 * deleteTable API runtime'da expose edilmediği için tabloları tamamen silemiyoruz.
 * Bu script satırları siler; tablolar boş kalır. Şema değişikliği için ardından
 * `adk dev` restart → Botpress otomatik migration (kolon ekleme/silme) yapmalı.
 *
 * Çalıştırma:
 *   PATH="$HOME/.bun/bin:$PATH" adk run scripts/clear-tables.ts
 */

import { client } from '@botpress/runtime';

const TABLES_TO_CLEAR = [
  'productsMasterTable',
  'productSearchIndexTable',
  'productContentTable',
  'productSpecsTable',
  'productFaqTable',
  'productRelationsTable',
  'productCategoriesTable',
];

async function clearTable(table: string): Promise<number> {
  // Tüm satırları silmek için `filter: { sku: { $exists: true } }` veya benzeri.
  // productCategoriesTable'da sku yok → main_cat kullan.
  // Hepsinde olan bir alan: createdAt (otomatik).
  const filter =
    table === 'productCategoriesTable'
      ? { main_cat: { $exists: true } }
      : { sku: { $exists: true } };

  try {
    const res = await client.deleteTableRows({
      table,
      filter: filter as Record<string, unknown>,
    });
    // Job-based response (async). res.deletedRows 0 olabilir, job arkada çalışır.
    return res.deletedRows ?? 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Tablo yoksa hata — geç.
    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('does not exist')) {
      console.log(`  ⚠️  ${table} zaten yok, atlanıyor`);
      return 0;
    }
    throw new Error(`${table}: ${msg}`);
  }
}

async function main() {
  console.log('🧹 Tabloları temizliyorum (satırları siliyorum)...');
  console.log();

  let ok = 0;
  let failed = 0;

  for (const table of TABLES_TO_CLEAR) {
    try {
      const deleted = await clearTable(table);
      console.log(`  ✅ ${table} (job queued, ${deleted} satır raporlandı)`);
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ ${msg}`);
      failed++;
    }
  }

  console.log();
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`OK: ${ok}  Failed: ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log();
  console.log('⚠️  Bu async job — birkaç saniye bekle, satırlar arka planda silinir.');
  console.log();
  console.log('Sonraki adımlar:');
  console.log('  1. 10-15 saniye bekle (async delete job\'lar bitsin)');
  console.log('  2. adk dev restart (şema değişikliği tablolarda migration olsun)');
  console.log('  3. adk run scripts/seed.ts (veri yüklenir)');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('💥 Beklenmedik hata:', err);
  process.exit(1);
});
