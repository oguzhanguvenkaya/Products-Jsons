// Generate embeddings for FAQ questions.
// Uses just the question text (answer context irrelevant for retrieval).

import { sql } from '../src/lib/db.ts';
import { embedBatch, EMBEDDING_VERSION, vectorLiteral } from '../src/lib/embed.ts';

const CHUNK = 32;
const CONCURRENCY = 8;

async function main() {
  console.log('[embed-faqs] fetching FAQs missing embeddings...');
  const rows = await sql<{ id: number; question: string }[]>`
    SELECT id, question
    FROM product_faqs
    WHERE embedding IS NULL
       OR embedding_version <> ${EMBEDDING_VERSION}
    ORDER BY id
  `;
  console.log(`[embed-faqs] ${rows.length} FAQs need embedding`);

  if (rows.length === 0) {
    console.log('[embed-faqs] nothing to do');
    await sql.end();
    return;
  }

  const startTime = Date.now();
  let processed = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const texts = chunk.map((r) => r.question);

    const embeddings = await embedBatch(texts, CONCURRENCY);

    // Update in a transaction chunk
    await sql.begin(async (tx) => {
      for (let j = 0; j < chunk.length; j++) {
        await tx`
          UPDATE product_faqs
          SET embedding = ${vectorLiteral(embeddings[j]!)}::vector,
              embedding_version = ${EMBEDDING_VERSION}
          WHERE id = ${chunk[j]!.id}
        `;
      }
    });

    processed += chunk.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const eta = (rows.length - processed) / rate;
    console.log(
      `  ${processed}/${rows.length} (${rate.toFixed(1)}/s, ETA ${eta.toFixed(0)}s)`,
    );
  }

  console.log(`[embed-faqs] DONE in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
