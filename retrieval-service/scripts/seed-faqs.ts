// product_faqs: product-scoped + brand-scoped + category-scoped
// Sources:
//   product_faq.csv        — sku real SKU → scope=product
//   gyeon_faqs.csv         — sku prefix _BRAND:gyeon:* → scope=brand/category
//   menzerna_brand_faqs.csv — scope=brand
//   category_faqs.csv      — scope=category

import { readCsv } from './_csv.ts';
import { sql } from '../src/lib/db.ts';

interface FaqRow {
  sku: string;
  question: string;
  answer: string;
}

interface InsertRow {
  scope: 'product' | 'brand' | 'category';
  sku: string | null;
  brand: string | null;
  category: string | null;
  question: string;
  answer: string;
}

// Parse pseudo-SKUs like "_BRAND:gyeon", "_CAT:coating", "_BRAND:gyeon:training"
function classify(raw: string): {
  scope: 'product' | 'brand' | 'category';
  sku: string | null;
  brand: string | null;
  category: string | null;
} {
  const s = raw.trim();
  if (s.startsWith('_BRAND:')) {
    const parts = s.split(':');
    const brand = parts[1] ?? null;
    const category = parts[2] ?? null;
    return {
      scope: category ? 'brand' : 'brand',
      sku: null,
      brand,
      category,
    };
  }
  if (s.startsWith('_CAT:')) {
    const category = s.slice(5);
    return { scope: 'category', sku: null, brand: null, category };
  }
  return { scope: 'product', sku: s, brand: null, category: null };
}

async function main() {
  console.log('[seed-faqs] loading CSVs...');
  const product = readCsv<FaqRow>('product_faq.csv');
  const gyeon = readCsv<FaqRow>('gyeon_faqs.csv');
  const menzerna = readCsv<FaqRow>('menzerna_brand_faqs.csv');
  const category = readCsv<FaqRow>('category_faqs.csv');

  console.log(
    `[seed-faqs] product=${product.length} gyeon=${gyeon.length} menzerna=${menzerna.length} category=${category.length}`,
  );

  // Real product SKUs (to FK-check product-scoped FAQ)
  const validSkus = new Set(
    (await sql<{ sku: string }[]>`SELECT sku FROM products`).map((r) => r.sku),
  );
  console.log(`[seed-faqs] valid products in DB: ${validSkus.size}`);

  // Clear existing (idempotent re-seed)
  await sql`TRUNCATE TABLE product_faqs RESTART IDENTITY CASCADE`;

  const all: InsertRow[] = [];
  const dropped = { missingSku: 0, emptyQ: 0, emptyA: 0 };

  function push(rows: FaqRow[]) {
    for (const r of rows) {
      const q = r.question?.trim();
      const a = r.answer?.trim();
      if (!q) {
        dropped.emptyQ++;
        continue;
      }
      if (!a) {
        dropped.emptyA++;
        continue;
      }
      const classified = classify(r.sku);
      if (classified.scope === 'product') {
        if (!classified.sku || !validSkus.has(classified.sku)) {
          dropped.missingSku++;
          continue;
        }
      }
      all.push({
        scope: classified.scope,
        sku: classified.sku,
        brand: classified.brand,
        category: classified.category,
        question: q,
        answer: a,
      });
    }
  }

  push(product);
  push(gyeon);
  push(menzerna);
  push(category);

  console.log(
    `[seed-faqs] ready=${all.length} dropped: missingSku=${dropped.missingSku} emptyQ=${dropped.emptyQ} emptyA=${dropped.emptyA}`,
  );

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    await sql`
      INSERT INTO product_faqs ${sql(
        batch as any,
        'scope', 'sku', 'brand', 'category', 'question', 'answer',
      )}
    `;
    inserted += batch.length;
    console.log(`  ${inserted}/${all.length}`);
  }

  const summary = await sql<{ scope: string; count: bigint }[]>`
    SELECT scope, COUNT(*)::bigint AS count
    FROM product_faqs
    GROUP BY scope
    ORDER BY scope
  `;
  console.log('[seed-faqs] DONE. Breakdown:', summary);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
