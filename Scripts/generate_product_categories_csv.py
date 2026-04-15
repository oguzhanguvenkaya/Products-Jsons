#!/usr/bin/env python3
"""
MTS Kimya — product_categories.csv Generator
Collects unique (main_cat, sub_cat, sub_cat2) triples from all JSON files.
3 columns: main_cat, sub_cat, sub_cat2
"""

import csv
import json
import glob
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
JSON_DIR = os.path.join(PROJECT_DIR, "Product Groups")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output", "csv")

COLUMNS = ["main_cat", "sub_cat", "sub_cat2"]


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Processing JSON files for product_categories...")
    category_set = set()
    json_files = sorted(glob.glob(os.path.join(JSON_DIR, "*.json")))

    for json_path in json_files:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for product in data["products"]:
            category = product.get("category", {})
            main_cat = category.get("main_cat", "").strip()
            sub_cat = category.get("sub_cat", "").strip()
            sub_cat2 = category.get("sub_cat2", "").strip()

            if main_cat or sub_cat:
                category_set.add((main_cat, sub_cat, sub_cat2))

    # Sort by main_cat, sub_cat, sub_cat2
    sorted_categories = sorted(category_set)

    rows = [{"main_cat": mc, "sub_cat": sc, "sub_cat2": sc2} for mc, sc, sc2 in sorted_categories]

    # Write CSV
    output_path = os.path.join(OUTPUT_DIR, "product_categories.csv")
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✓ product_categories.csv generated: {len(rows)} rows, {len(COLUMNS)} columns")
    print(f"  Output: {output_path}")

    # Stats
    main_cats = set(r["main_cat"] for r in rows)
    print(f"  Unique main categories: {len(main_cats)}")
    for mc in sorted(main_cats):
        count = sum(1 for r in rows if r["main_cat"] == mc)
        print(f"    {mc}: {count} sub-categories")

    return rows


if __name__ == "__main__":
    main()
