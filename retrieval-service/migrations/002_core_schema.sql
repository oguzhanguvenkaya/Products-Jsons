-- Ana retrieval schema
-- products: 622 urun (full_description artik 4KB limiti yok)
-- product_embeddings: Gemini text-embedding-004 (768 dim) + HNSW
-- product_search: Turkish FTS (ts_vector generated)
-- product_faqs: 2119 FAQ + embedding + tsvector
-- synonyms: domain-specific es anlamli dictionary
-- product_relations: variant/complement/alternative iliskiler
-- product_meta: EAV meta veri (mevcut productMetaTable'dan)

-- ============================================================
-- 1. products (ana urun tablosu)
-- ============================================================
CREATE TABLE products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  main_cat TEXT,
  sub_cat TEXT,
  sub_cat2 TEXT,
  template_group TEXT,
  template_sub_type TEXT,
  target_surface TEXT[],
  price NUMERIC,
  rating NUMERIC,
  stock_status TEXT DEFAULT 'in_stock',
  url TEXT,
  image_url TEXT,
  short_description TEXT,
  full_description TEXT,
  specs JSONB,
  sizes JSONB,
  variant_skus TEXT[],
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_template_group ON products (template_group);
CREATE INDEX idx_products_brand ON products (brand);
CREATE INDEX idx_products_price ON products (price);
CREATE INDEX idx_products_rating ON products (rating DESC NULLS LAST);
CREATE INDEX idx_products_target_surface ON products USING gin (target_surface);
CREATE INDEX idx_products_specs ON products USING gin (specs);
CREATE INDEX idx_products_featured ON products (is_featured) WHERE is_featured = true;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_touch_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 2. product_embeddings (Gemini text-embedding-004 = 768 dim)
-- ============================================================
CREATE TABLE product_embeddings (
  sku TEXT PRIMARY KEY REFERENCES products(sku) ON DELETE CASCADE,
  embedding VECTOR(768),
  embedding_version TEXT NOT NULL DEFAULT 'gemini-text-embedding-004-v1',
  source_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_embeddings_hnsw
  ON product_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE TRIGGER product_embeddings_touch_updated_at
  BEFORE UPDATE ON product_embeddings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 3. product_search (Turkish BM25)
-- ============================================================
CREATE TABLE product_search (
  sku TEXT PRIMARY KEY REFERENCES products(sku) ON DELETE CASCADE,
  search_text TEXT NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', coalesce(search_text, '')), 'A')
  ) STORED,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_search_tsv ON product_search USING gin (search_vector);
CREATE INDEX idx_product_search_trgm ON product_search USING gin (search_text gin_trgm_ops);

CREATE TRIGGER product_search_touch_updated_at
  BEFORE UPDATE ON product_search
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 4. product_faqs (scope: product | brand | category)
-- ============================================================
CREATE TABLE product_faqs (
  id SERIAL PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('product', 'brand', 'category')),
  sku TEXT REFERENCES products(sku) ON DELETE CASCADE,
  brand TEXT,
  category TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  embedding VECTOR(768),
  embedding_version TEXT DEFAULT 'gemini-text-embedding-004-v1',
  question_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('turkish', coalesce(question, ''))
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_faqs_sku ON product_faqs (sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_faqs_brand ON product_faqs (brand) WHERE brand IS NOT NULL;
CREATE INDEX idx_faqs_category ON product_faqs (category) WHERE category IS NOT NULL;
CREATE INDEX idx_faqs_scope ON product_faqs (scope);
CREATE INDEX idx_faqs_hnsw ON product_faqs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_faqs_qvec ON product_faqs USING gin (question_vector);

-- ============================================================
-- 5. synonyms (domain-specific es anlamli)
-- ============================================================
CREATE TABLE synonyms (
  term TEXT PRIMARY KEY,
  aliases TEXT[] NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_synonyms_aliases ON synonyms USING gin (aliases);

-- ============================================================
-- 6. product_relations (variant/complement/alternative)
-- ============================================================
CREATE TABLE product_relations (
  sku TEXT REFERENCES products(sku) ON DELETE CASCADE,
  related_sku TEXT REFERENCES products(sku) ON DELETE CASCADE,
  relation_type TEXT CHECK (relation_type IN ('primary', 'variant', 'complement', 'alternative')),
  confidence NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (sku, related_sku, relation_type)
);

CREATE INDEX idx_relations_related_sku ON product_relations (related_sku);
CREATE INDEX idx_relations_type ON product_relations (relation_type);

-- ============================================================
-- 7. product_meta (EAV)
-- ============================================================
CREATE TABLE product_meta (
  sku TEXT REFERENCES products(sku) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_text TEXT,
  value_numeric NUMERIC,
  value_boolean BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (sku, key)
);

CREATE INDEX idx_meta_key_text ON product_meta (key, value_text) WHERE value_text IS NOT NULL;
CREATE INDEX idx_meta_key_numeric ON product_meta (key, value_numeric) WHERE value_numeric IS NOT NULL;
CREATE INDEX idx_meta_key_boolean ON product_meta (key, value_boolean) WHERE value_boolean IS NOT NULL;
