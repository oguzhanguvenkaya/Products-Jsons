import Link from "next/link";
import {
  Info,
  Sparkles,
  Ruler,
  MessageCircleQuestion,
  Share2,
  History,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { findProduct, SAMPLE_SKUS } from "@/lib/data/sample-products";
import type { SampleProduct } from "@/lib/data/sample-products";
import { ProductTabs } from "@/components/product/tabs";
import {
  InfoPanel,
  HistoryPanel,
} from "@/components/product/panels";
import { SpecEditor } from "@/components/edit/spec-editor";
import { VariantEditor } from "@/components/edit/variant-editor";
import { FaqEditor } from "@/components/edit/faq-editor";
import { RelationEditor } from "@/components/edit/relation-editor";
import { adminFetch, type AdminProductDetailResponse } from "@/lib/api";
import { liveToSampleProduct } from "@/lib/adapters/product";

type PageProps = {
  params: Promise<{ sku: string }>;
};

const fmtTL = (n: number) => `${n.toLocaleString("tr-TR")} TL`;

type Source = "live" | "sample" | "missing";

async function loadProduct(sku: string): Promise<{
  product: SampleProduct | null;
  source: Source;
  error?: string;
}> {
  const useLive = process.env.NEXT_PUBLIC_CATALOG_USE_LIVE_API !== "0";

  if (useLive) {
    try {
      const live = await adminFetch<AdminProductDetailResponse>(
        `/products/${encodeURIComponent(sku)}`,
      );
      return { product: liveToSampleProduct(live), source: "live" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const sample = findProduct(sku);
      if (sample) return { product: sample, source: "sample", error: message };
      return { product: null, source: "missing", error: message };
    }
  }

  const sample = findProduct(sku);
  if (sample) return { product: sample, source: "sample" };
  return { product: null, source: "missing" };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { sku } = await params;
  const decoded = decodeURIComponent(sku);
  const { product, source, error } = await loadProduct(decoded);

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-12">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1 text-sm text-terracotta-600 hover:text-terracotta-700"
        >
          <ArrowLeft className="size-3.5" /> Katalog ağacına dön
        </Link>
        <h1 className="mt-4 font-display text-2xl text-stone-700">
          {decoded} bulunamadı
        </h1>
        {error && (
          <div className="mt-3 rounded-md border border-clay-red-500/30 bg-clay-red-500/5 p-3 text-xs text-clay-red-500 font-mono">
            {error}
          </div>
        )}
        <p className="mt-3 text-sm text-foreground-muted">
          Örnek SKU'lar (offline fallback):{" "}
          {SAMPLE_SKUS.map((s) => (
            <Link
              key={s}
              href={`/products/${encodeURIComponent(s)}`}
              className="mx-1 rounded bg-cream-200 px-1.5 py-0.5 font-mono text-[11px] text-terracotta-600 hover:text-terracotta-700"
            >
              {s}
            </Link>
          ))}
        </p>
      </div>
    );
  }

  const iconCls = "size-3.5";
  const tabs = [
    {
      id: "info",
      label: "Info",
      icon: <Info className={iconCls} />,
      content: <InfoPanel product={product} />,
    },
    {
      id: "specs",
      label: "Specs",
      icon: <Sparkles className={iconCls} />,
      count: Object.keys(product.specs).length,
      content: <SpecEditor sku={product.sku} specs={product.specs} />,
    },
    {
      id: "sizes",
      label: "Sizes",
      icon: <Ruler className={iconCls} />,
      count: product.sizes.length,
      content: <VariantEditor sku={product.sku} sizes={product.sizes} />,
    },
    {
      id: "faq",
      label: "FAQ",
      icon: <MessageCircleQuestion className={iconCls} />,
      count: product.faqs.length,
      content: <FaqEditor sku={product.sku} faqs={product.faqs} />,
    },
    {
      id: "relations",
      label: "Relations",
      icon: <Share2 className={iconCls} />,
      count: product.relations.length,
      content: <RelationEditor sku={product.sku} relations={product.relations} />,
    },
    {
      id: "history",
      label: "History",
      icon: <History className={iconCls} />,
      count: product.history.length,
      content: <HistoryPanel events={product.history} />,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1 text-xs text-terracotta-600 hover:text-terracotta-700"
      >
        <ArrowLeft className="size-3" /> Katalog ağacı
      </Link>

      <header className="mt-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
            {product.template_group} › {product.template_sub_type}
          </div>
          <SourceBadge source={source} />
        </div>
        <h1 className="mt-1 font-display text-3xl text-stone-700">
          {product.base_name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-foreground-muted">
          <span className="inline-flex items-center gap-1">
            <span className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-[11px] text-stone-700">
              {product.sku}
            </span>
          </span>
          <span className="text-stone-600">{product.brand}</span>
          <span className="text-stone-700 font-medium">{fmtTL(product.price)}</span>
          {product.sizes.length > 1 && (
            <span className="text-sage-600 text-xs">
              {product.sizes.length} variant
            </span>
          )}
        </div>
      </header>

      {source === "sample" && error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-stone-700">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
          <div>
            <div className="font-medium">Admin API'ye ulaşılamadı — örnek veriye geçildi.</div>
            <code className="mt-1 block font-mono text-[11px] text-foreground-muted">
              {error}
            </code>
          </div>
        </div>
      )}

      <ProductTabs tabs={tabs} />
    </div>
  );
}

function SourceBadge({ source }: { source: Source }) {
  if (source === "live")
    return (
      <span className="inline-flex items-center gap-1 rounded bg-sage-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sage-600">
        <span className="size-1.5 rounded-full bg-sage-500" />
        live API
      </span>
    );
  if (source === "sample")
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600">
        <span className="size-1.5 rounded-full bg-amber-500" />
        offline sample
      </span>
    );
  return null;
}
