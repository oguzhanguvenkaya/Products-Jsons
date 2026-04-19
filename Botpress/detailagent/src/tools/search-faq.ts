import { Autonomous, z, client } from '@botpress/runtime';

/**
 * searchFaq — Ürün başına SSS (2,119 kayıt) üzerinde semantic arama.
 *
 * productFaqTable'da `searchable: true` olan `sku`, `question`, `answer`
 * kolonları üzerinde findTableRows({ search }) ile semantic eşleştirme yapar.
 *
 * Bu tool, kullanıcı "X kullanılabilir mi", "X ile uyumlu mu", "X silikon
 * içeriyor mu" gibi NÜANSLI teknik sorular sorduğunda devreye girer.
 *
 * Ana searchProducts'tan farkı: sorgu ürün sorusu değil, ürün ÖZELLİĞİ veya
 * kullanım nüansı sorusu. FAQ cevapları zaten hazır, LLM'in yorumlamasına
 * gerek yok — direkt SSS'ten cevap çıkarılır.
 */
export const searchFaq = new Autonomous.Tool({
  name: 'searchFaq',
  description:
    "FAQ koleksiyonunda semantic arama. ⚠️ KISITLI KULLANIM: Bu tool'u SADECE " +
    "ürün bilinmiyor veya cross-product genel konuda kullan. " +
    "\n\n❌ KULLANMA durumları (bu durumda getProductDetails kullan):" +
    "\n - Spesifik bir ürün soruluyorsa (Pure EVO, CanCoat, Bathe vb.)" +
    "\n - state.lastFocusSku DOLU ise (o ürünün tüm FAQ'ları getProductDetails.faqs'tan gelir)" +
    "\n - Kullanıcı 'bu ürün' veya 'X ürünü' diyorsa" +
    "\n\n✅ KULLAN durumları:" +
    "\n - Kullanıcı bir ürün belirtmeden genel 'silikon içerir mi' / 'ıslak yüzey' soruyor" +
    "\n - Cross-brand karşılaştırma 'hangi marka silikonsuz'" +
    "\n - Marka-genel sorular (_BRAND:*, _CAT:* prefix'leri)" +
    "\n\nSKU BİLİYORSAN sku parametresi ZORUNLU. SKU olmadan çağrı yanlış ürün " +
    "cevabı riski taşır.",
  input: z.object({
    query: z
      .string()
      .describe(
        "FAQ araması için kullanıcı sorusunun doğal dil hali " +
          "(ör: 'wetcoat ıslak yüzeyde mi kullanılır', 'Menzerna 300 silikon içerir mi')",
      ),
    sku: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Opsiyonel SKU filtresi. Kullanıcı spesifik bir ürün hakkında soru soruyorsa " +
          "(state.lastFocusSku veya yeni searchProducts sonucu), bu SKU'yu geç. " +
          "FAQ araması SADECE o ürünün FAQ'ları içinde yapılır — yanlış ürün cevabı gelmez.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe('Döndürülecek maksimum SSS sayısı (varsayılan 5)'),
  }),
  output: z.object({
    results: z.array(
      z.object({
        sku: z.string(),
        question: z.string(),
        answer: z.string(),
        similarity: z.number().nullable(),
      }),
    ),
    totalReturned: z.number().int(),
    topSimilarity: z.number().nullable().describe('En yüksek similarity skoru (0-1)'),
    confidence: z
      .enum(['high', 'low', 'none'])
      .describe(
        "Top result'un güvenilirliği: high (≥0.6), low (0.4-0.6), none (<0.4).",
      ),
    recommendation: z
      .string()
      .describe(
        "LLM için kullanım talimatı. Bot bu alanı okuyup confidence'a göre davranmalı.",
      ),
  }),
  async handler({ query, sku, limit }) {
    // v9.2: SKU provided → tüm FAQ'ları döndür (semantic ranking'i bypass et).
    // Kullanıcı'nın önerisi: "ürünün TÜM FAQ'larını getir, LLM içinden seçsin".
    // Semantic top-N kurnazca yanlış FAQ'ı seçebiliyor ("iki kat" vs "açık havada" gibi).
    if (sku) {
      const allFaqs = await client.findTableRows({
        table: 'productFaqTable',
        filter: { sku: { $eq: sku } } as any,
        limit: 50,
      });
      const results = allFaqs.rows.map((r) => ({
        sku: r.sku as string,
        question: r.question as string,
        answer: r.answer as string,
        similarity: null,
      }));
      return {
        results,
        totalReturned: results.length,
        topSimilarity: null,
        confidence: 'high' as const,
        recommendation:
          "SKU filter aktif: bu ürünün TÜM FAQ'ları döndü (semantic ranking yok). " +
          'İçinden kullanıcının sorusuna EN UYGUN soruyu SEN seç ve cevabı sun. ' +
          'Hiç uygun FAQ yoksa "bu konuda FAQ\'de net bilgi yok" de.',
      };
    }

    // SKU yok → semantic arama (cross-product, _CAT:*, _BRAND:* için)
    const res = await client.findTableRows({
      table: 'productFaqTable',
      search: query,
      limit,
    });

    const topSim = Number(res.rows[0]?.similarity ?? 0);
    const confidence: 'high' | 'low' | 'none' =
      topSim >= 0.6 ? 'high' : topSim >= 0.4 ? 'low' : 'none';

    const rawResults = res.rows.map((r) => ({
      sku: r.sku as string,
      question: r.question as string,
      answer: r.answer as string,
      similarity: (r.similarity as number | null) ?? null,
    }));
    const results = confidence === 'none' ? [] : rawResults;

    const recommendation = {
      high: 'Cevabı doğal Türkçe cümleye çevirip direkt sun.',
      low: "Cevabı 'En yakın SSS şunu söylüyor:' disclaimer ile sun; kullanıcı doğrulamalı. Eğer kullanıcının sorusu sayısal teknik değer (pH, km, ay, ml) ise FAQ'yı ATLA, getProductDetails ile technicalSpecs'ten oku.",
      none:
        "FAQ'de anlamlı eşleşme YOK — results BOŞ. Bu durumda: sayısal/teknik değer sorgusu ise searchProducts + getProductDetails kullan. Nüanslı kullanım/uyumluluk sorusu ise 'bu konuda net bilgim yok' de ve ürünün resmi FAQ portalına yönlendir.",
    }[confidence];

    return {
      results,
      totalReturned: results.length,
      topSimilarity: res.rows[0]?.similarity ?? null,
      confidence,
      recommendation,
    };
  },
});
