import Link from "next/link";
import {
  Info,
  Sparkles,
  Ruler,
  MessageCircleQuestion,
  Share2,
  History,
  ArrowLeft,
} from "lucide-react";
import { findProduct, SAMPLE_SKUS } from "@/lib/data/sample-products";
import { ProductTabs } from "@/components/product/tabs";
import {
  InfoPanel,
  SpecsPanel,
  SizesPanel,
  FaqPanel,
  RelationsPanel,
  HistoryPanel,
} from "@/components/product/panels";

type PageProps = {
  params: Promise<{ sku: string }>;
};

const fmtTL = (n: number) => `${n.toLocaleString("tr-TR")} TL`;

export default async function ProductDetailPage({ params }: PageProps) {
  const { sku } = await params;
  const decoded = decodeURIComponent(sku);
  const product = findProduct(decoded);

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
        <p className="mt-2 text-sm text-foreground-muted">
          Read-only önizleme yalnızca şu örnek SKU'ları içerir:{" "}
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
        <p className="mt-3 text-sm text-foreground-muted">
          Gerçek katalog okuması Phase 4.9.4 Admin API'si ile bağlanacak
          (<code className="font-mono text-xs">GET /admin/products/:sku</code>).
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
      content: <SpecsPanel product={product} />,
    },
    {
      id: "sizes",
      label: "Sizes",
      icon: <Ruler className={iconCls} />,
      count: product.sizes.length,
      content: <SizesPanel sizes={product.sizes} />,
    },
    {
      id: "faq",
      label: "FAQ",
      icon: <MessageCircleQuestion className={iconCls} />,
      count: product.faqs.length,
      content: <FaqPanel faqs={product.faqs} />,
    },
    {
      id: "relations",
      label: "Relations",
      icon: <Share2 className={iconCls} />,
      count: product.relations.length,
      content: <RelationsPanel relations={product.relations} />,
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
        <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          {product.template_group} › {product.template_sub_type}
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

      <ProductTabs tabs={tabs} />

      <div className="mt-6 rounded-md border border-dashed border-border bg-cream-100 px-4 py-3 text-xs text-foreground-muted">
        <strong className="font-medium text-stone-700">Öncelikle hızlı erişim:</strong>{" "}
        {SAMPLE_SKUS.filter((s) => s !== product.sku).map((s) => (
          <Link
            key={s}
            href={`/products/${encodeURIComponent(s)}`}
            className="mx-1 font-mono text-terracotta-600 hover:text-terracotta-700"
          >
            {s}
          </Link>
        ))}
      </div>
    </div>
  );
}
