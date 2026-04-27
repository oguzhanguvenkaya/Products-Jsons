import { Autonomous, z } from '@botpress/runtime';
import { retrievalClient } from '../lib/retrieval-client.ts';

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
    "'en ucuz', 'en pahalı' gibi FİYAT-BAZLI sorularda kullan. " +
    "searchProducts fiyat filtresi YAPAMAZ. Opsiyonel templateGroup, marka, sortDirection. " +
    "Variant-aware sıralama: asc → in-range variant min fiyatına göre (en ucuz), desc → max (en pahalı).",
  input: z.object({
    minPrice: z.number().int().optional().describe('Minimum fiyat (TL, dahil)'),
    maxPrice: z.number().int().optional().describe('Maksimum fiyat (TL, dahil)'),
    templateGroup: z
      .string()
      .optional()
      .describe(
        'searchProducts tool description\'ındaki 25 templateGroup değerinden biri ' +
          '(ör. "ceramic_coating", "car_shampoo"). Türkçe etiket DEĞİL — enum string.',
      ),
    brand: z.string().optional().describe('Marka adı tam eşleşme (GYEON, MENZERNA vb.)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(10)
      .describe('Maksimum sonuç sayısı (varsayılan 10)'),
    sortDirection: z
      .enum(['asc', 'desc'])
      .default('asc')
      .describe(
        "'asc' = en ucuz önce (default). 'desc' = en pahalı önce. " +
          "'en pahalı X' sorusunda 'desc' kullan.",
      ),
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
  async handler({ minPrice, maxPrice, templateGroup, brand, limit, sortDirection }) {
    return await retrievalClient.searchPrice({
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
      templateGroup: templateGroup ?? null,
      brand: brand ?? null,
      limit,
      sortDirection,
    });
  },
});
