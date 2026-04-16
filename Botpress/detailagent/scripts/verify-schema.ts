/**
 * scripts/verify-schema.ts — Reseed sonrası şema doğrulama.
 * Master ve search_index'ten 1 satır okuyup yeni kolonların DOLU olduğunu kontrol eder.
 */
import { client } from '@botpress/runtime';

async function main() {
  console.log('🔍 Şema doğrulama...');
  console.log();

  // Master — yeni url + template_group/sub_type
  const masterRes = await client.findTableRows({
    table: 'productsMasterTable',
    filter: { sku: { $eq: '22.200.281.001' } }, // Menzerna 400 250ml
    limit: 1,
  });
  const m = masterRes.rows[0];
  if (!m) {
    console.log('  ❌ Menzerna 22.200.281.001 master\'da bulunamadı');
  } else {
    console.log('  📦 products_master row:');
    console.log(`     sku:               ${m.sku}`);
    console.log(`     product_name:      ${(m.product_name as string)?.slice(0, 60)}`);
    console.log(`     brand:             ${m.brand}`);
    console.log(`     template_group:    ${m.template_group}`);
    console.log(`     template_sub_type: ${m.template_sub_type}`);
    console.log(`     url:               ${(m.url as string)?.slice(0, 80) || '(BOŞ)'}`);
  }

  console.log();

  // Search index — yeni sub_cat + template_group + template_sub_type
  const idxRes = await client.findTableRows({
    table: 'productSearchIndexTable',
    filter: { sku: { $eq: '22.200.281.001' } },
    limit: 1,
  });
  const s = idxRes.rows[0];
  if (!s) {
    console.log('  ❌ Menzerna 22.200.281.001 search_index\'te bulunamadı');
  } else {
    console.log('  🔎 product_search_index row:');
    console.log(`     sku:               ${s.sku}`);
    console.log(`     product_name:      ${(s.product_name as string)?.slice(0, 60)}`);
    console.log(`     sub_cat:           ${s.sub_cat}`);
    console.log(`     template_group:    ${s.template_group}`);
    console.log(`     template_sub_type: ${s.template_sub_type}`);
    console.log(`     target_surface:    ${(s.target_surface as string)?.slice(0, 50)}`);
    console.log(`     url:               ${(s.url as string)?.slice(0, 80) || '(BOŞ)'}`);
  }

  console.log();

  // templateGroup filter çalışıyor mu?
  const filterRes = await client.findTableRows({
    table: 'productSearchIndexTable',
    filter: { template_group: { $eq: 'abrasive_polish' } },
    limit: 3,
  });
  console.log(`  🎯 template_group=abrasive_polish filter: ${filterRes.rows.length} ürün`);
  for (const r of filterRes.rows) {
    console.log(`     - ${r.sku}: ${(r.product_name as string)?.slice(0, 60)}`);
  }

  console.log();

  // Menzerna URL kontrolü
  const menzernaRes = await client.findTableRows({
    table: 'productSearchIndexTable',
    filter: { brand: { $eq: 'MENZERNA' }, template_group: { $eq: 'abrasive_polish' } },
    limit: 5,
  });
  console.log(`  🧪 Menzerna abrasive_polish: ${menzernaRes.rows.length} ürün`);
  let urlOk = 0;
  let urlEmpty = 0;
  for (const r of menzernaRes.rows) {
    const url = (r.url as string) || '';
    if (url.length > 0) urlOk++;
    else urlEmpty++;
  }
  console.log(`     URL dolu: ${urlOk}, URL boş: ${urlEmpty}`);

  console.log();
  console.log('✅ Doğrulama tamamlandı.');
}

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
