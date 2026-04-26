# Phase 2B — Sub_type Consolidation Summary (8 grup)

- Snapshot: 2026-04-23
- Toplam grup: 8
- Toplam merge satırı: 32
- Toplam key-delete satırı: 55

| Grup | Ürün | Sub (önce → sonra) | Merge | Key-delete | Top sub_types |
|---|---|---|---|---|---|
| `polisher_machine` | 23 | 8 → 6 | 11 | 0 | da_polisher(6), mini_cordless_polisher(5), polisher_accessory(5) |
| `storage_accessories` | 23 | 11 → 10 | 2 | 0 | wall_stand(4), work_light(3), vacuum_cleaner(3) |
| `paint_protection_quick` | 22 | 8 → 6 | 5 | 2 | spray_sealant(10), rinse_wax_concentrate(4), quick_detailer(4) |
| `contaminant_solvers` | 21 | 11 → 9 | 5 | 3 | wheel_iron_remover(6), water_spot_remover(3), clay_bar(3) |
| `applicators` | 14 | 6 → 4 | 3 | 1 | applicator_pad(6), cleaning_pad(3), tire_applicator(3) |
| `industrial_products` | 12 | 2 → 2 | 0 | 46 | metal_polish(11), engine_cleaner(1) |
| `clay_products` | 8 | 5 → 2 | 3 | 3 | clay_pad(7), clay_bar(1) |
| `tire_care` | 7 | 3 → 2 | 3 | 0 | tire_dressing(6), tire_cleaner(1) |

## Grup-bazında ek notlar

- **contaminant_solvers**: `Q2M-PYA4000M` (single_layer_coating) → `template_group=ceramic_coating`, `template_sub_type=surface_prep`. Plan açıkça bu SKU'nun yanlış grupta olduğunu belirtmiş.
- **applicators**: 3 tek-ürünlü pad/sponge varyantı `cleaning_pad` altında birleşti.
- **clay_products**: clay_disc/cloth/mitt → `clay_pad` (form variant). `clay_bar` korundu (kimyasal+kullanım farkı).
- **paint_protection_quick**: spray_wipe + spray_rinse → `spray_sealant` (uygulama biçimi ortak).
- **polisher_machine**: corded+cordless rotary → `rotary_polisher`; `other` (5 ürün) → `polisher_accessory`.
- **tire_care**: tire_gel → tire_dressing (formülasyon variant; specs.formulation=gel).
- **industrial_products**: metal_polish (11) zaten dominant; engine_cleaner ayrı kalsın.
- **storage_accessories**: bucket_accessories + water_spray_gun → `wash_accessory` (P1).

## Doğrulama (preview sonuçları)

Tüm payload'lar `POST /admin/staging/preview` ile validate edildi (2026-04-23):

| Grup | subtype-merge | key-delete |
|---|---|---|
| `polisher_machine` | OK 11/11 planned | (yok) |
| `storage_accessories` | OK 2/2 planned | (yok) |
| `paint_protection_quick` | OK 5/5 planned | OK 2/2 planned |
| `contaminant_solvers` | OK **4/5** planned, 1 unsupported* | OK 3/3 planned |
| `applicators` | OK 3/3 planned | OK 1/1 planned |
| `industrial_products` | (yok) | OK 46/46 planned |
| `clay_products` | OK 3/3 planned | OK 3/3 planned |
| `tire_care` | OK 3/3 planned | (yok) |

\* `contaminant_solvers/Q2M-PYA4000M`: `template_group` field'ı staging planner tarafından
desteklenmiyor (sadece `price | base_name | template_sub_type`). Bu SKU için **manuel migration**
veya planner'a `template_group` field desteği eklenmesi gerekiyor. `template_sub_type` değişikliği
zaten planlandı (`single_layer_coating → surface_prep`), eksik kalan **grup taşıma** kısmı:

```sql
-- bu satır staging dışı, manuel veya planner extension gerektirir
UPDATE products SET template_group = 'ceramic_coating'
WHERE sku = 'Q2M-PYA4000M';
```

Komut örneği:

```bash
SECRET=$(grep RETRIEVAL_SHARED_SECRET retrieval-service/.env | cut -d= -f2-)
curl -sH "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
  -d @data/consolidation/phase2-<group>-<subtype-merge|key-delete>-payload.json \
  http://localhost:8787/admin/staging/preview
```

**COMMIT YOK** — sadece staging payload'ları üretildi ve preview ile doğrulandı.

## Üretilen Dosyalar

Her grup için 3 dosya × 8 grup + summary:

```
data/consolidation/
  phase2-<group>-subtype-merge.csv         # taxonomy remap
  phase2-<group>-subtype-merge-payload.json
  phase2-<group>-key-delete.csv            # ürünle ilgisiz key sil
  phase2-<group>-key-delete-payload.json
  phase2-<group>-schema-gap.md             # human review (coverage + schema base)
  phase2B-summary.md                       # bu dosya
```

## İlgisiz Key Bulguları (öne çıkanlar)

- **industrial_products** (46 satır): `fit, source, confidence, gap_reason` — AI/derivation
  artifact'ları, 11/12 üründe sızmış. Ayrıca `contains_sio2` (1) ve diğer kimyasal SiO2 key'leri
  ürünle alakasız.
- **clay_products** (3 satır): `consumption_ml_per_car` (1 üründe), kil ürünleri için anlamsız.
- **paint_protection_quick** (2 satır): kil/abrasif key sızıntıları.
- **applicators** (1 satır): `chemical_free` (kimyasal değil ürün).
- **contaminant_solvers** (3 satır): `cure_time_hours` ve diğer kaplama key'leri (single_layer_coating SKU).
