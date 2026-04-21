/**
 * build-corpus.ts — Assemble the 150-query Phase 3 eval corpus.
 *
 * Three sources, 50 items each:
 *   instagram — real customer turns from data/instagram/conversations.jsonl
 *   synthetic — generated variations covering synonym / typo / slot cases
 *   manual    — hand-written queries targeting v9.2 regression cases
 *
 * We annotate at *category* level (brand + template_group) rather than
 * at SKU level; for each query, the hybrid/pure_vector retriever should
 * surface AT LEAST ONE item in the top-5 whose brand matches
 * expected_brand (when set) AND whose template_group matches
 * expected_template_group (when set). For model-specific queries we
 * also keep an expected_skus list.
 *
 * Output: retrieval-service/eval/corpus.jsonl
 *
 * Run:
 *   bun run eval/build-corpus.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

interface CorpusItem {
  id: string;
  source: 'instagram' | 'synthetic' | 'manual';
  query: string;
  expected_brand?: string | null;
  expected_template_group?: string | null;
  expected_skus?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  notes?: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// ─────────────────────────────────────────────────────────────────
// 1. Instagram corpus — filter real queries
// ─────────────────────────────────────────────────────────────────

const DETAILING_KEYWORDS = [
  // Turkish product words
  'seramik', 'kaplama', 'pasta', 'cila', 'polisaj', 'polish', 'şampuan', 'sampuan',
  'havlu', 'bez', 'mikrofiber', 'sünger', 'fırça', 'pad', 'pompa', 'sprey', 'sprayer',
  'kaplamalı', 'kaplamanın', 'leke', 'hare', 'çizik', 'çizic', 'aplikator', 'aplikatör',
  'iç temizleyici', 'interior', 'cam', 'deri', 'lastik', 'jant', 'motor', 'mat ',
  'koruyucu', 'korumak', 'koruma', 'koruyu', 'kurulama', 'yıkama', 'yagmur', 'yağmur',
  'parlak', 'parlatı', 'cila', 'boya koruma', 'ppf', 'wax',
  // Brand-anchored
  'gyeon', 'menzerna', 'innovacar', 'fra-ber', 'fra ber', 'mg ps', 'mx-pro', 'mx pro',
  'bathe', 'cancoat', 'pure ', 'wetcoat', 'ironout', 'q²m', 'q2m', 'q2-', 'q2 ',
  'cure', 'mohs', 'syncro',
];

const SKIP_PATTERNS = [
  /^(merhaba|tamam|teşekk|tşk|selam|iyi ak|iyi gün|günaydın|peki|eyvallah)$/i,
  /(satın al|fiyat|kargo|iade|teslimat|sipariş|numaras|nerede|adres)[\s.!?]*$/i,
  /reacted|liked a message|dosya eki gönderdi/i,
  /^[^a-zA-ZıİğĞüÜşŞöÖçÇ]+$/, // only punctuation / emoji
];

function isProductQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (text.length < 25 || text.length > 280) return false;
  if (SKIP_PATTERNS.some((r) => r.test(lower))) return false;
  return DETAILING_KEYWORDS.some((k) => lower.includes(k));
}

interface IgTurn {
  brand: string;
  text: string;
}

function loadInstagramTurns(): IgTurn[] {
  const path = join(ROOT, 'data', 'instagram', 'conversations.jsonl');
  const lines = readFileSync(path, 'utf-8').split('\n').filter(Boolean);
  const out: IgTurn[] = [];
  for (const line of lines) {
    try {
      const doc = JSON.parse(line);
      const brand = String(doc.brand ?? '');
      const turns = Array.isArray(doc.turns) ? doc.turns : [];
      for (const t of turns) {
        if (t.role === 'customer') {
          const text = String(t.text ?? '').trim();
          if (text) out.push({ brand, text });
        }
      }
    } catch {
      // skip malformed
    }
  }
  return out;
}

/**
 * Greedy diversity sampler: keep 50 queries maximizing keyword &
 * brand coverage while capping repetitions of the same leading
 * bigram (first two lowercase words).
 */
function selectDiverse(turns: IgTurn[], target = 50): IgTurn[] {
  const pool = turns.filter((t) => isProductQuery(t.text));
  const picked: IgTurn[] = [];
  const seenBigrams = new Set<string>();
  const kwCount = new Map<string, number>();

  function bigram(text: string): string {
    return text.toLowerCase().replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).slice(0, 2).join(' ');
  }
  function keywordsIn(text: string): string[] {
    const lower = text.toLowerCase();
    return DETAILING_KEYWORDS.filter((k) => lower.includes(k));
  }

  // Shuffle deterministically (simple Fisher-Yates with fixed seed).
  const shuffled = [...pool];
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  for (const t of shuffled) {
    if (picked.length >= target) break;
    const bg = bigram(t.text);
    if (seenBigrams.has(bg)) continue;
    const kws = keywordsIn(t.text);
    // Favor queries introducing new keywords.
    const freshKeywords = kws.filter((k) => (kwCount.get(k) ?? 0) < 3);
    if (picked.length >= 10 && freshKeywords.length === 0) continue;
    seenBigrams.add(bg);
    for (const k of kws) kwCount.set(k, (kwCount.get(k) ?? 0) + 1);
    picked.push(t);
  }

  // If we were too strict, top up without the fresh-keyword rule.
  if (picked.length < target) {
    for (const t of shuffled) {
      if (picked.length >= target) break;
      if (picked.includes(t)) continue;
      const bg = bigram(t.text);
      if (seenBigrams.has(bg)) continue;
      seenBigrams.add(bg);
      picked.push(t);
    }
  }

  return picked;
}

function igToCorpus(turns: IgTurn[]): CorpusItem[] {
  return turns.map((t, i) => {
    const lower = t.text.toLowerCase();
    // Naive brand guess from text + file-level brand tag.
    let brand: string | null = null;
    if (lower.includes('gyeon') || lower.includes('q²m') || lower.includes('q2m') || lower.includes('q2-') || lower.includes('cancoat') || lower.includes('wetcoat')) brand = 'GYEON';
    else if (lower.includes('menzerna')) brand = 'MENZERNA';
    else if (lower.includes('innovacar')) brand = 'INNOVACAR';
    else if (lower.includes('fra-ber') || lower.includes('fra ber')) brand = 'FRA-BER';
    else if (lower.includes('mg ps')) brand = 'MG PS';
    // Naive template_group guess
    let tg: string | null = null;
    if (/seramik|coating|kaplama|cancoat|wetcoat|cure|mohs|syncro/i.test(lower)) tg = 'ceramic_coating';
    else if (/pasta|cila|polish|polisaj/i.test(lower)) tg = 'abrasive_polish';
    else if (/şampuan|sampuan|yıkama|bathe|foam/i.test(lower)) tg = 'car_shampoo';
    else if (/havlu|bez|mikrofiber/i.test(lower)) tg = 'microfiber';
    else if (/pompa|sprayer|sprey/i.test(lower)) tg = 'sprayers_bottles';
    else if (/ironout|demir tozu|iron/i.test(lower)) tg = 'contaminant_solvers';
    else if (/cam/i.test(lower)) tg = 'glass_cleaner_protectant';

    const difficulty: CorpusItem['difficulty'] =
      t.text.length > 150 ? 'hard' : t.text.length > 80 ? 'medium' : 'easy';

    return {
      id: `ig-${String(i + 1).padStart(3, '0')}`,
      source: 'instagram',
      query: t.text.replace(/\s+/g, ' ').trim(),
      expected_brand: brand,
      expected_template_group: tg,
      difficulty,
      notes: `ig_brand_tag=${t.brand}`,
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// 2. Synthetic corpus — template-driven variations
// ─────────────────────────────────────────────────────────────────

const SYNTHETIC: Omit<CorpusItem, 'id' | 'source'>[] = [
  // Synonym-rich (cila/polisaj/pasta)
  { query: 'polisaj öner', expected_template_group: 'abrasive_polish', difficulty: 'easy', notes: 'synonym: polisaj=cila' },
  { query: 'ağır kesim pasta', expected_template_group: 'abrasive_polish', difficulty: 'easy' },
  { query: 'ince hare giderici cila', expected_template_group: 'abrasive_polish', difficulty: 'medium' },
  { query: 'compound öner', expected_template_group: 'abrasive_polish', difficulty: 'easy' },
  { query: 'heavy cut pasta', expected_template_group: 'abrasive_polish', difficulty: 'medium' },
  // Ceramic
  { query: 'seramik kaplama', expected_template_group: 'ceramic_coating', difficulty: 'easy' },
  { query: 'coating öner', expected_template_group: 'ceramic_coating', difficulty: 'easy', notes: 'synonym: coating=seramik' },
  { query: 'nano kaplama', expected_template_group: 'ceramic_coating', difficulty: 'easy' },
  { query: '2 yıl dayanıklı seramik kaplama', expected_template_group: 'ceramic_coating', difficulty: 'medium' },
  { query: 'mat yüzey için kaplama', expected_template_group: 'ceramic_coating', difficulty: 'hard', notes: 'matte coating edge case' },
  // Shampoo
  { query: 'pH nötr şampuan', expected_template_group: 'car_shampoo', difficulty: 'easy' },
  { query: 'köpüklü yıkama şampuanı', expected_template_group: 'car_shampoo', difficulty: 'easy' },
  { query: 'ön yıkama foam', expected_template_group: 'car_shampoo', difficulty: 'medium', notes: 'synonym: foam=köpük' },
  { query: 'wash öner', expected_template_group: 'car_shampoo', difficulty: 'easy' },
  { query: 'seramik bazlı şampuan', expected_template_group: 'car_shampoo', difficulty: 'medium' },
  // Glass
  { query: 'cam kaplama yağmur kovucu', expected_template_group: 'glass_cleaner_protectant', difficulty: 'medium' },
  { query: 'rain repellent cam', expected_template_group: 'glass_cleaner_protectant', difficulty: 'medium', notes: 'English alias' },
  { query: 'cam temizleyici öner', expected_template_group: 'glass_cleaner', difficulty: 'easy' },
  // Contaminant
  { query: 'demir tozu sökücü', expected_template_group: 'contaminant_solvers', difficulty: 'easy' },
  { query: 'iron out öner', expected_template_group: 'contaminant_solvers', difficulty: 'easy', notes: 'English alias' },
  { query: 'su lekesi temizleyici', expected_template_group: 'contaminant_solvers', difficulty: 'medium' },
  // Interior
  { query: 'iç temizleyici plastik', expected_template_group: 'interior_cleaner', difficulty: 'easy' },
  { query: 'deri bakım öner', expected_template_group: 'leather_care', difficulty: 'easy' },
  { query: 'koltuk temizleyici', expected_template_group: 'interior_cleaner', difficulty: 'medium' },
  // Tools
  { query: 'mikrofiber havlu 70x90', expected_template_group: 'microfiber', difficulty: 'easy' },
  { query: 'kurulama bezi', expected_template_group: 'microfiber', difficulty: 'easy' },
  { query: 'el pompası sprayer', expected_template_group: 'sprayers_bottles', difficulty: 'medium' },
  { query: 'polisaj pedi', expected_template_group: 'polishing_pad', difficulty: 'easy' },
  // Tire / wheel
  { query: 'lastik parlatıcı', expected_template_group: 'tire_care', difficulty: 'easy' },
  // Brand-specific
  { query: 'Gyeon seramik kaplama', expected_brand: 'GYEON', expected_template_group: 'ceramic_coating', difficulty: 'easy' },
  { query: 'Menzerna 400 kalın pasta', expected_brand: 'MENZERNA', expected_template_group: 'abrasive_polish', expected_skus: ['22202.260.001', '22200.261.001'], difficulty: 'medium' },
  { query: 'Menzerna 3800 finishing', expected_brand: 'MENZERNA', expected_template_group: 'abrasive_polish', expected_skus: ['22992.261.001'], difficulty: 'medium' },
  { query: 'GYEON Bathe şampuan', expected_brand: 'GYEON', expected_template_group: 'car_shampoo', difficulty: 'medium' },
  { query: 'GYEON CanCoat EVO', expected_brand: 'GYEON', expected_template_group: 'ceramic_coating', difficulty: 'medium' },
  { query: 'Innovacar W1 wetcoat', expected_brand: 'INNOVACAR', expected_template_group: 'paint_protection_quick', difficulty: 'hard' },
  { query: 'FRA-BER köpük şampuan', expected_brand: 'FRA-BER', expected_template_group: 'car_shampoo', difficulty: 'medium' },
  // Price slot
  { query: 'GYEON seramik kaplama 1000 TL altı', expected_brand: 'GYEON', expected_template_group: 'ceramic_coating', difficulty: 'medium', notes: 'slot: priceMax' },
  { query: '500 TL altı mikrofiber', expected_template_group: 'microfiber', difficulty: 'medium', notes: 'slot: priceMax' },
  { query: '2000 TL üstü pasta', expected_template_group: 'abrasive_polish', difficulty: 'medium', notes: 'slot: priceMin' },
  // Rating hint
  { query: 'en iyi seramik kaplama', expected_template_group: 'ceramic_coating', difficulty: 'medium', notes: 'ratingHint' },
  { query: 'en popüler cila', expected_template_group: 'abrasive_polish', difficulty: 'medium', notes: 'ratingHint' },
  // Use-case / multi-word
  { query: 'araç boyası üzerine koruma', expected_template_group: 'ceramic_coating', difficulty: 'hard' },
  { query: 'portakal kabuğu gideren pasta', expected_template_group: 'abrasive_polish', difficulty: 'hard', notes: 'orange peel query' },
  { query: 'kuş pisliği temizleyici', expected_template_group: 'contaminant_solvers', difficulty: 'hard' },
  { query: 'jant temizleyici', difficulty: 'medium' },
  { query: 'vernik koruyucu sprey', expected_template_group: 'paint_protection_quick', difficulty: 'medium' },
  // Typos / accent variants
  { query: 'seramık kaplama', expected_template_group: 'ceramic_coating', difficulty: 'medium', notes: 'dotless i typo' },
  { query: 'sampuan oner', expected_template_group: 'car_shampoo', difficulty: 'easy', notes: 'accent stripped' },
  { query: 'cılâ', expected_template_group: 'abrasive_polish', difficulty: 'hard', notes: 'circumflex + dotless' },
  // Hard: multi-slot / compound
  { query: 'Menzerna 3800 ile 2500 farkı', expected_brand: 'MENZERNA', expected_template_group: 'abrasive_polish', difficulty: 'hard' },
];

// ─────────────────────────────────────────────────────────────────
// 3. Manual corpus — v9.2 regression hotspots + domain-hard queries
// ─────────────────────────────────────────────────────────────────

const MANUAL: Omit<CorpusItem, 'id' | 'source'>[] = [
  // v9.1 Menzerna 400 → 2500 false positive regression
  { query: 'Menzerna 400 mü 1000 mi daha iyi', expected_brand: 'MENZERNA', expected_template_group: 'abrasive_polish', expected_skus: ['22202.260.001', '22200.261.001', '22984.260.001'], difficulty: 'hard', notes: 'v9.1 exact-model regression' },
  { query: 'Menzerna 400 alternatifi', expected_brand: 'MENZERNA', expected_template_group: 'abrasive_polish', difficulty: 'hard' },
  { query: 'Menzerna 2500 ince pasta', expected_brand: 'MENZERNA', expected_template_group: 'abrasive_polish', expected_skus: ['22828.261.001'], difficulty: 'medium' },
  { query: 'Menzerna 3800 ve 3500 aynı mı', expected_brand: 'MENZERNA', expected_template_group: 'abrasive_polish', difficulty: 'hard' },
  // Synonym-only queries (no direct keyword in name)
  { query: 'pasta öner', expected_template_group: 'abrasive_polish', difficulty: 'easy' },
  { query: 'polish öner', expected_template_group: 'abrasive_polish', difficulty: 'easy', notes: 'English synonym' },
  { query: 'hare giderici', expected_template_group: 'abrasive_polish', difficulty: 'medium' },
  { query: 'çizik giderici', expected_template_group: 'abrasive_polish', difficulty: 'medium' },
  // Compound / variant disambiguation
  { query: 'Bathe+ Plus', expected_brand: 'GYEON', expected_template_group: 'car_shampoo', difficulty: 'medium', notes: 'Plus variant not base Bathe' },
  { query: 'CanCoat EVO', expected_brand: 'GYEON', expected_template_group: 'ceramic_coating', difficulty: 'medium' },
  { query: 'GYEON One EVO', expected_brand: 'GYEON', expected_template_group: 'ceramic_coating', difficulty: 'easy' },
  // Technical niche
  { query: 'silikonsuz ağır kesim pasta', expected_template_group: 'abrasive_polish', difficulty: 'hard', notes: 'meta filter: silicone_free' },
  { query: 'dolgu maddesi içermeyen pasta', expected_template_group: 'abrasive_polish', difficulty: 'hard' },
  { query: '3 yıl dayanıklı seramik kaplama', expected_template_group: 'ceramic_coating', difficulty: 'hard', notes: 'durability spec' },
  // Application-context
  { query: 'PPF üzerine uygulanan kaplama', expected_template_group: 'ceramic_coating', difficulty: 'hard' },
  { query: 'zımpara sonrası pasta', expected_template_group: 'abrasive_polish', difficulty: 'hard' },
  { query: 'ön yıkama öncesi köpük', expected_template_group: 'car_shampoo', difficulty: 'medium' },
  // Multi-concept
  { query: 'yıkama sonrası parlatma için sprey', expected_template_group: 'paint_protection_quick', difficulty: 'hard' },
  { query: 'araç içini parlatan sprey', expected_template_group: 'interior_cleaner', difficulty: 'hard' },
  // Casual / typo
  { query: 'seramık kaplamaa', expected_template_group: 'ceramic_coating', difficulty: 'hard', notes: 'double typo' },
  { query: 'şampuan mı ön yıkama mı', expected_template_group: 'car_shampoo', difficulty: 'medium' },
  { query: 'gyeon şampuan hangisi', expected_brand: 'GYEON', expected_template_group: 'car_shampoo', difficulty: 'medium' },
  // Brand + category
  { query: 'Innovacar seramik', expected_brand: 'INNOVACAR', expected_template_group: 'ceramic_coating', difficulty: 'medium' },
  { query: 'SGCB polishing pad', expected_brand: 'SGCB', expected_template_group: 'polishing_pad', difficulty: 'medium' },
  { query: 'MG PS hare sünger', expected_brand: 'MG PS', expected_template_group: 'polishing_pad', difficulty: 'hard', notes: 'possibly spare_part' },
  // Size-specific
  { query: 'Menzerna 1 litre kalın pasta', expected_brand: 'MENZERNA', expected_template_group: 'abrasive_polish', difficulty: 'medium' },
  { query: '70x90 mikrofiber havlu', expected_template_group: 'microfiber', difficulty: 'medium' },
  // Wheel / tire
  { query: 'jant temizleyici iron out', expected_template_group: 'contaminant_solvers', difficulty: 'medium' },
  { query: 'lastik siyahlatıcı', expected_template_group: 'tire_care', difficulty: 'easy' },
  // Glass
  { query: 'ön cam yağmur kaydırıcı', expected_template_group: 'glass_cleaner_protectant', difficulty: 'medium' },
  { query: 'cam buğu önleyici', expected_template_group: 'glass_cleaner_protectant', difficulty: 'medium' },
  // Interior
  { query: 'koltuk ve halı temizleyici', expected_template_group: 'interior_cleaner', difficulty: 'medium' },
  { query: 'deri bakım kremi', expected_template_group: 'leather_care', difficulty: 'easy' },
  // Clay / decon
  { query: 'kil bar decon', expected_template_group: 'clay_products', difficulty: 'hard' },
  { query: 'dekontaminasyon şampuanı', expected_template_group: 'car_shampoo', difficulty: 'hard', notes: 'decon != contaminant_solvers' },
  // Quick detailer / wetcoat
  { query: 'quick detailer sprey', expected_template_group: 'paint_protection_quick', difficulty: 'medium' },
  { query: 'wetcoat alternatifi', expected_template_group: 'paint_protection_quick', difficulty: 'hard' },
  // Accessory / tool
  { query: 'spray bottle 500 ml', expected_template_group: 'sprayers_bottles', difficulty: 'easy' },
  { query: 'aplikatör sünger', expected_template_group: 'applicators', difficulty: 'medium' },
  { query: 'microfiber applicator', expected_template_group: 'applicators', difficulty: 'medium' },
  // Polisher machine
  { query: 'orbital polisaj makinesi', expected_template_group: 'polisher_machine', difficulty: 'medium' },
  { query: 'rastgele hareketli polisaj makinesi', expected_template_group: 'polisher_machine', difficulty: 'hard', notes: 'synonym: rastgele hareketli=orbital' },
  // Masking
  { query: 'maskeleme bandı', expected_template_group: 'masking_tapes', difficulty: 'easy' },
  // Marine
  { query: 'tekne kaplaması', expected_template_group: 'marin_products', difficulty: 'hard' },
  // Fragrance
  { query: 'araç kokusu parfümü', expected_template_group: 'fragrance', difficulty: 'easy' },
  // Sets
  { query: 'seramik kaplama seti', expected_template_group: 'product_sets', difficulty: 'medium' },
  // Challenge / edge
  { query: 'araç için profesyonel detailing ürünleri', difficulty: 'hard', notes: 'generic, low signal' },
  { query: 'gyeon sticker isteyin', expected_brand: 'GYEON', difficulty: 'hard', notes: 'promo, not product' },
  { query: 'uygulama videosu var mı', difficulty: 'hard', notes: 'meta question' },
  // Price range pressure
  { query: 'en ucuz seramik kaplama', expected_template_group: 'ceramic_coating', difficulty: 'medium' },
  { query: 'en pahalı profesyonel pasta', expected_template_group: 'abrasive_polish', difficulty: 'hard' },
];

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('[corpus] loading instagram turns...');
  const turns = loadInstagramTurns();
  console.log(`  total customer turns: ${turns.length}`);

  const selected = selectDiverse(turns, 50);
  console.log(`  filtered+diverse: ${selected.length}`);

  const igItems = igToCorpus(selected);

  const synthItems: CorpusItem[] = SYNTHETIC.map((x, i) => ({
    id: `synth-${String(i + 1).padStart(3, '0')}`,
    source: 'synthetic',
    ...x,
  }));

  const manualItems: CorpusItem[] = MANUAL.map((x, i) => ({
    id: `manual-${String(i + 1).padStart(3, '0')}`,
    source: 'manual',
    ...x,
  }));

  console.log(
    `  ig=${igItems.length} synth=${synthItems.length} manual=${manualItems.length}`,
  );

  const all = [...igItems, ...synthItems, ...manualItems];
  const out = all.map((x) => JSON.stringify(x)).join('\n') + '\n';

  const outPath = join(__dirname, 'corpus.jsonl');
  writeFileSync(outPath, out);
  console.log(`[corpus] wrote ${all.length} items to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
