# Eval v1 — Run Guide

## Dosyalar

- `PLAN.md` — taxonomy + 6 eksen + execution stratejisi
- `all-questions.jsonl` — 270 soru (konsolide)
- `questions-A-clarifying.jsonl` (40) — generic kategori → Choice yield
- `questions-B-multiturn.jsonl` (50) — Choice → cevap → filter
- `questions-C-detail.jsonl` (30) — getProductDetails
- `questions-D-filter.jsonl` (30) — metaFilter (ph/silikonsuz/durability/compat)
- `questions-EFGH-rank-budget-compare-related.jsonl` (70) — rankBySpec/searchByPriceRange/compare/related
- `questions-IJK-faq-edge-adversarial.jsonl` (50) — searchFaq/edge/adversarial

## Test execution — 2 seviye

### Seviye 1 — Retrieval-service direct (bot bypass)

**Kapsam:** D, E, F, G, H, I (FAQ) — yaklaşık 165 soru
**Yöntem:** Bot LLM bypass, retrieval-service tool'unu direkt çağır
**Avantaj:** Hızlı (~5 dk), deterministik, bot LLM stochasticity yok
**Test eden:** Filter doğruluğu, sonuç doğruluğu, embedding kalitesi, SQL problemleri

**Çalıştırma:**
```bash
cd retrieval-service
bun run /Users/projectx/Desktop/Claude\ Code\ Projects/Products\ Jsons/docs/eval-v1/eval-retrieval.ts
```

Çıktı: `eval-v1/results-retrieval.jsonl`

### Seviye 2 — Bot LLM tam testi (adk dev + MCP)

**Kapsam:** A, B, C, J, K — yaklaşık 105 soru (LLM tutarlılığı + Choice davranışı + adversarial)
**Yöntem:** ADK dev server + MCP `adk_send_message`
**Avantaj:** Gerçek bot davranışı, Choice/Carousel/text karışık değerlendirme
**Test eden:** CLARIFYING davranışı, halüsinasyon, prompt instruction etkisi

**Çalıştırma:**
```bash
# Tab 1
cd retrieval-service && bun run dev

# Tab 2
cd Botpress/detailagent-ms && adk dev

# Tab 3 (eval)
bun run /Users/projectx/Desktop/Claude\ Code\ Projects/Products\ Jsons/docs/eval-v1/eval-bot.ts
```

Çıktı: `eval-v1/results-bot.jsonl`

## Sonuç analizi

Her senaryoya 6-eksen llm_judge skoru:
1. Doğruluk — DB ile karşılaştır
2. Tool seçimi
3. Filter doğru mu
4. Açıklama kalitesi (snippet bug?)
5. CLARIFYING davranışı
6. Halüsinasyon

`results-analysis.md` dosyasına kategorize edilmiş bulgular yazılır:
- Pass rate per kategori
- Fail örnekleri + kök neden (data/architecture/prompt/code/system)
- İyileştirme önerileri
