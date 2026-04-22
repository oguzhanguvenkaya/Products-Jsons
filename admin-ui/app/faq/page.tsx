import { AlertTriangle } from "lucide-react";
import { adminFetch } from "@/lib/api";
import { FaqManager } from "@/components/faq/manager";

type FaqListResponse = {
  total: number;
  limit: number;
  offset: number;
  scopeCounts: Record<string, number>;
  items: Array<{
    id: number | string;
    sku: string | null;
    scope: string;
    brand: string | null;
    category: string | null;
    question: string;
    answer: string;
    createdAt: string | null;
    productName: string | null;
  }>;
};

async function loadInitialFaqs(): Promise<{
  data: FaqListResponse;
  error?: string;
}> {
  try {
    const data = await adminFetch<FaqListResponse>("/faqs", {
      searchParams: { limit: 50 },
    });
    return { data };
  } catch (err) {
    return {
      data: {
        total: 0,
        limit: 50,
        offset: 0,
        scopeCounts: {},
        items: [],
      },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function FaqPage() {
  const { data, error } = await loadInitialFaqs();

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          Phase 4.9.12 · FAQ Manager
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">
          FAQ veritabanı
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {data.total.toLocaleString("tr-TR")} kayıt · 3 scope (product / brand /
          category) · arama, filter, inline edit. Düzenlemeler staging'e düşer.
        </p>
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-clay-red-500/40 bg-clay-red-500/5 p-3 text-sm text-clay-red-500">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <code className="font-mono text-xs break-all">{error}</code>
        </div>
      )}

      <FaqManager initial={data} />
    </div>
  );
}
