"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { useStagingStore } from "@/lib/stores/staging";

export function StagingBadge() {
  const count = useStagingStore((s) => s.changes.length);
  return (
    <Link
      href="/staging"
      className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-stone-700 transition-colors hover:border-amber-500/50 hover:bg-amber-500/5"
      aria-label={`Staging: ${count} değişiklik bekliyor`}
    >
      <Package className="size-3.5 text-amber-600" aria-hidden />
      <span className="hidden sm:inline">Staging</span>
      <span
        className={
          count > 0
            ? "inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 font-mono text-[10px] text-cream-50"
            : "font-mono text-[10px] text-foreground-muted"
        }
      >
        {count}
      </span>
    </Link>
  );
}
