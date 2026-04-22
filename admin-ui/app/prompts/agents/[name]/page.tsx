import Link from "next/link";
import { ArrowLeft, AlertTriangle, Code, Clock, ShieldCheck } from "lucide-react";
import { adminFetch, type AdminAgentDetailResponse } from "@/lib/api";

type PageProps = {
  params: Promise<{ name: string }>;
};

async function loadAgent(name: string): Promise<{
  agent: AdminAgentDetailResponse | null;
  error?: string;
}> {
  try {
    const agent = await adminFetch<AdminAgentDetailResponse>(
      `/agents/${encodeURIComponent(name)}`,
    );
    return { agent };
  } catch (err) {
    return {
      agent: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { name } = await params;
  const { agent, error } = await loadAgent(decodeURIComponent(name));

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
          Prompt Lab · Agent
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">{decodeURIComponent(name)}</h1>
      </header>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-clay-red-500/40 bg-clay-red-500/5 p-3 text-sm text-clay-red-500">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <code className="font-mono text-xs">{error}</code>
        </div>
      )}

      {agent && (
        <>
          <section
            aria-label="Meta"
            className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"
          >
            <Meta
              label="botId"
              value={agent.botId ?? "—"}
              icon={<ShieldCheck className="size-3.5 text-sage-600" />}
              mono
            />
            <Meta
              label="last modified"
              value={
                agent.lastModified
                  ? new Date(agent.lastModified).toLocaleString("tr-TR")
                  : "—"
              }
              icon={<Clock className="size-3.5 text-amber-600" />}
            />
            <Meta label="instruction" value={`${(agent.instructionBytes / 1024).toFixed(1)} KB`} mono />
            <Meta label="full source" value={`${(agent.bytes / 1024).toFixed(1)} KB`} mono />
          </section>

          <section aria-label="Instruction preview" className="mb-8">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg text-stone-700">Instruction</h2>
              <span className="text-xs text-foreground-muted">
                Read-only · edit flow 4.9.11'de
              </span>
            </div>
            <pre className="max-h-[640px] overflow-auto rounded-lg border border-border bg-cream-100 p-4 font-mono text-[12px] leading-relaxed text-stone-700 whitespace-pre-wrap">
              {agent.instruction}
            </pre>
          </section>

          <section aria-label="Full source" className="mb-8">
            <details className="rounded-lg border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-700 hover:bg-cream-100">
                <span className="inline-flex items-center gap-2">
                  <Code className="size-3.5 text-terracotta-500" aria-hidden />
                  conversations/index.ts kaynağı ({(agent.bytes / 1024).toFixed(1)} KB)
                </span>
              </summary>
              <pre className="max-h-[480px] overflow-auto border-t border-border bg-cream-50 p-4 font-mono text-[11px] leading-relaxed text-stone-700">
                {agent.source}
              </pre>
            </details>
          </section>
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
