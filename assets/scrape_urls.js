#!/usr/bin/env node

/**
 * URL Scraper - Tüm ürün URL'lerini kazıyıp raw data olarak kaydeder
 * Verification/enrichment YOK - sadece ham veri kaydetme
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons';
const SCRAPED = path.join(BASE, 'agents/scraped_data');
const BY_SKU = path.join(SCRAPED, 'by_sku');
const BY_URL = path.join(SCRAPED, 'by_url');
const PROGRESS_FILE = path.join(SCRAPED, 'scrape_progress.json');
const LOG_FILE = path.join(SCRAPED, 'scrape_log.txt');

const DELAY_MS = 1500;
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

// ===== CSV Parser (handles multiline quoted fields) =====
function parseCSV(text, delimiter = ',') {
  const records = [];
  let fields = [];
  let field = '';
  let inQuotes = false;

  // Remove BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        fields.push(field.trim());
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
        fields.push(field.trim());
        if (fields.some(f => f)) records.push(fields);
        fields = [];
        field = '';
      } else {
        field += c;
      }
    }
  }

  // Last record
  fields.push(field.trim());
  if (fields.some(f => f)) records.push(fields);

  return records;
}

// ===== Extract URLs from a text field =====
function extractUrls(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/https?:\/\/[^\s,"]+/g) || [];
  return matches.map(u => u.replace(/[;,\s]+$/, '').trim()).filter(u => u.length > 10);
}

// ===== Domain extraction =====
function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch { return 'unknown'; }
}

// ===== Sanitize for filename =====
function sanitizeFilename(str) {
  return str.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50);
}

// ===== HTML to basic text/markdown =====
function htmlToText(html) {
  if (!html) return '';
  let text = html;
  // Remove scripts, styles, head, nav, footer
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  // Headings
  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (m, level, content) => {
    return '\n' + '#'.repeat(parseInt(level)) + ' ' + content.replace(/<[^>]+>/g, '').trim() + '\n';
  });
  // Paragraphs, divs
  text = text.replace(/<\/(p|div|section|article|tr)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Lists
  text = text.replace(/<li[^>]*>/gi, '\n- ');
  text = text.replace(/<\/li>/gi, '');
  // Tables
  text = text.replace(/<t[hd][^>]*>/gi, ' | ');
  // Bold
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  // Italic
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  // Links - preserve URL
  text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  // Images - preserve src
  text = text.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![image]($1)');
  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#(\d+);/g, (m, code) => String.fromCharCode(parseInt(code)));
  text = text.replace(/&\w+;/g, ' ');
  // Clean whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n[ \t]+/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

// ===== Extract page title =====
function extractTitle(html) {
  if (!html) return '';
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

// ===== Detect page structure =====
function detectStructure(html) {
  if (!html) return { has_specs_table: false, has_description: false, has_faq: false, has_related_products: false, has_reviews: false };
  return {
    has_specs_table: /<table/i.test(html) && /spec|feature|detail|property|characteristic|technical/i.test(html),
    has_description: /description|overview|about.*product|product.*detail/i.test(html),
    has_faq: /faq|frequently.asked|question.*answer/i.test(html),
    has_related_products: /related.*product|similar|also.*bought|you.*may|recommend/i.test(html),
    has_reviews: /review|rating|star|testimonial|customer.*feedback/i.test(html)
  };
}

// ===== Detect language =====
function detectLanguage(html) {
  if (!html) return 'unknown';
  const langMatch = html.match(/<html[^>]*\slang=["']?([a-z]{2})/i);
  if (langMatch) return langMatch[1].toLowerCase();
  const metaMatch = html.match(/content-language[^>]*content=["']([a-z]{2})/i);
  if (metaMatch) return metaMatch[1].toLowerCase();
  // Heuristic
  if (/ü|ö|ş|ç|ğ|ı/i.test(html.substring(0, 5000))) return 'tr';
  if (/ä|ö|ü|ß/i.test(html.substring(0, 5000)) && !/ş|ğ|ı/.test(html.substring(0, 5000))) return 'de';
  return 'en';
}

// ===== Fetch URL with timeout and retries =====
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const startTime = Date.now();
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5,tr;q=0.3'
        },
        redirect: 'follow'
      });
      clearTimeout(timer);
      const duration = Date.now() - startTime;

      const html = await response.text();

      return {
        success: true,
        html,
        status: response.status,
        contentType: response.headers.get('content-type') || '',
        contentLength: html.length,
        finalUrl: response.url,
        duration
      };
    } catch (err) {
      if (attempt === retries) {
        return {
          success: false,
          error: err.message,
          html: null,
          status: 0,
          duration: 0
        };
      }
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

// ===== Load barcode → SKU mapping =====
function loadBarcodeToSku() {
  const csv = fs.readFileSync(path.join(BASE, 'Products_with_barcode.csv'), 'utf8');
  const records = parseCSV(csv, ';');
  const header = records[0].map(h => h.toLowerCase());
  const skuIdx = header.findIndex(h => h.includes('stokkodu'));
  const barcodeIdx = header.findIndex(h => h.includes('barkodu'));

  const barcodeToSku = {};
  const allSkus = new Set();

  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    const sku = r[skuIdx]?.trim();
    const barcode = r[barcodeIdx]?.trim();
    if (sku) {
      allSkus.add(sku);
      if (barcode) barcodeToSku[barcode] = sku;
    }
  }
  return { barcodeToSku, allSkus };
}

// ===== Load URL data from URLs_merged.csv =====
function loadUrlData(barcodeToSku, allSkus) {
  const csv = fs.readFileSync(path.join(BASE, 'URLs_merged.csv'), 'utf8');
  const records = parseCSV(csv, ',');

  // Group URLs by SKU
  const skuMap = {}; // sku → { name, barcode, urls: Set }

  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    if (!r || r.length < 2) continue;

    const name = r[0] || '';
    const barcode = (r[1] || '').trim();

    if (!barcode) {
      log(`  ⚠ Line ${i + 1}: No barcode/SKU - "${name.substring(0, 50)}"`);
      continue;
    }

    // Determine SKU
    let sku = null;
    // 1. Try barcode mapping
    if (barcodeToSku[barcode]) {
      sku = barcodeToSku[barcode];
    }
    // 2. Check if barcode value is itself a known SKU
    else if (allSkus.has(barcode)) {
      sku = barcode;
    }
    // 3. If contains letters, likely a SKU even if not in our DB
    else if (/[a-zA-Z]/.test(barcode)) {
      sku = barcode;
    }
    // 4. Pure numeric - might be a barcode with no mapping
    else {
      // Try as-is, log warning
      sku = barcode;
      log(`  ⚠ No SKU mapping for numeric barcode: ${barcode} (${name.substring(0, 40)})`);
    }

    // Collect all URLs from this row
    const rowUrls = [];

    // URL column (index 3) - may contain multiple URLs
    if (r[3]) rowUrls.push(...extractUrls(r[3]));
    // URL 1-5 (indices 4-8)
    for (let j = 4; j <= 8 && j < r.length; j++) {
      if (r[j]) rowUrls.push(...extractUrls(r[j]));
    }

    if (rowUrls.length === 0) continue;

    // Merge into SKU group
    if (!skuMap[sku]) {
      skuMap[sku] = { name, barcode, urls: new Set() };
    }
    for (const u of rowUrls) {
      skuMap[sku].urls.add(u);
    }
  }

  // Convert to array
  const products = Object.entries(skuMap).map(([sku, data]) => ({
    sku,
    name: data.name,
    barcode: data.barcode,
    urls: [...data.urls]
  }));

  return products;
}

// ===== Progress tracking =====
function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return { completed: {}, failed: {}, stats: { total_urls: 0, scraped: 0, failed: 0, skipped: 0 } };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ===== Logging =====
function log(msg) {
  const ts = new Date().toISOString().substring(11, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

// ===== Main =====
async function main() {
  // Create directories
  fs.mkdirSync(BY_SKU, { recursive: true });
  fs.mkdirSync(BY_URL, { recursive: true });

  log('========================================');
  log('=== URL SCRAPING STARTED ===');
  log('========================================');

  // Load mappings
  log('Loading barcode → SKU mapping...');
  const { barcodeToSku, allSkus } = loadBarcodeToSku();
  log(`  ${Object.keys(barcodeToSku).length} barcode mappings, ${allSkus.size} known SKUs`);

  // Load URL data
  log('Loading URL data from URLs_merged.csv...');
  const products = loadUrlData(barcodeToSku, allSkus);
  log(`  ${products.length} unique products with URLs`);

  const totalUrls = products.reduce((sum, p) => sum + p.urls.length, 0);
  log(`  Total unique URLs to scrape: ${totalUrls}`);

  // Load progress for resume
  const progress = loadProgress();
  const prevCompleted = Object.keys(progress.completed).length;
  if (prevCompleted > 0) {
    log(`  Resuming: ${prevCompleted} URLs already scraped`);
  }

  let scraped = 0;
  let failed = 0;
  let skipped = 0;

  for (let pi = 0; pi < products.length; pi++) {
    const product = products[pi];
    const skuDir = path.join(BY_SKU, product.sku);
    fs.mkdirSync(skuDir, { recursive: true });

    log(`\n━━━ [${pi + 1}/${products.length}] SKU: ${product.sku} ━━━`);
    log(`  Product: ${product.name.substring(0, 60)}`);
    log(`  URLs: ${product.urls.length}`);

    const urlResults = [];

    for (let ui = 0; ui < product.urls.length; ui++) {
      const url = product.urls[ui];
      const urlKey = `${product.sku}::${url}`;
      const domain = getDomain(url);
      const safeDomain = sanitizeFilename(domain);

      // Skip if already scraped
      if (progress.completed[urlKey]) {
        skipped++;
        // Load existing result for merge file
        const existingFile = path.join(skuDir, `url_${ui}_${safeDomain}.json`);
        try {
          urlResults.push(JSON.parse(fs.readFileSync(existingFile, 'utf8')));
        } catch {}
        continue;
      }

      log(`  [${ui + 1}/${product.urls.length}] ${domain} ...`);

      const result = await fetchWithRetry(url);

      if (result.success && result.html) {
        const pageTitle = extractTitle(result.html);
        const rawText = htmlToText(result.html);
        const language = detectLanguage(result.html);
        const structure = detectStructure(result.html);

        const scrapeData = {
          metadata: {
            sku: product.sku,
            product_name: product.name,
            barcode: product.barcode,
            url: url,
            url_index: ui,
            domain: domain,
            scraped_at: new Date().toISOString(),
            scrape_duration_ms: result.duration,
            http_status: result.status,
            content_type: result.contentType,
            content_length_bytes: result.contentLength,
            final_url: result.finalUrl !== url ? result.finalUrl : null
          },
          content: {
            language_detected: language,
            page_title: pageTitle,
            raw_markdown: rawText,
            page_structure: structure
          },
          processing_notes: {
            warnings: [],
            errors: [],
            raw_html_file: `url_${ui}_${safeDomain}.html`
          }
        };

        // Save JSON metadata + text content
        const jsonFile = path.join(skuDir, `url_${ui}_${safeDomain}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(scrapeData, null, 2));

        // Save raw HTML separately
        const htmlFile = path.join(skuDir, `url_${ui}_${safeDomain}.html`);
        fs.writeFileSync(htmlFile, result.html);

        // URL cache (by_url)
        const urlHash = crypto.createHash('md5').update(url).digest('hex');
        const domainDir = path.join(BY_URL, safeDomain);
        fs.mkdirSync(domainDir, { recursive: true });
        const cacheFile = path.join(domainDir, `${urlHash}.json`);
        // If cache exists, add SKU to used_by_skus
        let cacheData = { url, url_hash: urlHash, first_scraped_at: new Date().toISOString(), used_by_skus: [] };
        try {
          const existing = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          cacheData = existing;
        } catch {}
        if (!cacheData.used_by_skus.includes(product.sku)) {
          cacheData.used_by_skus.push(product.sku);
        }
        cacheData.last_scraped_at = new Date().toISOString();
        cacheData.file_ref = `by_sku/${product.sku}/url_${ui}_${safeDomain}.json`;
        fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));

        urlResults.push(scrapeData);
        progress.completed[urlKey] = { at: new Date().toISOString(), file: `url_${ui}_${safeDomain}.json` };
        scraped++;

        const textLen = rawText.length;
        log(`    ✓ ${result.status} | ${language} | ${textLen} chars | ${result.duration}ms | "${pageTitle.substring(0, 50)}"`);
      } else {
        // Save failure record
        const errorData = {
          metadata: {
            sku: product.sku,
            url: url,
            url_index: ui,
            domain: domain,
            scraped_at: new Date().toISOString(),
            http_status: result.status,
            error: result.error
          },
          content: null,
          processing_notes: {
            errors: [result.error]
          }
        };

        const jsonFile = path.join(skuDir, `url_${ui}_${safeDomain}_FAILED.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(errorData, null, 2));

        progress.failed[urlKey] = { at: new Date().toISOString(), error: result.error };
        failed++;

        log(`    ✗ FAILED: ${result.error}`);
      }

      // Save progress after each URL
      progress.stats = { total_urls: totalUrls, scraped, failed, skipped, last_update: new Date().toISOString() };
      saveProgress(progress);

      // Rate limit
      await new Promise(r => setTimeout(r, DELAY_MS));
    }

    // Save merged summary for this SKU
    if (urlResults.length > 0) {
      const merged = {
        sku: product.sku,
        product_name: product.name,
        barcode: product.barcode,
        total_urls_attempted: product.urls.length,
        successful_scrapes: urlResults.length,
        failed_scrapes: product.urls.length - urlResults.length,
        scraped_at: new Date().toISOString(),
        sources: urlResults.map(r => ({
          url: r.metadata.url,
          domain: r.metadata.domain,
          language: r.content?.language_detected || 'unknown',
          page_title: r.content?.page_title || '',
          content_length: r.content?.raw_markdown?.length || 0,
          has_specs: r.content?.page_structure?.has_specs_table || false,
          has_description: r.content?.page_structure?.has_description || false,
          has_faq: r.content?.page_structure?.has_faq || false,
          has_reviews: r.content?.page_structure?.has_reviews || false,
          has_related: r.content?.page_structure?.has_related_products || false
        }))
      };

      fs.writeFileSync(path.join(skuDir, '_scraped_merged.json'), JSON.stringify(merged, null, 2));
    }
  }

  // Final stats
  log('\n========================================');
  log('=== SCRAPING COMPLETE ===');
  log('========================================');
  log(`Products processed: ${products.length}`);
  log(`Total URLs: ${totalUrls}`);
  log(`Scraped successfully: ${scraped}`);
  log(`Failed: ${failed}`);
  log(`Skipped (already done): ${skipped}`);

  progress.stats = {
    total_products: products.length,
    total_urls: totalUrls,
    scraped,
    failed,
    skipped,
    completed_at: new Date().toISOString()
  };
  saveProgress(progress);

  // Save final summary
  const summary = {
    run_date: new Date().toISOString(),
    total_products: products.length,
    total_urls: totalUrls,
    scraped,
    failed,
    skipped,
    failed_urls: Object.entries(progress.failed).map(([key, val]) => ({
      sku: key.split('::')[0],
      url: key.split('::')[1],
      error: val.error
    })),
    products: products.map(p => ({
      sku: p.sku,
      name: p.name.substring(0, 60),
      url_count: p.urls.length,
      domains: p.urls.map(u => getDomain(u))
    }))
  };

  fs.writeFileSync(path.join(SCRAPED, 'scrape_summary.json'), JSON.stringify(summary, null, 2));
  log('Summary saved to agents/scraped_data/scrape_summary.json');
}

main().catch(err => {
  log(`FATAL ERROR: ${err.message}`);
  log(err.stack);
  process.exit(1);
});
