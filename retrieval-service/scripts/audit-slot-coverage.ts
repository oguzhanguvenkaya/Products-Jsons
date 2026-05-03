// Phase 1.1.14D-mini — Slot Extractor Coverage Audit
//
// Bot prompt'ta yazan Türkçe → canonical mapping satırlarını grep eder,
// her phrase için slotExtractor.extractSlots() çağırır, DB ve tool schema
// ile karşılaştırır, markdown coverage raporu üretir.
//
// Çıktı: docs/prompt-slot-extractor-coverage-2026-05-04.md
//
// Kullanım:
//   bun run scripts/audit-slot-coverage.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { extractSlots } from '../src/lib/slotExtractor.ts';
import { TEMPLATE_GROUPS } from '../src/types.ts';
import { sql } from '../src/lib/db.ts';

const ROOT = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons';
const SOURCES = [
  `${ROOT}/Botpress/detailagent-ms/src/tools/search-products.ts`,
  `${ROOT}/Botpress/detailagent-ms/src/conversations/index.ts`,
];
const OUT = `${ROOT}/docs/prompt-slot-extractor-coverage-2026-05-04.md`;

interface Mapping {
  source: string;
  line: number;
  rawLine: string;
  phrases: string[];        // Türkçe ifade (slash'la ayrılmış varyantlar)
  expectedCanonical: string; // promptun verdiği canonical (templateGroup veya sub_type)
  expectedSubType?: string;
}

// 1) Prompt'tan mapping satırlarını grep et
function parseMappings(): Mapping[] {
  const out: Mapping[] = [];
  for (const path of SOURCES) {
    const text = readFileSync(path, 'utf-8');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      // Pattern A: "• 'phrase[/phrase2]' → canonical [+ templateSubType='X']"
      // Pattern B: "- \"phrase\" → \`templateGroup=X\`" (instruction için)
      // Pattern C: "- 'phrase' → canonical"
      const patternA = /['\"]([^'\"]+)['\"][\s]*[→\->]+[\s]*([a-z_]+)(?:[\s\+]+templateSubType[=:]?\s*['\"]?([a-z_]+))?/i;
      const m = ln.match(patternA);
      if (m && m[1] && m[2]) {
        const phrasesRaw = m[1].trim();
        const phrases = phrasesRaw.split('/').map(s => s.trim()).filter(s => s.length > 1);
        out.push({
          source: path.split('/').slice(-2).join('/'),
          line: i + 1,
          rawLine: ln.trim().slice(0, 200),
          phrases,
          expectedCanonical: m[2].trim(),
          expectedSubType: m[3]?.trim(),
        });
      }
    }
  }
  return out;
}

// 2) Tool schema'yı (TEMPLATE_GROUPS array) kontrol
function inToolSchema(canonical: string): boolean {
  return (TEMPLATE_GROUPS as readonly string[]).includes(canonical);
}

// 3) DB'den distinct template_group + template_sub_type
async function getDbCanonicals(): Promise<{ groups: Set<string>; subTypes: Set<string> }> {
  const groups = new Set<string>();
  const subTypes = new Set<string>();
  const gRows = await sql<{ template_group: string }[]>`SELECT DISTINCT template_group FROM products WHERE template_group IS NOT NULL`;
  for (const r of gRows) groups.add(r.template_group);
  const sRows = await sql<{ template_sub_type: string }[]>`SELECT DISTINCT template_sub_type FROM products WHERE template_sub_type IS NOT NULL`;
  for (const r of sRows) subTypes.add(r.template_sub_type);
  return { groups, subTypes };
}

// 4) Her mapping için slot coverage check
interface Result {
  m: Mapping;
  perPhrase: Array<{
    phrase: string;
    slotResult: { templateGroup?: string; templateSubType?: string };
    coversExpected: boolean;
  }>;
  expectedInDbGroup: boolean;
  expectedInDbSubType: boolean;
  expectedInToolSchema: boolean;
}

async function run() {
  console.log('[audit] Loading mappings from prompts...');
  const mappings = parseMappings();
  console.log(`[audit] Found ${mappings.length} mapping lines\n`);

  console.log('[audit] Loading DB canonicals...');
  const { groups: dbGroups, subTypes: dbSubTypes } = await getDbCanonicals();
  console.log(`[audit] DB: ${dbGroups.size} template_groups, ${dbSubTypes.size} sub_types\n`);

  console.log('[audit] Running slot extractor on each phrase...');
  const results: Result[] = [];
  for (const m of mappings) {
    const perPhrase = m.phrases.map(p => {
      const slot = extractSlots(p);
      // Doğru kapsama mantığı:
      // - Eğer prompt SUB_TYPE bekliyorsa → slot sub_type tam eşleşmeli
      // - Eğer prompt sadece GROUP bekliyorsa → slot group eşleşmeli
      //   (sub_type döndürmesi BONUS, gap değil)
      let covers = false;
      if (m.expectedSubType) {
        covers = slot.templateSubType === m.expectedSubType;
      } else {
        covers = slot.templateGroup === m.expectedCanonical;
      }
      return {
        phrase: p,
        slotResult: { templateGroup: slot.templateGroup, templateSubType: slot.templateSubType },
        coversExpected: covers,
      };
    });
    results.push({
      m,
      perPhrase,
      expectedInDbGroup: dbGroups.has(m.expectedCanonical),
      expectedInDbSubType: m.expectedSubType ? dbSubTypes.has(m.expectedSubType) : false,
      expectedInToolSchema: inToolSchema(m.expectedCanonical),
    });
  }

  // 5) Markdown rapor
  const lines: string[] = [];
  lines.push('# Slot Extractor Coverage Audit — Phase 1.1.14D-mini');
  lines.push('');
  lines.push(`**Tarih:** 2026-05-04`);
  lines.push(`**Kaynak:** ${SOURCES.length} prompt dosyası`);
  lines.push(`**Mapping sayısı:** ${mappings.length}`);
  lines.push(`**DB:** ${dbGroups.size} template_group, ${dbSubTypes.size} sub_type`);
  lines.push('');

  // Özet sayım
  const totalPhrases = results.reduce((acc, r) => acc + r.perPhrase.length, 0);
  const coveredPhrases = results.reduce((acc, r) => acc + r.perPhrase.filter(p => p.coversExpected).length, 0);
  lines.push(`## Özet`);
  lines.push('');
  lines.push(`- Toplam phrase: **${totalPhrases}**`);
  lines.push(`- Slot extractor ile **kapsanan**: ${coveredPhrases} (${(100 * coveredPhrases / totalPhrases).toFixed(1)}%)`);
  lines.push(`- **Kapsanmayan (GAP):** ${totalPhrases - coveredPhrases}`);
  lines.push('');

  // Detay tablo
  lines.push(`## Detay Tablo`);
  lines.push('');
  lines.push('| # | Source:Line | Phrase | Beklenen canonical | slotExtractor sonuç | Coverage | DB var? | Tool schema? | Karar |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  let idx = 0;
  for (const r of results) {
    for (const p of r.perPhrase) {
      idx++;
      const expected = r.m.expectedSubType
        ? `${r.m.expectedCanonical}/${r.m.expectedSubType}`
        : r.m.expectedCanonical;
      const slotStr = p.slotResult.templateSubType
        ? `${p.slotResult.templateGroup}/${p.slotResult.templateSubType}`
        : (p.slotResult.templateGroup || '∅');
      const cov = p.coversExpected ? '✅' : '❌';
      const dbCheck = r.m.expectedSubType
        ? (r.expectedInDbSubType ? '✅' : '❌')
        : (r.expectedInDbGroup ? '✅' : '❌');
      const toolCheck = r.expectedInToolSchema ? '✅' : '⚠️';
      const decision = p.coversExpected
        ? '**REMOVE** (slot extractor zaten kapsıyor)'
        : '**KEEP** (slot extractor kapsamıyor — promptta tut)';
      lines.push(`| ${idx} | \`${r.m.source}:${r.m.line}\` | \`${p.phrase}\` | \`${expected}\` | \`${slotStr}\` | ${cov} | ${dbCheck} | ${toolCheck} | ${decision} |`);
    }
  }

  // GAP listesi
  lines.push('');
  lines.push(`## Coverage Gap'leri (REMOVE edilemez — promptta kalır)`);
  lines.push('');
  for (const r of results) {
    for (const p of r.perPhrase) {
      if (!p.coversExpected) {
        const expected = r.m.expectedSubType
          ? `${r.m.expectedCanonical}/${r.m.expectedSubType}`
          : r.m.expectedCanonical;
        lines.push(`- \`${p.phrase}\` → beklenen \`${expected}\`, slot çıkardı: \`${JSON.stringify(p.slotResult)}\``);
      }
    }
  }

  writeFileSync(OUT, lines.join('\n'));
  console.log(`\n[audit] DONE — coverage: ${coveredPhrases}/${totalPhrases} = ${(100 * coveredPhrases / totalPhrases).toFixed(1)}%`);
  console.log(`[audit] Rapor: ${OUT}`);
  await sql.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
