import { cn } from "@/lib/utils";

export type GlossaryEntry = {
  id: string;
  label: string;
  body: React.ReactNode;
  layer?: string;
  tone?: "default" | "primary" | "secondary" | "warn" | "danger";
};

const TONE: Record<NonNullable<GlossaryEntry["tone"]>, string> = {
  default: "bg-cream-200 text-stone-700",
  primary: "bg-terracotta-500 text-cream-50",
  secondary: "bg-sage-500 text-cream-50",
  warn: "bg-amber-500 text-stone-700",
  danger: "bg-clay-red-500 text-cream-50",
};

type Props = {
  entries: GlossaryEntry[];
  title?: string;
};

export function Glossary({ entries, title = "Node sözlüğü" }: Props) {
  // Group by layer for readability
  const groups: Record<string, GlossaryEntry[]> = {};
  for (const e of entries) {
    const k = e.layer ?? "—";
    (groups[k] ??= []).push(e);
  }
  const layerKeys = Object.keys(groups);

  return (
    <div className="mt-5">
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-muted">
        {title}
      </h3>
      <div className="space-y-5">
        {layerKeys.map((layer) => (
          <div key={layer}>
            {layer !== "—" && (
              <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">
                {layer}
              </div>
            )}
            <ul className="grid gap-2 md:grid-cols-2">
              {groups[layer]!.map((e) => (
                <li
                  key={e.id}
                  className="rounded-md border border-border bg-surface p-3"
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px]",
                        TONE[e.tone ?? "default"],
                      )}
                    >
                      {e.id}
                    </span>
                    <span className="font-mono text-sm text-stone-700">
                      {e.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground-muted">
                    {e.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
