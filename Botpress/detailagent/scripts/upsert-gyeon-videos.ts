/**
 * Paket N.1 — Upsert video_url field for GYEON products from CSV to Cloud.
 *
 * Source: output/csv/products_master.csv (has video_url column, 78 GYEON rows filled)
 * Target: productsMasterTable (keyColumn: sku, updates video_url only for primary SKUs in Cloud)
 *
 * Note: After Paket M, Cloud has only primary variants (511 rows). CSV has 511 rows too.
 * We upsert only GYEON rows with non-empty video_url.
 */
import { client } from '@botpress/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const MASTER_CSV = resolve(PROJECT_ROOT, 'output', 'csv', 'products_master.csv');

function readCsv(p: string) {
  const raw = readFileSync(p, 'utf-8').replace(/^\ufeff/, '');
  return parse(raw, {
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
  }) as Record<string, string>[];
}

async function main() {
  console.log('🔧 Paket N.1 — Upsert GYEON video_url to Cloud');

  const rows = readCsv(MASTER_CSV);
  const gyeonWithVideo = rows.filter(
    (r) => (r.brand || '').toUpperCase() === 'GYEON' && (r.video_url || '').trim() !== '',
  );
  console.log(`Loaded ${rows.length} master rows`);
  console.log(`GYEON rows with video_url: ${gyeonWithVideo.length}`);

  // Verify these SKUs exist in Cloud (primary variants after M)
  const cloudCheck = await client.findTableRows({
    table: 'productsMasterTable',
    filter: { sku: { $in: gyeonWithVideo.map((r) => r.sku) } } as any,
    limit: gyeonWithVideo.length,
  });
  const cloudSkus = new Set(cloudCheck.rows.map((r) => r.sku as string));
  const inCloud = gyeonWithVideo.filter((r) => cloudSkus.has(r.sku));
  const notInCloud = gyeonWithVideo.filter((r) => !cloudSkus.has(r.sku));
  console.log(`\nIn Cloud (primary variants): ${inCloud.length}`);
  console.log(`Not in Cloud (non-primary, deleted in M): ${notInCloud.length}`);
  if (notInCloud.length > 0) {
    console.log(`  Sample non-primary with video: ${notInCloud.slice(0, 3).map((r) => r.sku).join(', ')}`);
    console.log(`  (These videos won't be applied — non-primary rows don't exist post-M)`);
  }

  // Upsert ONLY the ones in Cloud
  const prepared = inCloud.map((r) => ({
    ...r,
    price: r.price ? parseInt(r.price, 10) : 0,
  }));

  const BATCH = 25;
  let updated = 0;
  for (let i = 0; i < prepared.length; i += BATCH) {
    const res = await (client as any).upsertTableRows({
      table: 'productsMasterTable',
      rows: prepared.slice(i, i + BATCH),
      keyColumn: 'sku',
    });
    updated += (res?.updated || []).length + (res?.created || []).length;
  }
  console.log(`\n✓ Upserted ${updated}/${prepared.length} rows`);

  // Verify
  const after = await client.findTableRows({
    table: 'productsMasterTable',
    filter: { brand: { $eq: 'GYEON' }, video_url: { $ne: null } } as any,
    limit: 200,
  });
  console.log(`\n📋 Verification: GYEON rows with video_url in Cloud: ${after.rows.length}`);
  if (after.rows.length > 0) {
    const sample = after.rows[0];
    console.log(`   Sample: ${sample.sku} → ${sample.video_url}`);
  }

  console.log('\n✅ Paket N.1 done');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
