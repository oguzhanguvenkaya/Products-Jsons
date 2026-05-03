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
    "MTS Kimya ürün kataloğunda hibrit arama. Semantic similarity + " +
    "kategori/marka pre-filter + exactMatch post-filter. " +
    "Parametre detayları her alanın description'ında — oraları oku.",
  input: z.object({
    query: z
      .string()
      .describe(
        "Semantic arama sorgusu — ürün türü/kullanımı/kategorisi doğal dil (ör: " +
          "'pH nötr araç şampuanı', 'polisaj pasta', 'seramik kaplama sprey'). " +
          "Rakam ve hacim BURAYA YAZMA — hacim sizeOptions/metaFilter akışıyla ele al; " +
          "exactMatch sadece MODEL token'ı için (örn. 'Bathe', 'Gommanera Superlux'), hacim YOK.",
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
        "Custom chatbot kategorisi (EN ÖNEMLİ FİLTRE). 24 değerden biri. Kullanıcı ürün türünü " +
          "söylediğinde MUTLAKA kullan.\n\n" +
          "KEYWORD TUZAK MAPPING — DİKKATLİ OKU:\n" +
          "• 'Seramik kaplama' → ceramic_coating (NOT glass_cleaner_protectant)\n" +
          "• 'Cam seramik kaplama' / 'cam için seramik' → ceramic_coating + templateSubType='glass_coating' (ceramic_coating altında cam için ürünler var)\n" +
          "• 'Cam temizleyici' (seramik DEĞİL) → glass_cleaner_protectant\n" +
          "• 'Dekontaminasyon şampuanı' / 'decon şampuan' → car_shampoo + templateSubType='decon_shampoo' (NOT contaminant_solvers)\n" +
          "• 'Iron remover' / 'demir tozu sökücü' / 'kil bar' → contaminant_solvers\n" +
          "• 'Su lekesi temizleyici / kireç çözücü / cam su lekesi' → contaminant_solvers + templateSubType='water_spot_remover' (sealant ürünleri ELENİR; sealant lekeyi önler, temizlemez)\n" +
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
          "• 'Saf deri temizleyici (LeatherCleaner Strong/Natural)' → interior_cleaner + templateSubType='leather_cleaner' (Phase 1.1.13K: leather_care kalktı)\n" +
          "• 'Deri+kumaş kombine temizleyici' → interior_cleaner + templateSubType='fabric_leather_cleaner'\n" +
          "• 'Deri koruyucu / deri bakım / leather conditioner' → interior_cleaner + templateSubType='leather_dressing'\n" +
          "• 'Deri set / leather kit' → interior_cleaner + templateSubType='leather_care_kit'",
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
          "SADECE kullanıcı TAM model adını NET olarak yazdıysa kullan.\n\n" +
          "✅ DOĞRU tek kelime: '400' (Menzerna 400), 'Bathe' (sade Bathe), 'Q2M-WYA' (SKU prefix).\n" +
          "✅ DOĞRU multi-word/compound TAM MODEL: 'Gommanera Superlux' (Blue ile karıştırma), " +
          "'Bathe+ Plus', 'Cure Matte', 'OdorRemover Pads', 'Mohs EVO'.\n\n" +
          "❌ KULLANMA — marka tek başına: 'Gommanera' (Blue mu Superlux mu belirsiz) → exactMatch BOŞ bırak, vector search relevance'a güven.\n" +
          "❌ KULLANMA — typo şüphesi: 'Bate' (Bathe yanlış yazımı) → exactMatch BOŞ. " +
          "AMA vector search Bate'i Bathe'e yakalamayabilir; bu durumda Carousel yield ETME, " +
          "instruction §ADIM 0 typo recovery kuralına göre Choice teyit zorunlu (kullanıcı onayı sonrası exactMatch=tahmin ile re-tool).\n" +
          "❌ KULLANMA — hacim içeren ifade: '3800 250ml', 'Superlux 5 litre' → hacim exactMatch'e GİTMEZ. " +
          "Hacmi ayrı ele al: sizeOptions/metaFilter ile.\n\n" +
          "KURAL: Şüphede exactMatch BOŞ — vector search semantically/fuzzy yakalar. " +
          "exactMatch boş döndüyse, exactMatch'i kaldırıp aynı sorguyu sadece query+templateGroup ile dene; " +
          "yine boşsa kullanıcıya açıkça yokluğu söyle ve alternatif sun.",
      ),
    mainCat: z.string().nullable().optional().describe('DEPRECATED — templateGroup kullan.'),
    subCat: z.string().nullable().optional().describe('DEPRECATED — templateGroup + templateSubType kullan.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(8)
      .describe('Döndürülecek maksimum ürün sayısı (varsayılan 8)'),
    metaFilters: z
      .array(
        z.object({
          key: z
            .string()
            .describe(
              "Meta alan anahtarı (Phase 1 canonical, 2026-04-25). Örnekler: " +
                "silicone_free, voc_free, contains_sio2, ph_level (1-14 numeric, ürün pH'ı), " +
                "ph_category (enum: 'asidik'|'nötr'|'alkali' — ph_level türevi, semantik filter), " +
                "ph_tolerance (string range, kaplama dayanımı), cut_level, " +
                "durability_months (number, ay), durability_km, " +
                "volume_ml (içerik), capacity_ml (sprayer tankı), " +
                "consumption_per_car_ml (araç başı tüketim), " +
                "target_surfaces (pipe-separated Türkçe canonical: 'boya|cam|deri|ppf|jant|...'), " +
                "compatibility (array Türkçe canonical: 'seramik kaplama', 'ppf', 'vinil', 'boya', 'plastik', 'mat boya', 'cam filmi', 'branda', 'boyahane güvenli', 'yumuşak boya güvenli', 'çocuk evcil güvenli', 'çizik yapmaz', 'ıslak zımpara', 'rotary', 'orbital', 'makine' vb. — üzerinde güvenli/uyumlu yüzey/folyo/makine; aksesuar ürünleri için free-text marka/seri uyumu: 'Karcher K Serisi', 'FLEX PXE 80', 'tornador', 'IK 1.5/2 litre tanklar' vb.), " +
                "product_type (machine, accessory, part — polisher_machine/sprayers_bottles için), " +
                "hardness",
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
          "- 'pH nötr şampuan' → templateSubType='ph_neutral_shampoo' (SSOT, ph_level numeric EKLEME — Phase 1.1.10 kararı, Bathe/Camper dahil)\n" +
          "- 'asidik / nötr / alkali ürün' → [{key:'ph_category', op:'eq', value:'asidik'}] (veya 'nötr'/'alkali') — enum filter, parse-safe (Phase 1.1.13C)\n" +
          "- 'pH 7 olan' / 'pH 6-8 arası' → [{key:'ph_level', op:'eq', value:7}] veya range gte/lte — numeric filter, sadece sayısal istekler\n" +
          "- '3 yıl dayanıklı seramik' / '36 ay' → [{key:'durability_months', op:'gte', value:36}]\n" +
          "- '30000 km dayanıklı' → [{key:'durability_km', op:'gte', value:30000}]\n" +
          "- 'SiO2 içerikli' → [{key:'contains_sio2', op:'eq', value:true}]\n" +
          "- '25 kg / 5 lt şampuan' → [{key:'volume_ml', op:'eq', value:25000}] (kg→ml ×1000, 1:1 yaklaşım)\n" +
          "- '1.5 L sprayer tankı' → [{key:'capacity_ml', op:'gte', value:1500}]\n" +
          "- 'PPF üzerinde güvenli / PPF için şampuan' → [{key:'target_surfaces', op:'regex', value:'ppf'}] (ARRAY key, 'regex' kullan — 'contains' DESTEKLENMİYOR)\n" +
          "- 'seramik kaplama üzerinde güvenli şampuan' → [{key:'compatibility', op:'regex', value:'seramik kaplama'}]\n" +
          "- 'PPF folyo üzerinde güvenli' → [{key:'compatibility', op:'regex', value:'ppf'}]\n" +
          "- 'mat boya güvenli' → [{key:'compatibility', op:'regex', value:'mat boya'}]\n" +
          "- 'boyahane güvenli pasta (silikonsuz)' → [{key:'compatibility', op:'regex', value:'boyahane güvenli'}]\n" +
          "- 'rotary/orbital makine uyumlu pad' → [{key:'compatibility', op:'regex', value:'rotary'}] (veya 'orbital')\n" +
          "- 'Karcher K serisi uyumlu foam lance' → [{key:'compatibility', op:'regex', value:'Karcher'}]\n" +
          "- 'FLEX PXE 80 backing plate' → [{key:'compatibility', op:'regex', value:'FLEX'}]\n" +
          "- 'alüminyum jant için (alüminyum yüzey)' → [{key:'target_surfaces', op:'regex', value:'alüminyum'}] (Phase 1.1.13D: substrate_safe deprecated, target_surfaces tutuyor)\n" +
          "- 'deri yüzey için' → [{key:'target_surfaces', op:'regex', value:'deri'}]\n" +
          "- 'alüminyum/krom/paslanmaz katı pasta' → templateSubType='solid_compound' + [{key:'target_surfaces', op:'regex', value:'alüminyum'}]\n" +
          "- 'heavy cut katı pasta' → templateSubType='solid_compound' + [{key:'purpose', op:'eq', value:'heavy_cut'}]\n" +
          "- 'polisaj makinesi (aksesuar değil)' → templateGroup='polisher_machine' + [{key:'product_type', op:'eq', value:'machine'}]\n" +
          "- 'polisaj tabanlığı' → templateGroup='polisher_machine' + [{key:'product_type', op:'eq', value:'accessory'}]\n\n" +
          "**ARRAY key listesi (op:'regex' kullan):** target_surfaces, compatibility\n" +
          "**SCALAR key (op:'eq'/'gte'/'lte'):** product_type, purpose, ph_level, ph_category (enum 'asidik'|'nötr'|'alkali'), durability_months, durability_km, volume_ml, capacity_ml, consumption_per_car_ml, cut_level, hardness, ph_tolerance\n\n" +
          "**NOT (Phase 1.1.13E):** target_surfaces SADECE kimyasal/dokunucu ürünlerde anlamlı. fragrance/sprayers_bottles/polisher_machine/storage_accessories/air_equipment/product_sets/wash_tools(bucket+foam_tool+towel_wash)/ppf_tools(consumable+positioning_tool) gruplarında target_surfaces YOK → bu kategorilerde target_surfaces filter koyma, templateGroup yeterli.\n\n" +
          "Generic sorgularda BOŞ BIRAK — gereksiz filter bot'u yavaşlatır.\n" +
          "Array key'lerde (target_surfaces, compatibility) " +
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
          templateSubType: z
            .string()
            .nullable()
            .describe('Granüler alt-tip — Adım 2 relevance check için (örn. tire_dressing, ph_neutral_shampoo)'),
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
            .describe('Her variant için detay (v8.5) — getProductDetails ile aynı struct'),
          sizeOptions: z
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
            .describe(
              "Aktif fiyat filtresine uyan TÜM variant'lar. " +
                "Variant-spesifik SKU/fiyat/ebat doğruluk kaynağı (variant truth source). " +
                "Carousel button bu listenin URL'li ilk 3'üyle üretilir.",
            ),
          sizeSummary: z
            .string()
            .describe(
              "Variant özet metni (örn. '250ml (500 TL) | 1lt (1500 TL) | 25kg (15000 TL)'). " +
                "Hızlı 'hangi ebatlar var' sorusunda BURAYA BAK.",
            ),
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
