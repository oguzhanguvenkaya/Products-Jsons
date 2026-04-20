-- 005_relation_type_granular.sql
--
-- Expand product_relations.relation_type enum to preserve granular
-- relation semantics from Botpress (use_with / use_before / use_after /
-- accessories / alternatives). The original migration collapsed all of
-- these into 'complement' / 'alternative', which breaks Phase 4 cutover
-- because the bot's getRelatedProducts tool expects per-type filtering.
--
-- Old values: ('primary', 'variant', 'complement', 'alternative')
-- New values: ('primary', 'variant', 'use_with', 'use_before',
--              'use_after', 'accessories', 'alternatives')
--
-- NOTE: seed-relations.ts will be rerun after this migration to
-- repopulate with the new granular types. TRUNCATE here ensures the
-- CHECK constraint flip does not conflict with existing rows.

BEGIN;

TRUNCATE TABLE product_relations;

ALTER TABLE product_relations
  DROP CONSTRAINT IF EXISTS product_relations_relation_type_check;

ALTER TABLE product_relations
  ADD CONSTRAINT product_relations_relation_type_check
  CHECK (relation_type IN (
    'primary',
    'variant',
    'use_with',
    'use_before',
    'use_after',
    'accessories',
    'alternatives'
  ));

COMMIT;
