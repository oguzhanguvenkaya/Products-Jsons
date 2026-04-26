// Faz 5 — FAQ near-duplicate merge analizi
// Çıktı:
//   data/consolidation/phase5-faq-merge.csv
//   data/consolidation/phase5-faq-merge-payload.json
//   data/consolidation/phase5-pattern-faqs.md
//   data/consolidation/phase5-new-fields.md
//   data/consolidation/phase5-summary.md
//
// Strateji:
//   1) snapshot/faqs-*.json dosyalarını oku → tek liste (3156)
//   2) Her FAQ'yı (sku|scope+brand+category, normalize(question)) ile grupla
//   3) Aynı kümede >=2 satır varsa → en uzun answer'lı satırı KEEP, diğerleri DELETE
//   4) Pattern (cross-SKU duplicate) sorularını AYRI raporla, dokunma
//   5) staging payload üret (faq scope, sku NON-NULL olanlar — service şartı)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeTurkish } from '../src/lib/turkishNormalize.ts';

const ROOT = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons';
const SNAPSHOT_DIR = join(
  ROOT,
  'data/consolidation/_pre-commit-snapshot-20260423-044331',
);
const OUT_DIR = join(ROOT, 'data/consolidation');

type Faq = {
  id: number;
  sku: string | null;
  scope: 'product' | 'brand' | 'category';
  brand: string | null;
  category: string | null;
  question: string;
  answer: string;
  createdAt: string;
  productName: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. FAQ'ları yükle
// ─────────────────────────────────────────────────────────────────────────────

function loadAllFaqs(): Faq[] {
  const files = readdirSync(SNAPSHOT_DIR)
    .filter((f) => /^faqs-\d+\.json$/.test(f))
    .sort();
  const all: Faq[] = [];
  for (const f of files) {
    const json = JSON.parse(readFileSync(join(SNAPSHOT_DIR, f), 'utf8')) as {
      items: Faq[];
    };
    all.push(...json.items);
  }
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Group key (scope-aware)
// ─────────────────────────────────────────────────────────────────────────────

function groupKey(f: Faq): string {
  // product scope → sku ile
  // brand   scope → "brand:<name>"
  // category scope → "category:<name>"
  if (f.sku) return `sku:${f.sku}`;
  if (f.scope === 'brand') return `brand:${f.brand ?? ''}`;
  if (f.scope === 'category') return `category:${f.category ?? ''}`;
  return `unknown:${f.id}`;
}

// Soru normalize: turkishNormalize + noktalama temizle + soru ekleri sadeleştir
function normalizeQuestion(q: string): string {
  let s = normalizeTurkish(q);
  // Soru işaretleri ve noktalama
  s = s.replace(/[?¿!.,:;()\[\]{}«»"'`–—-]+/g, ' ');
  // "miyim/musun/mıyız/mısınız/midir/mıdır/mı/mi/mü/mu" → tek bucket
  s = s.replace(/\b(miyim|musun|m[iı]yiz|m[iı]s[iı]n[iı]z|midir|m[iı]d[iı]r|m[iı]|mu|mü)\b/g, '');
  // Çoklu boşluk
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// "nasıl uygulanır" ≈ "nasıl kullanılır" ≈ "nasıl kullanmaliyim"
// Token-set Jaccard ile eşik üstü = aynı niyet
function tokenSet(s: string): Set<string> {
  return new Set(s.split(' ').filter((t) => t.length >= 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Domain-specific eş anlamlılar — token bazında normalize et
const SYN_MAP: Record<string, string> = {
  uygulanir: 'kullanilir',
  uygulanma: 'kullanim',
  uygulamasi: 'kullanim',
  uygulamak: 'kullanmak',
  kullanmaliyim: 'kullanilir',
  kullanmaliyiz: 'kullanilir',
  kullanilmali: 'kullanilir',
  uygulanabilir: 'uygulayabilir',
  // wax/sealant ek kaplama vb. terimleri tek "kaplama" sözcüğüne indirgeme
  wax: 'kaplama',
  sealant: 'kaplama',
  topcoat: 'kaplama',
  cila: 'kaplama',
};

function tokenSetSyn(normalized: string): Set<string> {
  // turkishNormalize ı'yı korur; biz syn-map için ASCII forma indirelim
  const ascii = normalized
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ı/g, 'i');
  const tokens = ascii.split(' ').filter((t) => t.length >= 2);
  return new Set(tokens.map((t) => SYN_MAP[t] ?? t));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cluster oluşturma
// ─────────────────────────────────────────────────────────────────────────────

type Cluster = {
  groupKey: string;
  rep: string; // representative normalized question
  members: Faq[];
};

const SIM_THRESHOLD = 0.85; // Jaccard token-set eşik — tight (false positives expensive)

// İçerik tokenleri ("nedir","nasıl","hangi" gibi soru-stop'ları çıkar) — bu
// stop-word'ler tek başlarına benzerlik üretmemeli
const STOP_TOKENS = new Set([
  'nedir',
  'nasil',
  'hangi',
  'kac',
  'ne',
  'icin',
  'icin',
  've',
  'ile',
  'bir',
  'olan',
  'olur',
  'olarak',
  'fark',
  'arasindaki',
  'arasinda',
  'kullanmaliyim',
  'kullanilir',
  'uygulanir',
  'uygulamaliyim',
  'kullanmali',
  'cok',
  'daha',
  'midir',
]);

function contentTokens(s: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const t of s) {
    if (!STOP_TOKENS.has(t)) out.add(t);
  }
  return out;
}

function clusterFaqs(faqs: Faq[]): Cluster[] {
  // 1) Group key bazında topla
  const byGroup = new Map<string, Faq[]>();
  for (const f of faqs) {
    const k = groupKey(f);
    let arr = byGroup.get(k);
    if (!arr) {
      arr = [];
      byGroup.set(k, arr);
    }
    arr.push(f);
  }

  const clusters: Cluster[] = [];

  for (const [gk, members] of byGroup) {
    // Her grup içinde near-duplicate kümeleri ara
    const used = new Set<number>();
    for (let i = 0; i < members.length; i++) {
      if (used.has(i)) continue;
      const a = members[i]!;
      const aNorm = normalizeQuestion(a.question);
      const aTokens = tokenSetSyn(aNorm);
      const aContent = contentTokens(aTokens);
      const cluster: Faq[] = [a];
      used.add(i);
      for (let j = i + 1; j < members.length; j++) {
        if (used.has(j)) continue;
        const b = members[j]!;
        const bNorm = normalizeQuestion(b.question);
        const bTokens = tokenSetSyn(bNorm);
        const bContent = contentTokens(bTokens);

        // Tam eşleşme her zaman cluster
        const exact = aNorm === bNorm;

        // İçerik tokenleri SET-EQUAL olmalı (stop'lar atılmış halde)
        const contentEqual =
          aContent.size > 0 &&
          aContent.size === bContent.size &&
          [...aContent].every((t) => bContent.has(t));

        // Veya: tüm token Jaccard çok yüksek + içerik tokenlerinde Jaccard >=0.8
        const allSim = jaccard(aTokens, bTokens);
        const contentSim = jaccard(aContent, bContent);
        const tightSim =
          allSim >= SIM_THRESHOLD &&
          aContent.size >= 1 &&
          bContent.size >= 1 &&
          contentSim >= 0.8;

        if (exact || contentEqual || tightSim) {
          cluster.push(b);
          used.add(j);
        }
      }
      if (cluster.length >= 2) {
        clusters.push({
          groupKey: gk,
          rep: normalizeQuestion(a.question),
          members: cluster,
        });
      }
    }
  }

  return clusters;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Pattern (cross-SKU) FAQ tespiti — DOKUNMA, sadece raporla
// ─────────────────────────────────────────────────────────────────────────────

function detectPatternFaqs(faqs: Faq[]): Map<string, Faq[]> {
  const patterns = new Map<string, Faq[]>();
  // SADECE product scope, normalize edilmiş soru bazında
  for (const f of faqs) {
    if (f.scope !== 'product' || !f.sku) continue;
    const key = normalizeQuestion(f.question);
    if (key.length < 4) continue;
    let arr = patterns.get(key);
    if (!arr) {
      arr = [];
      patterns.set(key, arr);
    }
    arr.push(f);
  }
  // Sadece >=5 ürünü etkileyen pattern'leri tut
  const filtered = new Map<string, Faq[]>();
  for (const [k, arr] of patterns) {
    const distinctSkus = new Set(arr.map((x) => x.sku!));
    if (distinctSkus.size >= 5) {
      filtered.set(k, arr);
    }
  }
  return filtered;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Merge kararı + staging payload
// ─────────────────────────────────────────────────────────────────────────────

type MergeAction = {
  cluster_id: string;
  group_key: string;
  faq_id: number;
  sku: string | null;
  scope: string;
  question: string;
  answer_len: number;
  action: 'keep' | 'delete' | 'update';
  reason: string;
};

type StagingChange = {
  id: string;
  scope: 'faq';
  sku: string;
  field: string; // faq[<id>]
  before: object;
  after: object | null;
  label?: string;
};

function buildMergePlan(clusters: Cluster[]): {
  actions: MergeAction[];
  changes: StagingChange[];
  unifiedQuestionUpdates: number;
  totalDeletes: number;
  skippedNullSku: number;
} {
  const actions: MergeAction[] = [];
  const changes: StagingChange[] = [];
  let unifiedUpdates = 0;
  let totalDeletes = 0;
  let skippedNullSku = 0;

  let cidx = 0;
  for (const c of clusters) {
    cidx++;
    const cid = `c${cidx}`;
    // KEEP = en uzun cevaplı satır (eşitlikte en küçük id)
    const sorted = [...c.members].sort((a, b) => {
      const la = a.answer.length;
      const lb = b.answer.length;
      if (lb !== la) return lb - la;
      return a.id - b.id;
    });
    const keep = sorted[0]!;
    const dropList = sorted.slice(1);

    // Birleşik soru — eğer kümede >=2 farklı normalized soru varsa, en uzun olanı korur
    const distinctQuestions = Array.from(
      new Set(c.members.map((m) => m.question.trim())),
    );
    const unifiedQuestion =
      distinctQuestions.length > 1
        ? distinctQuestions.sort((a, b) => b.length - a.length)[0]!
        : keep.question;
    const needsQuestionUpdate =
      keep.question.trim() !== unifiedQuestion.trim();

    actions.push({
      cluster_id: cid,
      group_key: c.groupKey,
      faq_id: keep.id,
      sku: keep.sku,
      scope: keep.scope,
      question: keep.question,
      answer_len: keep.answer.length,
      action: needsQuestionUpdate ? 'update' : 'keep',
      reason: needsQuestionUpdate
        ? `cluster of ${c.members.length}, kept longest answer; question unified`
        : `cluster of ${c.members.length}, kept longest answer`,
    });

    // KEEP için update payload (sadece question değişiyorsa)
    if (needsQuestionUpdate && keep.sku) {
      changes.push({
        id: `${cid}-keep`,
        scope: 'faq',
        sku: keep.sku,
        field: `faq[${keep.id}]`,
        before: {
          id: keep.id,
          question: keep.question,
          answer: keep.answer,
          scope: keep.scope,
          brand: keep.brand,
          category: keep.category,
        },
        after: {
          question: unifiedQuestion,
          answer: keep.answer,
          scope: keep.scope,
          brand: keep.brand,
          category: keep.category,
        },
        label: `unify question across ${c.members.length} duplicates`,
      });
      unifiedUpdates++;
    } else if (needsQuestionUpdate && !keep.sku) {
      // brand/category scope — staging API sku zorunlu, sadece raporda kalsın
      skippedNullSku++;
    }

    for (const drop of dropList) {
      actions.push({
        cluster_id: cid,
        group_key: c.groupKey,
        faq_id: drop.id,
        sku: drop.sku,
        scope: drop.scope,
        question: drop.question,
        answer_len: drop.answer.length,
        action: 'delete',
        reason: `near-duplicate of faq ${keep.id} (kept)`,
      });
      if (drop.sku) {
        changes.push({
          id: `${cid}-del-${drop.id}`,
          scope: 'faq',
          sku: drop.sku,
          field: `faq[${drop.id}]`,
          before: {
            id: drop.id,
            question: drop.question,
            answer: drop.answer,
            scope: drop.scope,
            brand: drop.brand,
            category: drop.category,
          },
          after: null,
          label: `merge into faq ${keep.id}`,
        });
        totalDeletes++;
      } else {
        skippedNullSku++;
      }
    }
  }

  return {
    actions,
    changes,
    unifiedQuestionUpdates: unifiedUpdates,
    totalDeletes,
    skippedNullSku,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Pattern öneri raporu (kullanıcı sinyallerinden)
// ─────────────────────────────────────────────────────────────────────────────

function detectUserSignalPatterns() {
  // Instagram unanswered.jsonl + conversations.jsonl ilk 200 müşteri mesajı
  const igPath = join(ROOT, 'data/instagram/unanswered.jsonl');
  const convPath = join(ROOT, 'data/instagram/conversations.jsonl');
  const lines: string[] = [];
  try {
    const raw = readFileSync(igPath, 'utf8').split('\n').slice(0, 200);
    for (const l of raw) {
      if (!l.trim()) continue;
      try {
        const j = JSON.parse(l) as { customer_messages?: string[] };
        if (j.customer_messages) lines.push(...j.customer_messages);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  try {
    const raw = readFileSync(convPath, 'utf8').split('\n').slice(0, 200);
    for (const l of raw) {
      if (!l.trim()) continue;
      try {
        const j = JSON.parse(l) as {
          turns?: Array<{ role: string; text: string }>;
        };
        if (j.turns) {
          for (const t of j.turns) {
            if (t.role === 'customer') lines.push(t.text);
          }
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }

  const patterns = {
    stock_dealer: 0, // bayilik / sipariş / stok / nereden
    problem_solution: 0, // su lekesi, hare, pasta kalıntısı, leke, çizik
    comparison: 0, // X ile Y, fark, hangisi daha
    price: 0, // fiyat / kaç para / ne kadar
    application_how: 0, // nasıl
  };

  for (const text of lines) {
    const t = normalizeTurkish(text);
    if (
      /\b(bayi|sipari[sş]|nereden|stok|sat[ıi][sş]|ma[gğ]aza|gonder|kargo|fiyat almak|nereye gidi|nereden alabili)\b/.test(
        t,
      )
    ) {
      patterns.stock_dealer++;
    }
    if (
      /\b(su leke|hare|pasta kal[ıi]nt|leke|cizik|swirl|lekesi|izi var|temizlemek|cikartmak|sokmek)\b/.test(
        t,
      )
    ) {
      patterns.problem_solution++;
    }
    if (/\b(fark|hangisi|kar[sş][ıi]la[sş]t|x ile y|aras[ıi]nda|daha iyi)\b/.test(t)) {
      patterns.comparison++;
    }
    if (/\b(fiyat|ne kadar|kac para|fiyat[ıi] nedir)\b/.test(t)) {
      patterns.price++;
    }
    if (/\bnas[ıi]l\b/.test(t)) {
      patterns.application_how++;
    }
  }

  return { patterns, sample_size: lines.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CSV writer
// ─────────────────────────────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function writeCsv(actions: MergeAction[]) {
  const header = [
    'cluster_id',
    'group_key',
    'faq_id',
    'sku',
    'scope',
    'question',
    'answer_len',
    'action',
    'reason',
  ];
  const rows = [header.join(',')];
  for (const a of actions) {
    rows.push(
      [
        a.cluster_id,
        a.group_key,
        a.faq_id,
        a.sku ?? '',
        a.scope,
        a.question,
        a.answer_len,
        a.action,
        a.reason,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  writeFileSync(join(OUT_DIR, 'phase5-faq-merge.csv'), rows.join('\n'), 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  console.log('Faz 5 — FAQ near-duplicate merge analizi');
  console.log('═'.repeat(70));

  const faqs = loadAllFaqs();
  console.log(`Loaded ${faqs.length} FAQs from snapshot`);
  console.log(
    `  - product scope: ${faqs.filter((f) => f.scope === 'product').length}`,
  );
  console.log(
    `  - brand scope:   ${faqs.filter((f) => f.scope === 'brand').length}`,
  );
  console.log(
    `  - category scope:${faqs.filter((f) => f.scope === 'category').length}`,
  );

  // Pattern (cross-SKU) — ÖNCE filter et, kümeleme bunlara dokunmasın
  const patterns = detectPatternFaqs(faqs);
  // Ama pattern olan satırlar yine ürün-bazında "tekil" olduğu için cluster'a
  // dahil değil — clustering zaten group_key (sku) bazında. Pattern raporu ayrı.
  console.log(`\nPattern FAQ groups (>=5 SKU): ${patterns.size}`);

  const clusters = clusterFaqs(faqs);
  console.log(`\nNear-duplicate clusters: ${clusters.length}`);
  let totalMerged = 0;
  for (const c of clusters) totalMerged += c.members.length;
  console.log(`  total FAQs in clusters: ${totalMerged}`);

  const plan = buildMergePlan(clusters);
  console.log(
    `\nMerge plan: ${plan.totalDeletes} deletes + ${plan.unifiedQuestionUpdates} question unifications`,
  );
  console.log(
    `  skipped (null sku, scope=brand/category): ${plan.skippedNullSku}`,
  );
  console.log(`  staging changes: ${plan.changes.length}`);

  writeCsv(plan.actions);
  console.log(`\n→ wrote phase5-faq-merge.csv (${plan.actions.length} rows)`);

  // Payload — 500'lük batch limiti var; tek dosya yine üretelim ama meta ekle
  const payload = { changes: plan.changes };
  writeFileSync(
    join(OUT_DIR, 'phase5-faq-merge-payload.json'),
    JSON.stringify(payload, null, 2),
    'utf8',
  );
  console.log(
    `→ wrote phase5-faq-merge-payload.json (${plan.changes.length} changes)`,
  );

  // Pattern report
  const patternRows = Array.from(patterns.entries())
    .map(([key, members]) => ({
      key,
      example: members[0]!.question,
      sku_count: new Set(members.map((m) => m.sku!)).size,
      total_rows: members.length,
    }))
    .sort((a, b) => b.sku_count - a.sku_count);

  let patternsMd = '# Phase 5 — Pattern FAQ Raporu (Cross-SKU Birebir Tekrar)\n\n';
  patternsMd += `> Snapshot: \`_pre-commit-snapshot-20260423-044331\`\n`;
  patternsMd += `> Toplam FAQ: ${faqs.length} | Pattern grupları (>=5 ürün): ${patternRows.length}\n\n`;
  patternsMd += `## Strateji\n\n`;
  patternsMd += `Bu pattern'ler **kasıtlı template repetition** — instruction-driven RAG'de `;
  patternsMd += `her ürün için core-set FAQ standardizasyonu (Phase 4 P7 önerisi). `;
  patternsMd += `**SİLİNMESİN.** Önerilen evrim: \`template_faqs\` tablosu (gelecek faz):\n`;
  patternsMd += `- \`pattern_id, question_template, answer_template, applies_to_template_group, applies_to_brand?\`\n`;
  patternsMd += `- Render zamanı SKU bağlamıyla doldur (ürün adı, fiyat, varyant)\n`;
  patternsMd += `- Avantaj: 323 satır → ~30 template → 90% storage saving\n\n`;
  patternsMd += `## Top 30 Pattern\n\n`;
  patternsMd += `| Pattern (normalized) | Örnek soru | SKU sayısı | Toplam satır |\n`;
  patternsMd += `|---|---|---:|---:|\n`;
  for (const r of patternRows.slice(0, 30)) {
    patternsMd += `| \`${r.key.slice(0, 60)}\` | ${r.example.slice(0, 80)} | ${r.sku_count} | ${r.total_rows} |\n`;
  }
  patternsMd += `\n## Toplam Etki\n\n`;
  const totalPatternRows = patternRows.reduce((s, r) => s + r.total_rows, 0);
  patternsMd += `- ${patternRows.length} pattern grup\n`;
  patternsMd += `- ${totalPatternRows} toplam FAQ satırı (faqs tablosunun ${(
    (totalPatternRows / faqs.length) *
    100
  ).toFixed(1)}%'i)\n`;
  patternsMd += `- Template'leme yapılırsa: ~${patternRows.length} satır + render logic\n`;

  writeFileSync(join(OUT_DIR, 'phase5-pattern-faqs.md'), patternsMd, 'utf8');
  console.log(`→ wrote phase5-pattern-faqs.md (${patternRows.length} patterns)`);

  // User signal patterns
  const sig = detectUserSignalPatterns();
  let newFieldsMd = '# Phase 5 — Yeni FAQ Field/Schema Önerileri (Kullanıcı Sinyalinden)\n\n';
  newFieldsMd += `> Sinyal kaynağı: \`data/instagram/unanswered.jsonl\` (ilk 200) + \`conversations.jsonl\` (ilk 200, customer turns)\n`;
  newFieldsMd += `> Toplam analiz edilen müşteri mesajı: ${sig.sample_size}\n\n`;
  newFieldsMd += `## Bulgular & Pattern Yoğunluğu\n\n`;
  newFieldsMd += `| Pattern | Sinyal sayısı | Açıklama |\n`;
  newFieldsMd += `|---|---:|---|\n`;
  newFieldsMd += `| Stok / bayilik / sipariş | ${sig.patterns.stock_dealer} | "nereden alabilirim", "bayi", "sipariş" |\n`;
  newFieldsMd += `| Sorun-çözüm (leke, hare, kalıntı) | ${sig.patterns.problem_solution} | "su lekesi", "pasta kalıntısı", "swirl" |\n`;
  newFieldsMd += `| Karşılaştırma (X vs Y) | ${sig.patterns.comparison} | "X ile Y arasında fark", "hangisi daha iyi" |\n`;
  newFieldsMd += `| Fiyat | ${sig.patterns.price} | "fiyat", "ne kadar", "kaç para" |\n`;
  newFieldsMd += `| Uygulama (nasıl) | ${sig.patterns.application_how} | "nasıl uygulanır", "nasıl kullanılır" |\n\n`;

  newFieldsMd += `## Önerilen Yeni Schema Elemanları\n\n`;

  newFieldsMd += `### 1. \`distribution_channels\` — products.distribution_channels JSONB\n\n`;
  newFieldsMd += `**Cevap verdiği soru:** "Bayilik / nereden alırım / stok"\n`;
  newFieldsMd += `**Etkisi:** Tüm ürünler (~700+) — brand-level varsayılan + ürün-bazında override.\n\n`;
  newFieldsMd += `\`\`\`sql\n`;
  newFieldsMd += `ALTER TABLE products ADD COLUMN distribution_channels JSONB;\n`;
  newFieldsMd += `-- Örnek değer:\n`;
  newFieldsMd += `-- { "marketplaces": ["trendyol","hepsiburada","n11"],\n`;
  newFieldsMd += `--   "dealers": ["mts_kimya","altintas","cila_kutusu"],\n`;
  newFieldsMd += `--   "direct_sale": false,\n`;
  newFieldsMd += `--   "dealer_lookup_url": "https://gyeon.co/network/" }\n`;
  newFieldsMd += `\`\`\`\n\n`;
  newFieldsMd += `Bot davranışı: "satın al" / "bayi" yakalandığında \`getDistribution(sku)\` tool → karta yönlendir.\n\n`;

  newFieldsMd += `### 2. \`solves_problem\` — products.solves_problem TEXT[]\n\n`;
  newFieldsMd += `**Cevap verdiği soru:** "Su lekesi nasıl çıkar?", "Hare giderici hangi ürün?"\n`;
  newFieldsMd += `**Etkisi:** İlk fazda ~120 ürün (polish, iron remover, swirl removers, glass cleaner).\n\n`;
  newFieldsMd += `\`\`\`sql\n`;
  newFieldsMd += `ALTER TABLE products ADD COLUMN solves_problem TEXT[];\n`;
  newFieldsMd += `CREATE INDEX idx_products_solves_problem ON products USING GIN(solves_problem);\n`;
  newFieldsMd += `-- Vocabulary: 'water_spots','swirls','iron_contamination','tar','bird_droppings',\n`;
  newFieldsMd += `--             'orange_peel','holograms','etching','interior_stains','odor'\n`;
  newFieldsMd += `\`\`\`\n\n`;
  newFieldsMd += `Bot tool: \`searchProductsByProblem(problem_code)\` → ürün listesi.\n\n`;

  newFieldsMd += `### 3. \`comparison_pairs\` — product_relations.relation_type='comparison_pair'\n\n`;
  newFieldsMd += `**Cevap verdiği soru:** "X ile Y arasında fark nedir?"\n`;
  newFieldsMd += `**Etkisi:** ~80-150 yaygın çift (Mohs vs Q One, Bathe vs Bathe+, vb.)\n\n`;
  newFieldsMd += `\`\`\`sql\n`;
  newFieldsMd += `-- Mevcut product_relations tablosunda yeni relation_type:\n`;
  newFieldsMd += `INSERT INTO product_relations (sku, related_sku, relation_type, metadata)\n`;
  newFieldsMd += `VALUES ('GYE-MOHS-EVO-50', 'GYE-Q-ONE-EVO-50', 'comparison_pair',\n`;
  newFieldsMd += `        '{"diff_summary":"Mohs daha sert, Q One esnek","strength_x":"hardness","strength_y":"flexibility"}'::jsonb);\n`;
  newFieldsMd += `\`\`\`\n\n`;
  newFieldsMd += `Bot tool: \`compareProducts(sku_a, sku_b)\` → diff_summary döner.\n\n`;

  newFieldsMd += `### 4. \`price_quote_template\` — opsiyonel, brand-level FAQ\n\n`;
  newFieldsMd += `**Cevap verdiği soru:** "Fiyat ne kadar?"\n`;
  newFieldsMd += `**Etkisi:** Mevcut \`price\` field zaten var; **bot tarafında** tool zorlaması yeterli (Phase 4 v10.1 \`searchByRating enforcement\` paterni gibi).\n\n`;
  newFieldsMd += `Yeni schema gerekmez; instruction'a SPEC-FIRST yanına PRICE-FIRST ekle:\n`;
  newFieldsMd += `> "fiyat sorularında \`getProductDetails().sizes[].price\` olmadan asla manuel cevap verme."\n\n`;

  newFieldsMd += `## Karar Matrisi\n\n`;
  newFieldsMd += `| Öneri | Sinyal hacmi | Schema değişikliği | Bot effort | Öneri |\n`;
  newFieldsMd += `|---|---|---|---|---|\n`;
  newFieldsMd += `| distribution_channels | Yüksek | products + JSONB | tool + 1 instruction blok | 🟢 KISA YOL |\n`;
  newFieldsMd += `| solves_problem | Orta | products + TEXT[] + GIN | tool + RAG entegrasyonu | 🟢 ORTA |\n`;
  newFieldsMd += `| comparison_pairs | Orta | product_relations + metadata | tool + JSONB diff_summary | 🟡 EFFORT YÜKSEK |\n`;
  newFieldsMd += `| price_quote_template | Yüksek | (yok) | sadece instruction | 🟢 KOLAY |\n\n`;

  writeFileSync(join(OUT_DIR, 'phase5-new-fields.md'), newFieldsMd, 'utf8');
  console.log(`→ wrote phase5-new-fields.md`);

  // Summary
  let summary = '# Phase 5 — FAQ Konsolidasyonu Özet\n\n';
  summary += `**Tarih:** 2026-04-23\n`;
  summary += `**Snapshot:** \`_pre-commit-snapshot-20260423-044331\`\n`;
  summary += `**Toplam FAQ:** ${faqs.length}\n\n`;
  summary += `## 1. Near-duplicate Merge\n\n`;
  summary += `- Cluster (≥2 yakın-duplicate): **${clusters.length}**\n`;
  summary += `- Cluster içindeki toplam FAQ: **${totalMerged}**\n`;
  summary += `- KEEP edilen (her cluster'ın en uzun cevabı): **${clusters.length}**\n`;
  summary += `- DELETE önerisi: **${plan.totalDeletes}** (sadece sku!=null)\n`;
  summary += `- Soru-unify UPDATE: **${plan.unifiedQuestionUpdates}**\n`;
  summary += `- SKIP (null sku — brand/category scope, staging API sku gerekli): **${plan.skippedNullSku}**\n`;
  summary += `- Staging changes toplamı: **${plan.changes.length}**\n\n`;
  summary += `## 2. Pattern (Cross-SKU) Tespiti\n\n`;
  summary += `- Pattern grup (>=5 farklı SKU'da aynı normalize soru): **${patterns.size}**\n`;
  summary += `- Toplam pattern satır: **${totalPatternRows}** (${(
    (totalPatternRows / faqs.length) *
    100
  ).toFixed(1)}% of FAQs)\n`;
  summary += `- **Aksiyon:** Silinmiyor — \`template_faqs\` tablosu önerisi (gelecek faz)\n\n`;
  summary += `## 3. Yeni Schema Önerileri (Kullanıcı Sinyali)\n\n`;
  summary += `Sinyal hacmi (n=${sig.sample_size} müşteri mesajı):\n`;
  summary += `- Stok/bayilik: ${sig.patterns.stock_dealer}\n`;
  summary += `- Sorun-çözüm: ${sig.patterns.problem_solution}\n`;
  summary += `- Karşılaştırma: ${sig.patterns.comparison}\n`;
  summary += `- Fiyat: ${sig.patterns.price}\n`;
  summary += `- Uygulama: ${sig.patterns.application_how}\n\n`;
  summary += `→ Detay: \`phase5-new-fields.md\`\n\n`;
  summary += `## 4. Çıktılar\n\n`;
  summary += `- \`phase5-faq-merge.csv\` — staging payload satır bazında (action: keep/delete/update)\n`;
  summary += `- \`phase5-faq-merge-payload.json\` — \`/admin/staging/preview\` payload\n`;
  summary += `- \`phase5-pattern-faqs.md\` — pattern raporu (DOKUNMA listesi)\n`;
  summary += `- \`phase5-new-fields.md\` — schema önerileri\n\n`;
  summary += `## 5. Kısıtlamalar & Notlar\n\n`;
  summary += `- COMMIT YOK — sadece preview için payload üretildi.\n`;
  summary += `- 500/batch staging API limiti var; preview tek dosyada (gerekirse split).\n`;
  summary += `- Cross-SKU duplicate'lere DOKUNULMADI (pattern raporu ayrı).\n`;
  summary += `- brand/category scope FAQ near-duplicate'ler raporlandı ama staging payload'a KONULMADI (sku NOT NULL şartı).\n`;
  summary += `- Jaccard eşik: ${SIM_THRESHOLD} (token-set, syn-map'li, "uygulanır≈kullanılır" eşlemesi dahil).\n`;
  writeFileSync(join(OUT_DIR, 'phase5-summary.md'), summary, 'utf8');
  console.log(`→ wrote phase5-summary.md`);

  // Top 5 örnek için stdout dump
  console.log('\n══ Top 5 örnek merge cluster ══');
  for (const c of clusters.slice(0, 5)) {
    console.log(
      `\n[${c.groupKey}] (n=${c.members.length}, rep="${c.rep.slice(0, 60)}")`,
    );
    for (const m of c.members) {
      console.log(
        `  - id=${m.id} ans_len=${m.answer.length}  q="${m.question.slice(0, 80)}"`,
      );
    }
  }
}

main();
