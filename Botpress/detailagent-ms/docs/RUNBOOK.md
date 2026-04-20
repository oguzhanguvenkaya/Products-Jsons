# Runbook — detailagent-ms (v10, microservice variant)

> Operasyonel rehber — Phase 2 başlangıcı için kurulum, dev akışı, microservice ile koordinasyon, cutover sonrası operasyon.

Son güncelleme: 2026-04-20

## İçindekiler

1. [İlk kurulum (Phase 2 pre-flight)](#1-ilk-kurulum-phase-2-pre-flight)
2. [Dev akışı — bot + microservice paralel](#2-dev-akışı--bot--microservice-paralel)
3. [Microservice ile koordinasyon](#3-microservice-ile-koordinasyon)
4. [Yeni Botpress bot kimliği (agent.json)](#4-yeni-botpress-bot-kimliği)
5. [Deploy (Phase 6 sonrası)](#5-deploy-phase-6-sonrası)
6. [Trace debugging](#6-trace-debugging)
7. [Rollback prosedürü](#7-rollback-prosedürü)
8. [Sorun giderme](#8-sorun-giderme)

---

## 1. İlk kurulum (Phase 2 pre-flight)

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
2. Elde edilen `botId`'yi [agent.json](../agent.json) içine yaz (`REPLACE_WITH_NEW_BOT_ID` yerine)
3. `.env` dosyası oluştur (detailagent'ın `.env`'sini KOPYALAMA — farklı token/bot):
   ```
   # Phase 4'e kadar bunlar yeter
   BOTPRESS_TOKEN=<yeni bot token>

   # Phase 4'te eklenecek
   # RETRIEVAL_SERVICE_URL=https://detailagent-retrieval.fly.dev
   # RETRIEVAL_SHARED_SECRET=<16+ char random>
   ```
4. `adk link` → yeni bot'a bağla

> ⚠️ detailagent ile **aynı botId/token'ı PAYLAŞMA.** İki bot aynı token kullanırsa Botpress Cloud'da çakışır.

---

## 2. Dev akışı — bot + microservice paralel

Phase 2+'dan itibaren iki servis aynı anda çalışacak. İki terminal:

```bash
# Terminal 1 — Botpress bot
cd Botpress/detailagent-ms
adk dev                                       # :3000, :3001 dashboard

# Terminal 2 — Microservice
cd retrieval-service
bun run dev                                   # :8787 (Phase 2'de Hono server impl)

# Terminal 3 — Test
cd Botpress/detailagent-ms
PATH="$HOME/.bun/bin:$PATH" adk chat
```

Phase 2 başlangıcında tool handler'lar hala Botpress Tables'a gidiyor — microservice ayrı olarak manuel test edilir:

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

Phase 4+'de microservice response tiplerini bot'a aktarmak için `retrieval-service/src/types.ts`'den export et, bot `import` etsin (same-repo monorepo avantajı).

---

## 4. Yeni Botpress bot kimliği

[agent.json](../agent.json) içinde şu an:

```json
{
  "botId": "REPLACE_WITH_NEW_BOT_ID",
  "workspaceId": "wkspace_01KCCKM30YFWT88HC0NBHXP4J7",
  "apiUrl": "https://api.botpress.cloud"
}
```

`workspaceId` detailagent ile aynı (aynı Botpress Cloud hesabı). `botId` **YENİ** — Botpress Cloud'da yeni bot oluştur, ID'yi al.

---

## 5. Deploy (Phase 6 sonrası)

**Ön koşul:** Phase 5 shadow mode'da ≥1 hafta çalışmış, top-3 overlap ≥%85, p50<150ms.

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

### Bot tarafı (Botpress trace)

```bash
sqlite3 .adk/bot/traces/traces.db \
  "SELECT name, status, COUNT(*) FROM spans GROUP BY name, status;"
```

Phase 4+ için yeni trace pattern: `autonomous.tool.input` → HTTP call body, `autonomous.tool.output` → microservice response. Hata varsa microservice trace'ini incele.

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

Eğer feature flag varsa (`USE_MICROSERVICE=false`), flag'i kapat → tool handler Botpress Tables'a dönüyor. Cutover sonrası flag olmayacak → rollback = önceki bot versiyonunu deploy etmek.

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

### Bot "Üzgünüm bir hata oluştu" diyor (Phase 4+)

1. Microservice ayakta mı?
   ```bash
   curl https://detailagent-retrieval.fly.dev/health
   ```
2. Microservice log'larını incele (Axiom)
3. Bot trace'inde `autonomous.tool` span → error message

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

### Latency yüksek (>500ms)

1. Microservice p50/p95 Axiom'dan oku
2. Botpress → microservice round-trip mi yüksek? Region uyuşmazlığı ihtimali (Botpress workspace region doğrulaması Phase 5'te yapılmış olmalı)
3. Embedding cache hit rate düşük mü? → pre-warm script

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
