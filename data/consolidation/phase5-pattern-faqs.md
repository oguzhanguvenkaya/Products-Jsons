# Phase 5 — Pattern FAQ Raporu (Cross-SKU Birebir Tekrar)

> Snapshot: `_pre-commit-snapshot-20260423-044331`
> Toplam FAQ: 3156 | Pattern grupları (>=5 ürün): 72

## Strateji

Bu pattern'ler **kasıtlı template repetition** — instruction-driven RAG'de her ürün için core-set FAQ standardizasyonu (Phase 4 P7 önerisi). **SİLİNMESİN.** Önerilen evrim: `template_faqs` tablosu (gelecek faz):
- `pattern_id, question_template, answer_template, applies_to_template_group, applies_to_brand?`
- Render zamanı SKU bağlamıyla doldur (ürün adı, fiyat, varyant)
- Avantaj: 323 satır → ~30 template → 90% storage saving

## Top 30 Pattern

| Pattern (normalized) | Örnek soru | SKU sayısı | Toplam satır |
|---|---|---:|---:|
| `koku ne kadar süre kalıcıdır` | Koku ne kadar süre kalıcıdır? | 72 | 72 |
| `bu ürün nedir` | Bu ürün nedir? | 66 | 67 |
| `açıldıktan sonra ürün nasıl saklanır raf ömrü ne kadardır` | Açıldıktan sonra ürün nasıl saklanır? Raf ömrü ne kadardır? | 53 | 53 |
| `nereye uygulanır` | Nereye uygulanır? | 50 | 51 |
| `nasıl uygulanır` | Nasıl uygulanır? | 34 | 35 |
| `nasıl kullanılır` | Nasıl kullanılır? | 32 | 32 |
| `birden fazla kat uygulayabilir` | Birden fazla kat uygulayabilir miyim? | 26 | 30 |
| `ne kadar dayanır` | Ne kadar dayanır? | 22 | 23 |
| `çıkarılabilir` | Çıkarılabilir mi? | 19 | 19 |
| `solüsyonu agite etmem gerekir` | Solüsyonu agite etmem gerekir mi? | 18 | 18 |
| `bu ürünle kaplı bir araç nasıl bakım görür` | Bu ürünle kaplı bir araç nasıl bakım görür? | 18 | 19 |
| `ürünün kuruması/kürlenmesi ne kadar sürer` | Ürünün kuruması/kürlenmesi ne kadar sürer? | 17 | 18 |
| `kaç araç için yeterli` | Kaç araç için yeterli? | 13 | 13 |
| `hangi kimyasallarla uyumlu` | Hangi kimyasallarla uyumlu? | 12 | 13 |
| `üzerine ek kaplama uygulayabilir` | Üzerine ek kaplama uygulayabilir miyim? | 11 | 11 |
| `taban çapı nedir` | Taban çapı nedir? | 11 | 14 |
| `üzerine ek kaplama/wax/sealant uygulayabilir` | Üzerine ek kaplama/wax/sealant uygulayabilir miyim? | 11 | 11 |
| `hangi makinelerle kullanılır` | Hangi makinelerle kullanılır? | 10 | 11 |
| `ürün nasıl yıkanır/bakım görür` | Ürün nasıl yıkanır/bakım görür? | 9 | 9 |
| `hangi tabanlık boyutu gerekir` | Hangi tabanlık boyutu gerekir? | 9 | 9 |
| `hangi kimyasallar önerilmez` | Hangi kimyasallar önerilmez? | 9 | 9 |
| `köpük yapıcı mı` | Köpük yapıcı mı? | 9 | 10 |
| `boncuklanma kayboldu ne yapmalıyım` | Boncuklanma kayboldu, ne yapmalıyım? | 9 | 9 |
| `high spot görüyorum neden ve ne yapmalıyım` | High spot görüyorum — neden (ve ne yapmalıyım)? | 9 | 9 |
| `seyreltme oranı nedir` | Seyreltme oranı nedir? | 8 | 8 |
| `ne sıklıkla kullanmalıyım` | Ne sıklıkla kullanmalıyım? | 8 | 8 |
| `vent clip modellerden farkı nedir` | Vent clip modellerden farkı nedir? | 8 | 8 |
| `little joe paper serisi nedir` | Little Joe Paper serisi nedir? | 8 | 8 |
| `hangi makinelerle uyumlu` | Hangi makinelerle uyumlu? | 7 | 8 |
| `hangi pastalarla kullanılır` | Hangi pastalarla kullanılır? | 7 | 7 |

## Toplam Etki

- 72 pattern grup
- 859 toplam FAQ satırı (faqs tablosunun 27.2%'i)
- Template'leme yapılırsa: ~72 satır + render logic
