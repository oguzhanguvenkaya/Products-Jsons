import { Autonomous, z, client } from '@botpress/runtime';

/**
 * searchByPriceRange — Yapılandırılmış fiyat filtresiyle ürün arama.
 *
 * Vector search fiyat filtresi yapamaz — sadece anlamsal benzerlik.
 * "Wetcoat'tan pahalı" gibi sorular için bu tool şart.
 *
 * Tipik akış:
 *   1. LLM önce searchProducts ile referans ürünü bulur, fiyatı 1000 TL
 *   2. searchByPriceRange({ minPrice: 1001, templateGroup: "paint_protection_quick" })
 *   3. Filtre sonucu fiyata göre artan sıralı liste döner
 *
 * NOT: v6.2'de `$or` + `$regex` kombinasyonu Botpress API'de kırıldı
 * ("Unrecognized key(s) in object: 'c_5'"). Artık category param'ı
 * `template_group` üzerinde $eq filter kullanıyor. Değerler 25 custom
 * kategoriden biri olmalı (searchProducts tool description'ında liste var).
 */
export const searchByPriceRange = new Autonomous.Tool({
  name: 'searchByPriceRange',
  description:
    "Fiyat aralığında ürün arar. 'X TL altında', 'X TL'den pahalı', 'bütçeye uygun', " +
    "'ucuz alternatif', 'en pahalı/en ucuz' gibi FİYAT-BAZLI sorularda kullan. " +
    "searchProducts fiyat filtresi YAPAMAZ. Opsiyonel templateGroup ve marka filtresi " +
    "alır. Sonuçlar fiyata göre artan sıralı döner.",
  input: z.object({
    minPrice: z.number().int().optional().describe('Minimum fiyat (TL, dahil)'),
    maxPrice: z.number().int().optional().describe('Maksimum fiyat (TL, dahil)'),
    templateGroup: z
      .string()
      .optional()
      .describe(
        'Custom kategori tam eşleşme — searchProducts tool description\'ındaki 25 değerden biri ' +
          '(ör. "ceramic_coating", "car_shampoo", "abrasive_polish", "paint_protection_quick"). ' +
          'TEMPLATE_GROUP VALUE OLMALI — "Seramik Kaplama" gibi Türkçe metin DEĞİL.',
      ),
    brand: z.string().optional().describe('Marka adı tam eşleşme (GYEON, MENZERNA vb.)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(10)
      .describe('Maksimum sonuç sayısı (varsayılan 10)'),
  }),
  output: z.object({
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
      .describe('URL olan ürünler — yield <Carousel items={carouselItems} /> (max 10)'),
    textFallbackLines: z
      .array(
        z.object({
          productName: z.string(),
          brand: z.string(),
          price: z.number(),
          sku: z.string(),
        }),
      )
      .describe('URL olmayan ürünler — markdown text listesi olarak göster'),
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
      .describe('Tüm ürünlerin hafif özeti'),
    totalReturned: z.number().describe('Toplam dönen ürün sayısı'),
  }),
  async handler({ minPrice, maxPrice, templateGroup, brand, limit }) {
    const filter: Record<string, unknown> = {};

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (minPrice !== undefined) priceFilter.$gte = minPrice;
      if (maxPrice !== undefined) priceFilter.$lte = maxPrice;
      filter.price = priceFilter;
    }

    if (brand) {
      filter.brand = { $eq: brand };
    }

    // v6.2: $or + $regex kombinasyonu Botpress API'de kırık ('Unrecognized key c_5').
    // Artık template_group üzerinde $eq filter kullanıyoruz. 25 custom kategori
    // değeri kesin eşleşme sağlar.
    if (templateGroup) {
      filter.template_group = { $eq: templateGroup };
    }

    const res = await client.findTableRows({
      table: 'productsMasterTable',
      filter,
      orderBy: 'price',
      orderDirection: 'asc',
      limit,
    });

    // v7.0: UI-ready output
    const rows = res.rows;
    const hasRenderableUrl = (r: Record<string, unknown>): boolean => {
      const url = typeof r.url === 'string' ? r.url.trim() : '';
      return url.startsWith('http://') || url.startsWith('https://');
    };

    return {
      carouselItems: rows
        .filter(hasRenderableUrl)
        .slice(0, 10) // revize_4: carousel max 10 item
        .map((r) => ({
          title: r.product_name as string,
          subtitle: `${r.brand as string} \u2022 ${(r.price as number).toLocaleString('tr-TR')} TL`,
          imageUrl: (r.image_url as string) || undefined,
          actions: [
            { action: 'url' as const, label: 'Ürün Sayfasına Git', value: (r.url as string).trim() },
          ],
        })),

      textFallbackLines: rows
        .filter((r) => !hasRenderableUrl(r))
        .map((r) => ({
          productName: r.product_name as string,
          brand: r.brand as string,
          price: r.price as number,
          sku: r.sku as string,
        })),

      productSummaries: rows.map((r) => ({
        sku: r.sku as string,
        name: r.product_name as string,
        brand: r.brand as string,
        price: r.price as number,
        templateGroup: r.template_group as string,
      })),

      totalReturned: rows.length,
    };
  },
});
