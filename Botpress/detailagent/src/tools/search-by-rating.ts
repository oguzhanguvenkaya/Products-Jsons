import { Autonomous, z, client } from '@botpress/runtime';

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
    // 1. specs_object'ten rating'li ürünleri çek (opt. kategori filter)
    const specsFilter: Record<string, unknown> = {};
    if (templateGroup) {
      specsFilter.template_group = { $eq: templateGroup };
    }

    const specsRes = await client.findTableRows({
      table: 'productSpecsTable',
      filter: Object.keys(specsFilter).length > 0 ? (specsFilter as any) : undefined,
      limit: 200,
    });

    // 2. Parse specs_object, extract ratings, filter non-null metric
    type RatingEntry = {
      sku: string;
      ratingValue: number;
      allRatings: { durability: number | null; beading: number | null; self_cleaning: number | null };
    };
    const candidates: RatingEntry[] = [];
    for (const row of specsRes.rows) {
      const raw = row.specs_object;
      let parsed: any;
      try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        continue;
      }
      const ratings = parsed?.ratings;
      if (!ratings || typeof ratings !== 'object') continue;
      const value = ratings[metric];
      if (typeof value !== 'number') continue;
      candidates.push({
        sku: row.sku as string,
        ratingValue: value,
        allRatings: {
          durability: typeof ratings.durability === 'number' ? ratings.durability : null,
          beading: typeof ratings.beading === 'number' ? ratings.beading : null,
          self_cleaning: typeof ratings.self_cleaning === 'number' ? ratings.self_cleaning : null,
        },
      });
    }

    // 3. Sort descending, take limit
    candidates.sort((a, b) => b.ratingValue - a.ratingValue);
    const topSkus = candidates.slice(0, limit);

    // 4. Master lookup for carousel data
    if (topSkus.length === 0) {
      return { metric, rankedProducts: [], totalCandidates: 0 };
    }

    const masterRes = await client.findTableRows({
      table: 'productsMasterTable',
      filter: { sku: { $in: topSkus.map((t) => t.sku) } } as any,
      limit: topSkus.length,
    });
    const masterBySku = new Map(masterRes.rows.map((r) => [r.sku as string, r]));

    const rankedProducts = topSkus
      .map((t) => {
        const m = masterBySku.get(t.sku);
        if (!m) return null;
        const productName = m.product_name as string;
        const brand = m.brand as string;
        const price = m.price as number;
        const url = (m.url as string) || '';
        const imageUrl = (m.image_url as string | null) ?? null;

        const metricLabel =
          metric === 'self_cleaning' ? 'Self-Cleaning' : metric === 'beading' ? 'Beading' : 'Dayanıklılık';
        return {
          sku: t.sku,
          productName,
          brand,
          ratingValue: t.ratingValue,
          allRatings: t.allRatings,
          price,
          url,
          imageUrl,
          carouselCard: {
            title: productName,
            subtitle: `${brand} • ${metricLabel} ${t.ratingValue}/5 • ${price.toLocaleString('tr-TR')} TL`,
            ...(imageUrl ? { imageUrl } : {}),
            actions: url
              ? [{ action: 'url' as const, label: 'Ürün Sayfasına Git', value: url }]
              : [],
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      metric,
      rankedProducts,
      totalCandidates: candidates.length,
    };
  },
});
