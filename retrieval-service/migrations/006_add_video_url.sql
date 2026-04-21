-- 006_add_video_url.sql
-- Phase 4 Step 4.11: products tablosuna video_url kolonu ekle
--
-- Botpress v9.2'de productsMasterTable.video_url kolonu getApplicationGuide
-- tool'unda YouTube Carousel item'a (videoCard) dönüşüyordu. Microservice
-- cutover'da bu kolon migration 002'de atlanmıştı ve seed-products.ts
-- INSERT listesinde yoktu — 511 ürünün video_url'i Supabase'de seed edilmemişti.
--
-- Bu migration sadece kolonu ekler. Veri populate işlemi bir sonraki
-- `bun run scripts/seed-products.ts` koşusunda idempotent UPSERT ile olur
-- (video_url ON CONFLICT DO UPDATE SET listesine de eklenecek).

ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN products.video_url IS
  'Üretici resmi YouTube uygulama videosu URL''si. getApplicationGuide '
  'tool''u bu alandan videoCard (Carousel item) üretir.';
