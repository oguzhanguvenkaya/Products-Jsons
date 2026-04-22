"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Share2,
  Trash2,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { useStagingStore } from "@/lib/stores/staging";
import { cn } from "@/lib/utils";

type RelationItem = {
  sourceSku: string;
  sourceName: string | null;
  sourceBrand: string | null;
  targetSku: string;
  targetName: string | null;
  targetBrand: string | null;
  relationType: string;
  confidence: number | null;
};

type ListResponse = {
  total: number;
  limit: number;
  offset: number;
  typeCounts: Record<string, number>;
  items: RelationItem[];
};

type Props = {
  initial: ListResponse;
};

const TYPE_LABEL: Record<string, string> = {
  use_with: "Birlikte kullan",
  use_before: "Öncesinde",
  use_after: "Sonrasında",
  accessories: "Aksesuar",
  alternatives: "Alternatif",
  primary: "Primary (legacy)",
  variant: "Variant (legacy)",
  complement: "Complement (legacy)",
  alternative: "Alternative (legacy)",
};

const TYPE_TONE: Record<string, string> = {
  use_with: "bg-terracotta-500/10 text-terracotta-700",
  use_before: "bg-sage-500/10 text-sage-600",
  use_after: "bg-amber-500/10 text-amber-600",
  accessories: "bg-cream-200 text-stone-700",
  alternatives: "bg-clay-red-500/10 text-clay-red-500",
};

const PAGE_SIZE = 100;

export function RelationsManager({ initial }: Props) {
  const [data, setData] = useState<ListResponse>(initial);
  const [filters, setFilters] = useState({
    sku: "",
    relatedSku: "",
    type: "",
  });
  const [offset, setOffset] = useState(0);
  const [loading, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [newSource, setNewSource] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newType, setNewType] = useState<string>("use_with");

  const stageChange = useStagingStore((s) => s.stageChange);
  const revertByField = useStagingStore((s) => {
    const map = new Map<string, (typeof s.changes)[number]>();
    for (const c of s.changes) {
      if (c.scope !== "relation") continue;
      map.set(`${c.sku}::${c.field}`, c);
    }
    return map;
  });

  useEffect(() => {
    const url = new URL("/api/admin/relations", window.location.origin);
    if (filters.sku) url.searchParams.set("sku", filters.sku);
    if (filters.relatedSku) url.searchParams.set("relatedSku", filters.relatedSku);
    if (filters.type) url.searchParams.set("type", filters.type);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));

    startTransition(() => {
      fetch(url.toString())
        .then((r) => r.json())
        .then((j: ListResponse) => setData(j))
        .catch(() => {
          /* keep previous */
        });
    });
  }, [filters.sku, filters.relatedSku, filters.type, offset]);

  function isPending(item: RelationItem): "stable" | "delete" {
    const key = `${item.sourceSku}::${item.relationType}:${item.targetSku}`;
    const p = revertByField.get(key);
    return p && p.after === null ? "delete" : "stable";
  }

  function stageDelete(item: RelationItem) {
    stageChange({
      sku: item.sourceSku,
      scope: "relation",
      field: `${item.relationType}:${item.targetSku}`,
      before: item,
      after: null,
      label: `${TYPE_LABEL[item.relationType] ?? item.relationType} → ${item.targetSku}`,
    });
  }

  function addNew() {
    if (!newSource.trim() || !newTarget.trim()) return;
    stageChange({
      sku: newSource.trim(),
      scope: "relation",
      field: `${newType}:${newTarget.trim()}`,
      before: null,
      after: {
        sourceSku: newSource.trim(),
        targetSku: newTarget.trim(),
        relationType: newType,
      },
      label: `${TYPE_LABEL[newType] ?? newType} → ${newTarget.trim()}`,
    });
    setShowForm(false);
    setNewSource("");
    setNewTarget("");
  }

  const typeEntries = Object.entries(data.typeCounts).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div>
      {/* Type chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            setOffset(0);
            setFilters((f) => ({ ...f, type: "" }));
          }}
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors",
            filters.type === ""
              ? "bg-terracotta-500 text-cream-50"
              : "bg-cream-200 text-foreground-muted hover:text-stone-700",
          )}
        >
          tümü ({data.total.toLocaleString("tr-TR")})
        </button>
        {typeEntries.map(([type, count]) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setOffset(0);
              setFilters((f) => ({ ...f, type }));
            }}
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors",
              filters.type === type
                ? "bg-terracotta-500 text-cream-50"
                : "bg-cream-200 text-foreground-muted hover:text-stone-700",
            )}
          >
            {type} ({count.toLocaleString("tr-TR")})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 grid gap-2 md:grid-cols-[1fr,1fr,auto]">
        <label className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted"
            aria-hidden
          />
          <input
            type="text"
            placeholder="Kaynak SKU"
            value={filters.sku}
            onChange={(e) => {
              setOffset(0);
              setFilters((f) => ({ ...f, sku: e.target.value }));
            }}
            className="w-full rounded-md border border-border bg-cream-50 py-1.5 pl-8 pr-2 font-mono text-sm focus:border-terracotta-500 focus:outline-none"
          />
        </label>
        <label className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted"
            aria-hidden
          />
          <input
            type="text"
            placeholder="Hedef SKU"
            value={filters.relatedSku}
            onChange={(e) => {
              setOffset(0);
              setFilters((f) => ({ ...f, relatedSku: e.target.value }));
            }}
            className="w-full rounded-md border border-border bg-cream-50 py-1.5 pl-8 pr-2 font-mono text-sm focus:border-terracotta-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md bg-sage-500/10 px-3 py-1.5 text-sm text-sage-700 hover:bg-sage-500/20"
        >
          <Plus className="size-3.5" aria-hidden /> Yeni ilişki
        </button>
      </div>

      {showForm && (
        <div className="mb-5 rounded-md border border-sage-500/40 bg-sage-500/5 p-3">
          <div className="grid gap-2 md:grid-cols-[1fr,140px,1fr,auto]">
            <input
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Kaynak SKU"
              className="rounded border border-border bg-surface px-2 py-1 font-mono text-sm"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="rounded border border-border bg-surface px-2 py-1 text-sm"
            >
              {Object.entries(TYPE_LABEL).slice(0, 5).map(([k, v]) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <input
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="Hedef SKU"
              className="rounded border border-border bg-surface px-2 py-1 font-mono text-sm"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={addNew}
                className="inline-flex items-center gap-1 rounded bg-sage-500 px-2 py-1 text-xs text-cream-50 hover:bg-sage-600"
              >
                <Check className="size-3" /> Stage
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground-muted hover:bg-cream-200"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status row */}
      <div className="mb-3 flex items-center justify-between text-xs text-foreground-muted">
        <span>
          {loading && (
            <Loader2 className="mr-1 inline-block size-3 animate-spin" aria-hidden />
          )}
          {data.total.toLocaleString("tr-TR")} ilişki · sayfa {Math.floor(offset / PAGE_SIZE) + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            aria-label="Önceki"
            className="inline-flex size-7 items-center justify-center rounded border border-border hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= data.total}
            aria-label="Sonraki"
            className="inline-flex size-7 items-center justify-center rounded border border-border hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Table */}
      {data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-cream-100 p-5 text-sm text-foreground-muted">
          Filtreyle eşleşen ilişki yok.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-100">
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Kaynak
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Tip
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Hedef
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Conf
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => {
                const state = isPending(item);
                return (
                  <tr
                    key={`${item.sourceSku}:${item.relationType}:${item.targetSku}:${i}`}
                    className={cn(
                      "border-b border-border/30 last:border-b-0 hover:bg-cream-100",
                      state === "delete" && "opacity-60",
                    )}
                  >
                    <td className="px-3 py-1.5 align-top">
                      <Link
                        href={`/products/${encodeURIComponent(item.sourceSku)}`}
                        className="font-mono text-[11px] text-terracotta-600 hover:text-terracotta-700"
                      >
                        {item.sourceSku}
                      </Link>
                      {item.sourceName && (
                        <div className="text-[11px] text-foreground-muted truncate max-w-64">
                          {item.sourceName}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-1.5 align-top">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[10px]",
                          TYPE_TONE[item.relationType] ??
                            "bg-cream-200 text-stone-700",
                        )}
                      >
                        {item.relationType}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 align-top">
                      <Link
                        href={`/products/${encodeURIComponent(item.targetSku)}`}
                        className="font-mono text-[11px] text-terracotta-600 hover:text-terracotta-700"
                      >
                        {item.targetSku}
                      </Link>
                      {item.targetName && (
                        <div className="text-[11px] text-foreground-muted truncate max-w-64">
                          {item.targetName}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right align-top font-mono text-[11px] text-foreground-muted">
                      {item.confidence === null ? "—" : item.confidence.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right align-top">
                      {state === "delete" ? (
                        <span className="font-mono text-[10px] text-clay-red-500">
                          delete
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => stageDelete(item)}
                          aria-label="İlişkiyi sil"
                          className="inline-flex size-6 items-center justify-center rounded text-foreground-muted hover:bg-clay-red-500/10 hover:text-clay-red-500"
                        >
                          <Trash2 className="size-3" aria-hidden />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
