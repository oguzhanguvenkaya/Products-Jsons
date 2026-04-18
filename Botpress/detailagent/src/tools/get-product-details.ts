import { Autonomous, z, client } from '@botpress/runtime';

/**
 * getProductDetails — Bir SKU'nun TÜM bilgisini paralel 6 sorgu ile birleştirir.
 *
 * v7.2: fullDescription 4KB satır limiti nedeniyle 2 ayrı tabloya split edildi.
 * Tool handler 6 tabloyu paralel sorgular ve fullDescription'ı birleştirir.
 *
 * 6 tablodan paralel veri:
 *   - productsMasterTable:     ana bilgi (ad, marka, fiyat, görsel, kategori)
 *   - productSpecsTable:       teknik specs (JSON.parse edilir)
 *   - productFaqTable:         ürün başına 3-4 FAQ
 *   - productContentTable:     howToUse, whenToUse, whyThisProduct
 *   - productDescPart1Table:   fullDescription ilk ~3800 byte
 *   - productDescPart2Table:   fullDescription kalan kısım (çoğu boş)
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
    sku: z.string().describe('Primary variant SKU (master\'da bu row var)'),
    inputSku: z.string().describe('Kullanıcının sorduğu orijinal SKU (secondary olabilir)'),
    baseName: z.string().describe("Generic ad (size-suffix'siz) — v8.5"),
    productName: z.string().describe('Primary variant\'ın full adı'),
    brand: z.string(),
    price: z.number().describe('Primary variant\'ın fiyatı'),
    imageUrl: z.string().nullable(),
    url: z.string().describe("Ürün sayfa URL'si (primary variant)"),
    mainCat: z.string(),
    subCat: z.string().nullable(),
    sub_cat2: z.string().nullable(),
    targetSurface: z.string().nullable(),
    templateGroup: z.string(),
    templateSubType: z.string(),
    technicalSpecs: z.record(z.unknown()),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })),
    howToUse: z.string().nullable(),
    whenToUse: z.string().nullable(),
    whyThisProduct: z.string().nullable(),
    fullDescription: z.string().nullable(),
    variants: z
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
      .describe("Ürünün tüm boyut varyantları. v8.5 — her varyant ayrı URL/barcode/fiyat taşır."),
  }),
  async handler({ sku: inputSku }) {
    // v8.5: Input SKU primary mi secondary mi? Önce direct lookup, sonra variant_skus regex.
    let masterRow = null as Record<string, unknown> | null;
    const directRes = await client.findTableRows({
      table: 'productsMasterTable',
      filter: { sku: { $eq: inputSku } },
      limit: 1,
    });
    if (directRes.rows.length > 0) {
      masterRow = directRes.rows[0];
    } else {
      // Secondary variant → variant_skus içinde ara
      const variantRes = await client.findTableRows({
        table: 'productsMasterTable',
        filter: { variant_skus: { $regex: inputSku, $options: 'i' } } as any,
        limit: 1,
      });
      masterRow = variantRes.rows[0] ?? null;
    }

    if (!masterRow) {
      throw new Error(`Ürün bulunamadı: ${inputSku}`);
    }

    const primarySku = masterRow.sku as string;

    // Parallel fetch shared data using primarySku
    const [specsRes, faqRes, contentRes, desc1Res, desc2Res] = await Promise.all([
      client.findTableRows({ table: 'productSpecsTable', filter: { sku: { $eq: primarySku } }, limit: 1 }),
      client.findTableRows({ table: 'productFaqTable', filter: { sku: { $eq: primarySku } }, limit: 50 }),
      client.findTableRows({ table: 'productContentTable', filter: { sku: { $eq: primarySku } }, limit: 1 }),
      client.findTableRows({ table: 'productDescPart1Table', filter: { sku: { $eq: primarySku } }, limit: 1 }),
      client.findTableRows({ table: 'productDescPart2Table', filter: { sku: { $eq: primarySku } }, limit: 1 }),
    ]);

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
    const descPart1 = (desc1Res.rows[0]?.fullDescription as string) ?? '';
    const descPart2 = (desc2Res.rows[0]?.fullDescription as string) ?? '';
    const fullDescription = descPart1 + descPart2;

    // Parse sizes JSON from master
    let variants: Array<{
      size_display: string; size_sort_value: number | null;
      sku: string; barcode: string; url: string; price: number; image_url: string;
    }> = [];
    if (masterRow.sizes) {
      try {
        variants = JSON.parse(masterRow.sizes as string);
      } catch {
        variants = [];
      }
    }

    return {
      sku: primarySku,
      inputSku,
      baseName: (masterRow.base_name as string) || (masterRow.product_name as string),
      productName: masterRow.product_name as string,
      brand: masterRow.brand as string,
      price: masterRow.price as number,
      imageUrl: (masterRow.image_url as string | null) ?? null,
      url: (masterRow.url as string) ?? '',
      mainCat: masterRow.main_cat as string,
      subCat: (masterRow.sub_cat as string | null) ?? null,
      sub_cat2: (masterRow.sub_cat2 as string | null) ?? null,
      targetSurface: (masterRow.target_surface as string | null) ?? null,
      templateGroup: masterRow.template_group as string,
      templateSubType: masterRow.template_sub_type as string,
      technicalSpecs,
      faqs: faqRes.rows.map((f) => ({ question: f.question as string, answer: f.answer as string })),
      howToUse: (content?.howToUse as string | null) ?? null,
      whenToUse: (content?.whenToUse as string | null) ?? null,
      whyThisProduct: (content?.whyThisProduct as string | null) ?? null,
      fullDescription: fullDescription || null,
      variants,
    };
  },
});
