// Phase 19 etkilenen SKU'lar için search_text yenile
import { sql } from '../src/lib/db.ts';

const AFFECTED = ['NPMW6555','06008.056.001','07001.056.001','07006.056.001','07008.056.001','07163.056.001','07201.056.001','07933.056.001','07945.056.001','07984.056.001','12001.056.001','12002.056.001','SGGC086','SGGS003','SGYC010','SGYC011','SGGC055','701283','75112','75132','77192','75131','75130','24011.261.080'];

const rows = await sql<any[]>`
  SELECT sku, name, brand, template_group, template_sub_type, short_description, full_description, specs
  FROM products WHERE sku = ANY(${AFFECTED})
`;
console.log(`✓ ${rows.length} ürün`);

for (const r of rows) {
  const parts: string[] = [];
  if (r.name) parts.push(r.name);
  if (r.brand) parts.push(`Marka: ${r.brand}`);
  if (r.template_group) parts.push(`Kategori: ${r.template_group}${r.template_sub_type ? ' - ' + r.template_sub_type : ''}`);
  if (r.short_description) parts.push(r.short_description.slice(0, 300));
  const targetSurfaces = (r.specs as Record<string, unknown> | null)?.target_surfaces;
  if (typeof targetSurfaces === 'string' && targetSurfaces.length > 0) {
    parts.push(`Yüzeyler: ${targetSurfaces.replace(/\|/g, ', ')}`);
  }
  if (r.specs && typeof r.specs === 'object') {
    const e = Object.entries(r.specs as Record<string, unknown>).filter(([k, v]) => v !== null && v !== '' && typeof v !== 'object' && k.length < 30).slice(0, 8).map(([k, v]) => `${k}: ${String(v).slice(0, 50)}`);
    if (e.length) parts.push(e.join(' | '));
  }
  if (r.full_description) parts.push(String(r.full_description).slice(0, 400));
  const searchText = parts.join(' | ');

  await sql`INSERT INTO product_search (sku, search_text) VALUES (${r.sku}, ${searchText}) ON CONFLICT (sku) DO UPDATE SET search_text = EXCLUDED.search_text`;
  await sql`DELETE FROM product_embeddings WHERE sku = ${r.sku}`;
}
console.log(`✓ search_text + embedding cache invalidated for ${rows.length} SKU`);
process.exit(0);
