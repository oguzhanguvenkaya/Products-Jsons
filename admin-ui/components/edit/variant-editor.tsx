"use client";

import { EditableCell } from "./editable-cell";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Variant } from "@/lib/data/sample-products";

const fmtTL = (n: number | null) =>
  typeof n === "number" ? `${n.toLocaleString("tr-TR")} TL` : "—";

type Props = {
  sku: string;
  sizes: Variant[];
};

export function VariantEditor({ sku, sizes }: Props) {
  if (sizes.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        Variant yok. <code className="font-mono">sizes[]</code> boş —
        addVariant Phase 4.9.7'de gelir.
      </p>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-lg text-stone-700">
            Variant (sizes[])
          </h3>
          <p className="text-xs text-foreground-muted">
            {sizes.length} variant · her satır{" "}
            <code className="font-mono">products.sizes[i]</code> alanı · inline
            edit staging'e düşer
          </p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-cream-100">
            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              SKU
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Boyut
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Fiyat
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Primary
            </th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((v, index) => (
            <tr
              key={v.sku || index}
              className={cn(
                "border-b border-border/40 last:border-b-0",
                v.is_primary ? "bg-terracotta-500/5" : "hover:bg-cream-100",
              )}
            >
              <td className="px-3 py-1.5 font-mono text-[12px] text-stone-700">
                {v.sku || `(sizes[${index}])`}
              </td>
              <td className="px-3 py-1.5">
                <EditableCell
                  sku={sku}
                  scope="product.sizes"
                  field={`sizes[${index}].size_label`}
                  value={v.size_label}
                  kind="text"
                  label={`sizes[${index}].size_label`}
                />
              </td>
              <td className="px-3 py-1.5 text-right">
                <EditableCell
                  sku={sku}
                  scope="product.sizes"
                  field={`sizes[${index}].price`}
                  value={v.price}
                  kind="number"
                  label={`sizes[${index}].price`}
                  display={(x) => (typeof x === "number" ? fmtTL(x) : "—")}
                />
              </td>
              <td className="px-3 py-1.5 text-right">
                {v.is_primary ? (
                  <span className="inline-flex items-center gap-1 rounded bg-terracotta-500 px-1.5 py-0.5 font-mono text-[10px] text-cream-50">
                    <Tag className="size-2.5" /> primary
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-foreground-muted">
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[11px] text-foreground-muted">
        Primary toggle + variant ekle/sil Phase 4.9.7'de bulk araçlarla
        birlikte gelir. Şu anki sürüm inline label/price düzenler.
      </p>
    </div>
  );
}
