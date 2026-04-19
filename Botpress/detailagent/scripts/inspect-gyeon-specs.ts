import { client } from '@botpress/runtime';
const SKUS = ['Q2-FCNA400M','Q2M-BPYA1000M','Q2M-PYA4000M','Q2-LSE50M','Q2-PLE50M'];
async function main() {
  for (const sku of SKUS) {
    const r = await client.findTableRows({
      table: 'productSpecsTable', filter: { sku: { $eq: sku } }, limit: 1,
    });
    if (r.rows[0]) {
      const raw = r.rows[0].specs_object as string;
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { parsed = raw; }
      console.log(`\n=== ${sku} ===`);
      console.log(JSON.stringify(parsed, null, 2).slice(0, 800));
    }
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
