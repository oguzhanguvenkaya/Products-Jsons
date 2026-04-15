#!/usr/bin/env python3
"""
MTS Kimya — product_specs.csv Generator
Extracts template.fields into specs_object (Botpress Object type).
4 columns: sku, template_group, template_sub_type, specs_object
"""

import csv
import json
import glob
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
JSON_DIR = os.path.join(PROJECT_DIR, "Product Groups")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output", "csv")

COLUMNS = ["sku", "template_group", "template_sub_type", "specs_object"]


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Processing JSON files for product_specs...")
    rows = []
    json_files = sorted(glob.glob(os.path.join(JSON_DIR, "*.json")))

    for json_path in json_files:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        group_id = data["metadata"]["group_id"]

        for product in data["products"]:
            sku = product.get("sku", "")
            template = product.get("template", {})
            fields = template.get("fields", {})

            # specs_object: compact JSON string for Botpress Object type
            specs_object = json.dumps(fields, ensure_ascii=False, separators=(",", ":"))

            rows.append({
                "sku": sku,
                "template_group": template.get("group", group_id),
                "template_sub_type": template.get("sub_type", ""),
                "specs_object": specs_object,
            })

    # Write CSV
    output_path = os.path.join(OUTPUT_DIR, "product_specs.csv")
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✓ product_specs.csv generated: {len(rows)} rows, {len(COLUMNS)} columns")
    print(f"  Output: {output_path}")

    # Stats
    empty_specs = sum(1 for r in rows if not r["specs_object"] or r["specs_object"] == "{}")
    print(f"  Products with empty specs: {empty_specs}")

    return rows


if __name__ == "__main__":
    main()
