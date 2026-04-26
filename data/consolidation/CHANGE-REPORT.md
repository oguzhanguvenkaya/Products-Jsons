# Katalog Konsolidasyon — Değişiklik Raporu

**Tarih:** 2026-04-23
**Kapsam:** 21 template_group (hariç: marin_products, ppf_tools, fragrance, product_sets, masking_tapes)
**Veri:** 511 ürün · 3 156 FAQ · 1 301 relation · 589 distinct meta key (önce)
**Durum:** Tüm staging payload'lar üretildi, preview'da 1641/1641 `planned`, **hiçbir şey commit edilmedi**.

---

## 0. Yönetici özeti

| Metrik | Önce | Sonra (tahmini) | Delta |
|---|---:|---:|---:|
| Distinct meta key | 589 | ~538 | −51 (%8.6) |
| Sub_type sayısı (21 grup) | ~140 | ~95 | −45 (%32) |
| Template group sayısı (21 scope) | 21 | 20 (glass merge) | −1 |
| Ürün specs key ortalaması | ~19.7 | ~18 | −1.7 |
| "other"/orphan sub_type | 6 | 0 | −6 |
| Duplicate FAQ (aynı SKU içinde) | 43 | 0 | −43 |
| Yeni relation önerisi (high) | — | +42 | +%3 |
| Yeni specs extract (high) | — | +478 | — |
| **Toplam staging değişikliği** | **—** | **1 641** | — |
| **Etkilenen distinct SKU** | — | **~420 / 511** | %82 |

---

## 1. Faz 1 — Cross-group key normalize (**892 değişiklik**, 296 SKU etkili)

6 duplicate key ailesini **canonical formata** indiriyor. Kaynak analiz: plan §8 + §10.

### 1.1 Ana pipeline (752 değişiklik)

| Family | Changes | Etkilenen SKU | Canonical key |
|---|---:|---:|---|
| VOLUME / CAPACITY | 337 | 165 | `volume_ml`, `weight_g`, `capacity_ml` (sprayer) |
| DURABILITY | 144 | 73 | `durability_months`, `durability_km` |
| SAFE_ON / COMPATIBILITY | 101 | 44 | `compatibility: string[]` |
| DILUTION | 81 | 28 | `dilution_ratio`, `dilution_methods: object` |
| CONSUMPTION | 50 | 30 | `consumption_ml_per_car` |
| PH | 39 | 36 | `ph_level`, `ph_tolerance` |
| **TOPLAM** | **752** | **296** | **13 canonical** |

### 1.2 Review resolved (140 ek değişiklik)

İlk geçişte 53 belirsiz vaka çıktı, ikinci ajan hepsini otomatize etti:

| Vaka tipi | Sayı | Çözüm |
|---|---:|---|
| `size: "40x40 cm"` 2D boyut | 32 | `length_mm: 400`, `width_mm: 400` (cm→mm ×10) |
| `size: "105 mm"` 1D | 3 | `length_mm: 105` |
| `size: "Ergonomik"` label | 4 | `size_label: "<string>"` fallback |
| `durability: "3-4 hafta"` free-text | 11 | `durability_weeks/months/washes` |
| `ph: "Nötr"` | 2 | `ph_level: 7` |
| `capacity_ml=9880 vs capacity_liters=10000` çelişki | 1 | `volume_ml: 9880` (rounding'e göre daha hassas) |

**0 çözülemez vaka kaldı.**

### 1.3 Drop edilen legacy key'ler (top 10)

| Legacy key | Drop sayısı | Gittiği canonical |
|---|---:|---|
| `durability_days` | 63 | `durability_months` (÷30 round) |
| `volume` | 28 | `volume_ml` |
| `weight_kg` | 25 | `weight_g` (×1000) |
| `capacity_liters` | 20 | `capacity_ml` (×1000) |
| `consumption` | 15 | `consumption_ml_per_car` |
| `capacity_ml` | 14 | `capacity_ml` (kalır, ama `volume_ml` olarak refactor edildiyse) |
| `weight` | 13 | `weight_g` (string parse) |
| `safe_for_soft_paint` | 13 | `compatibility[]` (boolean → array entry) |
| `capacity` | 13 | `capacity_ml` / `volume_ml` |
| `bodyshop_safe` | 13 | `compatibility[]` |

### 1.4 Eklenen canonical key'ler

| Canonical | Yazma sayısı |
|---|---:|
| `volume_ml` | 96 |
| `durability_months` | 72 |
| `weight_g` | 67 |
| `compatibility` (array) | 43 |
| `ph_level` | 36 |
| `dilution_methods` (object) | 27 |
| `consumption_ml_per_car` | 20 |

### 1.5 Örnek değişiklik (SKU 06008.056.001)

```
BEFORE:  specs.weight = "1100 gr"
AFTER:   specs.weight_g = 1100
         specs.weight = null (deleted)
```

**Birim varsayımları:**
- kg → ml ×1000 (ρ≈1 sıvılar)
- lt → ml ×1000
- days → months /30
- weeks → months /4

### 1.6 Faz 1 dosyaları

- `data/consolidation/phase1-key-normalize-payload.json` — 752 (2 batch: 500+252)
- `data/consolidation/phase1-review-resolved-payload.json` — 140 (1 batch)
- `data/consolidation/phase1-key-normalize.csv` · `phase1-review-resolved.csv`
- `data/consolidation/phase1-summary.md`

---

## 2. Faz 2 — Sub_type + template_group konsolidasyonu (**186 değişiklik**, 106 SKU etkili)

Plan §2 + §7 bulgularına göre 21 grubun sub_type fragmentasyonunu azaltma.

### 2.1 Sub_type merge — 63 distinct rename → ~45 SKU update

Her satır **bir veya birden fazla SKU** etkiler (aynı sub_type'taki tüm ürünler):

| Grup | Eski sub_type | Yeni sub_type | Priority |
|---|---|---|---|
| **abrasive_polish** | metal_polish, one_step_polish | polish | P0 |
| abrasive_polish | sanding_paste | heavy_cut_compound | P0 |
| **applicators** | cleaning_sponge, scrub_pad, wash_sponge | cleaning_pad | P0 |
| **car_shampoo** | ppf_shampoo, towel_wash | ph_neutral_shampoo | P1 |
| car_shampoo | rinseless_wash | prewash_foaming_shampoo | P1 |
| **ceramic_coating** (en agresif) | paint_coating_kit, multi_step_coating_kit, matte_coating, ppf_coating, single_layer_coating, spray_coating, tire_coating, top_coat, trim_coating, wheel_coating | paint_coating | P0 |
| ceramic_coating | interior_coating, leather_coating | fabric_coating | P1 |
| **clay_products** | clay_cloth, clay_disc, clay_mitt | clay_pad | P0 |
| **contaminant_solvers** | iron_remover | wheel_iron_remover | P1 |
| contaminant_solvers | single_layer_coating | surface_prep | P0 (yanlış yerleşim düzeltmesi) |
| contaminant_solvers | wax_remover | tar_glue_remover | P1 |
| **interior_cleaner** (11 merge) | wood_cleaner, plastic_cleaner, foam_cleaner | interior_apc | P0 |
| interior_cleaner | wood_protector, plastic_restorer, interior_detailer | plastic_dressing | P0 |
| interior_cleaner | interior_disinfectant | surface_disinfectant | P0 |
| interior_cleaner | fabric_cleaner, fabric_leather_cleaner, fabric_protector | fabric_cleaner_concentrate | P0 |
| interior_cleaner | degreaser | heavy_duty_cleaner | P1 |
| **microfiber** (6 merge) | cleaning_cloth, kit | multi_purpose_cloth | P0 |
| microfiber | coating_cloth | buffing_cloth | P0 |
| microfiber | suede_cloth | glass_cloth | P1 |
| microfiber | interior_cleaning_applicator | interior_cloth | P0 |
| microfiber | chamois_drying_towel | drying_towel | P0 |
| **paint_protection_quick** | spray_rinse_sealant, spray_wipe_sealant | spray_sealant | P1 |
| **polisher_machine** | corded_rotary_polisher, cordless_rotary_polisher | rotary_polisher | P0 |
| polisher_machine | forced_rotation_polisher | da_polisher | P1 |
| polisher_machine | other | polisher_accessory | P0 |
| **polishing_pad** | felt_pad | wool_pad | P2 |
| polishing_pad | microfiber_pad | foam_pad | P2 |
| **spare_part** (5 merge) | nozzle_kit | nozzle | P0 |
| spare_part | trigger_gun | trigger_head | P0 |
| spare_part | extension_kit | maintenance_kit | P0 |
| spare_part | handle | repair_part | P1 |
| spare_part | charger | battery | P1 |
| **sprayers_bottles** | dispenser_bottle | pump_sprayer | P0 |
| **storage_accessories** | bucket_accessories, water_spray_gun | wash_accessory | P1 |
| **tire_care** | tire_gel | tire_dressing | P1 |

**Not:** İki grup daha (leather_care 1, brushes 1, glass_cleaner_protectant 1) Faz 2C tarafında raporlandı — her biri 1 SKU etkili.

### 2.2 Template group merge (8 SKU — `template_group` rename)

| SKU | Eski group | Yeni group | Gerekçe |
|---|---|---|---|
| 701606, 74955 | glass_cleaner | glass_care | P0 group merge (2 + 5 = 7 ürün tek `glass_care`) |
| 700466, 71176, 700662 | glass_cleaner_protectant | glass_care | P0 group merge |
| Q2M-GPYA1000M | glass_cleaner_protectant | glass_care | P0 group merge |
| JC0101 | glass_cleaner_protectant | glass_care | P0 group merge |
| Q2M-PYA4000M | contaminant_solvers | ceramic_coating | P0 yanlış grup düzeltmesi (IPA prep ürünü) |

**Altyapı fix (yapıldı):** `retrieval-service/src/routes/admin/staging.ts:62-72` whitelist'e `template_group` eklendi. Microservice restart edildi, preview `8 planned`.

### 2.3 Orphan fix (6 SKU)

`template_sub_type` NULL veya `"other"` olan ürünler:

| SKU | Önce | Sonra |
|---|---|---|
| 26942.099.001 | null (accessory grup) | microfiber_cloth |
| 516112 | other (polisher_machine) | extension_shaft |
| 532579 | other | heat_gun |
| SGGC055 | other | tornador_gun |
| SGGC086, SGGS003 | other | air_blow_gun |

### 2.4 İlgisiz / leaked meta key silme (98 silme)

Başka template_group'un specs'leri bir ürüne sızmış:

| Grup | Silinecek key sayısı | En kritik |
|---|---:|---|
| industrial_products | 46 | `fit`, `source`, `confidence`, `gap_reason` (AI artifact) + `flagship`, `premium` pazarlama kelimeleri |
| microfiber | 24 | 3 üründe sprayer field sızması (capacity_ml, max_pressure_bar vs.) |
| car_shampoo | 6 | ceramic_coating leak (`cure_time_hours`, `sio2_percentage`) |
| ceramic_coating | 4 | abrasive leak (`cut_level`, `filler_free`, `silicone_free`) |
| interior_cleaner | 4 | ceramic leak (`siloxane_content`, `cure_time`) |
| contaminant_solvers | 3 | `ph_tolerance` jenerik leak |
| clay_products | 3 | `consumption_ml_per_car` (clay için anlamsız) |
| paint_protection_quick | 2 | `kil` / abrasive leak |
| applicators | 1 | `chemical_free` |
| spare_part | 1 | `hardness` |

### 2.5 Faz 2 dosyaları

Her grup için 3 dosya: `phase2-<group>-subtype-merge.csv/json` + `phase2-<group>-key-delete.csv/json` + `phase2-<group>-schema-gap.md` (insan review).

Özel dosyalar:
- `phase2-tgmerge-payload.json` · `phase2-tgmerge.csv` (8 template_group)
- `phase2-orphans-payload.json` · `phase2-orphans-fix.csv` (6 orphan)
- `phase2A-summary.md` · `phase2B-summary.md` · `phase2C-summary.md` (grup özetleri)

---

## 3. Faz 3 — Description → specs extraction (**478 değişiklik**, 300 SKU etkili)

Ürün açıklamalarından eksik specs alanlarını regex + heuristic ile çıkarma.

### 3.1 Extract dağılımı (key tipi başına)

| Key | High sayı | Örnek değer |
|---|---:|---|
| `application_method` | 183 | `"machine"` / `"hand"` / `"both"` |
| `skill_level` | 114 | `"diy"` / `"pro"` / `"both"` |
| `rinse_required` | 47 | `true` / `false` |
| `dwell_time_minutes` | 23 | `3`, `5`, `10` |
| `confidence_level` | 23 | `"low"` / `"medium"` / `"high"` |
| `durability_months` | 22 | (description'da "X ay"→ direkt çıkarıldı, Faz 1'de specs'te yoksa) |
| `volume_ml` | 20 | (Faz 1 kapsam dışı kalanlar) |
| `indoor_use` | 11 | `true` |
| `application_temperature_min_c` / `max_c` | 20 | `15`, `30` |
| `cure_time_hours` | 9 | `12`, `24` |
| `outdoor_use` | 5 | `true` |
| `pre_coating_safe` | 1 | `true` |

### 3.2 Örnek extract'ler (confidence=high)

```
SKU 12918 (EPOCA EP01 Asit Sprey) 
  specs.skill_level = "pro"  [ev: "profesyonel/usta"]
  specs.application_method = "both"  [ev: "machine+hand"]

SKU 22984.260.001 (MENZERNA yoğun atölye)
  specs.skill_level = "pro"  [ev: "yoğun atölyeler için vazgeçilmez"]

SKU 701851 (dwell time)
  specs.dwell_time_minutes = 3  [ev: "2-3 dakika bekleyin ve bol su ile..."]

SKU Q2M-CM1000M
  specs.confidence_level = "high"  [ev: "garanti eder"]
  specs.application_method = "both"  [ev: "Hem elle hem polisaj makinesi"]
```

### 3.3 Kritik kural

Specs'te key zaten VARSA → ÇAKIŞMA varsa review'a, UYUMLUysa atla. Override yok.

### 3.4 Faz 3 dosyaları

- `phase3a-payload.json` — 101 (batch 1, SKU 0-169)
- `phase3b-payload.json` — 65 (batch 2, SKU 170-339)
- `phase3c-payload.json` — 312 (batch 3, SKU 340-510)
- `phase3{a,b,c}-review.csv` — 410 toplam medium/low confidence (insan review)

---

## 4. Faz 4 — Relations mining (**42 değişiklik**, 34 source SKU)

Description + FAQ metinlerinden ürün ilişkileri çıkarma. Toplam 502 öneri üretildi, 42'si high confidence.

### 4.1 Tip dağılımı (high)

| Tip | Sayı |
|---|---:|
| use_with | 15 |
| use_before | 14 |
| use_after | 10 |
| alternatives | 2 |
| accessories | 1 |

Mevcut 1301 → 1343 relation (+%3).

### 4.2 En güçlü örnekler

```
76280 --use_with--> 76384
  ev: "FRA-BER Bean Sporty araç kokusu ünitesi ile uyumludur"

SGGF181-57 --use_with--> SGGF181
  ev: "Sadece SGCB SGGF181 kodlu orbital polisaj makinesi ile uyumludur"

SGYC011 --accessories--> SGGC055
  ev: "SGCB Tornador için yedek, plastik kılcal hortum"
```

### 4.3 Eşik + dedup

- Mevcut `(sourceSku, targetSku, relationType)` 3'lüsü varsa SKIP
- Self-relation skip
- Score ≥ 6 (pattern match + brand bonus + baseName substring)
- High = score ≥ 24 veya tam baseName substring
- 460 medium/low `phase4-relations-review.csv`'de (insan review)

### 4.4 Faz 4 dosyaları

- `phase4-relations-payload.json` — 42 INSERT
- `phase4-relations-high.csv` · `phase4-relations-review.csv`
- `phase4-summary.md`

---

## 5. Faz 5 — FAQ near-duplicate merge (**43 değişiklik**, 28 SKU etkili)

Sadece **aynı SKU içindeki** near-duplicate soruları sil. Cross-SKU template pattern'lere (ör. 75× "Bu ürün nedir?") DOKUNULMADI — bunlar kasıtlı şablon.

### 5.1 Algoritma

- Group key: `sku:<x>` (product) | `brand:<x>` | `category:<x>`
- Normalize: `turkishNormalize` + noktalama + soru eki sıyırma (`mı/mi/mu/mü/midir/musun/...`)
- Eşik: token-set Jaccard ≥ 0.85 + content-token Jaccard ≥ 0.80
- Synonym: `uygulanır ↔ kullanılır`, `wax/sealant/topcoat/cila → kaplama`
- Strateji: **en uzun cevaplı satır KEEP, diğerleri DELETE** (cevap korunuyor)

### 5.2 Örnek cluster (Q2-FCNA400M)

```
"Bu ürün nedir?" — id 3066 (96 char) KEEP, id 2455 (95 char) DELETE
"Nasıl uygulanır?" — id 3065 (306 char) KEEP, id 2508 (305 char) DELETE
"Nereye uygulanır?" — id 2487 (98 char) KEEP, id 3064 (85 char) DELETE
"Ne kadar dayanır?" — id 3063 (35 char) KEEP, id 2550 (34 char) DELETE
"Birden fazla kat uygulayabilir miyim?" — id 2529 KEEP, id 3062 DELETE
```

### 5.3 DOKUNULMAYAN cross-SKU pattern'ler (72 grup, 859 satır, %27.2)

`phase5-pattern-faqs.md` raporunda. Silmeyelim — bot search-index'inde kasıtlı template.

### 5.4 Yeni schema önerisi (rapor, uygulanmadı)

§B kullanıcı sinyallerinden:

1. `distribution_channels` JSONB (yüksek öncelik) — "Nereden alabilirim?" 387 soru
2. `price_quote_template` (instruction) — "Ne kadar?" 1221 soru, bot canned response
3. `solves_problem` TEXT[] + GIN index (orta) — "Su lekesi/hare" 108 soru
4. `comparison_pairs` relation + JSONB (ileri) — "X vs Y fark" 114 soru

`phase5-new-fields.md` dosyasında detay.

### 5.5 Faz 5 dosyaları

- `phase5-faq-merge-payload.json` — 43 DELETE
- `phase5-faq-merge.csv` — 129 satır (cluster tabanlı)
- `phase5-pattern-faqs.md` · `phase5-new-fields.md` · `phase5-summary.md`

---

## 6. Risk + rollback

### 6.1 Pre-commit snapshot ✓

`data/consolidation/_pre-commit-snapshot-20260423-044331/` — 23 JSON dosyası, ~3.4 MB:
- products: 3 sayfa (511 ürün, tüm specs)
- faqs: 16 sayfa (3000+ FAQ)
- relations: 4 sayfa (1301 relation)
- coverage, taxonomy

### 6.2 Commit mekaniği güvenliği

- `/admin/staging/commit` tek transaction → all-or-nothing
- Pre-commit hook fail → ROLLBACK, hiçbir change yazılmaz
- Audit log: her change `audit_log` tablosuna yazılır (before/after JSONB), ama **tablo boş/yoksa sessizce skip**
- 500'lük batch limit var — 892'lik Faz 1 için ajan otomatik 500+252 böldü

### 6.3 Commit sonrası geri alma

**Yöntem 1** (audit log çalışıyorsa): `audit_log` tablosundan ters change üret, yeniden commit
**Yöntem 2** (snapshot'tan): `data/consolidation/_pre-commit-snapshot-*` JSON'larından SQL UPDATE script üret (manuel)
**Yöntem 3** (Supabase Dashboard): "Database → Backups" menüsünden PITR restore (varsa)

### 6.4 Bilinen riskler

| Risk | Seviye | Mitigation |
|---|---|---|
| Faz 1 `volume_kg → volume_ml ×1000` varsayımı yanlış olursa | Orta | Review.csv'de 0 çözülemez; +1 güvenlik faktörü: specs'te orijinal `label` alanı kalır |
| Faz 2 `expandSubTypeFamily()` paint_coating patch'i artık gereksiz (ceramic_coating merge sonrası) | Düşük | Commit sonrası searchCore.ts'de patch kaldırılabilir |
| Sub_type merge sonrası `slotExtractor.ts` pattern'leri eski sub_type'ı bekliyor | Orta | Her rename için SUB_TYPE_PATTERNS güncelleme listesi (aşağıda) |
| Bot instruction'da örnek sub_type adı varsa | Düşük | Instruction v10.1 free-text, enum yok — risk düşük |
| Faz 5 FAQ delete sonrası bot cevabı bozulursa | Düşük | En uzun cevap KEEP, DELETE'ler daha kısa/aynı içerik |
| template_group rename → embedding cache invalidation | Düşük | 8 SKU için manuel re-embed (~1 dk) |

### 6.5 slotExtractor pattern'leri güncelleme ihtiyacı

Faz 2 sub_type renames sonrası `retrieval-service/src/lib/slotExtractor.ts` içindeki `SUB_TYPE_PATTERNS` map'inde:

- KALDIR: metal_polish, one_step_polish, sanding_paste, cleaning_sponge, wash_sponge, scrub_pad, ppf_shampoo, towel_wash, rinseless_wash, paint_coating_kit, multi_step_coating_kit, matte_coating, wheel_coating, trim_coating, interior_coating, leather_coating, iron_remover, single_layer_coating, wax_remover, wood_cleaner, plastic_cleaner, foam_cleaner, wood_protector, plastic_restorer, interior_detailer, interior_disinfectant, fabric_cleaner, fabric_leather_cleaner, fabric_protector, degreaser, cleaning_cloth, coating_cloth, suede_cloth, interior_cleaning_applicator, chamois_drying_towel, spray_rinse_sealant, spray_wipe_sealant, corded_rotary_polisher, cordless_rotary_polisher, forced_rotation_polisher, felt_pad, microfiber_pad, nozzle_kit, trigger_gun, extension_kit, handle, charger, dispenser_bottle, bucket_accessories, water_spray_gun, tire_gel
- EKLE (eğer yoksa): fabric_coating, plastic_dressing, surface_disinfectant, fabric_cleaner_concentrate, heavy_duty_cleaner, cleaning_pad, polish, heavy_cut_compound, drying_towel, buffing_cloth, glass_cloth, multi_purpose_cloth, interior_cloth, spray_sealant, rotary_polisher, da_polisher, polisher_accessory, surface_prep, tar_glue_remover, wheel_iron_remover, wash_accessory, tire_dressing, repair_part, maintenance_kit, battery, nozzle, trigger_head, foam_pad, wool_pad, glass_care (template_group, sub değil)

---

## 7. Etki edilen SKU dağılımı

| Faz | Değişiklik | Distinct SKU | SKU/change oranı |
|---|---:|---:|---:|
| Faz 1 | 892 | 296 | 3.0 (her SKU'da ortalama 3 key normalize) |
| Faz 2 | 186 | 106 | 1.8 (rename + key delete) |
| Faz 3 | 478 | 300 | 1.6 (ortalama 1-2 yeni key) |
| Faz 4 | 42 | 34 (source) | 1.2 |
| Faz 5 | 43 | 28 | 1.5 |
| **Birleşik** | **1 641** | **~420** | — |

%82 ürün (420/511) en az bir değişiklik alacak. 91 ürün **hiçbir değişiklik almıyor** — temiz kalmış ürünler.

---

## 8. Commit planı önerisi (sizin kararınız)

### A) Sıralı faz — güvenli, smoke test arası

```
1. Faz 1 (892)  → preview → commit → smoke test (searchByQuery 5-10 kritik sorgu, eval suite)
2. Faz 2 (186)  → preview → commit → smoke test (carousel sub_type doğruluğu)
3. Faz 3 (478)  → preview → commit → smoke test (metaFilter skill_level, application_method)
4. Faz 4 (42)   → preview → commit → smoke test (searchProducts use_with)
5. Faz 5 (43)   → preview → commit → smoke test (searchFaq dedup)
```

Her faz ~1-2 dk commit + ~2-5 dk smoke test = toplam **15-30 dk**.

### B) Tek atış — en hızlı

34 payload'u bir script ile POST /admin/staging/commit sırayla → ~3 dk. Smoke test toplu sonrası. Hata olursa geri alma daha zor.

### C) Faz-faz, insan review'lı

Ben Faz 1'i commit → siz UI'da `/commit` sayfasından preview bakın → onay verirseniz Faz 2'ye geçerim. Yavaş ama her adımda insan kontrolü var.

### D) Sadece Faz 1 + 5 (düşük risk)

Faz 1 (key normalize — tamamen reversible) + Faz 5 (43 FAQ delete — audit trail yeterli). Faz 2-3-4 sonraya.

---

## 9. Dosya listesi

### Staging-ready payload'lar (34 dosya)

```
data/consolidation/
├── phase1-key-normalize-payload.json           (752, batched)
├── phase1-review-resolved-payload.json         (140, batched)
├── phase2-{abrasive_polish,applicators,car_shampoo,ceramic_coating,
│   clay_products,contaminant_solvers,interior_cleaner,microfiber,
│   paint_protection_quick,polisher_machine,polishing_pad,
│   spare_part,sprayers_bottles,storage_accessories,tire_care}-
│   subtype-merge-payload.json                  (15 dosya, toplam 81)
├── phase2-{applicators,car_shampoo,ceramic_coating,clay_products,
│   contaminant_solvers,industrial_products,interior_cleaner,
│   microfiber,paint_protection_quick,spare_part}-key-delete-payload.json
│                                               (10 dosya, toplam 97)
├── phase2-tgmerge-payload.json                 (8 template_group)
├── phase2-orphans-payload.json                 (6 orphan fix)
├── phase3a-payload.json                        (101)
├── phase3b-payload.json                        (65)
├── phase3c-payload.json                        (312)
├── phase4-relations-payload.json               (42)
└── phase5-faq-merge-payload.json               (43)
```

### İnsan review CSV'leri (manual onay sonrası stagable)

```
data/consolidation/
├── phase3a-review.csv                          (270 medium/low)
├── phase3b-review.csv                          (11)
├── phase3c-review.csv                          (129)
├── phase4-relations-review.csv                 (460)
└── phase5-faq-merge.csv                        (129 cluster detay)
```

### Özet + rapor dosyaları

```
data/consolidation/
├── CHANGE-REPORT.md                            (bu dosya)
├── phase1-summary.md
├── phase2{A,B,C}-summary.md
├── phase2-{her-grup}-schema-gap.md             (21 dosya)
├── phase2-tgmerge-glass-need-staging-update.md
├── phase2-orphans.md
├── phase4-summary.md
├── phase5-summary.md
├── phase5-pattern-faqs.md                      (dokunulmayanlar)
└── phase5-new-fields.md                        (yeni schema önerisi)
```

### Snapshot (rollback için)

```
data/consolidation/_pre-commit-snapshot-20260423-044331/
├── products-{0,200,400}.json                   (511 ürün)
├── faqs-{0..3000}.json                         (16 sayfa)
├── relations-{0..600}.json                     (4 sayfa)
├── coverage.json
└── taxonomy.json
```

### Altyapı değişikliği

- `retrieval-service/src/routes/admin/coverage.ts` — limit max 80 → 2000 (589 key için)
- `retrieval-service/src/routes/admin/staging.ts` — whitelist `template_group` eklendi

---

## 10. Commit öncesi kontrol listesi

- [ ] Raporu kullanıcı inceledi ve onayladı
- [x] Pre-commit snapshot alındı
- [x] Tüm 34 payload `/staging/preview` 100% planned
- [x] `template_group` whitelist eklendi, microservice restart edildi
- [ ] Commit stratejisi seçildi (A/B/C/D)
- [ ] (commit sonrası) slotExtractor pattern'leri güncellendi
- [ ] (commit sonrası) Eval suite koşturuldu
- [ ] (commit sonrası) searchByQuery smoke test: "25 kg şampuan", "ph nötr şampuan", "seramik kaplama kiti", "mikrofiber bez" vb.
- [ ] (commit sonrası) Bot RELEVANCE CHECK rate %30 altında teyit

---

**Rapor sonu.** Commit stratejisi ve ek sorularınız için hazırım.
