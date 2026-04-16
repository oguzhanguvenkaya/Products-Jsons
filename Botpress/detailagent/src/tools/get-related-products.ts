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
    products: z.array(
      z.object({
        sku: z.string(),
        productName: z.string(),
        brand: z.string(),
        price: z.number(),
        imageUrl: z.string().nullable(),
        mainCat: z.string(),
        templateGroup: z.string(),
        templateSubType: z.string(),
        url: z.string().describe("Ürün sayfa URL'si (boş olabilir)"),
      }),
    ),
    totalReturned: z.number().int(),
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

    // v5.4: URL sanitization kaldırıldı. Master'da url artık dolu.

    return {
      sku,
      relationType,
      products: productsRes.rows.map((p) => ({
        sku: p.sku as string,
        productName: p.product_name as string,
        brand: p.brand as string,
        price: p.price as number,
        imageUrl: (p.image_url as string | null) ?? null,
        mainCat: p.main_cat as string,
        templateGroup: p.template_group as string,
        templateSubType: p.template_sub_type as string,
        url: (p.url as string) ?? '',
      })),
      totalReturned: productsRes.rows.length,
    };
  },
});
