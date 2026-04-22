import Link from "next/link";
import { ArrowLeft, History, AlertTriangle } from "lucide-react";
import { adminFetch } from "@/lib/api";

type AuditResponse = {
  count: number;
  items: Array<{
    id: number;
    at: string;
    actor: string;
    sku: string | null;
    scope: string;
    field: string;
    before: unknown;
    after: unknown;
  }>;
  hint?: string;
  error?: string;
};

async function loadAudit(): Promise<AuditResponse> {
  try {
    return await adminFetch<AuditResponse>("/audit/recent", {
      searchParams: { limit: 50 },
    });
  } catch (err) {
    return {
      count: 0,
      items: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 40 ? v.slice(0, 40) + "…" : v;
  return JSON.stringify(v);
}

export default async function ActivityPage() {
  const audit = await loadAudit();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-terracotta-600 hover:text-terracotta-700"
      >
        <ArrowLeft className="size-3" /> Dashboard
      </Link>

      <header className="mt-3 mb-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          Phase 4.9.10 · Activity
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">
          Son değişiklikler
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          <code className="font-mono text-xs">audit_log</code> tablosundan
          canlı okuma. Tablo henüz uygulanmadıysa ipucu gösterilir.
        </p>
      </header>

      {(audit.hint || audit.error) && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-stone-700">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
          <div>
            {audit.hint ?? "audit_log okunamadı"}
            {audit.error && (
              <code className="mt-1 block font-mono text-[11px] text-foreground-muted">
                {audit.error}
              </code>
            )}
            <p className="mt-2 text-xs">
              <code className="font-mono">migrations/008_audit_log.sql</code>{" "}
              henüz uygulanmamış olabilir. Supabase SQL editor'da çalıştır,
              sonra bu sayfa otomatik dolar.
            </p>
          </div>
        </div>
      )}

      {audit.items.length === 0 && !audit.error ? (
        <div className="rounded-md border border-dashed border-border bg-cream-100 p-5 text-sm text-foreground-muted">
          Hiç commit kaydı yok — ilk değişikliği /commit sayfasından uygula,
          burada zaman çizelgesine düşecek.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-100">
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Zaman
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Aktör
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  SKU
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Alan
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Değişim
                </th>
              </tr>
            </thead>
            <tbody>
              {audit.items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/30 last:border-b-0 hover:bg-cream-100"
                >
                  <td className="px-3 py-1.5 font-mono text-[11px] text-foreground-muted whitespace-nowrap">
                    {new Date(row.at).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-stone-700">
                    {row.actor}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px]">
                    {row.sku ? (
                      <Link
                        href={`/products/${encodeURIComponent(row.sku)}`}
                        className="text-terracotta-600 hover:text-terracotta-700"
                      >
                        {row.sku}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-stone-700">
                    {row.scope} · {row.field}
                  </td>
                  <td className="px-3 py-1.5 text-[12px]">
                    <span className="font-mono text-foreground-muted line-through">
                      {renderValue(row.before)}
                    </span>
                    <span className="mx-2 text-foreground-muted">→</span>
                    <span className="font-mono text-stone-700">
                      {renderValue(row.after)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 flex items-center gap-1 text-[11px] text-foreground-muted">
        <History className="size-3" aria-hidden />
        Per-SKU geçmiş ürün detayındaki "History" sekmesinde görünür.
      </p>
    </div>
  );
}
