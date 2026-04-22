import Link from "next/link";
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ArrowRight,
  Wrench,
  Code,
} from "lucide-react";
import {
  adminFetch,
  type AdminAgentsResponse,
  type AdminToolsResponse,
} from "@/lib/api";

async function load() {
  try {
    const [agents, tools] = await Promise.all([
      adminFetch<AdminAgentsResponse>("/agents"),
      adminFetch<AdminToolsResponse>("/tools"),
    ]);
    return { agents: agents.agents, tools: tools.tools, error: null };
  } catch (err) {
    return {
      agents: [],
      tools: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function PromptLabLanding() {
  const { agents, tools, error } = await load();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <div className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
          Phase 4.9.9 · Prompt Lab
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">
          Bot instruction atölyesi
        </h1>
        <p className="mt-2 max-w-2xl text-foreground-muted">
          detailagent ve detailagent-ms'in conversation prompt'larını + 7 tool
          description + zod input/output şemasını tek yerden incele. Bu sürüm
          read-only; inline düzenleme + staging 4.9.11'de etkinleşir.
        </p>
      </header>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-stone-700">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
          <div>
            Admin API'ye ulaşılamadı.
            <code className="mt-1 block font-mono text-[11px] text-foreground-muted">
              {error}
            </code>
          </div>
        </div>
      )}

      <section aria-label="Agent'lar" className="mb-10 space-y-3">
        <h2 className="text-lg text-stone-600">Bot yapılandırmaları</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => (
            <Link
              key={a.name}
              href={`/prompts/agents/${encodeURIComponent(a.name)}`}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-terracotta-500/50"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex size-10 shrink-0 items-center justify-center rounded-md ${
                    a.name.endsWith("-ms")
                      ? "bg-terracotta-500/10 text-terracotta-600"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  <Sparkles className="size-5" aria-hidden />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-display text-lg text-stone-700">
                      {a.name}
                    </h3>
                    {a.deployed && (
                      <span className="inline-flex items-center gap-1 rounded bg-sage-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sage-600">
                        <ShieldCheck className="size-2.5" aria-hidden />
                        deployed
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {a.description}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-[11px]">
                <Stat
                  label="instruction"
                  value={`${(a.instructionBytes / 1024).toFixed(1)} KB`}
                />
                <Stat
                  label="last modified"
                  value={
                    a.lastModified
                      ? new Date(a.lastModified).toLocaleDateString("tr-TR")
                      : "—"
                  }
                  icon={<Clock className="size-3" aria-hidden />}
                />
                <Stat
                  label="bot id"
                  value={a.botId ? a.botId.slice(0, 8) + "…" : "—"}
                  mono
                />
              </dl>
              <span className="inline-flex items-center gap-1 text-xs text-terracotta-600 group-hover:text-terracotta-700">
                Instruction'ı aç
                <ArrowRight className="size-3" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Tool registry">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg text-stone-600">Tool registry</h2>
          <span className="text-xs text-foreground-muted">
            {tools.length} tool · detailagent-ms
          </span>
        </div>

        {tools.length === 0 && !error && (
          <p className="text-sm text-foreground-muted">Tool bulunamadı.</p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {tools.map((t) => (
            <Link
              key={t.name}
              href={`/prompts/tools/${encodeURIComponent(t.name)}`}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-terracotta-500/50"
            >
              <div className="flex items-start gap-2">
                <Wrench
                  className="mt-0.5 size-4 shrink-0 text-terracotta-500"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <code className="font-mono text-sm font-medium text-stone-700">
                      {t.name}
                    </code>
                    <span className="font-mono text-[10px] text-foreground-muted">
                      {(t.bytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground-muted leading-relaxed line-clamp-3">
                    {t.description ?? "(description ayrıştırılamadı)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-foreground-muted">
                {t.hasInputSchema && (
                  <span className="rounded bg-sage-500/10 px-1.5 py-0.5 font-mono text-sage-600">
                    z.input
                  </span>
                )}
                {t.hasOutputSchema && (
                  <span className="rounded bg-terracotta-500/10 px-1.5 py-0.5 font-mono text-terracotta-600">
                    z.output
                  </span>
                )}
                {t.jsdoc && (
                  <span className="rounded bg-cream-200 px-1.5 py-0.5 font-mono">
                    jsdoc
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-terracotta-600 group-hover:text-terracotta-700">
                  Detay <ArrowRight className="size-3" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-4 flex items-center gap-1 text-[11px] text-foreground-muted">
          <Code className="size-3" aria-hidden />
          Source dosyaları{" "}
          <code className="font-mono">
            Botpress/detailagent-ms/src/tools/*.ts
          </code>{" "}
          adresinden okunuyor.
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded bg-cream-100 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-foreground-muted">
        {label}
      </div>
      <div
        className={`mt-0.5 flex items-center gap-1 text-[11px] text-stone-700 ${
          mono ? "font-mono" : ""
        }`}
      >
        {icon}
        {value}
      </div>
    </div>
  );
}
