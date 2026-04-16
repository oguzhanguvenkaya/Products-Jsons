/**
 * detailagent — Autonomous Tools (6 adet)
 *
 * ### Semantik arama
 * - searchProducts  → productSearchIndexTable.search_text vector search +
 *                     templateGroup/templateSubType/brand/exactMatch filters
 * - searchFaq       → productFaqTable.question+answer semantic search
 *
 * ### Yapısal lookup
 * - getProductDetails(sku)            → master + specs + faq + content (4 tablo JOIN)
 * - getApplicationGuide(sku)          → content + master join (url, productName)
 * - searchByPriceRange({min,max,...}) → master üzerinde fiyat + filter
 * - getRelatedProducts(sku, type)     → relations tablosundan SKU → master JOIN
 *
 * ### Mimari not
 * Botpress Tables'ın built-in vector search'ü `searchable: true` kolonlara
 * (sku + search_text) otomatik uygulanır. `client.findTableRows({search})` ile
 * doğrudan similarity tabanlı sorgulanır — Knowledge Base abstraction'ına
 * gerek yok.
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
