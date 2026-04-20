/**
 * cache.ts — In-memory LRU caches.
 *
 * embedCache: query text -> 768-dim vector. Gemini embedding cost is the
 *   dominant latency (~150-300ms warm, ~800ms+ cold), so every repeated
 *   query should reuse its vector for 24h.
 *
 * queryCache: full request hash -> SearchResult JSON. Short TTL (5 min)
 *   so that hot queries avoid a round trip to Postgres within a user
 *   session, without serving stale pricing beyond the session.
 *
 * Scale assumption: 100-500 queries/day. A 1000-entry embedCache
 * (~3 KB/entry, ~3 MB total) and 500-entry queryCache easily fit in
 * the 256 MB Fly machine. No external Redis needed.
 */

import { LRUCache } from 'lru-cache';
import crypto from 'node:crypto';

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;

export const embedCache = new LRUCache<string, number[]>({
  max: 1000,
  ttl: DAY_MS,
  // Cached vectors don't change based on access, so no updateAgeOnGet.
});

// LRUCache requires V extends NonNullable<unknown>; endpoint results
// are always objects, so constrain to Record<string, unknown>.
export const queryCache = new LRUCache<string, Record<string, unknown>>({
  max: 500,
  ttl: FIVE_MIN_MS,
});

// ─────────────────────────────────────────────────────────────────
// Key helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Canonical JSON: keys sorted recursively so {a:1,b:2} and {b:2,a:1}
 * map to the same cache key. Arrays keep their order; null/undefined
 * distinction preserved.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${parts.join(',')}}`;
}

/**
 * Deterministic SHA-1 hash of any JSON-serializable value. Returns
 * hex digest — fine for non-cryptographic cache keys. 40 chars.
 */
export function hashKey(value: unknown): string {
  return crypto.createHash('sha1').update(canonicalJson(value)).digest('hex');
}

// ─────────────────────────────────────────────────────────────────
// Embed helper — memoized Gemini embedding
// ─────────────────────────────────────────────────────────────────

/**
 * Wraps any embedding function with the shared `embedCache`.
 * Returns vector either from cache (1-3ms) or via the supplied
 * fetcher (~150-800ms).
 */
export async function cachedEmbed(
  queryText: string,
  fetcher: (text: string) => Promise<number[]>,
): Promise<{ vector: number[]; cached: boolean }> {
  const key = `embed:${hashKey(queryText)}`;
  const hit = embedCache.get(key);
  if (hit) {
    return { vector: hit, cached: true };
  }
  const vector = await fetcher(queryText);
  embedCache.set(key, vector);
  return { vector, cached: false };
}

// ─────────────────────────────────────────────────────────────────
// Metrics
// ─────────────────────────────────────────────────────────────────

export function cacheStats() {
  return {
    embed: {
      size: embedCache.size,
      max: embedCache.max,
    },
    query: {
      size: queryCache.size,
      max: queryCache.max,
    },
  };
}
