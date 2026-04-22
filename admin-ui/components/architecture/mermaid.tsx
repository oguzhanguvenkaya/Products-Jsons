"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

type Props = {
  chart: string;
  id?: string;
  className?: string;
};

/**
 * Lazy-loads mermaid only on the client (it's ~600KB and ships its
 * own font/SVG renderer that breaks SSR).
 *
 * Picks a warm palette aligned with the catalog tokens.
 */
export function MermaidDiagram({ chart, id = "diagram", className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("mermaid");
        const mermaid = mod.default;
        const isDark =
          typeof document !== "undefined" &&
          document.documentElement.dataset.theme === "dark";

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: isDark
            ? {
                background: "#1A1712",
                primaryColor: "#C65D3F",
                primaryTextColor: "#FAF6ED",
                primaryBorderColor: "#A84D33",
                lineColor: "#8B806A",
                secondaryColor: "#7A8B56",
                tertiaryColor: "#2C2820",
                fontFamily: "var(--font-plex-sans), sans-serif",
              }
            : {
                background: "#FAF6ED",
                primaryColor: "#FAF6ED",
                primaryTextColor: "#2C2820",
                primaryBorderColor: "#C65D3F",
                lineColor: "#8B806A",
                secondaryColor: "#F4EDDB",
                tertiaryColor: "#FEFBF4",
                fontFamily: "var(--font-plex-sans), sans-serif",
              },
        });

        const { svg } = await mermaid.render(`m-${id}`, chart);
        if (mounted && ref.current) {
          ref.current.innerHTML = svg;
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-clay-red-500/40 bg-clay-red-500/5 p-3 text-sm text-clay-red-500">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <code className="font-mono text-xs break-all">{error}</code>
      </div>
    );
  }

  return (
    <div className={className}>
      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-foreground-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Diyagram yükleniyor…
        </div>
      )}
      <div ref={ref} aria-label="Mimari diyagramı" />
    </div>
  );
}
