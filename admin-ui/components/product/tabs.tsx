"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabDef = {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
  content: ReactNode;
};

export function ProductTabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0]!.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0]!;

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div
        role="tablist"
        aria-label="Ürün bölümleri"
        className="flex flex-wrap gap-0.5 border-b border-border bg-cream-100 p-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-surface text-stone-700 shadow-sm"
                  : "text-foreground-muted hover:text-stone-700",
              )}
            >
              <span aria-hidden className="inline-flex">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                    isActive
                      ? "bg-cream-200 text-stone-600"
                      : "bg-cream-200/70 text-foreground-muted",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${current.id}`}
        aria-labelledby={`tab-${current.id}`}
        className="p-6"
      >
        {current.content}
      </div>
    </div>
  );
}
