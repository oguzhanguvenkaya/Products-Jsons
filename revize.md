# Mevcut Botpress Raporu İçin Revizyon Notu

**Tarih:** 15 Nisan 2026  
**Amaç:** Kullanıcının paylaştığı v5 kök neden bulgularına göre önceki raporların hangi kısımlarının güçlendirilmesi veya revize edilmesi gerektiğini netleştirmek.

## Genel Değerlendirme

Yeni bulgular, önceki incelemede vardığım ana yönü büyük ölçüde **doğruluyor**, fakat aynı zamanda bazı noktaları **daha keskin ve daha dar kapsamlı** biçimde yeniden çerçevelemeyi gerektiriyor. Özellikle artık daha net söylenebilir ki, ana problem “genel olarak retrieval/ranking mimarisinin zayıf olması” değil; **birinci seviye üretim arızası**, conversation instructions içinde Botpress runtime JSX contract'ının ters öğretilmesi. Bunun en somut parçası da runtime'da olmayan `<Button>` bileşeninin 20'den fazla yerde modela öğretilmiş olmasıdır.

## Rapora Eklenmesi Gereken En Önemli Yeni Vurgu

Aşağıdaki tablo, önceki rapora göre hangi eklemelerin yapılması gerektiğini özetler.

| Başlık | Önceki rapordaki durum | Yeni kanıt sonrası revizyon |
|---|---|---|
| Kök neden dili | Render contract çelişkisi deniyordu ama daha genel çerçevede kalıyordu | **Keskinleştirilmeli:** aktif anti-template mevcut; instructions runtime'ın tersini öğretiyor |
| Veri katmanı değerlendirmesi | Tablolarda karmaşa olabileceği ihtimali açık bırakılmıştı | **Daraltılmalı:** mevcut kanıta göre veri/tablo katmanı ana kırık nokta değil |
| Tool katmanı | URL gap ve sanitization gap vurgulanmıştı | **Aynen korunmalı**, ama “ikincil sebep” olarak konumlandırılmalı |
| Mimari öneri | Retrieval/ranking/render ayrıştırması öneriliyordu | **Korunmalı**, fakat Faz 1 için kapsam daha minimal tutulmalı |
| Supabase/dış SQL/vector önerisi | Stratejik orta vadeli opsiyon olarak sunuluyordu | **Korunmalı**, ama mevcut crash'in çözümü için zorunlu değil diye netleştirilmeli |

## Raporda Değiştirilmesini Önereceğim Noktalar

Önceki raporumda değiştirmek isteyeceğim en önemli ifade, tablo ve veri modeline dair şüphe tonudur. Yeni v5 kanıtı, `components.d.ts`, traces istatistikleri ve satır bazlı instruction karşılaştırması sayesinde şunu artık daha rahat söylemeyi mümkün kılıyor:

> **Faz 1 kök neden, veri modelleme değil; JSX contract ters öğretimi ve bunun tetiklediği runtime render crash zinciridir.**

Bu nedenle önceki raporda geçen ve tablo sadeleştirme/refactor ihtimalini açık bırakan bölümler, artık şu şekilde yumuşatılmalıdır: tablo refactor bir optimizasyon veya Faz 2 konusu olabilir, fakat **mevcut kullanıcı hatalarının ana nedeni değildir**.

## Özellikle Eklenmesi Gereken Kanıtlar

Yeni dosyadaki şu maddeler rapora doğrudan alınmalı:

| Eklenecek kanıt | Neden kritik? |
|---|---|
| `components.d.ts` tabanlı gerçek runtime contract tablosu | Teşhisi spekülasyondan çıkarıp kanıta dayalı hale getiriyor |
| 660 satır / 35+ section instruction büyüklüğü | Prompt bloat iddiasını ölçülebilir kılıyor |
| `traces.db` hata dağılımı ve 38 `autonomous.iteration` error | Sorunun canlı üretim izlerini gösteriyor |
| `<Button>` kaynaklı spesifik trace örneği | Birincil crash mekanizmasını açıkça ispatlıyor |
| 4 tool'da `url` alanı eksikliği | İkincil crash hattını netleştiriyor |
| Tool sanitization eksikliği | Runtime'a bozuk payload sızma yolunu gösteriyor |
| `agent.config.ts` vs `conversations/index.ts` drift | Faz 2 yapılandırma borcunu kanıtlıyor |

## Faz 1 ve Faz 2 Ayrımı Daha Net Yazılmalı

Raporda ayrıca önceliklendirme dili de revize edilmeli. Çünkü yeni plan çok net bir ayrım sunuyor.

| Faz | İçerik | Öncelik |
|---|---|---|
| Faz 1 | Instructions contract fix, `<Button>` kaldırma, `Choice` kullanımı, `url` alanları, sanitization, rebuild ve retest | **Acil** |
| Faz 2 | Modularization, confidence band, seed idempotency, knowledge cleanup, single-source-of-truth, README/runbook | **Sonraki iterasyon** |

Bu ayrım önemli; çünkü aksi halde ekip yine aynı anda fazla çok şeyi düzeltmeye çalışıp ana kırığı sulandırabilir.

## Önceki Raporda Koruyacağım Şeyler

Yeni bulgulara rağmen önceki rapordan koruyacağım bazı bölümler de var. Özellikle şu çerçeve hâlâ doğru:

1. **Retrieval, ranking, grounding ve rendering sorumlulukları uzun vadede ayrıştırılmalıdır.**
2. **Botpress mutlak engel değildir; asıl sorun orchestration ve contract disiplinidir.**
3. **Dış SQL/vector katmanı, kaliteyi artırmak için orta vadede anlamlı olabilir; fakat mevcut crash'in doğrudan çözümü değildir.**
4. **Evaluation katmanı gereklidir; retrieval başarısı ile render başarısı ayrı ölçülmelidir.**

Yani stratejik mimari görüşüm değişmiyor; yalnızca **yakın vadeli önceliklendirme** çok daha netleşiyor.

## Kullanıcıya Vereceğim Net Cevap

Bu bulgulara göre rapora iki ana değişiklik yapardım. Birincisi, kök nedeni daha sert ve daha kesin yazarım: **instructions, runtime contract'ın tersini öğretiyor; ana crash bunun sonucu**. İkincisi, tablo ve veri modeline dair şüphe tonunu düşürürüm: **mevcut kanıta göre veri ve tool arama katmanı genel olarak sağlam; esas kırık render contract ve tool output sanitization hattında**.

Aynı zamanda rapora ayrıca şu notu eklerim:

> **Supabase, vector DB veya dış SQL arayışı şu anki kırığı çözmek için ilk adım değildir.**  
> İlk adım, mevcut Botpress agent'ın runtime contract ile hizalanmasıdır.  
> Dış retrieval mimarisi ise ancak bu temel katman stabil olduktan sonra gerçek anlamda değerlendirilmelidir.

Sonuç olarak, sizin v5 bulgularınız önceki stratejik raporu tamamen geçersiz kılmıyor; fakat onu **daha doğru önceliklendirilmiş**, **daha kanıtlı** ve **fazlara ayrılmış** hale getiriyor.
