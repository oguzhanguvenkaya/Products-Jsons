# Phase 2R-B — REJECTED Merges

Ret gerekçeleri 5-kriter rubriğine göre (Primary kategori / Hedef yüzey / Kullanım senaryosu / Formülasyon / Filter mantığı).

## polisher_machine (4 REJECT)

### R1. 532579 `other → polisher_accessory`
- **Ürün:** FLEX HG 650 Profesyonel Sıcak Hava Tabancası 2000W (LCD Ekranlı Değişken Isı Hız Ayarlı)
- **Sorun:** Sıcak hava tabancası (heat gun) polisaj aksesuarı değildir. PPF uygulaması, shrink/kurutma, boya sökme gibi çok geniş bir yelpazede kullanılır.
- **5 kriter:** Primary kategori ✗ (general tool), Kullanım senaryosu ✗, Filter mantığı ✗
- **Öneri:** Yeni sub_type `heat_gun` açılmalı veya `tool/heat_gun` ayrı kategoriye taşınmalı.

### R2. SGGS003 `other → polisher_accessory`
- **Ürün:** SCCB Kısa Nozul Hava Tabancası — Kompresör Basınçlı Hava Üfleyici (Air Blow Gun)
- **Sorun:** Kompresörle çalışan hava üfleyici; kurutma/temizlik/boşluk hava verme aracı. Polisaj ile doğrudan ilgisi yok.
- **5 kriter:** Primary kategori ✗ (compressed-air tool), Filter mantığı ✗
- **Öneri:** Yeni sub_type `air_blow_gun` (temizlik/kurutma tabancası).

### R3. SGGC086 `other → polisher_accessory`
- **Ürün:** SGCB Air Blow Gun Yüksek Basınçlı Hava Tabancası
- **Sorun:** R2 ile aynı mantık — air blow gun polisher_accessory değildir.
- **Öneri:** `air_blow_gun` altına R2 ile birleştir.

### R4. SGGC055 `other → polisher_accessory`
- **Ürün:** SGCB Tornador Detaylı Temizlik Tabancası Boncuklu - 1000 ml
- **Sorun:** Tornador iç detaylı temizlik tabancasıdır (döşeme, panel, saha temizliği). Polisaj makinesi aksesuarı değil; aslında `interior_cleaner` veya ayrı `tornador_gun` ailesi gerekir.
- **5 kriter:** Primary kategori ✗, Hedef yüzey ✗ (iç döşeme), Kullanım senaryosu ✗
- **Öneri:** `tornador_gun` sub_type veya `interior_cleaning_tool` kategorisi altında yeniden sınıflandır.

## polishing_pad (2 REJECT)

### R5. NPMW6555 `microfiber_pad → foam_pad`
- **Ürün:** MG PS Ara Kesim Pasta Keçesi 5'li Paket 65/55mm - Beyaz (microfiber malzeme)
- **Sorun:** Mikrofiber pad ve köpük pad malzeme + kesim karakteristiği açısından farklıdır. Mikrofiber = daha agresif kesim; foam = finish odaklı. Bilgi kaybı.
- **5 kriter:** Formülasyon/malzeme ✗, Filter mantığı ✗ (müşteri "mikrofiber pad" filtresiyle arar)
- **Öneri:** `microfiber_pad` korunsun; tek ürünlü olsa bile pad ailesinde ayrı malzeme sınıfı kritik.

### R6. SGGA081 `felt_pad → wool_pad`
- **Ürün:** SGCB Cam Çizik Giderici Keçe 150mm — Silecek İzi / Kireç / Leke Giderici Pasta Yün Keçesi
- **Sorun:** Bu pad **cam yüzey** için tasarlanmış (glass restore); wool_pad ise **boya polisaj** için. Hedef yüzey tamamen farklı, kimyasal (cerium oksit pasta) farklı.
- **5 kriter:** Hedef yüzey ✗ (cam vs boya), Kullanım senaryosu ✗
- **Öneri:** `felt_pad` korunsun veya daha iyi: `glass_polish_pad` yeni sub_type.

## spare_part (3 REJECT)

### R7. 458813 `extension_kit → maintenance_kit`
- **Ürün:** FLEX EXS M14 Set Rotary Polisaj Makinesi Uzatma Aparatı Seti 4 Parça
- **Sorun:** Polisaj makinesine m14 mekanik uzatma; maintenance_kit (IK pompa yedek parça/bakım setleri) tamamen farklı ürün ailesi.
- **5 kriter:** Primary kategori ✗, Kullanım senaryosu ✗
- **Öneri:** `extension_kit` korunsun veya polisher_machine grubuna `polisher_accessory` olarak taşı (516112 ile paralel).

### R8. 82671872 `handle → repair_part`
- **Ürün:** IK PRO HANDLE INOX Basınçlı Pompa Püskürtme Kolu
- **Sorun:** `handle` spesifik bir bileşen; `repair_part` aşırı jenerik bir şemsiye. Bilgi kaybı; RAG "kol/handle" aramasında bulunamaz.
- **5 kriter:** Filter mantığı ✗ (jenerikleşme)
- **Öneri:** `handle` korunsun; spare_part ailesinde her bileşen ayrı kalmalı.

### R9. 417882 `charger → battery`
- **Ürün:** FLEX 10.8/18V Akü Uyumlu LED Göstergeli Şarj Cihazı (230V-9A)
- **Sorun:** Şarj cihazı ≠ akü. Karşı SKU 445894 (FLEX AP 18.0V 5.0AH Yedek Akü) tamamen farklı bir ürün. Kategorik hata olur.
- **5 kriter:** Primary kategori ✗, Formülasyon ✗ (elektronik devre vs Li-ion hücre), Filter mantığı ✗
- **Öneri:** `charger` korunsun; ileride 2+ ürün olduğunda `power_accessory` çatısı (charger + battery + power_supply) düşünülebilir.

## sprayers_bottles (1 REJECT)

### R10. Q2M-P-DB300M `dispenser_bottle → pump_sprayer`
- **Ürün:** GYEON QM Dispenser Bottle Dağıtıcı Şişe Biberon - 300 ml
- **Sorun:** Dispenser "biberon" sıkma şişesi; mekanik pompa yok. Pump sprayer basınçlı tetikli sprey pompası. Farklı mekanik, farklı kullanım.
- **5 kriter:** Formülasyon ✗ (pompa yok), Kullanım senaryosu ✗
- **Öneri:** `dispenser_bottle` korunsun.

---

**Toplam REJECT:** 10
