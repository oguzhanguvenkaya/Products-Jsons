-- Row Level Security: tum tablolari kilitle
-- Microservice service_role key ile erisecek (RLS bypass eder)
-- anon/authenticated kullanicilar hicbir sey yapamaz (policy yok = deny)

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_search ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_meta ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE products IS 'Retrieval microservice table — access via service_role only. No anon/authenticated policy.';
COMMENT ON TABLE product_embeddings IS 'Gemini text-embedding-004 (768d) vectors for 622 products. HNSW cosine index.';
COMMENT ON TABLE product_search IS 'Turkish FTS tsvector for BM25 ranking.';
COMMENT ON TABLE product_faqs IS '2119 FAQs, scope = product|brand|category. Dual signal (BM25 + cosine).';
COMMENT ON TABLE synonyms IS 'Domain-specific synonym dictionary for query expansion.';
COMMENT ON TABLE product_relations IS 'Primary/variant/complement/alternative product relations.';
COMMENT ON TABLE product_meta IS 'EAV meta store — migrated from Botpress productMetaTable.';
