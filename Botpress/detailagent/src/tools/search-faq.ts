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
  }),
  async handler({ query, limit }) {
    const res = await client.findTableRows({
      table: 'productFaqTable',
      search: query,
      limit,
    });

    return {
      results: res.rows.map((r) => ({
        sku: r.sku as string,
        question: r.question as string,
        answer: r.answer as string,
        similarity: (r.similarity as number | null) ?? null,
      })),
      totalReturned: res.rows.length,
    };
  },
});
