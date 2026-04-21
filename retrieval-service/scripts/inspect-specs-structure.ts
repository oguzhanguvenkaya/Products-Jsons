// Specs JSONB içindeki key yapısını incele — durability_months var mı, hangi ürünlerde
import { sql } from '../src/lib/db.ts';

async function main() {
  console.log('\n═══ specs JSONB top-level key frekansı (tüm katalog) ═══');
  const keyFreq = await sql<{ key: string; n: number }[]>`
    SELECT key, COUNT(*)::int AS n
    FROM products, jsonb_object_keys(specs) key
    WHERE specs IS NOT NULL
    GROUP BY key
    ORDER BY n DESC
  `;
  console.log(JSON.stringify(keyFreq, null, 2));

  console.log('\n═══ Ceramic coating — durability_months / durability_km örnekleri ═══');
  const durabilityFields = await sql`
    SELECT sku, name,
           specs->>'durability_months' AS durability_months,
           specs->>'durability_km' AS durability_km,
           specs->>'hardness' AS hardness,
           specs->>'ph_tolerance' AS ph,
           (specs->'ratings'->>'durability')::numeric AS rating_durability
    FROM products
    WHERE template_group = 'ceramic_coating'
    ORDER BY (specs->>'durability_months')::numeric DESC NULLS LAST
    LIMIT 15
  `;
  console.log(JSON.stringify(durabilityFields.map(r => ({...r})), null, 2));

  console.log('\n═══ Kaç ürünün specs.durability_months doluysa? ═══');
  const counts = await sql`
    SELECT COUNT(*) FILTER (WHERE specs->>'durability_months' IS NOT NULL) AS with_months,
           COUNT(*) FILTER (WHERE specs->>'durability_km' IS NOT NULL) AS with_km,
           COUNT(*) FILTER (WHERE specs->'ratings' IS NOT NULL) AS with_ratings,
           COUNT(*) AS total
    FROM products
    WHERE template_group = 'ceramic_coating'
  `;
  console.log(JSON.stringify(counts.map(r => ({
    with_months: Number(r.with_months),
    with_km: Number(r.with_km),
    with_ratings: Number(r.with_ratings),
    total: Number(r.total),
  })), null, 2));

  console.log('\n═══ Q2-OLE100M specs tam içerik ═══');
  const oneEvoSpecs = await sql`
    SELECT sku, name, specs
    FROM products
    WHERE sku = 'Q2-OLE100M'
  `;
  console.log(JSON.stringify(oneEvoSpecs.map(r => ({...r})), null, 2));

  console.log('\n═══ Mevcut synonyms tablosu (tüm 38) ═══');
  const syns = await sql`SELECT term, aliases FROM synonyms ORDER BY term`;
  console.log(JSON.stringify(syns.map(r => ({...r})), null, 2));

  await sql.end();
}
main().catch(e => { console.error(e); process.exit(1); });
