/**
 * Phase 1.1 — Build Gyeon products dump from data/csv/ (post-consolidation primary rows).
 *
 * Output: docs/gyeon-products-dump.json
 *   { count, products: [{primary_sku, product_name, base_name, barcode,
 *     variant_skus, template_group, template_sub_type, sub_cat, search_text_excerpt}] }
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, "..", "..", "..");
const CSV_DIR = resolve(PROJECT_ROOT, "data", "csv");
const OUT = resolve(import.meta.dirname ?? __dirname, "..", "docs", "gyeon-products-dump.json");

function readCsv(p: string): Record<string, string>[] {
  const raw = readFileSync(p, "utf-8").replace(/^\ufeff/, "");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

function main() {
  const master = readCsv(resolve(CSV_DIR, "products_master.csv"));
  const searchIdx = readCsv(resolve(CSV_DIR, "product_search_index.csv"));
  const sxBySku = new Map(searchIdx.map((r) => [r.sku, r.search_text || ""]));

  const gyeon = master.filter((r) => (r.brand || "").toUpperCase().trim() === "GYEON");

  const products = gyeon.map((r) => ({
    primary_sku: r.sku,
    product_name: r.product_name,
    base_name: r.base_name || null,
    barcode: r.barcode || null,
    variant_skus: r.variant_skus || r.sku,
    template_group: r.template_group,
    template_sub_type: r.template_sub_type,
    sub_cat: r.sub_cat || null,
    search_text_excerpt: (sxBySku.get(r.sku) || "").slice(0, 400),
  }));

  const out = { count: products.length, generated_at: new Date().toISOString(), products };
  writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log(`✅ wrote ${products.length} Gyeon primary products → ${OUT}`);

  // template_group breakdown
  const tg = new Map<string, number>();
  for (const p of products) tg.set(p.template_group, (tg.get(p.template_group) || 0) + 1);
  console.log("\ntemplate_group breakdown:");
  for (const [k, v] of [...tg.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(30)} ${v}`);
  }
}

main();
