// Phase 1 + 19 + 1.1 sonrası specs JSONB → product_meta projection
// Mevcut product_meta'daki stale Phase 1 key'leri sil + yenilerini insert
//
// Phase 1.1: searchByRating kaldırıldı, rating metrikleri rankBySpec
// üzerinden sıralanır. Bu yüzden specs.ratings.{durability,beading,
// self_cleaning} nested değerleri scalar key olarak product_meta'ya
// projection ediliyor: rating_durability, rating_beading,
// rating_self_cleaning. Re-run idempotent olsun diye STALE_KEYS'e
// de eklendi (her run önce sil, sonra yeniden yaz).
import { sql } from '../src/lib/db.ts';

// Canonical key listesi (Phase 1 + 19 + 1.1 + 1.1.1)
const SCALAR_KEYS = [
  'volume_ml', 'capacity_ml', 'capacity_usable_ml',
  // Phase 1.1.1: weight_g rankBySpec enum'unda — fragrance/sprayer/drying_towel
  // ürünleri için. Hedef-scope dışı kategorilerde gram bazlı tek başına kalıyor,
  // volume_ml'e merge edilmiyor — projection edilmesi rankBySpec için şart.
  'weight_g',
  'durability_months', 'durability_km',
  'ph_level', 'ph_tolerance',
  'consumption_per_car_ml',
  'cut_level', 'hardness',
  'product_type', 'purpose',
  // Phase 1.1: rating projection (specs.ratings.* nested)
  'rating_durability', 'rating_beading', 'rating_self_cleaning',
];

// Array key'ler: pipe-separated value_text, regex ile aranır
const ARRAY_KEYS = ['target_surface', 'compatibility', 'substrate_safe', 'surface', 'features'];

const STALE_KEYS = [
  // Phase 1 stale legacy keys
  'consumption_ml_per_car', 'durability_days', 'durability_weeks', 'durability_label', 'durability_washes',
  'volume_liters', 'volume_kg', 'capacity_liters', 'capacity_total_lt', 'capacity_usable_lt',
  'ph', 'ph_label',
  'safe_on_ceramic_coatings', 'safe_on_ppf_wrap', 'aluminum_safe', 'fiberglass_safe', 'plexiglass_safe',
  'consumption_ml_per_cabin', 'coverage_ml_per_sqm', 'recommended_bucket_ml', 'recommended_foam_cannon_ratio',
  // Phase 1.1: idempotency — rating_* her run önce silinir, sonra yeniden yazılır
  'rating_durability', 'rating_beading', 'rating_self_cleaning',
  // Phase 1.1.1: legacy size key'ler volume_ml'e merge edildi
  'weight_kg', 'weight_g', 'volume_lt', 'volume',
];

console.log(`✓ Stale key'leri sil (${STALE_KEYS.length} key)`);
const delResult = await sql`DELETE FROM product_meta WHERE key = ANY(${STALE_KEYS}) RETURNING sku`;
console.log(`  ${delResult.length} satır silindi`);

console.log(`✓ DB'den ürünler çekiliyor...`);
const rows = await sql<any[]>`SELECT sku, specs FROM products WHERE specs IS NOT NULL`;
console.log(`  ${rows.length} ürün`);

let scalarCount = 0, arrayCount = 0;
let processed = 0;
for (const r of rows) {
  processed++;
  if (processed % 50 === 0) console.log(`  ${processed}/${rows.length}...`);
  if (!r.specs || typeof r.specs !== 'object') continue;
  const specs = r.specs as Record<string, unknown>;
  const ratings = (specs.ratings as Record<string, unknown> | undefined) ?? {};

  // SCALAR keys
  for (const key of SCALAR_KEYS) {
    // rating_* key'leri specs.ratings.{durability,beading,self_cleaning}
    // nested path'inden okunur. Diğerleri specs[key] doğrudan.
    let v: unknown;
    if (key.startsWith('rating_')) {
      const subKey = key.slice('rating_'.length);
      v = ratings[subKey];
    } else {
      v = specs[key];
    }

    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'object') continue;

    let valueText: string | null = null;
    let valueNumeric: number | null = null;
    let valueBoolean: boolean | null = null;

    if (typeof v === 'boolean') valueBoolean = v;
    else if (typeof v === 'number') {
      if (Number.isFinite(v)) valueNumeric = v;
    }
    else if (typeof v === 'string') {
      // JSON-quoted string ise parse et ('"machine"' → 'machine')
      let cleaned = v;
      if (v.startsWith('"') && v.endsWith('"')) {
        try { cleaned = JSON.parse(v); } catch {}
      }
      valueText = cleaned;
      const n = parseFloat(cleaned);
      if (!isNaN(n) && isFinite(n)) valueNumeric = n;
    }

    await sql`
      INSERT INTO product_meta (sku, key, value_text, value_numeric, value_boolean)
      VALUES (${r.sku}, ${key}, ${valueText}, ${valueNumeric}, ${valueBoolean})
      ON CONFLICT (sku, key) DO UPDATE SET
        value_text = EXCLUDED.value_text,
        value_numeric = EXCLUDED.value_numeric,
        value_boolean = EXCLUDED.value_boolean
    `;
    scalarCount++;
  }

  // ARRAY keys: pipe-separated value_text → regex ile ara
  for (const key of ARRAY_KEYS) {
    const v = specs[key];
    if (!v) continue;

    let pipeStr: string;
    if (Array.isArray(v)) {
      pipeStr = '|' + v.map(x => String(x)).join('|') + '|';
    } else if (typeof v === 'string') {
      // JSON string ise (örn '["ceramic_coating"]') parse et, array ise pipe yap
      let parsed: unknown = v;
      if (v.trim().startsWith('[')) {
        try { parsed = JSON.parse(v); } catch {}
      }
      if (Array.isArray(parsed)) {
        pipeStr = '|' + parsed.map(x => String(x)).join('|') + '|';
      } else {
        // Tek string değer (target_surface "leather" gibi) → array'e çevir
        pipeStr = '|' + v + '|';
      }
    } else continue;

    await sql`
      INSERT INTO product_meta (sku, key, value_text)
      VALUES (${r.sku}, ${key}, ${pipeStr})
      ON CONFLICT (sku, key) DO UPDATE SET value_text = EXCLUDED.value_text, value_numeric = NULL, value_boolean = NULL
    `;
    arrayCount++;
  }
}

console.log(`✓ Projection: ${scalarCount} scalar + ${arrayCount} array entry`);

// Sample verify
const verify = await sql`
  SELECT key, COUNT(*) FROM product_meta
  WHERE key IN (
    'product_type','surface','purpose','compatibility','substrate_safe','target_surface',
    'consumption_per_car_ml','volume_ml','durability_months',
    'rating_durability','rating_beading','rating_self_cleaning'
  )
  GROUP BY key ORDER BY key
`;
console.log(`\n=== Sonuç ===`);
for (const r of verify as any[]) console.log(`  ${r.key}: ${r.count}`);
process.exit(0);
