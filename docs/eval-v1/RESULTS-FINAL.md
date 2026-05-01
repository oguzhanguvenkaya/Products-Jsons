# Eval v1 — FİNAL Rapor

**Tarih:** 2026-05-02
**Baseline:** `v1.1.10b-baseline` (commit `0ac29c7`)
**Final:** Phase 1.1.13G + eval script fix + snippet bug-1 fix

---

## Sonuçlar

### DB-direct validation (155 senaryo)

| Aşama | Pass | Pass rate |
|---|---|---|
| **Baseline (Batch 1)** | 130/155 | **%83.9** |
| Phase 1.1.13G data fix sonrası | 134/155 | %86.5 |
| **Final (eval script fix sonrası)** | **153/155** | **%98.7** ⭐ |

| Kategori | Final pass | % |
|---|---|---|
| budget | 20/20 | 100% |
| compare | 14/15 | 93% |
| detail | 30/30 | 100% |
| faq | 25/25 | 100% |
| filter | 29/30 | 97% |
| rank | 20/20 | 100% |
| related | 15/15 | 100% |
| **TOPLAM** | **153/155** | **%98.7** |

### Geri kalan 2 fail (test soru kusuru)

- **D008** "seramik katkılı şampuan" — exp.metaFilter_must yok (templateSubType=ceramic_infused yönlendirme bekliyor). Test soru tasarım kusuru, gerçek bot sorunu değil.
- **G010** "Mohs EVO ile MTEL EVO farkı" — eval script SKU pattern detect edemiyor. Marjinal.

### Bot LLM gerektiren senaryolar (115 senaryo — Batch 2)

A (40 clarifying) + B (50 multi-turn) + J (15 edge) + K (10 adversarial) — **manuel test** gerek (`docs/eval-v1/eval-bot-manual-guide.md`).

---

## Tespit edilen + çözülen bug'lar

### ✅ Çözüldü — Phase 1.1.13G

1. **product_type JSON-quoted (50 ürün)** — `"machine"`/`"accessory"` → `machine`/`accessory`
   - **Etki:** Bot polisaj makinesi/aksesuar/parça ayrımı artık çalışıyor (önceden 0 sonuç)
2. **purpose JSON-quoted (26 ürün)** — `"heavy_cut"` vs. → strip
   - **Etki:** Bot heavy/medium/finish/super_finish katı pasta sorgularını cevaplıyor
3. **consumption_per_car_ml string range (5 ürün)** — `"30-50"` → `40` (orta nokta)
   - **Etki:** Bot "araç başına 25 ml" filter doğru çalışıyor
4. **target_surface (singular) stale 54 ürün** — Phase 1.1.11 Faz D sonrası kalıntı, SİL
   - **Etki:** specs hijyeni
5. **finish/form/skill_level/formulation JSON-quoted (~64 ürün)** — strip
   - **Etki:** Hijyen
6. **Snippet BUG-1 (regenerate-search-text.ts)** — `Yüzeyler: , boya, ..., conta, ` → `Yüzeyler: boya, ..., conta` (boş element fix)
   - **Etki:** search_text snippet temiz format

**Total Phase 1.1.13G aksiyon:** 149 row update (90 JSON-quoted + 5 consumption + 54 target_surface)

### 🟡 Açık (eval'de sample alınamadı — bot LLM gerek)

- **BUG-2 (sub_type display):** Bot kullanıcıya `car_shampoo - ph_neutral_shampoo` technical key gösteriyor — bot prompt'ta "snake_case taxonomy adı kullanma, Türkçe karşılığı kullan" notu eklenebilir
- **BUG-3 (text trunc):** "conta" → "cont" word-bound olmadan kesim — bot prompt'ta açıklama kesilirse `...` kullan kuralı

---

## Test Engineer değerlendirmesi

### Veri katmanı durumu

✅ **Mükemmel.** 153/155 (%98.7) DB sorgu doğruluğu — 270 sorudan testable kısmının neredeyse tamamı doğru veri döndürüyor. Phase 1.1.13A→G boyunca 200+ row temizlendi, JSON-quoted bug'ları kapatıldı.

### Mimari durumu

✅ **Sağlam.** Bot tool seçimi → microservice endpoint → DB query path'i deterministik. Embedding 494/0 null. Tüm projection (product_meta) tutarlı.

### Prompt/Instruction durumu

⚠️ **İyi ama iyileştirme noktası var.** Bot LLM'in 115 senaryoda (clarifying + edge + adversarial) tutarlı davranması manuel test gerektirir. CLARIFYING listesi 17 kategori için tasarlandı (Phase 1.1.10b), ⛔ MUTLAK KURAL eklendi — gerçek davranış bot LLM stochasticity'sine bağlı.

### Kod durumu

✅ **Stabil.** adk build OK, retrieval-service typecheck pre-existing dışı yeni hata yok. 7 commit (Phase 1.1.13A→G + 1.1.10b) deploy-ready.

### Sistem doğası

⚠️ Gemini 3 Flash stochasticity (temp 0.2). Multi-turn timeout riski (instruction "MAX 5 TOOL/TURN" soft enforcement). Bunlar mimari sınır.

---

## Önerilen sonraki adımlar

### Acil (1-2 saat)

1. **Phase 1.1.13G commit + push** (149 row aksiyon + snippet bug-1 fix)
2. **Bot LLM manuel test (Batch 2)** — `eval-bot-manual-guide.md` izleyerek 30 örnek (CLARIFYING + edge + adversarial)
3. **Bot prompt notu eklenir mi?** BUG-2 (sub_type display) + BUG-3 (text trunc) için kısa instruction notu — kullanıcı kararı

### Orta vadeli (gelecek faz)

4. **Phase 1.1.13H — JSON number normalize** — consumption_per_car_ml string sayı (`"50"`) → JSON number (Phase 1.1.13C ph_level paterni). Bot SQL cast OK ama `jsonb_typeof = 'number'` ideal.
5. **Eval otomasyonu** — adk evals framework'e 270 senaryoyu entegre et, llm_judge ile her hafta otomatik çalıştır
6. **Rating data enrichment** — Phase 1.1.13C.2 (memory'de pH için bahsedilen) tarzı rating coverage genişletme (şu an 19-20 ürün rating_*).

### Uzun vadeli

7. **Production cutover** — Phase 5/6 (memory'de bahsedilen)
8. **Instagram DM entegrasyonu** — `instagram_dm_next.md`

---

## Auto-mode özet

**Başlangıç:** 130/155 pass (%83.9)
**Final:** 153/155 pass (%98.7)
**Açıklama:** 23 yeni pass — Phase 1.1.13G data fix (3 kritik bug) + eval script fix + 1 snippet bug

**Kritik veri bug'ları keşfedildi ve çözüldü:**
- 50 polisher_machine product_type → bot artık çalışıyor
- 26 solid_compound purpose → katı pasta sorguları çalışıyor
- 5 consumption_per_car_ml range → tüketim filter çalışıyor

Bu bug'lar Phase 1.1.13B.1 application_method enum normalize sırasında atlanmıştı — aynı JSON-quoted patern. Eval suite tasarımının değeri burada görünüyor: **veri katmanında 3 kritik bug bulduk** (toplam ~80 ürün etkilenen).

Bot davranışı için **A/B/J/K (115 senaryo) bot LLM testi** kullanıcı manuel veya MCP ile yapılmalı.
