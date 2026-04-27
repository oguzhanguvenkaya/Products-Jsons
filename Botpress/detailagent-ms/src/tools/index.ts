/**
 * detailagent-ms — Autonomous Tools (7 adet, tümü microservice HTTP)
 *
 * ### Semantik arama (microservice: /search, /faq)
 * - searchProducts  → hybrid retrieval (BM25 Turkish FTS + vector + RRF)
 *                     templateGroup/templateSubType/brand/exactMatch filters
 *                     slotExtractor inline (priceMin/priceMax)
 * - searchFaq       → product/brand/category scope + SKU-bypass + confidence tier
 *
 * ### Yapısal lookup (microservice: /products/*)
 * - getProductDetails(sku)            → /products/:sku — full payload (specs + faqs[] + variants[])
 * - getApplicationGuide(sku)          → /products/:sku/guide — hafif payload + videoCard
 * - getRelatedProducts(sku, type)     → /products/:sku/related?relationType=X — 5 granular type
 *
 * ### Sıralama (microservice: /search/price, /search/rank-by-spec)
 * - searchByPriceRange({min,max,sortDirection,...}) → variant-aware fiyat sıralama
 * - rankBySpec({sortKey,direction,...})             → 11 sortKey universal ranker
 *                                                     (numeric specs + rating_* projection)
 *
 * ### Phase 1.1 değişiklikleri
 * - searchByRating KALDIRILDI; rating sıralama rankBySpec içinde.
 * - retrieval-client timeout 3s → 5s (cold embedding ERROR'una karşı).
 *
 * ### Mimari (Phase 4 sonrası)
 * Tüm tool'lar `retrievalClient` üzerinden HTTP call atar. Botpress Tables
 * bağımlılığı kalmadı. Bearer auth, hard cutover (5xx → throw).
 *
 * compareProducts eklenmedi: LLM getProductDetails'i 2 kez çağırarak aynı işi
 * yapar; heterojen spec şemaları için ayrı tool karmaşa yaratıyor.
 */

export { searchProducts } from './search-products';
export { searchFaq } from './search-faq';
export { getProductDetails } from './get-product-details';
export { getApplicationGuide } from './get-application-guide';
export { searchByPriceRange } from './search-by-price-range';
export { getRelatedProducts } from './get-related-products';
export { rankBySpec } from './rank-by-spec';
