import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "accent" | "warn";
  className?: string;
};

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "border-border bg-surface",
  accent: "border-terracotta-500/30 bg-terracotta-500/5",
  warn: "border-amber-500/30 bg-amber-500/5",
};

export function StatCard({ label, value, sub, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 shadow-sm",
        TONE[tone],
        className,
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-foreground-muted">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl text-stone-700">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-foreground-muted">{sub}</div>}
    </div>
  );
}
