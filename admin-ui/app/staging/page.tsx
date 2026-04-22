"use client";

import Link from "next/link";
import {
  Package,
  RotateCcw,
  Trash2,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  useStagingStore,
  type StagedChange,
} from "@/lib/stores/staging";
import { cn } from "@/lib/utils";

const SCOPE_TONE: Record<StagedChange["scope"], string> = {
  product: "bg-terracotta-500/10 text-terracotta-700",
  "product.specs": "bg-sage-500/10 text-sage-600",
  "product.sizes": "bg-amber-500/10 text-amber-600",
  faq: "bg-cream-200 text-stone-700",
  relation: "bg-clay-red-500/10 text-clay-red-500",
};

export default function StagingPage() {
  const changes = useStagingStore((s) => s.changes);
  const revertChange = useStagingStore((s) => s.revertChange);
  const clearAll = useStagingStore((s) => s.clearAll);

  const bySku = groupBySku(changes);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
            Phase 4.9.5 · Staging Drawer
          </div>
          <h1 className="mt-1 font-display text-3xl text-stone-700">
            Bekleyen değişiklikler
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {changes.length === 0
              ? "Şimdilik kuyruk boş."
              : `${changes.length} değişiklik · ${Object.keys(bySku).length} ürün`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (
                changes.length > 0 &&
                confirm("Tüm bekleyen değişiklikler silinsin mi?")
              ) {
                clearAll();
              }
            }}
            disabled={changes.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground-muted hover:text-clay-red-500 hover:border-clay-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="size-3" aria-hidden />
            Tümünü geri al
          </button>
          <Link
            href="/commit"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
              changes.length > 0
                ? "bg-terracotta-500 text-cream-50 hover:bg-terracotta-600"
                : "bg-cream-200 text-foreground-muted pointer-events-none",
            )}
          >
            Commit'e git
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
      </header>

      {changes.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-cream-100 p-5 text-sm text-foreground-muted">
          <Info className="size-4 shrink-0 text-sage-600" aria-hidden />
          <div>
            Ürün detayında bir alan düzenlediğinde burada listelenecek.
            Staging yerel tarayıcıda tutulur; başka cihaz bu listeyi göremez.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(bySku).map(([sku, entries]) => (
            <section
              key={sku}
              className="rounded-lg border border-border bg-surface"
            >
              <header className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-baseline gap-2">
                  <Package
                    className="size-3.5 self-center text-amber-600"
                    aria-hidden
                  />
                  <Link
                    href={`/products/${encodeURIComponent(sku)}`}
                    className="font-mono text-sm font-medium text-terracotta-600 hover:text-terracotta-700"
                  >
                    {sku}
                  </Link>
                  <span className="text-xs text-foreground-muted">
                    · {entries.length} değişiklik
                  </span>
                </div>
              </header>

              <ul className="divide-y divide-border">
                {entries.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px]",
                        SCOPE_TONE[c.scope],
                      )}
                    >
                      {c.scope}
                    </span>
                    <code className="min-w-32 font-mono text-[12px] text-stone-700">
                      {c.field}
                    </code>
                    <div className="flex-1 text-sm">
                      <span className="font-mono text-foreground-muted line-through">
                        {renderValue(c.before)}
                      </span>
                      <span className="mx-2 text-foreground-muted">→</span>
                      <span className="font-mono text-stone-700">
                        {renderValue(c.after)}
                      </span>
                    </div>
                    <time
                      dateTime={c.at}
                      className="font-mono text-[10px] text-foreground-muted"
                    >
                      {new Date(c.at).toLocaleTimeString("tr-TR")}
                    </time>
                    <button
                      type="button"
                      onClick={() => revertChange(c.id)}
                      aria-label="Geri al"
                      className="inline-flex size-6 items-center justify-center rounded text-foreground-muted hover:bg-cream-200 hover:text-clay-red-500"
                    >
                      <RotateCcw className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupBySku(changes: StagedChange[]): Record<string, StagedChange[]> {
  return changes.reduce<Record<string, StagedChange[]>>((acc, c) => {
    (acc[c.sku] ??= []).push(c);
    return acc;
  }, {});
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 40 ? v.slice(0, 40) + "…" : v;
  return JSON.stringify(v);
}
