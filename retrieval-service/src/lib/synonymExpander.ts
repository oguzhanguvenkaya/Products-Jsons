/**
 * synonymExpander.ts — Domain-specific Turkish synonym expansion.
 *
 * Postgres `turkish` FTS stems words but doesn't know that
 * "cila ≡ polisaj ≡ pasta" or "demir tozu ≡ iron out" in the
 * detailing domain. The `synonyms` table fills the gap.
 *
 * Flow:
 *   1. Normalize the query.
 *   2. Iterate synonyms in length-descending order. On match, pull
 *      in aliases (or the canonical term if the user typed an alias)
 *      AND consume the matched substring from the working copy so
 *      shorter terms don't double-fire.
 *   3. Concatenate original query + deduped additions.
 *
 * Example: "cam kaplama istiyorum" matches the multi-word term
 * `cam kaplama` first, pulls its aliases (glass coating, rain
 * repellent …), and consumes "cam kaplama". The single-word alias
 * "cam" under `cam temizleyici` then has nothing to hit and stays
 * silent — no over-expansion.
 *
 * Reverse-direction matching (user types an alias, we surface the
 * canonical term) is gated by a minimum alias length of 4 chars to
 * avoid generic words like "cam" triggering the whole dictionary.
 */

import { sql } from './db.ts';
import { normalizeTurkish } from './turkishNormalize.ts';

interface SynonymEntry {
  termNormalized: string;
  aliasesNormalized: string[];
}

const MIN_ALIAS_LENGTH_FOR_REVERSE = 4;

let cachePromise: Promise<SynonymEntry[]> | null = null;

async function loadSynonyms(): Promise<SynonymEntry[]> {
  const rows = await sql<{ term: string; aliases: string[] }[]>`
    SELECT term, aliases FROM synonyms
  `;
  return rows
    .map((r) => ({
      termNormalized: normalizeTurkish(r.term),
      aliasesNormalized: (r.aliases ?? [])
        .map(normalizeTurkish)
        .filter(Boolean),
    }))
    .sort((a, b) => b.termNormalized.length - a.termNormalized.length);
}

function getSynonymsCache(): Promise<SynonymEntry[]> {
  if (!cachePromise) {
    cachePromise = loadSynonyms();
  }
  return cachePromise;
}

/** Test hook: force the next call to refetch. */
export function __resetSynonymCache(): void {
  cachePromise = null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordBoundaryRegex(phrase: string): RegExp {
  // `(?:^|\s)phrase(?=\s|$)` — works for both single and multi-word terms.
  return new RegExp(`(?:^|\\s)${escapeRegex(phrase)}(?=\\s|$)`, 'i');
}

function containsPhrase(haystack: string, phrase: string): boolean {
  if (!phrase) return false;
  return wordBoundaryRegex(phrase).test(haystack);
}

/**
 * Replace a phrase with a single space so subsequent matches can't
 * double-count the same substring. Returns a new string.
 */
function consumePhrase(haystack: string, phrase: string): string {
  return haystack.replace(wordBoundaryRegex(phrase), ' ').replace(/\s+/g, ' ').trim();
}

export interface ExpandedQuery {
  original: string;
  normalized: string;
  expanded: string;
  addedAliases: string[];
}

export async function expandQuery(input: string): Promise<ExpandedQuery> {
  const normalized = normalizeTurkish(input);
  const synonyms = await getSynonymsCache();
  const added = new Set<string>();

  // Work on a mutable copy so consumed substrings are hidden from
  // subsequent iterations. Original `normalized` stays stable for
  // the "skip if already present" check.
  let residual = normalized;

  for (const { termNormalized, aliasesNormalized } of synonyms) {
    // Forward match: user typed the canonical term → add its aliases.
    if (containsPhrase(residual, termNormalized)) {
      for (const alias of aliasesNormalized) {
        if (
          alias &&
          alias !== termNormalized &&
          !containsPhrase(normalized, alias)
        ) {
          added.add(alias);
        }
      }
      residual = consumePhrase(residual, termNormalized);
      continue;
    }

    // Reverse match: user typed an alias → surface the canonical term
    // and its siblings. Gate by MIN_ALIAS_LENGTH_FOR_REVERSE so generic
    // one-syllable words can't activate unrelated entries.
    for (const alias of aliasesNormalized) {
      if (!alias || alias.length < MIN_ALIAS_LENGTH_FOR_REVERSE) continue;
      if (!containsPhrase(residual, alias)) continue;

      if (!containsPhrase(normalized, termNormalized)) {
        added.add(termNormalized);
      }
      for (const sibling of aliasesNormalized) {
        if (
          sibling &&
          sibling !== alias &&
          !containsPhrase(normalized, sibling)
        ) {
          added.add(sibling);
        }
      }
      residual = consumePhrase(residual, alias);
      break;
    }
  }

  const addedAliases = [...added];
  const expanded = addedAliases.length
    ? `${normalized} ${addedAliases.join(' ')}`
    : normalized;

  return { original: input, normalized, expanded, addedAliases };
}
