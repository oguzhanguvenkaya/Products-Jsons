import { Autonomous, z } from '@botpress/runtime';
import { retrievalClient } from '../lib/retrieval-client.ts';

/**
 * searchByRating — Üretici rating'e göre sıralı ürün arama.
 *
 * specs_object.ratings alanı (durability, beading, self_cleaning) üzerinden
 * backend sıralama yapar. LLM multi-step yerine TEK çağrı ile top-N alır.
 *
 * Kullanım:
 *   - "Self-cleaning en iyi 3 seramik kaplama" → metric='self_cleaning',
 *     templateGroup='ceramic_coating', limit=3
 *   - "Boncuklanma puanı en yüksek ürünler" → metric='beading', limit=5
 *
 * Veri kaynağı: productSpecsTable.specs_object JSON içindeki `ratings` alanı.
 * 28 GYEON ürünü (Faz 3d enrichment) ratings'e sahip. Diğer markalar için
 * ratings null — karşılaştırmaya dahil edilmez.
 */
export const searchByRating = new Autonomous.Tool({
  name: 'searchByRating',
  description:
    "Üretici puanı (rating) en yüksek ürünleri döner. 'En iyi X', 'boncuklanma " +
    "puanı en yüksek', 'self-cleaning en güçlü', 'dayanıklılık puanı top 3' gibi " +
    "KARŞILAŞTIRMALI sorularda kullan. metric seçimi: durability (üretici " +
    "dayanıklılık), beading (boncuklanma), self_cleaning (kendini temizleme). " +
    "Sonuçlar rating değerine göre AZALAN sırayla döner. templateGroup ile " +
    "kategoriye sınırlayabilirsin (örn. ceramic_coating).",
  input: z.object({
    metric: z
      .enum(['durability', 'beading', 'self_cleaning'])
      .describe(
        "Sıralama metriği. durability=üretici dayanıklılık puanı, " +
          "beading=boncuklanma, self_cleaning=kendini temizleme. 1-5 arası.",
      ),
    templateGroup: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Opsiyonel kategori filtresi (searchProducts'taki 25 template_group değerinden biri). " +
          "Örn. 'ceramic_coating'. null ise tüm kategoriler dahil.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(3)
      .describe('Döndürülecek top-N ürün sayısı (varsayılan 3).'),
  }),
  output: z.object({
    metric: z.string(),
    rankedProducts: z
      .array(
        z.object({
          sku: z.string(),
          productName: z.string(),
          brand: z.string(),
          ratingValue: z.number().describe('Seçilen metriğin değeri (1-5).'),
          allRatings: z
            .object({
              durability: z.number().nullable(),
              beading: z.number().nullable(),
              self_cleaning: z.number().nullable(),
            })
            .describe('Tüm rating değerleri (karşılaştırma için).'),
          price: z.number(),
          url: z.string(),
          imageUrl: z.string().nullable(),
          carouselCard: z.object({
            title: z.string(),
            subtitle: z.string(),
            imageUrl: z.string().optional(),
            actions: z.array(
              z.object({
                action: z.literal('url'),
                label: z.string(),
                value: z.string(),
              }),
            ),
          }),
        }),
      )
      .describe('Rating metriğine göre azalan sırayla top-N ürün.'),
    totalCandidates: z
      .number()
      .describe("Rating'i olan toplam aday ürün sayısı (top-N filtrelemesi öncesi)."),
  }),
  async handler({ metric, templateGroup, limit }) {
    return await retrievalClient.searchRating({
      metric,
      templateGroup: templateGroup ?? null,
      limit,
    });
  },
});
