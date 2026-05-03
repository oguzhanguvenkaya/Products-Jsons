/**
 * types.ts — Shared contracts for retrieval-service.
 *
 * Design: schemas mirror the Botpress bot tool output 1:1 so that
 * the Phase 4 cutover handler can be trivial (essentially
 * `return await fetch(url).json()`).
 *
 * Single source of truth: every response shape is a zod schema;
 * TypeScript types are derived via `z.infer<>`.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────
// Enums / literals
// ─────────────────────────────────────────────────────────────────

export const TEMPLATE_GROUPS = [
  'abrasive_polish',
  'air_equipment',          // Phase 19 (eski accessory)
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
  'wash_tools',             // Phase 2R §14 (yeni grup)
] as const;

export const TemplateGroupSchema = z.enum(TEMPLATE_GROUPS);

/**
 * Phase 1.1.13K alias shim — deprecated `leather_care` → `interior_cleaner`.
 *
 * leather_care template_group 7 ürünle birlikte interior_cleaner altına
 * konsolide edildi. Eski runtime/bot prompt hâlâ `leather_care` gönderebilir;
 * burası input'u sessizce normalize eder. Telemetry için console.warn
 * (production'da log aggregation ile sayılır). Min. 1 release döngüsü tutulur,
 * sonra ayrı PR ile silinir.
 */
const DEPRECATED_TEMPLATE_GROUP_ALIASES: Record<string, string> = {
  leather_care: 'interior_cleaner',
};

export function normalizeTemplateGroup<T extends string | null | undefined>(value: T): T {
  if (typeof value !== 'string') return value;
  const aliased = DEPRECATED_TEMPLATE_GROUP_ALIASES[value];
  if (aliased) {
    console.warn(`[deprecated-alias] templateGroup=${value} → ${aliased}`);
    return aliased as T;
  }
  return value;
}

export const RELATION_TYPES = [
  'use_with',
  'use_before',
  'use_after',
  'accessories',
  'alternatives',
] as const;

export const RelationTypeSchema = z.enum(RELATION_TYPES);

export const FaqScopeSchema = z.enum(['product', 'brand', 'category']);

// Phase 1.1: searchByRating tamamen kaldırıldı — rating metrikleri rankBySpec
// (rating_durability/beading/self_cleaning) sortKey'leri üzerinden sıralanır.

// rankBySpec sortKey enum'u — numeric / rating tüm sıralama yolları tek API'den.
export const RankBySpecSortKeySchema = z.enum([
  // Objektif numeric specs
  'durability_months',
  'durability_km',
  'cut_level',
  'volume_ml',
  'weight_g',
  'capacity_ml',
  'capacity_usable_ml',
  'consumption_per_car_ml',
  // Rating projection (specs.ratings.* → product_meta scalar key)
  'rating_durability',
  'rating_beading',
  'rating_self_cleaning',
]);
export type RankBySpecSortKey = z.infer<typeof RankBySpecSortKeySchema>;

export const SortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

// ─────────────────────────────────────────────────────────────────
// Shared response primitives (mirror Botpress tool output)
// ─────────────────────────────────────────────────────────────────

export const CarouselItemSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  imageUrl: z.string().optional(),
  actions: z.array(
    z.object({
      action: z.literal('url'),
      label: z.string(),
      value: z.string().min(1),
    }),
  ),
});
export type CarouselItem = z.infer<typeof CarouselItemSchema>;

export const TextFallbackLineSchema = z.object({
  productName: z.string(),
  brand: z.string(),
  price: z.number(),
  sku: z.string(),
});
export type TextFallbackLine = z.infer<typeof TextFallbackLineSchema>;

export const SizeVariantSchema = z.object({
  size_display: z.string(),
  size_sort_value: z.number().nullable(),
  sku: z.string(),
  barcode: z.string(),
  url: z.string(),
  price: z.number(),
  image_url: z.string(),
});
export type SizeVariant = z.infer<typeof SizeVariantSchema>;

export const ProductSummarySchema = z.object({
  sku: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
  templateGroup: z.string(),
  templateSubType: z.string().nullable(),
  snippet: z.string(),
  similarity: z.number().nullable(),
  variant_skus: z.string().optional(),
  sizes: z.array(SizeVariantSchema),
  // Phase 1.1.7: variant truth source — fiyat filter uygulanmış array
  sizeOptions: z.array(SizeVariantSchema),
  // Phase 1.1.7: LLM hızlı okuma — "250ml (500 TL) | 1lt (1500 TL)"
  sizeSummary: z.string(),
});
export type ProductSummary = z.infer<typeof ProductSummarySchema>;

// Lightweight summary for getRelatedProducts, search-by-price
export const LiteProductSummarySchema = z.object({
  sku: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
  templateGroup: z.string(),
  templateSubType: z.string().nullable(),
  // Phase 1.1.7: lite'da da variant info
  sizeOptions: z.array(SizeVariantSchema),
  sizeSummary: z.string(),
});
export type LiteProductSummary = z.infer<typeof LiteProductSummarySchema>;

// ─────────────────────────────────────────────────────────────────
// /search — searchProducts mirror
// ─────────────────────────────────────────────────────────────────

export const MetaFilterSchema = z.object({
  key: z.string(),
  op: z.enum(['eq', 'gte', 'lte', 'gt', 'lt', 'regex']),
  value: z.union([z.string(), z.number(), z.boolean()]),
});
export type MetaFilter = z.infer<typeof MetaFilterSchema>;

export const SearchModeSchema = z.enum(['pure_vector', 'hybrid']);
export type SearchMode = z.infer<typeof SearchModeSchema>;

export const SearchInputSchema = z.object({
  query: z.string().min(1),
  templateGroup: z.preprocess(
    (val) => normalizeTemplateGroup(val as any),
    TemplateGroupSchema.nullable().optional(),
  ),
  templateSubType: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  exactMatch: z.string().nullable().optional(),
  mainCat: z.string().nullable().optional(),
  subCat: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(10).default(5),
  metaFilters: z.array(MetaFilterSchema).nullable().optional(),
  /** Retrieval strategy. Default 'hybrid' (Phase 3); 'pure_vector'
   *  routes to the Phase 2 baseline for A/B comparison. */
  mode: SearchModeSchema.optional().default('hybrid'),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const SearchResultSchema = z.object({
  carouselItems: z.array(CarouselItemSchema),
  textFallbackLines: z.array(TextFallbackLineSchema),
  productSummaries: z.array(ProductSummarySchema),
  totalReturned: z.number().int(),
  filtersApplied: z.object({
    templateGroup: z.string().nullable(),
    templateSubType: z.string().nullable(),
    brand: z.string().nullable(),
    exactMatch: z.string().nullable(),
  }),
  debug: z
    .object({
      mode: z.enum(['pure_vector', 'hybrid']),
      latencyMs: z.number(),
      vecCount: z.number().int().optional(),
      bm25Count: z.number().int().optional(),
      slots: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

// ─────────────────────────────────────────────────────────────────
// /faq — searchFaq mirror
// ─────────────────────────────────────────────────────────────────

export const FaqInputSchema = z.object({
  query: z.string().min(1),
  sku: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(10).default(5),
});
export type FaqInput = z.infer<typeof FaqInputSchema>;

export const FaqItemSchema = z.object({
  sku: z.string(),
  question: z.string(),
  answer: z.string(),
  similarity: z.number().nullable(),
});
export type FaqItem = z.infer<typeof FaqItemSchema>;

export const FaqResultSchema = z.object({
  results: z.array(FaqItemSchema),
  totalReturned: z.number().int(),
  topSimilarity: z.number().nullable(),
  confidence: z.enum(['high', 'low', 'none']),
  recommendation: z.string(),
});
export type FaqResult = z.infer<typeof FaqResultSchema>;

// ─────────────────────────────────────────────────────────────────
// /products/:sku — getProductDetails mirror
// ─────────────────────────────────────────────────────────────────

export const ProductDetailsSchema = z.object({
  sku: z.string(),
  inputSku: z.string(),
  baseName: z.string(),
  productName: z.string(),
  brand: z.string(),
  price: z.number(),
  imageUrl: z.string().nullable(),
  url: z.string(),
  mainCat: z.string(),
  subCat: z.string().nullable(),
  sub_cat2: z.string().nullable(),
  targetSurface: z.string().nullable(),
  templateGroup: z.string(),
  templateSubType: z.string(),
  technicalSpecs: z.record(z.string(), z.unknown()),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })),
  howToUse: z.string().nullable(),
  whenToUse: z.string().nullable(),
  whyThisProduct: z.string().nullable(),
  fullDescription: z.string().nullable(),
  variants: z.array(SizeVariantSchema),
});
export type ProductDetails = z.infer<typeof ProductDetailsSchema>;

// ─────────────────────────────────────────────────────────────────
// /products/:sku/guide — getApplicationGuide mirror (hafif payload + videoCard)
// ─────────────────────────────────────────────────────────────────

export const ProductGuideSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  brand: z.string(),
  price: z.number(),
  imageUrl: z.string().nullable(),
  url: z.string(),
  targetSurface: z.string().nullable(),
  templateGroup: z.string(),
  templateSubType: z.string(),
  howToUse: z.string().nullable(),
  whenToUse: z.string().nullable(),
  whyThisProduct: z.string().nullable(),
  fullDescription: z.string().nullable(),
  videoCard: CarouselItemSchema.nullable(),
});
export type ProductGuide = z.infer<typeof ProductGuideSchema>;

// ─────────────────────────────────────────────────────────────────
// /products/:sku/related — getRelatedProducts mirror
// ─────────────────────────────────────────────────────────────────

export const RelatedInputSchema = z.object({
  relationType: RelationTypeSchema,
});
export type RelatedInput = z.infer<typeof RelatedInputSchema>;

export const RelatedResultSchema = z.object({
  sku: z.string(),
  relationType: z.string(),
  carouselItems: z.array(CarouselItemSchema),
  textFallbackLines: z.array(TextFallbackLineSchema),
  productSummaries: z.array(LiteProductSummarySchema),
  totalReturned: z.number().int(),
});
export type RelatedResult = z.infer<typeof RelatedResultSchema>;

// ─────────────────────────────────────────────────────────────────
// /search/price — searchByPriceRange mirror
// ─────────────────────────────────────────────────────────────────

export const PriceSearchInputSchema = z.object({
  minPrice: z.number().int().nullable().optional(),
  maxPrice: z.number().int().nullable().optional(),
  templateGroup: z.preprocess(
    (val) => normalizeTemplateGroup(val as any),
    z.string().nullable().optional(),
  ),
  // Phase 1.1 hotfix: alt-grup filter (ph_neutral_shampoo, paint_coating vb.).
  // Olmadan "en pahalı pH nötr şampuan" sorgusu tüm car_shampoo'yu sıralar
  // ve INNOVACAR S2 Foamy gibi yanlış kategori "en pahalı nötr" çıkar.
  templateSubType: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(20).default(10),
  sortDirection: SortDirectionSchema.default('asc'),
});
export type PriceSearchInput = z.infer<typeof PriceSearchInputSchema>;

export const PriceSearchResultSchema = z.object({
  carouselItems: z.array(CarouselItemSchema),
  textFallbackLines: z.array(TextFallbackLineSchema),
  productSummaries: z.array(LiteProductSummarySchema),
  totalReturned: z.number().int(),
});
export type PriceSearchResult = z.infer<typeof PriceSearchResultSchema>;

// ─────────────────────────────────────────────────────────────────
// /search/rank-by-spec — rankBySpec (universal numeric/rating ranker)
// ─────────────────────────────────────────────────────────────────

export const RankBySpecInputSchema = z
  .object({
    sortKey: RankBySpecSortKeySchema,
    direction: SortDirectionSchema.default('desc'),
    templateGroup: z.preprocess(
      (val) => normalizeTemplateGroup(val as any),
      z.string().nullable().optional(),
    ),
    templateSubType: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    minValue: z.number().nullable().optional(),
    maxValue: z.number().nullable().optional(),
    limit: z.number().int().min(1).max(10).default(3),
  })
  .superRefine((data, ctx) => {
    if (data.sortKey === 'consumption_per_car_ml' && data.direction === 'desc') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Tüketim sıralamasında (consumption_per_car_ml) 'desc' anlamsızdır, lütfen 'asc' (en az tüketen) kullanın.",
        path: ['direction'],
      });
    }
  });
export type RankBySpecInput = z.infer<typeof RankBySpecInputSchema>;

export const RankedProductSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  brand: z.string(),
  rankValue: z.number(),
  price: z.number(),
  url: z.string(),
  imageUrl: z.string().nullable(),
  carouselCard: CarouselItemSchema,
});
export type RankedProduct = z.infer<typeof RankedProductSchema>;

export const RankBySpecResultSchema = z.object({
  sortKey: z.string(),
  direction: z.string(),
  unit: z.string(),
  rankedProducts: z.array(RankedProductSchema),
  totalCandidates: z.number().int(),
  coverageTotal: z.number().int(),
  coverageNote: z.string().nullable(),
});
export type RankBySpecResult = z.infer<typeof RankBySpecResultSchema>;

// ─────────────────────────────────────────────────────────────────
// Internal DB row shapes (snake_case, used by formatters)
// ─────────────────────────────────────────────────────────────────

export interface ProductRow {
  sku: string;
  name: string;
  base_name?: string | null;
  brand: string | null;
  main_cat: string | null;
  sub_cat: string | null;
  sub_cat2: string | null;
  template_group: string | null;
  template_sub_type: string | null;
  price: string | number | null; // postgres numeric comes back as string
  rating: string | number | null;
  stock_status: string | null;
  url: string | null;
  image_url: string | null;
  short_description: string | null;
  full_description: string | null;
  specs: Record<string, unknown> | null;
  sizes: SizeVariant[] | null;
  variant_skus: string[] | null;
  is_featured: boolean | null;
  video_url?: string | null;
}

export interface ProductSearchRow {
  sku: string;
  score: number; // cosine similarity (1 - distance) or bm25 rank
}

export interface FaqRow {
  id: number;
  scope: 'product' | 'brand' | 'category';
  sku: string | null;
  brand: string | null;
  category: string | null;
  question: string;
  answer: string;
  similarity?: number;
}
