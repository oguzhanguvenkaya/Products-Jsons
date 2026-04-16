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
    products: z.array(
      z.object({
        sku: z.string(),
        productName: z.string(),
        brand: z.string(),
        price: z.number(),
        mainCat: z.string(),
        subCat: z.string().nullable(),
        templateGroup: z.string(),
        templateSubType: z.string(),
        imageUrl: z.string().nullable(),
        url: z.string().describe("Ürün sayfa URL'si (boş olabilir)"),
      }),
    ),
    totalReturned: z.number().int(),
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

    // v5.4: URL sanitization kaldırıldı. Master'da url artık dolu. Boş olabilecek
    // 15 unmatched ürün için LLM instructions'ta "url yoksa text listesi" kuralı var.

    return {
      products: res.rows.map((r) => ({
        sku: r.sku as string,
        productName: r.product_name as string,
        brand: r.brand as string,
        price: r.price as number,
        mainCat: r.main_cat as string,
        subCat: (r.sub_cat as string | null) ?? null,
        templateGroup: r.template_group as string,
        templateSubType: r.template_sub_type as string,
        imageUrl: (r.image_url as string | null) ?? null,
        url: (r.url as string) ?? '',
      })),
      totalReturned: res.rows.length,
    };
  },
});
