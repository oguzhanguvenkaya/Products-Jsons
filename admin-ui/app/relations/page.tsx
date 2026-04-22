import { AlertTriangle } from "lucide-react";
import { adminFetch } from "@/lib/api";
import { RelationsManager } from "@/components/relations/manager";

type RelListResponse = {
  total: number;
  limit: number;
  offset: number;
  typeCounts: Record<string, number>;
  items: Array<{
    sourceSku: string;
    sourceName: string | null;
    sourceBrand: string | null;
    targetSku: string;
    targetName: string | null;
    targetBrand: string | null;
    relationType: string;
    confidence: number | null;
  }>;
};

async function loadInitial(): Promise<{
  data: RelListResponse;
  error?: string;
}> {
  try {
    const data = await adminFetch<RelListResponse>("/relations", {
      searchParams: { limit: 100 },
    });
    return { data };
  } catch (err) {
    return {
      data: {
        total: 0,
        limit: 100,
        offset: 0,
        typeCounts: {},
        items: [],
      },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function RelationsPage() {
  const { data, error } = await loadInitial();

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          Phase 4.9.12 · Relations
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">
          Ürün ilişkileri
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {data.total.toLocaleString("tr-TR")} ilişki · 5 granular tip +
          4 legacy tip. Silme ve yeni ilişki ekleme staging'e düşer.
        </p>
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-clay-red-500/40 bg-clay-red-500/5 p-3 text-sm text-clay-red-500">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <code className="font-mono text-xs break-all">{error}</code>
        </div>
      )}

      <RelationsManager initial={data} />
    </div>
  );
}
