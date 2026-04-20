# Search Knowledge Bases Kartı — Ayar Rehberi

## Mevcut Ayarların Durumu (Görselden)

| Ayar | Mevcut Değer | Önerilen | Değiştir? |
|------|-------------|----------|-----------|
| Instructions | (boş) | Eklenmeli | ✅ EVET |
| Included KBs | All KBs selected | All KBs selected | ❌ Değiştirme, doğru |
| Result Type | breadcrumb | **full_content** | ✅ EVET |
| Tokens | 20 | 20 | ❌ Değiştirme, doğru |
| Context Depth | 2 | 2 | ❌ Değiştirme, doğru |
| Force thinking | OFF | OFF | ❌ Değiştirme |

---

## DEĞİŞİKLİK 1: Instructions Alanını Doldur

**Instructions (Optional)** kutusuna şunu yapıştır:

```
Kullanıcının sorusunu analiz et ve bilgi bankasından en ilgili ürün bilgilerini bul. Ürün adı, SKU, fiyat, teknik özellikler, kullanım talimatları ve ilişkili ürünler hakkında bilgi ara. Türkçe ve İngilizce sektör terimlerini (compound, polish, sealant, pH, SiO2, DA, PPF) dikkate al.
```

**Neden:** Bu talimat, arama motoruna hangi tür bilgileri araması gerektiğini söyler. Boş bırakılırsa arama daha genel ve daha az isabetli olur.

---

## DEĞİŞİKLİK 2: Result Type → full_content

**Mevcut:** `breadcrumb`
**Önerilen:** `full_content`

**Fark:**
- `breadcrumb`: Sadece kısa eşleşme parçacıkları döner (hızlı ama az bağlam)
- `full_content`: Eşleşen dokümanın tüm içeriğini döner (daha yavaş ama tam bilgi)

**Neden değiştirmeliyiz:**
- chatbot_md dosyaları yapılandırılmış markdown: ürün adı, fiyat, teknik tablo, kullanım, SSS hepsi bir arada
- `breadcrumb` modunda sadece eşleşen cümleyi döner, fiyat veya teknik bilgi eksik kalabilir
- `full_content` modunda tüm ürün bilgisi (fiyat dahil) LLM'e iletilir
- 622 ürün + teknik spec = doğruluk için tam bağlam gerekli

**Nasıl:**
1. "Result Type" yanındaki dropdown'a tıkla
2. `full_content` seç

---

## DİĞER AYARLAR — DEĞİŞTİRME

### Tokens (in thousands): 20
- 20K token = arama sonuçları için ayrılan maksimum token sayısı
- 622 ürünlük KB için yeterli
- Daha az yapma (bilgi eksik kalır), daha fazla yapma (maliyet artar)
- **20 ile devam et**

### Context Depth: 2
- Eşleşen chunk'ın etrafından kaç komşu chunk dahil edilecek
- 2 = eşleşmeden 2 chunk önce ve 2 chunk sonrasını da dahil eder
- Bizim markdown dosyalarında ürün bilgileri blok halinde, 2 yeterli
- **2 ile devam et**

### Force thinking: OFF
- Açarsan bot her aramada "düşünme" adımı ekler (daha yavaş ama debug için faydalı)
- Şu an kapalı bırak, test aşamasında sorun çıkarsa aç
- **OFF ile devam et**

---

## UYARI: "All KBs selected" AMA Arama Çalışmıyor

Görselde "All KBs selected" görünüyor ama önceki testte "No knowledge bases were included in the search" hatası aldın.

Bu, **KB'lerin kendisinin sorunlu** olduğu anlamına gelir (kart ayarı doğru, ama KB boş veya indekslenmemiş).

### Şimdi kontrol et:

1. Sol menüden **Knowledge Bases** sayfasına git
2. Kaç KB görüyorsun? İsimleri ne?
3. Her KB'nin durumu **"Ready"** mı?
4. Her KB'ye tıklayıp içinde kaynak (source/dosya) var mı bak

**Muhtemel senaryolar:**

| Durum | Anlam | Çözüm |
|-------|-------|-------|
| KB listesi boş | Hiç KB oluşturulmamış | KB oluştur ve dosyaları yükle |
| KB var ama "Processing" | İndeksleme devam ediyor | Bekle (birkaç dakika sürebilir) |
| KB var ama "Error" | Yükleme/indeksleme hatası | Kaynakları sil ve tekrar yükle |
| KB var, "Ready", kaynak var | Kart bağlantısı sorunu | Kartı sil ve yeniden ekle |

### Eğer KB'ler Ready durumundaysa ama hâlâ çalışmıyorsa:
1. Search Knowledge kartını **sil**
2. Autonomous Node'a yeni bir **Search Knowledge** kartı ekle
3. "All KBs selected" seç
4. Result Type: full_content
5. Tekrar test et

---

## ÖZET — YAPILACAKLAR

```
1. Instructions alanına talimat metni yapıştır
2. Result Type → full_content olarak değiştir
3. Kaydet
4. KB durumunu kontrol et (Ready mi?)
5. Emulator'da "GYEON şampuan öner" testini tekrarla
```
