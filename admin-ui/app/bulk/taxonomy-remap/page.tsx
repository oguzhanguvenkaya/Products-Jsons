"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Layers, Sparkles } from "lucide-react";
import { useStagingStore } from "@/lib/stores/staging";
import { TAXONOMY } from "@/lib/data/taxonomy";
import { cn } from "@/lib/utils";

export default function TaxonomyRemapPage() {
  const [group, setGroup] = useState<string>("ceramic_coating");
  const grp = useMemo(
    () => TAXONOMY.find((g) => g.group === group) ?? TAXONOMY[0]!,
    [group],
  );
  const [sourceSub, setSourceSub] = useState<string>(grp.subs[0]?.sub ?? "");
  const [targetSub, setTargetSub] = useState<string>(
    grp.subs[1]?.sub ?? grp.subs[0]?.sub ?? "",
  );
  const stageChange = useStagingStore((s) => s.stageChange);
  const [staged, setStaged] = useState(false);

  const sourceCount =
    grp.subs.find((s) => s.sub === sourceSub)?.count ?? 0;

  function stageRemap() {
    // Placeholder: gerçek ürün SKU listesi olmadığı için snapshot sayısı
    // kadar pseudo-SKU üretilir. Commit workflow (4.9.8) gelince
    // /admin/products?group=&sub= ile gerçek SKU listesi çekilir.
    for (let i = 0; i < sourceCount; i++) {
      const pseudo = `${group}-${sourceSub}-${i + 1}`;
      stageChange({
        sku: pseudo,
        scope: "product",
        field: "template_sub_type",
        before: sourceSub,
        after: targetSub,
        label: `Remap ${sourceSub} → ${targetSub}`,
      });
    }
    setStaged(true);
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
          Sub_type remap
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Fragmentation'ı düşürmek için aynı grubun iki sub_type'ını
          birleştirir. Gerçek ürün listesi Admin API ile geldiğinde her SKU
          için <code className="font-mono text-xs">template_sub_type</code>{" "}
          alanı staging'e diff olarak düşecek.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-stone-700">
          <Layers className="size-4 text-sage-600" aria-hidden />
          <span className="font-medium">Grup & sub_type</span>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
              template_group
            </span>
            <select
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
                setSourceSub("");
                setTargetSub("");
                setStaged(false);
              }}
              className="rounded border border-border bg-cream-50 px-2 py-1.5 font-mono text-sm"
            >
              {TAXONOMY.map((g) => (
                <option key={g.group} value={g.group}>
                  {g.group} · {g.total}ü
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
              Kaynak sub_type
            </span>
            <select
              value={sourceSub}
              onChange={(e) => {
                setSourceSub(e.target.value);
                setStaged(false);
              }}
              className="rounded border border-border bg-cream-50 px-2 py-1.5 font-mono text-sm"
            >
              <option value="">—</option>
              {grp.subs.map((s) => (
                <option key={s.sub} value={s.sub}>
                  {s.sub} ({s.count})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
              Hedef sub_type
            </span>
            <select
              value={targetSub}
              onChange={(e) => {
                setTargetSub(e.target.value);
                setStaged(false);
              }}
              className="rounded border border-border bg-cream-50 px-2 py-1.5 font-mono text-sm"
            >
              <option value="">—</option>
              {grp.subs.map((s) => (
                <option key={s.sub} value={s.sub}>
                  {s.sub} ({s.count})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={stageRemap}
            disabled={
              !sourceSub || !targetSub || sourceSub === targetSub || sourceCount === 0
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm",
              !sourceSub || !targetSub || sourceSub === targetSub
                ? "bg-cream-200 text-foreground-muted cursor-not-allowed"
                : "bg-terracotta-500 text-cream-50 hover:bg-terracotta-600",
            )}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {sourceCount} ürünü staging'e ekle
          </button>
          {staged && (
            <span className="text-xs text-sage-600">
              Staging kuyruğuna eklendi — <Link href="/staging" className="underline">kontrol et</Link>
            </span>
          )}
        </div>
      </section>

      <aside className="mt-6 rounded-md border border-dashed border-border bg-cream-100 p-4 text-xs text-foreground-muted">
        <strong className="font-medium text-stone-700">Önerilen remap kısayolları</strong>
        <ul className="mt-2 space-y-1">
          <li>
            <code className="font-mono">ceramic_coating</code>:{" "}
            <code className="font-mono">paint_coating_kit</code> →{" "}
            <code className="font-mono">paint_coating</code>{" "}
            (AntiFog regresyonu için Phase 4.17'de eklenen family fix).
          </li>
          <li>
            <code className="font-mono">contaminant_solvers</code>:{" "}
            <code className="font-mono">single_layer_coating</code> yanlış
            yerleştirildi; muhtemelen <code className="font-mono">iron_remover</code>{" "}
            altına taşınmalı.
          </li>
        </ul>
      </aside>
    </div>
  );
}
