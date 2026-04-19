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
    "Ürün başına 2,119 hazır SSS (sıkça sorulan soru) koleksiyonunda semantic " +
    "arama. Kullan: 'X ıslak kullanılır mı', 'X silikon içeriyor mu', " +
    "'X ile uyumlu mu', 'X pH kaç', 'X nasıl saklanır' gibi SPESİFİK TEKNİK " +
    "soru-cevap araması. Sonuçlar her bir ürünün ilgili SSS'ini döner (sku, " +
    "question, answer). searchProducts'tan farkı: bu FAQ'larda yazılı hazır " +
    "cevapları bulur, bulduğun cevabı aynen sunabilirsin.",
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
    // v9.1: SKU filter — varsa sadece o ürünün FAQ'ları aranır (context-aware)
    const filter = sku ? { sku: { $eq: sku } } : undefined;
    const res = await client.findTableRows({
      table: 'productFaqTable',
      search: query,
      filter,
      limit,
    });

    // v8.4: Confidence flag — düşük similarity FAQ'lerini hallucinate etmeyi önlemek için
    const topSim = Number(res.rows[0]?.similarity ?? 0);
    const confidence: 'high' | 'low' | 'none' =
      topSim >= 0.6 ? 'high' : topSim >= 0.4 ? 'low' : 'none';

    // v9.0: confidence='none' → results'u boşalt (bot hallucinate edemez)
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
