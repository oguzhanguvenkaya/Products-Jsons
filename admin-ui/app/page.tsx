import Link from "next/link";
import { Database, Sparkles, ArrowUpRight } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AlertCard } from "@/components/dashboard/alert-card";
import { HeatmapPreview } from "@/components/dashboard/heatmap-preview";
import { TopGroupsList } from "@/components/dashboard/top-groups-list";
import {
  CATALOG_STATS,
  NULL_HOTSPOTS,
  SPECS_KEY_DUPES,
  SNAPSHOT_DATE,
} from "@/lib/data/snapshot";

const fmt = (n: number) => n.toLocaleString("tr-TR");

export default function DashboardHome() {
  const topNull = NULL_HOTSPOTS[0];
  const topDupe = SPECS_KEY_DUPES[0];

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
              Phase 4.9 · Dashboard
            </div>
            <h1 className="mt-1 text-3xl text-stone-700">Catalog Atelier</h1>
          </div>
          <div className="font-mono text-[11px] text-foreground-muted">
            snapshot · {SNAPSHOT_DATE}
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-foreground-muted">
          511 ürünlük kataloğu operatör hızında temizlemek için güvenli staging arayüzü.
          Her değişiklik önce local staging'e düşer; review + commit aşamasından sonra DB'ye uygulanır.
        </p>
      </header>

      <section
        aria-label="Katalog istatistikleri"
        className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <StatCard
          label="Toplam ürün"
          value={fmt(CATALOG_STATS.totalProducts)}
          sub={`${CATALOG_STATS.brands} marka · ${CATALOG_STATS.templateGroups} grup`}
        />
        <StatCard
          label="Sub_type"
          value={fmt(CATALOG_STATS.subTypes)}
          sub="ort. 3.3 ürün / sub_type"
          tone="warn"
        />
        <StatCard
          label="FAQ"
          value={fmt(CATALOG_STATS.faqs)}
          sub={`~6 soru/ürün, ${CATALOG_STATS.relations.toLocaleString("tr-TR")} relation`}
        />
        <StatCard
          label="Synonyms"
          value={fmt(CATALOG_STATS.synonyms)}
          sub="Hedef: ~100 (Phase 6.5)"
          tone="warn"
        />
      </section>

      <section aria-label="Bugünün uyarıları" className="mb-8">
        <h2 className="mb-3 text-lg text-stone-600">Bugünün uyarıları</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <AlertCard
            tone="danger"
            title="Null hotspot: ceramic_coating"
            body={`${topNull.key} sadece %${Math.round(
              topNull.coverage * 100,
            )} dolu — ${topNull.impact.toLowerCase()}.`}
            stat={{ value: "4.3%", label: "silicone_free coverage" }}
            href="/heatmap"
            cta="Heatmap'e git"
          />
          <AlertCard
            tone="warning"
            title="Specs key duplication"
            body={`${topDupe.aliases.join(" / ")} aynı anlamda — normalize gerekir.`}
            stat={{ value: `${topDupe.aliases.length}×`, label: "duplicate key" }}
            href="/bulk"
            cta="Normalize aracı"
          />
          <AlertCard
            tone="info"
            title="Prompt Lab hazır"
            body="detailagent + detailagent-ms instruction + tool registry read-only."
            stat={{ value: "2", label: "agent · 7 tool" }}
            href="/prompts"
            cta="Prompt Lab'e git"
          />
        </div>
      </section>

      <section aria-label="Veri kapsamı" className="mb-8 grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <HeatmapPreview />
        </div>
        <div className="lg:col-span-2">
          <TopGroupsList />
        </div>
      </section>

      <section aria-label="Hızlı erişim" className="mb-10">
        <h2 className="mb-3 text-lg text-stone-600">Hızlı erişim</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            href="/catalog"
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:border-terracotta-500/50 transition-colors"
          >
            <Database className="size-5 text-sage-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-stone-700">Katalog ağacı</div>
              <div className="text-xs text-foreground-muted">
                {CATALOG_STATS.templateGroups} grup × {CATALOG_STATS.subTypes} sub_type
              </div>
            </div>
            <ArrowUpRight className="size-4 text-foreground-muted" aria-hidden />
          </Link>

          <Link
            href="/prompts"
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:border-terracotta-500/50 transition-colors"
          >
            <Sparkles className="size-5 text-terracotta-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-stone-700">Prompt Lab</div>
              <div className="text-xs text-foreground-muted">
                Instruction + tool description editor
              </div>
            </div>
            <ArrowUpRight className="size-4 text-foreground-muted" aria-hidden />
          </Link>

          <Link
            href="/staging"
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:border-terracotta-500/50 transition-colors"
          >
            <span className="inline-flex size-5 items-center justify-center font-mono text-sm text-amber-600" aria-hidden>
              ⬢
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-stone-700">Staging</div>
              <div className="text-xs text-foreground-muted">
                Bekleyen değişiklikler · commit workflow
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
