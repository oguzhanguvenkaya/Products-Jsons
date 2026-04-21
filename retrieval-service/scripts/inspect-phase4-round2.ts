// Phase 4 Round 2 — 10 kritik veri anomalisi doğrulaması
// Usage: bun run scripts/inspect-phase4-round2.ts
//
// Kaynak: docs/phase-4-reports/02-second-test-analysis-2026-04-21.md
// Hedef: Fix 4.16-4.21 kararları için gereken veri netleşir.

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
  const plain = rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) out[k] = typeof v === 'bigint' ? Number(v) : v;
    return out;
  });
  console.log(JSON.stringify(plain, null, 2));
}

async function main() {
  // 1. GYEON Syncro (Q2-SLE50M) — neden searchProducts'ta gelmiyor
  header('1 — GYEON Syncro (Q2-SLE50M)');
  sub('1a. Kategorizasyon + ratings + months');
  table(await sql`
    SELECT sku, name, brand, template_group, template_sub_type, price,
           (specs->'ratings'->>'durability')::numeric AS rating_durability,
           specs->>'durability_months' AS months,
           specs->>'durability_km' AS km
    FROM products WHERE sku = 'Q2-SLE50M'
  `);
  sub('1b. search_text dolu mu');
  table(await sql`
    SELECT p.sku, substring(ps.search_text FOR 900) AS search_text,
           ps.search_text IS NOT NULL AS has
    FROM products p LEFT JOIN product_search ps ON ps.sku = p.sku
    WHERE p.sku = 'Q2-SLE50M'
  `);
  sub('1c. FTS rank "en dayanıklı seramik kaplama" top-10 ceramic_coating');
  table(await sql`
    SELECT p.sku, p.name, p.template_sub_type,
           ts_rank(to_tsvector('turkish', COALESCE(ps.search_text, '')),
                   plainto_tsquery('turkish', 'en dayanıklı seramik kaplama')) AS rank
    FROM products p LEFT JOIN product_search ps ON ps.sku = p.sku
    WHERE p.template_group = 'ceramic_coating'
    ORDER BY rank DESC LIMIT 10
  `);

  // 2. MX-PRO Diamond
  header('2 — MX-PRO Diamond (3000 TL altı variant?)');
  sub('2a. Primary + sizes');
  table(await sql`
    SELECT sku, name, price, template_sub_type,
           specs->>'durability_months' AS months,
           jsonb_array_length(COALESCE(sizes, '[]'::jsonb)) AS vc, sizes
    FROM products WHERE name ILIKE '%diamond%' AND brand = 'MX-PRO'
  `);
  sub('2b. Variant fiyatları');
  table(await sql`
    SELECT p.sku, p.name, p.price AS primary_price,
           s->>'sku' AS v_sku, s->>'size_display' AS sz, (s->>'price')::numeric AS v_price
    FROM products p, jsonb_array_elements(COALESCE(p.sizes, '[]'::jsonb)) s
    WHERE p.name ILIKE '%diamond%' AND p.brand = 'MX-PRO'
    ORDER BY (s->>'price')::numeric
  `);

  // 3. MX-PRO Hydro
  header('3 — MX-PRO Hydro');
  table(await sql`
    SELECT sku, name, price, template_sub_type,
           specs->>'durability_months' AS months,
           jsonb_array_length(COALESCE(sizes, '[]'::jsonb)) AS vc, sizes
    FROM products WHERE name ILIKE '%hydro%' AND brand = 'MX-PRO'
  `);

  // 4. MX-PRO Crystal
  header('4 — MX-PRO Crystal');
  table(await sql`
    SELECT sku, name, price, template_sub_type,
           specs->>'durability_months' AS months,
           specs->'ratings' AS ratings, sizes
    FROM products WHERE name ILIKE '%crystal%' AND brand = 'MX-PRO'
  `);

  // 5. GYEON WetCoat — primary + variants + video_url
  header('5 — GYEON WetCoat: primary SKU + variants + video_url');
  table(await sql`
    SELECT sku AS primary_sku, name, price, variant_skus, video_url, sizes
    FROM products WHERE name ILIKE '%wetcoat%'
  `);
  sub('5b. Variant fiyatları (karşılaştırma tablosu için)');
  table(await sql`
    SELECT p.sku AS primary_sku, s->>'sku' AS v_sku,
           s->>'size_display' AS sz, (s->>'price')::numeric AS v_price
    FROM products p, jsonb_array_elements(COALESCE(p.sizes, '[]'::jsonb)) s
    WHERE p.name ILIKE '%wetcoat%'
    ORDER BY (s->>'price')::numeric
  `);

  // 6. FRA-BER Nanotech Cherry 74062
  header('6 — FRA-BER Nanotech Cherry (74062) variant fiyatları');
  table(await sql`
    SELECT p.sku, p.name, p.price AS primary_price, p.variant_skus,
           s->>'sku' AS v_sku, s->>'size_display' AS sz, (s->>'price')::numeric AS v_price
    FROM products p LEFT JOIN jsonb_array_elements(COALESCE(p.sizes, '[]'::jsonb)) s ON true
    WHERE p.sku = '74062'
    ORDER BY (s->>'price')::numeric
  `);

  // 7. FRA-BER Lustratutto / Gommanera — hallucination check
  header('7 — FRA-BER Lustratutto / Gommanera hallucination check');
  sub('7a. Katalogda bu isimler var mı');
  table(await sql`
    SELECT sku, name, brand, template_group, template_sub_type
    FROM products
    WHERE name ILIKE '%lustr%' OR name ILIKE '%gomma%' OR name ILIKE '%gommanera%'
  `);
  sub('7b. FRA-BER paint/polish ürünleri (real-alternatives)');
  table(await sql`
    SELECT sku, name, template_group, template_sub_type, price
    FROM products WHERE brand = 'FRA-BER'
      AND template_group IN ('ceramic_coating','paint_protection_quick','abrasive_polish')
    ORDER BY template_group, price
  `);
  sub('7c. Tüm FRA-BER (brand count per template_group)');
  table(await sql`
    SELECT template_group, COUNT(*)::int AS n
    FROM products WHERE brand = 'FRA-BER'
    GROUP BY template_group ORDER BY n DESC
  `);

  // 8. KLIN Green Monster — search_text analysis
  header('8 — KLIN Green Monster search_text + seramik bağlamı');
  table(await sql`
    SELECT p.sku, p.name, p.template_group, p.template_sub_type,
           substring(ps.search_text FOR 1000) AS search_text
    FROM products p LEFT JOIN product_search ps ON ps.sku = p.sku
    WHERE p.name ILIKE '%green monster%'
  `);
  sub('8b. KLIN tüm ürünleri (microfiber mi, başka mı)');
  table(await sql`
    SELECT sku, name, template_group, template_sub_type, price
    FROM products WHERE brand = 'KLIN' ORDER BY template_group, price
  `);

  // 9. Menzerna 400 use_with + MG PADS + P150M
  header('9 — Menzerna 400 use_with + pad marka');
  sub('9a. Menzerna 400 (22202.260.001 + 22200.261.001) relations');
  table(await sql`
    SELECT r.sku AS from_sku, r.relation_type, r.related_sku, r.confidence,
           p.name AS related_name, p.brand AS related_brand,
           p.template_group AS related_tg, p.template_sub_type AS related_tst
    FROM product_relations r
    LEFT JOIN products p ON p.sku = r.related_sku
    WHERE r.sku IN ('22202.260.001','22200.261.001')
    ORDER BY r.sku, r.relation_type
  `);
  sub('9b. P150M / P-150 / p150 ürünleri');
  table(await sql`
    SELECT sku, name, brand, template_group, template_sub_type, price
    FROM products
    WHERE name ILIKE '%p150%' OR name ILIKE '%p-150%' OR sku ILIKE '%P150%'
  `);
  sub('9c. MG PADS / MG PS tüm pad ürünleri');
  table(await sql`
    SELECT sku, name, brand, template_group, template_sub_type, price
    FROM products WHERE brand IN ('MG PADS','MG PS')
    ORDER BY template_sub_type, price
  `);

  // 10. 3000 TL altı paint_coating + Cure Matte
  header('10 — 3000 TL altı paint_coating + Cure Matte varlığı');
  sub('10a. paint_coating sub_type + price <= 3000');
  table(await sql`
    SELECT sku, name, brand, price, template_sub_type
    FROM products
    WHERE template_group = 'ceramic_coating'
      AND template_sub_type = 'paint_coating'
      AND price <= 3000
    ORDER BY price
  `);
  sub('10b. Tüm ceramic_coating + price <= 3000 (cross sub_type)');
  table(await sql`
    SELECT sku, name, brand, template_sub_type, price
    FROM products
    WHERE template_group = 'ceramic_coating' AND price <= 3000
    ORDER BY template_sub_type, price
  `);
  sub('10c. Variant fiyatı <= 3000 (primary > 3000 ama variant altında)');
  table(await sql`
    SELECT p.sku, p.name, p.price AS pp, p.template_sub_type,
           s->>'sku' AS v_sku, s->>'size_display' AS sz,
           (s->>'price')::numeric AS v_price
    FROM products p, jsonb_array_elements(COALESCE(p.sizes, '[]'::jsonb)) s
    WHERE p.template_group = 'ceramic_coating'
      AND p.price > 3000
      AND (s->>'price')::numeric <= 3000
    ORDER BY (s->>'price')::numeric
  `);
  sub('10d. GYEON Cure Matte (Q2M-CMR500M)');
  table(await sql`
    SELECT sku, name, brand, price, template_group, template_sub_type, video_url IS NOT NULL AS has_video
    FROM products WHERE name ILIKE '%cure matte%' OR sku = 'Q2M-CMR500M'
  `);

  // BONUS: products.name zaten size içeriyor mu, base_name CSV'de dolu mu (kod sorgusu değil, CSV okumalı)
  header('BONUS — products.name ve size_display örnek 20 satır');
  table(await sql`
    SELECT p.sku, p.name,
           jsonb_array_length(COALESCE(p.sizes, '[]'::jsonb)) AS vc,
           (SELECT string_agg(s->>'size_display', ' | ')
            FROM jsonb_array_elements(COALESCE(p.sizes, '[]'::jsonb)) s) AS size_displays
    FROM products p
    WHERE jsonb_array_length(COALESCE(p.sizes, '[]'::jsonb)) > 1
      AND p.brand IN ('GYEON','MX-PRO','MENZERNA')
    ORDER BY p.brand, p.name LIMIT 20
  `);

  await sql.end();
  console.log('\n[inspect-round2] DONE.\n');
}

main().catch((err) => {
  console.error('[inspect-round2] FAILED:', err);
  process.exit(1);
});
