# Phase 2R-B — Sub-Type Merge Summary (7 grup)

**Tarih:** 2026-04-23
**Kapsam:** paint_protection_quick, polisher_machine, polishing_pad, spare_part, sprayers_bottles, storage_accessories, tire_care
**Toplam merge önerisi:** 29
**Rubrik:** 5 kriter (Primary kategori, Hedef yüzey, Kullanım senaryosu, Formülasyon, Filter mantığı)

## Özet Tablo

| Grup | Toplam | APPROVE | REJECT | ASK |
|------|--------|---------|--------|-----|
| paint_protection_quick | 5 | **5** | 0 | 0 |
| polisher_machine | 11 | **1** | 4 | 6 |
| polishing_pad | 2 | **0** | 2 | 0 |
| spare_part | 5 | **2** | 3 | 0 |
| sprayers_bottles | 1 | **0** | 1 | 0 |
| storage_accessories | 2 | **1** | 0 | 1 |
| tire_care | 3 | **0** | 0 | 3 |
| **TOPLAM** | **29** | **9** | **10** | **10** |

## APPROVE Dağılımı (9)

1. **paint_protection_quick** — 5 ürün spray ailesi altında birleştirildi (spray_wipe, spray_rinse → spray_sealant). Uygulama biçimi tek kriter; wipe/rinse sub-variant specs'e taşınır.
2. **polisher_machine / 516112** — FLEX FS140 Esnek Uzatma Aparatı `polisher_accessory` olarak sınıflandı (polisaj makinesine doğrudan aksesuar).
3. **spare_part / 81771871** — `nozzle_kit` → `nozzle` (semantik eşanlamlı, 2 ürün sete çıkar).
4. **spare_part / 83371816** — `trigger_gun` → `trigger_head` (IK PPF 12 tetikli sprey kafası).
5. **storage_accessories / 79472** — INNOVACAR Araç Yıkama Kovası Seti `wash_accessory` çatısına alındı.

## REJECT Dağılımı (10) — Ana Gerekçeler

- **Kategori yanlışlığı (4):** Hava tabancaları / sıcak hava tabancası / tornador temizlik tabancası `polisher_accessory` olarak işaretlenmişti ama polisaj makinesi aksesuarı değiller.
- **Hedef yüzey farkı (1):** SGGA081 cam keçesi → wool_pad merge reddedildi (cam vs boya).
- **Malzeme/formülasyon farkı (1):** NPMW6555 microfiber_pad → foam_pad reddedildi.
- **Primary kategori hatası (2):** 458813 polisaj uzatması → maintenance_kit (IK pompa bakım); 417882 şarj cihazı → battery.
- **Mekanik farkı (1):** Q2M-P-DB300M biberon dispenser → pump_sprayer (pompa yok).
- **Jenerikleşme / bilgi kaybı (1):** 82671872 handle → repair_part (spesifik bileşen jenerik şemsiyeye).

## ASK Dağılımı (10)

- **Q1–Q2 (4 ürün):** corded/cordless rotary → rotary_polisher — **power_source facet** filter layer'da destekli mi belirsiz.
- **Q3 (2 ürün):** forced_rotation (gear-driven) → da_polisher — drive_type farkı önemli, tercihim reject.
- **Q4 (1 ürün):** SGGD402 bahçe sulama tabancası — kategori kapsamı belirsiz.
- **Q5 (3 ürün):** tire_gel → tire_dressing — **75138/75140 variant tutarsızlığı** kritik veri hatası; minimum 75138 düzeltilmeli.

## Kritik Bulgular (Top 5)

1. **Variant tutarsızlığı (tire_care):** Aynı ürün "FRA-BER Gommanera Superlux" 5lt ve 25lt sürümleri farklı sub_type'ta (tire_gel vs tire_dressing). **Bu bir veri hatasıdır** — ambalaj farkı sub_type değişikliği yaratmamalı. 75138'in en azından tire_dressing'e çekilmesi önerildi.

2. **"other" etiketi polisher_machine'da rastgele kullanılmış:** 5 adet "other" sub_type'ın 4'ü aslında hava tabancası / tornador gibi polisaj-dışı araçlardı. Yeni sub_type'lar gerekli: `air_blow_gun`, `heat_gun`, `tornador_gun`.

3. **Cam polish pad'i wool_pad'e merge edilmiş (SGGA081):** Hedef yüzey tamamen farklı. RAG'de ciddi relevance hatası doğurabilir — cam bakım soruları için boya polisaj padı dönebilirdi. REJECT doğru karar.

4. **Charger → battery semantik hatası:** FLEX şarj cihazı (417882) FLEX yedek akü (445894) ile merge edilmeye çalışılmıştı. İleride 2+ ürünle `power_accessory` çatısı mantıklı olur ama 1:1 merge kategorik hata.

5. **Power_source facet bağımlılığı:** Rotary corded/cordless merge kararı, retrieval-service filter layer'da `power_source` tag'inin desteklenmesine bağlı. Bu teyit edilmeden merge yapılırsa "kablosuz polisaj" araması bozulur. Mimari-önce karar gerekli (Q1-Q2).

## Çıktı Dosyaları

1. `phase2R-B-approved.csv` — 9 merge
2. `phase2R-B-approved-payload.json` — staging API formatı
3. `phase2R-B-rejected.md` — 10 merge + gerekçe
4. `phase2R-B-questions.md` — 10 ASK sorusu (Q1-Q5)
5. `phase2R-B-summary.md` — bu dosya

## Doğrulama Komutu

```bash
SECRET=$(grep RETRIEVAL_SHARED_SECRET retrieval-service/.env | cut -d= -f2-)
curl -sH "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
  -d @data/consolidation/phase2R-B-approved-payload.json \
  http://localhost:8787/admin/staging/preview | jq '{total, planned, unsupported, skipped}'
```

Beklenen: `total=9, planned=9, unsupported=0, skipped=0`
