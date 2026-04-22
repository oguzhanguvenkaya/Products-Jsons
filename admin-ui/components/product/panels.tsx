import { ExternalLink, Info, Share2, History, MessageCircleQuestion, Ruler, Tag } from "lucide-react";
import type { SampleProduct, Faq, Relation, HistoryEvent, Variant } from "@/lib/data/sample-products";
import { cn } from "@/lib/utils";
import { EditableCell } from "@/components/edit/editable-cell";

const fmtTL = (n: number) => `${n.toLocaleString("tr-TR")} TL`;

/* -------------------------------------------------- Info panel */

export function InfoPanel({ product: p }: { product: SampleProduct }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["SKU", <code className="font-mono text-[12px]">{p.sku}</code>],
    ["Marka", p.brand],
    [
      "Base name",
      <EditableCell
        sku={p.sku}
        scope="product"
        field="base_name"
        value={p.base_name}
        kind="text"
        label="Base name"
        hint="Carousel / liste başlığında görünen kısa ad. Boyut eki YOK."
      />,
    ],
    ["Kategori", `${p.template_group} › ${p.template_sub_type}`],
    ["Yüzey", p.target_surface ?? "—"],
    [
      "Fiyat (primary)",
      <EditableCell
        sku={p.sku}
        scope="product"
        field="price"
        value={p.price}
        kind="number"
        label="Fiyat"
        formatAs="tl"
      />,
    ],
    ["Variant sayısı", p.sizes.length],
    [
      "URL",
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-terracotta-600 hover:text-terracotta-700"
      >
        mtskimya.com <ExternalLink className="size-3" />
      </a>,
    ],
    ["Video", p.video_url ? "Var" : "Yok"],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),260px]">
      <div>
        <h3 className="font-display text-lg text-stone-700">Temel bilgiler</h3>
        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-[160px,1fr]">
          {rows.map(([label, value], i) => (
            <div key={i} className="contents">
              <dt className="text-foreground-muted">{label}</dt>
              <dd className="text-stone-700">{value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 font-display text-lg text-stone-700">Açıklama</h3>
        <p className="mt-2 text-sm text-stone-700 leading-relaxed">
          {p.full_description}
        </p>
      </div>

      <aside className="rounded-md border border-border bg-cream-100 p-4 text-xs text-foreground-muted">
        <div className="mb-2 flex items-center gap-1.5 text-sage-600">
          <Info className="size-3.5" aria-hidden /> Inline edit aktif
        </div>
        Tıklanabilir alanlar (<span className="font-mono text-stone-700">price</span>,{" "}
        <span className="font-mono text-stone-700">base_name</span>) değişiklikleri
        browser-local staging kuyruğuna düşer. DB yazımı Phase 4.9.8 Commit
        Workflow üzerinden onayla yapılır.
      </aside>
    </div>
  );
}

/* -------------------------------------------------- Specs panel */

function renderSpecValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-foreground-muted">—</span>;
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (typeof value === "boolean") return value ? "evet" : "hayır";
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span
            key={i}
            className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-[11px] text-stone-700"
          >
            {String(v)}
          </span>
        ))}
      </div>
    );
  }
  return <pre className="font-mono text-[11px] text-stone-700">{JSON.stringify(value, null, 2)}</pre>;
}

export function SpecsPanel({ product: p }: { product: SampleProduct }) {
  const entries = Object.entries(p.specs);
  const narrative = entries.filter(([k]) =>
    ["howToUse", "whenToUse", "whyThisProduct"].includes(k),
  );
  const structured = entries.filter(
    ([k]) => !["howToUse", "whenToUse", "whyThisProduct"].includes(k),
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-display text-lg text-stone-700">Anlatı alanları</h3>
        <dl className="mt-3 space-y-3">
          {narrative.map(([key, val]) => (
            <div
              key={key}
              className="rounded-md border border-border bg-cream-100 p-3"
            >
              <dt className="text-[11px] uppercase tracking-wider text-foreground-muted">
                {key}
              </dt>
              <dd className="mt-1 text-sm text-stone-700 leading-relaxed">
                {String(val)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h3 className="font-display text-lg text-stone-700">Yapılandırılmış alanlar</h3>
        <p className="text-xs text-foreground-muted">
          {structured.length} key · JSONB <code className="font-mono">products.specs</code>
        </p>

        <table className="mt-3 w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="border-b border-border py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
              >
                Key
              </th>
              <th
                scope="col"
                className="border-b border-border py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
              >
                Değer
              </th>
            </tr>
          </thead>
          <tbody>
            {structured.map(([key, val]) => (
              <tr key={key} className="hover:bg-cream-100">
                <td className="border-b border-border/40 py-1.5 pr-4 font-mono text-[12px] text-stone-700">
                  {key}
                </td>
                <td className="border-b border-border/40 py-1.5 text-sm text-stone-700">
                  {renderSpecValue(val)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* -------------------------------------------------- Sizes panel */

export function SizesPanel({ sizes }: { sizes: Variant[] }) {
  if (sizes.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        Variant yok. <code className="font-mono">sizes[]</code> boş.
      </p>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-lg text-stone-700">Variant (sizes[])</h3>
          <p className="text-xs text-foreground-muted">
            {sizes.length} variant · primary = kategori listelerinde gösterilen satır
          </p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-cream-100">
            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              SKU
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Boyut
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Fiyat
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Primary
            </th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((v) => (
            <tr
              key={v.sku}
              className={cn(
                "border-b border-border/40 last:border-b-0",
                v.is_primary ? "bg-terracotta-500/5" : "hover:bg-cream-100",
              )}
            >
              <td className="px-3 py-1.5 font-mono text-[12px] text-stone-700">
                {v.sku}
              </td>
              <td className="px-3 py-1.5 text-stone-700">{v.size_label}</td>
              <td className="px-3 py-1.5 text-right font-mono text-stone-700">
                {fmtTL(v.price)}
              </td>
              <td className="px-3 py-1.5 text-right">
                {v.is_primary ? (
                  <span className="inline-flex items-center gap-1 rounded bg-terracotta-500 px-1.5 py-0.5 font-mono text-[10px] text-cream-50">
                    <Tag className="size-2.5" /> primary
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-foreground-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------- FAQ panel */

const CONFIDENCE_TONE: Record<NonNullable<Faq["confidence"]>, string> = {
  high: "text-sage-600 bg-sage-500/10",
  medium: "text-amber-600 bg-amber-500/10",
  low: "text-clay-red-500 bg-clay-red-500/10",
};

export function FaqPanel({ faqs }: { faqs: Faq[] }) {
  if (faqs.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        Bu ürün için SKU-scoped FAQ yok.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-stone-700">
        {faqs.length} FAQ kaydı
      </h3>
      <ul className="space-y-3">
        {faqs.map((f) => (
          <li
            key={f.id}
            className="rounded-md border border-border bg-cream-50 p-4"
          >
            <div className="flex items-start gap-2">
              <MessageCircleQuestion
                className="mt-0.5 size-4 shrink-0 text-terracotta-500"
                aria-hidden
              />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-stone-700">
                    {f.question}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-[10px] text-stone-600">
                      {f.scope}
                    </span>
                    {f.confidence && (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[10px]",
                          CONFIDENCE_TONE[f.confidence],
                        )}
                      >
                        {f.confidence}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-foreground-muted leading-relaxed">
                  {f.answer}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------- Relations panel */

const RELATION_LABEL: Record<Relation["relation_type"], string> = {
  use_with: "Birlikte kullan",
  use_before: "Öncesinde",
  use_after: "Sonrasında",
  accessories: "Aksesuar",
  alternatives: "Alternatif",
};

const RELATION_TONE: Record<Relation["relation_type"], string> = {
  use_with: "text-terracotta-600 border-terracotta-500/30 bg-terracotta-500/5",
  use_before: "text-sage-600 border-sage-500/30 bg-sage-500/5",
  use_after: "text-amber-600 border-amber-500/30 bg-amber-500/5",
  accessories: "text-stone-600 border-border bg-cream-100",
  alternatives: "text-clay-red-500 border-clay-red-500/30 bg-clay-red-500/5",
};

export function RelationsPanel({ relations }: { relations: Relation[] }) {
  if (relations.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        İlişki kaydı yok (Phase 6.5 enrichment kapsamında eklenebilir).
      </p>
    );
  }
  // group by type
  const byType = relations.reduce<Record<string, Relation[]>>((acc, r) => {
    (acc[r.relation_type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Share2 className="size-4 text-terracotta-500" aria-hidden />
        <h3 className="font-display text-lg text-stone-700">
          {relations.length} ilişki · {Object.keys(byType).length} tip
        </h3>
      </div>

      {Object.entries(byType).map(([type, items]) => (
        <section key={type}>
          <h4 className="mb-2 text-[11px] uppercase tracking-wide text-foreground-muted">
            {RELATION_LABEL[type as Relation["relation_type"]]} ·{" "}
            <code className="font-mono">{type}</code>
          </h4>
          <ul className="space-y-2">
            {items.map((r) => (
              <li
                key={r.target_sku}
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-sm",
                  RELATION_TONE[r.relation_type],
                )}
              >
                <div className="flex-1">
                  <div className="font-medium text-stone-700">{r.target_name}</div>
                  <code className="font-mono text-[11px] text-foreground-muted">
                    {r.target_sku}
                  </code>
                  {r.note && (
                    <p className="mt-1 text-xs text-foreground-muted">{r.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------- History panel */

export function HistoryPanel({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">Geçmiş kayıt bulunamadı.</p>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <History className="size-4 text-sage-600" aria-hidden />
        <h3 className="font-display text-lg text-stone-700">Zaman çizelgesi</h3>
      </div>
      <ol className="relative border-l-2 border-border pl-6">
        {events.map((e, i) => (
          <li key={i} className="mb-5 last:mb-0">
            <span className="absolute -left-[7px] mt-1 inline-block size-3 rounded-full bg-terracotta-500" />
            <div className="text-[11px] font-mono text-foreground-muted">
              {new Date(e.when).toLocaleString("tr-TR")} · {e.who}
            </div>
            <div className="mt-0.5 text-sm text-stone-700">{e.action}</div>
            {e.diff && (
              <pre className="mt-1 rounded bg-cream-200 p-2 font-mono text-[11px] text-stone-700">
                {e.diff}
              </pre>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-4 flex items-center gap-1 text-[11px] text-foreground-muted">
        <Ruler className="size-3" aria-hidden /> Tam audit log Phase 4.9.10'da
        canlılaşır.
      </p>
    </div>
  );
}
