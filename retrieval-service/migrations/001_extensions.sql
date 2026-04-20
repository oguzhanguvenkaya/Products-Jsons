-- Retrieval microservice için gerekli Postgres extensions
-- pgvector: embedding depolama ve HNSW index (Gemini text-embedding-004 = 768 dim)
-- unaccent: Türkçe arama için aksan giderme (İ→I, ç→c etc.)
-- pg_trgm: fuzzy matching (SKU lookup ve typo tolerance için)
-- btree_gin: composite index desteği (filter + tsvector kombinasyonu için)

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
