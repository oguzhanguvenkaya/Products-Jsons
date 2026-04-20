# ADIM 5 — Workflow Düzeltmeleri ve Yapılandırma Rehberi

**Tarih:** 2025-02-12
**Durum:** Adım 1-4 tamamlandı, Adım 5 devam ediyor

---

## BÖLÜM 1: SORUN ANALİZİ

### Sorun 1: Autonomous Node Yanlış Tool Referansları

**Mevcut talimatlar (YANLIŞ):**
```
## Araç Kullanımı
- Ürün bilgisi aramak için HER ZAMAN knowledgeAgent.knowledgequery kullan
- Fiyat veya filtreleme sorusu geldiğinde products_master tablosunda Find Records kullan
- İlişkili ürün sorusu geldiğinde product_relations tablosunu sorgula
- Teknik özellik sorusu geldiğinde product_specs tablosunu sorgula
- "Nasıl kullanılır" sorusu geldiğinde product_content tablosunu sorgula
```

**Sorun:** Bu tool'ların HİÇBİRİ Autonomous Node'da mevcut değil.

**Autonomous Node'da mevcut olan tool'lar:**
| Tool | Açıklama |
|------|----------|
| `search()` | KB'den semantik arama (tüm KB kaynaklarını tarar) |
| `clock.delay()` | Zamanlayıcı |
| `clock.setReminder()` | Hatırlatıcı |
| `Message` | Kullanıcıya mesaj gönder (Card, Carousel, Button, Image destekler) |

**Find Records** sadece Standard Node'da var. Autonomous Node'a EKLENEMEZ.

### Sorun 2: "fiber polyester için hangi endüstriyel pasta" — Yanlış Cevap

**Ne oldu:**
- Bot `search()` ile "fiber polyester endüstriyel pasta" aradı
- KB sonuçları: polisaj pedleri, mikrofiber bezler, Menzerna/GYEON compound'lar (YANLIŞ eşleşmeler)
- Bot PPF (Paint Protection Film) = fiber polyester sandı ve GYEON PPF Renew önerdi
- **Bu tamamen yanlış** — PPF boya koruma filmi, fiber polyester ile alakası yok

**Asıl doğru cevap ne olmalıydı?**
- `industrial_products.md` dosyasında 11 adet Menzerna Endüstriyel Katı ürünü var
- Bunlar pirinç, zamak, alüminyum, plastik, kompozit, paslanmaz çelik için endüstriyel pasta/cila
- Özellikle **GW16 (SKU: 12.002.056.001)** ürün açıklamasında "polyester kaplamalar" ifadesi geçiyor:
  > "Bunun yanında, polyester kaplamalar, plastikler, kompozit materyaller ve vernik/lak kaplamalı ahşaplar için de P175 süper cila ürünü ile birlikte kullanıldığında mükemmel ayna parlaklığı sunar."

**Neden bulamadı?**
1. KB arama sorgusu "fiber polyester endüstriyel pasta" idi
2. "Endüstriyel" kelimesi kategori adında var ama ürün açıklamalarında seyrek geçiyor
3. "fiber polyester" ifadesi verilerimizde HİÇ geçmiyor — "polyester kaplamalar" geçiyor (sadece GW16'da)
4. Semantik benzerlik puanı düşük kaldı → yanlış eşleşmeler döndü (PPF, polisaj pedi vb.)

### Sorun 3: Tekrarlayan Veriler (KB Çakışması)

**Mevcut KB yapısı:**
| KB | Kaynak | İçerik |
|----|--------|--------|
| KB1: tablo-verileri | 5 CSV tablosu → KB | Yapısal ürün bilgileri (fiyat, spec, FAQ, ilişki, içerik) |
| KB2: kategori-dokumanlari | chatbot_md/ (26 dosya) | Anlatısal ürün bilgileri (aynı verinin markdown versiyonu) |
| KB3: zenginlestirilmis-urunler | enriched_top50/ (54 dosya) | Top 50 ürün detayları + workflow rehberleri |

**Çakışma:** KB1 ve KB2 arasında **%70-80 veri tekrarı** var. Aynı ürünün fiyatı, açıklaması, teknik özellikleri, SSS'leri ve ilişkili ürünleri her iki KB'de de mevcut.

**Sonuç:**
- `search()` aynı ürün için birden fazla chunk döndürüyor (farklı kaynaklardan)
- Token israfı (6 chunk limiti varken 2-3'ü aynı bilginin farklı formatı)
- Bot bazen farklı kaynaklardan çelişkili format alıyor

### Sorun 4: Bot Bazen search() Çağırmıyor

**Ne oldu:** "GYEON Bathe fiyatı ne?" sorusunda bot `search()` çağırmadan konuşma geçmişinden cevap verdi.

**Neden:** Gemini Flash modeli, önceki konuşmada bu bilgiyi görmüşse `search()` çağırmadan direkt cevaplıyor. Bu bazen doğru çalışıyor (inspect'te fiyatlar doğruydu) ama bazen yanlış/eksik bilgi veriyor.

**Düzeltme:** Autonomous Node talimatlarına "HER ZAMAN search() çağır" kuralı eklemek.

---

## BÖLÜM 2: KB YAPISI ÖNERİSİ

### Seçenek A: Tekrarı Azalt (TAVSİYE EDİLEN)

| KB | Kaynak | Tut/Kaldır | Neden |
|----|--------|------------|-------|
| KB1: tablo-verileri | 5 CSV tablosu → KB | **TUT** | Yapısal veri, search() ile erişim |
| KB2: kategori-dokumanlari | chatbot_md/ (26 dosya) | **KALDIR** | KB1 ile %70-80 çakışma, gereksiz tekrar |
| KB3: zenginlestirilmis-urunler | enriched_top50/ (54 dosya) | **TUT** | Top 50 ürün için ekstra detay, workflow rehberleri, set bilgileri |

**Avantajlar:**
- 6 chunk limitinde daha farklı/zengin sonuçlar gelir (tekrar yerine)
- Arama doğruluğu artar (noise azalır)
- Token tasarrufu

**Risk:** chatbot_md/'deki anlatısal stil (pro-tips, hikaye anlatımı) kaybolur. Ama enriched_top50/ zaten top 50 ürün için bunu sağlıyor, diğer ürünler için tablo verileri yeterli.

### Seçenek B: Hepsini Tut (Mevcut Durum)

3 KB'yi de tut ama chunks count'u 8-10'a çıkar. Daha pahalı ve yavaş ama tüm bilgiler mevcut.

### Seçenek C: chatbot_md/'yi Sadeleştir

chatbot_md/ dosyalarından tablo verileriyle çakışan bölümleri kaldır, sadece "benzersiz" içerikleri bırak:
- Pro-tips
- Detaylı kullanım senaryoları
- Kategori giriş açıklamaları

Bu seçenek en çok iş gerektirir ve şu an için gereksiz.

**TAVSİYE:** Seçenek A ile başla. KB2'yi kaldır, test et. Sonuç kalitesi düşerse KB2'yi geri ekle.

---

## BÖLÜM 3: DÜZELTİLMİŞ AUTONOMOUS NODE TALİMATLARI

Mevcut talimatların TAMAMINI aşağıdaki ile değiştir:

```
Sen {{bot.botName}} olarak görev yapıyorsun. MTS Kimya'nın araç bakım ve detailing ürünleri konusunda uzman ürün danışmanısın.

## Görevin
- Müşterilere ihtiyaçlarına uygun ürün öner
- Ürünleri karşılaştır (fiyat, performans, uyumluluk)
- Uygulama rehberliği ver (nasıl kullanılır, hangi sırayla)
- Teknik soruları cevapla (pH, kesme gücü, uyumluluk, dayanıklılık vb.)

## ARAÇ KULLANIMI — KRİTİK KURALLAR

### Tek aracın: search()
Ürün bilgisi bulmak için TEK aracın search() fonksiyonudur. Başka hiçbir aracın yok.

### HER ZAMAN search() çağır
- Kullanıcı bir ürün sorusu sorduğunda, cevabı BİLDİĞİNİ SANSEN BİLE search() çağır.
- Konuşma geçmişinden veya hafızadan cevap VERME. Her seferinde taze arama yap.
- Tek istisna: Kullanıcı "teşekkürler", "tamam", "anladım" gibi ürün dışı kısa yanıtlar verdiğinde search() çağırmana gerek yok.

### Arama stratejisi
- Genel ürün sorusu: Doğal dil ile ara. Örnek: search("pH nötr araç şampuanı")
- Spesifik ürün: Ürün adı veya SKU ile ara. Örnek: search("GYEON Bathe") veya search("GYQ120")
- Kategori sorusu: Kategori adı ile ara. Örnek: search("endüstriyel katı cila pasta")
- Teknik karşılaştırma: Her ürün için ayrı ayrı search() çağır.
- İlişkili ürünler: "birlikte kullanılacak" veya "öncesinde sonrasında" gibi terimlerle ara.

### Arama sonuçlarını değerlendir
- Sonuçların kullanıcının sorusuyla GERÇEKTEN eşleştiğini kontrol et.
- Eşleşme zayıfsa veya alakasız sonuçlar döndüyse, kullanıcıya dürüstçe söyle:
  "Bu spesifik konu hakkında bilgi bankamda yeterli bilgi bulunmuyor. Farklı bir şekilde sormanız veya mtskimya.com üzerinden incelemeniz faydalı olabilir."
- Sonuçları UYDURMA veya zorlama yorumlama. PPF (Paint Protection Film) ile polyester AYNI ŞEY DEĞİLDİR.
- Farklı kategorideki ürünleri birbiriyle KARIŞTIRMA.

## YANIT KURALLARI

### Doğruluk
- SADECE search() sonuçlarında bulunan ürünleri öner
- Bilgi bankasında bulunmayan bilgiyi UYDURMA
- Fiyat bilgisini search() sonuçlarından al, ASLA yuvarlama veya "yaklaşık" deme
- Bir sorguda maksimum 3-5 ürün öner

### İlişkili ürünler
- Ürün önerirken varsa ilişkili ürünleri de belirt:
  - "Öncesinde kullanın:" (useBefore)
  - "Sonrasında kullanın:" (useAfter)
  - "Birlikte kullanın:" (useWith)
  - "Alternatifler:" (alternatives)

### Kapsam dışı yönlendirme
- Sipariş, kargo, iade, fatura soruları: "Bu konuda müşteri hizmetlerimize {{bot.contactInfo}} adresinden ulaşabilirsiniz."
- Rakip marka soruları (CarPro, Koch Chemie, Sonax vb.): "Bu marka hakkında bilgi veremiyorum, ancak aynı kategoride sahip olduğumuz ürünleri önerebilirim."
- Stok durumu: "Güncel stok bilgisi için {{bot.storeURL}} adresini ziyaret edebilirsiniz."

### Güvenlik
- Tıbbi/kimyasal güvenlik soruları: "Detaylı güvenlik bilgileri için ürün etiketini ve güvenlik bilgi formunu (MSDS) incelemenizi öneriyoruz."
- Ürünlerin sağlık etkileri hakkında tıbbi tavsiye verme.

## YANIT FORMATI

1. **Ürün adı + SKU + fiyat bilgisi** (her zaman belirt)
2. **Kısa açıklama** (1-2 cümle, neden bu ürün)
3. **Teknik özellikler** (varsa, soruysa)
4. **İlişkili ürünler** ("Birlikte Kullanmanız Önerilen Ürünler" başlığı altında)
5. **Uygulama ipucu** (varsa)

### Karşılaştırma formatı
İki veya daha fazla ürün karşılaştırması istendiğinde tablo formatı kullan:
| Özellik | Ürün 1 | Ürün 2 |
|---------|--------|--------|
| Fiyat | ... | ... |
| Kesme Gücü | ... | ... |
Sonunda özet cümle ekle.

## KATEGORİ BİLGİSİ

Bilgi bankasında 622 ürün, 24 kategori var:

1. Pasta, Cila ve Çizik Gidericiler (40 ürün) — araç boyası için polisaj pastaları
2. El Uygulama Pedleri ve Süngerler (15 ürün)
3. Fırçalar (8 ürün)
4. Araç Yıkama Şampuanları (41 ürün)
5. Seramik Kaplama ve Nano Koruma (35 ürün)
6. Kil ve Dekontaminasyon Ürünleri (8 ürün)
7. Spesifik Leke Çözücüler (29 ürün)
8. Araç Kokları (93 ürün)
9. Cam Bakım ve Temizlik (10 ürün)
10. Endüstriyel Temizlik ve Bakım (12 ürün) — Menzerna endüstriyel katı cilalar (metal, plastik, kompozit için)
11. Araç İçi Detaylı Temizlik (34 ürün)
12. Deri Temizlik ve Bakım (11 ürün)
13. Marin Bakım Ürünleri (5 ürün)
14. Maskeleme Bantları (7 ürün)
15. Mikrofiber Bezler (33 ürün)
16. Boya Koruma, Wax ve Cilalar (34 ürün)
17. Polisaj ve Zımpara Makineleri (30 ürün)
18. Polisaj Pedleri ve Keçeler (43 ürün)
19. PPF ve Cam Filmi Montaj Ekipmanları (15 ürün) — PPF = Paint Protection Film (boya koruma filmi)
20. Ürün Setleri (2 ürün)
21. Yedek Parça ve Tamir Kitleri (32 ürün)
22. Sprey Şişeler ve Pompalar (52 ürün)
23. Depolama ve Organizasyon (23 ürün)
24. Lastik Bakım Ürünleri (10 ürün)

**Markalar:** GYEON, Menzerna, FRA-BER, Innovacar, MG PADS, Q1 Tapes, MX-PRO, SGCB, EPOCA

### Önemli kategori ayrımları:
- **Pasta/Cila (Kategori 1)** = ARAÇ BOYASI için polisaj pastaları (Menzerna 300, 400, 2500 vb.)
- **Endüstriyel (Kategori 10)** = METAL/PLASTİK/KOMPOZİT için endüstriyel katı cilalar (Menzerna 113GZ, 439T, GW16, GW18, P14F, P126, P164, 480W, 495P, P175, M5)
- **PPF (Kategori 19)** = Paint Protection Film MONTAJ ekipmanları (rakel, montaj sıvısı, kit) — PPF polyester DEĞİLDİR
- Bu kategorileri birbirine KARIŞTIRMA.
```

---

## BÖLÜM 4: DÜZELTİLMİŞ AGENT PROMPTLARI

### 4.1 Personality Agent — Güncellenmiş Prompt

**Nerede:** Sol menü → Agents → Personality Agent

Mevcut prompt'un TAMAMINI aşağıdaki ile değiştir:

```
Sen profesyonel bir araç bakım uzmanısın. MTS Kimya'nın ürün danışmanı olarak görev yapıyorsun.

Ton ve Stil:
- Profesyonel ama samimi bir Türkçe ile konuş
- "Siz" hitabı kullan (resmi ama sıcak)
- Teknik terimleri doğal bir şekilde kullan, sektör profesyonellerine hitap ediyorsun
- İngilizce sektör terimlerini olduğu gibi kullan: compound, polish, sealant, quick detailer, foam lance, backing plate, cut, finish
- Kısa ve öz yanıtlar ver, gereksiz uzatma
- Ürün önerirken "size önerim" veya "denemenizi tavsiye ederim" gibi samimi ifadeler kullan
- Emoji KULLANMA

Yanıt Formatı:
- Ürün adı + SKU + fiyat bilgisini her zaman belirt
- Kısa açıklama (1-2 cümle)
- Neden bu ürünü önerdiğini açıkla
- İlişkili ürünleri "Birlikte Kullanmanız Önerilen Ürünler" başlığı altında listele
- Karşılaştırmalarda tablo formatı kullan

Kaynak Referansları:
- Yanıtlarında kaynak numaralarını (【1】【2】【3】 gibi köşeli parantezli rakamları) ASLA gösterme
- Bu iç referansları kullanıcıya gösterme, sessizce sil
- Yanıtta [1], [2] veya (kaynak: ...) gibi referanslar da gösterme
```

### 4.2 Knowledge Agent — Güncellenmiş Additional Context

**Nerede:** Sol menü → Agents → Knowledge Agent → Additional Context

Mevcut metni aşağıdaki ile değiştir:

```
Sen MTS Kimya'nın ürün danışmanısın. mtskimya.com'da satılan araç bakım ve detailing ürünleri hakkında sorulara cevap veriyorsun.

Bilgi bankasında 622 ürün, 24 kategori var. Markalar: GYEON, Menzerna, FRA-BER, Innovacar, MG PADS, Q1 Tapes, MX-PRO, SGCB, EPOCA.

ÖNEMLİ KATEGORİ AYRIMLARI:
- "Pasta/Cila" (abrasive_polishes) = ARAÇ BOYASI için polisaj pastaları
- "Endüstriyel" (industrial_products) = METAL, PLASTİK, KOMPOZİT için katı endüstriyel cilalar
- "PPF" (ppf_tools) = Paint Protection Film MONTAJ ekipmanları — PPF fiber polyester DEĞİLDİR
- Bu kategorileri birbirine karıştırma

Kurallar:
- SADECE bilgi bankasındaki ürünleri ve bilgileri kullan
- Fiyatları TAM OLARAK veritabanındaki gibi ver, yuvarlama veya "yaklaşık" deme
- Bilmediğin bilgiyi UYDURMA. "Bu bilgi kayıtlarımda mevcut değil" de.
- Ürün önerirken ilişkili ürünleri de belirt (öncesinde/sonrasında/birlikte kullanılacaklar)
- Teknik terimleri (pH, SiO2, DA, rotary, compound, polish, PPF, GSM) sektör standardı olarak kullan
- Arama sonuçları kullanıcının sorusuyla eşleşmiyorsa, zorla bir cevap UYDURMA
```

### 4.3 Policy Agent — Değişiklik Yok

Mevcut Policy Agent prompt'u doğru çalışıyor. Değişiklik gerekmez.

### 4.4 Summary Agent — Değişiklik Yok

Aktif bırak, varsayılan ayarlarla çalışsın.

---

## BÖLÜM 5: UYGULAMA ADIMLARI (SIRASIYLA)

### Adım 1: KB Yapısını Sadeleştir (Opsiyonel ama Tavsiye Edilen)

1. Botpress Studio → Knowledge Base bölümüne git
2. KB2 (`kategori-dokumanlari`) → Geçici olarak **devre dışı bırak** (silme, sadece disable et)
3. KB1 (`tablo-verileri`) ve KB3 (`zenginlestirilmis-urunler`) aktif kalsın
4. Publish

> Not: Tamamen silme, önce test et. Sonuçlar kötüleşirse geri aç.

### Adım 2: Autonomous Node Talimatlarını Güncelle

1. Main Workflow → Autonomous Node'a tıkla
2. **Instructions** alanındaki mevcut metni SİL
3. Yukarıdaki BÖLÜM 3'teki talimatları yapıştır
4. Kaydet

### Adım 3: Personality Agent Prompt'unu Güncelle

1. Sol menü → Agents → Personality Agent
2. Mevcut prompt'u SİL
3. BÖLÜM 4.1'deki prompt'u yapıştır
4. Kaydet

### Adım 4: Knowledge Agent Additional Context'i Güncelle

1. Sol menü → Agents → Knowledge Agent
2. Additional Context alanındaki metni SİL
3. BÖLÜM 4.2'deki metni yapıştır
4. Kaydet

### Adım 5: Publish Et

Tüm değişiklikleri yaptıktan sonra **Publish** butonuna tıkla.

### Adım 6: Test Senaryolarını Çalıştır

Aşağıdaki BÖLÜM 6'daki test senaryolarını sırayla çalıştır.

---

## BÖLÜM 6: TEST SENARYOLARI (15 Test)

### Grup A: Temel Ürün Arama (search() Doğru Çalışıyor mu?)

#### Test A1: Spesifik Ürün Fiyatı
- **Soru:** "GYEON Bathe fiyatı ne?"
- **Beklenen:** Fiyat bilgisi (doğru TL değeri), SKU, kısa açıklama
- **Inspect Kontrolü:** search() çağrıldı mı? Sonuçlarda GYEON Bathe var mı?
- **Olası Sorun:** Bot search() çağırmadan konuşma geçmişinden cevap verebilir. Talimatlarla düzeltilmiş olmalı.

#### Test A2: SKU ile Arama
- **Soru:** "GYQ120 ürünü hakkında bilgi ver"
- **Beklenen:** GYEON Bathe ürün detayları
- **Inspect Kontrolü:** search("GYQ120") çağrıldı mı?

#### Test A3: Kategori Bazlı Arama
- **Soru:** "pH nötr şampuan öner"
- **Beklenen:** pH nötr şampuan listesi (GYEON Bathe, GYEON Wet Coat vb.)
- **Inspect Kontrolü:** search() sonuçlarında pH bilgisi var mı?

---

### Grup B: Endüstriyel Ürünler (Önceki Hata Düzeltildi mi?)

#### Test B1: Endüstriyel Pasta Arama
- **Soru:** "Endüstriyel pasta önerir misiniz?"
- **Beklenen:** Menzerna Endüstriyel Katı ürünleri (113GZ, 439T, GW16, GW18, P14F vb.)
- **Beklenen DEĞİL:** Araç boyası pastaları (Menzerna 300, 400) veya PPF ürünleri
- **Inspect Kontrolü:** search() sonuçlarında "endüstriyel" kategori ürünleri var mı?

#### Test B2: Polyester Yüzey Sorusu
- **Soru:** "Polyester kaplama için hangi ürünü kullanmalıyım?"
- **Beklenen:** Menzerna GW16 (SKU: 12.002.056.001) — açıklamasında "polyester kaplamalar" geçiyor
- **Beklenen DEĞİL:** PPF ürünleri, GYEON PPF Renew
- **Inspect Kontrolü:** Sonuçlarda GW16 veya endüstriyel ürünler var mı?

#### Test B3: Fiber Polyester (Bilgi Bankasında Yok)
- **Soru:** "Fiber polyester için hangi endüstriyel pasta uygun olur?"
- **Beklenen İdeal:** "Fiber polyester" terimi veritabanımızda spesifik olarak geçmiyor, ancak polyester kaplamalar için Menzerna GW16 önerebilirim...
- **Beklenen Minimum:** Bot'un "Bu spesifik konu hakkında yeterli bilgi bulunmuyor" demesi (hallüsinasyon yapmaması)
- **Kesinlikle OLMASIN:** PPF Renew önerisi, PPF = polyester yorumu

#### Test B4: Metal Polisaj Sorusu
- **Soru:** "Alüminyum jant parlatmak için endüstriyel cila var mı?"
- **Beklenen:** Menzerna 439T, 113GZ, P14F gibi alüminyum uyumlu endüstriyel ürünler
- **Inspect Kontrolü:** Endüstriyel kategori sonuçları dönüyor mu?

---

### Grup C: Kategori Karışıklığı (PPF vs Pasta vs Endüstriyel)

#### Test C1: PPF Doğru Tanımlanıyor mu?
- **Soru:** "PPF nedir ve hangi ürünleriniz var?"
- **Beklenen:** PPF = Paint Protection Film açıklaması + PPF montaj ekipmanları (rakel, montaj sıvısı vb.)
- **Beklenen DEĞİL:** Polisaj pastaları, endüstriyel cilalar

#### Test C2: Araç Boyası Pastası vs Endüstriyel Pasta
- **Soru:** "Araç boyası için polisaj pastası öner"
- **Beklenen:** Menzerna 300, 400, 2500, GYEON Q2M Compound vb. (abrasive_polishes kategorisi)
- **Beklenen DEĞİL:** Endüstriyel katı cilalar (113GZ, 439T vb.)

#### Test C3: Karışık Soru
- **Soru:** "Menzerna'nın tüm pasta ürünleri neler?"
- **Beklenen:** Hem araç boyası pastaları (300, 400, 2500) HEM DE endüstriyel katı cilalar (113GZ, 439T, GW16 vb.) — ikisi de Menzerna
- **Inspect Kontrolü:** Birden fazla search() çağrısı yapılmış olabilir

---

### Grup D: İlişkili Ürünler ve Kullanım Rehberliği

#### Test D1: Birlikte Kullanım
- **Soru:** "GYEON Bathe ile birlikte ne kullanmalıyım?"
- **Beklenen:** useWith alanındaki ürünler (kurulama bezi, drying aid vb.)
- **Inspect Kontrolü:** search() sonuçlarında ilişkili ürün bilgisi var mı?

#### Test D2: Uygulama Talimatı
- **Soru:** "Menzerna 300 nasıl kullanılır?"
- **Beklenen:** Adım adım uygulama rehberi (ped seçimi, devir, basınç vb.)
- **Inspect Kontrolü:** search() sonuçlarında howToUse bilgisi var mı?

---

### Grup E: Kapsam Dışı ve Sınır Testleri

#### Test E1: Sipariş/Kargo Sorusu
- **Soru:** "Siparişim nerede? Kargo takip numarası ne?"
- **Beklenen:** "Bu konuda müşteri hizmetlerimize mtskimya.com/pages/iletisim adresinden ulaşabilirsiniz."
- **Kontrol:** Policy Agent çalışıyor mu?

#### Test E2: Rakip Marka
- **Soru:** "Koch Chemie H9 ile Menzerna 300 karşılaştırması yapabilir misin?"
- **Beklenen:** "Koch Chemie hakkında bilgi veremiyorum, ancak Menzerna 300'ün özelliklerini aktarabilirim" + Menzerna 300 bilgileri
- **Kontrol:** Rakip marka kuralı çalışıyor mu?

#### Test E3: Olmayan Ürün
- **Soru:** "3M Perfect-It var mı?"
- **Beklenen:** "Bu ürün kataloğumuzda bulunmuyor. Aynı kategoride [alternatif ürünler] önerebilirim."
- **Kontrol:** Bot hallüsinasyon yapmadan "yok" diyebiliyor mu?

---

### Grup F: Kaynak Referansları ve Format

#### Test F1: Referans Gizleme
- **Soru:** "Seramik kaplama öner"
- **Beklenen:** Yanıtta 【1】【2】【49】 gibi referans numaraları OLMAMALI
- **Kontrol:** Personality Agent kaynak gizleme kuralı çalışıyor mu?

---

## BÖLÜM 7: TEST SONUÇ TABLOSU (BOŞ — DOLDURULACAK)

| # | Test | Sonuç | search() Çağrıldı mı? | Doğru Cevap mı? | Notlar |
|---|------|-------|----------------------|-----------------|--------|
| A1 | GYEON Bathe fiyatı | | | | |
| A2 | SKU ile arama | | | | |
| A3 | pH nötr şampuan | | | | |
| B1 | Endüstriyel pasta | | | | |
| B2 | Polyester kaplama | | | | |
| B3 | Fiber polyester | | | | |
| B4 | Alüminyum jant | | | | |
| C1 | PPF nedir? | | | | |
| C2 | Araç boyası pastası | | | | |
| C3 | Menzerna tüm pastalar | | | | |
| D1 | Birlikte kullanım | | | | |
| D2 | Menzerna 300 kullanım | | | | |
| E1 | Sipariş/kargo | | | | |
| E2 | Rakip marka | | | | |
| E3 | Olmayan ürün | | | | |
| F1 | Referans gizleme | | | | |

---

## BÖLÜM 8: OLASI SORUNLAR VE ÇÖZÜMLER

### Sorun: search() endüstriyel ürünleri bulamıyor

**Muhtemel Neden:** KB chunk'ları endüstriyel ürünleri düşük benzerlik puanıyla indekslemiş olabilir.

**Çözüm Adımları:**
1. Önce KB2'yi (chatbot_md/) devre dışı bırakarak test et — KB1 (tablolar) tek başına endüstriyel ürünleri bulabiliyor mu?
2. Bulamıyorsa → products_master tablosundaki shortDescription ve keySpecs alanlarında "endüstriyel" kelimesi var mı kontrol et
3. Yoksa → CSV'leri güncelle: endüstriyel ürünlerin shortDescription'ına "endüstriyel pasta" / "endüstriyel katı cila" ekle
4. CSV güncellendikten sonra Botpress'te tabloyu yeniden import et

### Sorun: Bot hala konuşma geçmişinden cevap veriyor

**Muhtemel Neden:** Gemini Flash modeli talimatları tam takip etmiyor olabilir.

**Çözüm Adımları:**
1. Autonomous Node'da model ayarını kontrol et — "Best Model" seçili mi?
2. Temperature'ı 0.1-0.2 aralığında tut (daha deterministik)
3. Talimatların başına "## KRİTİK" prefix ekle
4. Son çare: Konuşma başladığında emulator'ü resetle (Clear Chat)

### Sorun: Yanıtta hala 【2】【49】 referansları görünüyor

**Muhtemel Neden:** Personality Agent prompt'u güncellenmemiş veya publish edilmemiş.

**Çözüm:** Personality Agent prompt'unu kontrol et, kaynak referansı kuralı var mı? Publish et.

### Sorun: KB2 kaldırınca cevap kalitesi düştü

**Çözüm:** KB2'yi geri aç. Ama chunks count'u 8'e çıkar (Knowledge Agent → Chunks Count → 8).

---

## BÖLÜM 9: ÖZET — NE YAPMALI?

```
ZORUNLU (hemen yap):
1. [5 dk]  Autonomous Node talimatlarını değiştir (BÖLÜM 3)
2. [2 dk]  Personality Agent prompt'unu güncelle (BÖLÜM 4.1)
3. [2 dk]  Knowledge Agent Additional Context'i güncelle (BÖLÜM 4.2)
4. [1 dk]  Publish et
5. [15 dk] 16 test senaryosunu çalıştır (BÖLÜM 6)

OPSİYONEL (test sonuçlarına göre):
6. KB2 (chatbot_md/) devre dışı bırak — tekrar azaltma
7. CSV güncelle — endüstriyel ürün açıklamalarına anahtar kelime ekle
8. Chunks count ayarla (6 → 8)
```

---

## BÖLÜM 10: TABLO YAPISI REFERANSI

Bot'un search() ile erişebildiği tablo verileri (KB1 üzerinden):

### products_master (622 satır, 15 sütun)
| Sütun | İçerik | Aranabilir |
|-------|--------|-----------|
| sku | Ürün kodu | Evet |
| barcode | Barkod | Hayır |
| productName | Ürün adı | Evet |
| brand | Marka | Evet |
| price | Fiyat (TL) | Hayır |
| mainCat | Ana kategori | Evet |
| subCat | Alt kategori | Evet |
| subCat2 | 3. seviye kategori | Evet |
| templateGroup | Template group | Hayır |
| templateSubType | Alt tip | Evet |
| shortDescription | Kısa açıklama | Evet |
| targetSurface | Hedef yüzey | Evet |
| keySpecs | Teknik özellik özeti | Evet |
| imageUrl | Görsel URL | Hayır |
| url | Ürün sayfası URL | Hayır |

### product_content (622 satır, 8 sütun)
| Sütun | İçerik | Aranabilir |
|-------|--------|-----------|
| sku | Ürün kodu | Evet |
| productName | Ürün adı | Evet |
| fullDescription | Detaylı açıklama | Evet |
| howToUse | Kullanım talimatı | Evet |
| whenToUse | Ne zaman kullanılır | Evet |
| whyThisProduct | Neden bu ürün | Evet |
| targetSurface | Hedef yüzey | Evet |
| templateGroup | Kategori | Hayır |

### product_relations (622 satır, 8 sütun)
| Sütun | İçerik | Aranabilir |
|-------|--------|-----------|
| sku | Ürün kodu | Evet |
| productName | Ürün adı | Evet |
| useBefore | Öncesinde kullanılacak | Evet |
| useAfter | Sonrasında kullanılacak | Evet |
| useWith | Birlikte kullanılacak | Evet |
| accessories | Aksesuarlar | Evet |
| alternatives | Alternatifler | Evet |
| templateGroup | Kategori | Hayır |

### product_faq (2,119 satır, 5 sütun)
| Sütun | İçerik | Aranabilir |
|-------|--------|-----------|
| sku | Ürün kodu | Evet |
| productName | Ürün adı | Evet |
| question | Soru | Evet |
| answer | Cevap | Evet |
| templateGroup | Kategori | Evet |

### product_specs (622 satır, 6 sütun)
| Sütun | İçerik | Aranabilir |
|-------|--------|-----------|
| sku | Ürün kodu | Evet |
| productName | Ürün adı | Evet |
| templateGroup | Kategori | Evet |
| templateSubType | Alt tip | Evet |
| specsJson | Tüm spec'ler JSON | Evet |
| specsSummary | Okunabilir Türkçe özet | Evet |
