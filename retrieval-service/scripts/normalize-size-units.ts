// Phase 1.1.1 — Targeted size unit canonicalize
//
// User-onaylı 13 template_group/sub_type kombinasyonunda her ürün
// `volume_ml` meta key'ine sahip olmalı.
//
// 4 işlem tipi:
//   (a) LEGACY → volume_ml (32 SKU): weight_kg/volume_lt/volume → ml
//   (b) NAME-EXTRACTION (LLM): isimde size varsa parse et (external file)
//   (c) PLACEHOLDER: kalan SKU'lara `volume_ml: null` ekle
//   (d) ALREADY_CANONICAL: hâli hazırda volume_ml var → no-op
//
// Modes: --report-only | --dry-run | --commit | --prepare-llm
//
// LLM extraction file: data/consolidation/phase1.1.1-name-extract-output.json
// Format: [{ sku, extractedVolumeMl, confidence, reasoning, unitInName }, ...]
//
// Output: data/consolidation/phase1.1.1-size-normalize-audit.json + 2 CSV
import { sql } from '../src/lib/db.ts';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// ─────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));
const MODE_REPORT = args.has('--report-only');
const MODE_DRY = args.has('--dry-run');
const MODE_COMMIT = args.has('--commit');
const MODE_PREPARE = args.has('--prepare-llm');

const modeCount = [MODE_REPORT, MODE_DRY, MODE_COMMIT, MODE_PREPARE].filter(Boolean).length;
if (modeCount !== 1) {
  console.error('Usage: bun scripts/normalize-size-units.ts <--report-only | --dry-run | --commit | --prepare-llm>');
  process.exit(1);
}

const HIGH_CONF = 0.85;
const REVIEW_CONF = 0.5;

// ─────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────

const REPO_ROOT = join(import.meta.dir, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'consolidation');
mkdirSync(OUT_DIR, { recursive: true });

const LLM_INPUT_PATH = join(OUT_DIR, 'phase1.1.1-name-extract-input.json');
const LLM_OUTPUT_PATH = join(OUT_DIR, 'phase1.1.1-name-extract-output.json');
const AUDIT_PATH = join(OUT_DIR, 'phase1.1.1-size-normalize-audit.json');
const NEEDS_DATA_ENTRY_CSV = join(OUT_DIR, 'phase1.1.1-volume-ml-needs-data-entry.csv');
const APPLIED_CSV = join(OUT_DIR, 'phase1.1.1-name-extracted-applied.csv');

// ─────────────────────────────────────────────────────────────────
// Targets WHERE clause
// ─────────────────────────────────────────────────────────────────

const TARGETS_SQL = `(
  template_group IN (
    'car_shampoo','interior_cleaner','abrasive_polish','paint_protection_quick',
    'ceramic_coating','contaminant_solvers','tire_care','leather_care',
    'marin_products','glass_cleaner_protectant'
  )
  OR (template_group = 'industrial_products' AND template_sub_type IS DISTINCT FROM 'solid_compound')
  OR (template_group = 'ppf_tools' AND template_sub_type = 'ppf_install_solution')
  OR (template_group = 'clay_products' AND template_sub_type = 'clay_lubricant')
)`;

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type Row = {
  sku: string;
  name: string;
  brand: string | null;
  template_group: string;
  template_sub_type: string | null;
  specs: Record<string, unknown> | null;
};

type LlmEntry = {
  sku: string;
  extractedVolumeMl: number | null;
  confidence: number;
  reasoning: string;
  unitInName: 'ml' | 'l' | 'kg' | 'g' | null;
  manualOverride?: boolean;
};

type LegacyConversion = {
  sku: string;
  name: string;
  before: Record<string, unknown>;
  after: number;
  sourceKey: 'weight_kg' | 'weight_g' | 'volume_lt' | 'volume';
};

type NameExtractApplied = {
  sku: string;
  name: string;
  templateGroup: string;
  templateSubType: string | null;
  extractedVolumeMl: number;
  confidence: number;
  reasoning: string;
  unitInName: string | null;
  manualOverride: boolean;
};

type ManualReview = NameExtractApplied;

type Placeholder = {
  sku: string;
  name: string;
  brand: string;
  templateGroup: string;
  templateSubType: string | null;
};

type Conflict = {
  sku: string;
  name: string;
  reason: string;
  legacyKeys: string[];
  existingVolumeMl: unknown;
};

// ─────────────────────────────────────────────────────────────────
// Volume string parser
// ─────────────────────────────────────────────────────────────────

const VOLUME_STR_RE = /^(\d+(?:[.,]\d+)?)\s*(ml|l|lt|liter|litre|kg|kilogram|gr|g|gram)$/i;

function parseVolumeString(raw: string): number | null {
  const cleaned = raw.trim();
  const m = VOLUME_STR_RE.exec(cleaned);
  if (!m) return null;
  const num = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(num)) return null;
  const unit = m[2].toLowerCase();
  if (unit === 'ml') return num;
  if (unit === 'l' || unit === 'lt' || unit === 'liter' || unit === 'litre') return num * 1000;
  if (unit === 'kg' || unit === 'kilogram') return num * 1000;
  if (unit === 'g' || unit === 'gr' || unit === 'gram') return num;
  return null;
}

// ─────────────────────────────────────────────────────────────────
// LLM extraction sanity check (cross-verify name contains the parsed token)
// ─────────────────────────────────────────────────────────────────

function llmSanityOk(name: string, entry: LlmEntry): boolean {
  if (entry.extractedVolumeMl === null) return true;
  const numStr = String(entry.extractedVolumeMl);
  const lower = name.toLowerCase();
  // Approximate check: ml value or its kg/L equivalent should appear in name.
  if (lower.includes(numStr)) return true;
  // Try kg/L back-conversion (e.g., 5000 ml → "5kg" / "5lt" / "5l")
  if (entry.extractedVolumeMl >= 1000 && entry.extractedVolumeMl % 1000 === 0) {
    const kgL = entry.extractedVolumeMl / 1000;
    if (lower.includes(`${kgL}kg`) || lower.includes(`${kgL} kg`)) return true;
    if (lower.includes(`${kgL}l`) || lower.includes(`${kgL} l`)) return true;
    if (lower.includes(`${kgL}lt`) || lower.includes(`${kgL} lt`)) return true;
    if (lower.includes(`${kgL}lit`) || lower.includes(`${kgL} lit`)) return true;
  }
  // Fractional: 4540 ml → "4,54" / "4.54"
  const liters = entry.extractedVolumeMl / 1000;
  const litersStr = liters.toFixed(2).replace(/\.?0+$/, '');
  if (lower.includes(litersStr.replace('.', ',')) || lower.includes(litersStr)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────
// CSV escape
// ─────────────────────────────────────────────────────────────────

function csvEsc(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(path: string, headers: string[], rows: string[][]): void {
  const lines = [headers.join(','), ...rows.map((r) => r.map(csvEsc).join(','))];
  writeFileSync(path, lines.join('\n') + '\n', 'utf8');
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

console.log(`✓ Mode: ${MODE_REPORT ? 'report-only' : MODE_DRY ? 'dry-run' : MODE_COMMIT ? 'commit' : 'prepare-llm'}`);

const rows = await sql.unsafe(`
  SELECT sku, name, brand, template_group, template_sub_type, specs
  FROM products
  WHERE ${TARGETS_SQL}
  ORDER BY template_group, template_sub_type NULLS FIRST, sku
`) as unknown as Row[];

console.log(`✓ ${rows.length} hedef SKU bulundu`);

// Categorize
const alreadyCanonical: { sku: string; name: string; volumeMl: unknown }[] = [];
const legacyCandidates: Row[] = [];
const sizelessCandidates: Row[] = [];
const conflicts: Conflict[] = [];

for (const r of rows) {
  const specs = (r.specs ?? {}) as Record<string, unknown>;
  const hasVolMl = Object.prototype.hasOwnProperty.call(specs, 'volume_ml');
  const legacyPresent: string[] = [];
  for (const k of ['weight_kg', 'weight_g', 'volume_lt', 'volume']) {
    if (Object.prototype.hasOwnProperty.call(specs, k)) legacyPresent.push(k);
  }

  if (hasVolMl && legacyPresent.length > 0) {
    conflicts.push({
      sku: r.sku,
      name: r.name,
      reason: 'has both volume_ml and legacy keys',
      legacyKeys: legacyPresent,
      existingVolumeMl: specs.volume_ml,
    });
    continue;
  }

  if (hasVolMl) {
    alreadyCanonical.push({ sku: r.sku, name: r.name, volumeMl: specs.volume_ml });
    continue;
  }

  if (legacyPresent.length > 0) {
    legacyCandidates.push(r);
    continue;
  }

  sizelessCandidates.push(r);
}

console.log(
  `  - alreadyCanonical=${alreadyCanonical.length}, legacy=${legacyCandidates.length}, sizeless=${sizelessCandidates.length}, conflicts=${conflicts.length}`,
);

// ─────────────────────────────────────────────────────────────────
// PREPARE-LLM mode: dump sizeless SKU list for subagent input
// ─────────────────────────────────────────────────────────────────

if (MODE_PREPARE) {
  const payload = sizelessCandidates.map((r) => ({
    sku: r.sku,
    name: r.name,
    brand: r.brand,
    templateGroup: r.template_group,
    templateSubType: r.template_sub_type,
  }));
  writeFileSync(LLM_INPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`✓ ${payload.length} sizeless SKU yazıldı: ${LLM_INPUT_PATH}`);
  console.log(`  Subagent çağırıp output'u yaz: ${LLM_OUTPUT_PATH}`);
  await sql.end();
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────
// REPORT-ONLY mode: just emit current-state CSV
// ─────────────────────────────────────────────────────────────────

if (MODE_REPORT) {
  const csvRows: string[][] = [];
  for (const r of [...legacyCandidates, ...sizelessCandidates]) {
    const specs = (r.specs ?? {}) as Record<string, unknown>;
    const status = legacyCandidates.includes(r) ? 'legacy_to_convert' : 'sizeless';
    const legacyValue = specs.weight_kg ?? specs.weight_g ?? specs.volume_lt ?? specs.volume ?? '';
    csvRows.push([
      r.sku,
      r.name,
      r.brand ?? '',
      r.template_group,
      r.template_sub_type ?? '',
      status,
      String(legacyValue),
    ]);
  }
  writeCsv(NEEDS_DATA_ENTRY_CSV, ['sku', 'name', 'brand', 'templateGroup', 'templateSubType', 'status', 'legacyValue'], csvRows);
  console.log(`✓ Report yazıldı: ${NEEDS_DATA_ENTRY_CSV} (${csvRows.length} satır)`);
  await sql.end();
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────
// LEGACY conversion plan (a)
// ─────────────────────────────────────────────────────────────────

const legacyPlan: LegacyConversion[] = [];
const legacyParseFailed: { sku: string; name: string; rawValue: unknown; key: string }[] = [];

for (const r of legacyCandidates) {
  const specs = (r.specs ?? {}) as Record<string, unknown>;
  let ml: number | null = null;
  let sourceKey: LegacyConversion['sourceKey'] | null = null;
  let beforeVal: unknown = null;

  if ('weight_kg' in specs) {
    const v = specs.weight_kg;
    sourceKey = 'weight_kg';
    beforeVal = v;
    if (typeof v === 'number') ml = v * 1000;
    else if (typeof v === 'string') {
      const n = parseFloat(v.replace(',', '.'));
      if (Number.isFinite(n)) ml = n * 1000;
    }
  } else if ('weight_g' in specs) {
    const v = specs.weight_g;
    sourceKey = 'weight_g';
    beforeVal = v;
    if (typeof v === 'number') ml = v;
    else if (typeof v === 'string') {
      const n = parseFloat(v.replace(',', '.'));
      if (Number.isFinite(n)) ml = n;
    }
  } else if ('volume_lt' in specs) {
    const v = specs.volume_lt;
    sourceKey = 'volume_lt';
    beforeVal = v;
    if (typeof v === 'number') ml = v * 1000;
    else if (typeof v === 'string') {
      const n = parseFloat(v.replace(',', '.'));
      if (Number.isFinite(n)) ml = n * 1000;
    }
  } else if ('volume' in specs) {
    const v = specs.volume;
    sourceKey = 'volume';
    beforeVal = v;
    if (typeof v === 'string') ml = parseVolumeString(v);
    else if (typeof v === 'number') ml = v; // assume ml
  }

  if (ml === null || !Number.isFinite(ml)) {
    legacyParseFailed.push({ sku: r.sku, name: r.name, rawValue: beforeVal, key: sourceKey ?? '?' });
    continue;
  }

  legacyPlan.push({
    sku: r.sku,
    name: r.name,
    before: { [sourceKey!]: beforeVal },
    after: Math.round(ml),
    sourceKey: sourceKey!,
  });
}

// ─────────────────────────────────────────────────────────────────
// NAME-EXTRACTION (b) — read external LLM output if present
// ─────────────────────────────────────────────────────────────────

let llmEntries: LlmEntry[] = [];
if (existsSync(LLM_OUTPUT_PATH)) {
  try {
    const raw = readFileSync(LLM_OUTPUT_PATH, 'utf8');
    llmEntries = JSON.parse(raw);
    console.log(`✓ LLM output yüklendi: ${llmEntries.length} entry`);
  } catch (e) {
    console.warn(`⚠ LLM output JSON parse hatası: ${(e as Error).message}`);
  }
} else {
  console.log(`ℹ LLM output dosyası yok (${LLM_OUTPUT_PATH}). Tüm sizeless SKU'lar placeholder olacak.`);
}

const llmBySku = new Map<string, LlmEntry>();
for (const e of llmEntries) llmBySku.set(e.sku, e);

const nameExtractApplied: NameExtractApplied[] = [];
const needsManualReview: ManualReview[] = [];
const placeholdersAdded: Placeholder[] = [];

for (const r of sizelessCandidates) {
  const e = llmBySku.get(r.sku);
  // manualOverride flag bypasses sanity check (user-confirmed value)
  const overrideOk = e?.manualOverride === true && e.extractedVolumeMl !== null;
  const llmHighConfOk =
    e !== undefined &&
    e.extractedVolumeMl !== null &&
    e.confidence >= HIGH_CONF &&
    llmSanityOk(r.name, e);

  if (overrideOk || llmHighConfOk) {
    nameExtractApplied.push({
      sku: r.sku,
      name: r.name,
      templateGroup: r.template_group,
      templateSubType: r.template_sub_type,
      extractedVolumeMl: Math.round(e!.extractedVolumeMl!),
      confidence: e!.confidence,
      reasoning: e!.manualOverride ? `[OVERRIDE] ${e!.reasoning}` : e!.reasoning,
      unitInName: e!.unitInName,
      manualOverride: e!.manualOverride === true,
    });
    continue;
  }

  if (e && e.extractedVolumeMl !== null && e.confidence >= REVIEW_CONF) {
    needsManualReview.push({
      sku: r.sku,
      name: r.name,
      templateGroup: r.template_group,
      templateSubType: r.template_sub_type,
      extractedVolumeMl: Math.round(e.extractedVolumeMl),
      confidence: e.confidence,
      reasoning: e.reasoning,
      unitInName: e.unitInName,
    });
  }

  // Placeholder for review/no-extraction
  placeholdersAdded.push({
    sku: r.sku,
    name: r.name,
    brand: r.brand ?? '',
    templateGroup: r.template_group,
    templateSubType: r.template_sub_type,
  });
}

// ─────────────────────────────────────────────────────────────────
// Audit JSON
// ─────────────────────────────────────────────────────────────────

const audit = {
  generatedAt: new Date().toISOString(),
  mode: MODE_DRY ? 'dry-run' : 'commit',
  summary: {
    totalTargets: rows.length,
    alreadyCanonical: alreadyCanonical.length,
    legacyConverted: legacyPlan.length,
    legacyParseFailed: legacyParseFailed.length,
    nameExtractedHighConf: nameExtractApplied.length,
    nameExtractedReview: needsManualReview.length,
    placeholderAdded: placeholdersAdded.length,
    conflicts: conflicts.length,
  },
  legacyConversions: legacyPlan,
  legacyParseFailed,
  nameExtracted: nameExtractApplied,
  needsManualReview,
  placeholdersAdded,
  alreadyCanonical,
  conflicts,
};

writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2), 'utf8');
console.log(`✓ Audit JSON yazıldı: ${AUDIT_PATH}`);

// ─────────────────────────────────────────────────────────────────
// CSV exports
// ─────────────────────────────────────────────────────────────────

writeCsv(
  APPLIED_CSV,
  ['sku', 'name', 'templateGroup', 'templateSubType', 'extractedVolumeMl', 'confidence', 'manualOverride', 'reasoning', 'unitInName'],
  nameExtractApplied.map((a) => [
    a.sku, a.name, a.templateGroup, a.templateSubType ?? '',
    String(a.extractedVolumeMl), a.confidence.toFixed(2),
    a.manualOverride ? 'true' : 'false',
    a.reasoning, a.unitInName ?? '',
  ]),
);
console.log(`✓ Applied CSV: ${APPLIED_CSV} (${nameExtractApplied.length} satır)`);

const dataEntryRows: string[][] = [];
for (const p of placeholdersAdded) {
  const review = needsManualReview.find((r) => r.sku === p.sku);
  dataEntryRows.push([
    p.sku, p.name, p.brand, p.templateGroup, p.templateSubType ?? '',
    review ? String(review.extractedVolumeMl) : '',
    review ? review.confidence.toFixed(2) : '',
    review ? review.reasoning : '',
    review ? 'manual_review' : 'no_size_in_name',
  ]);
}
writeCsv(
  NEEDS_DATA_ENTRY_CSV,
  ['sku', 'name', 'brand', 'templateGroup', 'templateSubType', 'suggestedVolumeMl', 'confidence', 'reasoning', 'status'],
  dataEntryRows,
);
console.log(`✓ Data-entry CSV: ${NEEDS_DATA_ENTRY_CSV} (${dataEntryRows.length} satır)`);

// ─────────────────────────────────────────────────────────────────
// COMMIT
// ─────────────────────────────────────────────────────────────────

if (MODE_DRY) {
  console.log('\n✓ DRY-RUN tamamlandı. DB değişmedi.');
  console.log(`  legacy convert: ${legacyPlan.length}`);
  console.log(`  name-extract apply: ${nameExtractApplied.length}`);
  console.log(`  placeholder: ${placeholdersAdded.length}`);
  if (conflicts.length > 0) console.warn(`  ⚠ conflicts: ${conflicts.length} (review audit)`);
  if (legacyParseFailed.length > 0) console.warn(`  ⚠ legacy parse failed: ${legacyParseFailed.length} (review audit)`);
  await sql.end();
  process.exit(0);
}

if (!MODE_COMMIT) {
  // Should not reach here.
  await sql.end();
  process.exit(0);
}

console.log('\n✓ COMMIT mode — DB UPDATE başlıyor...');

let updates = 0;

// (a) Legacy conversion: drop legacy keys, set volume_ml
for (const c of legacyPlan) {
  await sql`
    UPDATE products
    SET specs = (specs - 'weight_kg' - 'weight_g' - 'volume_lt' - 'volume')
                || jsonb_build_object('volume_ml', ${c.after}::numeric)
    WHERE sku = ${c.sku}
  `;
  updates++;
}
console.log(`  ✓ Legacy convert: ${legacyPlan.length} update`);

// (b) Name-extracted high-conf
for (const a of nameExtractApplied) {
  await sql`
    UPDATE products
    SET specs = specs || jsonb_build_object('volume_ml', ${a.extractedVolumeMl}::numeric)
    WHERE sku = ${a.sku}
  `;
  updates++;
}
console.log(`  ✓ Name-extract apply: ${nameExtractApplied.length} update`);

// (c) Placeholder null
for (const p of placeholdersAdded) {
  await sql`
    UPDATE products
    SET specs = specs || jsonb_build_object('volume_ml', null::text::jsonb)
    WHERE sku = ${p.sku}
  `;
  updates++;
}
console.log(`  ✓ Placeholder: ${placeholdersAdded.length} update`);

console.log(`\n✓ Toplam ${updates} satır güncellendi`);

// Verify coverage
const verify = await sql.unsafe(`
  SELECT
    COUNT(*) FILTER (WHERE specs ? 'volume_ml')::int AS has_key,
    COUNT(*)::int AS total
  FROM products
  WHERE ${TARGETS_SQL}
`) as unknown as { has_key: number; total: number }[];
console.log(`✓ Coverage check: ${verify[0].has_key}/${verify[0].total} SKU has volume_ml key`);

await sql.end();
