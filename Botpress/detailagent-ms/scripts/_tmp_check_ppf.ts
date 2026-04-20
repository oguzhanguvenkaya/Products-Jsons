import { client } from '@botpress/runtime';
async function main() {
  const r = await client.findTableRows({
    table: 'productsMasterTable',
    filter: { product_name: { $regex: 'PPF', $options: 'i' } } as any,
    limit: 20,
  });
  console.log(`PPF ürünleri (${r.rows.length}):`);
  const groups = new Set<string>();
  for (const row of r.rows) {
    groups.add(row.template_group as string);
    console.log(`  ${row.sku} | ${(row.product_name as string).slice(0,55)} | group=${row.template_group} / sub=${row.template_sub_type}`);
  }
  console.log(`\nDistinct groups for PPF: [${Array.from(groups).join(', ')}]`);
}
main().catch(e=>{console.error(e);process.exit(1);});
