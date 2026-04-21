// products + product_search
// Joins: products_master + product_content (howToUse/whenToUse/whyThisProduct)
//        + product_desc_part1 + product_desc_part2 (full_description)
//        + product_specs (specs JSONB)
//        + product_search_index (search_text)
// Runs idempotently via ON CONFLICT DO UPDATE.

import { readCsv, splitList, tryJson } from './_csv.ts';
import { sql } from '../src/lib/db.ts';

interface MasterRow {
  sku: string;
  barcode: string;
  product_name: string;
  brand: string;
  price: string;
  image_url: string;
  main_cat: string;
  sub_cat: string;
  sub_cat2: string;
  target_surface: string;
  template_group: string;
  template_sub_type: string;
  url: string;
  base_name: string;
  variant_skus: string;
  sizes: string;
  video_url: string;
}

interface ContentRow {
  sku: string;
  howToUse: string;
  whenToUse: string;
  whyThisProduct: string;
}

interface DescRow {
  sku: string;
  fullDescription: string;
}

interface SpecsRow {
  sku: string;
  template_group: string;
  template_sub_type: string;
  specs_object: string;
}

interface SearchIdxRow {
  sku: string;
  search_text: string;
}

function buildFullDescription(p1: string | undefined, p2: string | undefined): string | null {
  const combined = `${p1 ?? ''}${p2 ?? ''}`.trim();
  return combined.length > 0 ? combined : null;
}

async function main() {
  console.log('[seed-products] loading CSVs...');
  const master = readCsv<MasterRow>('products_master.csv');
  const content = readCsv<ContentRow>('product_content.csv');
  const part1 = readCsv<DescRow>('product_desc_part1.csv');
  const part2 = readCsv<DescRow>('product_desc_part2.csv');
  const specs = readCsv<SpecsRow>('product_specs.csv');
  const searchIdx = readCsv<SearchIdxRow>('product_search_index.csv');

  const contentMap = new Map(content.map((r) => [r.sku, r]));
  const part1Map = new Map(part1.map((r) => [r.sku, r.fullDescription]));
  const part2Map = new Map(part2.map((r) => [r.sku, r.fullDescription]));
  const specsMap = new Map(specs.map((r) => [r.sku, r]));
  const searchMap = new Map(searchIdx.map((r) => [r.sku, r.search_text]));

  console.log(
    `[seed-products] master=${master.length} content=${content.length} part1=${part1.length} part2=${part2.length} specs=${specs.length} searchIdx=${searchIdx.length}`,
  );

  const productRows = master.map((m) => {
    const c = contentMap.get(m.sku);
    const specsObj = specsMap.get(m.sku);
    const specsJson: Record<string, unknown> = {
      ...(tryJson<Record<string, unknown>>(specsObj?.specs_object) ?? {}),
    };
    if (c?.howToUse) specsJson.howToUse = c.howToUse;
    if (c?.whenToUse) specsJson.whenToUse = c.whenToUse;
    if (c?.whyThisProduct) specsJson.whyThisProduct = c.whyThisProduct;

    const fullDesc = buildFullDescription(part1Map.get(m.sku), part2Map.get(m.sku));
    const targetSurfaces = splitList(m.target_surface);
    const variantSkus = splitList(m.variant_skus, '|');
    const sizesJson = tryJson(m.sizes);

    return {
      sku: m.sku,
      name: m.product_name,
      base_name: (m.base_name || m.product_name || '').trim() || null,
      brand: m.brand || null,
      main_cat: m.main_cat || null,
      sub_cat: m.sub_cat || null,
      sub_cat2: m.sub_cat2 || null,
      template_group: m.template_group || null,
      template_sub_type: m.template_sub_type || null,
      target_surface: targetSurfaces.length > 0 ? targetSurfaces : null,
      price: m.price ? Number(m.price) : null,
      rating: null as number | null,
      url: m.url || null,
      image_url: m.image_url || null,
      full_description: fullDesc,
      specs: Object.keys(specsJson).length > 0 ? specsJson : null,
      sizes: sizesJson,
      variant_skus: variantSkus.length > 0 ? variantSkus : null,
      video_url: m.video_url?.trim() ? m.video_url.trim() : null,
    };
  });

  console.log(`[seed-products] inserting ${productRows.length} products...`);

  let inserted = 0;
  const BATCH = 50;
  for (let i = 0; i < productRows.length; i += BATCH) {
    const batch = productRows.slice(i, i + BATCH);
    await sql`
      INSERT INTO products ${sql(
        batch as any,
        'sku', 'name', 'base_name', 'brand', 'main_cat', 'sub_cat', 'sub_cat2',
        'template_group', 'template_sub_type', 'target_surface',
        'price', 'rating', 'url', 'image_url',
        'full_description', 'specs', 'sizes', 'variant_skus', 'video_url',
      )}
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        base_name = EXCLUDED.base_name,
        brand = EXCLUDED.brand,
        main_cat = EXCLUDED.main_cat,
        sub_cat = EXCLUDED.sub_cat,
        sub_cat2 = EXCLUDED.sub_cat2,
        template_group = EXCLUDED.template_group,
        template_sub_type = EXCLUDED.template_sub_type,
        target_surface = EXCLUDED.target_surface,
        price = EXCLUDED.price,
        url = EXCLUDED.url,
        image_url = EXCLUDED.image_url,
        full_description = EXCLUDED.full_description,
        specs = EXCLUDED.specs,
        sizes = EXCLUDED.sizes,
        variant_skus = EXCLUDED.variant_skus,
        video_url = EXCLUDED.video_url,
        updated_at = now()
    `;
    inserted += batch.length;
    console.log(`  ${inserted}/${productRows.length}`);
  }

  console.log('[seed-products] seeding product_search...');
  const searchRows = master
    .map((m) => {
      const st = searchMap.get(m.sku);
      if (!st) return null;
      return { sku: m.sku, search_text: st };
    })
    .filter((r): r is { sku: string; search_text: string } => r !== null);

  let searchInserted = 0;
  for (let i = 0; i < searchRows.length; i += BATCH) {
    const batch = searchRows.slice(i, i + BATCH);
    await sql`
      INSERT INTO product_search ${sql(batch as any, 'sku', 'search_text')}
      ON CONFLICT (sku) DO UPDATE SET
        search_text = EXCLUDED.search_text,
        updated_at = now()
    `;
    searchInserted += batch.length;
    console.log(`  ${searchInserted}/${searchRows.length}`);
  }

  console.log(
    `[seed-products] DONE. products=${inserted} search=${searchInserted}`,
  );
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
