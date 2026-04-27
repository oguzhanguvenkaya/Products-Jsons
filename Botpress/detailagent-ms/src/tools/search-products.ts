import { Autonomous, z } from '@botpress/runtime';
import { retrievalClient } from '../lib/retrieval-client.ts';

/**
 * searchProducts — Hibrit ürün arama (retrieval microservice üzerinden).
 *
 * Phase 4 cutover: tool handler artık `detailagent-retrieval` microservice'ine
 * HTTP POST atıyor. Microservice Turkish FTS + Gemini vector + RRF fusion +
 * synonym expansion + slot extraction + business boosts uyguluyor
 * (retrieval-service/src/lib/searchCore.ts). Tool input/output contract
 * (Phase 3 Step 3 mirror) aynı kalıyor; LLM arkadaki altyapı değişikliğini
 * görmüyor.
 *
 * Eskiden bu handler'da bulunan ve şimdi microservice'te olan logic:
 *   - MongoDB-style pre-filter (template_group, brand, mainCat ILIKE, ...)
 *   - Botpress Tables vector search → Gemini embedding + HNSW cosine
 *   - v9.0 word-boundary exactMatch post-filter (JS \b regex, microservice
 *     aynı algoritmayı `applyExactMatch` içinde çalıştırıyor)
 *   - v9.2 multi-token matching preference (microservice'te)
 *   - metaFilter intersection (microservice `resolveMetaFilterSkus`)
 *   - sizes JSON hydrate (microservice formatter'ında)
 */
export const searchProducts = new Autonomous.Tool({
  name: 'searchProducts',
  description:
    "MTS Kimya ürün kataloğunda (511 ürün) hibrit arama. Semantic similarity + " +
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
        'sprayers_bottles',
        'storage_accessories',
        'tire_care',
        'wash_tools',
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
          "• 'Kurulama havlusu / yıkama eldiveni / köpük tabancası / sünger' → wash_tools (Phase 2R yeni grup)\n" +
          "• 'Mikrofiber bez (genel temizlik/cila silme)' → microfiber\n" +
          "• 'Polisaj makinesi' → polisher_machine + metaFilter[product_type=machine] (accessory karışmasın)\n" +
          "• 'Polisaj tabanlığı / yedek akü / şarj cihazı' → polisher_machine + metaFilter[product_type=accessory]\n" +
          "• 'Sprayer yedek başlık / nozzle / hortum' → sprayers_bottles + metaFilter[product_type=part]\n" +
          "• 'Lastik parlatıcı' → tire_care (NOT ceramic_coating; tire_coating sub_type Phase 2R'de tire_dressing'e merge oldu)\n" +
          "• 'Deri koruyucu / deri bakım' → leather_care (leather_coating sub_type fabric_coating'a merge edildi)",
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
              "Meta alan anahtarı (Phase 1 canonical, 2026-04-25). Örnekler: " +
                "silicone_free, voc_free, contains_sio2, ph_level (1-14, ürün pH'ı), " +
                "ph_tolerance (string range, kaplama dayanımı), cut_level, " +
                "durability_months (number, ay), durability_km, " +
                "volume_ml (içerik), capacity_ml (sprayer tankı), " +
                "consumption_per_car_ml (araç başı tüketim), " +
                "target_surface (array: paint, glass, leather, ppf, ...), " +
                "compatibility (array: ceramic_coating, ppf — üzerine uygulanabilir), " +
                "substrate_safe (array: aluminum, fiberglass, plexiglass), " +
                "product_type (machine, accessory, part — polisher_machine/sprayers_bottles için), " +
                "machine_compatibility, hardness, features",
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
        "Microservice meta EAV filtresi. SADECE KULLANICI AÇIKÇA ÖZELLİK " +
          "SORDUĞUNDA kullan. Phase 1 canonical key listesi (2026-04-25):\n" +
          "- 'silikonsuz' → [{key:'silicone_free', op:'eq', value:true}]\n" +
          "- 'pH nötr şampuan' → [{key:'ph_level', op:'gte', value:6.5}, {key:'ph_level', op:'lte', value:7.5}]\n" +
          "- '3 yıl dayanıklı seramik' / '36 ay' → [{key:'durability_months', op:'gte', value:36}]\n" +
          "- '30000 km dayanıklı' → [{key:'durability_km', op:'gte', value:30000}]\n" +
          "- 'SiO2 içerikli' → [{key:'contains_sio2', op:'eq', value:true}]\n" +
          "- '25 kg / 5 lt şampuan' → [{key:'volume_ml', op:'eq', value:25000}] (kg→ml ×1000, 1:1 yaklaşım)\n" +
          "- '1.5 L sprayer tankı' → [{key:'capacity_ml', op:'gte', value:1500}]\n" +
          "- 'PPF üzerinde güvenli / PPF için şampuan' → [{key:'target_surface', op:'regex', value:'ppf'}] (ARRAY key, 'regex' kullan — 'contains' DESTEKLENMİYOR; PPF safe-on için target_surface kullan)\n" +
          "- 'seramik üzerinde güvenli' → [{key:'compatibility', op:'regex', value:'ceramic_coating'}]\n" +
          "- 'alüminyum jant için' → [{key:'substrate_safe', op:'regex', value:'aluminum'}]\n" +
          "- 'deri yüzey için' → [{key:'target_surface', op:'regex', value:'leather'}]\n" +
          "- 'alüminyum/krom/paslanmaz katı pasta' → templateSubType='solid_compound' + [{key:'surface', op:'regex', value:'aluminum'}] (industrial için 'surface' key, jant temizleyici için 'substrate_safe')\n" +
          "- 'heavy cut katı pasta' → templateSubType='solid_compound' + [{key:'purpose', op:'eq', value:'heavy_cut'}]\n" +
          "- 'polisaj makinesi (aksesuar değil)' → templateGroup='polisher_machine' + [{key:'product_type', op:'eq', value:'machine'}]\n" +
          "- 'polisaj tabanlığı' → templateGroup='polisher_machine' + [{key:'product_type', op:'eq', value:'accessory'}]\n\n" +
          "**ARRAY key listesi (op:'regex' kullan):** target_surface, compatibility, substrate_safe, surface, features\n" +
          "**SCALAR key (op:'eq'/'gte'/'lte'):** product_type, purpose, ph_level, durability_months, durability_km, volume_ml, capacity_ml, consumption_per_car_ml, cut_level, hardness, ph_tolerance\n\n" +
          "Generic sorgularda BOŞ BIRAK — gereksiz filter bot'u yavaşlatır.\n" +
          "Array key'lerde (target_surface, compatibility, substrate_safe, surface, features) " +
          "op:'regex' kullan ('contains' DESTEKLENMİYOR — schema reject eder).",
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
  async handler(input) {
    // Phase 4 cutover: tüm pre-filter + vector search + exactMatch
    // post-filter + metaFilter intersection + sizes hydrate logic
    // microservice tarafında (retrieval-service/src/lib/searchCore.ts).
    // Bot handler sadece input'u forward edip mirror contract'ı
    // döndürür; Autonomous.Tool output zod şeması dönen shape'i
    // runtime'da doğrular.
    return await retrievalClient.search({
      query: input.query,
      templateGroup: input.templateGroup ?? null,
      templateSubType: input.templateSubType ?? null,
      brand: input.brand ?? null,
      exactMatch: input.exactMatch ?? null,
      mainCat: input.mainCat ?? null,
      subCat: input.subCat ?? null,
      limit: input.limit,
      metaFilters: input.metaFilters ?? null,
      mode: 'hybrid',
    });
  },
});
