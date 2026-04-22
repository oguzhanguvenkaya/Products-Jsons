/**
 * Katalog coverage anlık görüntüsü (2026-04-22).
 *
 * Kaynak: docs/phase-4-reports/04-data-coverage-analysis-2026-04-22.md
 * Admin API (Phase 4.9.4) geldiğinde bu modülün içeriği
 * `/admin/coverage` endpoint'inden fetch edilecek — imza aynı kalır.
 */

export const SNAPSHOT_DATE = "2026-04-22";

export type CatalogStats = {
  totalProducts: number;
  brands: number;
  templateGroups: number;
  subTypes: number;
  faqs: number;
  relations: number;
  synonyms: number;
  productsWithVariants: number;
  productsWithVideo: number;
};

export const CATALOG_STATS: CatalogStats = {
  totalProducts: 511,
  brands: 13,
  templateGroups: 26,
  subTypes: 156,
  faqs: 3156,
  relations: 1301,
  synonyms: 38,
  productsWithVariants: 94,
  productsWithVideo: 78,
};

export type TopGroup = {
  group: string;
  products: number;
  subTypes: number;
  ratio: number;
  tone: "good" | "mid" | "bad";
  note: string;
};

// Phase 4 rapor §2 — fragmentation tablosu
export const TOP_GROUPS: TopGroup[] = [
  {
    group: "ceramic_coating",
    products: 23,
    subTypes: 15,
    ratio: 1.53,
    tone: "bad",
    note: "En kötü fragmentation — paint/glass/tire karışıyor",
  },
  {
    group: "interior_cleaner",
    products: 25,
    subTypes: 16,
    ratio: 1.56,
    tone: "bad",
    note: "16 farklı sub_type",
  },
  {
    group: "spare_part",
    products: 28,
    subTypes: 13,
    ratio: 2.15,
    tone: "mid",
    note: "Yedek parça çeşitliliği beklenebilir",
  },
  {
    group: "abrasive_polish",
    products: 24,
    subTypes: 6,
    ratio: 4.0,
    tone: "good",
    note: "Menzerna ağırlıklı, iyi gruplanmış",
  },
  {
    group: "polishing_pad",
    products: 33,
    subTypes: 4,
    ratio: 8.25,
    tone: "good",
    note: "En homojen grup",
  },
  {
    group: "fragrance",
    products: 93,
    subTypes: 7,
    ratio: 13.29,
    tone: "good",
    note: "LITTLE JOE hakim",
  },
];

export type HeatmapCell = {
  coverage: number; // 0-1
};

export type HeatmapRow = {
  group: string;
  total: number;
  cells: Record<string, HeatmapCell>;
};

// Phase 4 rapor §3 — ceramic_coating detayı + top 5 grup × 6 kritik key
// Gerçek değerler inspect-data-coverage.ts çıktısından.
export const HEATMAP_KEYS = [
  "howToUse",
  "durability",
  "hardness",
  "silicone_free",
  "ph_level",
  "ratings",
] as const;

export const HEATMAP_ROWS: HeatmapRow[] = [
  {
    group: "ceramic_coating",
    total: 23,
    cells: {
      howToUse: { coverage: 1.0 },
      durability: { coverage: 0.957 },
      hardness: { coverage: 0.217 },
      silicone_free: { coverage: 0.043 },
      ph_level: { coverage: 0.043 },
      ratings: { coverage: 0.652 },
    },
  },
  {
    group: "abrasive_polish",
    total: 24,
    cells: {
      howToUse: { coverage: 1.0 },
      durability: { coverage: 0.0 },
      hardness: { coverage: 0.0 },
      silicone_free: { coverage: 0.125 },
      ph_level: { coverage: 0.0 },
      ratings: { coverage: 0.0 },
    },
  },
  {
    group: "car_shampoo",
    total: 30,
    cells: {
      howToUse: { coverage: 1.0 },
      durability: { coverage: 0.0 },
      hardness: { coverage: 0.0 },
      silicone_free: { coverage: 0.133 },
      ph_level: { coverage: 0.667 },
      ratings: { coverage: 0.0 },
    },
  },
  {
    group: "polishing_pad",
    total: 33,
    cells: {
      howToUse: { coverage: 1.0 },
      durability: { coverage: 0.0 },
      hardness: { coverage: 0.0 },
      silicone_free: { coverage: 0.0 },
      ph_level: { coverage: 0.0 },
      ratings: { coverage: 0.0 },
    },
  },
  {
    group: "paint_protection_quick",
    total: 22,
    cells: {
      howToUse: { coverage: 1.0 },
      durability: { coverage: 0.364 },
      hardness: { coverage: 0.0 },
      silicone_free: { coverage: 0.091 },
      ph_level: { coverage: 0.0 },
      ratings: { coverage: 0.0 },
    },
  },
  {
    group: "interior_cleaner",
    total: 25,
    cells: {
      howToUse: { coverage: 1.0 },
      durability: { coverage: 0.0 },
      hardness: { coverage: 0.0 },
      silicone_free: { coverage: 0.16 },
      ph_level: { coverage: 0.4 },
      ratings: { coverage: 0.0 },
    },
  },
];

// Phase 4 rapor §10 — null hotspot'lar (Action required)
export type NullHotspot = {
  key: string;
  scope: string;
  coverage: number;
  severity: "high" | "medium";
  impact: string;
};

export const NULL_HOTSPOTS: NullHotspot[] = [
  {
    key: "silicone_free",
    scope: "ceramic_coating (23)",
    coverage: 0.043,
    severity: "high",
    impact: "Silikon sorusuna tek ürün cevap verebilir",
  },
  {
    key: "hardness",
    scope: "ceramic_coating (23)",
    coverage: 0.217,
    severity: "high",
    impact: "9H sertlik iddiası ürün isminde — specs'de %22",
  },
  {
    key: "filler_free",
    scope: "ceramic_coating (23)",
    coverage: 0.043,
    severity: "medium",
    impact: "Filler-free filtre çalışmaz",
  },
  {
    key: "no_faq",
    scope: "~60 ürün",
    coverage: 0.0,
    severity: "medium",
    impact: "FAQ-yoksul ürünler bot'a güvenemez",
  },
];

export type SpecsKeyDupe = {
  key: string;
  aliases: string[];
  note: string;
};

export const SPECS_KEY_DUPES: SpecsKeyDupe[] = [
  {
    key: "ph_level",
    aliases: ["ph", "ph_level", "ph_tolerance"],
    note: "ceramic_coating'de 3 farklı key aynı anlamda",
  },
  {
    key: "durability",
    aliases: [
      "durability_months",
      "durability_days",
      "durability_km",
      "durability_weeks",
      "durability_washes",
      "durability_months_single",
      "durability_months_with_maintenance",
    ],
    note: "9 farklı alan — standart yok",
  },
];

export type DataTypeMismatch = {
  key: string;
  types: string[];
  impact: string;
};

export const DATA_TYPE_MISMATCHES: DataTypeMismatch[] = [
  {
    key: "ph_level",
    types: ["string", "number"],
    impact: "::numeric cast'te NULL kayıpları",
  },
  {
    key: "durability_months",
    types: ["string", "number"],
    impact: "Sıralamada bazı satırlar atlanır",
  },
  {
    key: "cut_level",
    types: ["string ('3/5')", "number (3)"],
    impact: "'3/5' formatı numeric ile çatışır",
  },
];
