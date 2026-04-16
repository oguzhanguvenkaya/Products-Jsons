import { Table, z } from '@botpress/runtime';

/**
 * product_specs — Şablon-bazlı teknik özellikler (622 satır).
 *
 * Her ürünün template_group/sub_type'ına göre değişen JSON yapısı.
 * Örnek (abrasive_polish/heavy_cut_compound):
 *   {"cut_level":10,"finish_level":6,"machine_compatibility":["Rotary","Orbital"],
 *    "silicone_free":true,"dusting_level":"Low","filler_free":true,
 *    "grit_removal":"P1200+","volume_ml":250,"made_in":"Almanya"}
 *
 * specs_object Zod'da z.unknown() olarak tutulur — şablon başına şeması farklı.
 */
export const productSpecsTable = new Table({
  name: 'productSpecsTable',
  description:
    'Ürün başına şablon-bazlı teknik özellikler. specs_object alanı ürünün ' +
    'şablon grubuna göre değişen JSON yapısıdır (cut_level, ph, volume_ml vb.).',
  columns: {
    sku: { schema: z.string().describe('Ürün SKU\'su'), searchable: true },
    template_group: z
      .string()
      .describe('Üst şablon grubu (örn: abrasive_polish, ceramic_coating)'),
    template_sub_type: z
      .string()
      .describe('Alt şablon tipi (örn: heavy_cut_compound, one_step)'),
    specs_object: z
      .string()
      .describe(
        'JSON string — ürüne özgü teknik parametreler. Şablon grubuna göre ' +
          'şeması değişir. JSON.parse() ile okunur.',
      ),
  },
  keyColumn: 'sku',
});
