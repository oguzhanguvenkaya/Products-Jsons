"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Staging store — browser-local queue of pending edits.
 *
 * Every edit from the UI flows:
 *   1) `stageChange()` appends a diff object here
 *   2) Staging drawer (Phase 4.9.8) surfaces it
 *   3) Commit workflow pipes the aggregated payload to /admin/staging/commit
 *
 * DB writes NEVER happen directly from inline editors.
 */

export type ChangeScope =
  | "product"
  | "product.specs"
  | "product.sizes"
  | "faq"
  | "relation";

export type StagedChange = {
  id: string;
  scope: ChangeScope;
  sku: string;
  field: string; // dotted path, e.g. "price", "specs.howToUse"
  before: unknown;
  after: unknown;
  at: string; // ISO timestamp
  label?: string; // optional human hint for drawer
};

type StagingState = {
  changes: StagedChange[];
  stageChange: (c: Omit<StagedChange, "id" | "at">) => void;
  revertChange: (id: string) => void;
  revertBySku: (sku: string) => void;
  clearAll: () => void;
  getPendingForSku: (sku: string) => StagedChange[];
  getCount: () => number;
};

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

export const useStagingStore = create<StagingState>()(
  persist(
    (set, get) => ({
      changes: [],
      stageChange: (c) => {
        const next: StagedChange = {
          ...c,
          id: makeId(),
          at: new Date().toISOString(),
        };
        set((s) => {
          // Coalesce: if a prior change exists for same (sku, scope, field),
          // replace its `after` in place to avoid drawer spam.
          const existing = s.changes.find(
            (x) => x.sku === c.sku && x.scope === c.scope && x.field === c.field,
          );
          if (existing) {
            return {
              changes: s.changes.map((x) =>
                x.id === existing.id ? { ...existing, after: c.after, at: next.at } : x,
              ),
            };
          }
          return { changes: [...s.changes, next] };
        });
      },
      revertChange: (id) =>
        set((s) => ({ changes: s.changes.filter((c) => c.id !== id) })),
      revertBySku: (sku) =>
        set((s) => ({ changes: s.changes.filter((c) => c.sku !== sku) })),
      clearAll: () => set({ changes: [] }),
      getPendingForSku: (sku) => get().changes.filter((c) => c.sku === sku),
      getCount: () => get().changes.length,
    }),
    {
      name: "catalog-atelier.staging",
      version: 1,
    },
  ),
);
