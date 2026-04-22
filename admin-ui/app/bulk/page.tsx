import Link from "next/link";
import { Info, Layers, Boxes, Wrench } from "lucide-react";
import { TAXONOMY } from "@/lib/data/taxonomy";
import { SPECS_KEY_DUPES } from "@/lib/data/snapshot";

export default function BulkPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8">
        <div className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
          Phase 4.9.7 · Bulk Operations
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">
          Toplu düzenleme atölyesi
        </h1>
        <p className="mt-2 max-w-2xl text-foreground-muted">
          Seçili ürün kümelerine tek hamlede uygulanan düzeltmeler. Her
          işlem, ürün bazında staging'e diff olarak düşer — DB yazımı
          yalnızca commit workflow ile yapılır.
        </p>
      </header>

      <section aria-label="Hazır araçlar" className="grid gap-5 md:grid-cols-2">
        <Link
          href="/bulk/specs-normalize"
          className="group flex gap-3 rounded-lg border border-border bg-surface p-5 hover:border-terracotta-500/50 transition-colors"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-terracotta-500/10 text-terracotta-600">
            <Wrench className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg text-stone-700">
              Specs key normalize
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              <code className="font-mono text-xs">ph / ph_level / ph_tolerance</code>{" "}
              gibi duplikasyonları tek standarda birleştirir.
            </p>
            <div className="mt-2 text-xs text-terracotta-600 group-hover:text-terracotta-700">
              Aracı aç →
            </div>
          </div>
        </Link>

        <Link
          href="/bulk/taxonomy-remap"
          className="group flex gap-3 rounded-lg border border-border bg-surface p-5 hover:border-terracotta-500/50 transition-colors"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-sage-500/10 text-sage-600">
            <Layers className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg text-stone-700">
              Sub_type remap
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Fragmentation'ı azaltmak için <code className="font-mono text-xs">paint_coating_kit</code>{" "}
              → <code className="font-mono text-xs">paint_coating</code> gibi birleştirmeler.
            </p>
            <div className="mt-2 text-xs text-terracotta-600 group-hover:text-terracotta-700">
              Aracı aç →
            </div>
          </div>
        </Link>

        <div className="flex gap-3 rounded-lg border border-dashed border-border bg-cream-100 p-5 opacity-80">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
            <Boxes className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg text-stone-700">
              Toplu fiyat / stok güncelleme
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Seçili ürün kümesine yüzdelik zam / stok durumu değişikliği —
              yakında.
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-lg border border-dashed border-border bg-cream-100 p-5 opacity-80">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-clay-red-500/10 text-clay-red-500">
            <Info className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg text-stone-700">
              FAQ toplu atama
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Kategori geneli ortak FAQ'leri toplu iliştirme — yakında.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Mevcut duplikasyonlar" className="mt-10">
        <h2 className="mb-3 text-lg text-stone-600">
          Aktif duplikasyon uyarıları
        </h2>
        <ul className="space-y-2">
          {SPECS_KEY_DUPES.map((d) => (
            <li
              key={d.key}
              className="rounded-md border border-border bg-surface p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <code className="font-mono text-stone-700">{d.key}</code>
                <span className="text-foreground-muted">←</span>
                <div className="flex flex-wrap gap-1">
                  {d.aliases.map((a) => (
                    <span
                      key={a}
                      className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-[11px] text-stone-700"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-foreground-muted">{d.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Taxonomy snapshot" className="mt-10">
        <h2 className="mb-2 text-lg text-stone-600">Taxonomy snapshot</h2>
        <p className="mb-3 text-xs text-foreground-muted">
          Top 8 template_group · ürün/sub_type dağılımı. Fragmentation yüksek
          gruplarda remap işlemi daha etkilidir.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {TAXONOMY.slice(0, 8).map((g) => {
            const ratio = g.total / g.subs.length;
            return (
              <div
                key={g.group}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2"
              >
                <div>
                  <code className="font-mono text-sm text-stone-700">{g.group}</code>
                  <div className="text-[11px] text-foreground-muted">
                    {g.total} ürün · {g.subs.length} sub_type
                  </div>
                </div>
                <span
                  className={
                    ratio < 2
                      ? "font-mono text-sm text-clay-red-500"
                      : ratio >= 4
                        ? "font-mono text-sm text-sage-600"
                        : "font-mono text-sm text-amber-600"
                  }
                >
                  {ratio.toFixed(1)}×
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
