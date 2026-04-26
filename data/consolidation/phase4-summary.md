# Faz 4 — Relation Mining Özeti

- Taranan ürün: **511**
- Taranan metin parçası (description + FAQ): **3471**
- Mevcut relations: **1301** (duplicate skip için yüklendi)
- Üretilen yeni öneri: **502** (after dedupe vs existing)

## Tip dağılımı
- `use_with`: **115**
- `use_before`: **147**
- `use_after`: **192**
- `alternatives`: **21**
- `accessories`: **27**

## Confidence dağılımı
- `high`: **42**
- `medium`: **193**
- `low`: **267**

## Tip × Confidence
| type | high | medium | low |
|---|---|---|---|
| use_with | 15 | 55 | 45 |
| use_before | 14 | 58 | 75 |
| use_after | 10 | 57 | 125 |
| alternatives | 2 | 7 | 12 |
| accessories | 1 | 16 | 10 |

## Skipped (mevcut relations ile çakışan)
- 19

## En güçlü 10 öneri (high, score↓)
1. **76280** → **76384** (use_with, score=38)
   - src: FRA-BER Bean Sporty Refill Oto Kokusu Yedek Kartuş
   - tgt: FRA-BER Bean Sporty Blister Uzun Süre Etkili Oto Kokusu
   - kanıt: [X ile uyumlu] …FRA-BER Bean Sporty araç kokusu ünitesi ile uyumludur.…
2. **SGGF181-57** → **SGGF181** (use_with, score=38)
   - src: SGCB Orbital Polisaj Makinesi Tabanı 125mm 5” – Cırtlı Delikli
   - tgt: SGCB Orbital Polisaj Makinesi 5&quot;/125mm 950W
   - kanıt: [X ile uyumlu] …Sadece SGCB SGGF181 kodlu orbital polisaj makinesi ile uyumludur.…
3. **SGYC011** → **SGGC055** (accessories, score=38)
   - src: SGCB Tornador Yedek Kılcal Hortum
   - tgt: SGCB Tornador Detaylı Temizlik Tabancası Boncuklu - 1000 ml
   - kanıt: [X için yedek/spare] …SGCB Tornador detaylı temizlik tabancası için yedek, plastik kılcal hortum. SGCB boncuklu t…
4. **76283** → **76389** (use_with, score=37)
   - src: FRA-BER Bean Classic Refill Oto Kokusu Yedek Kartuş
   - tgt: FRA-BER Bean Classic Sprey Araç Parfümü - 150 ml
   - kanıt: [X ile uyumlu] …FRA-BER Bean Classic araç kokusu ünitesi ile uyumludur.…
5. **492361** → **418102** (use_with, score=30)
   - src: FLEX BP-M D75 - PXE 80 İçin Cırtlı Tabanlık 75 mm / 3 inc
   - tgt: FLEX PXE 80 10.8-EC Set Rotary/Orbital Akülü Nano Polisaj Makinesi Seti
   - kanıt: [X ile uyumlu] …ideal yedek tabanlık! FLEX BP-M D75, yalnızca FLEX PXE 80 nano polisaj makinesi ile uyumlu özel dişli yuvasına sahip bir yedek tab…
6. **DOR150F-C** → **22748.261.001** (use_with, score=30)
   - src: MG PS Orbital Tek Adım Uygulama Süngeri (Turuncu) - 150/130x25 mm
   - tgt: MENZERNA One-Step Polish 3in1 Tek Adım Pasta Cila Koruma - 1 lt
   - kanıt: [X ile (birlikte) kullan] …Menzerna One Step Polish 3in1 ve benzeri tek adım ürünleri ile kullanılır.…
7. **DOR160F** → **22748.261.001** (use_with, score=30)
   - src: MG PS Rotary Tek Adım Uygulama Süngeri (Turuncu) - 160x30 mm
   - tgt: MENZERNA One-Step Polish 3in1 Tek Adım Pasta Cila Koruma - 1 lt
   - kanıt: [X ile (birlikte) kullan] …Menzerna One Step Polish 3in1 ve benzeri tek adım ürünleri ile kullanılır.…
8. **Q2M-PYA4000M** → **Q2-CCE200M** (use_after, score=27)
   - src: GYEON QM Prep Seramik PPF Folyo Kaplama Öncesi Yüzey Hazırlayıcı ve Temizleyici - 4000 ml
   - tgt: GYEON Q CanCoat EVO Hidrofobik Nano Seramik Kaplama Seti - 200 ml - 9H Oto Boya Koruma-Su İtici
   - kanıt: [X sonrası(nda)] …saj aşaması Prep öncesi yüzey düzeltme GYEON Q²M Mohs / CanCoat Seramik kaplama Prep sonrası maksimum bağlanma Sıkça Sorulan So…
9. **Q2M-PWE4040C** → **Q2M-SDE7090C** (use_after, score=26)
   - src: GYEON QM PolishWipe EVO Lazer Kesim Çift Yönlü Cila Bezi - 40x40 cm
   - tgt: GYEON QM SilkDryer EVO İnovatif Kurulama Havlusu - 70x90 cm
   - kanıt: [X sonrası(nda)] …Yüksek GSM ile sakız kalıntısı toplar GYEON Q²M SilkDryer EVO Kurulama & final kontrol Cila sonrası su lekesiz kurutma Sıkça Sorulan S…
10. **26935.099.001** → **26934.099.001** (use_with, score=24)
   - src: MENZERNA Rotary Polisaj Makineleri için Esnek ve Dayanıklı Ped Destek Disk Tabanlık - 148mm
   - tgt: MENZERNA Rotary Polisaj Makineleri Matkap için Dayanıklı Ped Destek Disk Tabanlık - 75mm
   - kanıt: [X ile uyumlu] …M14 dişli tüm rotary polisaj makineleri ile uyumludur.…

## Çıktılar
- `data/consolidation/phase4-relations-high.csv` — 42 satır
- `data/consolidation/phase4-relations-review.csv` — 460 satır
- `data/consolidation/phase4-relations-payload.json` — staging-API formatı, 42 change (max 500/batch)