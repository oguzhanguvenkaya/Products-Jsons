/**
 * P1 sort test — OdorRemover Pads vs Sprey.
 *
 * exactMatch="OdorRemover Pads" girdiğinde bot Pads (Q2M-ORP4P)'i birinci getirmeli.
 * exactMatch="OdorRemover" girdiğinde sprey (Q2M-OR500M) birinci (kısa isim, tek token).
 */
import { client } from '@botpress/runtime';

async function testQuery(needle: string) {
  // Mevcut search-products.ts mantığını aynen uygula (smoke test, tool çağırmadan)
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const strictRegex = new RegExp(`\\b${escaped}(?![+\\w])`, 'i');

  const broadRes = await client.findTableRows({
    table: 'productSearchIndexTable',
    filter: { product_name: { $regex: needle, $options: 'i' } } as any,
    limit: 30,
  });

  const queryTokens = needle
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const postFiltered = broadRes.rows
    .filter((r) => strictRegex.test(String(r.product_name || '')))
    .sort((a, b) => {
      const nameA = String(a.product_name || '').toLowerCase();
      const nameB = String(b.product_name || '').toLowerCase();
      const matchA = queryTokens.filter((t) => nameA.includes(t)).length;
      const matchB = queryTokens.filter((t) => nameB.includes(t)).length;
      if (matchA !== matchB) return matchB - matchA;
      return nameA.length - nameB.length;
    });

  console.log(`\n=== needle: "${needle}" ===`);
  console.log(`queryTokens: [${queryTokens.join(', ')}]`);
  console.log(`broad match count: ${broadRes.rows.length}, strict: ${postFiltered.length}`);
  for (const [i, r] of postFiltered.slice(0, 5).entries()) {
    const name = (r.product_name as string) || '';
    const matchCount = queryTokens.filter((t) => name.toLowerCase().includes(t)).length;
    console.log(`  [${i + 1}] ${r.sku} | matches=${matchCount} | len=${name.length} | ${name.slice(0, 60)}`);
  }
}

async function main() {
  await testQuery('OdorRemover');
  await testQuery('OdorRemover Pads');
  // Regresyon kontrolü — tek token, kısa önce
  await testQuery('Bathe');
  await testQuery('Mohs');
}

main().catch((e) => { console.error(e); process.exit(1); });
