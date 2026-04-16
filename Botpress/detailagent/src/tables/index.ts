/**
 * MTS Kimya detailagent — Tablo mimarisi (7 tablo)
 *
 * 1. productsMasterTable       — 622 satır, ana ürün kataloğu (+url, template_group/sub_type)
 * 2. productSpecsTable         — 622 satır, şablon-bazlı teknik özellikler (JSON)
 * 3. productFaqTable           — 2,119 satır, ürün başına SSS (searchFaq tool kullanır)
 * 4. productRelationsTable     — 622 satır, ürünler arası ilişkiler (use_with, alternatives vb.)
 * 5. productSearchIndexTable   — 622 satır, semantik arama metni (searchProducts tool kullanır)
 * 6. productCategoriesTable    — 75 satır, kategori taksonomisi (şu an pasif)
 * 7. productContentTable       — 622 satır, yapılandırılmış uygulama rehberi (howToUse vb.)
 *
 * NOT: ADK tablo isimleri 'Table' suffix'iyle bitmek zorunda (Botpress kuralı).
 */

export { productsMasterTable } from './products-master';
export { productSpecsTable } from './product-specs';
export { productFaqTable } from './product-faq';
export { productRelationsTable } from './product-relations';
export { productSearchIndexTable } from './product-search-index';
export { productCategoriesTable } from './product-categories';
export { productContentTable } from './product-content';
