import { Autonomous, z } from '@botpress/runtime';
import { retrievalClient } from '../lib/retrieval-client.ts';

/**
 * getApplicationGuide — Bir ürünün YAPILANDIRILMIŞ uygulama rehberini döner.
 *
 * Phase 4 cutover: Eskiden 4-tablo paralel JOIN (master + content + desc_part1
 * + desc_part2) bot tarafında yapılıyordu; artık microservice
 * `/products/:sku/guide` endpoint'i tek SQL ile halleder ve videoCard'ı
 * YouTube ID parse edip server-side üretir.
 *
 * getProductDetails'in HAFİF varyantıdır — teknik specs, 30 FAQ ve variants
 * döndürmez. "Nasıl uygulanır" sorularında LLM context 3-4x daha küçük
 * (~1500 token vs 5000 token).
 *
 * Secondary (variant) SKU → primary resolve microservice tarafında otomatik.
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
  async handler({ sku }) {
    return await retrievalClient.getGuide(sku);
  },
});
