# Phase 5 — FAQ Konsolidasyonu Özet

**Tarih:** 2026-04-23
**Snapshot:** `_pre-commit-snapshot-20260423-044331`
**Toplam FAQ:** 3156

## 1. Near-duplicate Merge

- Cluster (≥2 yakın-duplicate): **56**
- Cluster içindeki toplam FAQ: **129**
- KEEP edilen (her cluster'ın en uzun cevabı): **56**
- DELETE önerisi: **43** (sadece sku!=null)
- Soru-unify UPDATE: **0**
- SKIP (null sku — brand/category scope, staging API sku gerekli): **30**
- Staging changes toplamı: **43**

## 2. Pattern (Cross-SKU) Tespiti

- Pattern grup (>=5 farklı SKU'da aynı normalize soru): **72**
- Toplam pattern satır: **859** (27.2% of FAQs)
- **Aksiyon:** Silinmiyor — `template_faqs` tablosu önerisi (gelecek faz)

## 3. Yeni Schema Önerileri (Kullanıcı Sinyali)

Sinyal hacmi (n=2124 müşteri mesajı):
- Stok/bayilik: 23
- Sorun-çözüm: 9
- Karşılaştırma: 13
- Fiyat: 43
- Uygulama: 29

→ Detay: `phase5-new-fields.md`

## 4. Çıktılar

- `phase5-faq-merge.csv` — staging payload satır bazında (action: keep/delete/update)
- `phase5-faq-merge-payload.json` — `/admin/staging/preview` payload
- `phase5-pattern-faqs.md` — pattern raporu (DOKUNMA listesi)
- `phase5-new-fields.md` — schema önerileri

## 5. Kısıtlamalar & Notlar

- COMMIT YOK — sadece preview için payload üretildi.
- 500/batch staging API limiti var; preview tek dosyada (gerekirse split).
- Cross-SKU duplicate'lere DOKUNULMADI (pattern raporu ayrı).
- brand/category scope FAQ near-duplicate'ler raporlandı ama staging payload'a KONULMADI (sku NOT NULL şartı).
- Jaccard eşik: 0.85 (token-set, syn-map'li, "uygulanır≈kullanılır" eşlemesi dahil).
