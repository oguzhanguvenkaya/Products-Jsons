import { client } from '@botpress/runtime';
async function main() {
  for (const term of ['Dory','Marin','Tekne','Polish Aroma','degreas']) {
    const r = await client.findTableRows({
      table: 'productsMasterTable',
      filter: { product_name: { $regex: term, $options: 'i' } } as any,
      limit: 5,
    });
    if (r.rows.length === 0) { console.log(`[${term}] no match`); continue; }
    console.log(`\n=== "${term}" (${r.rows.length}) ===`);
    for (const row of r.rows) {
      console.log(`  ${row.sku} | ${(row.product_name as string).slice(0,60)} | group=${row.template_group} / sub=${row.template_sub_type} | cat=${row.main_cat}`);
    }
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
