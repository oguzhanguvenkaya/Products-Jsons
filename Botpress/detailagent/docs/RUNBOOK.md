# Runbook — detailagent

Operasyonel rehber. Her bölüm bir senaryo ve adım adım çözüm.

## İçindekiler

1. [İlk kurulum / Fresh deploy](#1-ilk-kurulum--fresh-deploy)
2. [Günlük geliştirme akışı](#2-günlük-geliştirme-akışı)
3. [CSV verilerini güncelleme](#3-csv-verilerini-güncelleme)
4. [Cerrahi URL güncelleme (yeni URL geldiğinde)](#4-cerrahi-url-güncelleme-yeni-url-geldiğinde)
5. [Şema değişikliği (kolon ekleme/silme)](#5-şema-değişikliği-kolon-eklemesilme)
6. [Full refresh (tam reseed)](#6-full-refresh-tam-reseed)
7. [Production deploy](#7-production-deploy)
8. [Trace debugging](#8-trace-debugging)
9. [Bilinen ADK bug'ları ve workaround'lar](#9-bilinen-adk-bugları-ve-workaroundlar)
10. [Sorun giderme kılavuzu](#10-sorun-giderme-kılavuzu)

---

## 1. İlk kurulum / Fresh deploy

### Ön gereksinimler

```bash
# Node.js 20+
node --version

# Bun (adk run için gerekli)
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

# ADK CLI
npm install -g @botpress/cli
adk --version

# Botpress auth
adk auth login
```

### Projeyi al ve bağla

```bash
cd Botpress/detailagent
npm install

# Mevcut bot'a bağla (bot ID gerekli)
adk link
```

### CSV üret ve yükle

```bash
# 1. Kaynak JSON/CSV'lerden normalize edilmiş CSV'leri üret
cd ../..  # Products Jsons kök klasörüne
python3 Scripts/refresh_data.py

# Beklenen çıktı:
#   master: 622 rows, 614 matched (manual=5, barcode=606, sku=1, ...)
#   search_index: 622 rows enriched
#   unmatched: 8 ürün → output/unmatched_urls.csv

# 2. Dev sunucusunu başlat (ayrı terminal)
cd Botpress/detailagent
adk dev

# 3. Tabloları yükle (ayrı terminal, adk dev çalışırken)
PATH="$HOME/.bun/bin:$PATH" adk run scripts/seed.ts

# Beklenen: 5304 satır, 0 hata
```

### Doğrulama

```bash
PATH="$HOME/.bun/bin:$PATH" adk run scripts/verify-schema.ts
```

Beklenen:
- Master'da ve search_index'te Menzerna 400 satırı var
- template_group, template_sub_type, url alanları dolu
- `template_group=abrasive_polish` filter sorgusu ürün döndürür

### CLI chat ile smoke test

```bash
PATH="$HOME/.bun/bin:$PATH" adk chat
```

Test sorguları:
- `Menzerna 400 öner` → Carousel
- `pH nötr şampuan öner` → Carousel
- `GYEON Wetcoat 1000ml` → Card

---

## 2. Günlük geliştirme akışı

```bash
# Terminal 1: Dev sunucu
cd Botpress/detailagent
adk dev

# Terminal 2: Test chat
PATH="$HOME/.bun/bin:$PATH" adk chat
```

Kod değişikliklerinde `adk dev` hot reload yapar. Instructions'ta değişiklik yaparsan bot'un öğrenmesi için yeni bir kullanıcı mesajı göndermek yeter — cache yok.

### Build kontrolü

```bash
adk build
```

Sıfır error/warning beklenir. Type error varsa düzelt.

---

## 3. CSV verilerini güncelleme

Kaynak veri (`assets/Products_with_barcode.csv`, `Product Groups/*.json`) değiştiğinde:

```bash
cd /path/to/Products\ Jsons
python3 Scripts/refresh_data.py
```

Bu sadece CSV'leri günceller. **Botpress tablolarına yansımaz.** Yansıtmak için ya cerrahi upsert (Bölüm 4) ya full refresh (Bölüm 6) gerekir.

---

## 4. Cerrahi URL güncelleme (yeni URL geldiğinde)

**Senaryo:** 1-10 ürün için yeni URL bulundu. Full reseed pahalı, sadece ilgili SKU'ları güncelle.

```bash
# 1. assets/manual_urls.csv'ye yeni mapping ekle
echo "YENI_SKU,https://mtskimya.com/..." >> assets/manual_urls.csv

# 2. CSV'leri yenile (manuel URL kaynaktan önce işlenir)
python3 Scripts/refresh_data.py

# 3. Cerrahi upsert (sadece yeni SKU'lar güncellenir)
cd Botpress/detailagent
PATH="$HOME/.bun/bin:$PATH" adk run scripts/update-urls.ts
```

`update-urls.ts` `assets/manual_urls.csv`'deki TÜM SKU'ları `upsertTableRows` ile günceller. İdempotent — ikinci çalıştırmada zarar vermez.

---

## 5. Şema değişikliği (kolon ekleme/silme)

**Senaryo:** Yeni kolon eklendi veya silindi (örn: `src/tables/products-master.ts`'de `z.string()` → yeni alan).

1. Şemayı güncelle (`src/tables/*.ts`)
2. `refresh_data.py`'yi CSV'lere yansıt (kolon eklendi/silindi)
3. `adk build` → type error yok mu
4. `adk dev`'i durdur, yeniden başlat (tablolara yeni şema push)
5. **Full refresh gerekli** — eski satırlar yeni şemayla uyumsuz

```bash
# Full refresh pipeline (Bölüm 6)
PATH="$HOME/.bun/bin:$PATH" adk run scripts/full-refresh.ts
```

### ⚠️ Not

Botpress ADK şu an şema migration'ı **otomatik yapmıyor**. Kolon eklerken eski tabloyu kontrol et — eğer eski satırlar varsa clear + reseed gerekir.

---

## 6. Full refresh (tam reseed)

**Ne zaman kullanılır:**
- Şema değişikliği sonrası
- CSV'lerde çok fazla satır değişti
- Tabloları "temiz" hale getirmek istiyorsun

**Destructive** — 7 tablonun hepsinin satırlarını siler, sonra yeniden yükler. ~2-3 dakika sürer.

```bash
cd Botpress/detailagent

# adk dev açık olmalı (ayrı terminal)

# Tek komut: refresh_data.py + clear-tables + seed + verify
PATH="$HOME/.bun/bin:$PATH" adk run scripts/full-refresh.ts
```

Adımlar:
1. `python3 Scripts/refresh_data.py` — CSV yenile
2. `adk run scripts/clear-tables.ts` — Tablolara async delete job gönder
3. 25 saniye bekleme — delete job'lar bitsin
4. `adk run scripts/seed.ts` — 7 tabloya CSV yükle
5. `adk run scripts/verify-schema.ts` — Doğrula

---

## 7. Production deploy

```bash
cd Botpress/detailagent

# 1. Build temiz olmalı
adk build

# 2. Dev'de smoke test geçmiş olmalı
adk chat
# → Menzerna 400, pH nötr şampuan, Wetcoat 1000ml test et

# 3. Production bot'a deploy
adk deploy
```

⚠️ **Production bot ayrı bir bot ID** (dev: `bcfcd0c7-...`, prod: `7228621c-...`). Deploy sadece code + bot.definition'ı push eder. **Production tabloları ayrı** — deploy sonrası production'da da seed gerekir.

### Production seed (ilk kez)

```bash
# Production bot'a geçici olarak link et
adk link --bot 7228621c-573d-427d-afad-f759553e0bc2

# Seed çalıştır (production Cloud tablolarına yazacak)
PATH="$HOME/.bun/bin:$PATH" adk run scripts/seed.ts

# Dev'e geri dön
adk link --bot bcfcd0c7-3697-41a4-ae14-090ca0683360
```

---

## 8. Trace debugging

**Senaryo:** Bot yanlış cevap verdi. Hata veri mi, instruction mı, tool mu?

### 8.1 Trace'e erişim

```bash
# SQLite direkt sorgu
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, status, COUNT(*) FROM spans GROUP BY name, status;"

# Error'lar
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, data FROM spans WHERE status='error' LIMIT 10;"
```

### 8.2 ADK dashboard (dev)

`adk dev` çalışırken `http://localhost:3001/` — conversation history ve trace UI.

### 8.3 Conversation ID ile filter

```bash
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, status, started_at, data FROM spans
   WHERE conversation_id='conv_XYZ' ORDER BY started_at;"
```

### 8.4 Teşhis metodolojisi

Her yanlış cevap için:

1. **Tool input'una bak** (`autonomous.tool.input`)
   - `query` mantıklı mı?
   - `templateGroup`/`templateSubType` doğru mu?
   - `brand`/`exactMatch` doğru mu?

2. **Tool output'una bak** (`autonomous.tool.output`)
   - Dönen ürünler filter'la tutarlı mı?
   - Her ürünün `url`, `templateGroup`, `templateSubType` alanları dolu mu?

3. **Karar matrisi:**
   - Parametreler yanlış → **instruction hatası** → `src/conversations/index.ts`'yi düzelt
   - Parametreler doğru, sonuç yanlış → **veri hatası** → CSV'de `template_sub_type`'ı incele
   - İkisi doğru, ranking alakasız → **retrieval hatası** → post-filter veya rerank ekle

Detaylı: [`ARCHITECTURE.md`](./ARCHITECTURE.md#3-veri-akışı-ingestion-pipeline)

---

## 9. Bilinen ADK bug'ları ve workaround'lar

### 9.1 `tables` block bug (v1.17.0)

**Semptom:** `adk dev` startup'ında:
```
Table "productXTable" was previously defined but is not present in your bot definition.
This table will be ignored.
```

**Kök neden:** `adk build` code-gen `.adk/bot/bot.definition.ts`'ye `tables: {...}` bloğunu enjekte etmiyor. `.adk/bot/src/tables.ts` dosyası tabloları doğru export ediyor ama BotDefinition constructor'a geçilmiyor.

**Fonksiyonel etki:** YOK. `client.findTableRows` Cloud'daki tablolara doğrudan ID ile erişebiliyor. 874-span test'te 0 error.

**Workaround:** Uyarıları ignore et. Şema migration otomatik değil — `adk dev` yeniden başlatma + manuel clear+reseed gerekli (Bölüm 5, Bölüm 6).

**Upstream fix:** Botpress ADK team'e bug raporu gerekiyor. Biz bir çözüm üretemeyiz.

### 9.2 `client.deleteTable` runtime'da yok

`@botpress/client` SDK'da var ama `@botpress/runtime` wrapper'ında expose edilmiyor.

**Workaround:** `scripts/clear-tables.ts` kullan — `deleteTableRows` ile satırları sil, tabloları silme. Şemayı değiştirmek için `adk dev` restart yeterli (v5.4'te test edildi).

### 9.3 `adk run` bun PATH gereksinimi

`adk run` bun binary'ye ihtiyaç duyar ama PATH'e eklemez.

**Workaround:** Her `adk run` öncesinde:
```bash
PATH="$HOME/.bun/bin:$PATH" adk run scripts/X.ts
```

Veya kalıcı: `.zshrc`/`.bashrc`'e `export PATH="$HOME/.bun/bin:$PATH"` ekle.

### 9.4 `Missing bot id header` sporadic hatası

`adk dev` çalışırken worker pool'da bazen "Missing bot id header" hatası. Self-recover ediyor. Fonksiyonel etki minimal.

**Workaround:** Devam. Sık tekrarlarsa `adk dev` restart.

---

## 10. Sorun giderme kılavuzu

### Bot "Üzgünüm bir hata oluştu" diyor

**Muhtemel sebepler:**
- JSX render hatası (v5'te çözüldü, regresyon olmamalı)
- Tool throw ediyor (örn: `getProductDetails` "Ürün bulunamadı")
- Instructions LLM'i yanlış yönlendiriyor

**Kontrol:**
```bash
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, data FROM spans WHERE status='error' ORDER BY started_at DESC LIMIT 5;"
```

### Bot aynı sorguyu birden çok kez arıyor

**Semptom:** Trace'te 3-4 `autonomous.tool` span, aynı tool.

**Muhtemel sebep:** Instructions'ta "max 2 search denemesi" kuralı eksik.

**Fix:** v6.0+ plan — instructions'ta retry limiti.

### Menzerna (veya başka marka) hiç bulunmuyor

**Kontrol:**
```bash
# Botpress'te marka ürünleri var mı?
PATH="$HOME/.bun/bin:$PATH" adk run -e "
  const r = await client.findTableRows({
    table: 'productSearchIndexTable',
    filter: { brand: { \$eq: 'MENZERNA' } },
    limit: 5,
  });
  console.log(r.rows.length);
"
```

Boş geliyorsa:
- Seed yapıldı mı? (`scripts/seed.ts`)
- CSV'de var mı? (`grep MENZERNA output/csv/products_master.csv | wc -l`)

### Ürün Card'ı crash ediyor ("actions[0].value must NOT have fewer than 1 characters")

**Kök neden:** URL'si boş bir ürünü Card'a koymuşuz. Instructions bunu text fallback ile handle ediyor.

**Kontrol:** Ürünün URL'si dolu mu?
```bash
PATH="$HOME/.bun/bin:$PATH" adk run -e "
  const r = await client.findTableRows({
    table: 'productsMasterTable',
    filter: { sku: { \$eq: 'SKU_HERE' } },
    limit: 1,
  });
  console.log(r.rows[0]?.url);
"
```

Boşsa: `assets/manual_urls.csv`'ye mapping ekle, `scripts/update-urls.ts` koştur.

### Traces.db çok büyüdü

```bash
# Eski trace'leri temizle
sqlite3 .adk/bot/traces/traces.db "DELETE FROM spans WHERE started_at < $(date -v-7d +%s)000;"
sqlite3 .adk/bot/traces/traces.db "VACUUM;"
```

### `adk dev` başlamıyor

```bash
# Port temiz mi?
lsof -i :3000

# Cache temizle
rm -rf .adk/bot/.botpress

# Yeniden başlat
adk dev
```

---

## Appendix: Sık kullanılan SQL sorguları

```sql
-- Toplam span / error sayımı
SELECT status, COUNT(*) FROM spans GROUP BY status;

-- Tool çağrı istatistikleri
SELECT
  json_extract(data, '$."autonomous.tool.name"') AS tool,
  COUNT(*) AS calls,
  AVG(CAST(json_extract(data, '$.duration_ms') AS REAL)) AS avg_ms
FROM spans
WHERE name='autonomous.tool'
GROUP BY tool;

-- LLM maliyet toplamı
SELECT
  SUM(CAST(json_extract(data, '$."ai.cost"') AS REAL)) AS total_cost,
  SUM(CAST(json_extract(data, '$."ai.input_tokens"') AS INTEGER)) AS total_in,
  SUM(CAST(json_extract(data, '$."ai.output_tokens"') AS INTEGER)) AS total_out
FROM spans
WHERE name='cognitive.request';

-- Son N conversation
SELECT DISTINCT conversation_id, MAX(started_at) AS last_msg
FROM spans
WHERE conversation_id IS NOT NULL
GROUP BY conversation_id
ORDER BY last_msg DESC
LIMIT 10;
```
