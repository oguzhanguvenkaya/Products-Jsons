// Phase 1.1.11 Faz A — Brand sayfa scraping + PDF copy
//
// 37 URL → defuddle parse → scripts/audit/raw-pages/<sku>.md
// 3 MENZERNA PDF → cp → scripts/audit/raw-pages/<sku>.pdf
// Audit özet: scripts/audit/_collect-summary.json
//
// Çalıştırma: cd retrieval-service && bun run scripts/phase-1-1-11-collect-sources.ts
import { mkdirSync, writeFileSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';

interface UrlMapping {
  sku: string;
  url: string;
  group: string;
  brand: string;
  pdf?: string; // mutlak path
}

const PDF_BASE = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons';

const MAPPINGS: UrlMapping[] = [
  // paint_protection_quick (19)
  { sku: '79301', url: 'https://en.innovacar.it/products/pulitore-protettivo-e-lucidante-auto-w1-quick-detailer', group: 'paint_protection_quick', brand: 'INNOVACAR' },
  { sku: '700097', url: 'https://en.innovacar.it/products/sigillante-spray-nanotecnologico-auto-sc0-hydro-sealant', group: 'paint_protection_quick', brand: 'INNOVACAR' },
  { sku: '700096', url: 'https://en.innovacar.it/products/sigillante-nanotecnologico-carrozzeria-auto-sc1-sealant', group: 'paint_protection_quick', brand: 'INNOVACAR' },
  { sku: '79304', url: 'https://en.innovacar.it/products/trattamento-idrorepellente-auto-h20-coat', group: 'paint_protection_quick', brand: 'INNOVACAR' },
  { sku: 'Q2M-PPFMR500M', url: 'https://gyeon.co/product/ppf-maintain-redefined/', group: 'paint_protection_quick', brand: 'GYEON' },
  { sku: 'Q2M-CDYA1000M', url: 'https://gyeon.co/product/ceramicdetailer/', group: 'paint_protection_quick', brand: 'GYEON' },
  { sku: 'Q2M-CRYA250M', url: 'https://gyeon.co/product/cure-redefined/', group: 'paint_protection_quick', brand: 'GYEON' },
  { sku: 'Q2M-CMR500M', url: 'https://gyeon.co/product/cure-matte-redefined/', group: 'paint_protection_quick', brand: 'GYEON' },
  { sku: 'Q2-QV120M', url: 'https://gyeon.co/product/quickview/', group: 'paint_protection_quick', brand: 'GYEON' },
  { sku: 'Q2M-QDYA1000M', url: 'https://gyeon.co/product/quickdetailer/', group: 'paint_protection_quick', brand: 'GYEON' },
  { sku: 'Q2M-WCYA4000M', url: 'https://gyeon.co/product/wetcoat/', group: 'paint_protection_quick', brand: 'GYEON' },
  { sku: '22870.261.001', url: 'https://www.menzerna.com/car-care/car-polish/products/details/sealing-wax-protection', group: 'paint_protection_quick', brand: 'MENZERNA', pdf: `${PDF_BASE}/sealingwax.pdf` },
  { sku: '22070.261.001', url: 'https://www.menzerna.com/car-care/car-polish/products/details/power-lock-ultimate-protection', group: 'paint_protection_quick', brand: 'MENZERNA', pdf: `${PDF_BASE}/powerlock.pdf` },
  { sku: '26919.271.001', url: 'https://www.menzerna.com/car-care/car-polish/products/details/ceramic-spray-sealant', group: 'paint_protection_quick', brand: 'MENZERNA', pdf: `${PDF_BASE}/ceramic_spray_sealant.pdf` },
  { sku: '74059', url: 'https://shop.fra-ber.it/en/products/cera-ceramica-per-auto-professionale-lustrawax', group: 'paint_protection_quick', brand: 'FRA-BER' },
  { sku: '74062', url: 'https://shop.fra-ber.it/en/products/cera-liquida-nanotecnologica-per-auto-nanotech', group: 'paint_protection_quick', brand: 'FRA-BER' },
  { sku: '75182', url: 'https://shop.fra-ber.it/en/products/cera-spray-per-auto-e-polish-lucidante-lustratouch', group: 'paint_protection_quick', brand: 'FRA-BER' },
  { sku: '75016', url: 'https://shop.fra-ber.it/en/products/lucidante-auto-per-lavaggio-auto-waterless-e-a-secco-lustradry', group: 'paint_protection_quick', brand: 'FRA-BER' },
  { sku: 'Q2-W175G', url: 'https://gyeon.co/product/wax/', group: 'paint_protection_quick', brand: 'GYEON' },

  // ceramic_coating (17)
  { sku: 'Q2-PC100M', url: 'https://gyeon.co/product/q2-purify-coat/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-OLE100M', url: 'https://gyeon.co/product/one-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-MLE100M', url: 'https://gyeon.co/product/mohs-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-PLE50M', url: 'https://gyeon.co/product/pure-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-SLE50M', url: 'https://gyeon.co/product/syncro-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-CCE200M', url: 'https://gyeon.co/product/cancoat-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-MTEL50M', url: 'https://gyeon.co/product/matte-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-PPFE50M', url: 'https://gyeon.co/product/ppf-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-TRE30M', url: 'https://gyeon.co/product/trim-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-RE30M', url: 'https://gyeon.co/product/rim-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-LSE50M', url: 'https://gyeon.co/product/leathershield-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-AF120M', url: 'https://gyeon.co/product/antifog/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'Q2-VE20M', url: 'https://gyeon.co/product/view-evo/', group: 'ceramic_coating', brand: 'GYEON' },
  { sku: 'MXP-DPCN50KS', url: 'https://mtskimya.com/dis-yuzey/seramik-kaplama-urunleri/seramik-kaplamalar/prd-mts-kimya-mx-pro-diamond-plus-seramik-kaplama-50ml-kutu-set-5876', group: 'ceramic_coating', brand: 'MX-PRO' },
  { sku: 'MXP-CCN50KS', url: 'https://mtskimya.com/dis-yuzey/seramik-kaplama-urunleri/seramik-kaplamalar/prd-mts-kimya-mx-pro-crystal-seramik-kaplama-50ml-kutu-set', group: 'ceramic_coating', brand: 'MX-PRO' },
  { sku: 'MXP-HC50KS', url: 'https://mtskimya.com/dis-yuzey/seramik-kaplama-urunleri/seramik-kaplamalar/prd-mts-kimya-mx-pro-hydro-seramik-kaplama-30ml-kutu-set', group: 'ceramic_coating', brand: 'MX-PRO' },
  { sku: '79296', url: 'https://en.innovacar.it/products/trattamento-nanotecnologico-vetri-auto-sc3-glass-sealant', group: 'ceramic_coating', brand: 'INNOVACAR' },

  // interior_cleaner (1, sadece raw scrape — analiz Phase 1.1.12)
  { sku: 'Q2M-PM500M', url: 'https://gyeon.co/product/q2m-purify-maintain/', group: 'interior_cleaner', brand: 'GYEON' },
];

const OUT_DIR = 'scripts/audit/raw-pages';
mkdirSync(OUT_DIR, { recursive: true });

function postProcess(md: string): string {
  // Image markdown link'lerini çıkar (ürün özelliklerinden değil, gallery için)
  let cleaned = md.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  // Linkleri sade text'e çevir (URL göstermek için): [text](url) → text (url temizlemek opsiyonel)
  // Şimdilik linkleri tut — subagent için faydalı
  // Birden fazla boş satırı tek satıra düşür
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // Baştaki/sondaki whitespace
  return cleaned.trim() + '\n';
}

interface SummaryEntry {
  sku: string;
  url: string;
  group: string;
  md_path: string;
  md_kb: number;
  md_lines: number;
  pdf_path?: string;
  pdf_kb?: number;
  status: 'ok' | 'failed';
  error?: string;
}

const summary: SummaryEntry[] = [];

console.log(`Faz A — ${MAPPINGS.length} URL scrape ediliyor...\n`);

for (let i = 0; i < MAPPINGS.length; i++) {
  const m = MAPPINGS[i];
  const mdPath = `${OUT_DIR}/${m.sku}.md`;
  const progress = `[${i + 1}/${MAPPINGS.length}]`;

  try {
    process.stdout.write(`${progress} ${m.sku} (${m.brand})... `);
    const raw = execSync(`defuddle parse "${m.url}" --md`, {
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const cleaned = postProcess(raw);
    writeFileSync(mdPath, cleaned);
    const stat = statSync(mdPath);
    const kb = Math.round(stat.size / 1024);
    const lines = cleaned.split('\n').length;

    const entry: SummaryEntry = {
      sku: m.sku,
      url: m.url,
      group: m.group,
      md_path: mdPath,
      md_kb: kb,
      md_lines: lines,
      status: 'ok',
    };

    if (m.pdf) {
      if (existsSync(m.pdf)) {
        const pdfDest = `${OUT_DIR}/${m.sku}.pdf`;
        copyFileSync(m.pdf, pdfDest);
        entry.pdf_path = pdfDest;
        entry.pdf_kb = Math.round(statSync(pdfDest).size / 1024);
      } else {
        console.log(`(PDF EKSIK: ${m.pdf}) `);
      }
    }

    summary.push(entry);
    console.log(`✓ ${kb}KB ${lines} satır${entry.pdf_kb ? ` + PDF ${entry.pdf_kb}KB` : ''}`);
  } catch (e: any) {
    summary.push({
      sku: m.sku,
      url: m.url,
      group: m.group,
      md_path: mdPath,
      md_kb: 0,
      md_lines: 0,
      status: 'failed',
      error: e.message?.slice(0, 200),
    });
    console.log(`✗ HATA: ${e.message?.slice(0, 100)}`);
  }
}

writeFileSync(
  'scripts/audit/_collect-summary.json',
  JSON.stringify(summary, null, 2),
);

const okCount = summary.filter((s) => s.status === 'ok').length;
const failCount = summary.filter((s) => s.status === 'failed').length;
const pdfCount = summary.filter((s) => s.pdf_path).length;

console.log(`\n========================================`);
console.log(`Faz A tamamlandı`);
console.log(`========================================`);
console.log(`✓ Başarılı: ${okCount}/${MAPPINGS.length}`);
console.log(`✗ Başarısız: ${failCount}`);
console.log(`PDF kopyalandı: ${pdfCount}`);
console.log(`Özet: scripts/audit/_collect-summary.json`);
console.log(`Çıktı: scripts/audit/raw-pages/`);

if (failCount > 0) {
  console.log(`\n⚠️ ${failCount} URL başarısız — _collect-summary.json'da error mesajları`);
  process.exit(1);
}

process.exit(0);
