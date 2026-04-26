# Phase 2R FINAL — Ek SQL Komutları (staging dışı)

Staging/commit altyapısı bazı işlemleri desteklemez. Aşağıdaki komutlar **manuel** olarak (Supabase SQL Editor veya psql ile) çalıştırılmalıdır.

## 1. JC0101 (screen_cleaner) DELETE

User Tur 4 Q2 cevabı: "DB'den tamamen kaldır".

Cascade sırası önemli (foreign key constraints):

```sql
BEGIN;

-- 1. İlgili FAQ'ları sil
DELETE FROM product_faqs WHERE sku = 'JC0101';

-- 2. Relation'larda hem source hem target olarak geçenleri sil
DELETE FROM product_relations WHERE sku = 'JC0101' OR related_sku = 'JC0101';

-- 3. Meta kayıtlarını sil
DELETE FROM product_meta WHERE sku = 'JC0101';

-- 4. Varsa product_audit_log'a DELETE not düş (manuel)
-- INSERT INTO audit_log (sku, scope, field, before_value, after_value, actor)
-- VALUES ('JC0101', 'product', '*', <mevcut_row_json>, NULL, 'admin');

-- 5. Ürünü sil
DELETE FROM products WHERE sku = 'JC0101';

-- Doğrulama (hepsi 0 olmalı)
SELECT COUNT(*) FROM products WHERE sku = 'JC0101';
SELECT COUNT(*) FROM product_faqs WHERE sku = 'JC0101';
SELECT COUNT(*) FROM product_relations WHERE sku = 'JC0101' OR related_sku = 'JC0101';
SELECT COUNT(*) FROM product_meta WHERE sku = 'JC0101';

COMMIT;
```

**Rollback:** Pre-commit snapshot `data/consolidation/_pre-commit-snapshot-20260423-044331/` içinde JC0101 verisi mevcut. İhtiyaç halinde oradan JSON → SQL INSERT üretilebilir.

## 2. Opsiyonel: Embedding cache invalidation

Template_group veya template_sub_type değişen ürünlerin embedding'lerini yeniden hesaplamak gerekebilir (çünkü embed formatter specs.template_sub_type'ı kullanır):

```bash
# Retrieval-service script (mevcut, scripts/ dizininde)
SECRET=$(grep RETRIEVAL_SHARED_SECRET retrieval-service/.env | cut -d= -f2-)

# Etkilenen SKU listesi (Phase 2R FINAL payload'dan):
grep -oE '"sku":"[^"]+"' data/consolidation/phase2R-FINAL-payload.json \
  | sed 's/"sku":"//;s/"//' | sort -u > /tmp/affected_skus.txt
wc -l /tmp/affected_skus.txt

# Re-embed (eğer embed script varsa):
# cd retrieval-service && bun run scripts/reembed.ts --sku-file=/tmp/affected_skus.txt
```

**Not:** Bu adım smoke test öncesi gerekir; aksi halde vector search eski embedding'lerle çalışır.

## 3. Opsiyonel: slotExtractor SUB_TYPE_PATTERNS güncelleme

Sub_type isim değişikliği sonrası `retrieval-service/src/lib/slotExtractor.ts` içindeki `SUB_TYPE_PATTERNS` map'ini güncellemek gerek. Yeni sub_type'lar:

- KALDIR: corded_rotary_polisher, cordless_rotary_polisher, forced_rotation_polisher, mini_cordless_polisher, da_polisher, kit, interior_cloth, glass_cloth (bu sub'ların ürünleri taşındı), fabric_cleaner_concentrate, fabric_cleaner, leather_conditioner, leather_protectant, wood_cleaner, wood_protector, single_layer_coating (Q2M-PYA4000M için), oil_degreaser (79292 için), tire_gel, glass_cleaner_additive (grup değişti), glass_hydrophobic_sealant, wheel_brush (SGGD294 için), mini_cordless_polisher
- EKLE: rotary, orbital, dual_action_polisher, cleaning_cloth (genişletildi), fabric_leather_cleaner (genişletildi), leather_treatment, surface_prep, tire_dressing (genişletildi), heat_gun, tornador_gun, air_blow_gun, extension_shaft, blower, tool_kit, interior_detailer (marin için)

Bu güncelleme **ayrı bir commit** olarak kod değişikliği gerektirir.
