"use client";

import { Command, Sparkles } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-surface/70 px-4 backdrop-blur">
      <button
        type="button"
        className="flex flex-1 max-w-md items-center gap-2 rounded-md border border-border bg-cream-50 px-3 py-1.5 text-sm text-foreground-muted hover:border-border-strong hover:text-foreground transition-colors"
        aria-label="Komut paleti"
      >
        <Command className="size-4" aria-hidden />
        <span>SKU, marka, kategori ara…</span>
        <kbd className="ml-auto rounded bg-cream-200 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-terracotta-500 px-3 py-1.5 text-sm text-cream-50 hover:bg-terracotta-600 transition-colors"
        >
          <Sparkles className="size-3.5" aria-hidden />
          <span>AI Asistan</span>
        </button>
      </div>
    </header>
  );
}
