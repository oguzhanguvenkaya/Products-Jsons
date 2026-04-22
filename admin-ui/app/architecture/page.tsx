import {
  Database,
  Sparkles,
  GitBranch,
  Server,
  Globe,
  Layers,
} from "lucide-react";
import { MermaidDiagram } from "@/components/architecture/mermaid";
import { Glossary, type GlossaryEntry } from "@/components/architecture/glossary";

/* ─────────────────────────── Servis topolojisi ─────────────────────────── */

const FLOW_GLOSSARY: GlossaryEntry[] = [
  {
    id: "U",
    label: "Müşteri webchat",
    layer: "Kullanıcı",
    body: "mtskimya.com sitesindeki Botpress webchat widget'ı. Tarayıcıda HTTPS üzerinden Botpress messaging-server'a bağlanır; tüm kullanıcı mesajlarının başlangıç noktası.",
  },
  {
    id: "DAMS",
    label: "detailagent-ms (v10, active)",
    layer: "Botpress Cloud",
    tone: "primary",
    body: "Aktif bot. Phase 4'te microservice'e geçirilen yeni nesil ajan. 7 tool çağrısı (searchProducts, searchFaq, getProductDetails, getApplicationGuide, getRelatedProducts, searchByPriceRange, searchByRating) doğrudan retrieval-service'e HTTP yapar.",
  },
  {
    id: "DA",
    label: "detailagent (v9.2, frozen)",
    layer: "Botpress Cloud",
    body: "Eski bot, şu an dokunulmaz. Botpress Tables'a doğrudan bağlı; Phase 6 cutover'a kadar emergency rollback için canlı tutuluyor.",
  },
  {
    id: "Mid",
    label: "middleware",
    layer: "retrieval-service · Fly.io iad",
    body: "Tüm /search ve /admin isteklerinden önce çalışır: Bearer auth (timing-safe compare), JSON request logger, error handler. /health ve /admin path'leri kendi auth'larını kullanır.",
  },
  {
    id: "S",
    label: "/search (hybrid)",
    layer: "retrieval-service · Fly.io iad",
    tone: "primary",
    body: "Ana arama endpoint'i. Türkçe normalize → synonym expand → slot extract → BM25 + vector parallel → RRF fusion → business boosts pipeline'ını koşturur. mode=hybrid|pure_vector flag'i.",
  },
  {
    id: "F",
    label: "/faq",
    layer: "retrieval-service · Fly.io iad",
    body: "FAQ semantic + SKU bypass. SKU verilmişse ürüne özel FAQ kümesini, verilmemişse cross-product semantic vector arama yapar. Confidence + recommendation string ile döner.",
  },
  {
    id: "P",
    label: "/products/:sku · /related · /guide",
    layer: "retrieval-service · Fly.io iad",
    body: "Deterministik lookup endpoint'leri: tek SKU detayı (6-tablo JOIN), 5 granular relation_type (use_with/use_before/use_after/accessories/alternatives), application guide (3-4× daha küçük payload + videoCard).",
  },
  {
    id: "SR",
    label: "/search/price · /search/rating",
    layer: "retrieval-service · Fly.io iad",
    body: "Spesifik amaçlı arama: fiyat aralığı (variant fiyatı dahil EXISTS branch), rating-based sıralama (specs.ratings JSONB extract). LLM multi-step yerine tek çağrı.",
  },
  {
    id: "Adm",
    label: "/admin/* (Catalog Atelier)",
    layer: "retrieval-service · Fly.io iad",
    tone: "warn",
    body: "Bu admin UI'nin bağlandığı surface. Ayrı RETRIEVAL_ADMIN_SECRET ile korunur. taxonomy/coverage/products/faqs/relations/agents/tools/staging endpoint grupları.",
  },
  {
    id: "T1",
    label: "products (511)",
    layer: "Supabase Postgres · us-east-1",
    body: "Ana ürün tablosu. JSONB `specs` (howToUse/whenToUse/whyThisProduct + 156+ key) ve `sizes[]` (variant array) tek satırda. Trigger ile updated_at otomatik güncellenir.",
  },
  {
    id: "T2",
    label: "product_faqs (3 156)",
    layer: "Supabase Postgres · us-east-1",
    body: "3 scope (product/brand/category). Her satır için Turkish FTS tsvector + Gemini embedding. SKU NULL ise scope=brand veya category demektir.",
  },
  {
    id: "T3",
    label: "product_relations (1 301)",
    layer: "Supabase Postgres · us-east-1",
    body: "(sku, related_sku, relation_type) primary key. Phase 4'te eski 4 tip (primary/variant/complement/alternative) yanına 5 granular tip eklendi (use_with/use_before/use_after/accessories/alternatives).",
  },
  {
    id: "T4",
    label: "product_meta (1 961)",
    layer: "Supabase Postgres · us-east-1",
    body: "EAV tablosu (key + value_text/value_numeric/value_boolean). Filtre tabanlı arama için (silicone_free, contains_sio2, ph_level vs.). Specs JSONB ile çakışan alanlar var, normalize edilmeli.",
  },
  {
    id: "T5",
    label: "synonyms (38)",
    layer: "Supabase Postgres · us-east-1",
    body: "Türkçe synonym sözlüğü (cila → polish/pasta, seramik → ceramic_coating). synonymExpander pipeline aşamasında query'i genişletir. Phase 6.5'te ~100'e çıkarılacak.",
  },
  {
    id: "E",
    label: "product_embeddings (768d)",
    layer: "Supabase Postgres · us-east-1",
    tone: "secondary",
    body: "pgvector 0.8 sütunu. Her ürünün search_text'i (name + brand + sub_cat + specs özeti) Gemini embedding-001 ile vektörlenir. ivfflat index ile cosine similarity araması.",
  },
  {
    id: "FE",
    label: "faq_embeddings (768d)",
    layer: "Supabase Postgres · us-east-1",
    tone: "secondary",
    body: "FAQ soru+cevap birleşik metninin vektörü. Cross-product semantic search için kullanılır (\"silikon içerir mi\" → ürün-bağımsız cevap çekme).",
  },
  {
    id: "FTS",
    label: "Turkish FTS GIN",
    layer: "Supabase Postgres · us-east-1",
    body: "Postgres `to_tsvector('turkish', ...)` üzerine GIN index. Snowball stemmer ile Türkçe kök bulma. BM25 skoru için ts_rank_cd kullanılır.",
  },
  {
    id: "G",
    label: "Gemini embedding-001",
    layer: "Dış servisler",
    tone: "secondary",
    body: "Google AI Studio'nun multilingual embedding modeli, 768 boyut. Hem ürün/FAQ embed pipeline'ında hem her query'de tek seferlik vektörleme için. LRU cache (1000 query / 24h) ile maliyet düşürülür.",
  },
];

const FLOW_DIAGRAM = `
flowchart TB
    subgraph User["Kullanıcı"]
        U[Müşteri webchat]
    end

    subgraph BP["Botpress Cloud"]
        DA[detailagent v9.2<br/>frozen]
        DAMS[detailagent-ms v10<br/>active]
    end

    subgraph MS["retrieval-service · Fly.io iad"]
        Mid["middleware<br/>auth · logger · error"]
        S["/search hybrid"]
        F["/faq SKU + semantic"]
        P["/products/:sku · related · guide"]
        SR["/search/price · /search/rating"]
        Adm["/admin/* (Catalog Atelier)"]
    end

    subgraph DB["Supabase Postgres us-east-1"]
        T1[("products 511")]
        T2[("product_faqs 3 156")]
        T3[("product_relations 1 301")]
        T4[("product_meta 1 961")]
        T5[("synonyms 38")]
        E[("product_embeddings<br/>pgvector 768d")]
        FE[("faq_embeddings<br/>pgvector 768d")]
        FTS[("Turkish FTS GIN")]
    end

    subgraph Ext["Dış servisler"]
        G[Gemini embedding-001<br/>768 dim]
    end

    U -->|HTTPS| BP
    DA -.->|legacy: Botpress Tables| BP
    DAMS -->|Bearer auth, 3s timeout| MS
    Mid --> S & F & P & SR & Adm
    S --> G
    F --> G
    G --> E & FE
    S -->|RRF fusion| FTS & E
    F --> FE
    P --> T1 & T2 & T3 & T4
    Adm --> T1 & T2 & T3 & T4 & T5

    style DAMS fill:#C65D3F,color:#FAF6ED,stroke:#8B3E28
    style DA fill:#EDE7DA,color:#5E5540,stroke:#B8AC96
    style MS fill:#FAF6ED,stroke:#7A8B56,stroke-width:2px
    style DB fill:#FAF6ED,stroke:#D4953E,stroke-width:2px
    style G fill:#7A8B56,color:#FAF6ED,stroke:#62724A
`;

const RAG_PIPELINE = `
flowchart LR
    Q["Kullanıcı sorgusu<br/>'seramik kaplama öner'"]

    subgraph Norm["1\\. Normalize"]
        TN[turkishNormalize<br/>ı ↔ i, ş ç ğ ö ü]
    end

    subgraph Synon["2\\. Synonym expand"]
        SE[synonymExpander<br/>cila → polish · pasta]
    end

    subgraph Slot["3\\. Slot extraction"]
        SX[slotExtractor<br/>brand · group · sub_type<br/>priceMin/Max · rating]
    end

    subgraph Retrieve["4\\. Hybrid retrieval"]
        E[Gemini embed<br/>768d]
        BM[BM25 Turkish FTS<br/>OR-tsquery]
        VEC[pgvector cosine]
        E --> VEC
        BM -.parallel.-> RRF
        VEC -.parallel.-> RRF[RRF fusion<br/>k=60]
    end

    subgraph Post["5\\. Boosts + format"]
        B[business boosts<br/>rating · stock · featured]
        F[formatter<br/>carousel + raw + debug]
    end

    Q --> TN --> SE --> SX --> Retrieve --> B --> F --> Out["Bot tool output<br/>productSummaries[]"]

    style Q fill:#C65D3F,color:#FAF6ED,stroke:#8B3E28
    style E fill:#7A8B56,color:#FAF6ED,stroke:#62724A
    style RRF fill:#D4953E,color:#2C2820,stroke:#B07926
    style Out fill:#7A8B56,color:#FAF6ED,stroke:#62724A
`;

/* ─────────────────────────── RAG glossary ─────────────────────────── */

const RAG_GLOSSARY: GlossaryEntry[] = [
  {
    id: "Q",
    label: "Kullanıcı sorgusu",
    layer: "Giriş",
    tone: "primary",
    body: "Bot'un searchProducts/searchFaq tool'undan gelen ham metin. Ortalama 3-8 kelime, Türkçe yazım hataları + casing varyantları içerir (\"polısaj\", \"GYEON\" vs. \"gyeon\").",
  },
  {
    id: "TN",
    label: "turkishNormalize",
    layer: "1. Normalize",
    body: "ı↔i typo toleransı, ş/ç/ğ/ö/ü diakritiklerini koruyarak normalize. Casing'i lowercase'e çekmez (özel isimler için). Phase 3'te eklenmişti, FTS skoru ve embed kalitesini ikisini de iyileştirdi.",
  },
  {
    id: "SE",
    label: "synonymExpander",
    layer: "2. Synonym",
    body: "synonyms tablosundaki 38 eşanlamlı eşlemesini OR olarak query'e enjekte eder. \"cila\" gelirse \"cila|polish|pasta\" olur. BM25 recall'unu yükseltir; vektör arama zaten semantic.",
  },
  {
    id: "SX",
    label: "slotExtractor",
    layer: "3. Slot extraction",
    body: "Regex + keyword tabanlı brand/template_group/sub_type/priceMin/priceMax/rating çıkarımı. \"GYEON 1000 TL altı seramik\" → {brand:'GYEON', priceMax:1000, sub_type:'paint_coating'}. Slot'lar SQL filter'a döner.",
  },
  {
    id: "E",
    label: "Gemini embed (768d)",
    layer: "4. Hybrid retrieval",
    tone: "secondary",
    body: "Query string'i Gemini embedding-001'e gönderir. Cevap LRU cache'lenir (5 dk TTL, 500 entry). Vector branch'in girdisi.",
  },
  {
    id: "BM",
    label: "BM25 Turkish FTS",
    layer: "4. Hybrid retrieval",
    body: "OR-tsquery formatı: tüm query token'ları | ile birleştirilir, normalize edilir. ts_rank_cd ile skorlanır. Tarihsel/exact-match avantajı yüksek (\"Menzerna 400\" gibi).",
  },
  {
    id: "VEC",
    label: "pgvector cosine",
    layer: "4. Hybrid retrieval",
    body: "product_embeddings tablosuna cosine distance ile yakın komşu sorgusu. Top 50 aday döner. Semantic genelleme avantajı yüksek (\"böcek temizleyici\" → bug remover ürünleri).",
  },
  {
    id: "RRF",
    label: "RRF fusion (k=60)",
    layer: "4. Hybrid retrieval",
    tone: "warn",
    body: "Reciprocal Rank Fusion: rank(BM25) ve rank(vector) listelerini 1/(k+rank) formülüyle birleştirir. k=60 standart parametre. İki sinyalin tek skor matrisine indirgenmesi.",
  },
  {
    id: "B",
    label: "business boosts",
    layer: "5. Post-processing",
    body: "is_featured, stock_status='in_stock', rating yüksekliği gibi business sinyallerle skor ayarı. Ranking'i kullanılabilirlik + öneri kalitesine yönlendirir.",
  },
  {
    id: "F",
    label: "formatter",
    layer: "5. Post-processing",
    body: "DB satırlarını bot tool output şemasına çevirir: productSummaries[] (carousel-ready: title/subtitle/imageUrl/actions), rankedProducts[] (raw + debug), filtersApplied (LLM'in görmesi gereken sinyaller).",
  },
  {
    id: "Out",
    label: "Bot tool output",
    layer: "Çıkış",
    tone: "secondary",
    body: "JSX render'a hazır, ortalama 5 ürün × 3 alan (title/subtitle/url). Bot LLM bu output'u alır, kullanıcıya carousel + metin yanıt olarak yield eder.",
  },
];

const STAGING_FLOW = `
flowchart LR
    Op[Operatör]
    UI[Admin UI<br/>InfoPanel · SpecEditor<br/>FAQ · Relations]
    LS[(Zustand<br/>localStorage)]
    Stg["/staging drawer"]
    Prev["/admin/staging/preview"]
    Cmt["/admin/staging/commit"]
    DB[(Supabase<br/>products / faqs<br/>relations / meta)]
    Aud[(audit_log)]

    Op -->|inline edit| UI
    UI -->|stageChange| LS
    LS --> Stg
    Stg -->|review| Prev
    Prev -->|SQL preview| Op
    Op -->|onayla| Cmt
    Cmt -->|tek transaction| DB
    Cmt -->|fire-and-forget| Aud

    style UI fill:#FAF6ED,stroke:#C65D3F,stroke-width:2px
    style LS fill:#D4953E,color:#2C2820
    style Cmt fill:#C65D3F,color:#FAF6ED
    style DB fill:#7A8B56,color:#FAF6ED
`;

/* ─────────────────────────── Staging glossary ─────────────────────────── */

const STAGING_GLOSSARY: GlossaryEntry[] = [
  {
    id: "Op",
    label: "Operatör",
    layer: "Aktör",
    tone: "primary",
    body: "Catalog Atelier kullanıcısı (sen). Ürün detayında EditableCell'den, FAQ Manager'dan veya Bulk wizard'larından düzenleme tetikler. Hata yapma riski yüksek olduğu için tüm değişiklikler önce browser-local kalır.",
  },
  {
    id: "UI",
    label: "Admin UI bileşenleri",
    layer: "Tarayıcı",
    body: "InfoPanel inline edit, SpecEditor, VariantEditor, FaqEditor, RelationEditor, Bulk wizard'ları. Her biri stageChange() çağırarak Zustand store'a düşer; doğrudan DB'ye fetch ATMAZ.",
  },
  {
    id: "LS",
    label: "Zustand + localStorage",
    layer: "Tarayıcı",
    tone: "warn",
    body: "useStagingStore (catalog-atelier.staging key'i ile localStorage persist). Her diff: {sku, scope, field, before, after, label}. Aynı (sku,scope,field) tuple'ı ikinci defa düzenlenirse coalesce edilir, drawer'da tekilleşir.",
  },
  {
    id: "Stg",
    label: "/staging drawer",
    layer: "Review",
    body: "Bekleyen tüm diff'leri SKU bazlı gruplayarak listeler. Her satırın yanında 'geri al' butonu var; tüm staging'i temizleme + commit'e geçiş bağlantıları üstte.",
  },
  {
    id: "Prev",
    label: "/admin/staging/preview",
    layer: "Backend",
    body: "POST endpoint. Diff array'ini alır, her satırı plan() fonksiyonundan geçirip 'planned' / 'unsupported' / 'skipped' kategorisine ayırır. Plan SQL string'i üretir AMA çalıştırmaz. Operatör SQL'i tek tek görür.",
  },
  {
    id: "Cmt",
    label: "/admin/staging/commit",
    layer: "Backend",
    tone: "primary",
    body: "POST endpoint. sql.begin() içinde her planned değişikliği (UPDATE products / jsonb_set specs / INSERT FAQ / DELETE relation vs.) çalıştırır. Bir satır fail ederse TÜM commit rollback olur — partial write yok.",
  },
  {
    id: "DB",
    label: "Supabase tabloları",
    layer: "Persistence",
    tone: "secondary",
    body: "products, product_faqs, product_relations, product_meta. Commit transaction'ı bu tablolara yazar. updated_at trigger'ı products satırlarında otomatik döner; FAQ/relation için yeni satır timestamp'i create_at'tan gelir.",
  },
  {
    id: "Aud",
    label: "audit_log",
    layer: "Persistence",
    body: "Migration 008 ile gelen append-only tablo. Her commit step'i için (sku, scope, field, before_value, after_value, change_id, request_id) satırı yazılır. Yazım fire-and-forget — tablo yoksa commit yine başarılı sayılır. /activity feed buradan okur.",
  },
];

export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8">
        <div className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
          Mimari · Phase 4.9.13
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">
          Sistem mimarisi
        </h1>
        <p className="mt-2 max-w-3xl text-foreground-muted">
          Botpress bot'undan Supabase pgvector'a kadar isteğin geçtiği tüm
          katmanlar. Hybrid retrieval pipeline, RAG katmanları ve
          Catalog Atelier staging→commit akışı ayrı diyagramlarda.
        </p>
      </header>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline gap-2">
          <Server className="size-4 text-terracotta-500" aria-hidden />
          <h2 className="font-display text-xl text-stone-700">
            Servis topolojisi
          </h2>
        </div>
        <p className="mb-3 text-sm text-foreground-muted">
          Webchat → Botpress Cloud → microservice (Fly.io iad) → Supabase
          (us-east-1, &lt;3ms RTT). Bot tool çağrıları Bearer auth ile
          3sn timeout'lu HTTP. Admin UI ayrı endpoint setiyle aynı
          microservice'e bağlanıyor.
        </p>
        <div className="rounded-lg border border-border bg-surface p-5">
          <MermaidDiagram chart={FLOW_DIAGRAM} id="flow" />
        </div>
        <Glossary entries={FLOW_GLOSSARY} />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline gap-2">
          <Sparkles className="size-4 text-sage-600" aria-hidden />
          <h2 className="font-display text-xl text-stone-700">
            Hybrid retrieval pipeline
          </h2>
        </div>
        <p className="mb-3 text-sm text-foreground-muted">
          Bir <code className="font-mono text-xs">/search</code> isteği 5
          aşamadan geçer. BM25 (Turkish FTS) ve vector cosine paralel
          koşar, RRF (k=60) ile birleştirilir, business boosts (rating,
          stock, featured) sıralamayı son rötuşlar.
        </p>
        <div className="rounded-lg border border-border bg-surface p-5">
          <MermaidDiagram chart={RAG_PIPELINE} id="rag" />
        </div>
        <Glossary entries={RAG_GLOSSARY} />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline gap-2">
          <GitBranch className="size-4 text-amber-600" aria-hidden />
          <h2 className="font-display text-xl text-stone-700">
            Catalog Atelier staging → commit akışı
          </h2>
        </div>
        <p className="mb-3 text-sm text-foreground-muted">
          Hiçbir UI düzenleme DB'ye direkt yazılmaz. Operatör değişikliği
          önce browser-local Zustand store'a düşer, /staging drawer'da
          review edilir, /commit önce SQL preview üretir, onaydan sonra
          tek transaction'la Supabase'e uygulanır. audit_log
          fire-and-forget yazımla activity feed'e besler.
        </p>
        <div className="rounded-lg border border-border bg-surface p-5">
          <MermaidDiagram chart={STAGING_FLOW} id="staging" />
        </div>
        <Glossary entries={STAGING_GLOSSARY} />
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Stack
          icon={<Database className="size-4 text-sage-600" aria-hidden />}
          title="Veri katmanı"
          rows={[
            ["Supabase Postgres", "us-east-1, pgvector 0.8"],
            ["FTS dictionary", "turkish (snowball)"],
            ["Vector dim", "768 (Gemini embedding-001)"],
            ["RLS", "service_role only"],
          ]}
        />
        <Stack
          icon={<Server className="size-4 text-terracotta-500" aria-hidden />}
          title="Microservice"
          rows={[
            ["Runtime", "Bun + Hono"],
            ["Hosting", "Fly.io iad · 2 machines"],
            ["Cache", "in-memory LRU (embed 1000/24h)"],
            ["Auth", "Bearer · timing-safe compare"],
          ]}
        />
        <Stack
          icon={<Layers className="size-4 text-amber-600" aria-hidden />}
          title="Bot katmanı"
          rows={[
            ["Botpress ADK", "TypeScript Autonomous"],
            ["Active bot", "detailagent-ms (v10)"],
            ["Frozen bot", "detailagent (v9.2 fallback)"],
            ["7 tool", "search · faq · details · related · price · rating · guide"],
          ]}
        />
      </section>

      <footer className="rounded-md border border-dashed border-border bg-cream-100 p-4 text-xs text-foreground-muted">
        <Globe className="mr-1 inline-block size-3" aria-hidden />
        Diyagramlar mermaid 11.14 ile client-side render edilir; sıcak
        tema (cream/terracotta/sage/amber) tokenları diyagramlara
        otomatik bağlandı. Karanlık modda renkler ters çevrilir.
      </footer>
    </div>
  );
}

function Stack({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="font-display text-base text-stone-700">{title}</h3>
      </div>
      <dl className="space-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2">
            <dt className="text-foreground-muted">{k}</dt>
            <dd className="font-mono text-stone-700 text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
