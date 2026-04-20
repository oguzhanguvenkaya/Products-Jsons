// Generate embeddings for all products using their search_text.
// Resumable: skips products that already have a fresh embedding.

import { sql } from '../src/lib/db.ts';
import { embedBatch, EMBEDDING_VERSION, vectorLiteral } from '../src/lib/embed.ts';

const CHUNK = 32;
const CONCURRENCY = 8;

async function main() {
  console.log('[embed-products] fetching products missing embeddings...');
  const rows = await sql<{ sku: string; search_text: string }[]>`
    SELECT ps.sku, ps.search_text
    FROM product_search ps
    LEFT JOIN product_embeddings pe ON pe.sku = ps.sku
    WHERE pe.sku IS NULL
       OR pe.embedding_version <> ${EMBEDDING_VERSION}
       OR pe.embedding IS NULL
    ORDER BY ps.sku
  `;
  console.log(`[embed-products] ${rows.length} products need embedding`);

  if (rows.length === 0) {
    console.log('[embed-products] nothing to do');
    await sql.end();
    return;
  }

  const startTime = Date.now();
  let processed = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const texts = chunk.map((r) => r.search_text);

    const embeddings = await embedBatch(texts, CONCURRENCY);

    const insertRows = chunk.map((r, idx) => ({
      sku: r.sku,
      embedding: vectorLiteral(embeddings[idx]!),
      embedding_version: EMBEDDING_VERSION,
      source_text: r.search_text,
    }));

    await sql`
      INSERT INTO product_embeddings ${sql(
        insertRows as any,
        'sku', 'embedding', 'embedding_version', 'source_text',
      )}
      ON CONFLICT (sku) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        embedding_version = EXCLUDED.embedding_version,
        source_text = EXCLUDED.source_text,
        updated_at = now()
    `;

    processed += chunk.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const eta = (rows.length - processed) / rate;
    console.log(
      `  ${processed}/${rows.length} (${rate.toFixed(1)}/s, ETA ${eta.toFixed(0)}s)`,
    );
  }

  console.log(`[embed-products] DONE in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
