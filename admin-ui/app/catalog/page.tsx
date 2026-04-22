import { AlertTriangle } from "lucide-react";
import { CatalogShell } from "@/components/catalog/shell";
import { TAXONOMY, type TemplateGroup } from "@/lib/data/taxonomy";
import { adminFetch, type AdminTaxonomyResponse } from "@/lib/api";

async function loadTaxonomy(): Promise<{
  taxonomy: TemplateGroup[];
  source: "live" | "snapshot";
  error?: string;
}> {
  if (process.env.NEXT_PUBLIC_CATALOG_USE_LIVE_API === "0") {
    return { taxonomy: TAXONOMY, source: "snapshot" };
  }
  try {
    const live = await adminFetch<AdminTaxonomyResponse>("/taxonomy");
    const mapped: TemplateGroup[] = live.groups.map((g) => ({
      group: g.group,
      total: g.total,
      subs: g.subs.map((s) => ({ sub: s.sub, count: s.count })),
    }));
    return { taxonomy: mapped, source: "live" };
  } catch (err) {
    return {
      taxonomy: TAXONOMY,
      source: "snapshot",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function CatalogPage() {
  const { taxonomy, source, error } = await loadTaxonomy();

  return (
    <>
      {source === "snapshot" && error && (
        <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs text-stone-700">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-hidden />
          <div>
            Admin API'ye ulaşılamadı — Phase 4 snapshot'ı gösteriliyor.
            <code className="ml-2 font-mono text-[10px] text-foreground-muted">
              {error}
            </code>
          </div>
        </div>
      )}
      <CatalogShell taxonomy={taxonomy} />
    </>
  );
}
