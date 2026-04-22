import type { AdminProductDetailResponse } from "@/lib/api";
import type {
  SampleProduct,
  Variant,
  Faq,
  Relation,
  HistoryEvent,
} from "@/lib/data/sample-products";

/**
 * Normalize the live /admin/products/:sku response into the existing
 * SampleProduct shape so the server panels can render it without
 * rewriting their type signatures. Admin-API confidence numeric → Faq
 * confidence qualitative bucket. Relations skip `note` (schema has no
 * such column) and drop confidence into the note slot if set.
 */
export function liveToSampleProduct(
  payload: AdminProductDetailResponse,
): SampleProduct {
  const p = payload.product;

  const sizes: Variant[] = Array.isArray(p.sizes)
    ? p.sizes
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => ({
          sku: String(s.sku ?? ""),
          size_label: String(s.size_label ?? s.size ?? ""),
          price:
            typeof s.price === "number"
              ? s.price
              : Number(s.price ?? 0),
          is_primary: Boolean(s.is_primary ?? false),
        }))
    : [];

  const faqs: Faq[] = payload.faqs.map((f) => ({
    id: String(f.id),
    question: f.question,
    answer: f.answer,
    scope: (f.scope ?? "product") as Faq["scope"],
    // Admin API does not carry qualitative confidence yet; default "medium"
    confidence: "medium",
  }));

  const relations: Relation[] = payload.relations.map((r) => ({
    target_sku: r.targetSku,
    target_name: r.targetName ?? r.targetSku,
    relation_type: normalizeRelationType(r.relationType),
    note:
      r.confidence !== null && r.confidence !== undefined
        ? `conf: ${r.confidence.toFixed(2)}`
        : undefined,
  }));

  const history: HistoryEvent[] = payload.history.length > 0
    ? payload.history
    : (p.updatedAt
        ? [
            {
              when: p.updatedAt,
              who: "seed-v2",
              action: "products.updated_at",
            },
          ]
        : []);

  return {
    sku: p.sku,
    name: p.name,
    base_name: p.baseName,
    brand: p.brand ?? "(no brand)",
    price: p.price ?? 0,
    image_url: p.imageUrl,
    url: p.url ?? "#",
    template_group: p.templateGroup ?? "(null)",
    template_sub_type: p.templateSubType ?? "(null)",
    target_surface: Array.isArray(p.targetSurface)
      ? p.targetSurface.join(", ")
      : null,
    full_description: p.fullDescription ?? "",
    video_url: p.videoUrl,
    specs: p.specs ?? {},
    sizes,
    faqs,
    relations,
    history,
  };
}

function normalizeRelationType(t: string): Relation["relation_type"] {
  if (
    t === "use_with" ||
    t === "use_before" ||
    t === "use_after" ||
    t === "accessories" ||
    t === "alternatives"
  ) {
    return t;
  }
  // Legacy migration 002 values → map onto the granular set
  if (t === "variant") return "alternatives";
  if (t === "complement") return "use_with";
  if (t === "alternative") return "alternatives";
  return "use_with";
}
