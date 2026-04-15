# MTS Kimya — Adım 4: Variables (Değişkenler) Yapılandırma Rehberi

## Mevcut Durum

**Tamamlanan adımlar:**
- Adım 1: CSV üretimi (5 tablo, 4,607 satır)
- Adım 2: Tablo & KB kurulumu
- Adım 3: Agent yapılandırması

**Şu an tanımlı değişkenler (görselden):**

| Scope | Değişken | Durum |
|-------|----------|-------|
| WORKFLOW | productDescription | Not set |
| WORKFLOW | productImage | Not set |
| WORKFLOW | productName | Not set |
| WORKFLOW | productPrice | Not set |
| WORKFLOW | productUrl | Not set |
| WORKFLOW | showProductCard | Not set |

**Eksik olanlar:** Bot Variables ve Conversation Variables henüz eklenmemiş.

---

## ADIM 4.1 — Bot Variables Ekle (Global Sabitler)

**Nerede:** Sol menü → Variables sekmesi → **+** (mavi artı) butonu

Bot Variables tüm kullanıcılar ve tüm konuşmalarda ortaktır. Değişmeyen sabit değerler için kullanılır.

### Eklenecek 4 Bot Variable:

#### 1. `botName`
- **Scope:** Bot
- **Data Type:** String
- **Default Value:** `MTS Kimya Ürün Danışmanı`
- **Kullanım:** Karşılama mesajında ve tanıtımda kullanılır
- **Erişim:** `{{bot.botName}}`

#### 2. `storeUrl`
- **Scope:** Bot
- **Data Type:** String
- **Default Value:** `https://mtskimya.com`
- **Kullanım:** Ürün linklerinde, "sitemizde inceleyin" yönlendirmelerinde
- **Erişim:** `{{bot.storeUrl}}`

#### 3. `contactInfo`
- **Scope:** Bot
- **Data Type:** String
- **Default Value:** `mtskimya.com/pages/iletisim`
- **Kullanım:** Sipariş/kargo/iade sorularında yönlendirme
- **Erişim:** `{{bot.contactInfo}}`

#### 4. `supportScope`
- **Scope:** Bot
- **Data Type:** String
- **Default Value:** `Ürün danışmanlığı`
- **Kullanım:** Bot'un kapsamını hatırlaması için
- **Erişim:** `{{bot.supportScope}}`

### Ekleme Adımları (her biri için tekrarla):

```
1. Variables sekmesinde + (mavi artı) butonuna tıkla
2. Açılan pencerede:
   → Scope: "Bot" seç
   → Data Type: "String" seç
   → Name: değişken adını yaz (ör: botName)
3. "Add" tıkla
4. Oluşturulan değişkene tıkla → Default Value alanına değeri yapıştır
5. Kaydet
```

> **Not:** Bot Variables şifrelenmez. API anahtarı veya şifre gibi hassas bilgi koyma — onlar için Configuration Variables kullan.

---

## ADIM 4.2 — Conversation Variables Ekle (Konuşma Boyunca)

**Nerede:** Sol menü → Variables sekmesi → **+** butonu

Conversation Variables mevcut konuşma boyunca kalıcıdır. Farklı workflow'lar arasında paylaşılabilir. Konuşma bittiğinde sıfırlanır.

### Eklenecek 3 Conversation Variable:

#### 1. `selectedCategory`
- **Scope:** Conversation
- **Data Type:** String
- **Default Value:** *(boş bırak)*
- **Kullanım:** Kullanıcının ilgilendiği kategoriyi tutar (ör: "Polisaj Pastaları", "Araç Şampuanları")
- **Erişim:** `{{conversation.selectedCategory}}`

#### 2. `selectedBrand`
- **Scope:** Conversation
- **Data Type:** String
- **Default Value:** *(boş bırak)*
- **Kullanım:** Kullanıcının ilgilendiği markayı tutar (ör: "GYEON", "Menzerna")
- **Erişim:** `{{conversation.selectedBrand}}`

#### 3. `surfaceType`
- **Scope:** Conversation
- **Data Type:** String
- **Default Value:** *(boş bırak)*
- **Kullanım:** Hedef yüzey tipini tutar (ör: "boya yüzeyi", "cam", "jant", "iç mekan")
- **Erişim:** `{{conversation.surfaceType}}`

### Ekleme Adımları:

```
1. + butonuna tıkla
2. Scope: "Conversation" seç
3. Data Type: "String" seç
4. Name: değişken adını yaz (ör: selectedCategory)
5. "Add" tıkla
6. Default Value boş bırak (konuşma sırasında otomatik doldurulacak)
```

> **Neden bu 3 değişken?** Autonomous Node, kullanıcının konuşma boyunca hangi kategori, marka veya yüzey tipiyle ilgilendiğini bu değişkenlerde tutarak tutarlı öneriler yapar. Opsiyoneldir ama konuşma kalitesini artırır.

---

## ADIM 4.3 — Mevcut Workflow Variables (Zaten Tanımlı)

Bu değişkenler görselde zaten var ve doğru tanımlanmış. Değiştirmeye gerek yok:

| Değişken | Tip | Amacı |
|----------|-----|-------|
| `productDescription` | String | Ürün kartında gösterilecek açıklama |
| `productImage` | String | Ürün görseli URL'si (kartta gösterim) |
| `productName` | String | Ürün adı (kartta gösterim) |
| `productPrice` | String | Ürün fiyatı (kartta gösterim) |
| `productUrl` | String | Ürün sayfası linki (kartta "İncele" butonu) |
| `showProductCard` | Boolean | Ürün kartı gösterilsin mi? (true/false) |

### Opsiyonel Ek Workflow Variables (İhtiyaç duyulursa):

| Değişken | Tip | Kullanım |
|----------|-----|----------|
| `selectedSku` | String | Seçilen ürünün SKU'su (tablo sorgularında filtre olarak) |
| `searchResults` | String | Tablo sorgu sonuçları (JSON string) |
| `kbAnswer` | String | Knowledge Agent'ın döndürdüğü cevap metni |

> **Tavsiye:** Şu an mevcut 6 workflow variable yeterli. Baştan fazla variable tanımlamak karmaşıklık yaratır. İhtiyaç duydukça ekleyebilirsin.

---

## ADIM 4.4 — Autonomous Node'a Variable Erişimi Ver

**ÖNEMLİ:** Botpress'te Autonomous Node'lar varsayılan olarak **hiçbir variable'a erişemez**. Erişim elle tanımlanmalıdır.

**Nerede:** Main Workflow → Autonomous Node'a tıkla → Sağ panelde **"Variables access"** bölümü

### Adımlar:

```
1. Main Workflow'da Autonomous Node'a tıkla
2. Sağ panelde "Variables access" bölümünü bul
3. "+ Add variable(s)" butonuna tıkla
4. Aşağıdaki değişkenleri ekle ve erişim tiplerini ayarla
5. "Add" tıkla
```

### Verilecek Erişimler:

**Bot Variables (sadece Okuma):**

| Değişken | Okuma | Yazma | Neden |
|----------|:-----:|:-----:|-------|
| `bot.botName` | ✅ | ❌ | Karşılama mesajında adını söyler |
| `bot.storeUrl` | ✅ | ❌ | Ürün linklerini oluşturur |
| `bot.contactInfo` | ✅ | ❌ | Kapsam dışı sorularda yönlendirme yapar |
| `bot.supportScope` | ✅ | ❌ | Kapsamını bilir |

**Workflow Variables (Okuma + Yazma):**

| Değişken | Okuma | Yazma | Neden |
|----------|:-----:|:-----:|-------|
| `workflow.productName` | ✅ | ✅ | Ürün kartı doldurmak için yazar |
| `workflow.productPrice` | ✅ | ✅ | Ürün kartı doldurmak için yazar |
| `workflow.productImage` | ✅ | ✅ | Ürün kartı doldurmak için yazar |
| `workflow.productUrl` | ✅ | ✅ | Ürün kartı doldurmak için yazar |
| `workflow.productDescription` | ✅ | ✅ | Ürün kartı doldurmak için yazar |
| `workflow.showProductCard` | ✅ | ✅ | Kart gösterimini tetikler |

**Conversation Variables (Okuma + Yazma):**

| Değişken | Okuma | Yazma | Neden |
|----------|:-----:|:-----:|-------|
| `conversation.selectedCategory` | ✅ | ✅ | Konuşma boyunca kategori bağlamı |
| `conversation.selectedBrand` | ✅ | ✅ | Konuşma boyunca marka bağlamı |
| `conversation.surfaceType` | ✅ | ✅ | Konuşma boyunca yüzey tipi bağlamı |

> **Yazma erişimi neden önemli?** Autonomous Node, kullanıcı "GYEON ürünlerini göster" dediğinde `conversation.selectedBrand = "GYEON"` yazabilir ve sonraki mesajlarda bu markaya özel öneriler yapabilir. Benzer şekilde, ürün detayı verirken `workflow.productName`, `workflow.productPrice` gibi alanları doldurarak ürün kartı gösterebilir.

---

## ADIM 4.5 — Doğrulama Kontrol Listesi

Tüm variables'ı ekledikten sonra şunları kontrol et:

### Görsel Kontrol:

```
Variables sekmesi → "All Variables" filtresi:

BOT (4 adet):
  ├─ botName = "MTS Kimya Ürün Danışmanı"
  ├─ storeUrl = "https://mtskimya.com"
  ├─ contactInfo = "mtskimya.com/pages/iletisim"
  └─ supportScope = "Ürün danışmanlığı"

CONVERSATION (3 adet):
  ├─ selectedCategory = (boş)
  ├─ selectedBrand = (boş)
  └─ surfaceType = (boş)

WORKFLOW (6 adet — mevcut):
  ├─ productDescription = Not set
  ├─ productImage = Not set
  ├─ productName = Not set
  ├─ productPrice = Not set
  ├─ productUrl = Not set
  └─ showProductCard = Not set
```

### Emulator Test:

| # | Test | Beklenen Sonuç | Kontrol |
|---|------|----------------|---------|
| 1 | "Merhaba" yaz | Bot adıyla karşılama | `bot.botName` çalışıyor |
| 2 | "Siparişim nerede?" yaz | "mtskimya.com/pages/iletisim" yönlendirmesi | `bot.contactInfo` çalışıyor |
| 3 | "GYEON şampuan öner" yaz | GYEON ürünleri + ürün kartı gösterimi | Workflow variables yazılıyor |
| 4 | Inspect panelini aç | Variables access'te değişkenlerin dolu olduğunu gör | Erişim doğru |

---

## SONRAKI ADIMLAR

Variables tamamlandıktan sonra:
- **Adım 5:** Workflow'ları oluştur (Main + sub-workflow'lar)
- **Adım 6:** Test ve iyileştirme
- **Adım 7:** Shopify entegrasyonu ve yayına alma

---

## ÖZET TABLO — Tüm Variables

| Scope | Değişken Sayısı | Durum |
|-------|----------------|-------|
| Bot | 4 | **EKLENMESİ GEREKİYOR** |
| Conversation | 3 | **EKLENMESİ GEREKİYOR** |
| Workflow | 6 | Zaten tanımlı ✅ |
| **TOPLAM** | **13** | |
