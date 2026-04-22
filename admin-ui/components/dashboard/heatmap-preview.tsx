import Link from "next/link";
import {
  HEATMAP_KEYS,
  HEATMAP_ROWS,
  type HeatmapRow,
} from "@/lib/data/snapshot";
import { cn } from "@/lib/utils";

function coverageColor(cov: number): string {
  // Warm palette: cream (empty) → amber → terracotta → clay-red (full)
  // We use CSS variables on :root, so we emit inline styles for fine-grained tint
  if (cov >= 0.9)
    return "bg-sage-500 text-cream-50"; // fully covered = calm success
  if (cov >= 0.6) return "bg-sage-500/60 text-stone-700";
  if (cov >= 0.3) return "bg-amber-500/80 text-stone-700";
  if (cov >= 0.1) return "bg-clay-red-400/70 text-cream-50";
  return "bg-clay-red-500 text-cream-50"; // zero/near-zero = urgent
}

function pct(cov: number) {
  return `${Math.round(cov * 100)}%`;
}

type Props = {
  rows?: HeatmapRow[];
};

export function HeatmapPreview({ rows = HEATMAP_ROWS }: Props) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg text-stone-700">Coverage Heatmap</h2>
          <p className="text-xs text-foreground-muted">
            Top 6 template_group × 6 kritik specs key. Renk = doluluk oranı.
          </p>
        </div>
        <Link
          href="/heatmap"
          className="text-xs font-medium text-terracotta-600 hover:text-terracotta-700"
        >
          Tam matris →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-xs">
          <caption className="sr-only">
            Template group bazında specs key coverage yüzdesi
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 bg-surface py-1 pr-2 text-left font-medium text-foreground-muted"
              >
                Grup
              </th>
              {HEATMAP_KEYS.map((k) => (
                <th
                  key={k}
                  scope="col"
                  className="py-1 text-center font-mono text-[10px] font-normal text-foreground-muted"
                >
                  {k}
                </th>
              ))}
              <th
                scope="col"
                className="py-1 pl-2 text-right font-medium text-foreground-muted"
              >
                ürün
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.group}>
                <th
                  scope="row"
                  className="sticky left-0 bg-surface py-1 pr-2 text-left font-mono text-[11px] font-medium text-stone-700"
                >
                  {row.group}
                </th>
                {HEATMAP_KEYS.map((k) => {
                  const c = row.cells[k]?.coverage ?? 0;
                  return (
                    <td key={k} className="p-0">
                      <div
                        className={cn(
                          "flex h-7 items-center justify-center rounded-sm font-mono text-[10px] font-medium",
                          coverageColor(c),
                        )}
                        title={`${row.group} · ${k} · ${pct(c)}`}
                      >
                        {pct(c)}
                      </div>
                    </td>
                  );
                })}
                <td className="py-1 pl-2 text-right font-mono text-[11px] text-foreground-muted">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-foreground-muted">
        <span>Legend:</span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-sage-500" aria-hidden /> ≥90%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-amber-500/80" aria-hidden /> 30–59%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-clay-red-400/70" aria-hidden /> 10–29%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-clay-red-500" aria-hidden /> &lt;10%
        </span>
      </div>
    </div>
  );
}
