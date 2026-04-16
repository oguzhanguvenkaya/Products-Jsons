# Botpress Araştırma Notları - Kapsamlı

## 1. TABLES (Tablolar)

### Sınırlar
- Tablo başına en fazla 20 sütun (kesin sınır, artırılamaz)
- Ücretsiz planda 10 tablo, 10.000 satır
- Ücretli planlarda tablo ve satır sayısı artırılabilir

### Row Factors (Satır Faktörleri)
- String, Number, Boolean, Date → 1x faktör
- Object → 3x faktör (her satır 3 satır sayılır)
- Array → 5x faktör (her satır 5 satır sayılır)
- Önemli: Object/Array kullanmak satır kapasitesini hızla tüketir

### Alan Tipleri
- String, Number, Boolean, Date, Object, Array, Custom Schema

### Searchable (Aranabilir) Alanlar
- String, Object, Array ve özel şema alanları "searchable" yapılabilir
- Searchable alanlar Knowledge Base üzerinden aranabilir
- Kısmi metin araması (partial text search) desteklenir, benzerlik puanı ile

### Filtreleme
- MongoDB benzeri sözdizimi
- AND/OR operatörleri, iç içe gruplar
- Kurallar: equal, not equal, less than, greater than, in, not in, is null, is not null
- Regex desteği

### Projeksiyon ve Toplama
- count, unique, min, max, sum, avg

### Erişim Yöntemleri
- Arayüz üzerinden manuel CRUD
- Table Cards: Get Record, Insert Record, Update Record, Delete Record, Find Records
- Botpress Client API (kod ile)
- Execute Code Card ile JavaScript

### CSV İçe Aktarma
- Botpress Studio'da CSV import/export desteklenir

### Tablo Arası Referans
- Doğrudan foreign key yok
- Bir tablodaki SKU/ID ile başka tabloda findTableRows yapılabilir
- Execute Code Card ile çapraz tablo sorguları mümkün

## 2. KNOWLEDGE BASE (Bilgi Bankası)

### Kaynak Türleri
- Websites (kök alan veya belirli sayfalar, yeniden tarama zamanlanabilir)
- Documents (.pdf, .html, .txt, .doc, .docx, .md - max 50 MB)
- Tables (tablo sütunları seçilebilir, searchable sütunlar gerekli)
- Web Search (gerçek zamanlı internet araması)
- Rich Text (doğrudan metin girişi)
- Integrations (Notion, Google Drive vb.)

### Tablo Kaynak Olarak
- Tablolar KB'ye bağlanabilir
- Sütun bazında filtreleme yapılabilir (hangi sütunlar KB'de görünecek)
- Searchable sütunlar gerekli
- Kullanıcılar doğal dilde tablo verilerini sorgulayabilir

### En İyi Uygulamalar
- Yapılandırılmış veri → Tables
- Yapılandırılmamış ama mantıksal veri → Rich Text
- Belge formatındaki veri → Documents
- Birden fazla KB oluşturulabilir, farklı konular için ayrı KB
- Veri kalitesi kritik: doğru, güncel, gereksiz detaylardan arındırılmış
- ROT analizi (Redundant, Obsolete, Trivial) önerilir

### Arama Mekanizması
- Autonomous Node varsayılan olarak Search Knowledge kartı içerir
- Birden fazla KB aynı anda veya bağlama göre seçilerek aranabilir
- Her Search Knowledge kartına Instructions eklenebilir
- turn.KnowledgeAgent.answer ve turn.KnowledgeAgent.citations değişkenleri

### Chunks Count
- KB'den modele gönderilen parça sayısı ayarlanabilir
- Daha fazla parça = daha doğru ama daha yavaş ve pahalı

## 3. VARIABLES (Değişkenler)

### Kapsamlar
- Workflow: Sadece mevcut iş akışında
- User: Kullanıcının tüm konuşmalarında
- Conversation: Sadece mevcut konuşmada
- Bot: Tüm bot etkinliğinde
- Configuration: Tüm bot etkinliğinde, kullanıcıya gösterilemez (API anahtarları vb.)

### Veri Tipleri
- String, Boolean, Number, Date, Object, Array, Enum, Pattern

### Kullanım
- Autonomous Node'a değişken erişimi verilmeli (okuma/yazma)
- Kartlarda ve kodda {{workflow.variableName}} ile okunur
- Varsayılan değer atanabilir

## 4. WORKFLOWS (İş Akışları)

### Yapı
- Her iş akışı: Entry Node → ara Node'lar → Exit Node
- Main, Error, Timeout, Conversation End yerleşik iş akışları
- Alt iş akışlarına geçiş (transition) yapılabilir
- Klasörlerde organize edilebilir
- Botpress Hub'dan hazır iş akışları yüklenebilir

### Veri Aktarımı
- Workflow değişkenleri ile iş akışları arası veri aktarımı
- User ve Conversation değişkenleri iş akışları arasında paylaşılır

## 5. AUTONOMOUS NODE

### Yapı
- LLM tabanlı karar mekanizması
- Instructions (prompt) ile yönlendirilir
- Cards eklenebilir (LLM ne zaman kullanacağına karar verir)
- Değişken erişimi açıkça verilmeli

### Varsayılan Araçlar
- global.think: Düşünme/işleme
- global.search: KB araması
- clock.setReminder: Hatırlatıcı
- global.Message: Mesaj gönderme

### Prompting İpuçları
- Markdown kullan
- Spesifik ol
- Aşırı uzun prompt yazma
- Konuşma akışını yönlendir
- Araçlara doğrudan atıfta bulun

## 6. AGENTS (Ajanlar)

### Türler ve Çalışma Sırası
1. Summary Agent: Konuşma özeti
2. Personality Agent: Kişilik/ton
3. Policy Agent: İş kuralları ve uyumluluk
4. Translator Agent: Çok dilli destek
5. Knowledge Agent: KB'den bilgi çekme
6. Vision Agent: Görsel işleme
7. Router Agent: Yönlendirme
8. Analytics Agent: Analitik
9. HITL Agent: İnsan müdahalesi

### Knowledge Agent
- KB'den bilgi çekme sorumlusu
- Answer Manually seçeneği
- Additional Context
- Model Strategy (Fastest/Best)
- Chunks Count ayarı
- turn.KnowledgeAgent.answer ve citations değişkenleri

## 7. CARDS (Kartlar)

### Table Cards
- Get Record: ID ile tek kayıt
- Insert Record: Yeni kayıt ekleme
- Update Record: Kayıt güncelleme
- Delete Record: Kayıt silme
- Find Records: Doğal dil filtresi ile çoklu kayıt arama

### Execute Code Card
- Özel JavaScript kodu çalıştırma
- Harici kütüphane import edilemez, Axios kullanılabilir
- Tablo sorguları, veri manipülasyonu, API çağrıları
- AI ile kod üretme desteği

### Diğer Kartlar
- Search Knowledge: KB araması
- Query Knowledge Bases: Programatik KB sorgusu
- Capture Information: Kullanıcıdan bilgi toplama
- Transition: Geçiş koşulları
