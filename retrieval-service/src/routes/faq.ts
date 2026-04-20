/**
 * POST /faq — FAQ semantic search.
 *
 * Mirrors the Botpress searchFaq v9.2 contract:
 *  - SKU provided → return ALL FAQs for that SKU (no semantic
 *    ranking). confidence='high' fixed. The LLM picks the most
 *    relevant one itself; this avoids semantic near-misses like
 *    "iki kat" vs "açık havada" ranking wrong.
 *  - No SKU → cross-product semantic search via embedding cosine,
 *    confidence tier by top similarity:
 *      high ≥ 0.6, low 0.4-0.6, none < 0.4
 *    Recommendation string tells the bot how to present results.
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

const HIGH_THRESHOLD = 0.6;
const LOW_THRESHOLD = 0.4;

const RECOMMENDATION = {
  sku_bypass:
    "SKU filter aktif: bu ürünün TÜM FAQ'ları döndü (semantic ranking yok). " +
    'İçinden kullanıcının sorusuna EN UYGUN soruyu SEN seç ve cevabı sun. ' +
    "Hiç uygun FAQ yoksa \"bu konuda FAQ'de net bilgi yok\" de.",
  high: 'Cevabı doğal Türkçe cümleye çevirip direkt sun.',
  low:
    "Cevabı 'En yakın SSS şunu söylüyor:' disclaimer ile sun; kullanıcı " +
    'doğrulamalı. Eğer kullanıcının sorusu sayısal teknik değer (pH, km, ' +
    "ay, ml) ise FAQ'yı ATLA, getProductDetails ile technicalSpecs'ten oku.",
  none:
    "FAQ'de anlamlı eşleşme YOK — results BOŞ. Bu durumda: sayısal/teknik " +
    'değer sorgusu ise searchProducts + getProductDetails kullan. Nüanslı ' +
    "kullanım/uyumluluk sorusu ise 'bu konuda net bilgim yok' de ve ürünün " +
    'resmi FAQ portalına yönlendir.',
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

    // Mode 1: SKU provided → return ALL product-scoped FAQs, no
    // semantic ranking. v9.2 behavior: trust the LLM to pick.
    if (sku) {
      const rows = await sql<FaqHit[]>`
        SELECT sku, question, answer, NULL::numeric AS similarity
        FROM product_faqs
        WHERE scope = 'product' AND sku = ${sku}
        ORDER BY id
        LIMIT 50
      `;
      const results = rows.map((r) => ({
        sku: r.sku ?? '',
        question: r.question,
        answer: r.answer,
        similarity: null,
      }));
      const result = FaqResultSchema.parse({
        results,
        totalReturned: results.length,
        topSimilarity: null,
        confidence: 'high' as const,
        recommendation: RECOMMENDATION.sku_bypass,
      });
      return c.json(result);
    }

    // Mode 2: cross-product semantic search
    const { vector } = await cachedEmbed(query, embedText);
    const vlit = vectorLiteral(vector);

    const rows = await sql<FaqHit[]>`
      SELECT sku, question, answer,
             (1 - (embedding <=> ${vlit}::vector)) AS similarity
      FROM product_faqs
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vlit}::vector
      LIMIT ${limit}
    `;

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
