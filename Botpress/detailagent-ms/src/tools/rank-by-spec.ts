import { Autonomous, z } from '@botpress/runtime';
import { retrievalClient } from '../lib/retrieval-client.ts';

/**
 * rankBySpec — Universal numeric / üretici puanı sıralama (Phase 1.1).
 *
 * "En dayanıklı", "en güçlü kesim", "en büyük şampuan", "boncuklanma
 * en yüksek 3" gibi SUPERLATIVE / TOP-N sorularında **tek API yolu.
 * searchByRating kaldırıldı — rating sıralaması da bu tool üzerinden
 * (`rating_durability`, `rating_beading`, `rating_self_cleaning`).
 *
 * Numeric filter sorguları (örn. "36 ay üzeri seramik" — sıralama yok)
 * için searchProducts + metaFilter kullanılır; rankBySpec değil.
 *
 * Fiyat sıralaması için searchByPriceRange (sortDirection: 'asc'|'desc')
 * — variant fiyatı / URL gösterimi özel mantık gerektiriyor.
 *
 * Output kuralları:
 *   - rankedProducts dolu → yield <Carousel items={...} />
 *   - coverageNote dolu → metinde mutlaka kullanıcıya ilet (RAG SSOT;
 *     backend dinamik üretiyor, instruction'da hardcode yok)
 */
export const rankBySpec = new Autonomous.Tool({
  name: 'rankBySpec',
  description:
    "Numeric/puan sıralama tool'u. SUPERLATIVE/TOP-N sorularında kullan: " +
    "'en dayanıklı', 'en güçlü', 'top 3', 'en büyük', 'en az tüketen', " +
    "'boncuklanma en yüksek'. Numeric FILTER ('36 ay üzeri', sıralama yok) → " +
    "searchProducts + metaFilter. Fiyat sıralama → searchByPriceRange. " +
    "consumption_per_car_ml + direction='desc' anlamsızdır → 400 döner. " +
    "Output'ta `coverageNote` dolu ise metinde MUTLAKA kullanıcıya ilet.",
  input: z.object({
    sortKey: z
      .enum([
        'durability_months',
        'durability_km',
        'cut_level',
        'volume_ml',
        'weight_g',
        'capacity_ml',
        'capacity_usable_ml',
        'consumption_per_car_ml',
        'rating_durability',
        'rating_beading',
        'rating_self_cleaning',
      ])
      .describe(
        "Sıralama metriği. Örnekler: 'en dayanıklı'→durability_months, " +
          "'en güçlü kesim'→cut_level, 'en büyük şampuan/seramik (sıvı)'→volume_ml, " +
          "'en büyük pasta (katı)'→weight_g, 'en ekonomik tüketim'→consumption_per_car_ml, " +
          "'boncuklanma en yüksek'→rating_beading. " +
          "ph_level / hardness / product_type / purpose RANKING DEĞİL — " +
          "filter için searchProducts.metaFilters kullan.",
      ),
    direction: z
      .enum(['asc', 'desc'])
      .default('desc')
      .describe(
        "'desc' (default) = en yüksek değer önce ('en dayanıklı', 'en güçlü'). " +
          "'asc' = en düşük önce ('en az tüketen', 'en küçük ambalaj'). " +
          "consumption_per_car_ml + 'desc' kombinasyonu reject edilir.",
      ),
    templateGroup: z
      .string()
      .optional()
      .describe(
        'searchProducts tool description\'ındaki 24 templateGroup değerinden biri (ör. "ceramic_coating").',
      ),
    templateSubType: z.string().optional(),
    brand: z.string().optional().describe('GYEON, MENZERNA vb. tam eşleşme.'),
    minValue: z
      .number()
      .optional()
      .describe(
        "Sıralama yaparken alt sınır filtresi. Örn '36 ay üzeri en dayanıklı' → " +
          "sortKey:'durability_months', direction:'desc', minValue:36.",
      ),
    maxValue: z.number().optional().describe('Sıralama yaparken üst sınır filtresi.'),
    limit: z.number().int().min(1).max(10).default(8),
  }),
  output: z.object({
    sortKey: z.string(),
    direction: z.string(),
    unit: z
      .string()
      .describe("Birim eki: ' ay', ' km', ' ml', ' g', '/10', ' puan', ''."),
    rankedProducts: z
      .array(
        z.object({
          sku: z.string(),
          productName: z.string(),
          brand: z.string(),
          rankValue: z.number().describe('Sıralanan metriğin değeri.'),
          price: z.number(),
          url: z.string(),
          imageUrl: z.string().nullable(),
          // UI render objesi — Carousel widget şeması; structural validation
          // gerekli değil, bot doğrudan yield içine geçiriyor.
          carouselCard: z.any(),
        }),
      )
      .describe('Sıralı top-N. yield <Carousel items={rankedProducts.map(p=>p.carouselCard)} />'),
    totalCandidates: z
      .number()
      .int()
      .describe('Aktif filtreler sonrası sıralanabilir aday sayısı.'),
    coverageTotal: z
      .number()
      .int()
      .describe('Bu sortKey için DB genelinde numeric değer girilmiş ürün sayısı (filter-bağımsız).'),
    coverageNote: z
      .string()
      .nullable()
      .describe(
        'Düşük kapsamlı key\'lerde (rating_*, durability_km, cut_level, ' +
          'consumption_per_car_ml, capacity_usable_ml) backend tarafından üretilir. ' +
          'Doluysa metinde MUTLAKA ilet. null ise gürültü yapma.',
      ),
  }),
  async handler({
    sortKey,
    direction,
    templateGroup,
    templateSubType,
    brand,
    minValue,
    maxValue,
    limit,
  }) {
    return await retrievalClient.rankBySpec({
      sortKey,
      direction,
      templateGroup: templateGroup ?? null,
      templateSubType: templateSubType ?? null,
      brand: brand ?? null,
      minValue: minValue ?? null,
      maxValue: maxValue ?? null,
      limit,
    });
  },
});
