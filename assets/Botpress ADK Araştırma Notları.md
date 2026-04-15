# Botpress ADK Araştırma Notları

## 1. ADK Nedir?
- CLI aracı ve geliştirme çerçevesi
- TypeScript desteği, hot reloading, type-safe API'ler
- Beta durumunda
- Botpress Cloud'a derleme ve dağıtım
- Entegrasyon yönetimi (Botpress Hub'dan)

## Ne Zaman Kullanılır?
- Kod tabanlı iş akışı tercih eden geliştiriciler
- Sürüm kontrolü ve CI/CD kullanan ekipler
- Özel mantık ve entegrasyon gerektiren projeler
- TypeScript tip güvenliği ihtiyacı

## 2. ADK Proje Yapısı
- src/conversations/ -> Mesaj işleyicileri
- src/workflows/ -> Uzun süren çok adımlı süreçler
- src/actions/ -> Çağrılabilir fonksiyonlar
- src/tools/ -> AI modelinin çağırabileceği araçlar
- src/tables/ -> Veri depolama şemaları (Cloud senkron)
- src/triggers/ -> Olay abonelikleri
- src/knowledge/ -> Bilgi bankası kaynakları
- agent.config.ts -> Ana yapılandırma

## 3. CLI Komutları
- adk init my-agent -> Yeni proje
- adk dev -> Geliştirme sunucusu (hot reload)
- adk chat -> Terminal sohbet testi
- adk build -> Derleme
- adk deploy -> Botpress Cloud'a dağıtım

## Temel Kod Yapısı
```typescript
import { Conversation } from "@botpress/runtime";
export default new Conversation({
  channel: "*",
  handler: async ({ execute, message }) => {
    await execute({
      instructions: "You are a helpful assistant.",
    });
  },
});
```


## 4. ADK Conversations
- Kanal bazlı mesaj işleyicileri (channel: "*" veya spesifik)
- execute() ile AI modeline talimat verme
- Knowledge base entegrasyonu: knowledge: [WebsiteKB]
- Tools entegrasyonu: tools: [getWeather, searchDB]
- Hooks: onBeforeTool, onTrace
- Birden fazla conversation handler (webchat.ts, slack.ts)

## 5. ADK Workflows
- Uzun süren, çok adımlı süreçler
- Zamanlanmış çalışma: schedule: "0 */6 * * *"
- Step fonksiyonu ile adım adım işlem (2 dk timeout aşımı için)
- Step'ler kalıcı - kesintide kaldığı yerden devam
- Workflow input/output şemaları (z.object)
- workflow.start() - programatik başlatma
- workflow.asTool() - conversation'da araç olarak kullanma
- workflow.provide() - veri taleplerine yanıt
- step.listen() - dış olayları bekleme
- step.sleep() / step.sleepUntil() - bekleme
- step.executeWorkflow() - alt workflow çalıştırma
- step.map() - paralel işleme
- step.forEach() - sıralı işleme
- step.batch() - toplu işleme
- step.request() - kullanıcıdan veri isteme

## 6. ADK Tables (Kod ile)
- src/tables/ altında tanımlama
- Zod şemaları ile sütun tanımı
- searchable: true seçeneği
- Otomatik Cloud senkronizasyonu
- CRUD: createRows, findRows, updateRows
- Filtre, sıralama, limit desteği
- Tablo adı kuralları: 30 karakter, Table ile bitmeli

## 7. ADK Knowledge (Kod ile)
- Website kaynak: fromSitemap, fromWebsite, fromLlmsTxt, fromUrls
- Dosya kaynak: fromPath (sadece dev modunda)
- Filtre, maxPages, maxDepth seçenekleri
- Conversation'da: knowledge: [WebsiteKB]
- Yenileme: WebsiteKB.refresh(), force: true

## 8. ADK Tools
- AI modelinin çağırabileceği fonksiyonlar
- Zod ile input/output şemaları
- description alanı kritik (AI ne zaman çağıracağını anlar)
- Actions -> asTool() ile dönüştürme
- Workflows -> asTool() ile dönüştürme
- ThinkSignal ile AI'a ek bağlam sağlama

## 9. ADK Actions
- Yeniden kullanılabilir fonksiyonlar
- Workflow, conversation, diğer action'lardan çağrılabilir
- asTool() ile AI aracına dönüştürülebilir
- Entegrasyon action'ları otomatik erişilebilir

## 10. Zai - LLM Yardımcı Kütüphanesi
- extract: Yapılandırılmamış metinden yapısal veri çıkarma
- check: Koşul doğrulama
- filter: Dizi filtreleme
- label: Kategorilendirme
- rewrite: Metin dönüştürme
- summarize: Özetleme
- text: Metin üretme
- sort: Sıralama
- rate: Puanlama
- group: Gruplama
- answer: Kaynaklı yanıt
- patch: Dosya düzenleme

## 11. CLI Komutları (Tam Liste)
- adk init: Yeni proje
- adk dev: Geliştirme sunucusu
- adk build: Derleme
- adk deploy: Dağıtım
- adk add: Entegrasyon ekleme
- adk chat: Terminal sohbet
- adk run: TypeScript script çalıştırma (tablo seed, migrasyon)
- adk mcp: MCP sunucusu (AI asistan entegrasyonu)
- adk mcp:init: MCP yapılandırma dosyaları
- adk login: Kimlik doğrulama
- adk link: Workspace/bot bağlama
- adk search: Entegrasyon arama
- adk list: Entegrasyon listeleme
- adk info: Entegrasyon bilgisi
- adk assets: Statik dosya yönetimi
- adk self-upgrade: CLI güncelleme

## 12. GitHub Repo Bilgileri
- 90 release, en son v1.13.17
- 58 commit, 5 katkıcı
- examples/ klasörü mevcut
- Demo projeler: deep-research, brand-extractor, clause
- Beta durumunda

## 13. Önemli Notlar
- ADK workflow'ları Studio workflow'larından farklı davranır
- Dosya kaynakları sadece dev modunda çalışır, üretimde website kaynakları kullanılmalı
- Tablo adları 30 karakter sınırı, "Table" ile bitmeli
- Node.js v22+ gerekli
- TypeScript tip güvenliği tam destek
