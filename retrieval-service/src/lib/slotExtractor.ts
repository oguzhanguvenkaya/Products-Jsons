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

export interface Slots {
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  ratingHint?: boolean;
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

  return slots;
}
