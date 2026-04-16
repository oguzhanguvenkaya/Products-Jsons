import { Autonomous, z, client } from '@botpress/runtime';

/**
 * getApplicationGuide — Bir ürünün YAPILANDIRILMIŞ uygulama rehberini döner.
 *
 * v5.4: productContentTable'dan productName/targetSurface/templateGroup silindi
 * (duplicate'ti). Artık content + master paralel join yapılır; productName ve
 * targetSurface master'dan gelir, url artık master'da dolu.
 *
 * "Nasıl uygulanır?", "5 adımı göster", "ne zaman kullanılır?", "neden bu ürün?"
 * gibi sorularda kullanılır.
 *
 * Bu tool getProductDetails'in HAFİF varyantıdır — specs ve faq okumadan
 * sadece uygulama rehberi + master temel bilgisini döndürür.
 */
export const getApplicationGuide = new Autonomous.Tool({
  name: 'getApplicationGuide',
  description:
    "Bir ürünün YAPILANDIRILMIŞ uygulama rehberini döner: nasıl uygulanır (adım adım talimat), " +
    "ne zaman kullanılır (senaryo), neden bu ürün (avantajlar), hedef yüzey, tam açıklama. " +
    "Kullanıcı 'nasıl uygulanır', 'kaç adım', 'ne zaman kullanılır', 'ne işe yarar' gibi " +
    "uygulama soruları sorduğunda KULLAN. SKU'yu önce searchProducts ile bul.",
  input: z.object({
    sku: z.string().describe("Ürün SKU'su (searchProducts sonucundan al)"),
  }),
  output: z.object({
    sku: z.string(),
    productName: z.string(),
    brand: z.string(),
    price: z.number(),
    imageUrl: z.string().nullable(),
    url: z.string().describe("Ürün sayfa URL'si (boş olabilir)"),
    targetSurface: z.string().nullable().describe('Hedef yüzey tipleri'),
    templateGroup: z.string().describe('Custom chatbot kategorisi'),
    templateSubType: z.string().describe('Granüler ürün-tipi'),
    howToUse: z.string().nullable().describe('Adım adım uygulama talimatı'),
    whenToUse: z.string().nullable().describe('Hangi senaryolarda kullanılır'),
    whyThisProduct: z.string().nullable().describe('Bu ürünün öne çıkan avantajları'),
    fullDescription: z.string().nullable().describe('HTML temizlenmiş tam açıklama'),
  }),
  async handler({ sku }) {
    // Content + master paralel join — productName/targetSurface/url master'dan gelir
    const [contentRes, masterRes] = await Promise.all([
      client.findTableRows({
        table: 'productContentTable',
        filter: { sku: { $eq: sku } },
        limit: 1,
      }),
      client.findTableRows({
        table: 'productsMasterTable',
        filter: { sku: { $eq: sku } },
        limit: 1,
      }),
    ]);

    const master = masterRes.rows[0];
    if (!master) {
      throw new Error(`Ürün bulunamadı (sku=${sku})`);
    }

    const content = contentRes.rows[0];

    return {
      sku: master.sku as string,
      productName: master.product_name as string,
      brand: master.brand as string,
      price: master.price as number,
      imageUrl: (master.image_url as string | null) ?? null,
      url: (master.url as string) ?? '',
      targetSurface: (master.target_surface as string | null) ?? null,
      templateGroup: master.template_group as string,
      templateSubType: master.template_sub_type as string,
      howToUse: (content?.howToUse as string | null) ?? null,
      whenToUse: (content?.whenToUse as string | null) ?? null,
      whyThisProduct: (content?.whyThisProduct as string | null) ?? null,
      fullDescription: (content?.fullDescription as string | null) ?? null,
    };
  },
});
