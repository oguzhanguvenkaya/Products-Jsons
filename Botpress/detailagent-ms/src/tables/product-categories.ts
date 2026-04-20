import { Table, z } from '@botpress/runtime';

/**
 * product_categories — Kategori taksonomisi (75 satır).
 *
 * 24 ana kategoriyi alt kategori ve ikincil alt kategoriye kadar açan
 * referans tablosu. Bot kategori önerisi yaparken bu tablodan filtreler.
 */
export const productCategoriesTable = new Table({
  name: 'productCategoriesTable',
  description:
    'MTS Kimya kategori hiyerarşisi. 24 ana kategori (DIŞ YÜZEY, AKSESUAR, ' +
    'TEMİZLİK vb.) ve bunların altındaki alt-alt kategoriler.',
  columns: {
    main_cat: { schema: z.string().describe('Ana kategori'), searchable: true },
    sub_cat: { schema: z.string().describe('Alt kategori'), searchable: true },
    sub_cat2: z.string().nullable().describe('İkincil alt kategori (opsiyonel)'),
  },
});
