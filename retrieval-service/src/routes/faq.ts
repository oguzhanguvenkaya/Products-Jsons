/**
 * POST /faq — FAQ semantic search with RAG semantics.
 *
 * Phase 4 revision (issue #1, #5): the previous SKU-bypass mode returned
 * ALL 50 FAQs of a product with similarity=null and instructed the LLM
 * to "pick one." In practice the LLM grabbed the first row regardless
 * of relevance (e.g. "silikon içerir mi?" returned "Light Box farkı
 * nedir?"). The fix is twofold:
 *
 *  1. SKU-bypass now runs the query embedding against the product's
 *     FAQ embeddings, returns top-K ranked by similarity, and classifies
 *     confidence just like cross-product mode. This turns FAQs into a
 *     retrieval-augmented context rather than a dump.
 *
 *  2. When confidence='low' or 'none' the recommendation instructs the
 *     LLM to treat the FAQ snippets as partial context and synthesize an
 *     answer from its own domain knowledge — not to parrot the nearest
 *     FAQ. Generic truths ("seramik kaplamalar silikon içermez") are the
 *     LLM's job; product-specific facts belong to FAQs.
 *
 * Cross-product mode: unchanged behaviorally, confidence tiers preserved.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sql } from '../lib/db.ts';
import { embedText } from '../lib/embed.ts';
import { cachedEmbed } from '../lib/cache.ts';
import { FaqInputSchema, FaqResultSchema } from '../types.ts';

type AppVariables = { requestId: string };

export const faqRoutes = new Hono<{ Variables: AppVariables }>();

interface FaqHit {
  sku: string | null;
  question: string;
  answer: string;
  similarity: number | null;
}

// Calibrated against Phase 4 test: "silikon içerir mi" on Q2-OLE100M (which
// has no silicon FAQ) returned top sim 0.71 with off-topic matches. Raising
// HIGH to 0.75 forces those into 'low' confidence, prompting the LLM to
// synthesize from its own domain knowledge instead of parroting.
const HIGH_THRESHOLD = 0.75;
const LOW_THRESHOLD = 0.55;

const RECOMMENDATION = {
  high:
    "FAQ'ta güvenli eşleşme var. Cevabı doğal Türkçe cümleye çevirip sun; " +
    "birden fazla ilgili FAQ dönerse bunları birlikte YORUMLA, sadece " +
    "ilkini kopyalama.",
  low:
    "FAQ'ta yakın ama tam olmayan eşleşme var. Önce SENİN genel domain " +
    "bilgini kullan (ör. 'seramik kaplamalar genellikle silikon içermez') " +
    "ardından FAQ'tan destekleyici bir cümle alıntıla. Kullanıcı doğrulama " +
    "için ek kaynak isterse 'ürün üreticisine teyit ettirebilirsiniz' de.",
  none:
    "FAQ'ta anlamlı eşleşme YOK. Bu durumda: (a) SAYISAL/TEKNİK sorgu " +
    "(pH, km, ay, ml) ise getProductDetails ile technicalSpecs'ten oku; " +
    "(b) GENEL domain sorusu (silikon içerir mi, wax üzerine uygulanır mı) " +
    "ise kendi bilginle cevapla, 'bu özel ürün için FAQ'da net yanıt yok " +
    "ancak genelde X…' şeklinde açık ol; (c) ÜRÜN-SPESİFİK nüansta bilgin " +
    "yoksa 'bu konuda FAQ'da bilgi yok, üretici/satıcıya danışmanız önerilir' " +
    "de, hallucinate etme.",
} as const;

function vectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

function classifyConfidence(topSim: number | null): 'high' | 'low' | 'none' {
  if (topSim === null) return 'none';
  if (topSim >= HIGH_THRESHOLD) return 'high';
  if (topSim >= LOW_THRESHOLD) return 'low';
  return 'none';
}

faqRoutes.post(
  '/faq',
  zValidator('json', FaqInputSchema),
  async (c) => {
    const { query, sku, limit } = c.req.valid('json');

    const { vector } = await cachedEmbed(query, embedText);
    const vlit = vectorLiteral(vector);

    // SKU-bypass: embed query, rank that product's FAQs by similarity.
    // If the product has no FAQ embeddings at all (edge case), fall back
    // to id-ordered list with similarity=null so the LLM still gets
    // something, but confidence=none so the instruction is RAG-friendly.
    let rows: FaqHit[];
    if (sku) {
      rows = await sql<FaqHit[]>`
        SELECT sku, question, answer,
               CASE WHEN embedding IS NOT NULL
                    THEN (1 - (embedding <=> ${vlit}::vector))
                    ELSE NULL END AS similarity
        FROM product_faqs
        WHERE scope = 'product' AND sku = ${sku}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vlit}::vector
        LIMIT ${limit}
      `;
      if (rows.length === 0) {
        // Fallback: no embedded FAQs for this SKU — return id-ordered
        // so the LLM has SOMETHING, but flag confidence=none.
        rows = await sql<FaqHit[]>`
          SELECT sku, question, answer, NULL::numeric AS similarity
          FROM product_faqs
          WHERE scope = 'product' AND sku = ${sku}
          ORDER BY id
          LIMIT ${limit}
        `;
      }
    } else {
      rows = await sql<FaqHit[]>`
        SELECT sku, question, answer,
               (1 - (embedding <=> ${vlit}::vector)) AS similarity
        FROM product_faqs
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${vlit}::vector
        LIMIT ${limit}
      `;
    }

    const topSim =
      rows[0] && rows[0].similarity !== null
        ? Number(rows[0].similarity)
        : null;
    const confidence = classifyConfidence(topSim);

    const rawResults = rows.map((r) => ({
      sku: r.sku ?? '',
      question: r.question,
      answer: r.answer,
      similarity:
        r.similarity !== null ? Number(r.similarity) : null,
    }));

    // Low/high confidence → return results (LLM synthesizes).
    // None confidence → return EMPTY so LLM doesn't parrot irrelevant text.
    const results = confidence === 'none' ? [] : rawResults;

    const result = FaqResultSchema.parse({
      results,
      totalReturned: results.length,
      topSimilarity: topSim,
      confidence,
      recommendation: RECOMMENDATION[confidence],
    });

    return c.json(result);
  },
);
