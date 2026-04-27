/**
 * Phase 1.1 yeni özellik: searchByPriceRange sortDirection desc.
 *
 * Eski tool sadece artan sıra döndürüyordu — "en pahalı seramik" sorusu
 * için kullanılamıyordu. Yeni sortDirection input ile asc/desc seçilebilir,
 * ORDER BY iki branch'te variant-aware (in-range MIN/MAX, primary fallback).
 */
export default {
  name: 'price-desc-en-pahali',
  description: 'Phase 1.1: searchByPriceRange(sortDirection: desc) ile en pahalı seramik kaplama listesi.',
  tags: ['phase-1.1', 'price-range', 'capability'],
  type: 'capability' as const,
  options: { idleTimeout: 30000 },
  conversation: [
    {
      user: 'En pahalı seramik kaplama hangileri?',
      assert: {
        response: [
          { contains: 'seramik' },
          {
            llm_judge:
              'Bot searchByPriceRange({templateGroup: "ceramic_coating", sortDirection: "desc", limit: 5-10}) çağırmalı. ' +
              'Sonuçlar fiyata göre AZALAN sıralı olmalı — en yüksek fiyatlı ürünler ilk sırada. ' +
              'Bot Carousel\'i yield etmeli ve metinde 1-2 cümle özet vermeli (fiyat aralığı belirtilebilir). ' +
              'Sadece "en ucuzları getirdim" gibi yanlış sıralama anlatımı YASAK.',
          },
        ],
      },
    },
  ],
};
