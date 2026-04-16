import { z, defineConfig } from '@botpress/runtime';

/**
 * CARCAREAİ — MTS Kimya Ürün Danışmanı
 *
 * Otomotiv detailing & profesyonel oto bakım ürünleri için Türkçe konuşan
 * ürün danışmanı. 622 ürün, 24 kategori, 9 marka (GYEON, Menzerna, FRA-BER,
 * Innovacar, MG PADS, Q1 Tapes, MX-PRO, SGCB, EPOCA).
 *
 * Bot Studio'daki mevcut visual versiyonun TypeScript karşılığı.
 * Kapsam: SADECE ürün danışmanlığı (sipariş/kargo/iade kapsam dışı).
 */
export default defineConfig({
    name: 'detailagent',
    description:
        "MTS Kimya yapay zeka ürün danışmanı — profesyonel oto detailing, polisaj, seramik kaplama, yıkama ve bakım ürünleri için Türkçe ürün önerisi, karşılaştırma ve uygulama rehberliği.",

    // ───────────────────────────────────────────────────────────────────────────
    // Modeller
    // ───────────────────────────────────────────────────────────────────────────
    // Studio'daki mevcut bot google-ai:gemini-2.5-flash kullanıyor.
    // 'fast' alias'ı Botpress Cloud üzerinden hızlı/ekonomik modele yönlendirir.
    // İsim doğrulaması için: `adk models` komutu çalıştırılabilir.
    defaultModels: {
        autonomous: 'google-ai:gemini-2.5-flash',
        zai: 'google-ai:gemini-2.5-flash',
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
    // Bağımlılıklar
    // ───────────────────────────────────────────────────────────────────────────
    // Webchat (Shopify), Slack vb. integration'lar buraya `adk add <name>` ile
    // eklenir. Şimdilik boş — `adk dev` ile lokal chat testi `adk chat` üzerinden
    // yapılır, channel: '*' ile tüm kanalları yakalar.
    dependencies: { "integrations": { "webchat": { "version": "webchat@0.3.0", "enabled": true } } },
});
