import { z, defineConfig } from '@botpress/runtime';

/**
 * CARCAREAİ — MTS Kimya Ürün Danışmanı
 *
 * Otomotiv detailing & profesyonel oto bakım ürünleri için Türkçe konuşan
 * ürün danışmanı. MTS Kimya katalogundaki ürünler için arama, karşılaştırma,
 * öneri ve uygulama rehberliği sağlar (canlı katalog/marka/kategori sayıları
 * için microservice DB sorgusu — sayı hardcoded tutulmaz).
 *
 * Bot Studio'daki mevcut visual versiyonun TypeScript karşılığı.
 * Kapsam: SADECE ürün danışmanlığı (sipariş/kargo/iade kapsam dışı).
 */
export default defineConfig({
    name: 'detailagent-ms',
    description:
        "MTS Kimya yapay zeka ürün danışmanı — profesyonel oto detailing, polisaj, seramik kaplama, yıkama ve bakım ürünleri için Türkçe ürün önerisi, karşılaştırma ve uygulama rehberliği.",

    // ───────────────────────────────────────────────────────────────────────────
    // Modeller
    // ───────────────────────────────────────────────────────────────────────────
    // Gemini 3 Flash — Gemini 2.5 Flash'ın yeni nesli.
    // GPQA: 90.4% (vs 82.8%), SWE-bench: 78% (vs 60.4%) → %15 genel iyileşme.
    // Input: $0.50/1M, Output: $3.00/1M (2.5 Flash'a göre %37 pahalı ama çok daha kaliteli).
    // İsim doğrulaması için: `adk models` komutu çalıştırılabilir.
    defaultModels: {
        autonomous: 'google-ai:gemini-3-flash',
        zai: 'google-ai:gemini-3-flash',
    },

    // ───────────────────────────────────────────────────────────────────────────
    // Bot State (Global Sabitler — adim4 Bot Variables eşdeğeri)
    // ───────────────────────────────────────────────────────────────────────────
    bot: {
        state: z.object({
            botName: z
                .string()
                .default('CARCAREAİ — MTS Kimya Ürün Danışmanı')
                .describe('Karşılama mesajında ve tanıtımda kullanılan bot adı'),
            storeUrl: z
                .string()
                .default('https://mtskimya.com')
                .describe('Mağaza ana sayfa URL\'si — ürün linklerinde kullanılır'),
            contactInfo: z
                .string()
                .default('mtskimya.com/pages/iletisim')
                .describe('Kapsam dışı (sipariş/kargo/iade) yönlendirmesi için iletişim sayfası'),
            supportScope: z
                .string()
                .default('Ürün danışmanlığı (sipariş, kargo, iade kapsam dışıdır)')
                .describe('Bot\'un kendi kapsamını hatırlaması için'),
        }),
    },

    // ───────────────────────────────────────────────────────────────────────────
    // User State
    // ───────────────────────────────────────────────────────────────────────────
    user: {
        state: z.object({}),
    },

    // ───────────────────────────────────────────────────────────────────────────
    // Secrets — cloud bot için zorunlu
    // ───────────────────────────────────────────────────────────────────────────
    // Local `adk dev` .env dosyasından okur; cloud deploy `adk secret:set` ile
    // değerleri Botpress Cloud'a yükler. Schema declaration olmadan secret cloud'a
    // gönderilmez — bot kırılır.
    secrets: {
        RETRIEVAL_SERVICE_URL: {
            description: 'Cloud retrieval microservice URL (Fly.io: https://detailagent-retrieval.fly.dev)',
        },
        RETRIEVAL_SHARED_SECRET: {
            description: 'Bearer token for retrieval-service /search /faq endpoints (min 16 chars)',
        },
    },

    // ───────────────────────────────────────────────────────────────────────────
    // Bağımlılıklar
    // ───────────────────────────────────────────────────────────────────────────
    // Webchat (Shopify), Slack vb. integration'lar buraya `adk add <name>` ile
    // eklenir. Şimdilik boş — `adk dev` ile lokal chat testi `adk chat` üzerinden
    // yapılır, channel: '*' ile tüm kanalları yakalar.
    dependencies: { "integrations": { "webchat": { "version": "webchat@0.3.0", "enabled": true }, "chat": { "version": "chat@1.0.0", "enabled": true } } },
});
