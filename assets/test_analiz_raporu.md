# MTS Kimya Bot — Test Analiz Raporu

## Test Özeti

| # | Test | Sonuç | Sorun |
|---|------|-------|-------|
| 1 | "Merhaba" | ✅ Geçti | Küçük sorun: botName doğru ama scope yanlış (aşağıda detay) |
| 2 | "Siparişim nerede" | ⚠️ Kısmen geçti | contactInfo'da fazladan tırnak var |
| 3 | "GYEON şampuan öner" | ❌ BAŞARISIZ | **Knowledge Base araması çalışmıyor!** |

---

## SORUN 1 — KRİTİK: Knowledge Base Araması Çalışmıyor

### Belirtiler:
```
search({ query: "GYEON şampuan" })
→ reason: "No knowledge bases were included in the search"
→ context: "Do NOT answer the question, as no knowledge bases were included in the search"
```

Bot cevabı: "Üzgünüm, şu anda GYEON şampuan önerileri için bilgiye erişemiyorum."

### Neden Oluyor:
Inspect çıktısında search tool'un metadata'sı:
```json
"metadata": {
  "kbs": {
    "enabled": true,
    "kbs": ["kb_01KCW6CXAWQ4MEC308HGZC5BKA", "kb-default"],
    "searchScope": "specific"
  }
}
```

Arama **sadece 2 KB'ye** bağlı: `kb_01KCW6CXAWQ4MEC308HGZC5BKA` ve `kb-default`. Ama ikisi de boş veya indekslenmemiş görünüyor.

### ÇÖZÜM:

**A) Knowledge Base durumunu kontrol et:**
1. Sol menü → **Knowledge Bases** (veya Knowledge)
2. Her KB'nin durumunu kontrol et:
   - `tablo-verileri` → **Status: Ready** mı?
   - `kategori-dokumanlari` → **Status: Ready** mı?
   - `zenginlestirilmis-urunler` → **Status: Ready** mı?
3. Eğer "Processing" veya "Pending" durumundaysa, indeksleme tamamlanana kadar bekle

**B) Knowledge Agent ayarlarını kontrol et:**
1. Sol menü → **Agents** → **Knowledge Agent**
2. "Knowledge Bases" bölümünü kontrol et
3. **TÜM 3 KB'nin seçili/aktif olduğundan emin ol**
4. Eğer sadece 1-2 KB seçiliyse, diğerlerini de ekle

**C) Autonomous Node'daki search tool'u kontrol et:**
1. Main Workflow → Autonomous Node → sağ panel
2. **Tools** bölümünde "Search Knowledge" tool'unu bul
3. Bu tool'un hangi KB'lere bağlı olduğunu kontrol et
4. "Search Scope" ayarı:
   - `"All Knowledge Bases"` → Tüm KB'lerden arar (önerilen)
   - `"Specific"` → Sadece seçili KB'lerden arar (şu anki durum, ama yanlış KB'ler seçili)
5. **"All Knowledge Bases"** seçeneğini işaretle veya 3 KB'yi de "Specific" listesine ekle

**D) KB kaynakları doğru eklendi mi?**
1. Her KB'ye gir ve kaynakları kontrol et:
   - `tablo-verileri`: 5 tablo kaynağı eklenmiş mi? (products_master, product_content, product_relations, product_faq, product_specs)
   - `kategori-dokumanlari`: chatbot_md/ dosyaları yüklenmiş mi?
   - `zenginlestirilmis-urunler`: knowledge_base_enriched_top50/ dosyaları yüklenmiş mi?
2. Kaynak yoksa veya boşsa, dosyaları tekrar yükle

---

## SORUN 2 — ORTA: contactInfo ve supportScope'da Fazladan Tırnak

### Belirtiler:
Bot "siparişim nerede" sorusuna cevap verirken:
```
"Bu konuda müşteri hizmetlerimize "mtskimya.com/pages/iletisim" adresinden ulaşabilirsiniz."
```

contactInfo'nun değeri şu şekilde kaydedilmiş:
```
"\"mtskimya.com/pages/iletisim\""    ← YANLIŞ (çift tırnak var)
```

supportScope'un değeri de:
```
"\"Ürün danışmanlığı\""              ← YANLIŞ (çift tırnak var)
```

### ÇÖZÜM:

1. Variables sekmesine git
2. `contactInfo` değişkenine tıkla
3. Default Value'yu değiştir:
   - **Yanlış:** `"mtskimya.com/pages/iletisim"` (tırnak işaretleriyle)
   - **Doğru:** `mtskimya.com/pages/iletisim` (tırnaksız, düz metin)
4. `supportScope` değişkenine tıkla
5. Default Value'yu değiştir:
   - **Yanlış:** `"Ürün danışmanlığı"` (tırnak işaretleriyle)
   - **Doğru:** `Ürün danışmanlığı` (tırnaksız, düz metin)
6. Kaydet

> **Not:** Botpress'te variable değeri girerken tırnak işareti eklemeye gerek yok. Sadece düz metni yapıştır. Botpress zaten String olarak kaydeder.

---

## SORUN 3 — DÜŞÜK: Variables Scope Farklılığı

### Belirtiler:
Planda `botName`, `storeUrl`, `contactInfo`, `supportScope` değişkenleri **Bot Variables** (bot scope) olarak planlanmıştı. Ama Inspect çıktısında hepsi `workflow` namespace'inde görünüyor:

```typescript
workflow.botName = "MTS Kimya Ürün Danışmanı"     // Readonly
workflow.storeURL = "www.mtskimya.com"             // Readonly
workflow.contactInfo = "mtskimya.com/pages/iletisim" // Readonly
workflow.supportScope = "Ürün danışmanlığı"        // Readonly
```

Bu, değişkenlerin **Workflow scope'unda** oluşturulduğu anlamına geliyor (Bot scope yerine).

### Etkisi:
- Fonksiyonel olarak çalışır, çünkü Readonly + default value ile tanımlı
- Ama **workflow her başladığında** bu değerler resetlenmez (default value koruyor)
- Autonomous Node bunları okuyabiliyor, yani sorun yok
- **Bot scope** olsaydı, ayrı bir `bot.botName` namespace'inde erişilirdi

### ÇÖZÜM:
Şu an acil bir düzeltme gerekmiyor. Fonksiyonel olarak doğru çalışıyor. İleride temizlik yapılmak istenirse:
1. Mevcut workflow değişkenlerini sil (botName, storeURL, contactInfo, supportScope)
2. Aynı adlarla Bot scope'da yeniden oluştur
3. Autonomous Node'daki Instructions'ta `{{workflow.botName}}` → `{{bot.botName}}` şeklinde güncelle

---

## SORUN 4 — DÜŞÜK: storeURL İsim Tutarsızlığı

### Belirtiler:
Planda `storeUrl` (küçük "rl") planlanmıştı ama Botpress'te `storeURL` (büyük "RL") olarak oluşturulmuş.

```
Plan:    storeUrl    → "https://mtskimya.com"
Gerçek:  storeURL    → "www.mtskimya.com"
```

Ayrıca değer de farklı:
- Plan: `https://mtskimya.com` (https prefix'li)
- Gerçek: `www.mtskimya.com` (prefix'siz)

### ÇÖZÜM:
1. `storeURL` değişkeninin değerini `https://mtskimya.com` olarak güncelle (https dahil)
2. Autonomous Node Instructions'ta referansı kontrol et: `{{workflow.storeURL}}` doğru mu?

---

## ÖNCELİK SIRASI

| # | Sorun | Öncelik | Etki |
|---|-------|---------|------|
| 1 | KB araması çalışmıyor | **KRİTİK** | Bot hiçbir ürün sorusuna cevap veremiyor |
| 2 | contactInfo/supportScope tırnak | **ORTA** | Kullanıcıya tırnak işaretli metin gösteriliyor |
| 3 | Variable scope (workflow vs bot) | **DÜŞÜK** | Fonksiyonel sorun yok, kozmetik |
| 4 | storeURL isim/değer farkı | **DÜŞÜK** | Henüz URL kullanılmıyor |

---

## İLK YAPILACAK: KB Sorununu Çöz

En kritik sorun KB aramasının çalışmaması. Bunu çözmeden bot hiçbir ürün sorusuna cevap veremez.

**Hızlı kontrol listesi:**

```
1. [ ] KB'ler oluşturulmuş mu? (Knowledge Bases menüsünde 3 KB var mı?)
2. [ ] KB'lere kaynak eklenmiş mi? (her KB'nin içinde dosya/tablo var mı?)
3. [ ] KB'ler indekslenmiş mi? (Status: "Ready" mı?)
4. [ ] Knowledge Agent'ta KB'ler seçili mi? (Agents → Knowledge Agent → KB listesi)
5. [ ] Autonomous Node'da search tool'un scope'u doğru mu? ("All" veya 3 KB seçili)
```

KB sorunu çözüldükten sonra "GYEON şampuan öner" testini tekrarla. Arama sonuçları dönmeye başlamalı.
