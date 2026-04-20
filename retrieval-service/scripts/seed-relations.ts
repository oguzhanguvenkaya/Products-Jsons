// product_relations: expand CSV comma-lists to (sku, related_sku, type) rows.
// Types preserved as-is (migration 005 extended the enum).
// Order of intent: use_before, use_after, use_with, accessories, alternatives.

import { readCsv, splitList } from './_csv.ts';
import { sql } from '../src/lib/db.ts';

interface RelRow {
  sku: string;
  use_before: string;
  use_after: string;
  use_with: string;
  accessories: string;
  alternatives: string;
}

type RelationType =
  | 'primary'
  | 'variant'
  | 'use_with'
  | 'use_before'
  | 'use_after'
  | 'accessories'
  | 'alternatives';

async function main() {
  console.log('[seed-relations] loading CSV...');
  const rows = readCsv<RelRow>('product_relations.csv');
  console.log(`[seed-relations] source rows: ${rows.length}`);

  const validSkus = new Set(
    (await sql<{ sku: string }[]>`SELECT sku FROM products`).map((r) => r.sku),
  );

  const expanded: Array<{
    sku: string;
    related_sku: string;
    relation_type: RelationType;
  }> = [];
  const skipped = { noSelf: 0, noRelated: 0, selfRef: 0, dup: 0 };
  const seen = new Set<string>();

  function add(sku: string, list: string, type: RelationType) {
    if (!validSkus.has(sku)) {
      skipped.noSelf++;
      return;
    }
    for (const related of splitList(list)) {
      if (related === sku) {
        skipped.selfRef++;
        continue;
      }
      if (!validSkus.has(related)) {
        skipped.noRelated++;
        continue;
      }
      const key = `${sku}|${related}|${type}`;
      if (seen.has(key)) {
        skipped.dup++;
        continue;
      }
      seen.add(key);
      expanded.push({ sku, related_sku: related, relation_type: type });
    }
  }

  for (const r of rows) {
    add(r.sku, r.use_before, 'use_before');
    add(r.sku, r.use_after, 'use_after');
    add(r.sku, r.use_with, 'use_with');
    add(r.sku, r.accessories, 'accessories');
    add(r.sku, r.alternatives, 'alternatives');
  }

  console.log(
    `[seed-relations] expanded=${expanded.length} skipped:`,
    skipped,
  );

  // Idempotent reset
  await sql`TRUNCATE TABLE product_relations`;

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < expanded.length; i += BATCH) {
    const batch = expanded.slice(i, i + BATCH);
    await sql`
      INSERT INTO product_relations ${sql(
        batch as any,
        'sku', 'related_sku', 'relation_type',
      )}
      ON CONFLICT DO NOTHING
    `;
    inserted += batch.length;
    console.log(`  ${inserted}/${expanded.length}`);
  }

  console.log(`[seed-relations] DONE. inserted=${inserted}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
