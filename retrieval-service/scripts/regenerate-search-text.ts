// Live DB'den search_text yenile (Faz 2R + MEGA commit sonrası)
// Eski search_text eski taxonomy referansları içeriyor — yenilenmeli
// Yeni format: name | brand | template_group - template_sub_type | short_description | how_to_use ilk 200 char | specs özet
import { sql } from '../src/lib/db.ts';

const rows = await sql<any[]>`
  SELECT 
    p.sku, p.name, p.brand, p.main_cat, p.sub_cat,
    p.template_group, p.template_sub_type,
    p.short_description, p.full_description,
    p.specs
  FROM products p
  ORDER BY p.sku
`;

console.log(`✓ DB'den ${rows.length} ürün`);

const startTime = Date.now();
const CHUNK = 50;
let processed = 0;

for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const updates: { sku: string; search_text: string }[] = [];

  for (const r of chunk) {
    const parts: string[] = [];
    if (r.name) parts.push(r.name);
    if (r.brand) parts.push(`Marka: ${r.brand}`);
    if (r.template_group) parts.push(`Kategori: ${r.template_group}${r.template_sub_type ? ' - ' + r.template_sub_type : ''}`);
    if (r.short_description) parts.push(r.short_description.slice(0, 300));
    const targetSurfaces = (r.specs as Record<string, unknown> | null)?.target_surfaces;
    if (typeof targetSurfaces === 'string' && targetSurfaces.length > 0) {
      parts.push(`Yüzeyler: ${targetSurfaces.replace(/\|/g, ', ')}`);
    }

    // Phase 1.1.13C: pH alanları explicit (Object.entries slice(0,8) sırasına güvenme).
    // Bot 'asidik/nötr/alkali' BM25 token'ı garanti olsun diye her ikisini de ekle.
    const specs = r.specs as Record<string, unknown> | null;
    if (specs) {
      const phLevel = specs.ph_level;
      if (typeof phLevel === 'number') parts.push(`pH: ${phLevel}`);
      const phCat = specs.ph_category;
      if (typeof phCat === 'string' && phCat.length > 0) parts.push(`pH kategori: ${phCat}`);
    }

    // specs içinden anlamlı top key'ler (ilk 8 kısa key)
    if (r.specs && typeof r.specs === 'object') {
      const specEntries = Object.entries(r.specs as Record<string, unknown>)
        .filter(([k, v]) => v !== null && v !== '' && typeof v !== 'object' && k.length < 30)
        .slice(0, 8)
        .map(([k, v]) => `${k}: ${String(v).slice(0, 50)}`);
      if (specEntries.length) parts.push(specEntries.join(' | '));
    }
    
    if (r.full_description) parts.push(String(r.full_description).slice(0, 400));

    updates.push({ sku: r.sku, search_text: parts.join(' | ') });
  }

  // Bulk UPSERT
  for (const u of updates) {
    await sql`
      INSERT INTO product_search (sku, search_text)
      VALUES (${u.sku}, ${u.search_text})
      ON CONFLICT (sku) DO UPDATE SET search_text = EXCLUDED.search_text
    `;
  }

  processed += chunk.length;
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`  ${processed}/${rows.length} (${(processed / elapsed).toFixed(1)}/s)`);
}

console.log(`✓ DONE in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
process.exit(0);
