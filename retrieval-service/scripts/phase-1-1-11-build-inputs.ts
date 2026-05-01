// Phase 1.1.11 Faz B önhazırlığı — subagent input paketleri
//
// Her ürün için DB'den current_meta + canonical_keys + isim/marka çek,
// scripts/audit/inputs/<sku>.json'a yaz. Subagent bu JSON'u + raw-pages/<sku>.md
// (+ varsa .pdf) okuyacak.
//
// 36 ürün (Q2M-PM500M hariç). Bu plan iki kategoriyle sınırlı.
import { mkdirSync, writeFileSync } from 'node:fs';
import { sql } from '../src/lib/db.ts';

const GROUPS = ['paint_protection_quick', 'ceramic_coating'];

// 3 atlanan SKU — Phase 1.1.11 kapsam dışı (kullanıcı kararı)
const SKIP_SKUS = new Set(['70545', '71331', '78779']);

const OUT_DIR = 'scripts/audit/inputs';
mkdirSync(OUT_DIR, { recursive: true });

for (const group of GROUPS) {
  // Bu kategorideki tüm canonical key'ler (mevcut product_meta'dan)
  const keyRows = await sql<{ key: string }[]>`
    SELECT DISTINCT pm.key
    FROM product_meta pm
    JOIN products p ON p.sku = pm.sku
    WHERE p.template_group = ${group}
    ORDER BY pm.key
  `;
  const canonicalKeys = keyRows.map((r) => r.key);

  // Bu kategorideki ürünler
  const products = await sql<any[]>`
    SELECT sku, name, brand, template_sub_type
    FROM products
    WHERE template_group = ${group}
    ORDER BY sku
  `;

  for (const p of products) {
    if (SKIP_SKUS.has(p.sku)) {
      console.log(`  ⊘ ${p.sku} (atlandı, kullanıcı kararı)`);
      continue;
    }

    // Bu SKU için product_meta değerleri
    const metaRows = await sql<any[]>`
      SELECT key, value_text, value_numeric, value_boolean
      FROM product_meta
      WHERE sku = ${p.sku}
    `;
    const metaMap: Record<string, any> = {};
    for (const m of metaRows) {
      const v =
        m.value_boolean !== null
          ? m.value_boolean
          : m.value_numeric !== null
            ? m.value_numeric
            : m.value_text;
      metaMap[m.key] = v;
    }

    // current_meta: tüm canonical key'ler için ya değer ya null
    const currentMeta: Record<string, any> = {};
    for (const k of canonicalKeys) {
      currentMeta[k] = metaMap[k] ?? null;
    }

    const input = {
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      template_group: group,
      template_sub_type: p.template_sub_type,
      canonical_keys: canonicalKeys,
      current_meta: currentMeta,
    };

    const outPath = `${OUT_DIR}/${p.sku}.json`;
    writeFileSync(outPath, JSON.stringify(input, null, 2));
    console.log(`  ✓ ${p.sku}`);
  }
}

console.log(`\n✓ Input paketleri yazıldı: ${OUT_DIR}/`);
process.exit(0);
