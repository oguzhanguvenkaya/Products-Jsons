import Link from "next/link";
import { AlertTriangle, Database, Sparkles, ArrowUpRight } from "lucide-react";

const STATS = [
  { label: "Toplam ürün", value: "511", sub: "13 marka · 26 template_group" },
  { label: "FAQ kapsamı", value: "3 156", sub: "~6 soru/ürün ort." },
  { label: "Relations", value: "1 301", sub: "5 granular ilişki tipi" },
  { label: "Synonyms", value: "38", sub: "Hedef: ~100 (Phase 6.5)" },
];

const ALERTS = [
  {
    tone: "danger" as const,
    title: "Null hotspot: ceramic_coating",
    body: "silicone_free %4.3, hardness %21.7. Coverage heatmap'ten detay.",
    href: "/heatmap",
    cta: "Heatmap",
  },
  {
    tone: "warning" as const,
    title: "Specs key duplication",
    body: "ph / ph_level / ph_tolerance aynı tabloda. Normalize önerisi hazır.",
    href: "/bulk",
    cta: "Bulk → Normalize",
  },
  {
    tone: "info" as const,
    title: "Prompt Lab hazır",
    body: "detailagent + detailagent-ms instruction + tool registry görüntülenebilir.",
    href: "/prompts",
    cta: "Prompt Lab",
  },
];

function toneClass(tone: "danger" | "warning" | "info") {
  if (tone === "danger") return "border-clay-red-500/30 bg-clay-red-500/5";
  if (tone === "warning") return "border-amber-500/30 bg-amber-500/5";
  return "border-sage-500/30 bg-sage-500/5";
}

function toneIconBg(tone: "danger" | "warning" | "info") {
  if (tone === "danger") return "bg-clay-red-500 text-cream-50";
  if (tone === "warning") return "bg-amber-500 text-stone-700";
  return "bg-sage-500 text-cream-50";
}

export default function DashboardHome() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8">
        <div className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
          Phase 4.9 · Scaffolding
        </div>
        <h1 className="mt-1 text-3xl text-stone-700">Catalog Atelier</h1>
        <p className="mt-2 max-w-2xl text-foreground-muted">
          511 ürünlük kataloğu operatör hızında temizlemek için güvenli staging arayüzü.
          Her değişiklik önce local staging'e düşer; review + commit aşamasından sonra DB'ye uygulanır.
        </p>
      </header>

      <section aria-label="Katalog istatistikleri" className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm"
          >
            <div className="text-[11px] uppercase tracking-wide text-foreground-muted">
              {s.label}
            </div>
            <div className="mt-1 font-display text-2xl text-stone-700">{s.value}</div>
            <div className="mt-0.5 text-[11px] text-foreground-muted">{s.sub}</div>
          </div>
        ))}
      </section>

      <section aria-label="Uyarılar" className="mb-10">
        <h2 className="mb-3 text-lg text-stone-600">Bugünün uyarıları</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {ALERTS.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className={`group rounded-lg border p-4 transition-colors hover:border-terracotta-500/50 ${toneClass(a.tone)}`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`inline-flex size-7 items-center justify-center rounded-md ${toneIconBg(a.tone)}`}
                >
                  <AlertTriangle className="size-4" aria-hidden />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-stone-700">{a.title}</div>
                  <p className="mt-1 text-sm text-foreground-muted">{a.body}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-terracotta-600 group-hover:text-terracotta-700">
                    {a.cta}
                    <ArrowUpRight className="size-3" aria-hidden />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Hızlı erişim" className="mb-10">
        <h2 className="mb-3 text-lg text-stone-600">Hızlı erişim</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/catalog"
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:border-terracotta-500/50 transition-colors"
          >
            <Database className="size-5 text-sage-600" aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-medium text-stone-700">Katalog ağacı</div>
              <div className="text-xs text-foreground-muted">
                26 template_group × 156 sub_type · drill-down
              </div>
            </div>
            <ArrowUpRight className="size-4 text-foreground-muted" aria-hidden />
          </Link>

          <Link
            href="/prompts"
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:border-terracotta-500/50 transition-colors"
          >
            <Sparkles className="size-5 text-terracotta-500" aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-medium text-stone-700">Prompt Lab</div>
              <div className="text-xs text-foreground-muted">
                Bot instruction + tool description editor (read/write soon)
              </div>
            </div>
            <ArrowUpRight className="size-4 text-foreground-muted" aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border pt-4 text-xs text-foreground-muted">
        <div className="font-mono">Staging-first · DB write is gated on commit</div>
      </footer>
    </div>
  );
}
