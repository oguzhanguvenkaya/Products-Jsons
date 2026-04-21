/**
 * turkishNormalize.ts — Query text normalization for Turkish retrieval.
 *
 * Goals:
 *   - Lowercase while keeping Turkish-specific letters intact
 *     (ş, ç, ğ, ö, ü, ı, i).
 *   - Flatten loanword Latin accents (â, î, û, é, à …) so "Cilâ" and
 *     "cila" map to the same stem bucket in Postgres `turkish` FTS.
 *   - Collapse the ambiguous capital "I / İ" pair to plain "i".
 *     Autocorrect and shift-lock make the dotless-I distinction
 *     unreliable at input time.
 *
 * Why `.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')`
 * alone is not enough:
 *   NFD decomposes "ş" into "s" + combining cedilla (U+0327), and the
 *   subsequent strip turns it into a plain "s". Turkish-specific
 *   letters must be fenced behind sentinels before NFD runs.
 *
 * Only five letters need fencing: ş, ç, ğ, ö, ü. The others behave:
 *   - "ı" (U+0131) is a single codepoint, NFD leaves it alone.
 *   - "İ" decomposes to "i" + combining dot; stripping combining marks
 *     correctly collapses it to "i", which is the desired output.
 *   - "I" lowercases to "i" under the default (non-locale) algorithm,
 *     which we also want.
 */

interface SentinelPair {
  regex: RegExp; // case-insensitive match on the Turkish letter
  sentinel: string; // private-use codepoint (NFD-inert, casing-inert)
  restore: string; // canonical lowercase form
}

const SENTINELS: readonly SentinelPair[] = [
  { regex: /ş/gi, sentinel: '\u0001', restore: 'ş' },
  { regex: /ç/gi, sentinel: '\u0002', restore: 'ç' },
  { regex: /ğ/gi, sentinel: '\u0003', restore: 'ğ' },
  { regex: /ö/gi, sentinel: '\u0006', restore: 'ö' },
  { regex: /ü/gi, sentinel: '\u0007', restore: 'ü' },
];

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const WHITESPACE_RUN = /\s+/g;

export function normalizeTurkish(text: string): string {
  let t = text;

  // 1. Fence Turkish letters so NFD can't split them.
  for (const { regex, sentinel } of SENTINELS) {
    t = t.replace(regex, sentinel);
  }

  // 2. Lowercase and flatten Latin accents (â → a, é → e, İ → i).
  t = t.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');

  // 3. Restore Turkish letters (always in canonical lowercase).
  for (const { sentinel, restore } of SENTINELS) {
    if (t.includes(sentinel)) {
      t = t.split(sentinel).join(restore);
    }
  }

  // 4. Normalize whitespace.
  return t.replace(WHITESPACE_RUN, ' ').trim();
}
