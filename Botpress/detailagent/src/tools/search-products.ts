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
    "MTS Kimya ürün kataloğunda (622 ürün) hibrit arama. Semantic similarity + " +
    "kategori/marka pre-filter + exactMatch post-filter. " +
    "Parametre detayları her alanın description'ında — oraları oku.",
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
    carouselItems: z
      .array(
        z.object({
          title: z.string().describe('Ürün adı'),
          subtitle: z.string().describe('Marka + Fiyat TL formatında'),
          imageUrl: z.string().optional().describe('Görsel URL (yoksa field omit edilir)'),
          actions: z.array(
            z.object({
              action: z.enum(['url']),
              label: z.string(),
              value: z.string().describe('Ürün sayfa URL — non-empty'),
            }),
          ),
        }),
      )
      .describe('URL olan ürünler — doğrudan yield <Carousel items={carouselItems} /> ile göster'),
    textFallbackLines: z
      .array(
        z.object({
          productName: z.string(),
          brand: z.string(),
          price: z.number(),
          sku: z.string(),
        }),
      )
      .describe('URL olmayan ürünler — string concat ile markdown text listesi olarak göster'),
    productSummaries: z
      .array(
        z.object({
          sku: z.string(),
          name: z.string(),
          brand: z.string(),
          price: z.number(),
          templateGroup: z.string(),
          snippet: z.string().describe('Ürün hakkında kısa özet (max 200 char)'),
          similarity: z.number().nullable().describe('Eşleşme skoru (0-1, null olabilir)'),
        }),
      )
      .describe('Tüm ürünlerin hafif özeti — LLM metin yanıtı + eşleşme kalitesi için'),
    totalReturned: z.number().describe('Toplam dönen ürün sayısı'),
    filtersApplied: z
      .object({
        templateGroup: z.string().nullable(),
        templateSubType: z.string().nullable(),
        brand: z.string().nullable(),
        exactMatch: z.string().nullable(),
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

    // v8.4: exactMatch → direct product_name regex filter (vector search skip).
    // Motivation: Menzerna 400 gibi spesifik model sorgularında semantic search
    // rakam/kod içeren ürünleri top-K'da kaçırabiliyordu (47-karsilastirma-4tur trace
    // kanıtı). Filter.product_name regex daha deterministic + hızlı.
    const fetchResult = exactMatch
      ? await client.findTableRows({
          table: 'productSearchIndexTable',
          filter: {
            ...filter,
            product_name: { $regex: exactMatch.trim(), $options: 'i' },
          },
          limit: Math.max(limit, 10),
        })
      : await client.findTableRows({
          table: 'productSearchIndexTable',
          search: query,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          limit,
        });

    const filteredRows = fetchResult.rows.slice(0, limit);

    // v7.0: UI-ready output — render mantığı tool handler'da.
    // URL sanitization: trim + protokol kontrolü (revize_4 önerisi)
    const hasRenderableUrl = (r: Record<string, unknown>): boolean => {
      const url = typeof r.url === 'string' ? r.url.trim() : '';
      return url.startsWith('http://') || url.startsWith('https://');
    };

    return {
      carouselItems: filteredRows
        .filter(hasRenderableUrl)
        .map((r) => ({
          title: r.product_name as string,
          subtitle: `${r.brand as string} \u2022 ${(r.price as number).toLocaleString('tr-TR')} TL`,
          imageUrl: (r.image_url as string) || undefined,
          actions: [
            { action: 'url' as const, label: 'Ürün Sayfasına Git', value: (r.url as string).trim() },
          ],
        })),

      textFallbackLines: filteredRows
        .filter((r) => !hasRenderableUrl(r))
        .map((r) => ({
          productName: r.product_name as string,
          brand: r.brand as string,
          price: r.price as number,
          sku: r.sku as string,
        })),

      productSummaries: filteredRows.map((r) => ({
        sku: r.sku as string,
        name: r.product_name as string,
        brand: r.brand as string,
        price: r.price as number,
        templateGroup: r.template_group as string,
        snippet: ((r.search_text as string) ?? '').slice(0, 200),
        similarity: (r.similarity as number | null) ?? null,
      })),

      totalReturned: filteredRows.length,
      filtersApplied: {
        templateGroup: templateGroup ?? null,
        templateSubType: templateSubType ?? null,
        brand: brand ?? null,
        exactMatch: exactMatch ?? null,
      },
    };
  },
});
