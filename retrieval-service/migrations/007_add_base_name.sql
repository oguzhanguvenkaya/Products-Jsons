-- 007_add_base_name.sql
-- Phase 4 Round 2 Fix G: products.base_name kolonu
--
-- Bot carousel title'larında "MENZERNA 3800 Süper Hare Giderici Cila - 1 lt — 250 ml"
-- gibi çift boyut ekleniyor çünkü seed name'i CSV'nin product_name alanından alıyor
-- (en büyük variant için boyut dahil isim). CSV'de ayrıca base_name (boyut-stripped)
-- kolonu var ama DB'ye seed edilmiyordu.
--
-- Migration idempotent. Sonraki seed koşusunda base_name populate olur,
-- formatters.baseNameFromRow() boyut-stripped versiyonu tercih eder.

ALTER TABLE products ADD COLUMN IF NOT EXISTS base_name TEXT;

COMMENT ON COLUMN products.base_name IS
  'Boyut-stripped ürün ismi (CSV base_name). toCarouselItemsWithVariants '
  'formatters.ts içinde baseName kaynağı — "name" alanı variant suffix''i '
  'içerebilir ve title duplication''a yol açar.';
