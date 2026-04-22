import {
  Database,
  Sparkles,
  GitBranch,
  Server,
  Globe,
  Layers,
} from "lucide-react";
import { MermaidDiagram } from "@/components/architecture/mermaid";

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
