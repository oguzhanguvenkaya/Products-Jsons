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
  async handler({ sku: inputSku, relationType }) {
    // v8.5: Primary SKU lookup (relations data primary-based after M.4)
    let primarySku = inputSku;
    const direct = await client.findTableRows({
      table: 'productsMasterTable', filter: { sku: { $eq: inputSku } }, limit: 1,
    });
    if (direct.rows.length === 0) {
      const v = await client.findTableRows({
        table: 'productsMasterTable',
        filter: { variant_skus: { $regex: inputSku, $options: 'i' } } as any,
        limit: 1,
      });
      if (v.rows[0]) primarySku = v.rows[0].sku as string;
    }

    // 1. relations from primary
    const relRes = await client.findTableRows({
      table: 'productRelationsTable', filter: { sku: { $eq: primarySku } }, limit: 1,
    });
    const relRow = relRes.rows[0];
    if (!relRow) {
      return { sku: inputSku, relationType, carouselItems: [], textFallbackLines: [], productSummaries: [], totalReturned: 0 };
    }

    const rawValue = relRow[relationType] as string | null | undefined;
    if (!rawValue) {
      return { sku: inputSku, relationType, carouselItems: [], textFallbackLines: [], productSummaries: [], totalReturned: 0 };
    }
    const relatedSkus = rawValue.split(',').map((s) => s.trim()).filter(Boolean);
    if (relatedSkus.length === 0) {
      return { sku: inputSku, relationType, carouselItems: [], textFallbackLines: [], productSummaries: [], totalReturned: 0 };
    }

    // 2. master lookup with sizes
    const productsRes = await client.findTableRows({
      table: 'productsMasterTable',
      filter: { sku: { $in: relatedSkus } },
      limit: relatedSkus.length,
    });
    const rows = productsRes.rows;

    // 3. For each target primary, expand sizes — default = smallest variant (user-friendly)
    const hasRenderableUrl = (url: unknown): boolean => {
      const u = typeof url === 'string' ? url.trim() : '';
      return u.startsWith('http://') || u.startsWith('https://');
    };

    const carouselItems: Array<any> = [];
    const textFallbackLines: Array<any> = [];
    const productSummaries: Array<any> = [];

    for (const p of rows) {
      const baseName = (p.base_name as string) || (p.product_name as string);
      const brand = p.brand as string;
      let variants: Array<any> = [];
      if (p.sizes) {
        try { variants = JSON.parse(p.sizes as string); } catch {}
      }

      // Default = smallest variant (ekonomik seçim)
      const defaultVariant = variants.length > 0
        ? [...variants].sort((a, b) => (a.size_sort_value || 0) - (b.size_sort_value || 0))[0]
        : null;

      if (defaultVariant && hasRenderableUrl(defaultVariant.url)) {
        const sizeLabel = defaultVariant.size_display ? ` — ${defaultVariant.size_display}` : '';
        carouselItems.push({
          title: `${baseName}${sizeLabel}`,
          subtitle: `${brand} \u2022 ${defaultVariant.price.toLocaleString('tr-TR')} TL${variants.length > 1 ? ` (${variants.length} boyut)` : ''}`,
          imageUrl: defaultVariant.image_url || undefined,
          actions: [{ action: 'url' as const, label: 'Ürün Sayfasına Git', value: defaultVariant.url.trim() }],
        });
      } else if (hasRenderableUrl(p.url)) {
        // Fallback to primary row
        carouselItems.push({
          title: p.product_name as string,
          subtitle: `${brand} \u2022 ${(p.price as number).toLocaleString('tr-TR')} TL`,
          imageUrl: (p.image_url as string) || undefined,
          actions: [{ action: 'url' as const, label: 'Ürün Sayfasına Git', value: (p.url as string).trim() }],
        });
      } else {
        textFallbackLines.push({
          productName: p.product_name as string, brand,
          price: p.price as number, sku: p.sku as string,
        });
      }

      productSummaries.push({
        sku: p.sku as string,
        name: baseName,
        brand,
        price: p.price as number,
        templateGroup: p.template_group as string,
      });
    }

    return {
      sku: inputSku, relationType,
      carouselItems, textFallbackLines, productSummaries,
      totalReturned: rows.length,
    };
  },
});
