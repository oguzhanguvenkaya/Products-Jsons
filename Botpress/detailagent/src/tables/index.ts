/**
 * MTS Kimya detailagent — Tablo mimarisi (9 tablo)
 *
 * 1. productsMasterTable       — 622 satır, ana ürün kataloğu
 * 2. productSpecsTable         — 622 satır, şablon-bazlı teknik özellikler (JSON)
 * 3. productFaqTable           — 2,119 satır, ürün başına SSS
 * 4. productRelationsTable     — 622 satır, ürünler arası ilişkiler
 * 5. productSearchIndexTable   — 622 satır, semantik arama metni
 * 6. productCategoriesTable    — 75 satır, kategori taksonomisi
 * 7. productContentTable       — 622 satır, howToUse/whenToUse/whyThisProduct
 * 8. productDescPart1Table     — 622 satır, fullDescription ilk ~3800 byte (v7.2)
 * 9. productDescPart2Table     — 622 satır, fullDescription kalan kısım (v7.2, çoğu boş)
 *
 * v7.2: fullDescription productContentTable'dan çıkarıldı; 4KB satır limiti
 * nedeniyle part1/part2 tablolarına split edildi. Tool handler birleştirir.
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
export { productDescPart1Table } from './product-desc-part1';
export { productDescPart2Table } from './product-desc-part2';
