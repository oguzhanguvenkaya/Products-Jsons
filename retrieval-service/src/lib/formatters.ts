/**
 * formatters.ts — DB row to bot-facing response transformers.
 *
 * Botpress runtime rejects Carousel actions where `value` is empty,
 * so all URL handling funnels through `hasRenderableUrl`. URL-less
 * products fall through to `textFallbackLines`.
 *
 * Price formatting matches the bot: "tr-TR" locale, no currency
 * symbol on the number, bullet between brand and price in subtitles.
 */

import type {
  CarouselItem,
  LiteProductSummary,
  ProductRow,
  ProductSummary,
  SizeVariant,
  TextFallbackLine,
} from '../types.ts';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

export function hasRenderableUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export function formatPriceTL(price: number): string {
  return price.toLocaleString('tr-TR');
}

export function asNumber(
  v: string | number | null | undefined,
): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'string' ? Number(v) : v;
}

export function asNumberOrNull(
  v: string | number | null | undefined,
): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function baseNameFromRow(row: ProductRow): string {
  // Prefer products.base_name (migration 007) — CSV-seeded size-stripped
  // version. Fallback to row.name if base_name is null (older rows until
  // the next seed run). Using row.name alone produces carousel titles
  // like "MENZERNA 3800 Super Hare Giderici Cila - 1 lt — 250 ml"
  // (double size) because row.name already carries the largest variant
  // size; sizeLabel then appends another suffix.
  return (row.base_name && row.base_name.trim()) || row.name;
}

// ─────────────────────────────────────────────────────────────────
// Variant price filter (issue #9 — post-SELECT per-variant bounds)
// ─────────────────────────────────────────────────────────────────

export interface VariantFilter {
  minPrice?: number | null;
  maxPrice?: number | null;
}

function withinPriceRange(price: number, filter?: VariantFilter): boolean {
  if (!filter) return true;
  if (filter.minPrice != null && price < filter.minPrice) return false;
  if (filter.maxPrice != null && price > filter.maxPrice) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────
// Carousel / text fallback
// ─────────────────────────────────────────────────────────────────

/**
 * Builds one Carousel card for a primary product row.
 * Uses the root price/url/image_url (NOT per-variant).
 */
export function toCarouselItem(row: ProductRow): CarouselItem | null {
  if (!hasRenderableUrl(row.url)) return null;
  const price = asNumber(row.price);
  const brand = row.brand ?? '';
  return {
    title: row.name,
    subtitle: `${brand} • ${formatPriceTL(price)} TL`,
    imageUrl: row.image_url ?? undefined,
    actions: [
      {
        action: 'url',
        label: 'Ürün Sayfasına Git',
        value: row.url!.trim(),
      },
    ],
  };
}

/**
 * Builds one Carousel card per size variant (v8.5 pattern).
 * If sizes is empty, falls back to a single card from the product row.
 *
 * Optional `variantFilter` applies post-SELECT price bounds per-variant
 * so that e.g. a 1500-2500 TL query does not leak a 600 TL 250ml variant
 * of a 1700 TL primary.
 */
export function toCarouselItemsWithVariants(
  row: ProductRow,
  variantFilter?: VariantFilter,
): CarouselItem[] {
  const brand = row.brand ?? '';
  const baseName = baseNameFromRow(row);
  const sizes = row.sizes ?? [];

  if (sizes.length === 0) {
    const price = asNumber(row.price);
    if (!withinPriceRange(price, variantFilter)) return [];
    const single = toCarouselItem(row);
    return single ? [single] : [];
  }

  const items: CarouselItem[] = [];
  for (const s of sizes) {
    if (!hasRenderableUrl(s.url)) continue;
    if (!withinPriceRange(s.price, variantFilter)) continue;
    const sizeLabel = s.size_display ? ` — ${s.size_display}` : '';
    const title = sizes.length > 1 ? `${baseName}${sizeLabel}` : baseName;
    items.push({
      title,
      subtitle: `${brand} • ${formatPriceTL(s.price)} TL`,
      imageUrl: s.image_url || undefined,
      actions: [
        {
          action: 'url',
          label: 'Ürün Sayfasına Git',
          value: s.url.trim(),
        },
      ],
    });
  }
  return items;
}

export function toTextFallbackLine(row: ProductRow): TextFallbackLine {
  return {
    productName: row.name,
    brand: row.brand ?? '',
    price: asNumber(row.price),
    sku: row.sku,
  };
}

export function toTextFallbackLinesFromVariants(
  row: ProductRow,
  variantFilter?: VariantFilter,
): TextFallbackLine[] {
  const brand = row.brand ?? '';
  const baseName = baseNameFromRow(row);
  const sizes = row.sizes ?? [];

  if (sizes.length === 0) {
    if (!withinPriceRange(asNumber(row.price), variantFilter)) return [];
    return hasRenderableUrl(row.url) ? [] : [toTextFallbackLine(row)];
  }

  const out: TextFallbackLine[] = [];
  for (const s of sizes) {
    if (hasRenderableUrl(s.url)) continue;
    if (!withinPriceRange(s.price, variantFilter)) continue;
    const sizeLabel = s.size_display ? ` — ${s.size_display}` : '';
    const title = sizes.length > 1 ? `${baseName}${sizeLabel}` : baseName;
    out.push({
      productName: title,
      brand,
      price: s.price,
      sku: s.sku,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// Summaries
// ─────────────────────────────────────────────────────────────────

export function toProductSummary(
  row: ProductRow & { search_text?: string | null; similarity?: number | null },
): ProductSummary {
  const snippet = (row.search_text ?? row.short_description ?? '').slice(0, 200);
  return {
    sku: row.sku,
    name: baseNameFromRow(row),
    brand: row.brand ?? '',
    price: asNumber(row.price),
    templateGroup: row.template_group ?? '',
    snippet,
    similarity: asNumberOrNull(row.similarity),
    variant_skus:
      row.variant_skus && row.variant_skus.length > 0
        ? row.variant_skus.join('|')
        : undefined,
    sizes: row.sizes ?? [],
  };
}

export function toLiteProductSummary(row: ProductRow): LiteProductSummary {
  return {
    sku: row.sku,
    name: baseNameFromRow(row),
    brand: row.brand ?? '',
    price: asNumber(row.price),
    templateGroup: row.template_group ?? '',
  };
}

// ─────────────────────────────────────────────────────────────────
// ProductDetails — specs unpacking
// ─────────────────────────────────────────────────────────────────

/**
 * Phase 1 seed pipeline embeds `howToUse`, `whenToUse`, `whyThisProduct`
 * inside `products.specs` JSONB (alongside the raw spec keys and the
 * manufacturer `ratings` object). Unpack those three fields and
 * expose the remainder as `technicalSpecs`.
 */
export function unpackProductContent(
  specs: Record<string, unknown> | null,
): {
  technicalSpecs: Record<string, unknown>;
  howToUse: string | null;
  whenToUse: string | null;
  whyThisProduct: string | null;
} {
  if (!specs) {
    return {
      technicalSpecs: {},
      howToUse: null,
      whenToUse: null,
      whyThisProduct: null,
    };
  }
  const { howToUse, whenToUse, whyThisProduct, ...rest } = specs as {
    howToUse?: unknown;
    whenToUse?: unknown;
    whyThisProduct?: unknown;
    [k: string]: unknown;
  };
  return {
    technicalSpecs: rest,
    howToUse: typeof howToUse === 'string' ? howToUse : null,
    whenToUse: typeof whenToUse === 'string' ? whenToUse : null,
    whyThisProduct:
      typeof whyThisProduct === 'string' ? whyThisProduct : null,
  };
}

/**
 * target_surface is stored as TEXT[] in Postgres; the bot tool
 * exposes it as a comma-joined string.
 */
export function targetSurfaceToString(
  arr: string[] | null | undefined,
): string | null {
  if (!arr || arr.length === 0) return null;
  return arr.join(', ');
}

export function variantsFromRow(row: ProductRow): SizeVariant[] {
  return row.sizes ?? [];
}

// ─────────────────────────────────────────────────────────────────
// Video card — YouTube Carousel item for getApplicationGuide
// ─────────────────────────────────────────────────────────────────

export function formatVideoCard(
  videoUrl: string | null | undefined,
  productName: string,
): CarouselItem | null {
  if (!videoUrl) return null;
  const trimmed = videoUrl.trim();
  if (!trimmed) return null;

  const byeMatch = trimmed.match(/youtu\.be\/([^?&/]+)/);
  const wwwMatch = trimmed.match(/[?&]v=([^&]+)/);
  const videoId = byeMatch?.[1] ?? wwwMatch?.[1] ?? null;
  if (!videoId) return null;

  return {
    title: `${productName} — Uygulama Videosu`,
    subtitle: 'Üretici resmi rehberi',
    imageUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    actions: [
      {
        action: 'url' as const,
        label: '▶ Videoyu İzle',
        value: trimmed,
      },
    ],
  };
}
