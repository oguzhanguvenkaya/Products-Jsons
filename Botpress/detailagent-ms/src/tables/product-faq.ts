import { Table, z } from '@botpress/runtime';

/**
 * product_faq — Ürün başına SSS (2,119 satır).
 *
 * Bir ürünün birden fazla SSS girdisi olabilir. Müşterilerin sıkça sorduğu
 * spesifik soruların hazır cevaplarını içerir (silikon içeriyor mu, hangi
 * pedlerle uyumlu vb.).
 */
export const productFaqTable = new Table({
  name: 'productFaqTable',
  description:
    'Ürün başına sıkça sorulan sorular ve hazır cevapları. Bir ürünün birden ' +
    'fazla satırı olabilir. SKU üzerinden ana ürünlerle eşleşir.',
  columns: {
    sku: { schema: z.string().describe('Ürün SKU\'su'), searchable: true },
    question: { schema: z.string().describe('Sıkça sorulan soru'), searchable: true },
    answer: { schema: z.string().describe('Hazır cevap metni'), searchable: true },
  },
});
