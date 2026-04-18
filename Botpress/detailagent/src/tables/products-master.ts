import { Table, z } from '@botpress/runtime';

/**
 * products_master — Ana ürün kataloğu (622 satır).
 *
 * Studio'da bu adla yüklenmiş olan tabloyu mirror'lar. Kolon adları snake_case
 * ve fiyat tam sayı (TL, kuruşsuz) — output/csv/products_master.csv ile birebir.
 *
 * SEARCHABLE STRATEJİSİ: Botpress Tables 4+ searchable column ile provision
 * fail veriyor (sebep tam belirsiz, muhtemelen full-text indeks kısıtı).
 * Bu tabloda searchable: SADECE `sku` (filter ve $eq lookup için yeter).
 * Tools (`getProductDetails`, `searchByPriceRange` vb.) `client.findTableRows`
 * filter operatörlerini kullanır — bunlar searchable: true İSTEMEZ, herhangi
 * bir column üzerinde çalışır.
 */
export const productsMasterTable = new Table({
  name: 'productsMasterTable',
  description:
    'MTS Kimya ana ürün kataloğu. Her satır bir ürünü temsil eder. SKU benzersizdir. ' +
    'Marka, kategori, fiyat, görsel ve kısa açıklama içerir.',
  columns: {
    sku: { schema: z.string().describe("Ürün SKU'su (benzersiz stok kodu)"), searchable: true },
    barcode: z.string().nullable().describe('EAN/UPC barkod numarası'),
    product_name: z.string().describe('Tam ürün adı'),
    brand: z.string().describe('Marka adı (GYEON, MENZERNA, vb.)'),
    price: z.number().describe("Fiyat — TL cinsinden (tam sayı olarak yüklenir ama Botpress Tables Zod .int() refinement'ini desteklemiyor)"),
    image_url: z
      .string()
      .nullable()
      .describe("Ürün görseli URL'si (bazı ürünlerde boş olabilir)"),
    main_cat: z.string().describe('Ana kategori (DIŞ YÜZEY, AKSESUAR, vb.)'),
    sub_cat: z.string().nullable().describe('Alt kategori'),
    sub_cat2: z.string().nullable().describe('İkincil alt kategori'),
    target_surface: z.string().nullable().describe('Hedef yüzey tipi'),
    template_group: z.string().describe(
      'Custom chatbot kategorisi (25 değer): abrasive_polish, car_shampoo, ceramic_coating, ...'
    ),
    template_sub_type: z.string().describe(
      'Granüler ürün-tipi (157 değer): heavy_cut_compound, ph_neutral_shampoo, foam_pad, ...'
    ),
    url: z.string().default('').describe(
      "mtskimya.com ürün sayfası URL'si. 15 ürün için boş olabilir (Faz 2 manuel backfill)."
    ),
    // v8.5: Variant consolidation
    base_name: z
      .string()
      .nullable()
      .describe(
        "Generic ürün adı (size-suffix'siz). Ör: 'MENZERNA YENİ 400 Pasta' " +
          '(product_name=full ad with boy, base_name=generic). Multi-variant group için ' +
          'primary row base_name taşır.',
      ),
    variant_skus: z
      .string()
      .nullable()
      .describe(
        "Pipe-ayrık variant SKU listesi: '22202.281.001|22202.260.001'. Bot bu kolonu " +
          "exactMatch regex ile arayarak spesifik variant SKU'su için primary row'u bulur. " +
          'Single-variant ürünlerde kendi sku.',
      ),
    sizes: z
      .string()
      .nullable()
      .describe(
        'JSON string: [{size_display, size_sort_value, sku, barcode, url, price, image_url}]. ' +
          'Her variant için tam bilgi. Bot parse ederek Carousel için N kart oluşturur. ' +
          'Single-variant ürünlerde 1-item array.',
      ),
  },
  keyColumn: 'sku',
});
