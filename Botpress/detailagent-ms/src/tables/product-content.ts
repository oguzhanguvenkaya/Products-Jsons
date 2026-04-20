import { Table, z } from '@botpress/runtime';

/**
 * productContentTable — Ürün başına yapılandırılmış kullanım rehberi (622 satır).
 *
 * v7.2: fullDescription kaldırıldı — Botpress Tables 4KB/row limit nedeniyle
 * productDescPart1Table + productDescPart2Table'a split edildi.
 *
 * Kalan alanlar:
 *   - howToUse: 5 adımlı talimat
 *   - whenToUse: kullanım senaryosu
 *   - whyThisProduct: avantajlar
 *
 * `getApplicationGuide(sku)` ve `getProductDetails(sku)` tool'ları bu tabloyu
 * SKU üzerinden lookup eder + desc tablolarını paralel sorgular.
 */
export const productContentTable = new Table({
  name: 'productContentTable',
  description:
    'Ürün başına yapılandırılmış uygulama içeriği. howToUse (adım adım talimat), ' +
    'whenToUse (kullanım senaryosu), whyThisProduct (avantajlar) alanlarını içerir. ' +
    'SKU üzerinden products_master tablosuna bağlanır.',
  columns: {
    sku: { schema: z.string().describe("Ürün SKU'su"), searchable: true },
    howToUse: z
      .string()
      .nullable()
      .describe('Adım adım uygulama talimatı (1. yıkayın, 2. hazırlayın... gibi)'),
    whenToUse: z
      .string()
      .nullable()
      .describe('Hangi senaryolarda kullanılır (haftalık bakım, restorasyon vb.)'),
    whyThisProduct: z
      .string()
      .nullable()
      .describe('Bu ürünü farklı kılan teknik avantajlar'),
  },
  keyColumn: 'sku',
});
