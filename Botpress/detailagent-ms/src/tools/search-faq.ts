import { Autonomous, z } from '@botpress/runtime';
import { retrievalClient } from '../lib/retrieval-client.ts';

/**
 * searchFaq — Ürün/marka/kategori FAQ'larında (3,156 kayıt) semantic arama.
 *
 * Phase 4 cutover: microservice `/faq` endpoint hybrid retrieval (BM25 + vector)
 * çalıştırır, SKU-bypass + confidence tier logic server-side. v9.2 davranışı
 * microservice'te aynen korundu.
 *
 * Bu tool, kullanıcı "X kullanılabilir mi", "X ile uyumlu mu", "X silikon
 * içeriyor mu" gibi NÜANSLI teknik sorular sorduğunda devreye girer.
 *
 * Ana searchProducts'tan farkı: sorgu ürün sorusu değil, ürün ÖZELLİĞİ veya
 * kullanım nüansı sorusu. FAQ cevapları zaten hazır, LLM'in yorumlamasına
 * gerek yok — direkt SSS'ten cevap çıkarılır.
 */
export const searchFaq = new Autonomous.Tool({
  name: 'searchFaq',
  description:
    "FAQ semantic arama. Kullanım instruction §FAQ Tool Kullanım Politikası'nda " +
    "(detail-first cascade): lastFocusSku VAR → ÖNCE getProductDetails.faqs, " +
    "topic eşleşmedi ise searchFaq({query, sku}) fallback. lastFocusSku YOK → " +
    "genel cross-product/marka soruları için searchFaq({query}). SKU biliniyorsa " +
    "sku parametresi GEÇ — yanlış ürün cevabı riski azalır.",
  input: z.object({
    query: z
      .string()
      .describe(
        "FAQ araması için kullanıcı sorusunun doğal dil hali " +
          "(ör: 'wetcoat ıslak yüzeyde mi kullanılır', 'Menzerna 300 silikon içerir mi')",
      ),
    sku: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Opsiyonel SKU filtresi. Kullanıcı spesifik bir ürün hakkında soru soruyorsa " +
          "(state.lastFocusSku veya yeni searchProducts sonucu), bu SKU'yu geç. " +
          "FAQ araması SADECE o ürünün FAQ'ları içinde yapılır — yanlış ürün cevabı gelmez.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe('Döndürülecek maksimum SSS sayısı (varsayılan 5)'),
  }),
  output: z.object({
    results: z.array(
      z.object({
        sku: z.string(),
        question: z.string(),
        answer: z.string(),
        similarity: z.number().nullable(),
      }),
    ),
    totalReturned: z.number().int(),
    topSimilarity: z.number().nullable().describe('En yüksek similarity skoru (0-1)'),
    confidence: z
      .enum(['high', 'low', 'none'])
      .describe(
        "Top result'un güvenilirliği: high (≥0.6), low (0.4-0.6), none (<0.4).",
      ),
    recommendation: z
      .string()
      .describe(
        "LLM için kullanım talimatı. Bot bu alanı okuyup confidence'a göre davranmalı.",
      ),
  }),
  async handler({ query, sku, limit }) {
    // Phase 4 cutover: v9.2 SKU-bypass + confidence tier + recommendation
    // string selection artık microservice'te
    // (retrieval-service/src/routes/faq.ts). Bot handler raw response'u
    // forward ediyor, LLM confidence/recommendation'a göre yanıt stilini
    // seçiyor (conversation instruction bu davranışı anlatıyor).
    return await retrievalClient.faq({
      query,
      sku: sku ?? null,
      limit,
    });
  },
});
