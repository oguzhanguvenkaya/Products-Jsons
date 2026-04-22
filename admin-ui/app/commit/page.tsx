"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Check,
  AlertTriangle,
  ShieldCheck,
  Download,
  Loader2,
} from "lucide-react";
import { useStagingStore, type StagedChange } from "@/lib/stores/staging";
import { cn } from "@/lib/utils";

type PlannedStep = {
  id: string;
  sku: string;
  scope: string;
  field: string;
  sql: string;
  status: "planned" | "unsupported" | "skipped";
  reason?: string;
};
type PreviewResponse = {
  total: number;
  planned: number;
  unsupported: number;
  skipped: number;
  steps: PlannedStep[];
};
type CommitResponse = {
  committed_at?: string;
  total_applied?: number;
  planned?: number;
  unsupported?: number;
  skipped?: number;
  outcome?: Array<{
    id: string;
    sku: string;
    status: "applied" | "error";
    rows?: number;
    error?: string;
  }>;
  error?: string;
  message?: string;
  applied_before_failure?: number;
  hint?: string;
};

export default function CommitPage() {
  const changes = useStagingStore((s) => s.changes);
  const revertChange = useStagingStore((s) => s.revertChange);
  const clearAll = useStagingStore((s) => s.clearAll);

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runPreview() {
    if (changes.length === 0) return;
    setPreviewing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staging/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`preview ${res.status}: ${body}`);
      }
      setPreview((await res.json()) as PreviewResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewing(false);
    }
  }

  useEffect(() => {
    if (changes.length > 0 && !preview) {
      runPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runCommit() {
    if (!preview || preview.planned === 0) return;
    if (!confirm(`${preview.planned} değişikliği DB'ye uygulanacak. Devam?`))
      return;
    setCommitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staging/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      const body = (await res.json()) as CommitResponse;
      setCommitResult(body);
      if (body.outcome) {
        // Clear successfully-applied diffs from staging
        const appliedIds = new Set(
          body.outcome.filter((o) => o.status === "applied").map((o) => o.id),
        );
        for (const id of appliedIds) revertChange(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCommitting(false);
    }
  }

  function exportJsonl() {
    const blob = new Blob(
      [changes.map((c) => JSON.stringify(c)).join("\n")],
      { type: "application/x-ndjson" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staging-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const bySku = useMemo(() => groupBySku(changes), [changes]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/staging"
        className="inline-flex items-center gap-1 text-xs text-terracotta-600 hover:text-terracotta-700"
      >
        <ArrowLeft className="size-3" /> Staging
      </Link>

      <header className="mt-3 mb-6 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
            Phase 4.9.8 · Commit Workflow
          </div>
          <h1 className="mt-1 font-display text-3xl text-stone-700">
            DB'ye uygula
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {changes.length} staged diff · {Object.keys(bySku).length} ürün
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportJsonl}
            disabled={changes.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground-muted hover:text-stone-700 disabled:opacity-40"
          >
            <Download className="size-3" /> JSONL
          </button>
          <button
            type="button"
            onClick={runPreview}
            disabled={previewing || changes.length === 0}
            className="inline-flex items-center gap-1 rounded-md bg-sage-500/10 px-3 py-1.5 text-xs text-sage-700 hover:bg-sage-500/20 disabled:opacity-40"
          >
            {previewing ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            Preview
          </button>
          <button
            type="button"
            onClick={runCommit}
            disabled={
              committing ||
              !preview ||
              preview.planned === 0
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs transition-colors",
              preview && preview.planned > 0
                ? "bg-terracotta-500 text-cream-50 hover:bg-terracotta-600"
                : "bg-cream-200 text-foreground-muted cursor-not-allowed",
            )}
          >
            {committing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <ShieldCheck className="size-3" />
            )}
            Commit
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-clay-red-500/40 bg-clay-red-500/5 p-3 text-sm text-clay-red-500">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <code className="font-mono text-xs break-all">{error}</code>
        </div>
      )}

      {commitResult && (
        <div
          className={cn(
            "mb-5 rounded-md border p-4 text-sm",
            commitResult.error
              ? "border-clay-red-500/40 bg-clay-red-500/5"
              : "border-sage-500/40 bg-sage-500/5",
          )}
        >
          <div className="flex items-center gap-2 text-stone-700">
            {commitResult.error ? (
              <AlertTriangle className="size-4 text-clay-red-500" aria-hidden />
            ) : (
              <Check className="size-4 text-sage-600" aria-hidden />
            )}
            <strong className="font-medium">
              {commitResult.error
                ? "Commit başarısız — transaction geri alındı"
                : "Commit tamamlandı"}
            </strong>
          </div>
          <div className="mt-2 font-mono text-xs text-foreground-muted">
            {commitResult.error ? (
              <>
                {commitResult.error} — {commitResult.message}
                {commitResult.hint && <div>{commitResult.hint}</div>}
              </>
            ) : (
              <>
                applied: {commitResult.total_applied} /{" "}
                {commitResult.planned} · skipped {commitResult.skipped ?? 0}
                · unsupported {commitResult.unsupported ?? 0}
                {commitResult.committed_at && (
                  <> · at {commitResult.committed_at}</>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {changes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-cream-100 p-5 text-sm text-foreground-muted">
          Staging boş. Ürün detayından bir alan düzenle, buraya geri dön.
        </div>
      ) : !preview ? (
        <div className="rounded-md border border-dashed border-border bg-cream-100 p-5 text-sm text-foreground-muted">
          SQL önizleme henüz alınmadı. "Preview" butonuna tıkla.
        </div>
      ) : (
        <section className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <Stat label="planlandı" value={preview.planned} tone="good" />
            <Stat
              label="desteksiz"
              value={preview.unsupported}
              tone={preview.unsupported > 0 ? "warn" : "muted"}
            />
            <Stat
              label="atlandı"
              value={preview.skipped}
              tone={preview.skipped > 0 ? "warn" : "muted"}
            />
            <Stat label="toplam" value={preview.total} tone="muted" />
          </div>

          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-cream-100">
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    Durum
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    SKU · Alan
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    SQL
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.steps.map((s) => {
                  const origin = changes.find((c) => c.id === s.id);
                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        "border-b border-border/30 align-top last:border-b-0",
                        s.status === "planned" && "bg-sage-500/5",
                        s.status === "skipped" && "bg-amber-500/5",
                        s.status === "unsupported" && "bg-clay-red-500/5",
                      )}
                    >
                      <td className="px-3 py-2">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px] text-stone-700">
                        <Link
                          href={`/products/${encodeURIComponent(s.sku)}`}
                          className="text-terracotta-600 hover:text-terracotta-700"
                        >
                          {s.sku}
                        </Link>
                        <div className="text-[10px] text-foreground-muted">
                          {s.scope} · {s.field}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {s.sql ? (
                          <pre className="overflow-x-auto rounded bg-cream-100 p-2 font-mono text-[11px] text-stone-700">
                            {s.sql}
                          </pre>
                        ) : (
                          <div className="text-xs text-foreground-muted">
                            {s.reason ?? "—"}
                            {origin && (
                              <button
                                type="button"
                                onClick={() => revertChange(origin.id)}
                                className="ml-2 rounded px-1.5 py-0.5 text-[10px] text-foreground-muted hover:bg-cream-200"
                              >
                                geri al
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="pt-4 flex items-center justify-between text-xs text-foreground-muted">
            <span>
              Desteksiz / atlanmış satırlar commit'te işletilmez — manuel temizlenmeli.
            </span>
            <button
              type="button"
              onClick={() => clearAll()}
              className="text-foreground-muted hover:text-clay-red-500"
            >
              Tüm staging'i temizle
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PlannedStep["status"] }) {
  const map = {
    planned: {
      label: "planned",
      cls: "bg-sage-500 text-cream-50",
    },
    unsupported: {
      label: "unsupported",
      cls: "bg-clay-red-500 text-cream-50",
    },
    skipped: {
      label: "skipped",
      cls: "bg-amber-500 text-stone-700",
    },
  }[status];
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        map.cls,
      )}
    >
      {map.label}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "muted";
}) {
  const toneCls =
    tone === "good"
      ? "text-sage-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-foreground-muted";
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-foreground-muted">
        {label}
      </div>
      <div className={cn("font-display text-xl", toneCls)}>{value}</div>
    </div>
  );
}

function groupBySku(changes: StagedChange[]): Record<string, StagedChange[]> {
  return changes.reduce<Record<string, StagedChange[]>>((acc, c) => {
    (acc[c.sku] ??= []).push(c);
    return acc;
  }, {});
}
