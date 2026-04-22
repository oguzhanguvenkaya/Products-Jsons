// Kapsamlı veri coverage + heatmap + data type analizi
// Usage: bun run scripts/inspect-data-coverage.ts > /tmp/data-coverage.log 2>&1
//
// Amaç: instruction bloat kaynaklarını veri kalite eksikleri üzerinden
// haritalamak. Her template_group × specs_key × brand kombinasyonunda
// coverage, null oranı, data type homogeneity raporu.

import { sql } from '../src/lib/db.ts';

function header(title: string) {
  console.log('\n' + '═'.repeat(90));
  console.log(`  ${title}`);
  console.log('═'.repeat(90));
}
function sub(title: string) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}
function table(rows: any[]) {
  if (!rows || rows.length === 0) {
    console.log('  (EMPTY)');
    return;
  }
  const plain = rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      out[k] = typeof v === 'bigint' ? Number(v) : v;
    }
    return out;
  });
  console.log(JSON.stringify(plain, null, 2));
}

async function main() {
  // ═══════════════════════════════════════════════════════════════════════
  // 1. Genel ürün envanteri
  // ═══════════════════════════════════════════════════════════════════════
  header('1 — Genel ürün envanteri');
  sub('1a. Toplam sayılar');
  table(await sql`
    SELECT COUNT(*)::int AS total_products,
           COUNT(DISTINCT brand)::int AS distinct_brands,
           COUNT(DISTINCT template_group)::int AS distinct_template_groups,
           COUNT(DISTINCT template_sub_type)::int AS distinct_sub_types,
           COUNT(*) FILTER (WHERE specs IS NOT NULL)::int AS with_specs,
           COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(sizes, '[]'::jsonb)) > 0)::int AS with_sizes,
           COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(sizes, '[]'::jsonb)) > 1)::int AS multi_variant,
           COUNT(*) FILTER (WHERE video_url IS NOT NULL)::int AS with_video,
           COUNT(*) FILTER (WHERE full_description IS NOT NULL)::int AS with_desc,
           COUNT(*) FILTER (WHERE base_name IS NOT NULL)::int AS with_base_name
    FROM products
  `);

  sub('1b. Brand dağılımı');
  table(await sql`
    SELECT brand, COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE specs IS NOT NULL)::int AS with_specs,
           AVG(price)::numeric(10,2) AS avg_price
    FROM products GROUP BY brand ORDER BY n DESC
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 2. template_group × template_sub_type matrisi
  // ═══════════════════════════════════════════════════════════════════════
  header('2 — Template group × sub_type matrisi');
  sub('2a. template_group dağılımı + avg price');
  table(await sql`
    SELECT template_group, COUNT(*)::int AS n,
           COUNT(DISTINCT template_sub_type)::int AS sub_types,
           COUNT(DISTINCT brand)::int AS brands,
           MIN(price)::numeric(10,2) AS min_price,
           AVG(price)::numeric(10,2) AS avg_price,
           MAX(price)::numeric(10,2) AS max_price
    FROM products WHERE template_group IS NOT NULL
    GROUP BY template_group ORDER BY n DESC
  `);

  sub('2b. Her template_group için sub_type breakdown');
  const subTypeBreakdown = await sql`
    SELECT template_group, template_sub_type, COUNT(*)::int AS n,
           string_agg(DISTINCT brand, ', ') AS brands
    FROM products
    WHERE template_group IS NOT NULL AND template_sub_type IS NOT NULL
    GROUP BY template_group, template_sub_type
    ORDER BY template_group, n DESC
  `;
  table(subTypeBreakdown);

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Brand × template_group heatmap
  // ═══════════════════════════════════════════════════════════════════════
  header('3 — Brand × template_group heatmap (ürün sayısı)');
  const brandGroup = await sql`
    SELECT brand, template_group, COUNT(*)::int AS n
    FROM products
    WHERE brand IS NOT NULL AND template_group IS NOT NULL
    GROUP BY brand, template_group
    ORDER BY brand, n DESC
  `;
  table(brandGroup);

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Specs keys — her template_group için kullanılan key'ler ve coverage
  // ═══════════════════════════════════════════════════════════════════════
  header('4 — Specs keys coverage per template_group');
  sub('4a. Tüm katalogta specs key frequency (top 40)');
  table(await sql`
    SELECT key, COUNT(*)::int AS n,
           ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products WHERE specs IS NOT NULL))::numeric, 1) AS coverage_pct
    FROM products, jsonb_object_keys(specs) AS key
    WHERE specs IS NOT NULL
    GROUP BY key ORDER BY n DESC LIMIT 40
  `);

  sub('4b. ceramic_coating specs key coverage (tüm alt türler)');
  table(await sql`
    SELECT key, COUNT(*)::int AS n,
           ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products WHERE template_group='ceramic_coating'))::numeric, 1) AS coverage_pct
    FROM products, jsonb_object_keys(specs) AS key
    WHERE template_group = 'ceramic_coating' AND specs IS NOT NULL
    GROUP BY key ORDER BY n DESC LIMIT 40
  `);

  sub('4c. abrasive_polish specs key coverage');
  table(await sql`
    SELECT key, COUNT(*)::int AS n,
           ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products WHERE template_group='abrasive_polish'))::numeric, 1) AS coverage_pct
    FROM products, jsonb_object_keys(specs) AS key
    WHERE template_group = 'abrasive_polish' AND specs IS NOT NULL
    GROUP BY key ORDER BY n DESC LIMIT 40
  `);

  sub('4d. car_shampoo specs key coverage');
  table(await sql`
    SELECT key, COUNT(*)::int AS n,
           ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products WHERE template_group='car_shampoo'))::numeric, 1) AS coverage_pct
    FROM products, jsonb_object_keys(specs) AS key
    WHERE template_group = 'car_shampoo' AND specs IS NOT NULL
    GROUP BY key ORDER BY n DESC LIMIT 30
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Data type homogeneity analizi (aynı key farklı type mi?)
  // ═══════════════════════════════════════════════════════════════════════
  header('5 — Data type homogeneity (aynı key farklı tipler mi?)');
  sub('5a. Type variance per key (yüksek variance = inconsistent veri)');
  table(await sql`
    SELECT key,
           COUNT(*)::int AS total,
           COUNT(DISTINCT jsonb_typeof(specs -> key))::int AS type_variants,
           string_agg(DISTINCT jsonb_typeof(specs -> key), ', ') AS types
    FROM products, jsonb_object_keys(specs) AS key
    WHERE specs IS NOT NULL
    GROUP BY key
    HAVING COUNT(DISTINCT jsonb_typeof(specs -> key)) > 1
    ORDER BY total DESC LIMIT 40
  `);

  sub('5b. Kritik numeric field örnekleri (hangi değer formatları var?)');
  table(await sql`
    SELECT sku, name,
           specs->>'durability_months' AS months,
           specs->>'durability_km' AS km,
           specs->>'hardness' AS hardness,
           specs->>'ph_tolerance' AS ph,
           specs->>'ph_level' AS ph_level
    FROM products
    WHERE template_group = 'ceramic_coating'
      AND (specs->>'durability_months' IS NOT NULL
           OR specs->>'hardness' IS NOT NULL)
    ORDER BY brand, name LIMIT 25
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 6. Ratings subobject coverage
  // ═══════════════════════════════════════════════════════════════════════
  header('6 — Ratings subobject analizi');
  sub('6a. ratings subobject olan ürünler (template_group bazlı)');
  table(await sql`
    SELECT template_group,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE specs->'ratings' IS NOT NULL)::int AS with_ratings,
           COUNT(*) FILTER (WHERE specs->'ratings'->>'durability' IS NOT NULL)::int AS with_durability,
           COUNT(*) FILTER (WHERE specs->'ratings'->>'beading' IS NOT NULL)::int AS with_beading,
           COUNT(*) FILTER (WHERE specs->'ratings'->>'self_cleaning' IS NOT NULL)::int AS with_self_cleaning,
           COUNT(*) FILTER (WHERE specs->'ratings'->>'gloss' IS NOT NULL)::int AS with_gloss
    FROM products
    WHERE template_group IS NOT NULL
    GROUP BY template_group
    ORDER BY total DESC
  `);

  sub('6b. ratings key alt-alanları (varlık histogramı)');
  table(await sql`
    SELECT key, COUNT(*)::int AS n
    FROM products, jsonb_object_keys(specs -> 'ratings') AS key
    WHERE specs ? 'ratings'
    GROUP BY key ORDER BY n DESC
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 7. Meta table coverage (EAV)
  // ═══════════════════════════════════════════════════════════════════════
  header('7 — product_meta EAV table coverage');
  sub('7a. Ürün başına meta key sayısı histogramı');
  table(await sql`
    SELECT keys_per_product, COUNT(*)::int AS n FROM (
      SELECT sku, COUNT(DISTINCT key) AS keys_per_product
      FROM product_meta GROUP BY sku
    ) t
    GROUP BY keys_per_product ORDER BY keys_per_product
  `);

  sub('7b. Meta key frequency (value_text / value_numeric / value_boolean)');
  table(await sql`
    SELECT key, COUNT(DISTINCT sku)::int AS product_count,
           COUNT(DISTINCT value_text)::int AS distinct_text,
           COUNT(DISTINCT value_numeric)::int AS distinct_numeric,
           COUNT(DISTINCT value_boolean)::int AS distinct_boolean,
           string_agg(DISTINCT value_text, ' | ' ORDER BY value_text) FILTER (WHERE value_text IS NOT NULL) AS sample_text_values
    FROM product_meta
    GROUP BY key
    ORDER BY product_count DESC LIMIT 30
  `);

  sub('7c. Meta key × template_group coverage');
  table(await sql`
    SELECT p.template_group, m.key, COUNT(DISTINCT m.sku)::int AS n
    FROM product_meta m
    JOIN products p ON p.sku = m.sku
    GROUP BY p.template_group, m.key
    ORDER BY p.template_group, n DESC LIMIT 80
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 8. FAQ coverage per product
  // ═══════════════════════════════════════════════════════════════════════
  header('8 — FAQ coverage');
  sub('8a. Ürün başına FAQ sayısı histogramı (scope=product)');
  table(await sql`
    SELECT faq_count, COUNT(*)::int AS products FROM (
      SELECT p.sku,
             COALESCE((SELECT COUNT(*) FROM product_faqs f
                       WHERE f.scope='product' AND f.sku = p.sku), 0) AS faq_count
      FROM products p
    ) t
    GROUP BY faq_count ORDER BY faq_count
  `);

  sub('8b. Template_group × ortalama FAQ sayısı');
  table(await sql`
    SELECT p.template_group,
           COUNT(DISTINCT p.sku)::int AS products,
           COUNT(f.id)::int AS total_faqs,
           ROUND((COUNT(f.id) * 1.0 / COUNT(DISTINCT p.sku))::numeric, 1) AS avg_faq_per_product
    FROM products p
    LEFT JOIN product_faqs f ON f.scope='product' AND f.sku = p.sku
    WHERE p.template_group IS NOT NULL
    GROUP BY p.template_group
    ORDER BY avg_faq_per_product DESC
  `);

  sub('8c. FAQ scope dağılımı');
  table(await sql`
    SELECT scope,
           COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS with_embedding
    FROM product_faqs
    GROUP BY scope ORDER BY n DESC
  `);

  sub('8d. FAQ olmayan ürünler kaç tane (problem indicator)');
  table(await sql`
    SELECT template_group, COUNT(*)::int AS products_without_faq
    FROM products p
    WHERE p.template_group IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM product_faqs f WHERE f.scope='product' AND f.sku = p.sku)
    GROUP BY template_group ORDER BY products_without_faq DESC
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 9. product_relations coverage
  // ═══════════════════════════════════════════════════════════════════════
  header('9 — product_relations coverage');
  sub('9a. Ürün başına relation count histogramı');
  table(await sql`
    SELECT relation_count, COUNT(*)::int AS products FROM (
      SELECT p.sku, COALESCE((SELECT COUNT(*) FROM product_relations r WHERE r.sku = p.sku), 0) AS relation_count
      FROM products p
    ) t
    GROUP BY relation_count ORDER BY relation_count
  `);

  sub('9b. Relation type × template_group');
  table(await sql`
    SELECT p.template_group, r.relation_type, COUNT(*)::int AS n
    FROM product_relations r
    JOIN products p ON p.sku = r.sku
    WHERE p.template_group IS NOT NULL
    GROUP BY p.template_group, r.relation_type
    ORDER BY p.template_group, n DESC LIMIT 50
  `);

  sub('9c. Relation eksik olan ürünler (relation = 0)');
  table(await sql`
    SELECT template_group, COUNT(*)::int AS products_without_relations
    FROM products p
    WHERE p.template_group IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM product_relations r WHERE r.sku = p.sku)
    GROUP BY template_group ORDER BY products_without_relations DESC
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 10. Variant (sizes[]) analizi
  // ═══════════════════════════════════════════════════════════════════════
  header('10 — Variant (sizes[]) analizi');
  sub('10a. Variant count dağılımı');
  table(await sql`
    SELECT variant_count, COUNT(*)::int AS products FROM (
      SELECT jsonb_array_length(COALESCE(sizes, '[]'::jsonb)) AS variant_count FROM products
    ) t
    GROUP BY variant_count ORDER BY variant_count
  `);

  sub('10b. Template_group × ortalama variant count');
  table(await sql`
    SELECT template_group,
           COUNT(*)::int AS products,
           AVG(jsonb_array_length(COALESCE(sizes, '[]'::jsonb)))::numeric(5,2) AS avg_variants,
           MAX(jsonb_array_length(COALESCE(sizes, '[]'::jsonb)))::int AS max_variants
    FROM products
    WHERE template_group IS NOT NULL
    GROUP BY template_group
    ORDER BY avg_variants DESC LIMIT 20
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 11. Null / eksik kritik alan raporu
  // ═══════════════════════════════════════════════════════════════════════
  header('11 — Kritik alan null oranları');
  sub('11a. Temel alan eksiklik matrisi');
  table(await sql`
    SELECT template_group,
           COUNT(*)::int AS total,
           SUM(CASE WHEN url IS NULL OR url='' THEN 1 ELSE 0 END)::int AS null_url,
           SUM(CASE WHEN image_url IS NULL OR image_url='' THEN 1 ELSE 0 END)::int AS null_image,
           SUM(CASE WHEN full_description IS NULL THEN 1 ELSE 0 END)::int AS null_desc,
           SUM(CASE WHEN price IS NULL OR price=0 THEN 1 ELSE 0 END)::int AS null_or_zero_price,
           SUM(CASE WHEN video_url IS NULL THEN 1 ELSE 0 END)::int AS null_video,
           SUM(CASE WHEN target_surface IS NULL THEN 1 ELSE 0 END)::int AS null_target_surface
    FROM products
    WHERE template_group IS NOT NULL
    GROUP BY template_group
    ORDER BY total DESC
  `);

  sub('11b. Fiyatı 0 veya NULL olan ürünler (display için problem)');
  table(await sql`
    SELECT sku, name, brand, template_group, price
    FROM products
    WHERE price IS NULL OR price = 0
    ORDER BY brand, name
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 12. Specs numeric field "sıralanabilirlik" raporu (en için)
  // ═══════════════════════════════════════════════════════════════════════
  header('12 — "En" li sorular için sıralanabilir numeric field envanteri');

  const numericSpecKeys = [
    'durability_months', 'durability_km', 'durability_days',
    'hardness', 'cut_level', 'gloss_level',
    'ph_level', 'volume_ml', 'consumption_ml_per_car',
    'capacity_liters', 'weight_g', 'dimensions_mm',
  ];

  for (const key of numericSpecKeys) {
    sub(`12.${key} — template_group bazında coverage + value range`);
    table(await sql`
      SELECT p.template_group,
             COUNT(*)::int AS total,
             COUNT(p.specs -> ${key})::int AS has_field,
             ROUND((COUNT(p.specs -> ${key}) * 100.0 / COUNT(*))::numeric, 1) AS coverage_pct,
             string_agg(DISTINCT jsonb_typeof(p.specs -> ${key}), ', ') FILTER (WHERE p.specs -> ${key} IS NOT NULL) AS types
      FROM products p
      WHERE p.template_group IS NOT NULL
      GROUP BY p.template_group
      HAVING COUNT(p.specs -> ${key}) > 0
      ORDER BY coverage_pct DESC
    `);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 13. template_group hiyerarşisi — "bucket genişliği" problemi
  // ═══════════════════════════════════════════════════════════════════════
  header('13 — template_group genişliği (AntiFog problemi kaynağı)');
  sub('13a. Bir template_group içindeki sub_type çeşitliliği');
  table(await sql`
    SELECT template_group,
           COUNT(*)::int AS total,
           COUNT(DISTINCT template_sub_type)::int AS sub_type_count,
           string_agg(DISTINCT template_sub_type, ', ' ORDER BY template_sub_type) AS sub_types
    FROM products
    WHERE template_group IS NOT NULL
    GROUP BY template_group
    ORDER BY sub_type_count DESC LIMIT 15
  `);

  // ═══════════════════════════════════════════════════════════════════════
  // 14. Synonyms coverage
  // ═══════════════════════════════════════════════════════════════════════
  header('14 — Synonyms tablosu');
  sub('14a. Total synonym entries + ortalama alias sayısı');
  table(await sql`
    SELECT COUNT(*)::int AS total_terms,
           AVG(array_length(aliases, 1))::numeric(5,2) AS avg_aliases
    FROM synonyms
  `);

  sub('14b. İlk 20 synonym entry');
  table(await sql`
    SELECT term, array_length(aliases, 1) AS n_aliases,
           array_to_string(aliases, ', ') AS aliases
    FROM synonyms ORDER BY term LIMIT 20
  `);

  await sql.end();
  console.log('\n[inspect-data-coverage] DONE.\n');
}

main().catch((err) => {
  console.error('[inspect-data-coverage] FAILED:', err);
  process.exit(1);
});
