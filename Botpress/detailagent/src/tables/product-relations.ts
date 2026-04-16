import { Table, z } from '@botpress/runtime';

/**
 * product_relations — Ürünler arası ilişkiler (622 satır).
 *
 * Her satırda virgülle ayrılmış SKU listesi olarak ilişkili ürünler tutulur.
 * Cross-sell ve uygulama akışı önerilerinde kullanılır:
 *   - use_before: bu ürünü uygulamadan önce kullanılması gerekenler
 *   - use_after: bu ürünün üzerine uygulanacaklar
 *   - use_with: birlikte kullanılacak tamamlayıcılar
 *   - accessories: aksesuar/yardımcı ürünler
 *   - alternatives: benzer işlev gören alternatif ürünler
 */
export const productRelationsTable = new Table({
  name: 'productRelationsTable',
  description:
    'Ürünler arası uyumluluk ve sıralama ilişkileri. Her alan virgülle ayrılmış ' +
    'SKU listesidir (örn: "22.828.281.001,22.992.281.001"). Cross-sell ve ' +
    'uygulama adım önerilerinde kullanılır.',
  columns: {
    sku: { schema: z.string().describe('Ana ürünün SKU\'su'), searchable: true },
    use_before: z
      .string()
      .nullable()
      .describe('Bu üründen ÖNCE kullanılması gereken ürünlerin SKU listesi (virgülle ayrılmış)'),
    use_after: z
      .string()
      .nullable()
      .describe('Bu ürünün ÜZERİNE uygulanacak ürünlerin SKU listesi'),
    use_with: z
      .string()
      .nullable()
      .describe('BİRLİKTE kullanılacak tamamlayıcı ürünlerin SKU listesi'),
    accessories: z
      .string()
      .nullable()
      .describe('İlgili aksesuar ve yardımcı ürünlerin SKU listesi'),
    alternatives: z
      .string()
      .nullable()
      .describe('Benzer işlev gören alternatif ürünlerin SKU listesi'),
  },
  keyColumn: 'sku',
});
