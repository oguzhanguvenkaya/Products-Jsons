/**
 * Phase 1.1 regression: rankBySpec(durability_months desc) bug fix.
 *
 * Eski searchByRating durability metric'i COALESCE(specs.ratings.durability,
 * durability_months/10) kullanıyordu — bu subjektif rating'i objektif ay
 * değerine baskı yapıyor, GYEON View EVO (rating 5, 24 ay) → sort key 5.0
 * ile INNOVACAR SINH (rating null, 48 ay → sort 4.8) üstüne çıkıyordu.
 *
 * Yeni rankBySpec doğrudan durability_months DESC sıralar — 48 ay olan
 * ürünler 24 ay'lık View EVO'nun YUKARISINDA olmalı.
 */
export default {
  name: 'rank-durability-months-top3',
  description: 'Phase 1.1: rankBySpec(durability_months) ile en dayanıklı seramik kaplama sıralaması — objektif ay değeri rating\'i geçer.',
  tags: ['phase-1.1', 'rank-by-spec', 'regression'],
  type: 'capability' as const,
  options: { idleTimeout: 30000 },
  conversation: [
    {
      user: 'En dayanıklı seramik kaplama hangisi? Top 3 göster.',
      assert: {
        response: [
          { contains: 'seramik' },
          {
            llm_judge:
              'Bot rankBySpec({sortKey: "durability_months", direction: "desc", templateGroup: "ceramic_coating", limit: 3}) çağırmalı. ' +
              'Sonuçta 48 ay (veya daha yüksek) dayanım sunan ürünler — INNOVACAR SINH, MX-PRO Diamond Pro, GYEON Syncro EVO 50 ay vb. — top 3\'te olmalı. ' +
              'GYEON View EVO (24 ay) top 3\'te OLMAMALI — 24 ay 48 ay\'dan kısa, sıralamada altta. ' +
              'Bot somut ay değerlerini (ör. "INNOVACAR SINH — 48 ay dayanım") metinde belirtmeli (rankValue tool output\'unda mevcut).',
          },
        ],
      },
    },
  ],
};
