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
        "Ürün adında MUTLAKA geçmesi gereken substring (case-insensitive). " +
          "Tek ayırıcı özellik VEYA compound ürün adı (iki kelime birleşik ise) olabilir.\n\n" +
          "✅ DOĞRU tek kelime: '400' (Menzerna 400), 'Bathe' (sade Bathe, Bathe+ değil), 'Q2M-WYA' (SKU prefix).\n" +
          "✅ DOĞRU compound (iki kelime ürün adında birlikte): 'OdorRemover Pads' (sadece Pads), 'Bathe+ Plus', 'Cure Matte' (benzer isimde ürünler için variant ayırt et).\n\n" +
          "❌ YANLIŞ: '3800 250ml' (isim + hacim karışık → 0 sonuç). " +
          "❌ YANLIŞ: 'Gommanera Superlux 5 litre' (isim + hacim → 0 sonuç).\n\n" +
          "KURAL: Hacim/ml/litre ile isim KARIŞTIRMA. Ama 'OdorRemover Pads' gibi compound ürün adı tek unit olarak kullanılır. " +
          "Hacim için: önce isim ile filtrele (exactMatch='3800'), hacmi sonuç listesinden seçtir.",
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
    metaFilters: z
      .array(
        z.object({
          key: z
            .string()
            .describe(
              "Meta alan anahtarı — örn: silicone_free, voc_free, contains_sio2, ph_level, " +
                "cut_level, durability_days, volume_ml, machine_compatibility, hardness, features",
            ),
          op: z
            .enum(['eq', 'gte', 'lte', 'gt', 'lt', 'regex'])
            .describe(
              "Karşılaştırma operatörü. eq=eşit, gte/lte/gt/lt=sayısal, regex=metin içinde.",
            ),
          value: z
            .union([z.string(), z.number(), z.boolean()])
            .describe(
              "Değer. Boolean için true/false, sayı için number, metin için string.",
            ),
        }),
      )
      .nullable()
      .optional()
      .describe(
        "productMetaTable'dan spesifik özellik filtresi. SADECE KULLANICI AÇIKÇA ÖZELLİK " +
          "SORDUĞUNDA kullan. Örnekler:\n" +
          "- 'silikonsuz heavy cut' → [{key:'silicone_free', op:'eq', value:true}]\n" +
          "- 'pH nötr şampuan' → [{key:'ph_level', op:'gte', value:6.5}, " +
          "{key:'ph_level', op:'lte', value:7.5}]\n" +
          "- '3 yıl dayanıklı seramik' → [{key:'durability_days', op:'gte', value:1080}]\n" +
          "- 'SiO2 içerikli' → [{key:'contains_sio2', op:'eq', value:true}]\n" +
          "Generic sorgularda BOŞ BIRAK — gereksiz filter bot'u yavaşlatır.",
      ),
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
          sku: z.string().describe('Primary variant SKU'),
          name: z.string().describe('base_name (size-suffix\'siz)'),
          brand: z.string(),
          price: z.number().describe('Primary variant price'),
          templateGroup: z.string(),
          snippet: z.string().describe('Ürün hakkında kısa özet (max 200 char)'),
          similarity: z.number().nullable().describe('Eşleşme skoru (0-1)'),
          variant_skus: z
            .string()
            .optional()
            .describe("Pipe-ayrık tüm variant SKU'ları (v8.5)"),
          sizes: z
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
            .describe('Her variant için detay (v8.5)'),
        }),
      )
      .describe('Ürün özetleri — her ürün bir group (multi-variant birleşik).'),
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
    metaFilters,
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

    // v8.4: metaFilters — productMetaTable'dan önce matching SKU listesi çek,
    // sonra search_index'e sku IN (...) filter ekle. Her metaFilter AYRI SKU SET
    // döner; hepsinin kesişimi (INTERSECTION) alınır (AND semantiği).
    let metaMatchedSkus: Set<string> | null = null;
    if (metaFilters && metaFilters.length > 0) {
      for (const mf of metaFilters) {
        const metaFilter: Record<string, unknown> = { key: { $eq: mf.key } };
        if (mf.op === 'eq' && typeof mf.value === 'boolean') {
          metaFilter.value_boolean = { $eq: mf.value };
        } else if (mf.op === 'eq' && typeof mf.value === 'number') {
          metaFilter.value_numeric = { $eq: mf.value };
        } else if (mf.op === 'eq' && typeof mf.value === 'string') {
          metaFilter.value_text = { $eq: mf.value };
        } else if (mf.op === 'regex' && typeof mf.value === 'string') {
          metaFilter.value_text = { $regex: mf.value, $options: 'i' };
        } else if (['gte', 'lte', 'gt', 'lt'].includes(mf.op)) {
          // numeric ops only work on value_numeric
          const opKey = `$${mf.op}`;
          metaFilter.value_numeric = { [opKey]: mf.value };
        }
        const metaRes = await client.findTableRows({
          table: 'productMetaTable',
          filter: metaFilter as any,
          limit: 1000,
        });
        const thisSet = new Set(metaRes.rows.map((r) => r.sku as string));
        if (metaMatchedSkus === null) {
          metaMatchedSkus = thisSet;
        } else {
          metaMatchedSkus = new Set([...metaMatchedSkus].filter((s) => thisSet.has(s)));
        }
      }
      // If after all meta filters nothing matches, early return empty
      if (metaMatchedSkus && metaMatchedSkus.size === 0) {
        return {
          carouselItems: [],
          textFallbackLines: [],
          productSummaries: [],
          totalReturned: 0,
          filtersApplied: {
            templateGroup: templateGroup ?? null,
            templateSubType: templateSubType ?? null,
            brand: brand ?? null,
            exactMatch: exactMatch ?? null,
          },
        };
      }
      // Add sku $in filter to main search
      if (metaMatchedSkus && metaMatchedSkus.size > 0) {
        filter.sku = { $in: [...metaMatchedSkus] };
      }
    }

    // v9.0: exactMatch → word-boundary + negative lookahead post-filter.
    // Problem: regex "Bathe" hem "Q²M Bathe" hem "Q²M Bathe+" match ediyordu.
    // Çözüm: DB'den oversample çek, JS'de strict regex ile post-filter.
    // "\b<needle>(?![+\w])" → "Bathe+" ve "Bathecoat" elenir, "Bathe" match.
    let fetchResult;
    if (exactMatch) {
      const needle = exactMatch.trim();
      // Try variant_skus first (for direct SKU lookup, regex OK — SKU unique)
      const variantRes = await client.findTableRows({
        table: 'productSearchIndexTable',
        filter: { ...filter, variant_skus: { $regex: needle, $options: 'i' } },
        limit: Math.max(limit, 10),
      });
      if (variantRes.rows.length > 0) {
        fetchResult = variantRes;
      } else {
        // Product_name regex: DB-side broad fetch (raw needle), JS strict post-filter.
        // NOT: DB-side '\b' ÇALIŞMAZ (Postgres POSIX = backspace, kelime sınırı değil).
        // Bu yüzden word-boundary kontrolü sadece JS tarafında (PCRE).
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // JS-side: word-boundary + negative lookahead (no '+' or word-char after)
        const strictRegex = new RegExp(`\\b${escaped}(?![+\\w])`, 'i');

        const broadRes = await client.findTableRows({
          table: 'productSearchIndexTable',
          filter: { ...filter, product_name: { $regex: needle, $options: 'i' } },
          limit: Math.max(limit * 3, 20),
        });
        // v9.2: Multi-match preference — query-token match count önce, kısa name tie-breaker.
        // "OdorRemover" → sprey (kısa, tek token match)
        // "OdorRemover Pads" → pads (iki token match > sprey tek match)
        const queryTokens = needle
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length > 1);
        const postFiltered = broadRes.rows
          .filter((r) => strictRegex.test(String(r.product_name || '')))
          .sort((a, b) => {
            const nameA = String(a.product_name || '').toLowerCase();
            const nameB = String(b.product_name || '').toLowerCase();
            const matchA = queryTokens.filter((t) => nameA.includes(t)).length;
            const matchB = queryTokens.filter((t) => nameB.includes(t)).length;
            if (matchA !== matchB) return matchB - matchA;
            return nameA.length - nameB.length;
          });
        fetchResult = { ...broadRes, rows: postFiltered.slice(0, limit) };

        // Fallback chain:
        // 1) Strict 0 → broad result (word-boundary miss ama regex eşleşti)
        // 2) Broad 0 → semantic search (yazım varyasyonu, "FabriCoat" vs "FabricCoat")
        if (fetchResult.rows.length === 0 && broadRes.rows.length > 0) {
          fetchResult = { ...broadRes, rows: broadRes.rows.slice(0, limit) };
        }
        if (fetchResult.rows.length === 0) {
          // v9.1 semantic fallback — embedding similarity ile yakın ürünleri bul
          const semanticRes = await client.findTableRows({
            table: 'productSearchIndexTable',
            search: query || needle,
            filter: Object.keys(filter).length > 0 ? filter : undefined,
            limit,
          });
          fetchResult = semanticRes;
        }
      }
    } else {
      fetchResult = await client.findTableRows({
        table: 'productSearchIndexTable',
        search: query,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit,
      });
    }

    const filteredRows = fetchResult.rows.slice(0, limit);

    // v8.5: Fetch sizes JSON from master for each result row
    // (search_index doesn't have sizes — master does)
    const sizesBySku = new Map<string, Array<{
      size_display: string; size_sort_value: number | null;
      sku: string; barcode: string; url: string; price: number; image_url: string;
    }>>();
    if (filteredRows.length > 0) {
      const skus = filteredRows.map((r) => r.sku as string);
      const masterRes = await client.findTableRows({
        table: 'productsMasterTable',
        filter: { sku: { $in: skus } } as any,
        limit: skus.length,
      });
      for (const m of masterRes.rows) {
        try {
          const sizesJson = m.sizes as string;
          if (sizesJson) {
            sizesBySku.set(m.sku as string, JSON.parse(sizesJson));
          }
        } catch {}
      }
    }

    // URL sanitization
    const hasRenderableUrl = (url: unknown): boolean => {
      const u = typeof url === 'string' ? url.trim() : '';
      return u.startsWith('http://') || u.startsWith('https://');
    };

    // v8.5: Each primary row expands to N Carousel cards (1 per variant with URL)
    const carouselItems: Array<{
      title: string; subtitle: string; imageUrl?: string;
      actions: Array<{ action: 'url'; label: string; value: string }>;
    }> = [];
    const textFallbackLines: Array<{
      productName: string; brand: string; price: number; sku: string;
    }> = [];

    for (const r of filteredRows) {
      const baseName = (r.base_name as string) || (r.product_name as string);
      const brand = r.brand as string;
      const sizes = sizesBySku.get(r.sku as string) || [];

      if (sizes.length === 0) {
        // No sizes data (edge case) — fall back to single-card from search_index row
        if (hasRenderableUrl(r.url)) {
          carouselItems.push({
            title: r.product_name as string,
            subtitle: `${brand} \u2022 ${(r.price as number).toLocaleString('tr-TR')} TL`,
            imageUrl: (r.image_url as string) || undefined,
            actions: [{ action: 'url', label: 'Ürün Sayfasına Git', value: (r.url as string).trim() }],
          });
        } else {
          textFallbackLines.push({
            productName: r.product_name as string, brand, price: r.price as number, sku: r.sku as string,
          });
        }
        continue;
      }

      // Each size = 1 Carousel card (user explicitly wanted per-size cards)
      for (const s of sizes) {
        const sizeLabel = s.size_display ? ` — ${s.size_display}` : '';
        const titleWithSize = sizes.length > 1 ? `${baseName}${sizeLabel}` : baseName;
        if (hasRenderableUrl(s.url)) {
          carouselItems.push({
            title: titleWithSize,
            subtitle: `${brand} \u2022 ${s.price.toLocaleString('tr-TR')} TL`,
            imageUrl: s.image_url || undefined,
            actions: [{ action: 'url', label: 'Ürün Sayfasına Git', value: s.url.trim() }],
          });
        } else {
          textFallbackLines.push({
            productName: titleWithSize, brand, price: s.price, sku: s.sku,
          });
        }
      }
    }

    return {
      carouselItems,
      textFallbackLines,

      productSummaries: filteredRows.map((r) => ({
        sku: r.sku as string,
        name: (r.base_name as string) || (r.product_name as string),
        brand: r.brand as string,
        price: r.price as number,
        templateGroup: r.template_group as string,
        snippet: ((r.search_text as string) ?? '').slice(0, 200),
        similarity: (r.similarity as number | null) ?? null,
        variant_skus: (r.variant_skus as string) || undefined,
        sizes: sizesBySku.get(r.sku as string) || [],
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
