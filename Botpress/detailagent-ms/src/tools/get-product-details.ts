import { Autonomous, z } from '@botpress/runtime';
import { retrievalClient } from '../lib/retrieval-client.ts';

/**
 * getProductDetails — Bir SKU'nun tüm bilgisini döndürür.
 *
 * Phase 4 cutover: Eskiden 6-tablo paralel JOIN (master + specs + faq +
 * content + desc_part1 + desc_part2) bot tarafında yapılıyordu; artık
 * microservice `/products/:sku` endpoint'i tek SQL JOIN ile halleder
 * ve `specs` JSONB'yi howToUse/whenToUse/whyThisProduct + technicalSpecs
 * olarak unpack eder (retrieval-service/src/lib/formatters.ts).
 *
 * Secondary (variant) SKU → primary resolve microservice tarafında
 * `WHERE sku = $1 OR $1 = ANY(variant_skus)` pattern ile otomatik.
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
    technicalSpecs: z.record(z.unknown()).describe(
      "Teknik specs JSON (Phase 1 canonical, 2026-04-25). Sık kullanılan alanlar: " +
        "ph_level (number 1-14, ürün kendi pH'ı), ph_tolerance (string range, kaplama dayanım), " +
        "durability_months (ay), durability_km (km, örn. 25000), " +
        "volume_ml (içerik), capacity_ml (sprayer tankı), capacity_usable_ml (pump sprayer güvenli), " +
        "consumption_per_car_ml (sayı, araç başı tüketim — seramik kaplama default 25 ml/oto, motosiklet için volume_ml÷15), " +
        "dilution (nested: {ratio, bucket, foam_lance, pump_sprayer, manual} — boş alt-key'ler uydurma değildir), " +
        "target_surfaces (pipe-separated Türkçe canonical: 'boya|deri|kumaş|cam|ppf|...'), " +
        "compatibility (array: ceramic_coating, ppf — üzerine uygulanabilir), " +
        "substrate_safe (array: aluminum, fiberglass, plexiglass — zarar vermediği), " +
        "product_type (machine|accessory|part — polisher_machine/sprayers_bottles ayrımı), " +
        "hardness (string, pazarlama iddiası), " +
        "ratings (object: {durability, beading, self_cleaning} üretici 1-5 skor). " +
        "Teknik/sayısal sorularda FAQ yerine BU alanı kullan.",
    ),
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
  async handler({ sku }) {
    return await retrievalClient.getProduct(sku);
  },
});
