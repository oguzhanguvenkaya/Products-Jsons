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
 * `template_group` üzerinde $eq filter kullanıyor. Değerler 24 custom
 * kategoriden biri olmalı (searchProducts tool description'ında liste var).
 */
export const searchByPriceRange = new Autonomous.Tool({
  name: 'searchByPriceRange',
  description:
    "Fiyat aralığında ürün arar. 'X TL altında', 'X TL'den pahalı', 'bütçeye uygun', " +
    "'en ucuz', 'en pahalı' gibi FİYAT-BAZLI sorularda kullan. " +
    "**Liste/öneri/sıralama + bütçe sorgularında BU TOOL ZORUNLU.** Choice sonrası bütçe " +
    "context'i hâlâ geçerliyse (örn. '1000 TL altı seramik' → Choice yüzey → 'boya') yine BU TOOL kullan; " +
    "maxPrice tekrar pas et. searchProducts fiyat filtresi YAPAMAZ. " +
    "Opsiyonel templateGroup, templateSubType, marka, sortDirection. " +
    "Variant-aware sıralama: asc → in-range variant min fiyatına göre (en ucuz), desc → max (en pahalı).",
  input: z.object({
    minPrice: z.number().int().optional().describe('Minimum fiyat (TL, dahil)'),
    maxPrice: z.number().int().optional().describe('Maksimum fiyat (TL, dahil)'),
    templateGroup: z
      .string()
      .optional()
      .describe(
        'searchProducts tool description\'ındaki 24 templateGroup değerinden biri ' +
          '(ör. "ceramic_coating", "car_shampoo"). Türkçe etiket DEĞİL — enum string.',
      ),
    templateSubType: z
      .string()
      .optional()
      .describe(
        "Alt-grup tam eşleşme. 'En pahalı pH nötr şampuan' gibi sub-kategori " +
          "spesifik sorularda ZORUNLU — yoksa templateGroup'un tüm sub_type'ları " +
          "karışır ve yanlış kategori 'en pahalı' olarak çıkar. Örnekler: " +
          "'ph_neutral_shampoo' (pH nötr şampuan), 'paint_coating' (boya seramik kaplama), " +
          "'heavy_cut_compound' (kalın pasta), 'tire_dressing' (lastik parlatıcı).",
      ),
    brand: z.string().optional().describe('Marka adı tam eşleşme (GYEON, MENZERNA vb.)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(8)
      .describe('Maksimum sonuç sayısı (varsayılan 8)'),
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
          templateSubType: z.string().nullable(),
          sizeOptions: z
            .array(
              z.object({
                size_display: z.string(),
                size_sort_value: z.number().nullable(),
                sku: z.string(),
                barcode: z.string(),
                url: z.string(),
                price: z.number(),
                image_url: z.string(),
              }),
            )
            .describe(
              "Fiyat filtresine uyan variant'lar — variant truth source. " +
                "Carousel button URL'li ilk 3'üyle üretilir.",
            ),
          sizeSummary: z
            .string()
            .describe(
              "Variant özet metni (filter sonrası): '1lt (1500 TL) | 25kg (15000 TL)'.",
            ),
        }),
      )
      .describe(
        'Tüm ürünlerin hafif özeti. templateSubType ile relevance check yap — ' +
          '"seramik kaplama" sorgusunda glass_coating/antifog karışırsa metinde flag\'le.',
      ),
    totalReturned: z.number().describe('Toplam dönen ürün sayısı'),
  }),
  async handler({
    minPrice,
    maxPrice,
    templateGroup,
    templateSubType,
    brand,
    limit,
    sortDirection,
  }) {
    return await retrievalClient.searchPrice({
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
      templateGroup: templateGroup ?? null,
      templateSubType: templateSubType ?? null,
      brand: brand ?? null,
      limit,
      sortDirection,
    });
  },
});
