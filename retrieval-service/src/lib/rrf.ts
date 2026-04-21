/**
 * rrf.ts — Reciprocal Rank Fusion.
 *
 * Given K ranked lists of candidates (e.g. BM25 results and vector
 * results), assign each SKU a fused score:
 *
 *   score(sku) = Σ_i  1 / (k + rank_i(sku))
 *
 * where `rank_i(sku)` is the 1-based position of `sku` in list i
 * (listed as +Infinity if absent, contributing zero). The hyper-
 * parameter `k` dampens the head of each list; the TREC default is
 * 60 and is a robust starting point across domains.
 *
 * Reference: Cormack, Clarke & Buettcher, "Reciprocal Rank Fusion
 * Outperforms Condorcet and Individual Rank Learning Methods", 2009.
 */

export interface Ranked {
  /** SKU is the stable identifier we fuse on. */
  sku: string;
}

export interface RrfOptions {
  /** TREC default is 60. Lower k -> head dominates more. */
  k?: number;
}

export interface FusedHit {
  sku: string;
  rrf_score: number;
  /** rank_i (1-based) in each input list; Infinity if absent. */
  ranks: number[];
}

export function reciprocalRankFusion(
  lists: ReadonlyArray<ReadonlyArray<Ranked>>,
  opts: RrfOptions = {},
): FusedHit[] {
  const k = opts.k ?? 60;
  const listCount = lists.length;

  // sku -> { score, ranks[listCount] }
  const merged = new Map<string, { score: number; ranks: number[] }>();

  for (let i = 0; i < listCount; i++) {
    const list = lists[i]!;
    for (let j = 0; j < list.length; j++) {
      const rank = j + 1; // 1-based
      const sku = list[j]!.sku;
      const contribution = 1 / (k + rank);
      let entry = merged.get(sku);
      if (!entry) {
        entry = {
          score: 0,
          ranks: new Array(listCount).fill(Number.POSITIVE_INFINITY),
        };
        merged.set(sku, entry);
      }
      entry.score += contribution;
      // Keep the best (lowest) rank per list in case of duplicates.
      if (rank < entry.ranks[i]!) {
        entry.ranks[i] = rank;
      }
    }
  }

  return [...merged.entries()]
    .map(([sku, { score, ranks }]) => ({
      sku,
      rrf_score: score,
      ranks,
    }))
    .sort((a, b) => {
      if (b.rrf_score !== a.rrf_score) return b.rrf_score - a.rrf_score;
      // Tie-break: fewer Infinity ranks (appeared in more lists) wins.
      const aHits = a.ranks.filter((r) => Number.isFinite(r)).length;
      const bHits = b.ranks.filter((r) => Number.isFinite(r)).length;
      if (aHits !== bHits) return bHits - aHits;
      // Final tie-break: SKU for determinism.
      return a.sku.localeCompare(b.sku);
    });
}
