// Kategori ağacı dump — template_group → sub_type → tüm ürünler
// Usage: bun run scripts/dump-category-tree.ts > /tmp/category-tree.log
//
// Sadece SELECT — veri değişikliği yok.

import { sql } from '../src/lib/db.ts';

async function main() {
  // 1) Her template_group için sub_type sayısı + ürün sayısı
  const groups = await sql<
    Array<{
      template_group: string | null;
      product_count: number;
      sub_type_count: number;
    }>
  >`
    SELECT
      template_group,
      COUNT(*)::int AS product_count,
      COUNT(DISTINCT template_sub_type)::int AS sub_type_count
    FROM products
    GROUP BY template_group
    ORDER BY product_count DESC
  `;

  // 2) Tüm ürünleri tek sorgu ile çek, sonra memory'de grupla
  const rows = await sql<
    Array<{
      template_group: string | null;
      template_sub_type: string | null;
      sku: string;
      name: string;
      base_name: string | null;
      brand: string | null;
      price: string | number | null;
    }>
  >`
    SELECT template_group, template_sub_type, sku,
           name, base_name, brand, price
    FROM products
    ORDER BY template_group NULLS LAST,
             template_sub_type NULLS LAST,
             brand NULLS LAST,
             price NULLS LAST,
             name
  `;

  // 3) Grupla: group → sub_type → products[]
  const tree: Record<
    string,
    {
      total: number;
      subs: Record<
        string,
        Array<{
          sku: string;
          name: string;
          brand: string;
          price: number;
        }>
      >;
    }
  > = {};

  for (const r of rows) {
    const g = r.template_group ?? '(null template_group)';
    const s = r.template_sub_type ?? '(null sub_type)';
    if (!tree[g]) tree[g] = { total: 0, subs: {} };
    tree[g].total++;
    if (!tree[g].subs[s]) tree[g].subs[s] = [];
    tree[g].subs[s].push({
      sku: r.sku,
      name: r.base_name && r.base_name.trim() ? r.base_name : r.name,
      brand: r.brand ?? '(no brand)',
      price: r.price === null ? 0 : Number(r.price),
    });
  }

  // 4) Markdown dökümü
  console.log('# Katalog Kategori Ağacı (template_group → sub_type → ürünler)\n');
  console.log(`**Tarih:** 2026-04-22`);
  console.log(`**Toplam:** ${rows.length} ürün, ${groups.length} template_group`);
  console.log(`**Kaynak:** products tablosu (Supabase prod)\n`);
  console.log('---\n');

  // İçindekiler
  console.log('## İçindekiler\n');
  for (const g of groups) {
    const name = g.template_group ?? '(null)';
    const anchor = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    console.log(
      `- [${name}](#${anchor}) — ${g.product_count} ürün, ${g.sub_type_count} sub_type`,
    );
  }
  console.log('\n---\n');

  // Her group için tree
  for (const g of groups) {
    const gname = g.template_group ?? '(null)';
    const gdata = tree[gname];
    if (!gdata) continue;

    console.log(`## ${gname}`);
    console.log(
      `\n**${gdata.total} ürün · ${g.sub_type_count} sub_type**\n`,
    );

    // Sub_type'lar içinde ürün sayısına göre sırala
    const subEntries = Object.entries(gdata.subs).sort(
      (a, b) => b[1].length - a[1].length,
    );

    for (const [subName, products] of subEntries) {
      console.log(`### ${gname} › **${subName}** _(${products.length} ürün)_\n`);

      // Brand gruplanmış ürün listesi
      const byBrand: Record<string, typeof products> = {};
      for (const p of products) {
        if (!byBrand[p.brand]) byBrand[p.brand] = [];
        byBrand[p.brand].push(p);
      }

      for (const [brand, items] of Object.entries(byBrand)) {
        console.log(`**${brand}** (${items.length}):`);
        for (const p of items) {
          const priceStr =
            p.price > 0 ? `${p.price.toLocaleString('tr-TR')} TL` : 'fiyat yok';
          console.log(`- \`${p.sku}\` — ${p.name} — **${priceStr}**`);
        }
        console.log('');
      }
    }

    console.log('---\n');
  }

  await sql.end();
  // DONE indicator
  process.stderr.write(
    `[dump-category-tree] ${rows.length} products, ${groups.length} groups written.\n`,
  );
}

main().catch((err) => {
  console.error('[dump-category-tree] FAILED:', err);
  process.exit(1);
});
