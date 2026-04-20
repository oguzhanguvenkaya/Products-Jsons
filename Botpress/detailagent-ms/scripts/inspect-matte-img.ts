import { client } from '@botpress/runtime';

async function main() {
  const check = ['Q2-MTEL50M', 'Q2-CCE200M', 'Q2-SLE50M', 'Q2-RE30M', 'Q2-TRE30M', 'Q2-VE20M', 'Q2-PLE50M', 'Q2-MLE100M'];
  console.log('=== Master image_url ===');
  const r = await client.findTableRows({
    table: 'productsMasterTable',
    filter: { sku: { $in: check } } as any,
    limit: 10,
  });
  for (const row of r.rows) {
    console.log(`${row.sku.padEnd(15)} | img=${(row.image_url as string) || '(EMPTY)'}`);
  }

  console.log('\n=== HTTP head check — fetch image URLs ===');
  for (const row of r.rows) {
    const url = row.image_url as string;
    if (!url) {
      console.log(`${row.sku}: no URL`);
      continue;
    }
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(`${row.sku}: ${res.status} ${res.statusText} (${url.slice(url.lastIndexOf('/') + 1)})`);
    } catch (e: any) {
      console.log(`${row.sku}: FETCH ERROR ${e.message}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
