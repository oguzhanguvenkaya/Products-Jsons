// One-off diagnostic script — Phase 4 bot test bulgularının veri tarafını doğrulama.
// Usage: bun run scripts/inspect-phase4-bugs.ts

import { sql } from '../src/lib/db.ts';

function header(title: string) {
  console.log('\n' + '═'.repeat(80));
  console.log(`  ${title}`);
  console.log('═'.repeat(80));
}

function sub(title: string) {
  console.log(`\n── ${title} ────────────`);
}

function table(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    console.log('  (EMPTY)');
    return;
  }
  // Strip postgres.js metadata — keep only plain row objects
  const plainRows = rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      out[k] = typeof v === 'bigint' ? Number(v) : v;
    }
    return out;
  });
  console.log(JSON.stringify(plainRows, null, 2));
}

async function main() {
  // ─── Q1: AntiFog ürünleri ───────────────────────────────────────
  header('Q1 — AntiFog / cam buğu ürünleri (soru 3)');

  sub('1a. AntiFog ürünleri (isim + kategori)');
  table(await sql`
    SELECT sku, name, brand, template_group, template_sub_type, price,
           substring(full_description FOR 200) AS desc_snippet
    FROM products
    WHERE name ILIKE '%antifog%' OR name ILIKE '%anti fog%' OR name ILIKE '%buğu%'
    ORDER BY price
  `);

  sub('1b. AntiFog ürünün search_text içinde "seramik" geçiyor mu?');
  table(await sql`
    SELECT p.sku, p.name, p.template_group,
           substring(ps.search_text FOR 500) AS search_text
    FROM products p
    LEFT JOIN product_search ps ON ps.sku = p.sku
    WHERE p.name ILIKE '%antifog%' OR p.name ILIKE '%buğu%'
  `);

  // ─── Q2: GYEON 1000 TL altı seramik kaplama (doğru cevap) ──────
  header('Q2 — GYEON 1000 TL altı ceramic_coating (soru 3 expected)');

  sub('2a. GYEON + ceramic_coating + price <= 1000');
  table(await sql`
    SELECT sku, name, price, template_group, template_sub_type
    FROM products
    WHERE brand = 'GYEON' AND template_group = 'ceramic_coating' AND price <= 1000
    ORDER BY price
  `);

  sub('2b. Yoksa — GYEON ceramic_coating altındaki en ucuz 10 ürün');
  table(await sql`
    SELECT sku, name, price, template_group, template_sub_type
    FROM products
    WHERE brand = 'GYEON' AND template_group = 'ceramic_coating'
    ORDER BY price
    LIMIT 10
  `);

  // ─── Q3: GYEON Syncro + durability rating analizi ──────────────
  header('Q3 — GYEON Syncro + ceramic_coating durability ratings (soru 8)');

  sub('3a. GYEON Syncro bulunuyor mu, rating durumu');
  table(await sql`
    SELECT sku, name, template_group, price, specs->'ratings' AS ratings
    FROM products
    WHERE name ILIKE '%syncro%'
  `);

  sub('3b. Tüm ceramic_coating ürünleri — ratings DESC (Top 20)');
  table(await sql`
    SELECT sku, name, brand, price,
           (specs->'ratings'->>'durability')::numeric AS durability,
           (specs->'ratings'->>'beading')::numeric    AS beading,
           (specs->'ratings'->>'self_cleaning')::numeric AS self_cleaning
    FROM products
    WHERE template_group = 'ceramic_coating'
    ORDER BY (specs->'ratings'->>'durability')::numeric DESC NULLS LAST, name
    LIMIT 20
  `);

  sub('3c. ceramic_coating içinde ratings DOLU olan kaç ürün var?');
  table(await sql`
    SELECT COUNT(*) FILTER (WHERE specs->'ratings' IS NOT NULL) AS with_ratings,
           COUNT(*) FILTER (WHERE (specs->'ratings'->>'durability') IS NOT NULL) AS with_durability,
           COUNT(*) AS total
    FROM products
    WHERE template_group = 'ceramic_coating'
  `);

  // ─── Q4: Menzerna 400 serisi (soru 10) ─────────────────────────
  header('Q4 — MENZERNA 400 serisi ve kalın pasta sub_type (soru 10)');

  sub('4a. MENZERNA 400 ürünleri');
  table(await sql`
    SELECT sku, name, brand, template_group, template_sub_type, price
    FROM products
    WHERE brand = 'MENZERNA' AND name ILIKE '%400%'
    ORDER BY price
  `);

  sub('4b. MENZERNA tüm abrasive_polish (price + sub_type);');
  table(await sql`
    SELECT sku, name, template_sub_type, price
    FROM products
    WHERE brand = 'MENZERNA' AND template_group = 'abrasive_polish'
    ORDER BY template_sub_type, price
  `);

  sub('4c. MENZERNA 400 vs 1000 search_text karşılaştırması');
  table(await sql`
    SELECT p.sku, p.name, p.template_sub_type,
           substring(ps.search_text FOR 350) AS search_text
    FROM products p
    JOIN product_search ps ON ps.sku = p.sku
    WHERE p.brand = 'MENZERNA' AND (p.name ILIKE '%400%' OR p.name ILIKE '%1000%' OR p.name ILIKE '%cut force%')
    ORDER BY p.name
  `);

  sub('4d. Tüm heavy_cut_compound ürünleri (sub_type filter bug testi)');
  table(await sql`
    SELECT sku, name, brand, price
    FROM products
    WHERE template_sub_type = 'heavy_cut_compound'
    ORDER BY brand, name
  `);

  // ─── Q5: 1500-2500 TL arası pasta (soru 9) ─────────────────────
  header('Q5 — 1500-2500 TL arası abrasive_polish (soru 9)');

  sub('5a. Ana fiyat 1500-2500 arası abrasive_polish');
  table(await sql`
    SELECT sku, name, brand, price,
           jsonb_array_length(COALESCE(sizes, '[]'::jsonb)) AS variant_count
    FROM products
    WHERE template_group = 'abrasive_polish'
      AND price BETWEEN 1500 AND 2500
    ORDER BY price
  `);

  sub('5b. Sizes[] içi variant fiyatları — 1500-2500 aralığında kaç variant (ana fiyat dışı)?');
  table(await sql`
    SELECT p.sku, p.name, p.price AS primary_price,
           s->>'size_display' AS variant_size,
           (s->>'price')::numeric AS variant_price
    FROM products p,
         jsonb_array_elements(COALESCE(p.sizes, '[]'::jsonb)) s
    WHERE p.template_group = 'abrasive_polish'
      AND (s->>'price')::numeric BETWEEN 1500 AND 2500
    ORDER BY (s->>'price')::numeric
  `);

  sub('5c. Kullanıcının bildirdiği yanlış-fiyat ürünler (600, 720, 2750, 480, 990, 800)');
  table(await sql`
    SELECT p.sku, p.name, p.price AS primary_price, p.sizes
    FROM products p
    WHERE p.template_group = 'abrasive_polish'
      AND (p.price IN (600, 720, 2750, 480, 990, 800)
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(COALESCE(p.sizes, '[]'::jsonb)) s
             WHERE (s->>'price')::numeric IN (600, 720, 2750, 480, 990, 800)
           ))
    ORDER BY p.name
  `);

  // ─── Q6: Q2-OLE100M silikon FAQ'ları (soru 5) ──────────────────
  header('Q6 — Q2-OLE100M silikon FAQ araması (soru 5)');

  sub('6a. Q2-OLE100M için silikon içeren FAQ var mı?');
  table(await sql`
    SELECT id, sku, question, substring(answer FOR 400) AS answer_snippet
    FROM product_faqs
    WHERE sku = 'Q2-OLE100M'
      AND (question ILIKE '%silikon%' OR answer ILIKE '%silikon%')
  `);

  sub('6b. Q2-OLE100M tüm FAQ\'ları — soru listesi');
  table(await sql`
    SELECT id, question
    FROM product_faqs
    WHERE sku = 'Q2-OLE100M'
    ORDER BY id
  `);

  sub('6c. Tüm katalogta silikon ile ilgili FAQ (cross-product semantic kaynağı)');
  table(await sql`
    SELECT scope, sku, brand, category, question
    FROM product_faqs
    WHERE question ILIKE '%silikon%' OR answer ILIKE '%silikon%'
    LIMIT 10
  `);

  // ─── Q7: Q2-OLE100M use_with relations — URL/sizes durumu ──────
  header('Q7 — Q2-OLE100M use_with (soru 7) — URL ve sizes durumu');

  sub('7a. Q2-OLE100M use_with ilişkileri + target ürün URL/sizes');
  table(await sql`
    SELECT r.relation_type, r.related_sku, r.confidence,
           p.name, p.url,
           p.image_url IS NOT NULL AS has_image,
           jsonb_array_length(COALESCE(p.sizes, '[]'::jsonb)) AS variant_count
    FROM product_relations r
    JOIN products p ON p.sku = r.related_sku
    WHERE r.sku = 'Q2-OLE100M' AND r.relation_type = 'use_with'
    ORDER BY r.confidence DESC NULLS LAST
  `);

  sub('7b. BaldWipe / SoftWipe / Cure / Bathe — urun tablosunda + URL durumu');
  table(await sql`
    SELECT sku, name, url,
           image_url IS NOT NULL AS has_image,
           jsonb_array_length(COALESCE(sizes, '[]'::jsonb)) AS variant_count
    FROM products
    WHERE name ILIKE '%baldwipe%' OR name ILIKE '%softwipe%'
       OR name ILIKE '%bald wipe%' OR name ILIKE '%soft wipe%'
       OR (name ILIKE '%cure%' AND brand = 'GYEON')
       OR (name ILIKE '%bathe%' AND brand = 'GYEON')
    ORDER BY name
  `);

  // ─── Q8: abrasive_polish sub_type haritası (Menzerna 400 neden dışarıda kalmış) ──
  header('Q8 — abrasive_polish sub_type dağılımı');

  table(await sql`
    SELECT template_sub_type, COUNT(*) AS n, string_agg(DISTINCT brand, ', ') AS brands
    FROM products
    WHERE template_group = 'abrasive_polish'
    GROUP BY template_sub_type
    ORDER BY n DESC
  `);

  await sql.end();
  console.log('\n[inspect-phase4-bugs] DONE.\n');
}

main().catch((err) => {
  console.error('[inspect] FAILED:', err);
  process.exit(1);
});
