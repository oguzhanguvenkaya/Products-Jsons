/**
 * slotExtractor.ts — Regex + dictionary slot filling for queries.
 *
 * The hybrid retrieval pipeline uses extracted slots in two ways:
 *   1. As SQL filters (brand=?, price >= ?, price <= ?) — narrows
 *      the candidate set before BM25 and vector ranking.
 *   2. As an input to `searchCore.filtersApplied` for debug / eval.
 *
 * The query itself keeps the slot text (we don't aggressively remove
 * "1000 TL altı" from the semantic search term because the number
 * can still help ranking), but the `remaining` field is also returned
 * for callers that want a slot-stripped variant.
 *
 * Brand list mirrors searchProducts tool enum. Slot values are
 * normalized (uppercase brand, numeric prices) to match how the
 * Botpress tool input is shaped today, so Phase 4 cutover stays
 * drop-in.
 */

import { normalizeTurkish } from './turkishNormalize.ts';

// Canonical brand names as stored in Supabase.products.brand.
// Matching is done on normalized input, but we emit the canonical
// capitalization because downstream filters do `brand = ${slot}`.
const KNOWN_BRANDS: ReadonlyArray<{
  canonical: string;
  patterns: string[];
}> = [
  { canonical: 'GYEON', patterns: ['gyeon'] },
  { canonical: 'MENZERNA', patterns: ['menzerna', 'menzerne'] },
  { canonical: 'FRA-BER', patterns: ['fra-ber', 'fraber', 'fra ber'] },
  { canonical: 'INNOVACAR', patterns: ['innovacar', 'inno'] },
  { canonical: 'MG PS', patterns: ['mg ps', 'mgps'] },
  { canonical: 'MG PADS', patterns: ['mg pads', 'mgpads'] },
  { canonical: 'MX-PRO', patterns: ['mx-pro', 'mxpro', 'mx pro'] },
  { canonical: 'Q1 TAPES', patterns: ['q1 tapes', 'q1tapes'] },
  { canonical: 'SGCB', patterns: ['sgcb'] },
  { canonical: 'EPOCA', patterns: ['epoca'] },
  { canonical: 'KLIN', patterns: ['klin'] },
  { canonical: 'FLEX', patterns: ['flex'] },
  { canonical: 'LITTLE JOE', patterns: ['little joe', 'littlejoe'] },
  { canonical: 'IK SPRAYERS', patterns: ['ik sprayers', 'iksprayers', 'ik sprayer'] },
];

// Price phrases. We capture the number, then a direction keyword.
// Turkish users mix "altı" (under), "üstü" (over), "pahalı", "ucuz",
// "ve üzeri", "ye kadar" etc.
const PRICE_MAX_RE = /(\d{2,7})\s*(?:tl|₺|lira)?\s*(?:alt[ıi]|altında|ve alt[ıi]|ye kadar|a kadar|dan az|den az|-?ucuz|daha ucuz)/i;
const PRICE_MIN_RE = /(\d{2,7})\s*(?:tl|₺|lira)?\s*(?:üst[üu]|ustu|üstünde|ve üst[üu]|dan pahal[ıi]|den pahal[ıi]|pahal[ıi]|ve üzeri|ve yukar[ıi]|fazla)/i;

// Rating hint — "best / most popular / top" cues suggest sorting
// by manufacturer rating. Consumer of the slot decides how to use it.
const RATING_HINT_RE = /\b(en iyi|en güçlü|en guclu|en popüler|en populer|top\s*\d*|en dayan[ıi]kl[ıi]|en kaliteli|en çok tercih|en cok tercih)\b/i;

// ─────────────────────────────────────────────────────────────────
// Template sub_type inverse mapping (issue #3, #10)
//
// "ceramic_coating" in the DB is a broad bucket — paint / glass / tire
// / wheel / trim / leather / fabric / interior / spray / PPF all share
// template_group='ceramic_coating' and are distinguished only by
// template_sub_type. Without sub_type filtering, "GYEON 1000 TL altı
// seramik kaplama" returned AntiFog (glass_coating sub_type, 570 TL —
// the only GYEON ceramic_coating <=1000 TL in the catalog) instead of
// the paint coatings the user expected.
//
// This table maps user phrasings to canonical sub_type values. Matches
// are longest-first so "cam kaplama" beats "kaplama". The matched
// phrase is NOT stripped from `remaining` because the semantic layer
// (vector/BM25) still benefits from the context.
// ─────────────────────────────────────────────────────────────────

interface SubTypeMapping {
  canonical: string;        // e.g. 'paint_coating'
  templateGroup: string;    // e.g. 'ceramic_coating' — for co-filtering
  patterns: string[];       // normalized Turkish phrases
}

const SUB_TYPE_PATTERNS: ReadonlyArray<SubTypeMapping> = [
  // --- ceramic_coating children ---
  {
    canonical: 'paint_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'boya seramik kaplama', 'govde seramik kaplama', 'gövde seramik kaplama',
      'oto seramik kaplama', 'arac seramik kaplama', 'boya koruma kaplama',
      '9h seramik kaplama', 'nano seramik kaplama',
    ],
  },
  {
    canonical: 'glass_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'cam seramik', 'cam kaplama', 'cam su itici', 'cam su itme',
      'antifog', 'anti fog', 'bugu onleyici', 'buğu önleyici',
      'yagmur kaydirici', 'yağmur kaydırıcı', 'cam bakimi', 'cam bakımı',
    ],
  },
  {
    canonical: 'tire_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'lastik kaplama', 'lastik parlatici', 'lastik parlatıcı',
      'lastik koruyucu', 'teker kaplama', 'tire coating',
    ],
  },
  {
    canonical: 'wheel_coating',
    templateGroup: 'ceramic_coating',
    patterns: ['jant kaplama', 'jant koruyucu', 'jant seramik', 'rim coating'],
  },
  {
    canonical: 'trim_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'plastik kaplama', 'plastik koruyucu', 'trim kaplama',
      'trim restorasyon', 'plastik yenileyici',
    ],
  },
  {
    canonical: 'leather_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'deri kaplama', 'deri koruyucu', 'deri seramik',
      'koltuk kaplama deri',
    ],
  },
  {
    canonical: 'fabric_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'kumas kaplama', 'kumaş kaplama', 'koltuk kumas', 'koltuk kumaş',
      'tente kaplama', 'kumas koruyucu', 'kumaş koruyucu',
    ],
  },
  {
    canonical: 'interior_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'ic mekan kaplama', 'iç mekan kaplama', 'iç yüzey kaplama',
      'antibakteriyel kaplama',
    ],
  },
  {
    canonical: 'spray_coating',
    templateGroup: 'ceramic_coating',
    patterns: ['sprey seramik', 'sprey kaplama', 'spray coating', 'hizli seramik', 'hızlı seramik'],
  },
  // --- abrasive_polish children (issue #10) ---
  {
    canonical: 'heavy_cut_compound',
    templateGroup: 'abrasive_polish',
    patterns: [
      'kalin pasta', 'kalın pasta', 'agir cizik giderici', 'ağır çizik giderici',
      'heavy cut', 'agresif pasta', 'cizik giderici kalin',
    ],
  },
  {
    canonical: 'polish',
    templateGroup: 'abrasive_polish',
    patterns: [
      'ince pasta', 'ince cizik giderici', 'ince çizik giderici',
      'ara kesim', 'medium cut',
    ],
  },
  {
    canonical: 'finish',
    templateGroup: 'abrasive_polish',
    patterns: [
      'hare giderici', 'hare gidermek', 'bitiris cila', 'bitiriş cila',
      'finish polish', 'ucuncu adim', 'üçüncü adım',
    ],
  },
  {
    canonical: 'one_step_polish',
    templateGroup: 'abrasive_polish',
    patterns: [
      'tek adim pasta', 'tek adım pasta', 'all in one pasta',
      '3 in 1', '3in1', 'tek adim cila',
    ],
  },
  {
    canonical: 'metal_polish',
    templateGroup: 'abrasive_polish',
    patterns: ['metal parlatici', 'metal parlatıcı', 'krom parlatici', 'krom parlatıcı'],
  },
  {
    canonical: 'sanding_paste',
    templateGroup: 'abrasive_polish',
    patterns: ['zimpara pasta', 'zımpara pasta', 'matlastirici', 'matlaştırıcı'],
  },
];

// Sort by longest pattern first so "cam kaplama" matches before "kaplama"
const SUB_TYPE_PATTERNS_SORTED: typeof SUB_TYPE_PATTERNS = [...SUB_TYPE_PATTERNS]
  .sort((a, b) => {
    const aMax = Math.max(...a.patterns.map((p) => p.length));
    const bMax = Math.max(...b.patterns.map((p) => p.length));
    return bMax - aMax;
  });

// Typo-tolerant: collapse dotless-ı → dotted-i on both sides so "kalin
// pasta" (user shift-lock typo) still matches "kalın pasta".
function foldDotlessI(s: string): string {
  return s.replace(/ı/g, 'i');
}

function matchSubType(
  normalized: string,
): { canonical: string; templateGroup: string } | null {
  const folded = foldDotlessI(normalized);
  for (const m of SUB_TYPE_PATTERNS_SORTED) {
    for (const p of m.patterns) {
      const foldedP = foldDotlessI(p);
      if (normalized.includes(p) || folded.includes(foldedP)) {
        return { canonical: m.canonical, templateGroup: m.templateGroup };
      }
    }
  }
  return null;
}

export interface Slots {
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  ratingHint?: boolean;
  templateSubType?: string;
  templateGroup?: string; // only set when inferred from sub_type match
  /** Query with all matched slot phrases removed. */
  remaining: string;
}

function matchBrand(normalized: string): { canonical: string; pattern: string } | null {
  for (const { canonical, patterns } of KNOWN_BRANDS) {
    for (const p of patterns) {
      const re = new RegExp(`(?:^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|\\b)`, 'i');
      if (re.test(normalized)) return { canonical, pattern: p };
    }
  }
  return null;
}

function stripSubstring(haystack: string, needle: string): string {
  if (!needle) return haystack;
  const re = new RegExp(
    `(?:^|\\s)${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|\\b)`,
    'ig',
  );
  return haystack.replace(re, ' ').replace(/\s+/g, ' ').trim();
}

export function extractSlots(input: string): Slots {
  const normalized = normalizeTurkish(input);
  const slots: Slots = { remaining: normalized };

  // 1. Brand
  const brandMatch = matchBrand(normalized);
  if (brandMatch) {
    slots.brand = brandMatch.canonical;
    slots.remaining = stripSubstring(slots.remaining, brandMatch.pattern);
  }

  // 2. Price MAX ("1000 TL altı", "1000 ve altı", "1000'e kadar")
  const maxMatch = slots.remaining.match(PRICE_MAX_RE);
  if (maxMatch) {
    slots.priceMax = Number(maxMatch[1]);
    slots.remaining = slots.remaining.replace(maxMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  // 3. Price MIN ("1000 TL üstü", "1000'den pahalı")
  const minMatch = slots.remaining.match(PRICE_MIN_RE);
  if (minMatch) {
    slots.priceMin = Number(minMatch[1]);
    slots.remaining = slots.remaining.replace(minMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  // 4. Rating hint
  if (RATING_HINT_RE.test(slots.remaining)) {
    slots.ratingHint = true;
    slots.remaining = slots.remaining.replace(RATING_HINT_RE, ' ').replace(/\s+/g, ' ').trim();
  }

  // 5. Template sub_type (inverse lookup). Don't strip the phrase —
  // semantic ranking still benefits from the context words.
  const subTypeMatch = matchSubType(normalized);
  if (subTypeMatch) {
    slots.templateSubType = subTypeMatch.canonical;
    slots.templateGroup = subTypeMatch.templateGroup;
  }

  return slots;
}
