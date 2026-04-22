"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  MessageCircleQuestion,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useStagingStore } from "@/lib/stores/staging";
import { cn } from "@/lib/utils";

type FaqItem = {
  id: number | string;
  sku: string | null;
  scope: string;
  brand: string | null;
  category: string | null;
  question: string;
  answer: string;
  createdAt: string | null;
  productName: string | null;
};

type ListResponse = {
  total: number;
  limit: number;
  offset: number;
  scopeCounts: Record<string, number>;
  items: FaqItem[];
};

type Props = {
  initial: ListResponse;
};

const SCOPE_TONE: Record<string, string> = {
  product: "bg-terracotta-500/10 text-terracotta-700",
  brand: "bg-sage-500/10 text-sage-600",
  category: "bg-amber-500/10 text-amber-600",
};

const PAGE_SIZE = 50;

export function FaqManager({ initial }: Props) {
  const [data, setData] = useState<ListResponse>(initial);
  const [filters, setFilters] = useState({
    sku: "",
    scope: "" as "" | "product" | "brand" | "category",
    q: "",
  });
  const [offset, setOffset] = useState(0);
  const [loading, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draftQ, setDraftQ] = useState("");
  const [draftA, setDraftA] = useState("");

  const stageChange = useStagingStore((s) => s.stageChange);
  const pendingByKey = useStagingStore((s) => {
    const map = new Map<string, (typeof s.changes)[number]>();
    for (const c of s.changes) {
      if (c.scope !== "faq") continue;
      const key = `${c.sku ?? "__"}::${c.field}`;
      map.set(key, c);
    }
    return map;
  });

  useEffect(() => {
    const url = new URL("/api/admin/faqs", window.location.origin);
    if (filters.sku) url.searchParams.set("sku", filters.sku);
    if (filters.scope) url.searchParams.set("scope", filters.scope);
    if (filters.q) url.searchParams.set("q", filters.q);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));

    startTransition(() => {
      fetch(url.toString())
        .then((r) => r.json())
        .then((j: ListResponse) => setData(j))
        .catch(() => {
          /* leave previous data */
        });
    });
  }, [filters.sku, filters.scope, filters.q, offset]);

  function startEdit(item: FaqItem) {
    setEditingId(item.id);
    setDraftQ(item.question);
    setDraftA(item.answer);
  }

  function saveEdit(item: FaqItem) {
    if (!item.sku) {
      alert("Bu FAQ SKU'ya bağlı değil — global FAQ edit henüz desteklenmiyor.");
      return;
    }
    const q = draftQ.trim();
    const a = draftA.trim();
    if (!q || !a) return;
    if (q === item.question && a === item.answer) {
      setEditingId(null);
      return;
    }
    stageChange({
      sku: item.sku,
      scope: "faq",
      field: `faq[${item.id}]`,
      before: item,
      after: { ...item, question: q, answer: a },
      label: `FAQ ${item.id}`,
    });
    setEditingId(null);
  }

  function stageDelete(item: FaqItem) {
    if (!item.sku) {
      alert("SKU'ya bağlı olmayan FAQ silinemez (global staging).");
      return;
    }
    if (!confirm(`Sil: "${item.question}"?`)) return;
    stageChange({
      sku: item.sku,
      scope: "faq",
      field: `faq[${item.id}]`,
      before: item,
      after: null,
      label: `FAQ ${item.id} delete`,
    });
  }

  function isPending(item: FaqItem): "stable" | "edit" | "delete" {
    const key = `${item.sku ?? "__"}::faq[${item.id}]`;
    const p = pendingByKey.get(key);
    if (!p) return "stable";
    return p.after === null ? "delete" : "edit";
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr,180px,180px,auto]">
        <label className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Soru veya cevapta ara…"
            value={filters.q}
            onChange={(e) => {
              setOffset(0);
              setFilters((f) => ({ ...f, q: e.target.value }));
            }}
            className="w-full rounded-md border border-border bg-cream-50 py-1.5 pl-8 pr-2 text-sm focus:border-terracotta-500 focus:outline-none"
            aria-label="FAQ ara"
          />
        </label>
        <input
          type="text"
          placeholder="SKU filtre"
          value={filters.sku}
          onChange={(e) => {
            setOffset(0);
            setFilters((f) => ({ ...f, sku: e.target.value }));
          }}
          className="rounded-md border border-border bg-cream-50 px-2.5 py-1.5 font-mono text-sm focus:border-terracotta-500 focus:outline-none"
          aria-label="SKU filtre"
        />
        <select
          value={filters.scope}
          onChange={(e) => {
            setOffset(0);
            setFilters((f) => ({
              ...f,
              scope: e.target.value as typeof filters.scope,
            }));
          }}
          className="rounded-md border border-border bg-cream-50 px-2 py-1.5 text-sm"
          aria-label="Scope filtre"
        >
          <option value="">Tüm scope</option>
          <option value="product">product ({data.scopeCounts.product ?? 0})</option>
          <option value="brand">brand ({data.scopeCounts.brand ?? 0})</option>
          <option value="category">
            category ({data.scopeCounts.category ?? 0})
          </option>
        </select>
        <button
          type="button"
          onClick={() => {
            const sku = prompt("Yeni FAQ — hangi SKU'ya?");
            if (!sku) return;
            const tmpId = `new-${Date.now().toString(36)}`;
            stageChange({
              sku: sku.trim(),
              scope: "faq",
              field: `faq[${tmpId}]`,
              before: null,
              after: {
                id: tmpId,
                sku: sku.trim(),
                scope: "product",
                question: "Yeni soru",
                answer: "Yeni cevap",
              },
              label: `Yeni FAQ → ${sku}`,
            });
            alert("Yeni FAQ staging'e eklendi. /staging veya /commit'ten devam.");
          }}
          className="inline-flex items-center gap-1 rounded-md bg-sage-500/10 px-3 py-1.5 text-sm text-sage-700 hover:bg-sage-500/20"
        >
          <Plus className="size-3.5" aria-hidden /> Yeni FAQ
        </button>
      </div>

      {/* Status row */}
      <div className="mb-3 flex items-center justify-between text-xs text-foreground-muted">
        <span>
          {loading && (
            <Loader2 className="mr-1 inline-block size-3 animate-spin" aria-hidden />
          )}
          {data.total.toLocaleString("tr-TR")} kayıt · sayfa {Math.floor(offset / PAGE_SIZE) + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            aria-label="Önceki sayfa"
            className="inline-flex size-7 items-center justify-center rounded border border-border hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= data.total}
            aria-label="Sonraki sayfa"
            className="inline-flex size-7 items-center justify-center rounded border border-border hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* FAQ list */}
      {data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-cream-100 p-5 text-sm text-foreground-muted">
          Filtreyle eşleşen FAQ yok.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((item) => {
            const editing = editingId === item.id;
            const state = isPending(item);
            return (
              <li
                key={`${item.id}-${item.sku ?? "global"}`}
                className={cn(
                  "rounded-md border bg-surface p-3 transition-colors",
                  state === "edit" && "border-amber-500/50 bg-amber-500/5",
                  state === "delete" &&
                    "border-clay-red-500/50 bg-clay-red-500/5 opacity-70",
                  state === "stable" && "border-border",
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageCircleQuestion
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      state === "delete"
                        ? "text-clay-red-500"
                        : "text-terracotta-500",
                    )}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] text-foreground-muted">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono",
                          SCOPE_TONE[item.scope] ?? "bg-cream-200 text-stone-700",
                        )}
                      >
                        {item.scope}
                      </span>
                      {item.sku && (
                        <Link
                          href={`/products/${encodeURIComponent(item.sku)}`}
                          className="font-mono text-terracotta-600 hover:text-terracotta-700"
                        >
                          {item.sku}
                        </Link>
                      )}
                      {item.productName && (
                        <span className="truncate text-foreground-muted">
                          {item.productName}
                        </span>
                      )}
                      <span className="ml-auto font-mono">id: {item.id}</span>
                      {state !== "stable" && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono uppercase tracking-wide text-cream-50",
                            state === "edit" && "bg-amber-500 text-stone-700",
                            state === "delete" && "bg-clay-red-500",
                          )}
                        >
                          {state}
                        </span>
                      )}
                    </div>

                    {editing ? (
                      <div className="space-y-2">
                        <input
                          value={draftQ}
                          onChange={(e) => setDraftQ(e.target.value)}
                          className="w-full rounded border border-terracotta-500 bg-surface px-2 py-1 text-sm focus:outline-none"
                          aria-label="Soru"
                        />
                        <textarea
                          value={draftA}
                          onChange={(e) => setDraftA(e.target.value)}
                          rows={3}
                          className="w-full rounded border border-terracotta-500 bg-surface px-2 py-1 text-sm leading-relaxed focus:outline-none"
                          aria-label="Cevap"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(item)}
                            className="inline-flex items-center gap-1 rounded bg-sage-500/10 px-2 py-1 text-xs text-sage-700 hover:bg-sage-500/20"
                          >
                            <Check className="size-3" /> Staging
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground-muted hover:bg-cream-200"
                          >
                            <X className="size-3" /> İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-stone-700">
                          {item.question}
                        </p>
                        <p className="mt-0.5 text-sm text-foreground-muted leading-relaxed">
                          {item.answer.length > 200
                            ? item.answer.slice(0, 200) + "…"
                            : item.answer}
                        </p>
                      </>
                    )}
                  </div>

                  {!editing && state !== "delete" && (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        aria-label="Düzenle"
                        className="inline-flex size-6 items-center justify-center rounded text-foreground-muted hover:bg-cream-200 hover:text-stone-700"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stageDelete(item)}
                        aria-label="Sil"
                        className="inline-flex size-6 items-center justify-center rounded text-foreground-muted hover:bg-clay-red-500/10 hover:text-clay-red-500"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
