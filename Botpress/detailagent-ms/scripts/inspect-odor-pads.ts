import { client } from '@botpress/runtime';

async function main() {
  const sku = 'Q2M-ORP4P';

  // FAQs
  const faqRes = await client.findTableRows({
    table: 'productFaqTable',
    filter: { sku: { $eq: sku } } as any,
    limit: 50,
  });
  console.log(`\n=== ${sku} FAQs (${faqRes.rows.length}) ===`);
  for (const [i, r] of faqRes.rows.entries()) {
    console.log(`  [${i + 1}] Q: ${(r.question as string).slice(0, 100)}`);
    console.log(`      A: ${(r.answer as string).slice(0, 200)}`);
  }

  // Content (HTU)
  const contentRes = await client.findTableRows({
    table: 'productContentTable',
    filter: { sku: { $eq: sku } } as any,
    limit: 1,
  });
  const c = contentRes.rows[0];
  console.log(`\n=== Content ===`);
  console.log(`howToUse: ${((c?.howToUse as string) || '').slice(0, 500)}`);
  console.log(`whenToUse: ${((c?.whenToUse as string) || '').slice(0, 300)}`);
  console.log(`whyThisProduct: ${((c?.whyThisProduct as string) || '').slice(0, 300)}`);

  // Specs
  const specsRes = await client.findTableRows({
    table: 'productSpecsTable',
    filter: { sku: { $eq: sku } } as any,
    limit: 1,
  });
  const s = specsRes.rows[0];
  console.log(`\n=== Specs ===`);
  if (s?.specs_object) {
    const parsed = typeof s.specs_object === 'string' ? JSON.parse(s.specs_object as string) : s.specs_object;
    console.log(JSON.stringify(parsed, null, 2));
  }

  // Search for "hafta" in FAQ answers
  console.log(`\n=== "hafta" search in FAQs ===`);
  const haftaHits = faqRes.rows.filter((r) =>
    (r.answer as string).toLowerCase().includes('hafta'),
  );
  for (const r of haftaHits) {
    console.log(`  Q: ${(r.question as string).slice(0, 80)}`);
    console.log(`  A: ${(r.answer as string)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
