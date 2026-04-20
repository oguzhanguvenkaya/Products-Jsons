import { Table, z } from '@botpress/runtime';

/**
 * product_search_index — LLM'in semantik arama yaptığı ana tablo (622 satır).
 *
 * `search_text` kolonu ürün hakkındaki tüm metinsel zenginleştirmeyi içerir
 * (ortalama 1088 karakter). `searchProducts` tool'u Botpress Tables'ın
 * built-in vector search'ü üzerinden bu tablodan arama yapar.
 *
 * Card/Carousel render etmek için product_name, brand, price, image_url, url
 * alanları kullanılır (filter ve $eq lookup ile, full-text search değil).
 *
 * SEARCHABLE: sku ve search_text. Diğer kolonlar filter ile erişilebilir.
 *   - `sku`         → Tools'un $eq lookup'ı için
 *   - `search_text` → Vector indexing için (semantic embedding hedefi)
 */
export const productSearchIndexTable = new Table({
  name: 'productSearchIndexTable',
  description:
    'Semantik arama için optimize edilmiş ürün kataloğu. search_text sütunu ' +
    'her ürünün marka, kategori, hedef yüzey, teknik özellikler ve kullanım ' +
    'detaylarını içeren zenginleştirilmiş metnidir.',
  columns: {
    sku: { schema: z.string().describe("Ürün SKU'su"), searchable: true },
    product_name: z.string().describe('Tam ürün adı'),
    brand: z.string().describe('Marka'),
    main_cat: z.string().describe('Ana kategori (DIŞ YÜZEY, AKSESUAR, ...)'),
    price: z.number().describe("Fiyat (TL) — z.number() kullanılır, .int() refinement Botpress Tables tarafından desteklenmediği için sakınıldı"),
    image_url: z.string().nullable().describe("Ürün görseli URL'si"),
    url: z.string().default('').describe(
      "mtskimya.com ürün sayfası URL'si. 15 ürün için boş olabilir."
    ),
    sub_cat: z.string().nullable().describe('Alt kategori (Yıkama Ürünleri, Pasta Cila Ürünleri, ...)'),
    sub_cat2: z.string().nullable().describe('İkincil alt kategori'),
    target_surface: z.string().nullable().describe('Hedef yüzey tipi (Araç boyası, cam, plastik, ...)'),
    template_group: z.string().describe(
      'Custom chatbot kategorisi (25 değer): abrasive_polish, car_shampoo, ceramic_coating, fragrance, ' +
      'microfiber, polishing_pad, polisher_machine, spare_part, sprayers_bottles, interior_cleaner, ' +
      'paint_protection_quick, contaminant_solvers, storage_accessories, applicators, ppf_tools, ' +
      'industrial_products, leather_care, tire_care, brushes, clay_products, glass_cleaner_protectant, ' +
      'masking_tapes, marin_products, glass_cleaner, product_sets'
    ),
    template_sub_type: z.string().describe(
      'Granüler ürün-tipi (157 değer): heavy_cut_compound, ph_neutral_shampoo, prewash_foaming_shampoo, ' +
      'foam_pad, backing_plate, paint_coating, interior_detailer, pump_sprayer, trigger_sprayer, ...'
    ),
    search_text: {
      schema: z
        .string()
        .describe(
          'Zenginleştirilmiş arama metni: marka, kategori, hedef yüzey, ' +
            'teknik özellikler, kullanım alanı, özellikler ve teknik detayları içerir. ' +
            'v8.5: Tüm variant SKU ve size_display değerleri de eklenir (variant SKU search için).',
        ),
      searchable: true,
    },
    // v8.5: Variant consolidation
    base_name: z
      .string()
      .nullable()
      .describe("Generic ürün adı (size-suffix'siz). Master ile tutarlı."),
    variant_skus: {
      schema: z
        .string()
        .nullable()
        .describe(
          "Pipe-ayrık tüm variant SKU'ları. Bot exactMatch regex ile spesifik variant arar.",
        ),
      searchable: true,
    },
  },
  keyColumn: 'sku',
});
