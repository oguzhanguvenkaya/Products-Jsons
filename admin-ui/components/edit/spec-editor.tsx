"use client";

import { EditableCell } from "./editable-cell";
import { cn } from "@/lib/utils";

type Props = {
  sku: string;
  specs: Record<string, unknown>;
};

function isEditableScalar(v: unknown): v is string | number {
  return typeof v === "string" || typeof v === "number";
}

export function SpecEditor({ sku, specs }: Props) {
  const entries = Object.entries(specs);
  const narrative = entries.filter(([k]) =>
    ["howToUse", "whenToUse", "whyThisProduct"].includes(k),
  );
  const structured = entries.filter(
    ([k]) => !["howToUse", "whenToUse", "whyThisProduct"].includes(k),
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-display text-lg text-stone-700">Anlatı alanları</h3>
        <p className="mb-3 text-xs text-foreground-muted">
          Uzun metin alanları inline değil — yakında TextareaEditor gelecek.
          Şimdilik sağ üstteki "kopyala" ile düzenle.
        </p>
        <dl className="space-y-3">
          {narrative.map(([key, val]) => (
            <div
              key={key}
              className="rounded-md border border-border bg-cream-100 p-3"
            >
              <dt className="text-[11px] uppercase tracking-wider text-foreground-muted">
                {key}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-stone-700 leading-relaxed">
                {String(val)}
              </dd>
            </div>
          ))}
          {narrative.length === 0 && (
            <p className="text-xs text-foreground-muted">
              Anlatı alanı yok — <code className="font-mono">howToUse</code>,{" "}
              <code className="font-mono">whenToUse</code>,{" "}
              <code className="font-mono">whyThisProduct</code> eklenebilir.
            </p>
          )}
        </dl>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-display text-lg text-stone-700">
            Yapılandırılmış alanlar
          </h3>
          <span className="text-xs text-foreground-muted">
            {structured.length} key
          </span>
        </div>

        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="border-b border-border py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
              >
                Key
              </th>
              <th
                scope="col"
                className="border-b border-border py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
              >
                Değer
              </th>
              <th
                scope="col"
                className="border-b border-border py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
              >
                Tip
              </th>
            </tr>
          </thead>
          <tbody>
            {structured.map(([key, val]) => {
              const editable = isEditableScalar(val) || val === null;
              const kind = typeof val === "number" ? "number" : "text";
              return (
                <tr
                  key={key}
                  className={cn("hover:bg-cream-100", !editable && "opacity-90")}
                >
                  <td className="border-b border-border/40 py-1.5 pr-4 align-top font-mono text-[12px] text-stone-700">
                    {key}
                  </td>
                  <td className="border-b border-border/40 py-1.5 align-top">
                    {editable ? (
                      <EditableCell
                        sku={sku}
                        scope="product.specs"
                        field={`specs.${key}`}
                        value={val as string | number | null}
                        kind={kind}
                        label={key}
                      />
                    ) : (
                      <RawJson value={val} />
                    )}
                  </td>
                  <td className="border-b border-border/40 py-1.5 align-top text-[11px] text-foreground-muted">
                    {describeType(val)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-3 text-[11px] text-foreground-muted">
          Array ve obje tipleri (<code className="font-mono">ratings</code>,{" "}
          <code className="font-mono">features</code>) read-only görüntülenir —
          dedicated array + JSON editor Phase 4.9.7'de gelir.
        </p>
      </section>
    </div>
  );
}

function describeType(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return `array(${v.length})`;
  return typeof v;
}

function RawJson({ value }: { value: unknown }) {
  return (
    <pre className="max-w-xl overflow-x-auto rounded bg-cream-200 px-2 py-1 font-mono text-[11px] text-stone-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
