import Link from "next/link";
import { TOP_GROUPS, type TopGroup } from "@/lib/data/snapshot";
import { cn } from "@/lib/utils";

const TONE_COLOR: Record<TopGroup["tone"], string> = {
  good: "text-sage-600 bg-sage-500/10",
  mid: "text-amber-600 bg-amber-500/10",
  bad: "text-clay-red-500 bg-clay-red-500/10",
};

const TONE_LABEL: Record<TopGroup["tone"], string> = {
  good: "iyi",
  mid: "orta",
  bad: "kritik",
};

export function TopGroupsList() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg text-stone-700">Template Fragmentation</h2>
          <p className="text-xs text-foreground-muted">
            ürün / sub_type oranı — düşük oran &gt; fragmentation &gt; arama zorlaşır
          </p>
        </div>
        <Link
          href="/catalog"
          className="text-xs font-medium text-terracotta-600 hover:text-terracotta-700"
        >
          Ağaç görünümü →
        </Link>
      </div>

      <ul className="divide-y divide-border">
        {TOP_GROUPS.map((g) => (
          <li
            key={g.group}
            className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
          >
            <span
              className={cn(
                "inline-flex w-14 justify-center rounded px-2 py-0.5 font-mono text-[10px]",
                TONE_COLOR[g.tone],
              )}
              aria-label={`Durum: ${TONE_LABEL[g.tone]}`}
            >
              {TONE_LABEL[g.tone]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-sm text-stone-700">{g.group}</div>
              <div className="text-[11px] text-foreground-muted">{g.note}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-stone-700">
                {g.ratio.toFixed(1)}×
              </div>
              <div className="text-[10px] text-foreground-muted">
                {g.products} ürün · {g.subTypes} sub_type
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
