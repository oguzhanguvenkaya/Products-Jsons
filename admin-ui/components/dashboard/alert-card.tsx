import Link from "next/link";
import { ArrowUpRight, AlertTriangle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "danger" | "warning" | "info";

type Props = {
  tone: AlertTone;
  title: string;
  body: string;
  stat?: { label: string; value: string };
  href: string;
  cta: string;
};

const TONE = {
  danger: {
    card: "border-clay-red-500/30 bg-clay-red-500/5",
    iconBg: "bg-clay-red-500 text-cream-50",
    Icon: AlertTriangle,
  },
  warning: {
    card: "border-amber-500/30 bg-amber-500/5",
    iconBg: "bg-amber-500 text-stone-700",
    Icon: Info,
  },
  info: {
    card: "border-sage-500/30 bg-sage-500/5",
    iconBg: "bg-sage-500 text-cream-50",
    Icon: Sparkles,
  },
};

export function AlertCard({ tone, title, body, stat, href, cta }: Props) {
  const { card, iconBg, Icon } = TONE[tone];
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:border-terracotta-500/50",
        card,
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
            iconBg,
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-stone-700">{title}</div>
          <p className="mt-1 text-sm text-foreground-muted">{body}</p>
        </div>
      </div>

      {stat && (
        <div className="flex items-baseline gap-2 pl-9 font-mono">
          <span className="text-2xl text-stone-700">{stat.value}</span>
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
            {stat.label}
          </span>
        </div>
      )}

      <div className="inline-flex items-center gap-1 pl-9 text-xs font-medium text-terracotta-600 group-hover:text-terracotta-700">
        {cta}
        <ArrowUpRight className="size-3" aria-hidden />
      </div>
    </Link>
  );
}
