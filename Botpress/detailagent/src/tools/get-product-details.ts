import { Autonomous, z, client } from '@botpress/runtime';

/**
 * getProductDetails — Bir SKU'nun TÜM bilgisini paralel 4 sorgu ile birleştirir.
 *
 * Tool çağrı pattern'i:
 *   1. LLM önce searchProducts ile ürünü bulur (SKU'yu öğrenir)
 *   2. Sonra getProductDetails(sku) ile derinlemesine veriyi çeker
 *
 * 4 tablodan paralel veri:
 *   - productsMasterTable: ana bilgi (ad, marka, fiyat, görsel, kategori)
 *   - productSpecsTable:   teknik specs (JSON.parse edilir)
 *   - productFaqTable:     ürün başına 3-4 FAQ
 *   - productContentTable: howToUse, whenToUse (yapılandırılmış)
 *
 * Bu JOIN'i Autonomous.Tool'un içinde yapıyoruz — LLM tablo isimlerini bilmiyor,
 * sadece tool'un input/output şemasını görüyor.
 */
export const getProductDetails = new Autonomous.Tool({
  name: 'getProductDetails',
  description:
    "Bir ürünün TÜM bilgisini birleştirir: ana ürün (ad, marka, fiyat, görsel, URL, kategori), " +
    "teknik specs (JSON), FAQ'lar ve uygulama içeriği. Search ile bir ürünün SKU'sunu bulduktan " +
    "sonra detaylı bilgi vermek için kullan. Karşılaştırma yapacaksan her ürün için ayrı çağır.",
  input: z.object({
    sku: z.string().describe("Ürün SKU'su (örn: Q2M-WYA1000M, 22.746.281.001)"),
  }),
  output: z.object({
    sku: z.string(),
    productName: z.string(),
    brand: z.string(),
    price: z.number(),
    imageUrl: z.string().nullable(),
    url: z.string().describe("Ürün sayfa URL'si (boş olabilir — 15 unmatched ürün için)"),
    mainCat: z.string(),
    subCat: z.string().nullable(),
    sub_cat2: z.string().nullable(),
    targetSurface: z.string().nullable(),
    templateGroup: z.string().describe('Custom chatbot kategorisi'),
    templateSubType: z.string().describe('Granüler ürün-tipi'),
    technicalSpecs: z
      .record(z.unknown())
      .describe('Şablon grubuna göre değişen teknik parametreler (JSON parse edilmiş)'),
    faqs: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    ),
    howToUse: z.string().nullable(),
    whenToUse: z.string().nullable(),
    whyThisProduct: z.string().nullable(),
  }),
  async handler({ sku }) {
    // 4 tablodan paralel sorgu
    const [masterRes, specsRes, faqRes, contentRes] = await Promise.all([
      client.findTableRows({
        table: 'productsMasterTable',
        filter: { sku: { $eq: sku } },
        limit: 1,
      }),
      client.findTableRows({
        table: 'productSpecsTable',
        filter: { sku: { $eq: sku } },
        limit: 1,
      }),
      client.findTableRows({
        table: 'productFaqTable',
        filter: { sku: { $eq: sku } },
        limit: 50,
      }),
      client.findTableRows({
        table: 'productContentTable',
        filter: { sku: { $eq: sku } },
        limit: 1,
      }),
    ]);

    const master = masterRes.rows[0];
    if (!master) {
      throw new Error(`Ürün bulunamadı: ${sku}`);
    }

    // v5.4: URL throw kaldırıldı. URL boş olabilir (15 unmatched ürün). LLM
    // instructions'ta "url boşsa Card yerine text göster" kuralı var.

    // specs_object string olarak saklı, JSON parse et
    let technicalSpecs: Record<string, unknown> = {};
    const specsRow = specsRes.rows[0];
    if (specsRow?.specs_object) {
      try {
        technicalSpecs = JSON.parse(specsRow.specs_object as string);
      } catch {
        technicalSpecs = { _raw: specsRow.specs_object };
      }
    }

    const content = contentRes.rows[0];

    return {
      sku: master.sku as string,
      productName: master.product_name as string,
      brand: master.brand as string,
      price: master.price as number,
      imageUrl: (master.image_url as string | null) ?? null,
      url: (master.url as string) ?? '',
      mainCat: master.main_cat as string,
      subCat: (master.sub_cat as string | null) ?? null,
      sub_cat2: (master.sub_cat2 as string | null) ?? null,
      targetSurface: (master.target_surface as string | null) ?? null,
      templateGroup: master.template_group as string,
      templateSubType: master.template_sub_type as string,
      technicalSpecs,
      faqs: faqRes.rows.map((f) => ({
        question: f.question as string,
        answer: f.answer as string,
      })),
      howToUse: (content?.howToUse as string | null) ?? null,
      whenToUse: (content?.whenToUse as string | null) ?? null,
      whyThisProduct: (content?.whyThisProduct as string | null) ?? null,
    };
  },
});
