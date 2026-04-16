import { Table, z } from '@botpress/runtime';

/**
 * productContentTable — Ürün başına yapılandırılmış kullanım rehberi (622 satır).
 *
 * Bu tablo product_content.csv'den seed edilir ve Studio'daki search_text
 * özetlemesinin KAYBETTİĞİ structured alanları döndürür:
 *   - howToUse: 5 adımlı talimat
 *   - whenToUse: kullanım senaryosu
 *   - whyThisProduct: avantajlar
 *   - fullDescription: HTML temizlenmiş tam açıklama (~2KB+)
 *   - targetSurface: hedef yüzeyler
 *
 * `getApplicationGuide(sku)` ve `getProductDetails(sku)` tool'ları bu tabloyu
 * SKU üzerinden lookup eder. Semantik aramaya katılmaz, sadece yapısal
 * lookup için (tool: getApplicationGuide ve getProductDetails).
 *
 * NOT: CamelCase column adları CSV başlıklarıyla birebir eşleşmek zorunda
 * (productName, howToUse vb.) — seed script bunları olduğu gibi yansıtır.
 */
export const productContentTable = new Table({
  name: 'productContentTable',
  description:
    'Ürün başına yapılandırılmış uygulama içeriği. howToUse (adım adım talimat), ' +
    'whenToUse (kullanım senaryosu), whyThisProduct (avantajlar), fullDescription ' +
    '(tam açıklama) ve targetSurface (hedef yüzey) alanlarını içerir. SKU üzerinden ' +
    'products_master tablosuna bağlanır.',
  columns: {
    sku: { schema: z.string().describe("Ürün SKU'su"), searchable: true },
    fullDescription: z
      .string()
      .nullable()
      .describe('HTML temizlenmiş tam ürün açıklaması (~2KB+ olabilir)'),
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
