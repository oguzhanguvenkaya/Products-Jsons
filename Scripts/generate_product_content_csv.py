#!/usr/bin/env python3
"""
MTS Kimya — product_content.csv Generator
Extracts content fields (fullDescription, howToUse, etc.) from 24 JSON files.
Cleans HTML/CSS artifacts from text content.
"""

import csv
import json
import glob
import os
import re
from shared_utils import get_product_name

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_DIR = os.path.join(BASE_DIR, "Product Groups")
OUTPUT_DIR = os.path.join(BASE_DIR, "output", "csv")

COLUMNS = [
    "sku", "productName", "fullDescription", "howToUse",
    "whenToUse", "whyThisProduct", "targetSurface", "templateGroup"
]


def clean_html(text: str) -> str:
    """Remove HTML tags, CSS, and normalize whitespace."""
    if not text:
        return ""
    # Remove style blocks
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Remove script blocks
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Convert <br> variants to newlines
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    # Convert block elements to newlines
    text = re.sub(r"</(p|div|h[1-6]|li|tr)>", "\n", text, flags=re.IGNORECASE)
    # Remove remaining HTML tags
    text = re.sub(r"<[^>]+>", "", text)
    # Decode HTML entities
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&quot;", '"', text)
    text = re.sub(r"&#39;", "'", text)
    text = re.sub(r"&[a-zA-Z]+;", "", text)
    # Remove CSS class references and inline styles
    text = re.sub(r"\.[\w-]+\s*\{[^}]*\}", "", text)
    text = re.sub(r"style\s*=\s*['\"][^'\"]*['\"]", "", text, flags=re.IGNORECASE)
    # Normalize whitespace: collapse multiple spaces but keep newlines
    text = re.sub(r"[^\S\n]+", " ", text)
    # Collapse multiple newlines to max 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()
    return text


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Processing JSON files for product_content...")
    rows = []
    json_files = sorted(glob.glob(os.path.join(JSON_DIR, "*.json")))

    for json_path in json_files:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        group_id = data["metadata"]["group_id"]

        for product in data["products"]:
            sku = product.get("sku", "")
            content = product.get("content", {})
            template = product.get("template", {})

            rows.append({
                "sku": sku,
                "productName": get_product_name(sku, content),
                "fullDescription": clean_html(content.get("full_description", "")),
                "howToUse": clean_html(content.get("how_to_use", "")),
                "whenToUse": clean_html(content.get("when_to_use", "")),
                "whyThisProduct": clean_html(content.get("why_this_product", "")),
                "targetSurface": clean_html(content.get("target_surface", "")),
                "templateGroup": template.get("group", group_id),
            })

    # Write CSV
    output_path = os.path.join(OUTPUT_DIR, "product_content.csv")
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✓ product_content.csv generated: {len(rows)} rows, {len(COLUMNS)} columns")
    print(f"  Output: {output_path}")

    # Validation
    empty_desc = sum(1 for r in rows if not r["fullDescription"])
    empty_howto = sum(1 for r in rows if not r["howToUse"])
    print(f"  Empty fullDescription: {empty_desc}, Empty howToUse: {empty_howto}")

    return rows


if __name__ == "__main__":
    main()
