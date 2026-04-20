# Search Knowledge — Result Type Seçenekleri

## Mevcut Seçenekler

| Result Type | Tahmini Davranış | Kullanım |
|-------------|-----------------|----------|
| `breadcrumb` | Eşleşen kısa parçacıklar (snippet) döner. Heading/başlık yolunu gösterir. En kompakt format. | Hızlı, kısa cevaplar için |
| `consolidation` | Aynı kaynaktan gelen birden fazla eşleşmeyi birleştirir/konsolide eder. Daha kapsamlı bağlam sağlar. | **Detaylı ürün bilgisi için EN UYGUN** |
| `none` | Ham chunk'ları olduğu gibi döner, post-processing yapmaz. | Debug veya özel işleme için |

## Tavsiye: `consolidation` Seç

### Neden:
- chatbot_md dosyalarında her ürün bölümlere ayrılmış: ürün adı, fiyat, teknik tablo, kullanım talimatı, SSS
- `breadcrumb` modunda sadece eşleşen küçük parça döner (ör: sadece fiyat satırı, teknik özellikler eksik)
- `consolidation` modunda aynı dosyadan/üründen birden fazla eşleşme varsa bunları birleştirir
- Bot'a daha kapsamlı ürün bilgisi gider → daha doğru ve detaylı yanıt

### Değişiklik:
1. Search Knowledge kartında **Result Type** → `consolidation` seç
2. Kaydet
3. Publish et

### Not:
- `breadcrumb` şu an çalışıyorsa ve sonuçlardan memnunsan, bunu da deneyip karşılaştırabilirsin
- `consolidation` daha fazla token tüketir ama daha kaliteli sonuç verir
- Token limiti (20K) yeterli, endişe yok
