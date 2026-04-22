"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Wrench, Sparkles } from "lucide-react";
import { useStagingStore } from "@/lib/stores/staging";
import { SPECS_KEY_DUPES } from "@/lib/data/snapshot";
import { cn } from "@/lib/utils";

type Row = { sku: string; specs_key: string; value: string | number | boolean | null };

// Demo sample — gerçek SKU listesi /admin/coverage/:group+key ile gelir.
const SAMPLE_AFFECTED: Record<string, Row[]> = {
  ph_tolerance: [
    { sku: "Q2-CCE200M", specs_key: "ph_tolerance", value: "2-11" },
    { sku: "Q2-OLE100M", specs_key: "ph_tolerance", value: "2-11" },
    { sku: "Q2-AF120M", specs_key: "ph_tolerance", value: "3-12" },
  ],
  ph: [
    { sku: "Q2M-WCYA4000M", specs_key: "ph", value: 7 },
    { sku: "Q2M-SMOOTH5K", specs_key: "ph", value: 8 },
  ],
  ph_level: [
    { sku: "Q2M-PREP5K", specs_key: "ph_level", value: "7" },
  ],
};

export default function SpecsNormalizePage() {
  const [source, setSource] = useState<string>("ph_tolerance");
  const [target, setTarget] = useState<string>("ph_level");
  const [preview, setPreview] = useState<Row[]>([]);
  const stageChange = useStagingStore((s) => s.stageChange);

  const phDupe = SPECS_KEY_DUPES.find((d) => d.key === "ph_level");
  const aliasChoices = phDupe?.aliases ?? ["ph", "ph_level", "ph_tolerance"];

  function runPreview() {
    const rows = SAMPLE_AFFECTED[source] ?? [];
    setPreview(rows);
  }

  function stageAll() {
    const rows = preview.length > 0 ? preview : SAMPLE_AFFECTED[source] ?? [];
    for (const r of rows) {
      // Her satır için iki diff: hedef alana taşı + kaynağı sil
      stageChange({
        sku: r.sku,
        scope: "product.specs",
        field: `specs.${target}`,
        before: null,
        after: r.value,
        label: `${source} → ${target} (normalize)`,
      });
      stageChange({
        sku: r.sku,
        scope: "product.specs",
        field: `specs.${source}`,
        before: r.value,
        after: null,
        label: `${source} → ${target} (kaynak temizle)`,
      });
    }
    alert(`${rows.length} ürün için ${rows.length * 2} diff staging'e eklendi.`);
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/bulk"
        className="inline-flex items-center gap-1 text-xs text-terracotta-600 hover:text-terracotta-700"
      >
        <ArrowLeft className="size-3" /> Bulk atölyesi
      </Link>

      <header className="mt-3 mb-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          Bulk tool · Phase 4.9.7
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">
          Specs key normalize
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Kaynak key'in değerini hedef key'e taşır ve kaynağı temizler.
          İşlem başına 2 diff (yeni key + eski key sıfırlama) staging'e
          düşer; commit öncesi review edilir.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-stone-700">
          <Wrench className="size-4 text-terracotta-500" aria-hidden />
          <span className="font-medium">Parametreler</span>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr,auto,1fr]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
              Kaynak key
            </span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded border border-border bg-cream-50 px-2 py-1.5 font-mono text-sm"
            >
              {aliasChoices.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <span className="self-end pb-2 font-mono text-foreground-muted">→</span>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
              Hedef key
            </span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="rounded border border-border bg-cream-50 px-2 py-1.5 font-mono text-sm"
            >
              {aliasChoices.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={runPreview}
            disabled={source === target}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm",
              source === target
                ? "bg-cream-200 text-foreground-muted cursor-not-allowed"
                : "bg-sage-500 text-cream-50 hover:bg-sage-600",
            )}
          >
            <Sparkles className="size-3.5" aria-hidden /> Preview
          </button>
          <button
            type="button"
            onClick={stageAll}
            disabled={preview.length === 0 || source === target}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm",
              preview.length > 0 && source !== target
                ? "bg-terracotta-500 text-cream-50 hover:bg-terracotta-600"
                : "bg-cream-200 text-foreground-muted cursor-not-allowed",
            )}
          >
            Tümünü staging'e ekle
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg text-stone-600">Önizleme</h2>
        {preview.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            "Preview" ile kaynak key'e sahip ürünleri listele.
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
                    Kaynak değer
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    Yeni yer
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr
                    key={r.sku}
                    className="border-b border-border/40 last:border-b-0 hover:bg-cream-100"
                  >
                    <td className="px-3 py-1.5 font-mono text-[12px] text-stone-700">
                      <Link
                        href={`/products/${encodeURIComponent(r.sku)}`}
                        className="text-terracotta-600 hover:text-terracotta-700"
                      >
                        {r.sku}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[12px] text-stone-700">
                      {String(r.value)}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[12px] text-foreground-muted">
                      specs.{target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-foreground-muted">
          Gerçek ürün kümesi Admin API'ye <code className="font-mono">GET /admin/coverage/:group?key=X</code>{" "}
          eklendikten sonra gelir. Bu sürüm snapshot önizlemesi.
        </p>
      </section>
    </div>
  );
}
