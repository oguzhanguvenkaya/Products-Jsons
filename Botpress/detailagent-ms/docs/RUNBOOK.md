# Runbook — detailagent-ms (v10, microservice variant)

> Operasyonel rehber — kurulum, dev akışı, deploy, debugging, sorun giderme.
>
> **Son güncelleme:** 2026-04-27 · **Mimari/durum master:** [`/docs/PROJECT_BRIEFING.md`](../../../docs/PROJECT_BRIEFING.md)
>
> Mevcut durum: Phase 1/2R/4/19 tamamlandı, tool handler'lar microservice HTTP'ye cutover edildi. Phase 5 (shadow mode) bekliyor — eval corpus oluşturulmadı.

## İçindekiler

1. [İlk kurulum](#1-ilk-kurulum)
2. [Dev akışı — bot + microservice paralel](#2-dev-akışı--bot--microservice-paralel)
3. [Microservice ile koordinasyon](#3-microservice-ile-koordinasyon)
4. [Botpress bot kimliği (agent.json)](#4-botpress-bot-kimliği)
5. [Deploy](#5-deploy)
6. [Trace debugging](#6-trace-debugging)
7. [Rollback prosedürü](#7-rollback-prosedürü)
8. [Sorun giderme](#8-sorun-giderme)

---

## 1. İlk kurulum

Bu bot ilk kez ayağa kaldırılıyorsa:

```bash
# Ön gereksinim (detailagent ile aynı)
node --version                    # 20+
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
npm install -g @botpress/cli
adk auth login

cd Botpress/detailagent-ms
bun install                       # klon node_modules içermez
adk build                         # 0 error beklenir
npx tsc --noEmit                  # typecheck
```

**Botpress Cloud bot oluşturma:**

1. Botpress Cloud dashboard → yeni bot oluştur (`detailagent-ms` isimli)
2. Elde edilen `botId`'yi [agent.local.json](../agent.local.json) içindeki `devId`'ye yaz veya `agent.json`'ı güncelle
3. `.env` dosyası oluştur (detailagent'ın `.env`'sini KOPYALAMA — farklı token/bot):
   ```
   BOTPRESS_TOKEN=<yeni bot token>
   RETRIEVAL_SERVICE_URL=https://detailagent-retrieval.fly.dev   # veya http://localhost:8787 dev'de
   RETRIEVAL_SHARED_SECRET=<16+ char random>                     # microservice ile aynı değer
   ```
4. `adk link` → yeni bot'a bağla

> ⚠️ detailagent ile **aynı botId/token'ı PAYLAŞMA.** İki bot aynı token kullanırsa Botpress Cloud'da çakışır.

---

## 2. Dev akışı — bot + microservice paralel

Tool handler'lar microservice HTTP'ye cutover edildi → her iki servis de ayakta olmalı. **Microservice'i ÖNCE başlat** (bot tool çağrılarında 3s timeout var, servis kapalıysa "Üzgünüm" hatası alırsın).

```bash
# Terminal 1 — Microservice (önce!)
cd retrieval-service
bun run dev                                   # :8787 (hot-reload)

# Terminal 2 — Botpress bot
cd Botpress/detailagent-ms
adk dev                                       # :3000 + tunnel URL

# Terminal 3 — CLI test (opsiyonel; Carousel görmek için browser webchat tercih)
cd Botpress/detailagent-ms
PATH="$HOME/.bun/bin:$PATH" adk chat
```

Microservice'i ayrı manuel test:

```bash
curl -s http://localhost:8787/health
# {"status":"ok","version":"0.1.0"}

curl -s -X POST http://localhost:8787/search \
  -H "Authorization: Bearer $RETRIEVAL_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"query":"seramik kaplama","limit":5}'
```

---

## 3. Microservice ile koordinasyon

Bu bot ve `retrieval-service/` **aynı repo'da, aynı git history'de** yaşar. Her ikisi birlikte değişebilir:

| Değişiklik türü | Bot + microservice aynı PR? |
|---|---|
| Yeni tool (+endpoint) | Evet, atomic commit |
| Response contract değişikliği | Evet, typescript tipleri sync |
| Microservice-only optimize (ranking) | Hayır, bot dokunulmaz |
| Bot-only UI değişikliği (carousel format) | Hayır, microservice dokunulmaz |

### Tipler paylaşımı

Microservice response tipleri `retrieval-service/src/types.ts`'de tanımlı. Bot tarafında her tool'un `output` Zod şeması ayrı tanımlı (input/output contract). İki taraf paralel evrildiğinde **aynı PR**'da güncellenmeli.

---

## 4. Botpress bot kimliği

[agent.local.json](../agent.local.json) içinde dev bot ID'si:
```json
{
  "devId": "f29b900e-643e-4851-9866-f7c62cdeab73"
}
```

Workspace `wkspace_01KCCKM30YFWT88HC0NBHXP4J7` (detailagent ile aynı hesap, ayrı bot). detailagent (v9.2 frozen prod) ile **aynı botId/token PAYLAŞMA** — çakışır.

Production bot ID için `adk auth login` + `adk link` ile bağla; tunnel URL studio chat panel'inden test edilebilir.

---

## 5. Deploy

**Ön koşul:** Phase 5 shadow mode'da ≥1 hafta çalışmış, eval corpus üzerinde top-3 overlap ≥%85, p50<150ms.

```bash
cd Botpress/detailagent-ms

# 1. Build temiz
adk build

# 2. Microservice deploy (önce)
cd ../../retrieval-service
fly deploy

# 3. Smoke test production microservice
curl https://detailagent-retrieval.fly.dev/health

# 4. Bot deploy
cd ../Botpress/detailagent-ms
adk deploy
```

> Sıra ÖNEMLİ: microservice önce deploy olmalı. Bot microservice'e bağımlı, tersi değil.

---

## 6. Trace debugging

### Bot tarafı (Botpress trace, SQLite)

```bash
# Span dağılımı
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, status, COUNT(*) FROM spans GROUP BY name, status;"

# Belirli bir conversation'ın user mesajlarını + handler durations'ları
sqlite3 .adk/bot/traces/traces.db "
  SELECT datetime(started_at,'unixepoch','+3 hours') as ts,
         status, ROUND(duration,0) as ms,
         substr(json_extract(data,'\$.\"message.preview\"'),1,80) as msg
  FROM spans
  WHERE conversation_id='conv_XXX' AND name='request.incoming'
  ORDER BY started_at;"

# Token bütçesi (LLM çağrıları)
sqlite3 .adk/bot/traces/traces.db "
  SELECT json_extract(data,'\$.\"ai.system_length\"') as syslen,
         ROUND(duration,0) as ms
  FROM spans WHERE name='cognitive.request' ORDER BY started_at DESC LIMIT 5;"

# Tool I/O incele
sqlite3 .adk/bot/traces/traces.db "
  SELECT json_extract(data,'\$.\"autonomous.tool.name\"') as tool,
         status, ROUND(duration,0) as ms,
         substr(json_extract(data,'\$.\"autonomous.tool.input\"'),1,150) as input
  FROM spans WHERE name='autonomous.tool' ORDER BY started_at DESC LIMIT 10;"
```

Trace pattern: `autonomous.tool.input` → HTTP call body (örn `{query, templateGroup, ...}`), `autonomous.tool.output` → microservice response. Hata varsa microservice log'una bak (request_id ile cross-reference).

### Microservice tarafı (Axiom, Phase 5+)

```bash
# Local dev: console logs
# Production: Axiom dashboard — request_id ile cross-reference
```

Her request microservice'e conversation_id + request_id ile gelir, JSON log'u Axiom'a gider. Retrieval kararlarını explainable yapan alan: `debug: {slots, bm25_score, vec_score, rrf_score}`.

### Conversation ID ile cross-reference

Bot trace'inde `conversation_id` → microservice log'da aynı `conversation_id` filter.

---

## 7. Rollback prosedürü

Phase 6 A/B sırasında veya cutover sonrası sorun olursa:

### Hızlı rollback (10dk içi)

Bot'ta feature flag yok (tek path tasarımı). Rollback = önceki commit'i deploy et:

```bash
git log --oneline                     # son sağlıklı commit'i bul
git checkout <good-commit>
adk build && adk deploy
```

Acil durumda Botpress Cloud studio'dan **önceki deploy versiyonunu rollback** etmek mümkün.

### Kalıcı geri dönüş

```bash
# Git revert
git revert <cutover-commit>
cd Botpress/detailagent-ms
adk build
adk deploy
```

> detailagent-ms bot'u read-only mod'a alınamaz (Botpress Cloud özelliği yok). Rollback için eski commit'i deploy et.

---

## 8. Sorun giderme

### Bot mesaja cevap vermiyor / "Skipping message, no ADK Conversation defined"

Bu pattern **conversation handler register edilemediğini** gösterir — büyük ihtimalle `src/conversations/index.ts`'de **TypeScript compile error** var. Hot-reload sessiz başarısız oluyor.

```bash
# Typecheck
npx tsc --noEmit
# Conversation dosyasında error varsa düzelt, hot-reload otomatik retry eder
```

**Sık nedenler:**
- Template literal'da escape edilmemiş backtick (markdown bold içinde \`code\` yazımında)
- Zod state schema'da yanlış field referansı (örn. eski `state.lastFaqAnswer` kalıntısı)

### Bot "Üzgünüm bir hata oluştu" diyor

1. Microservice ayakta mı?
   ```bash
   curl http://localhost:8787/health             # dev
   curl https://detailagent-retrieval.fly.dev/health  # prod
   ```
2. Bot trace'inde `autonomous.tool` span → error message
3. Tool timeout? `retrieval-client.ts:19` `RETRIEVAL_TIMEOUT_MS=3000` — cold embedding'de aşılabilir, 5000'e yükseltme planlanıyor

### Microservice 401 Unauthorized

Shared-secret yanlış. Bot `.env` ve Fly.io secrets kontrol et:

```bash
cd retrieval-service
fly secrets list
```

### Microservice 500 Internal

Supabase bağlantı problemi olabilir. Supabase dashboard → Database → Connection pooling active mi?

```bash
# Microservice DB ping
curl https://detailagent-retrieval.fly.dev/metrics
# db_connected: true bekleriz
```

### Latency yüksek (>500ms tool çağrısı, >15s turn)

**Tool çağrısı yavaşsa:**
1. Microservice p50/p95'i log'dan oku (her request'te `latencyMs` JSON field'ı var)
2. Embedding cache miss mi? Cold call 150-800ms — `debug.embedCache` field'ı kontrol et
3. Botpress → microservice round-trip yüksekse region uyuşmazlığı (Botpress workspace region'ı Fly.io iad'a uzaksa)

**Turn yavaşsa (multi-step LLMz):**
1. Trace'e bak: `cognitive.request` span'leri kaç tane? 4-5 üstüyse agent multi-search döngüsünde — instruction "MAX 5 TOOL PER TURN" kuralı LLM tarafından ihlal ediliyor
2. Botpress runtime 60-120s upper bound — aşılırsa "Runtime execution has timed out"
3. Çözüm: instruction'da hard limit (3 search/turn) veya kullanıcıya "ne öncelikli?" diye sor

### Supabase satır sayısı beklenenden az

```sql
SELECT 'products' AS t, COUNT(*)::int c FROM products
UNION ALL SELECT 'embeddings', COUNT(*)::int FROM product_embeddings
UNION ALL SELECT 'faqs', COUNT(*)::int FROM product_faqs
UNION ALL SELECT 'faqs_embedded', COUNT(*)::int FROM product_faqs WHERE embedding IS NOT NULL;
```

Beklenen (Phase 1 sonrası): products=511, embeddings=511, faqs=3156, faqs_embedded=3156.

Eksikse: `cd retrieval-service && bun run seed:all && bun run embed:products && bun run embed:faqs`.

---

## Appendix: Kritik environment variables

**Bot (`.env`):**
```
BOTPRESS_TOKEN=...                    # Botpress CLI auth
RETRIEVAL_SERVICE_URL=https://detailagent-retrieval.fly.dev  # Phase 4+
RETRIEVAL_SHARED_SECRET=<16+>         # Phase 4+
```

**Microservice (`retrieval-service/.env`):** Format için [retrieval-service/.env.example](../../../retrieval-service/.env.example) dosyasına bak. Gereken alanlar:

- `SUPABASE_DB_URL` — Supabase dashboard → Settings → Database → Connection string (Transaction pooler, us-east-1)
- `GEMINI_API_KEY` — Google AI Studio key (embedding erişimi)
- `RETRIEVAL_SHARED_SECRET` — en az 16 karakter (bot ile aynı değer)
- `PORT=8787`
- `LOG_LEVEL=info`

Connection string'i aldığın gibi yapıştır, bu dosyaya açıkça yazma.

**Fly.io secrets (production):**
```bash
fly secrets set SUPABASE_DB_URL=... GEMINI_API_KEY=... RETRIEVAL_SHARED_SECRET=...
```
