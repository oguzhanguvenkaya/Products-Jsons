/**
 * scripts/seed.ts — 7 CSV → 7 ADK tablosu seed script'i
 *
 * Çalıştırma (detailagent klasöründen):
 *   adk run scripts/seed.ts
 *
 * Bu script Cloud'daki 7 tabloya (Adk dev veya deploy ile provision edilmiş olmalı)
 * output/csv/ altındaki CSV verilerini batch'lerle yükler.
 *
 * NOT: Tablolar zaten boş olmalı. İkinci kez çalıştırırsan duplicate kayıt riski var.
 *      Idempotent değil — temiz tablolarla başla.
 *
 * Toplam ~5,304 satır:
 *   products_master       — 622
 *   product_specs         — 622
 *   product_faq           — 2,119
 *   product_relations     — 622
 *   product_search_index  — 622
 *   product_categories    — 75
 *   product_content       — 622
 */

import { client } from '@botpress/runtime';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

// Proje köküne göre output/csv yolunu çöz.
// __dirname yaklaşımı yerine, detailagent'tan iki üst klasör (Botpress/detailagent → Products Jsons)
const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const CSV_DIR = resolve(PROJECT_ROOT, 'output', 'csv');

// Botpress createTableRows API: maxItems 1000 per call. Güvenli batch: 100.
const BATCH_SIZE = 100;

type Transformer = (row: Record<string, string>) => Record<string, unknown>;

const passthrough: Transformer = (row) => row;

const withIntPrice: Transformer = (row) => ({
  ...row,
  price: row.price ? parseInt(row.price, 10) : 0,
});

interface SeedJob {
  csv: string;
  table: string;
  transform: Transformer;
}

const SEED_JOBS: SeedJob[] = [
  { csv: 'products_master.csv', table: 'productsMasterTable', transform: withIntPrice },
  { csv: 'product_specs.csv', table: 'productSpecsTable', transform: passthrough },
  { csv: 'product_faq.csv', table: 'productFaqTable', transform: passthrough },
  { csv: 'product_relations.csv', table: 'productRelationsTable', transform: passthrough },
  { csv: 'product_search_index.csv', table: 'productSearchIndexTable', transform: withIntPrice },
  { csv: 'product_categories.csv', table: 'productCategoriesTable', transform: passthrough },
  { csv: 'product_content.csv', table: 'productContentTable', transform: passthrough },
];

function readCsv(filePath: string): Record<string, string>[] {
  const raw = readFileSync(filePath, 'utf-8');
  // BOM strip (CSV'ler UTF-8 BOM ile başlıyor)
  const cleaned = raw.replace(/^\ufeff/, '');
  return parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

async function seedTable(job: SeedJob): Promise<{ inserted: number; errors: string[] }> {
  const csvPath = resolve(CSV_DIR, job.csv);

  if (!existsSync(csvPath)) {
    return { inserted: 0, errors: [`CSV bulunamadı: ${csvPath}`] };
  }

  const rawRows = readCsv(csvPath);
  const rows = rawRows.map(job.transform);

  if (rows.length === 0) {
    return { inserted: 0, errors: ['CSV boş'] };
  }

  console.log(`\n[${job.table}] ${rows.length} satır yüklenecek (${job.csv})`);

  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    try {
      await client.createTableRows({
        table: job.table,
        rows: batch,
      });
      inserted += batch.length;
      const pct = Math.round((inserted / rows.length) * 100);
      console.log(`  [${job.table}] ${inserted}/${rows.length} (${pct}%)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Batch ${i}-${i + batch.length}: ${msg}`);
      console.error(`  [${job.table}] HATA batch ${i}: ${msg}`);
    }
  }

  return { inserted, errors };
}

async function main() {
  console.log('🌱 detailagent seed başlıyor...');
  console.log(`📂 CSV kaynak: ${CSV_DIR}`);

  const summary: Record<string, { inserted: number; errors: string[] }> = {};
  let totalInserted = 0;
  let totalErrors = 0;

  for (const job of SEED_JOBS) {
    const result = await seedTable(job);
    summary[job.table] = result;
    totalInserted += result.inserted;
    totalErrors += result.errors.length;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ÖZET');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const [table, { inserted, errors }] of Object.entries(summary)) {
    const status = errors.length === 0 ? '✅' : '⚠️';
    console.log(`${status} ${table.padEnd(28)} ${inserted} satır${errors.length > 0 ? ` (${errors.length} hata)` : ''}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`TOPLAM: ${totalInserted} satır yüklendi, ${totalErrors} batch hatası`);

  if (totalErrors > 0) {
    console.log('\n⚠️  Bazı batch\'ler hata aldı. Yukarıdaki hata mesajlarını incele.');
    process.exit(1);
  }

  console.log('\n✅ Seed tamamlandı.');
}

main().catch((err) => {
  console.error('💥 Beklenmedik hata:', err);
  process.exit(1);
});
