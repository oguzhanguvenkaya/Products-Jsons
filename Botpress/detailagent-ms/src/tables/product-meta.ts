import { Table, z } from '@botpress/runtime';

/**
 * productMetaTable — EAV (Entity-Attribute-Value) meta alan tablosu.
 *
 * Amaç: Sparse meta alanlarını (cut_level, ph_level, silicone_free vb.)
 * verimli saklamak ve filter'lanabilir kılmak.
 *
 * Yaklaşım: Her ürün kendi sahip olduğu meta key'ler için bir satır taşır.
 * Boş değerler SATIR OLARAK YAZILMAZ — sparse storage.
 *
 * value_text, value_numeric, value_boolean — tipe göre doldurulur:
 *   - String değer  → value_text dolu, diğerleri null
 *   - Numeric değer → value_numeric dolu
 *   - Boolean değer → value_boolean dolu
 *
 * Filter örnekleri:
 *   - findTableRows({ filter: { key: { $eq: 'silicone_free' }, value_boolean: { $eq: true } } })
 *   - findTableRows({ filter: { key: { $eq: 'ph_level' }, value_numeric: { $gte: 6.5, $lte: 7.5 } } })
 *   - findTableRows({ filter: { key: { $eq: 'features' }, value_text: { $regex: 'silikonsuz' } } })
 *
 * Kaynak: productSpecsTable.specs_object JSON'u flatten edilerek türetilir
 * (Scripts/extract_meta_from_specs.py). Ek olarak search_text regex ile
 * türetilen boolean flag'ler (silicone_free, voc_free, contains_sio2) eklenir.
 *
 * productSpecsTable SİLİNMEZ — iki tablo birbirini tamamlar:
 *   - productSpecsTable: raw JSON (getProductDetails ile bot'a ham gösterim)
 *   - productMetaTable:  flatten EAV (searchProducts metaFilters ile filter)
 */
export const productMetaTable = new Table({
  name: 'productMetaTable',
  description:
    "Ürün meta alanları EAV (Entity-Attribute-Value) formatında. Her satır bir " +
    "(sku, key) çiftini ve tipe göre uygun value kolonunu taşır. Filter-friendly " +
    "sparse storage; boş meta alanlar satır olarak yazılmaz.",
  columns: {
    sku: {
      schema: z.string().describe("Ürün SKU'su"),
      searchable: true,
    },
    key: {
      schema: z.string().describe(
        "Meta alan anahtarı (örn: cut_level, ph_level, silicone_free, " +
          "volume_ml, target_surfaces, features)",
      ),
      searchable: true,
    },
    value_text: {
      schema: z
        .string()
        .nullable()
        .describe("String/metin değeri (örn: 'Germany', 'Rotary', 'paint')"),
      searchable: true,
    },
    value_numeric: z
      .number()
      .nullable()
      .describe("Numeric değer (örn: cut_level=8, ph_level=7.0, durability_days=1080)"),
    value_boolean: z
      .boolean()
      .nullable()
      .describe("Boolean değer (örn: silicone_free=true, voc_free=true, contains_sio2=true)"),
  },
});
