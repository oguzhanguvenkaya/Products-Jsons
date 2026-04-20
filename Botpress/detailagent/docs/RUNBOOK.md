# Runbook — detailagent (v9.2, FROZEN)

> **Donmuş bot.** Operasyonel rehber — kurulum, reseed, URL güncelleme, deploy, trace debug. Yeni retrieval özelliği burada yapılmaz; `Botpress/detailagent-ms/` + `retrieval-service/` kullan.

Son güncelleme: 2026-04-20

## İçindekiler

1. [İlk kurulum / Fresh deploy](#1-ilk-kurulum--fresh-deploy)
2. [Günlük geliştirme akışı](#2-günlük-geliştirme-akışı)
3. [CSV verilerini güncelleme](#3-csv-verilerini-güncelleme)
4. [Cerrahi URL güncelleme](#4-cerrahi-url-güncelleme)
5. [Şema değişikliği](#5-şema-değişikliği)
6. [Full refresh (tam reseed)](#6-full-refresh)
7. [Production deploy](#7-production-deploy)
8. [Trace debugging](#8-trace-debugging)
9. [ADK bug'ları + workaround](#9-adk-bugları--workaround)
10. [Sorun giderme](#10-sorun-giderme)

---

## 1. İlk kurulum / Fresh deploy

### Ön gereksinimler

```bash
node --version                    # 20+
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
npm install -g @botpress/cli
adk --version
adk auth login
```

### Projeyi al ve bağla

```bash
cd Botpress/detailagent
npm install
adk link                          # botId: 7228621c-573d-427d-afad-f759553e0bc2
```

### CSV üret ve yükle

```bash
# 1. Kaynak JSON/CSV'lerden normalize edilmiş CSV'leri üret
cd ../..                          # Products Jsons kökü
python3 etl/refresh_data.py

# Beklenen çıktı:
#   master: 511 rows, ~503 matched (manual=5, barcode=~495, sku=1, ...)
#   search_index: 511 rows enriched
#   unmatched: ~8 ürün → data/unmatched_urls.csv (veya benzeri)

# 2. Dev sunucusunu başlat (ayrı terminal)
cd Botpress/detailagent
adk dev

# 3. Tabloları yükle (ayrı terminal, adk dev çalışırken)
PATH="$HOME/.bun/bin:$PATH" adk run scripts/seed.ts

# Beklenen: ~5.300 satır, 0 hata
```

### Doğrulama

```bash
PATH="$HOME/.bun/bin:$PATH" adk run scripts/verify-schema.ts
```

Beklenen:
- Master'da ve search_index'te Menzerna 400 satırı var
- `template_group`, `template_sub_type`, `url` alanları dolu
- `template_group=abrasive_polish` filter sorgusu ürün döndürür

### CLI chat ile smoke test

```bash
PATH="$HOME/.bun/bin:$PATH" adk chat
```

Test sorguları:
- `Menzerna 400 öner` → Carousel
- `pH nötr şampuan öner` → Carousel
- `GYEON Wetcoat 1000ml` → Card
- `en popüler seramik kaplama` → Carousel (searchByRating)

---

## 2. Günlük geliştirme akışı

```bash
# Terminal 1
cd Botpress/detailagent
adk dev

# Terminal 2
PATH="$HOME/.bun/bin:$PATH" adk chat
```

Kod değişiklikleri `adk dev` ile hot-reload. Instructions değişikliğinde cache yok — yeni mesajla hemen devreye girer.

### Build kontrolü

```bash
adk build          # 0 error/warning
npx tsc --noEmit   # hızlı typecheck
```

---

## 3. CSV verilerini güncelleme

Kaynak veri (`assets/Products_with_barcode.csv`, `product-groups/*.json`) değiştiğinde:

```bash
cd /path/to/Products\ Jsons
python3 etl/refresh_data.py
```

Bu sadece **CSV'leri** günceller. Botpress tablolarına yansımaz → cerrahi upsert (§4) veya full refresh (§6) gerekli.

---

## 4. Cerrahi URL güncelleme

**Senaryo:** 1-10 ürün için yeni URL bulundu. Full reseed pahalı, sadece ilgili SKU'ları güncelle.

```bash
# 1. Manuel URL mapping ekle
echo "YENI_SKU,https://mtskimya.com/..." >> assets/manual_urls.csv

# 2. CSV'leri yenile (manuel URL en yüksek öncelikle işlenir)
python3 etl/refresh_data.py

# 3. Cerrahi upsert
cd Botpress/detailagent
PATH="$HOME/.bun/bin:$PATH" adk run scripts/update-urls.ts
```

`update-urls.ts` `assets/manual_urls.csv`'deki TÜM SKU'ları `upsertTableRows` ile günceller. İdempotent.

---

## 5. Şema değişikliği

**Senaryo:** Yeni kolon eklendi/silindi (örn: `src/tables/products-master.ts`'de `z.string()` + yeni alan).

1. Şemayı güncelle (`src/tables/*.ts`)
2. `etl/refresh_data.py`'yi CSV'lere yansıt
3. `adk build` — type error yok
4. `adk dev`'i durdur → yeniden başlat (yeni şema push)
5. **Full refresh gerekli** — eski satırlar yeni şemayla uyumsuz → §6

> ADK şu an şema migration'ı otomatik yapmıyor. Kolon eklerken eski tabloyu kontrol et.

---

## 6. Full refresh

**Ne zaman:** Şema değişikliği sonrası, CSV'lerde çok fazla satır değişti, tabloları "temiz" hale getirmek.

**Destructive** — 7 tablonun hepsini siler, yeniden yükler. ~2-3 dakika.

```bash
cd Botpress/detailagent
# adk dev açık olmalı (ayrı terminal)

PATH="$HOME/.bun/bin:$PATH" adk run scripts/full-refresh.ts
```

Adımlar (tek komut):
1. `python3 etl/refresh_data.py` — CSV yenile
2. `adk run scripts/clear-tables.ts` — async delete job
3. 25 sn bekleme
4. `adk run scripts/seed.ts` — yeniden yükle
5. `adk run scripts/verify-schema.ts` — doğrula

---

## 7. Production deploy

```bash
cd Botpress/detailagent

# 1. Build temiz olmalı
adk build

# 2. Smoke test geçmiş olmalı
PATH="$HOME/.bun/bin:$PATH" adk chat

# 3. Deploy
adk deploy
```

> detailagent'ın tek botId'si: `7228621c-573d-427d-afad-f759553e0bc2`. Microservice versiyonu AYRI bir bot (`detailagent-ms/`, yeni botId) — karıştırma.

---

## 8. Trace debugging

**Senaryo:** Bot yanlış cevap verdi. Hata veri mi, instruction mı, tool mu?

### 8.1 Trace'e erişim

```bash
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, status, COUNT(*) FROM spans GROUP BY name, status;"

sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, data FROM spans WHERE status='error' LIMIT 10;"
```

### 8.2 ADK dashboard

`adk dev` çalışırken `http://localhost:3001/` — conversation history + trace UI.

### 8.3 Conversation ID ile filter

```bash
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, status, started_at, data FROM spans
   WHERE conversation_id='conv_XYZ' ORDER BY started_at;"
```

### 8.4 Teşhis metodolojisi

Her yanlış cevap için:

1. **Tool input'una bak** (`autonomous.tool.input`) — `query`, `templateGroup/SubType`, `brand`, `exactMatch` mantıklı mı?
2. **Tool output'una bak** (`autonomous.tool.output`) — Dönen ürünler filter'la tutarlı mı? `url/templateGroup/templateSubType` dolu mu?
3. **Karar matrisi:**
   - Parametreler yanlış → **instruction hatası** → `src/conversations/index.ts`
   - Parametreler doğru, sonuç yanlış → **veri hatası** → CSV'de `template_sub_type` incele
   - İkisi doğru, ranking alakasız → **retrieval limiti** → microservice'e kalan tedavi

---

## 9. ADK bug'ları + workaround

### 9.1 `tables` block code-gen bug

**Semptom:** `adk dev` başlangıç log'unda:
```
Table "productXTable" was previously defined but is not present in your bot definition.
This table will be ignored.
```

**Kök neden:** `adk build` code-gen `.adk/bot/bot.definition.ts`'ye `tables: {...}` bloğunu enjekte etmiyor.

**Fonksiyonel etki:** YOK (`client.findTableRows` ID ile erişiyor).

**Workaround:** Uyarıları ignore et. Şema değişimi manuel: `adk dev` restart + full refresh.

### 9.2 `deleteTable` runtime'da yok

`@botpress/runtime` wrapper client `deleteTable` expose etmiyor.

**Workaround:** `scripts/clear-tables.ts` — `deleteTableRows` ile satırları async sil.

### 9.3 `adk run` bun PATH

```bash
PATH="$HOME/.bun/bin:$PATH" adk run scripts/X.ts
```

Kalıcı: `.zshrc`'e `export PATH="$HOME/.bun/bin:$PATH"`.

### 9.4 "Missing bot id header" sporadic

`adk dev` worker pool'unda bazen. Self-recover. Sık tekrarlarsa `adk dev` restart.

---

## 10. Sorun giderme

### Bot "Üzgünüm bir hata oluştu" diyor

```bash
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, data FROM spans WHERE status='error' ORDER BY started_at DESC LIMIT 5;"
```

Muhtemel sebepler:
- JSX render hatası (v5'te çözüldü, regresyon olmamalı)
- Tool throw (örn: `getProductDetails` "Ürün bulunamadı")
- Instructions yanlış yönlendiriyor

### Bot aynı sorguyu birden çok kez arıyor

Trace'te 3-4 `autonomous.tool` span, aynı tool. Instructions'ta retry limiti eksik. Fix: instructions'ta "max 2 deneme" kuralı.

### Menzerna (marka) hiç bulunmuyor

```bash
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
- CSV'de var mı? (`grep MENZERNA data/csv/products_master.csv | wc -l`)

### Card crash: "actions[0].value must NOT have fewer than 1 characters"

URL'si boş ürünü Card'a koymuşuz. Kontrol:
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

Boşsa: `assets/manual_urls.csv`'ye ekle + `scripts/update-urls.ts`.

### Traces.db şişti

```bash
sqlite3 .adk/bot/traces/traces.db \
  "DELETE FROM spans WHERE started_at < $(date -v-7d +%s)000;"
sqlite3 .adk/bot/traces/traces.db "VACUUM;"
```

### `adk dev` başlamıyor

```bash
lsof -i :3000
rm -rf .adk/bot/.botpress
adk dev
```

---

## Appendix: Sık kullanılan SQL

```sql
-- Span / error dağılımı
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
