import { Autonomous, z, client } from '@botpress/runtime';

/**
 * getRelatedProducts — İlişkili ürünleri tipine göre çeker (use_with, alternatives vb.).
 *
 * Akış:
 *   1. productRelationsTable'dan SKU'nun ilişki satırını oku
 *   2. İstenen relationType alanından virgülle ayrılmış SKU listesini al
 *   3. productsMasterTable'dan o SKU'ların TAM bilgisini ($in operator) çek
 *   4. Carousel render etmeye uygun structured veri döndür
 *
 * Studio bot'unda bu işlem ya search() prose'undan çıkarılıyordu (kayıp olabilir)
 * ya da hiç yapılmıyordu. Bu tool ile yapısal lookup garanti.
 *
 * NOT: relations tablosunda bazı alanlar boş (use_with %78 boş). Boş ise
 * `products: []` döner — LLM dürüstçe "ilişkili ürün bulunamadı" der.
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
    // 1. relations tablosundan satırı oku
    const relRes = await client.findTableRows({
      table: 'productRelationsTable',
      filter: { sku: { $eq: sku } },
      limit: 1,
    });

    const relRow = relRes.rows[0];
    if (!relRow) {
      return { sku, relationType, products: [], totalReturned: 0 };
    }

    // 2. İstenen alanı parse et (virgülle ayrılmış SKU listesi)
    const rawValue = relRow[relationType] as string | null | undefined;
    if (!rawValue) {
      return { sku, relationType, products: [], totalReturned: 0 };
    }

    const relatedSkus = rawValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (relatedSkus.length === 0) {
      return { sku, relationType, products: [], totalReturned: 0 };
    }

    // 3. products_master'dan tam bilgileri çek ($in operator)
    const productsRes = await client.findTableRows({
      table: 'productsMasterTable',
      filter: { sku: { $in: relatedSkus } },
      limit: relatedSkus.length,
    });

    // v7.0: UI-ready output
    const rows = productsRes.rows;
    const hasRenderableUrl = (r: Record<string, unknown>): boolean => {
      const url = typeof r.url === 'string' ? r.url.trim() : '';
      return url.startsWith('http://') || url.startsWith('https://');
    };

    return {
      sku,
      relationType,
      carouselItems: rows
        .filter(hasRenderableUrl)
        .map((p) => ({
          title: p.product_name as string,
          subtitle: `${p.brand as string} \u2022 ${(p.price as number).toLocaleString('tr-TR')} TL`,
          imageUrl: (p.image_url as string) || undefined,
          actions: [
            { action: 'url' as const, label: 'Ürün Sayfasına Git', value: (p.url as string).trim() },
          ],
        })),

      textFallbackLines: rows
        .filter((r) => !hasRenderableUrl(r))
        .map((p) => ({
          productName: p.product_name as string,
          brand: p.brand as string,
          price: p.price as number,
          sku: p.sku as string,
        })),

      productSummaries: rows.map((p) => ({
        sku: p.sku as string,
        name: p.product_name as string,
        brand: p.brand as string,
        price: p.price as number,
        templateGroup: p.template_group as string,
      })),

      totalReturned: rows.length,
    };
  },
});
