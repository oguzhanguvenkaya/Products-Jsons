/**
 * scripts/update-urls.ts — v5.5 cerrahi URL upsert.
 *
 * assets/manual_urls.csv'deki 5 SKU için Botpress tablolarındaki url alanını
 * günceller. Tam reseed yapmaz — sadece ilgili satırları upsert eder.
 *
 * Akış:
 *   1. manual_urls.csv'den {sku, url} oku
 *   2. products_master.csv'den bu SKU'ların TAM satırlarını al
 *   3. product_search_index.csv'den aynı SKU'ların satırlarını al
 *   4. Her iki tabloya upsertTableRows ile 5 satırı güncelle
 *   5. findTableRows ile 5 SKU'nun url alanlarının gerçekten dolduğunu doğrula
 *
 * Çalıştırma (detailagent klasöründen):
 *   PATH="$HOME/.bun/bin:$PATH" adk run scripts/update-urls.ts
 */

import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

// Proje köküne göre yollar (detailagent → ../../.. = Products Jsons)
const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const MANUAL_URLS_CSV = resolve(PROJECT_ROOT, 'assets', 'manual_urls.csv');
const MASTER_CSV = resolve(PROJECT_ROOT, 'data', 'csv', 'products_master.csv');
const SEARCH_INDEX_CSV = resolve(PROJECT_ROOT, 'data', 'csv', 'product_search_index.csv');

function readCsv(path: string): Record<string, string>[] {
  const raw = readFileSync(path, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

function coercePrice(row: Record<string, unknown>): Record<string, unknown> {
  const price = row.price;
  if (typeof price === 'string' && price) {
    return { ...row, price: parseInt(price, 10) };
  }
  return row;
}

async function main() {
  console.log('🎯 update-urls.ts — Cerrahi URL upsert');
  console.log();

  // 1. Manuel URL listesini oku
  const manualMappings = readCsv(MANUAL_URLS_CSV);
  const targetSkus = new Set(manualMappings.map((r) => r.sku));
  console.log(`  📥 manual_urls.csv: ${targetSkus.size} SKU`);
  for (const m of manualMappings) {
    console.log(`     - ${m.sku}`);
  }
  console.log();

  // 2. products_master.csv'den hedef satırları al
  const masterRows = readCsv(MASTER_CSV);
  const masterTargets = masterRows
    .filter((r) => targetSkus.has(r.sku))
    .map(coercePrice);
  console.log(`  📋 products_master: ${masterTargets.length}/${targetSkus.size} satır bulundu`);

  // 3. product_search_index.csv'den hedef satırları al
  const indexRows = readCsv(SEARCH_INDEX_CSV);
  const indexTargets = indexRows
    .filter((r) => targetSkus.has(r.sku))
    .map(coercePrice);
  console.log(`  📋 product_search_index: ${indexTargets.length}/${targetSkus.size} satır bulundu`);
  console.log();

  if (masterTargets.length === 0 || indexTargets.length === 0) {
    console.error('❌ Hedef satırlar CSV\'lerde bulunamadı. Önce refresh_data.py koştur.');
    process.exit(1);
  }

  // 4a. Master tablo upsert
  console.log('🔹 productsMasterTable upsert...');
  try {
    const res = await (client as any).upsertTableRows({
      table: 'productsMasterTable',
      rows: masterTargets,
      keyColumn: 'sku',
    });
    console.log(`  ✅ upsertTableRows başarılı`);
    if (res && typeof res === 'object') {
      console.log(`     response: ${JSON.stringify(res).slice(0, 200)}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ upsert error: ${msg}`);
    console.error(`     (fallback için findTableRows + updateTableRows denenebilir)`);
    throw err;
  }
  console.log();

  // 4b. Search index tablo upsert
  console.log('🔹 productSearchIndexTable upsert...');
  try {
    const res = await (client as any).upsertTableRows({
      table: 'productSearchIndexTable',
      rows: indexTargets,
      keyColumn: 'sku',
    });
    console.log(`  ✅ upsertTableRows başarılı`);
    if (res && typeof res === 'object') {
      console.log(`     response: ${JSON.stringify(res).slice(0, 200)}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ upsert error: ${msg}`);
    throw err;
  }
  console.log();

  // 5. Doğrulama — 5 SKU'yu tablolarda sorgula
  console.log('🔍 Doğrulama (findTableRows)...');
  let okMaster = 0;
  let okIndex = 0;
  for (const mapping of manualMappings) {
    const sku = mapping.sku;
    const expectedUrl = mapping.url;

    const mRes = await client.findTableRows({
      table: 'productsMasterTable',
      filter: { sku: { $eq: sku } },
      limit: 1,
    });
    const mRow = mRes.rows[0];
    const mUrl = (mRow?.url as string) || '';
    const mOk = mUrl === expectedUrl;

    const iRes = await client.findTableRows({
      table: 'productSearchIndexTable',
      filter: { sku: { $eq: sku } },
      limit: 1,
    });
    const iRow = iRes.rows[0];
    const iUrl = (iRow?.url as string) || '';
    const iOk = iUrl === expectedUrl;

    if (mOk) okMaster++;
    if (iOk) okIndex++;

    console.log(
      `  ${sku.padEnd(16)} master=${mOk ? '✅' : '❌'} index=${iOk ? '✅' : '❌'}`,
    );
    if (!mOk || !iOk) {
      console.log(`     expected: ${expectedUrl.slice(0, 80)}`);
      console.log(`     master:   ${mUrl.slice(0, 80)}`);
      console.log(`     index:    ${iUrl.slice(0, 80)}`);
    }
  }

  console.log();
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Master ok: ${okMaster}/${manualMappings.length}`);
  console.log(`Index ok:  ${okIndex}/${manualMappings.length}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (okMaster !== manualMappings.length || okIndex !== manualMappings.length) {
    console.error('⚠️  Bazı upsertler başarısız. Yukarıdaki satırları incele.');
    process.exit(1);
  }

  console.log();
  console.log('✅ v5.5 — Cerrahi URL upsert tamamlandı.');
  console.log('   5 SKU artık her iki tabloda da doğru URL ile güncel.');
}

main().catch((err) => {
  console.error('💥 Beklenmedik hata:', err);
  process.exit(1);
});
