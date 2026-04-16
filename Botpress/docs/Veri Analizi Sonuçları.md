# Veri Analizi Sonuçları

## Genel Bakış
- 24 kategori dosyası, 622 ürün
- 25 template group
- 602 benzersiz template field
- 6 content alanı: short_description, full_description, how_to_use, when_to_use, target_surface, why_this_product
- 5 ilişki türü: use_before, use_after, use_with, accessories, alternatives
- Kategori yapısı: main_cat / sub_cat / sub_cat2

## Kritik Sorun: 20 Sütun Sınırı
Hiçbir template group bile tek başına 20 sütun sınırına sığmıyor.
En küçük grup (product_sets, 7 field) bile base+cat+content+meta+fields+rels = 27 sütun.
En büyük grup (car_shampoo, 116 field) = 136 sütun.

## Çözüm Stratejisi: Hibrit Yaklaşım (Tables + Knowledge Base + Rich Text)

### Strateji 1: Normalize Edilmiş Tablolar
Veriyi birden fazla tabloya böl, ID ile ilişkilendir:

**Tablo 1: products_master (Ana Ürün Tablosu) - ~15 sütun**
- sku (searchable)
- barcode
- product_name (searchable)
- brand (searchable)
- price
- image_url
- main_cat (searchable)
- sub_cat (searchable)
- sub_cat2 (searchable)
- template_group
- template_sub_type
- short_description (searchable)
- target_surface (searchable)
- stock_status
- url

**Tablo 2: product_content (İçerik Tablosu) - ~8 sütun**
- sku (searchable)
- product_name (searchable)
- full_description (searchable)
- how_to_use (searchable)
- when_to_use (searchable)
- why_this_product (searchable)
- target_surface (searchable)
- template_group

**Tablo 3: product_relations (İlişki Tablosu) - ~8 sütun**
- sku (searchable)
- product_name (searchable)
- use_before (searchable)
- use_after (searchable)
- use_with (searchable)
- accessories (searchable)
- alternatives (searchable)
- template_group

**Tablo 4: product_faq (SSS Tablosu) - ~5 sütun**
- sku (searchable)
- product_name (searchable)
- question (searchable)
- answer (searchable)
- template_group

**Tablo 5: product_specs (Teknik Özellikler - JSON string) - ~6 sütun**
- sku (searchable)
- product_name (searchable)
- template_group (searchable)
- template_sub_type (searchable)
- specs_json (searchable) - tüm template fields JSON string olarak
- specs_summary (searchable) - okunabilir özet metin

### Strateji 2: Knowledge Base Dokümanları
- chatbot_md/ klasöründeki 26 Markdown dosyası doğrudan KB'ye yüklenebilir
- knowledge_base_enriched_top50/ klasöründeki 53 dosya da yüklenebilir
- Bu dosyalar zaten ürün bilgilerini yapılandırılmış metin formatında içeriyor

### Strateji 3: Hibrit Kullanım
- Tablolar: Yapılandırılmış arama (SKU, fiyat, kategori filtreleme)
- KB Dokümanları: Zengin metin araması (ürün açıklamaları, kullanım talimatları)
- Rich Text: Genel bilgiler, politikalar, sık sorulan sorular
