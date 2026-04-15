#!/usr/bin/env python3
"""
MTS Kimya — Search Index CSV Assembler (Phase B.3)
Merges raw product data with AI-generated search_text into final product_search_index.csv.
8 columns: sku, product_name, brand, main_cat, price, image_url, url, search_text
"""

import csv
import json
import glob
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
RAW_DIR = os.path.join(PROJECT_DIR, "output", "search_index_raw")
AI_DIR = os.path.join(PROJECT_DIR, "output", "search_text_results")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output", "csv")

sys.path.insert(0, BASE_DIR)
from field_name_mapping import build_specs_summary

COLUMNS = ["sku", "product_name", "brand", "main_cat", "price", "image_url", "url", "search_text"]


def mechanical_fallback(product: dict) -> str:
    """Generate a mechanical search_text as fallback when AI text is unavailable."""
    parts = []

    if product.get("product_name"):
        parts.append(product["product_name"])

    meta = []
    if product.get("brand"):
        meta.append(f"Marka: {product['brand']}")
    if product.get("main_cat"):
        cat_str = product["main_cat"]
        if product.get("sub_cat"):
            cat_str += f" > {product['sub_cat']}"
        if product.get("sub_cat2"):
            cat_str += f" > {product['sub_cat2']}"
        meta.append(f"Kategori: {cat_str}")
    if meta:
        parts.append(" | ".join(meta))

    if product.get("short_description"):
        parts.append(product["short_description"])

    if product.get("target_surface"):
        parts.append(f"Hedef: {product['target_surface']}")

    if product.get("specs_summary"):
        parts.append(product["specs_summary"])

    return " | ".join(parts)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Step 1: Load raw product data from all category files
    print("Loading raw product data...")
    raw_products = {}  # sku → product dict
    raw_files = sorted(glob.glob(os.path.join(RAW_DIR, "*.json")))

    if not raw_files:
        print("[ERROR] No files found in output/search_index_raw/. Run generate_search_index_raw.py first.")
        return

    for raw_path in raw_files:
        with open(raw_path, "r", encoding="utf-8") as f:
            products = json.load(f)
        for p in products:
            raw_products[p["sku"]] = p

    print(f"  Loaded {len(raw_products)} products from {len(raw_files)} raw files")

    # Step 2: Load AI-generated search_text results
    print("Loading AI-generated search_text...")
    ai_texts = {}  # sku → search_text
    ai_files = sorted(glob.glob(os.path.join(AI_DIR, "*.json")))

    if ai_files:
        for ai_path in ai_files:
            with open(ai_path, "r", encoding="utf-8") as f:
                results = json.load(f)
            for item in results:
                sku = item.get("sku", "")
                text = item.get("search_text", "")
                if sku and text:
                    ai_texts[sku] = text
        print(f"  Loaded {len(ai_texts)} AI-generated search_text entries from {len(ai_files)} files")
    else:
        print("  [WARN] No AI search_text files found in output/search_text_results/")
        print("         Using mechanical fallback for all products")

    # Step 3: Assemble final CSV rows
    print("Assembling product_search_index.csv...")
    rows = []
    ai_count = 0
    fallback_count = 0

    for sku, product in sorted(raw_products.items()):
        if sku in ai_texts:
            search_text = ai_texts[sku]
            ai_count += 1
        else:
            search_text = mechanical_fallback(product)
            fallback_count += 1

        rows.append({
            "sku": sku,
            "product_name": product.get("product_name", ""),
            "brand": product.get("brand", ""),
            "main_cat": product.get("main_cat", ""),
            "price": product.get("price", ""),
            "image_url": product.get("image_url", ""),
            "url": product.get("url", ""),
            "search_text": search_text,
        })

    # Step 4: Write CSV
    output_path = os.path.join(OUTPUT_DIR, "product_search_index.csv")
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✓ product_search_index.csv generated: {len(rows)} rows, {len(COLUMNS)} columns")
    print(f"  Output: {output_path}")
    print(f"  AI search_text: {ai_count}, Mechanical fallback: {fallback_count}")

    # Validation
    empty_text = sum(1 for r in rows if not r["search_text"])
    if empty_text:
        print(f"  [WARN] {empty_text} products have empty search_text!")

    text_lengths = [len(r["search_text"]) for r in rows if r["search_text"]]
    if text_lengths:
        avg_len = sum(text_lengths) / len(text_lengths)
        min_len = min(text_lengths)
        max_len = max(text_lengths)
        print(f"  search_text length — avg: {avg_len:.0f}, min: {min_len}, max: {max_len}")

    # Check for missing SKUs
    missing_in_ai = set(raw_products.keys()) - set(ai_texts.keys())
    if missing_in_ai and ai_texts:
        print(f"  [INFO] {len(missing_in_ai)} SKUs used mechanical fallback (no AI text)")

    return rows


if __name__ == "__main__":
    main()
