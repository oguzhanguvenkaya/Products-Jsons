#!/usr/bin/env python3
"""
MTS Kimya — product_relations.csv Generator
Extracts product relationships (use_before, use_after, use_with, accessories, alternatives).
Format: comma-separated pure SKUs (no product names).
6 columns: sku, use_before, use_after, use_with, accessories, alternatives
"""

import csv
import json
import glob
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
JSON_DIR = os.path.join(PROJECT_DIR, "Product Groups")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output", "csv")

COLUMNS = ["sku", "use_before", "use_after", "use_with", "accessories", "alternatives"]


def format_relation(sku_list: list) -> str:
    """Format a list of SKUs as comma-separated string."""
    if not sku_list:
        return ""
    return ",".join(str(s).strip() for s in sku_list if str(s).strip())


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    json_files = sorted(glob.glob(os.path.join(JSON_DIR, "*.json")))

    print("Processing JSON files for product_relations...")
    rows = []

    for json_path in json_files:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for product in data["products"]:
            sku = product.get("sku", "")
            relations = product.get("relations", {})

            rows.append({
                "sku": sku,
                "use_before": format_relation(relations.get("use_before", [])),
                "use_after": format_relation(relations.get("use_after", [])),
                "use_with": format_relation(relations.get("use_with", [])),
                "accessories": format_relation(relations.get("accessories", [])),
                "alternatives": format_relation(relations.get("alternatives", [])),
            })

    # Write CSV
    output_path = os.path.join(OUTPUT_DIR, "product_relations.csv")
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✓ product_relations.csv generated: {len(rows)} rows, {len(COLUMNS)} columns")
    print(f"  Output: {output_path}")

    # Stats
    has_any_relation = sum(1 for r in rows if any([
        r["use_before"], r["use_after"], r["use_with"],
        r["accessories"], r["alternatives"]
    ]))
    print(f"  Products with at least one relation: {has_any_relation}/{len(rows)}")

    return rows


if __name__ == "__main__":
    main()
