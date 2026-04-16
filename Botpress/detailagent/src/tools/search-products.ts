import { Autonomous, z, client } from '@botpress/runtime';

/**
 * searchProducts — MTS Kimya ürün kataloğu hibrit arama (semantic + filter + post-filter).
 *
 * v5.4: templateGroup/templateSubType filter kolonları productSearchIndexTable'a
 * eklendi, master-join kaldırıldı. Tek sorguda filter.
 *
 * ÜÇ AŞAMALI RETRIEVAL STRATEJİSİ:
 *
 * 1. PRE-FILTER (MongoDB-style `findTableRows` filter param):
 *    - `templateGroup`, `templateSubType`, `brand`, `mainCat`, `subCat`
 *      search_index'te direkt sorgulanır. Semantic search bu alt küme içinde koşar.
 *    - Örnek: templateGroup="car_shampoo" → "Total Remover (wax sökücü)" asla
 *      "şampuan öner" sorgusunda gelmez.
 *
 * 2. SEMANTIC SEARCH (`search` param):
 *    - Botpress Tables'ın built-in vector search'ü `searchable: true` kolonlara
 *      (sku + search_text) uygulanır. Benzerlik skoruyla sıralı sonuç.
 *
 * 3. POST-FILTER (exactMatch):
 *    - Vector search rakam/kod/hacim aramasında zayıftır ("Menzerna 400" → 4000ml
 *      gelebilir). `exactMatch` varsa `limit × 5` oversample, sonra product_name
 *      içinde substring kontrolü ile kesin filtreleme yapılır.
 *    - Örnek: exactMatch="400" → sadece adında "400" geçen varyantlar döner.
 *    - Örnek: exactMatch="1000 ml" → sadece 1000ml varyantı.
 */
export const searchProducts = new Autonomous.Tool({
  name: 'searchProducts',
  description:
    "MTS Kimya ürün kataloğunda (622 ürün) hibrit arama yapar: semantic similarity + " +
    "custom kategori/marka/ürün-tipi pre-filter + hacim/model post-filter.\n\n" +
    "**TEMPLATE GROUP = custom chatbot kategorisi (EN ÖNEMLİ FİLTRE).** 25 değer:\n" +
    "abrasive_polish (polisaj pastaları, 40), applicators (15), brushes (8), " +
    "car_shampoo (araç şampuanları, 41), ceramic_coating (35), clay_products (8), " +
    "contaminant_solvers (iron remover, dekontaminasyon, 29), fragrance (93), " +
    "glass_cleaner_protectant (7), glass_cleaner (3), industrial_products (12), " +
    "interior_cleaner (34), leather_care (11), marin_products (5), masking_tapes (7), " +
    "microfiber (33), paint_protection_quick (wax, wetcoat, quick detailer, 34), " +
    "polisher_machine (30), polishing_pad (43), ppf_tools (15), product_sets (2), " +
    "spare_part (32), sprayers_bottles (52), storage_accessories (23), tire_care (10).\n\n" +
    "**TEMPLATE SUB TYPE = granüler ürün-tipi (EN HASSAS FİLTRE, opsiyonel).** " +
    "Örnekler: ph_neutral_shampoo (10), prewash_foaming_shampoo (18), heavy_cut_compound (21), " +
    "foam_pad (35), paint_coating (10), interior_detailer (14), pump_sprayer (24), " +
    "trigger_sprayer (15), vent_clip (55), backing_plate (12), spray_perfume (10). " +
    "Kullanıcı spesifik tip söylediyse MUTLAKA kullan (pH nötr, foam, heavy cut vs.).\n\n" +
    "**KULLANIM KURALLARI:**\n" +
    "• query: ne aradığının doğal dil hali ('ph nötr şampuan', 'polisaj pasta')\n" +
    "• templateGroup: ürün türü net ise KULLAN (25 değerli enum)\n" +
    "• templateSubType: alt tip net ise KULLAN (157 değer, string)\n" +
    "• brand: marka adı tam eşleşme (GYEON, MENZERNA, ...)\n" +
    "• exactMatch: ürün adında BULUNMASI gereken kesin substring (rakam, hacim, model)\n" +
    "• mainCat/subCat: LEGACY — templateGroup/templateSubType'ı tercih et.\n\n" +
    "Bu parametreleri akıllı kullanmak yanlış ürün getirilmesini engeller.",
  input: z.object({
    query: z
      .string()
      .describe(
        "Semantic arama sorgusu — ürün türü/kullanımı/kategorisi doğal dil (ör: " +
          "'pH nötr araç şampuanı', 'polisaj pasta', 'seramik kaplama sprey'). " +
          "Rakam ve hacim BURAYA YAZMA — onlar exactMatch'e gider.",
      ),
    templateGroup: z
      .enum([
        'abrasive_polish',
        'applicators',
        'brushes',
        'car_shampoo',
        'ceramic_coating',
        'clay_products',
        'contaminant_solvers',
        'fragrance',
        'glass_cleaner',
        'glass_cleaner_protectant',
        'industrial_products',
        'interior_cleaner',
        'leather_care',
        'marin_products',
        'masking_tapes',
        'microfiber',
        'paint_protection_quick',
        'polisher_machine',
        'polishing_pad',
        'ppf_tools',
        'product_sets',
        'spare_part',
        'sprayers_bottles',
        'storage_accessories',
        'tire_care',
      ])
      .nullable()
      .optional()
      .describe(
        "Custom chatbot kategorisi (EN ÖNEMLİ FİLTRE). 25 değerden biri. Kullanıcı ürün türünü " +
          "söylediğinde MUTLAKA kullan.\n\n" +
          "KEYWORD TUZAK MAPPING — DİKKATLİ OKU:\n" +
          "• 'Seramik kaplama' → ceramic_coating (NOT glass_cleaner_protectant)\n" +
          "• 'Cam seramik kaplama' / 'cam için seramik' → ceramic_coating + templateSubType='glass_coating' (ceramic_coating altında cam için ürünler var)\n" +
          "• 'Cam temizleyici' (seramik DEĞİL) → glass_cleaner_protectant\n" +
          "• 'Dekontaminasyon şampuanı' / 'decon şampuan' → car_shampoo + templateSubType='decon_shampoo' (NOT contaminant_solvers)\n" +
          "• 'Iron remover' / 'demir tozu sökücü' / 'kil bar' → contaminant_solvers\n" +
          "• 'pH nötr şampuan' → car_shampoo + templateSubType='ph_neutral_shampoo'\n" +
          "• 'Foam / ön yıkama köpüğü' → car_shampoo + templateSubType='prewash_foaming_shampoo'\n" +
          "• 'Ağır çizik / kalın pasta' → abrasive_polish + templateSubType='heavy_cut_compound'\n" +
          "• 'İnce hare / finishing / hassas boya' → abrasive_polish + templateSubType='polish' (dikkat: 'finishing' diye bir sub_type YOK, 'polish' kullan)\n" +
          "• 'Wetcoat / quick detailer / hızlı cila' → paint_protection_quick\n" +
          "• 'Kurulama havlusu / mikrofiber bez' → microfiber",
      ),
    templateSubType: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Granüler ürün-tipi (157 değer). Örnekler: 'ph_neutral_shampoo', " +
          "'heavy_cut_compound', 'foam_pad', 'paint_coating', 'prewash_foaming_shampoo', " +
          "'interior_detailer', 'pump_sprayer'. Kullanıcı spesifik tip söylediyse kullan.",
      ),
    brand: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Marka tam eşleşme (büyük harflerle). Seçenekler: GYEON, MENZERNA, FRA-BER, " +
          "INNOVACAR, 'MG PS', 'MG PADS', 'MX-PRO', 'Q1 TAPES', SGCB, EPOCA, KLIN, " +
          "FLEX, 'LITTLE JOE', 'IK SPRAYERS'. Kullanıcı marka belirttiyse KULLAN.",
      ),
    exactMatch: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Ürün adında MUTLAKA geçmesi gereken TEK BİR SUBSTRING (case-insensitive). " +
          "⚠️ KRİTİK KURAL: Birden fazla kelime/rakam BİRLEŞTİRME. Her seferinde SADECE " +
          "BİR ayırıcı özellik koy. Doğru örnekler: '400' (Menzerna 400 serisi), " +
          "'1000 ml' (hacim varyantı, SADECE hacim), 'Q2M-WYA' (SKU prefix), 'Bathe' " +
          "(ürün adı parçası).\n\n" +
          "❌ YANLIŞ: '3800 250ml' (iki özellik birleştirildi → 0 sonuç). " +
          "❌ YANLIŞ: 'Gommanera Superlux 5 litre' (isim + hacim birleşti → 0 sonuç).\n\n" +
          "Doğru yaklaşım: Menzerna 3800 250ml için → exactMatch='3800', limit=5 " +
          "kullan. Sonuçlar arasında 250ml varyantını kullanıcıya göster. " +
          "Kullanıcı belirli bir hacim istiyorsa önce rakam/ad ile filtrele, hacmi " +
          "kullanıcıya sonuç listesinden seçtir.",
      ),
    mainCat: z
      .string()
      .nullable()
      .optional()
      .describe(
        "LEGACY — templateGroup'u tercih et. Ana kategori substring ('DIŞ YÜZEY', " +
          "'AKSESUAR', 'İÇ YÜZEY', 'MAKİNE-EKİPMAN', 'ENDÜSTRİYEL', 'MARİN').",
      ),
    subCat: z
      .string()
      .nullable()
      .optional()
      .describe(
        "LEGACY — templateGroup + templateSubType'ı tercih et. Alt kategori " +
          "substring eşleşmesi (ör: 'Yıkama Ürünleri').",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe('Döndürülecek maksimum ürün sayısı (varsayılan 5)'),
  }),
  output: z.object({
    results: z.array(
      z.object({
        sku: z.string(),
        productName: z.string(),
        brand: z.string(),
        mainCat: z.string(),
        subCat: z.string().nullable(),
        templateGroup: z.string(),
        templateSubType: z.string(),
        targetSurface: z.string().nullable(),
        price: z.number(),
        imageUrl: z.string().nullable(),
        url: z.string().describe("Ürün sayfa URL'si — Card action value'sunda kullanılır"),
        snippet: z
          .string()
          .describe("search_text'ten ilk 300 karakter (ürün hakkında özet)"),
        similarity: z
          .number()
          .nullable()
          .describe('Eşleşme skoru (0-1 arası, yüksek = daha alakalı)'),
      }),
    ),
    totalReturned: z.number().int().describe("Caller'a dönen kayıt sayısı"),
    filtersApplied: z
      .object({
        templateGroup: z.string().nullable(),
        templateSubType: z.string().nullable(),
        brand: z.string().nullable(),
        exactMatch: z.string().nullable(),
        mainCat: z.string().nullable(),
        subCat: z.string().nullable(),
      })
      .describe('Hangi filtrelerin uygulandığının özeti (debug için)'),
  }),
  async handler({
    query,
    templateGroup,
    templateSubType,
    brand,
    exactMatch,
    mainCat,
    subCat,
    limit,
  }) {
    // v5.4: Tüm filter kolonları artık productSearchIndexTable'da direct.
    // Master-join kaldırıldı (sub_cat, template_group, template_sub_type,
    // target_surface zaten search_index'te).
    const filter: Record<string, unknown> = {};

    if (templateGroup) {
      filter.template_group = { $eq: templateGroup };
    }
    if (templateSubType) {
      filter.template_sub_type = { $eq: templateSubType };
    }
    if (brand) {
      filter.brand = { $eq: brand };
    }
    if (mainCat) {
      filter.main_cat = { $regex: mainCat, $options: 'i' };
    }
    if (subCat) {
      filter.sub_cat = { $regex: subCat, $options: 'i' };
    }

    // Post-filter yapılacaksa oversample et (vector search rakam/hacim match'inde
    // ilk N'de doğru sonucu vermeyebilir, daha geniş küme çekip içinde aramak gerek)
    const fetchLimit = exactMatch ? Math.min(50, Math.max(limit * 5, 20)) : limit;

    const res = await client.findTableRows({
      table: 'productSearchIndexTable',
      search: query,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      limit: fetchLimit,
    });

    // Post-filter: exactMatch varsa product_name içinde substring kontrolü
    // v6.3: boşluk normalizasyonu — "can coat" → "cancoat", "wet coat" → "wetcoat" eşleşir
    let filteredRows = res.rows;
    if (exactMatch) {
      const needle = exactMatch.toLowerCase().trim().replace(/\s+/g, '');
      filteredRows = filteredRows.filter((r) => {
        const name = ((r.product_name as string) ?? '').toLowerCase().replace(/\s+/g, '');
        return name.includes(needle);
      });
      filteredRows = filteredRows.slice(0, limit);
    }

    // v5.4: URL sanitization kaldırıldı — URL'ler artık 607/622 dolu.
    // 15 unmatched ürün için url boş kalabilir; LLM bunları text listesi olarak
    // gösterir veya dahil etmez. Instructions bunu açıklıyor.

    return {
      results: filteredRows.map((r) => ({
        sku: r.sku as string,
        productName: r.product_name as string,
        brand: r.brand as string,
        mainCat: r.main_cat as string,
        subCat: (r.sub_cat as string | null) ?? null,
        templateGroup: r.template_group as string,
        templateSubType: r.template_sub_type as string,
        targetSurface: (r.target_surface as string | null) ?? null,
        price: r.price as number,
        imageUrl: (r.image_url as string | null) ?? null,
        url: (r.url as string) ?? '',
        snippet: ((r.search_text as string) ?? '').slice(0, 300),
        similarity: (r.similarity as number | null) ?? null,
      })),
      totalReturned: filteredRows.length,
      filtersApplied: {
        templateGroup: templateGroup ?? null,
        templateSubType: templateSubType ?? null,
        brand: brand ?? null,
        exactMatch: exactMatch ?? null,
        mainCat: mainCat ?? null,
        subCat: subCat ?? null,
      },
    };
  },
});
