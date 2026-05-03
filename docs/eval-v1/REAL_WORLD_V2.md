# Eval v2 — Real-World Test Suite

**Tarih:** 2026-05-02
**Baseline:** v1.1.10b-baseline + Phase 1.1.13G + 1.1.13H (commit 27f7011)
**Toplam:** 291 senaryo (HB 191 + Instagram 100)

---

## Kaynaklar

| Kaynak | Ham havuz | Seçilen | Yöntem |
|---|---|---|---|
| `hb_QA_unique.json` | 1269 Q&A çift | 191 | Subagent (niyet × SKU çeşitliliği × kalite) |
| `data/instagram/conversations.jsonl` | 3394 conversation | 100 multi-turn | Subagent (brand × niyet × turn dağılımı) |

---

## Ham havuz metrikleri

### HB QA (1269 record)
- 411 unique Hepsiburada SKU, 412 distinct satıcı stok kodu
- DB direct match: 267 satıcı stok kodu → DB SKU (variant_skus dahil 279)
- DB üzerinden record-level eşleşme: 1176/1269 (%93)
- Cevapta URL içeren: 63 record (cross-sell/use_with bilgisi)
- 63 unique unmatched satıcı stok kodu içinden **26 fuzzy ad eşleşmesi** (ham havuz)

### Instagram conversations (3394 record)
- Brand: gyeon (1416), menzerna (1422), mgpolish (556)
- Turn dağılımı: 2-41 (medyan ~5)
- Tüm `is_request: false` (satın alma talebi değil, bilgi isteği)

---

## Seçilen eval set metrikleri

### HB QA — `questions-real-hb.jsonl` (191 satır)

| Metrik | Değer |
|---|---|
| Toplam soru | 191 |
| Unique sku_hb | 132 |
| Cevapta URL | 34 |
| **sku_db dolu (alias sonrası)** | **183/191 (%95.8)** |
| Adversarial (DB'de gerçekten YOK) | 8 |
| Alias eklenen (eski/yeni naming) | 7 satır / 6 unique HB SKU |

**Niyet dağılımı:**
- product_spec: 53
- surface_compat: 35
- product_recommendation: 26 (alias sonrası — önceden 19)
- comparison: 20
- application: 15
- adversarial_not_in_db: 8 (önceden 15)
- storage_safety: 11
- effect_outcome: 5
- off_topic: 5
- kit_contents: 4
- compatibility_with_other_product: 2

**SKU alias mapping (7 satır, 6 unique HB SKU):**

| HB Stok | DB SKU | Confidence | Not |
|---|---|---|---|
| Q2-CC50M | Q2-CCE200M | high | CanCoat → CanCoat EVO |
| Q2M-CD1000M | Q2M-CDYA1000M | high | CeramicDetailer eski → yeni |
| Q2M-CM | Q2M-CME | high | Clay Mild → Clay Mild EVO |
| Q2M-FC1000M | Q2M-FCNA1000M | high | FabricCleaner eski → yeni |
| Q2M-IW4000M | Q2M-IWCR4000M | high | IronWheel → IronWheel REDEFINED |
| Q2M-PPFM400M | Q2M-PPFMR500M | high | PPF Maintain 400 → 500 REDEFINED |
| Q2M-RW400M | Q2M-RW1000M | high | RestartWash 400ml → 1000ml |

(Ham havuzda bulunan 19 alias var — sadece 6'sı seçili 191 sette etkili)

### Instagram — `questions-real-instagram.jsonl` (100 senaryo)

| Metrik | Değer |
|---|---|
| Toplam senaryo | 100 |
| Brand (gyeon / menzerna / mgpolish) | 41 / 40 / 19 |
| Ortalama turn | 6.42 |
| Turn cap | 8 (uygulandı) |
| Quality (high / medium) | 95 / 5 |
| Attachment (media_unavailable=true) | 1 |
| Rubric stub eklenen field | 5 (boş, manuel/subagent dolacak) |

**Niyet dağılımı:**
- product_inquiry: 25
- specific_product_question: 20
- application_help: 15
- product_recommendation: 15
- comparison: 10
- availability_price: 10
- clarification_seeking: 5

---

## Schema

### HB QA record (`questions-real-hb.jsonl`)

```json
{
  "id": "HB001",
  "intent": "product_spec",
  "sku_hb": "HBCV...",
  "sku_db": "Q2M-...",
  "sku_db_alias": {              // sadece alias edilenlerde
    "from_stock_code": "Q2M-RW400M",
    "from_hb_sku": "HBCV...",
    "method": "name_match",
    "confidence": "high",
    "note": "RestartWash 400ml → 1000ml DB varyantı"
  },
  "urun_adi": "...",
  "soru": "...",
  "beklenen_cevap": "...",
  "cevapta_url": ["https://..."],
  "tags": ["car_shampoo", "gyeon"]
}
```

### Instagram senaryo (`questions-real-instagram.jsonl`)

```json
{
  "id": "IG001",
  "intent": "product_inquiry",
  "brand": "gyeon",
  "turns": [
    { "role": "customer", "text": "..." },
    { "role": "shop", "text": "..." }
  ],
  "shop_response_quality": "high",
  "tags": ["specific_product"],
  "media_unavailable": true,           // sadece attachment varsa
  "expected_behavior": "",             // STUB — manuel/subagent dolur
  "must_mention": [],                  // STUB
  "must_not_claim": [],                // STUB
  "expected_tool_policy": "",          // STUB
  "pass_criteria": ""                  // STUB
}
```

---

## Eval Execution Stratejisi (2 yol)

### Yol 1 — Retrieval-direct (HB için)
- Bot LLM bypass, retrieval-service tool'unu direkt çağır
- SKU/intent/filter doğruluğu test edilir
- Pattern: `eval-db-direct.ts` (Eval v1'deki paterni)
- Hızlı (~5-10 dk), deterministik

### Yol 2 — Manual webchat (Instagram için)
- ADK dev tunnel veya Botpress Cloud studio
- Multi-turn senaryo manuel oynanır
- Clarifying davranışı, hallucination, tone değerlendirilir
- Rubric field'ları (must_mention, expected_behavior) skor reference

---

## Sıradaki adımlar (kullanıcı kararı)

1. **IG rubric otomatik üretimi** — subagent ile 100 senaryoya `must_mention`/`expected_behavior` doldurma (büyük iş, ayrı faz)
2. **Eval execution (Yol 1)** — HB 191 senaryo için retrieval-direct test, pass rate ölçümü
3. **Eval execution (Yol 2)** — IG 100 senaryo manuel webchat sample (öncelik 30 örnek)
4. **Sonuç analizi** — bug/iyileştirme noktaları kategorize (data/architecture/prompt/code)

---

## Out of Scope

- Yeni veri/code değişikliği
- Bug fix (BUG-2 sub_type display, BUG-3 text trunc)
- Phase 1.1.13I dışı yeni cleanup faz
