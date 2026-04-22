"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { TemplateGroup } from "@/lib/data/taxonomy";
import { cn } from "@/lib/utils";

type Props = {
  taxonomy: TemplateGroup[];
  selectedGroup: string | null;
  selectedSub: string | null;
  onSelect: (group: string, sub: string | null) => void;
};

export function CatalogTree({ taxonomy, selectedGroup, selectedSub, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    // Default: auto-expand selected group
    ...(selectedGroup ? { [selectedGroup]: true } : {}),
  }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return taxonomy;
    return taxonomy.map((g) => {
      const groupMatch = g.group.toLowerCase().includes(q);
      const subMatches = g.subs.filter((s) =>
        s.sub.toLowerCase().includes(q),
      );
      if (groupMatch) return g;
      if (subMatches.length) return { ...g, subs: subMatches };
      return null;
    }).filter((x): x is TemplateGroup => x !== null);
  }, [query, taxonomy]);

  // Auto-expand matched groups while searching
  const effectiveExpanded = query
    ? Object.fromEntries(filtered.map((g) => [g.group, true]))
    : expanded;

  function toggle(group: string) {
    setExpanded((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  return (
    <nav aria-label="Katalog ağacı" className="flex h-full flex-col">
      <label className="relative block border-b border-border px-3 py-3">
        <Search
          className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted"
          aria-hidden
        />
        <span className="sr-only">Ara</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Grup veya sub_type ara…"
          className="w-full rounded-md border border-border bg-cream-50 py-1.5 pl-8 pr-2 text-sm focus:border-terracotta-500 focus:outline-none"
        />
      </label>

      <div className="flex-1 overflow-y-auto px-1 py-2">
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-sm text-foreground-muted">
            Hiçbir grup veya sub_type eşleşmedi.
          </div>
        )}
        <ul className="space-y-0.5">
          {filtered.map((g) => {
            const isOpen = !!effectiveExpanded[g.group];
            const isSelected = selectedGroup === g.group && !selectedSub;
            return (
              <li key={g.group}>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => toggle(g.group)}
                    aria-expanded={isOpen}
                    aria-label={`${g.group} grubunu ${isOpen ? "kapat" : "aç"}`}
                    className="inline-flex size-5 items-center justify-center rounded text-foreground-muted hover:text-foreground"
                  >
                    <ChevronRight
                      className={cn(
                        "size-3.5 transition-transform",
                        isOpen && "rotate-90",
                      )}
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(g.group, null)}
                    className={cn(
                      "flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-terracotta-500 text-cream-50"
                        : "hover:bg-cream-200 text-stone-700",
                    )}
                    aria-current={isSelected ? "page" : undefined}
                  >
                    <span className="flex-1 font-mono truncate">{g.group}</span>
                    <span
                      className={cn(
                        "font-mono text-[10px]",
                        isSelected ? "text-cream-200" : "text-foreground-muted",
                      )}
                    >
                      {g.total}
                    </span>
                  </button>
                </div>

                {isOpen && g.subs.length > 0 && (
                  <ul className="ml-6 border-l border-border pl-2">
                    {g.subs.map((s) => {
                      const isSubSelected =
                        selectedGroup === g.group && selectedSub === s.sub;
                      return (
                        <li key={s.sub}>
                          <button
                            type="button"
                            onClick={() => onSelect(g.group, s.sub)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors",
                              isSubSelected
                                ? "bg-sage-500 text-cream-50"
                                : "hover:bg-cream-200 text-stone-600",
                            )}
                            aria-current={isSubSelected ? "page" : undefined}
                          >
                            <span className="flex-1 font-mono truncate">
                              {s.sub}
                            </span>
                            <span
                              className={cn(
                                "font-mono text-[10px]",
                                isSubSelected
                                  ? "text-cream-200"
                                  : "text-foreground-muted",
                              )}
                            >
                              {s.count}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
