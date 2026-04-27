export default {
  name: 'gy30-05-g5-gyeon-self-cleaning-top3',
  description: '30Q test g5: Self-cleaning performansı en yüksek üç seramik kaplama?',
  tags: ['gy30', 'gy30-priority'],
  type: 'capability' as const,
  options: { idleTimeout: 30000 },
  conversation: [
    {
      user: 'Self-cleaning performansı en yüksek üç seramik kaplama?',
      assert: {
        response: [
          { contains: 'seramik' },
          { llm_judge: 'Bot rankBySpec({sortKey: "rating_self_cleaning", direction: "desc", templateGroup: "ceramic_coating", limit: 3}) çağırmalı ve self-cleaning puanı en yüksek 3 seramik kaplamayı listelemeli (Mohs EVO, View EVO, Pure EVO gibi). Sadece 1-2 ürün öneri YETERSİZ. Eğer coverageNote dolu ise (rating_* sınırlı kapsam uyarısı) bot bunu metinde iletmeli.' },
        ],
      },
    },
  ],
};
