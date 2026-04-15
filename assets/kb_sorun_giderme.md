# KB Arama Sorunu Giderme — KB'ler Ready Ama Arama Çalışmıyor

## Durum
- KB'ler: Hepsi **Ready** durumunda
- Search Knowledge kartı: "All KBs selected"
- Ama arama: "No knowledge bases were included in the search" hatası

## Muhtemel Sebepler

### Sebep 1: Kart Senkronizasyon Sorunu (En Olası)
Inspect çıktısında search tool'un metadata'sı:
```json
"searchScope": "specific",
"kbs": ["kb_01KCW6CXAWQ4MEC308HGZC5BKA", "kb-default"]
```

Görselde "All KBs selected" görünüyor ama arka planda eski bir yapılandırma kullanılıyor olabilir. `kb-default` boş bir placeholder KB olabilir.

### Sebep 2: KB'ler Ready Ama İçi Boş
KB "Ready" görünebilir ama içinde hiç kaynak (source) olmayabilir.

### Sebep 3: Publish Edilmemiş
Ayar değişiklikleri yayınlanmamış (Publish) olabilir.

---

## ÇÖZÜM ADIMLARI (Sırasıyla Dene)

### Adım 1: KB İçeriklerini Kontrol Et

1. Sol menü → **Knowledge Bases**
2. Her KB'ye **tek tek tıkla**
3. İçinde kaç kaynak (source/dosya) var kontrol et:

| KB Adı | Beklenen Kaynak Sayısı |
|--------|----------------------|
| kategori-dokumanlari (veya adı ne verdiysen) | 24-26 dosya (chatbot_md/ klasöründen) |
| zenginlestirilmis-urunler (veya adı ne verdiysen) | 54 dosya (knowledge_base_enriched_top50/ klasöründen) |

4. Eğer KB'nin içi **boşsa** → dosyaları yükle
5. Eğer kaynaklar var ve **hepsi Ready** → Adım 2'ye geç

### Adım 2: Search Knowledge Kartını Sil ve Yeniden Ekle

1. Autonomous Node'a tıkla
2. **Search Knowledge** kartını sil (çöp kutusu/delete)
3. **Yeni bir Search Knowledge kartı ekle** (+ Add Tool → Search Knowledge)
4. Yeni kartta ayarları yap:
   - **Instructions:** Aşağıdaki metni yapıştır
   - **Included Knowledge Bases:** `All KBs selected`
   - **Result Type:** `full_content`
   - **Tokens:** `20`
   - **Context Depth:** `2`
   - **Force thinking:** OFF

**Instructions metni:**
```
Kullanıcının sorusunu analiz et ve bilgi bankasından en ilgili ürün bilgilerini bul. Ürün adı, SKU, fiyat, teknik özellikler, kullanım talimatları ve ilişkili ürünler hakkında bilgi ara. Türkçe ve İngilizce sektör terimlerini (compound, polish, sealant, pH, SiO2, DA, PPF) dikkate al.
```

### Adım 3: Publish Et

1. Sağ üst köşedeki **Publish** butonuna tıkla
2. Değişikliklerin yayınlanmasını bekle

### Adım 4: Emulator'da Test Et

1. Emulator'u **sıfırla** (New Conversation veya Reset)
2. "GYEON şampuan öner" yaz
3. Inspect panelinde search tool'un çıktısını kontrol et:
   - **Başarılı:** `results` array'i dolu, ürün bilgileri var
   - **Başarısız:** Yine "No knowledge bases" hatası → Adım 5'e geç

### Adım 5: Hâlâ Çalışmıyorsa — KB'yi Yeniden Oluştur

1. Mevcut KB'leri sil
2. Yeni KB oluştur (aynı isimlerle)
3. Dosyaları tekrar yükle:
   - KB 1: `chatbot_md/` klasöründeki tüm .md dosyaları (system_prompt.md HARİÇ)
   - KB 2: `knowledge_base_enriched_top50/` klasöründeki tüm dosyalar
4. İndekslenmesini bekle (Status: Ready)
5. Autonomous Node'daki Search Knowledge kartında "All KBs selected" seç
6. Publish et
7. Tekrar test et

---

## EK NOT: KB'ye Hangi Dosyalar Yüklenmeli

### KB 1: kategori-dokumanlari
Yüklenecek dosyalar (`chatbot_md/` klasöründen):

```
01_car_shampoo.md
02_abrasive_polishes.md
03_finishing_polishes.md
04_one_step_polishes.md
05_polishing_pads.md
06_ceramic_coatings.md
07_spray_sealants.md
08_quick_detailers.md
09_interior_cleaners.md
10_wheel_rim_cleaners.md
11_glass_care.md
12_tire_trim.md
13_clay_decontamination.md
14_iron_fallout_removers.md
15_apc_degreasers.md
16_microfiber.md
17_paint_protection_film.md
18_masking_tapes.md
19_foam_lances.md
20_polishing_machines.md
21_accessories.md
22_product_sets.md
23_drying_aids.md
24_pressure_washers.md
00_index.md
```

**system_prompt.md yükleme** — bu chatbot'un iç talimatı, KB'ye koyma.

### KB 2: zenginlestirilmis-urunler
Yüklenecek dosyalar (`knowledge_base_enriched_top50/` klasöründen):
- Tüm .md dosyaları (54 dosya)
- .json dosyası varsa o da yüklenebilir

---

## HIZLI TEST SONRASI BEKLENEN ÇIKTI

"GYEON şampuan öner" sorusu sonrası Inspect'te görmesi gereken:

```json
{
  "tool_name": "search",
  "input": { "query": "GYEON şampuan" },
  "output": {
    "results": [
      {
        "content": "## GYEON Q2M Bathe ...",
        "source": "01_car_shampoo.md",
        "score": 0.85
      },
      ...
    ]
  },
  "success": true
}
```

Eğer `results` array'i doluysa ve ürün bilgileri dönüyorsa → sorun çözülmüş demektir.
