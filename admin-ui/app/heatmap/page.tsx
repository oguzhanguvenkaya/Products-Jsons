import Link from "next/link";
import { Info, AlertTriangle } from "lucide-react";
import {
  GLOBAL_KEYS,
  GROUP_DETAIL,
  coverageTone,
  type CoverageTone,
} from "@/lib/data/coverage-detail";
import { TAXONOMY } from "@/lib/data/taxonomy";
import { cn } from "@/lib/utils";

const TONE_BG: Record<CoverageTone, string> = {
  ok: "bg-sage-500 text-cream-50",
  warnLight: "bg-sage-500/55 text-stone-700",
  warn: "bg-amber-500/80 text-stone-700",
  badLight: "bg-clay-red-400/75 text-cream-50",
  bad: "bg-clay-red-500 text-cream-50",
};

const TONE_BAR: Record<CoverageTone, string> = {
  ok: "bg-sage-500",
  warnLight: "bg-sage-500/60",
  warn: "bg-amber-500/80",
  badLight: "bg-clay-red-400/80",
  bad: "bg-clay-red-500",
};

function pct(cov: number) {
  return `${Math.round(cov * 100)}%`;
}

export default function HeatmapPage() {
  const ceramic = GROUP_DETAIL.ceramic_coating!;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-6">
        <div className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
          Phase 4.9.2 · Coverage Heatmap
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">
          Veri kapsamı
        </h1>
        <p className="mt-2 max-w-2xl text-foreground-muted">
          Rapor <code className="font-mono text-xs">04-data-coverage-analysis-2026-04-22.md</code>{" "}
          snapshot'ı. 26 grup × tüm specs key cross matrisi Admin API (Phase 4.9.4) bağlanınca
          canlıya alınır; bu sürümde global coverage + ceramic_coating detayı görünür.
        </p>
      </header>

      <div className="mb-6 flex items-start gap-2 rounded-md border border-dashed border-sage-500/40 bg-sage-500/5 p-4 text-sm text-stone-700">
        <Info className="size-4 shrink-0 text-sage-600" aria-hidden />
        <div>
          Snapshot tarihi <strong className="font-mono">2026-04-22</strong>. Full
          26×40 matris için{" "}
          <code className="font-mono text-xs">GET /admin/coverage/:group</code>{" "}
          endpoint'i gerekli — Phase 4.9.4 teslimatıyla burada interaktif hale gelir.
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl text-stone-700">
          Global coverage · Top-20 specs key
        </h2>
        <p className="mb-4 text-sm text-foreground-muted">
          511 ürün üzerinde bir key'in dolu olma oranı. Ortak anlatı alanları
          (howToUse / whyThisProduct / whenToUse) full; <em>sıralanabilir</em>{" "}
          numeric alanlar &lt;%15.
        </p>

        <div className="rounded-lg border border-border bg-surface p-4">
          <ul className="space-y-2">
            {GLOBAL_KEYS.map((k) => {
              const tone = coverageTone(k.coverage);
              return (
                <li key={k.key} className="flex items-center gap-3 text-sm">
                  <div className="flex min-w-40 flex-col leading-tight">
                    <span className="font-mono text-[13px] text-stone-700">
                      {k.key}
                    </span>
                    {k.note && (
                      <span className="text-[10px] text-foreground-muted">
                        {k.note}
                      </span>
                    )}
                  </div>
                  <div
                    className="relative h-4 flex-1 overflow-hidden rounded-sm bg-cream-200"
                    role="progressbar"
                    aria-valuenow={Math.round(k.coverage * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${k.key} coverage`}
                  >
                    <div
                      className={cn("h-full", TONE_BAR[tone])}
                      style={{ width: `${Math.max(k.coverage * 100, 1)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-[12px] text-stone-700">
                    {pct(k.coverage)}
                  </span>
                  <span className="w-14 text-right font-mono text-[11px] text-foreground-muted">
                    {k.productCount}/511
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-xl text-stone-700">
              ceramic_coating · {ceramic.total} ürün, 23 key
            </h2>
            <p className="text-sm text-foreground-muted">
              Katalogta en çok sorgulanan grup — en kritik null hotspot'lar burada.
            </p>
          </div>
          <Link
            href="/catalog"
            className="text-xs font-medium text-terracotta-600 hover:text-terracotta-700"
          >
            Ağaçta görüntüle →
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-100">
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
                >
                  Specs key
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
                >
                  Coverage
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
                >
                  Oran
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
                >
                  Ürün
                </th>
              </tr>
            </thead>
            <tbody>
              {ceramic.keys.map((k) => {
                const tone = coverageTone(k.coverage);
                return (
                  <tr key={k.key} className="border-b border-border/40 last:border-b-0 hover:bg-cream-100">
                    <td className="px-4 py-1.5 font-mono text-[13px] text-stone-700">
                      {k.key}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={cn(
                          "inline-flex min-w-14 justify-center rounded px-2 py-0.5 font-mono text-[11px]",
                          TONE_BG[tone],
                        )}
                      >
                        {pct(k.coverage)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div
                        className="relative ml-auto h-1.5 w-28 overflow-hidden rounded-full bg-cream-200"
                        aria-hidden
                      >
                        <div
                          className={cn("h-full", TONE_BAR[tone])}
                          style={{ width: `${Math.max(k.coverage * 100, 2)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-right font-mono text-[12px] text-foreground-muted">
                      {k.productCount} / {k.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-stone-700">
          26 template_group · overview
        </h2>
        <p className="mb-4 text-sm text-foreground-muted">
          Her grubun ürün / sub_type sayısı. Detaylı per-grup coverage Admin API
          ile gelince burada canlılaşır. Şimdilik satırlar yapısal bilgiyi gösterir.
        </p>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-100">
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
                >
                  template_group
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
                >
                  Ürün
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
                >
                  Sub_type
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
                >
                  Ürün/sub
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
                >
                  Detay
                </th>
              </tr>
            </thead>
            <tbody>
              {TAXONOMY.map((g) => {
                const ratio = g.total / Math.max(g.subs.length, 1);
                const hasDetail = !!GROUP_DETAIL[g.group];
                const fragBad = ratio < 2;
                return (
                  <tr
                    key={g.group}
                    className="border-b border-border/40 last:border-b-0 hover:bg-cream-100"
                  >
                    <td className="px-4 py-1.5 font-mono text-[13px] text-stone-700">
                      {g.group}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[12px] text-stone-700">
                      {g.total}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[12px] text-stone-700">
                      {g.subs.length}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span
                        className={cn(
                          "font-mono text-[12px]",
                          fragBad
                            ? "text-clay-red-500"
                            : ratio >= 4
                              ? "text-sage-600"
                              : "text-amber-600",
                        )}
                      >
                        {ratio.toFixed(1)}×
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-[12px]">
                      {hasDetail ? (
                        <span className="inline-flex items-center gap-1 text-sage-600">
                          <span className="size-1.5 rounded-full bg-sage-500" />
                          coverage mevcut
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-foreground-muted">
                          <AlertTriangle className="size-3" aria-hidden />
                          Admin API bekliyor
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
