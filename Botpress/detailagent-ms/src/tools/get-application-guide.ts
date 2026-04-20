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
    videoCard: z
      .object({
        title: z.string(),
        subtitle: z.string(),
        imageUrl: z.string().describe('YouTube thumbnail'),
        actions: z.array(
          z.object({
            action: z.literal('url'),
            label: z.string(),
            value: z.string().describe('YouTube video URL'),
          }),
        ),
      })
      .nullable()
      .describe(
        'Üretici resmi uygulama videosu — Carousel item olarak yield edilir. ' +
          'video_url yoksa null döner. Kullanıcı "nasıl uygulanır" sorduğunda mutlaka göster.',
      ),
  }),
  async handler({ sku: inputSku }) {
    // v8.5: Primary SKU lookup (direct or via variant_skus)
    let masterRow = null as Record<string, unknown> | null;
    const direct = await client.findTableRows({
      table: 'productsMasterTable', filter: { sku: { $eq: inputSku } }, limit: 1,
    });
    if (direct.rows.length > 0) {
      masterRow = direct.rows[0];
    } else {
      const variant = await client.findTableRows({
        table: 'productsMasterTable',
        filter: { variant_skus: { $regex: inputSku, $options: 'i' } } as any,
        limit: 1,
      });
      masterRow = variant.rows[0] ?? null;
    }
    if (!masterRow) throw new Error(`Ürün bulunamadı (sku=${inputSku})`);
    const primarySku = masterRow.sku as string;

    // Shared content via primary SKU
    const [contentRes, desc1Res, desc2Res] = await Promise.all([
      client.findTableRows({ table: 'productContentTable', filter: { sku: { $eq: primarySku } }, limit: 1 }),
      client.findTableRows({ table: 'productDescPart1Table', filter: { sku: { $eq: primarySku } }, limit: 1 }),
      client.findTableRows({ table: 'productDescPart2Table', filter: { sku: { $eq: primarySku } }, limit: 1 }),
    ]);

    const master = masterRow;

    const content = contentRes.rows[0];

    // v7.2: fullDescription birleştir (part1 + part2)
    const descPart1 = (desc1Res.rows[0]?.fullDescription as string) ?? '';
    const descPart2 = (desc2Res.rows[0]?.fullDescription as string) ?? '';
    const fullDescription = descPart1 + descPart2;

    // Video card — resmi YouTube URL varsa Carousel item'a hazırla
    const rawVideoUrl = (master.video_url as string | null) ?? null;
    const videoUrl = rawVideoUrl && rawVideoUrl.trim().length > 0 ? rawVideoUrl.trim() : null;
    let videoCard: {
      title: string;
      subtitle: string;
      imageUrl: string;
      actions: { action: 'url'; label: string; value: string }[];
    } | null = null;
    if (videoUrl) {
      // youtu.be/XXXXX veya youtube.com/watch?v=XXXXX'den video ID çıkar
      const byeMatch = videoUrl.match(/youtu\.be\/([^?&/]+)/);
      const wwwMatch = videoUrl.match(/[?&]v=([^&]+)/);
      const videoId = byeMatch?.[1] ?? wwwMatch?.[1] ?? null;
      if (videoId) {
        videoCard = {
          title: (master.product_name as string) + ' — Uygulama Videosu',
          subtitle: 'Üretici resmi rehberi',
          imageUrl: 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg',
          actions: [
            {
              action: 'url' as const,
              label: '▶ Videoyu İzle',
              value: videoUrl,
            },
          ],
        };
      }
    }

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
      fullDescription: fullDescription || null,
      videoCard,
    };
  },
});
