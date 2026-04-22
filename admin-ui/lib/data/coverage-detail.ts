/**
 * Coverage detail snapshot (2026-04-22) — Phase 4.9.2 heatmap.
 *
 * Kaynak: docs/phase-4-reports/04-data-coverage-analysis-2026-04-22.md §3.
 *
 * İki katman var:
 *   - GLOBAL_KEYS: 511 ürün üzerinden top-20 specs key coverage
 *   - GROUP_DETAIL: template_group başına detaylı key coverage
 *     (şu an sadece ceramic_coating gerçek değerle dolu; diğerleri
 *     Admin API gelince /admin/coverage/:group endpoint'inden okunacak)
 */

export type GlobalKey = {
  key: string;
  coverage: number; // 0..1
  productCount: number;
  note?: string;
};

export const GLOBAL_KEYS: GlobalKey[] = [
  { key: "howToUse", coverage: 1.0, productCount: 511 },
  { key: "whenToUse", coverage: 0.998, productCount: 510 },
  { key: "whyThisProduct", coverage: 0.998, productCount: 510 },
  { key: "features", coverage: 0.33, productCount: 169 },
  { key: "sub_type", coverage: 0.32, productCount: 164, note: "template_sub_type'ta zaten var" },
  { key: "scent", coverage: 0.28, productCount: 143, note: "sadece fragrance için mantıklı" },
  { key: "made_in", coverage: 0.21, productCount: 107 },
  { key: "material", coverage: 0.19, productCount: 97 },
  { key: "color", coverage: 0.19, productCount: 97 },
  { key: "alcohol_free", coverage: 0.15, productCount: 77 },
  { key: "concentrate", coverage: 0.15, productCount: 77 },
  { key: "dimensions_mm", coverage: 0.14, productCount: 72 },
  { key: "weight_g", coverage: 0.13, productCount: 66 },
  { key: "toxic_free", coverage: 0.13, productCount: 66 },
  { key: "durability_days", coverage: 0.12, productCount: 61 },
  { key: "ph_level", coverage: 0.11, productCount: 56 },
  { key: "consumption_ml_per_car", coverage: 0.11, productCount: 56 },
  { key: "cut_level", coverage: 0.1, productCount: 51 },
  { key: "capacity_liters", coverage: 0.1, productCount: 51 },
  { key: "hardness", coverage: 0.08, productCount: 41 },
  { key: "volume_ml", coverage: 0.08, productCount: 41 },
];

export type GroupKey = {
  key: string;
  coverage: number;
  productCount: number;
  total: number;
};

export type GroupDetail = {
  group: string;
  total: number;
  keys: GroupKey[];
};

// Sadece ceramic_coating gerçek sayılarla dolu — rapor §3.b.
// Diğer gruplar için placeholder → /admin/coverage/:group (4.9.4) gelir.
export const GROUP_DETAIL: Record<string, GroupDetail> = {
  ceramic_coating: {
    group: "ceramic_coating",
    total: 23,
    keys: [
      { key: "whyThisProduct", coverage: 1.0, productCount: 23, total: 23 },
      { key: "howToUse", coverage: 1.0, productCount: 23, total: 23 },
      { key: "whenToUse", coverage: 1.0, productCount: 23, total: 23 },
      { key: "durability_months", coverage: 0.957, productCount: 22, total: 23 },
      { key: "consumption_ml_per_car", coverage: 0.783, productCount: 18, total: 23 },
      { key: "ph_tolerance", coverage: 0.652, productCount: 15, total: 23 },
      { key: "ratings", coverage: 0.652, productCount: 15, total: 23 },
      { key: "durability_km", coverage: 0.565, productCount: 13, total: 23 },
      { key: "features", coverage: 0.522, productCount: 12, total: 23 },
      { key: "contact_angle", coverage: 0.478, productCount: 11, total: 23 },
      { key: "application_surface", coverage: 0.478, productCount: 11, total: 23 },
      { key: "technology", coverage: 0.261, productCount: 6, total: 23 },
      { key: "cure_time_hours", coverage: 0.261, productCount: 6, total: 23 },
      { key: "layer_count", coverage: 0.261, productCount: 6, total: 23 },
      { key: "application_method", coverage: 0.261, productCount: 6, total: 23 },
      { key: "hardness", coverage: 0.217, productCount: 5, total: 23 },
      { key: "finish_effect", coverage: 0.174, productCount: 4, total: 23 },
      { key: "heat_resistance", coverage: 0.13, productCount: 3, total: 23 },
      { key: "recommended_temperature_c", coverage: 0.13, productCount: 3, total: 23 },
      { key: "no_water_hours", coverage: 0.13, productCount: 3, total: 23 },
      { key: "prep_required", coverage: 0.13, productCount: 3, total: 23 },
      { key: "silicone_free", coverage: 0.043, productCount: 1, total: 23 },
      { key: "filler_free", coverage: 0.043, productCount: 1, total: 23 },
    ],
  },
};

export function coverageTone(cov: number) {
  if (cov >= 0.9) return "ok";
  if (cov >= 0.6) return "warnLight";
  if (cov >= 0.3) return "warn";
  if (cov >= 0.1) return "badLight";
  return "bad";
}

export type CoverageTone = ReturnType<typeof coverageTone>;
