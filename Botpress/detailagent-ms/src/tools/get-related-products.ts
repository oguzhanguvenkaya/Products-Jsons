import { Autonomous, z } from '@botpress/runtime';
import { retrievalClient } from '../lib/retrieval-client.ts';

/**
 * getRelatedProducts — İlişkili ürünleri tipine göre çeker.
 *
 * Phase 4 cutover: `/products/:sku/related?relationType=X` microservice
 * endpoint'i tek SQL JOIN ile relations × products fetch + Carousel
 * format döndürür (retrieval-service/src/routes/products.ts).
 *
 * Migration 005 ile granular relation_type'lar korunuyor — Phase 1 seed
 * zamanında yanlışlıkla hepsini 'complement' veya 'alternative'e collapse
 * etmiştik, Phase 3 Step 3.3'te 5 granular tip geri getirildi: use_with,
 * use_before, use_after, accessories, alternatives.
 *
 * Boş ilişki → `totalReturned: 0` ve LLM "ilişkili ürün bulunamadı" der.
 */
export const getRelatedProducts = new Autonomous.Tool({
  name: 'getRelatedProducts',
  description:
    "Bir ürünün İLİŞKİLİ ürünlerini çeker. Kullan: 'X ne ile uygulanır' → use_with, " +
    "'X'in alternatifi' → alternatives, 'X'ten önce ne kullanılır' → use_before, " +
    "'X'ten sonra ne kullanılır' → use_after, 'X için aksesuar' → accessories. " +
    "SKU'yu önce search() ile bul, sonra bu tool'u relationType ile çağır. " +
    "Eğer ilişki boşsa boş array döner — uydurma yapma, dürüstçe söyle.",
  input: z.object({
    sku: z.string().describe('Ana ürünün SKU\'su'),
    relationType: z
      .enum(['use_with', 'use_before', 'use_after', 'alternatives', 'accessories'])
      .describe(
        "İlişki tipi: use_with (birlikte), use_before (öncesinde), " +
          "use_after (sonrasında), alternatives (alternatif), accessories (aksesuar)",
      ),
  }),
  output: z.object({
    sku: z.string(),
    relationType: z.string(),
    carouselItems: z
      .array(
        z.object({
          title: z.string(),
          subtitle: z.string(),
          imageUrl: z.string().optional(),
          actions: z.array(
            z.object({
              action: z.enum(['url']),
              label: z.string(),
              value: z.string(),
            }),
          ),
        }),
      )
      .describe('URL olan ilişkili ürünler — yield <Carousel items={carouselItems} />'),
    textFallbackLines: z
      .array(
        z.object({
          productName: z.string(),
          brand: z.string(),
          price: z.number(),
          sku: z.string(),
        }),
      )
      .describe('URL olmayan ürünler — markdown text listesi'),
    productSummaries: z
      .array(
        z.object({
          sku: z.string(),
          name: z.string(),
          brand: z.string(),
          price: z.number(),
          templateGroup: z.string(),
        }),
      )
      .describe('Tüm ilişkili ürünlerin hafif özeti'),
    totalReturned: z.number().describe('Toplam dönen ürün sayısı'),
  }),
  async handler({ sku, relationType }) {
    return await retrievalClient.getRelated(sku, relationType);
  },
});
