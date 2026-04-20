# KB ve Search Yapılandırması — Sorular ve Cevaplar

---

## SORU 1: Knowledge Agent'da KB'ler nereden seçiliyor?

Knowledge Agent ayarlarında doğrudan KB seçimi **yoktur**. Knowledge Agent, botunuzdaki **tüm aktif Knowledge Base'leri** otomatik olarak kullanır.

KB seçimi şu yerlerde yapılır:
- **Autonomous Node → Search Knowledge kartında** (doğru yeri buldun)
- Kart ayarlarında hangi KB'lerden arama yapılacağını seçebilirsin

---

## SORU 2: Autonomous Node'da Search Knowledge Kartı

Doğru yaklaşım. Autonomous Node'daki **Search Knowledge** kartını yapılandırman gerekiyor.

### Adımlar:

1. Main Workflow → **Autonomous Node'a** tıkla
2. Sağ panelde **Tools** bölümünde **Search Knowledge** kartını bul
3. Karta tıkla → Ayarlarını aç
4. **Knowledge Bases** bölümünde:
   - **"All Knowledge Bases"** seçeneğini seç (en kolay)
   - VEYA **"Specific"** seçip KB'leri elle seç:
     - `kategori-dokumanlari` ✅
     - `zenginlestirilmis-urunler` ✅
     - (Eğer tablo KB'si de varsa onu da ekle)

### Şu andaki sorun:
Inspect çıktısında search tool'un metadata'sı 2 KB ID'si gösteriyor ama "No knowledge bases were included in the search" hatası dönüyor. Bu, KB'lerin ya boş olduğu ya da indekslenmediği anlamına geliyor.

**Kontrol et:**
- Sol menü → Knowledge Bases
- Her KB'nin yanındaki durum: **"Ready"** mı yoksa **"Processing"** veya **"Error"** mı?
- KB'ye tıklayıp içinde kaynak (source) var mı bak

---

## SORU 3: Tabloları KB'ye Eklemeli miyim?

### Kısa Cevap: **EVET, eklemeni tavsiye ederim.**

### Neden:

Şu anki durumun:
```
TABLOLAR (5 adet) → Autonomous Node "Find Records" ile sorgulanabilir
KB'ler (2 adet)   → chatbot_md + enriched_top50 dosyaları
```

Sorun: Autonomous Node "GYEON şampuan" gibi bir soru geldiğinde:
- `search()` → KB'den arar → chatbot_md ve enriched dosyalarından sonuç döner
- Ama **tablolardaki 622 ürün** semantik arama ile bulunamaz (sadece Find Records ile birebir sorgulanabilir)

### İki Seçenek:

#### Seçenek A: Tabloları KB'ye Ekle (ÖNERİLEN)
```
KB: kategori-dokumanlari     → chatbot_md/ dosyaları (mevcut)
KB: zenginlestirilmis-urunler → enriched_top50/ dosyaları (mevcut)
KB: tablo-verileri           → 5 tabloyu KB kaynağı olarak ekle (YENİ)
```

**Nasıl:**
1. Knowledge Bases → Yeni KB oluştur: `tablo-verileri`
2. Kaynak ekle → **"Table"** tipini seç
3. Her tabloyu ekle ve **searchable sütunları** işaretle:

| Tablo | Searchable Sütunlar |
|-------|-------------------|
| products_master | productName, brand, mainCat, subCat, shortDescription, targetSurface, keySpecs |
| product_content | productName, fullDescription, howToUse, whenToUse, whyThisProduct, targetSurface |
| product_relations | productName, useBefore, useAfter, useWith, accessories, alternatives |
| product_faq | productName, question, answer |
| product_specs | productName, specsSummary |

4. Kaydet ve indekslenmesini bekle
5. Autonomous Node'daki Search Knowledge kartına bu KB'yi de ekle

**Avantajı:** "GYEON şampuan öner" gibi doğal dil sorguları semantik arama ile tablolardaki ürünleri de bulur.

#### Seçenek B: Tabloları KB'ye Ekleme
```
KB: kategori-dokumanlari     → chatbot_md/ dosyaları
KB: zenginlestirilmis-urunler → enriched_top50/ dosyaları
Tablolar → Sadece Find Records ile erişilir
```

Bu durumda Autonomous Node Instructions'a şu ek talimatı eklemen gerekir:
```
Ürün araması yaparken ÖNCELİKLE search() ile KB'den ara.
Eğer KB'de bulamazsan, tablolarda Find Records kullanarak filtrele.
Fiyat ve spesifik SKU sorguları için her zaman tablolardan Find Records kullan.
```

**Dezavantajı:** Bot KB'de "GYEON şampuan" ile arama yapar, chatbot_md dosyalarında bulabilir ama fiyat/SKU bilgisi eksik kalabilir. Ayrı bir Find Records sorgusu yapması gerekir.

### Tavsiyem:

**Seçenek A'yı uygula** — tabloları da KB'ye ekle. Bu sayede bot tek bir `search()` çağrısıyla hem dokümanlardan hem tablolardan sonuç bulabilir.

Ama önce mevcut 2 KB'nin (chatbot_md ve enriched) düzgün çalıştığını doğrula. KB araması çalışmaya başladıktan sonra tabloları da KB'ye ekle.

---

## SORU 4: storeURL'i storeUrl olarak değiştireyim mi?

### Kısa Cevap: **Hayır, gerek yok.**

### Neden:
- `storeURL` zaten çalışıyor (Readonly, default value atanmış)
- Değişken adını değiştirmek için:
  1. Mevcut değişkeni sil
  2. Yeni adla oluştur
  3. Autonomous Node'daki variable access'i güncelle
  4. Instructions'taki referansları güncelle
- Riskli ve gereksiz bir değişiklik
- İsim tutarsızlığı sadece kozmetik, fonksiyonel bir etkisi yok

**Ama şunları düzelt:**
1. `storeURL`'nin değeri → `https://mtskimya.com` olarak güncelle (şu an `www.mtskimya.com`)
2. `contactInfo`'daki fazladan tırnakları kaldır → `mtskimya.com/pages/iletisim` (tırnaksız)
3. `supportScope`'daki fazladan tırnakları kaldır → `Ürün danışmanlığı` (tırnaksız)

---

## YAPILACAKLAR ÖNCELİK SIRASI

```
1. [KRİTİK] Mevcut KB'lerin durumunu kontrol et (Ready mi?)
2. [KRİTİK] Search Knowledge kartına KB'leri bağla ("All" veya elle seç)
3. [KRİTİK] "GYEON şampuan öner" testini tekrarla — KB araması çalışmalı
4. [ORTA]   contactInfo ve supportScope değerlerindeki tırnakları kaldır
5. [ORTA]   storeURL değerini https://mtskimya.com olarak güncelle
6. [SONRA]  Tabloları da KB kaynağı olarak ekle (tablo-verileri KB'si)
```
