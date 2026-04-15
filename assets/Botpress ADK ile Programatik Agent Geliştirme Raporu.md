# Botpress ADK ile Programatik Agent Geliştirme Raporu

**Hazırlanma Tarihi:** 11 Şubat 2026
**Hazırlayan:** Manus AI

## 1. Yönetici Özeti

Bu rapor, Botpress platformunda, özellikle **Agent Development Kit (ADK)** ve Komut Satırı Arayüzü (CLI) kullanarak, mevcut ürün veri setinizle gelişmiş bir müşteri hizmetleri agent'ı (yapay zeka temsilcisi) oluşturma olanaklarını detaylandırmaktadır. Araştırma, ADK'nın **beta** sürümde olmasına rağmen, kod tabanlı, versiyon kontrollü ve CI/CD süreçlerine entegre edilebilir bir geliştirme ortamı sunarak teknik yetkinliğe sahip ekipler için Botpress Studio'ya kıyasla çok daha güçlü ve esnek bir alternatif olduğunu ortaya koymuştur.

ADK, karmaşık iş akışlarının (Workflows), normalize edilmiş veri tablolarının (Tables), anlamsal bilgi bankalarının (Knowledge Bases) ve yapay zekanın dinamik olarak kullanabileceği araçların (Tools) tamamen kod ile (TypeScript) tanımlanmasına olanak tanır. Bu yaklaşım, projenizin mevcut veri yapısının karmaşıklığını ve 20 sütunluk tablo sınırını aşmak için önerilen **hibrit ve normalize edilmiş veri mimarisini** uygulamak için idealdir. Rapor, ADK'nın temel bileşenlerini, nasıl kullanılacağını ve projenize özel bir uygulama stratejisini adım adım açıklamaktadır.

## 2. Botpress ADK: Genel Bakış ve Temel Kavramlar

Botpress ADK, geliştiricilerin görsel arayüz (Studio) yerine doğrudan kod yazarak AI agent'ları oluşturmasını sağlayan bir TypeScript tabanlı bir geliştirme çerçevesidir [1]. Geliştirme süreci, standart yazılım geliştirme pratikleriyle (versiyon kontrolü, otomatik test, CI/CD) tam uyumludur.

### 2.1. Neden ADK Kullanılmalı?

- **Teknik Esneklik:** Karmaşık ve özel mantık gerektiren iş akışları üzerinde tam kontrol sağlar.
- **Versiyon Kontrolü:** Tüm agent mantığı (workflow, action, tool vb.) kod olarak yönetildiği için Git gibi sistemlerle takibi kolaydır.
- **Otomasyon (CI/CD):** Agent'ların derlenmesi ve Botpress Cloud'a dağıtılması (`adk deploy`) komut satırından otomatikleştirilebilir.
- **Tip Güvenliği (Type-Safety):** TypeScript ve Zod şemaları sayesinde, geliştirme aşamasında hatalar en aza indirilir ve veri yapıları tutarlı hale gelir.

### 2.2. Temel Proje Yapısı ve Bileşenler

Bir ADK projesi, `adk init` komutuyla oluşturulur ve belirli bir dosya yapısını takip eder. Her bir dizin, agent'ın farklı bir yeteneğini kodlar [2]:

| Dizin | Açıklama | Projenizdeki Kullanımı |
| :--- | :--- | :--- |
| `src/workflows/` | Çok adımlı, uzun süren veya zamanlanmış görevleri tanımlar. | Ürün arama, filtreleme ve karşılaştırma gibi karmaşık sorgu akışlarını yönetmek için. |
| `src/tables/` | Veri depolama şemalarını (Zod ile) tanımlar. Cloud ile otomatik senkronize olur. | Normalize edilmiş `products_master`, `product_specs`, `product_relations` gibi tabloları oluşturmak için. |
| `src/knowledge/` | Anlamsal arama için kullanılacak bilgi bankası kaynaklarını belirtir. | Mevcut Markdown (`.md`) dosyalarınızı ve zenginleştirilmiş metinleri agent'a bağlamsal bilgi olarak sunmak için. |
| `src/tools/` | AI modelinin sohbet sırasında dinamik olarak çağırabileceği fonksiyonları tanımlar. | `searchProducts`, `getPromotions` gibi, AI'ın doğal dil ile anlayıp çalıştırabileceği araçlar oluşturmak için. |
| `src/actions/` | Yeniden kullanılabilir, modüler iş mantığı bloklarıdır. | Tablolardan veri çekme, harici bir API'ye istek atma gibi temel operasyonları kodlamak için. |
| `src/conversations/`| Gelen mesajları ilk karşılayan ve ana AI talimatlarını içeren işleyicilerdir. | Agent'ın ana kişiliğini, talimatlarını ve hangi `tools` ile `knowledge` kaynaklarını kullanacağını belirlemek için. |
| `agent.config.ts` | Agent'ın ana yapılandırma dosyasıdır. Entegrasyonlar burada tanımlanır. | Agent'ın genel ayarlarını ve bağımlılıklarını yönetmek için. |

## 3. Strateji: Veri Mimarisi ve Workflow'ların ADK ile Uygulanması

Daha önceki analizde ortaya konan hibrit veri mimarisi, ADK kullanılarak programatik olarak verimli bir şekilde hayata geçirilebilir.

### Adım 1: Tabloların Kod ile Tanımlanması (`src/tables/`)

`data_analysis_results.md` dosyasında tasarlanan 5 normalize tablo (`products_master`, `product_content`, `product_relations`, `product_faq`, `product_specs`), ADK içinde `Table` nesneleri olarak oluşturulacaktır. Bu, 20 sütun sınırını tamamen ortadan kaldırır ve ilişkisel bir veri yapısı kurmanızı sağlar.

**Örnek: `products_master.ts`**
```typescript
import { Table, z } from "@botpress/runtime";

export default new Table({
  name: "ProductsMasterTable", // İsimlendirme kuralına dikkat: 30 karakter, "Table" ile bitmeli
  columns: {
    sku: { schema: z.string(), searchable: true },
    product_name: { schema: z.string(), searchable: true },
    main_cat: { schema: z.string(), searchable: true },
    // ... diğer 12 sütun
  },
});
```

### Adım 2: Veri Yükleme ve Senkronizasyon (`adk run`)

JSON dosyalarınızdaki verileri bu tablolara aktarmak için tek seferlik bir script yazılabilir. Bu script, `adk run scripts/seed_data.ts` komutuyla çalıştırılarak tüm veritabanını doldurur. Bu, verileri manuel olarak CSV formatına dönüştürüp yüklemekten çok daha verimli bir yöntemdir.

### Adım 3: Bilgi Bankasının Kod ile Tanımlanması (`src/knowledge/`)

Mevcut `chatbot_md` ve `knowledge_base_enriched_top50` klasörlerindeki Markdown dosyaları, bir `Knowledge` nesnesi olarak agent'a eklenebilir. ADK, yerel dosya yollarından bilgi bankası oluşturmayı (geliştirme sırasında) destekler [3].

**Örnek: `product_docs_kb.ts`**
```typescript
import { DataSource, Knowledge } from "@botpress/runtime";

// Üretim ortamı için bu dosyaların bir web sunucusunda barındırılması gerekir.
const FileSource = DataSource.Directory.fromPath("./knowledge_base_enriched_top50", {
  filter: (filePath) => filePath.endsWith(".md"),
});

export const ProductDocsKB = new Knowledge({
  name: "ProductDocuments",
  description: "Ürün detayları, karşılaştırmalar ve rehberler.",
  sources: [FileSource],
});
```

### Adım 4: Karmaşık Sorgular için Workflow ve Tool Tasarımı

Kullanıcının "X marka kırmızı bir cila ile kullanabileceğim mikrofiber bezler nelerdir?" gibi karmaşık bir sorusunu yanıtlamak için Studio'da dallanıp budaklanan bir yapı kurmak yerine, ADK ile bir `Workflow` veya `Tool` tanımlanabilir.

**Örnek: `product_finder_tool.ts` (`src/tools/`)**
```typescript
import { Autonomous, z } from "@botpress/runtime";
import * as actions from '../actions'; // Tablo sorgu action'ları

export default new Autonomous.Tool({
  name: "findCompatibleProducts",
  description: "Kullanıcının mevcut bir ürüne uyumlu veya birlikte kullanılabilecek başka ürünleri bulmasını sağlar. Ürün adı, kategori, renk gibi filtreler içerir.",
  input: z.object({
    productName: z.string().describe("Ana ürünün adı, örn: 'Hızlı Cila'"),
    category: z.string().optional().describe("Aranan uyumlu ürünün kategorisi, örn: 'Mikrofiber Bezler'"),
    color: z.string().optional().describe("Ürünün rengi"),
  }),
  output: z.object({ products: z.array(z.object({ name: z.string(), sku: z.string() })) }),
  
  handler: async ({ productName, category, color }) => {
    // 1. Ana ürünün SKU'sunu bul (actions.findProductByName)
    // 2. İlişki tablosundan (product_relations) uyumlu ürün SKU'larını çek (actions.findRelations)
    // 3. Uyumlu ürünlerin detaylarını ana tablodan (products_master) getir (actions.findProductsBySkus)
    // 4. Gerekirse kategori ve renk gibi ek filtrelere göre sonuçları daralt
    const compatibleProducts = await actions.complexProductQuery({ productName, category, color });
    return { products: compatibleProducts };
  },
});
```
Bu `Tool`, `conversation` içinde AI modeline sunulduğunda, model doğal dil talebini anlayarak bu aracı doğru parametrelerle kendisi çağıracaktır. Bu, **gerçek bir otonom agent davranışı** sağlar.

## 4. Sonuç ve Stratejik Öneri

Botpress ADK, projenizin gerektirdiği karmaşık veri yapısı ve sorgu mantığı için **kesinlikle doğru yaklaşımdır**. Studio'nun görsel arayüzü basit botlar için harika olsa da, sizin durumunuzdaki gibi çok sayıda sütun, normalize edilmiş veri ve dinamik sorgu ihtiyacı, kod tabanlı bir çözümü zorunlu kılmaktadır.

**Önerilen Yol Haritası:**

1.  **ADK Ortamını Kurun:** `adk` CLI'ı kurun ve `adk init` ile projenizi başlatın.
2.  **Tabloları Tanımlayın:** `src/tables/` altında normalize edilmiş 5 tabloyu Zod şemaları ile oluşturun.
3.  **Veri Yükleme Script'i Yazın:** `adk run` ile çalışacak, mevcut JSON verilerinizi yeni tablolara dolduracak bir script hazırlayın.
4.  **Knowledge Base'i Ekleyin:** `src/knowledge/` altında mevcut Markdown dosyalarınızı bir bilgi bankası olarak tanımlayın.
5.  **Temel Araçları (Tools) Geliştirin:** Ürün arama, filtreleme ve ilişki sorgulama gibi temel işlevler için `Tool`'lar oluşturun.
6.  **Conversation'ı Yapılandırın:** Ana `conversation` dosyasında agent'ın talimatlarını belirleyin ve oluşturduğunuz `Tool`'ları ve `Knowledge Base`'i AI modeline sunun.
7.  **Dağıtım ve Test:** `adk dev` ile yerel testleri yapın ve `adk deploy` ile agent'ınızı Botpress Cloud'a dağıtın.

Bu yaklaşım, size yalnızca mevcut sorunu çözmekle kalmayıp, aynı zamanda gelecekteki geliştirmeler için ölçeklenebilir, sürdürülebilir ve profesyonel bir altyapı sunacaktır.

---

### Referanslar

[1] Botpress. "Introduction to the ADK". *Botpress Documentation*. Erişim Tarihi: 11 Şubat 2026. [https://www.botpress.com/docs/adk/introduction](https://www.botpress.com/docs/adk/introduction)

[2] Botpress. "Project structure". *Botpress Documentation*. Erişim Tarihi: 11 Şubat 2026. [https://www.botpress.com/docs/adk/project-structure](https://www.botpress.com/docs/adk/project-structure)

[3] Botpress. "Knowledge". *Botpress Documentation*. Erişim Tarihi: 11 Şubat 2026. [https://www.botpress.com/docs/adk/concepts/knowledge](https://www.botpress.com/docs/adk/concepts/knowledge)
