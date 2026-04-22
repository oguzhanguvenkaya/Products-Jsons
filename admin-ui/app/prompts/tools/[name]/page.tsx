import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Code,
  Wrench,
  Clock,
  FileText,
} from "lucide-react";
import { adminFetch, type AdminToolDetailResponse } from "@/lib/api";

type PageProps = {
  params: Promise<{ name: string }>;
};

async function loadTool(name: string): Promise<{
  tool: AdminToolDetailResponse | null;
  error?: string;
}> {
  try {
    const tool = await adminFetch<AdminToolDetailResponse>(
      `/tools/${encodeURIComponent(name)}`,
    );
    return { tool };
  } catch (err) {
    return {
      tool: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function ToolDetailPage({ params }: PageProps) {
  const { name } = await params;
  const { tool, error } = await loadTool(decodeURIComponent(name));

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1 text-xs text-terracotta-600 hover:text-terracotta-700"
      >
        <ArrowLeft className="size-3" /> Prompt Lab
      </Link>

      <header className="mt-3 mb-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          Prompt Lab · Tool
        </div>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl text-stone-700">
          <Wrench className="size-6 text-terracotta-500" aria-hidden />
          <code className="font-mono text-stone-700">
            {decodeURIComponent(name)}
          </code>
        </h1>
      </header>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-clay-red-500/40 bg-clay-red-500/5 p-3 text-sm text-clay-red-500">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <code className="font-mono text-xs break-all">{error}</code>
        </div>
      )}

      {tool && (
        <>
          <section
            aria-label="Meta"
            className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"
          >
            <Meta label="bot" value={tool.bot} mono />
            <Meta label="filename" value={tool.filename} mono />
            <Meta
              label="last modified"
              value={
                tool.lastModified
                  ? new Date(tool.lastModified).toLocaleString("tr-TR")
                  : "—"
              }
              icon={<Clock className="size-3.5 text-amber-600" aria-hidden />}
            />
            <Meta
              label="size"
              value={`${(tool.bytes / 1024).toFixed(1)} KB`}
              mono
            />
          </section>

          {tool.description && (
            <section className="mb-6">
              <h2 className="mb-2 text-lg text-stone-700">Description</h2>
              <p className="rounded-md border border-border bg-cream-100 p-4 text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">
                {tool.description}
              </p>
            </section>
          )}

          {tool.jsdoc && (
            <section className="mb-6">
              <h2 className="mb-2 text-lg text-stone-700">JSDoc notları</h2>
              <pre className="overflow-auto rounded-md border border-border bg-cream-100 p-4 font-mono text-[12px] leading-relaxed text-stone-700 whitespace-pre-wrap">
                {tool.jsdoc}
              </pre>
            </section>
          )}

          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 flex items-center gap-1 text-lg text-stone-700">
                <span className="rounded bg-sage-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sage-600">
                  z.input
                </span>
                Input schema
              </h2>
              {tool.inputSchema ? (
                <pre className="max-h-96 overflow-auto rounded-md border border-sage-500/30 bg-sage-500/5 p-4 font-mono text-[11px] leading-relaxed text-stone-700">
                  {tool.inputSchema}
                </pre>
              ) : (
                <p className="text-sm text-foreground-muted">
                  Input schema ayrıştırılamadı.
                </p>
              )}
            </div>

            <div>
              <h2 className="mb-2 flex items-center gap-1 text-lg text-stone-700">
                <span className="rounded bg-terracotta-500/10 px-1.5 py-0.5 font-mono text-[10px] text-terracotta-600">
                  z.output
                </span>
                Output schema
              </h2>
              {tool.outputSchema ? (
                <pre className="max-h-96 overflow-auto rounded-md border border-terracotta-500/30 bg-terracotta-500/5 p-4 font-mono text-[11px] leading-relaxed text-stone-700">
                  {tool.outputSchema}
                </pre>
              ) : (
                <p className="text-sm text-foreground-muted">
                  Output schema ayrıştırılamadı.
                </p>
              )}
            </div>
          </section>

          <section className="mb-8">
            <details className="rounded-lg border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-700 hover:bg-cream-100">
                <span className="inline-flex items-center gap-2">
                  <Code className="size-3.5 text-terracotta-500" aria-hidden />
                  Tam kaynak ({tool.filename}, {(tool.bytes / 1024).toFixed(1)} KB)
                </span>
              </summary>
              <pre className="max-h-[640px] overflow-auto border-t border-border bg-cream-50 p-4 font-mono text-[11px] leading-relaxed text-stone-700">
                {tool.source}
              </pre>
            </details>
          </section>

          <p className="flex items-center gap-1 text-[11px] text-foreground-muted">
            <FileText className="size-3" aria-hidden />
            <code className="font-mono">{tool.path}</code>
          </p>
        </>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-foreground-muted">
        {label}
      </div>
      <div
        className={`mt-0.5 flex items-center gap-1 text-[12px] text-stone-700 ${
          mono ? "font-mono" : ""
        }`}
      >
        {icon}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
