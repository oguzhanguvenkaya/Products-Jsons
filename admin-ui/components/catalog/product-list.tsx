"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProductRow = {
  sku: string;
  name: string;
  baseName: string;
  brand: string | null;
  templateGroup: string | null;
  templateSubType: string | null;
  price: number | null;
  imageUrl: string | null;
  variantCount: number;
  faqCount: number;
  specsKeyCount: number;
};

type ListResponse = {
  total: number;
  limit: number;
  offset: number;
  items: ProductRow[];
};

type Props = {
  group: string;
  sub?: string | null;
};

const PAGE_SIZE = 25;

const fmtTL = (n: number | null) =>
  typeof n === "number" ? `${n.toLocaleString("tr-TR")} TL` : "—";

export function ProductList({ group, sub }: Props) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, startTransition] = useTransition();

  // reset paging on filter change
  useEffect(() => {
    setOffset(0);
  }, [group, sub]);

  useEffect(() => {
    setError(null);
    const url = new URL("/api/admin/products", window.location.origin);
    url.searchParams.set("group", group);
    if (sub) url.searchParams.set("sub", sub);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));

    startTransition(() => {
      fetch(url.toString())
        .then(async (r) => {
          if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
          return (await r.json()) as ListResponse;
        })
        .then(setData)
        .catch((err) =>
          setError(err instanceof Error ? err.message : String(err)),
        );
    });
  }, [group, sub, offset]);

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-clay-red-500/40 bg-clay-red-500/5 p-3 text-sm text-clay-red-500">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <code className="font-mono text-xs break-all">{error}</code>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-foreground-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Yükleniyor…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-foreground-muted">
        <span>
          {loading && (
            <Loader2
              className="mr-1 inline-block size-3 animate-spin"
              aria-hidden
            />
          )}
          {data.total.toLocaleString("tr-TR")} ürün · sayfa{" "}
          {Math.floor(offset / PAGE_SIZE) + 1}/
          {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
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

      {data.items.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          Bu filtre için ürün yok.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-100">
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  SKU
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Ürün
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Marka
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Fiyat
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  V/F/S
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr
                  key={p.sku}
                  className={cn(
                    "border-b border-border/30 last:border-b-0 hover:bg-cream-100",
                  )}
                >
                  <td className="px-3 py-1.5 align-top">
                    <Link
                      href={`/products/${encodeURIComponent(p.sku)}`}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-terracotta-600 hover:text-terracotta-700"
                    >
                      <Package className="size-3" aria-hidden />
                      {p.sku}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 align-top">
                    <Link
                      href={`/products/${encodeURIComponent(p.sku)}`}
                      className="text-sm text-stone-700 hover:text-terracotta-700"
                    >
                      {p.baseName}
                    </Link>
                    {!sub && p.templateSubType && (
                      <div className="font-mono text-[10px] text-foreground-muted">
                        {p.templateSubType}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-1.5 align-top text-stone-700">
                    {p.brand ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right align-top font-mono text-stone-700">
                    {fmtTL(p.price)}
                  </td>
                  <td className="px-3 py-1.5 text-right align-top font-mono text-[11px] text-foreground-muted">
                    {p.variantCount}/{p.faqCount}/{p.specsKeyCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-[10px] text-foreground-muted">
        V/F/S = variant / FAQ / specs key sayısı ·
        Tıklayınca <Link href="/products/Q2-OLE100M" className="text-terracotta-600">6-sekme</Link>{" "}
        ürün detayı açılır.
      </p>
    </div>
  );
}
