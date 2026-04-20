import { client } from '@botpress/runtime';

async function main() {
  // Directly simulate searchByRating handler — bypass autonomous wrapper
  const specsRes = await client.findTableRows({
    table: 'productSpecsTable',
    filter: { template_group: { $eq: 'ceramic_coating' } } as any,
    limit: 200,
  });

  const candidates: Array<{ sku: string; value: number }> = [];
  for (const row of specsRes.rows) {
    try {
      const parsed = JSON.parse(row.specs_object as string);
      const value = parsed?.ratings?.self_cleaning;
      if (typeof value === 'number') {
        candidates.push({ sku: row.sku as string, value });
      }
    } catch {}
  }
  candidates.sort((a, b) => b.value - a.value);

  console.log(`Total ceramic_coating with self_cleaning rating: ${candidates.length}`);
  console.log('Top 5:');
  for (const c of candidates.slice(0, 5)) {
    const m = await client.findTableRows({
      table: 'productsMasterTable',
      filter: { sku: { $eq: c.sku } } as any,
      limit: 1,
    });
    const name = (m.rows[0]?.product_name as string) || '?';
    console.log(`  ${c.sku} | ${c.value}/5 | ${name.slice(0, 60)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
