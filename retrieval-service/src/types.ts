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
] as const;

export const TemplateGroupSchema = z.enum(TEMPLATE_GROUPS);

export const RELATION_TYPES = [
  'use_with',
  'use_before',
  'use_after',
  'accessories',
  'alternatives',
] as const;

export const RelationTypeSchema = z.enum(RELATION_TYPES);

export const FaqScopeSchema = z.enum(['product', 'brand', 'category']);

export const RatingMetricSchema = z.enum([
  'durability',
  'beading',
  'self_cleaning',
]);

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
  snippet: z.string(),
  similarity: z.number().nullable(),
  variant_skus: z.string().optional(),
  sizes: z.array(SizeVariantSchema),
});
export type ProductSummary = z.infer<typeof ProductSummarySchema>;

// Lightweight summary for getRelatedProducts, search-by-price
export const LiteProductSummarySchema = z.object({
  sku: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
  templateGroup: z.string(),
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
  templateGroup: TemplateGroupSchema.nullable().optional(),
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
  minPrice: z.number().int().optional(),
  maxPrice: z.number().int().optional(),
  templateGroup: z.string().optional(),
  brand: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(10),
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
// /search/rating — searchByRating mirror
// ─────────────────────────────────────────────────────────────────

export const RatingSearchInputSchema = z.object({
  metric: RatingMetricSchema,
  templateGroup: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(10).default(3),
});
export type RatingSearchInput = z.infer<typeof RatingSearchInputSchema>;

export const RankedProductSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  brand: z.string(),
  ratingValue: z.number(),
  allRatings: z.object({
    durability: z.number().nullable(),
    beading: z.number().nullable(),
    self_cleaning: z.number().nullable(),
  }),
  price: z.number(),
  url: z.string(),
  imageUrl: z.string().nullable(),
  carouselCard: CarouselItemSchema,
});
export type RankedProduct = z.infer<typeof RankedProductSchema>;

export const RatingSearchResultSchema = z.object({
  metric: z.string(),
  rankedProducts: z.array(RankedProductSchema),
  totalCandidates: z.number().int(),
});
export type RatingSearchResult = z.infer<typeof RatingSearchResultSchema>;

// ─────────────────────────────────────────────────────────────────
// Internal DB row shapes (snake_case, used by formatters)
// ─────────────────────────────────────────────────────────────────

export interface ProductRow {
  sku: string;
  name: string;
  brand: string | null;
  main_cat: string | null;
  sub_cat: string | null;
  sub_cat2: string | null;
  template_group: string | null;
  template_sub_type: string | null;
  target_surface: string[] | null;
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
