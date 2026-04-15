#!/usr/bin/env python3
"""
MTS Kimya — product_faq.csv Generator
Extracts FAQ question-answer pairs from 24 JSON files.
Each Q&A pair becomes a separate row for better semantic search in Botpress KB.
3 columns: sku, question, answer
"""

import csv
import json
import glob
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
JSON_DIR = os.path.join(PROJECT_DIR, "Product Groups")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output", "csv")

COLUMNS = ["sku", "question", "answer"]


def clean_text(text: str) -> str:
    """Light cleanup for FAQ text."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&[a-zA-Z]+;", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Processing JSON files for product_faq...")
    rows = []
    products_with_faq = 0
    products_without_faq = 0
    json_files = sorted(glob.glob(os.path.join(JSON_DIR, "*.json")))

    for json_path in json_files:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for product in data["products"]:
            sku = product.get("sku", "")
            faq_list = product.get("faq", [])

            if faq_list:
                products_with_faq += 1
                for faq in faq_list:
                    question = clean_text(faq.get("question", ""))
                    answer = clean_text(faq.get("answer", ""))
                    if question and answer:
                        rows.append({
                            "sku": sku,
                            "question": question,
                            "answer": answer,
                        })
            else:
                products_without_faq += 1

    # Write CSV
    output_path = os.path.join(OUTPUT_DIR, "product_faq.csv")
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✓ product_faq.csv generated: {len(rows)} rows, {len(COLUMNS)} columns")
    print(f"  Output: {output_path}")
    print(f"  Products with FAQ: {products_with_faq}")
    print(f"  Products without FAQ: {products_without_faq}")
    avg_faq = len(rows) / products_with_faq if products_with_faq else 0
    print(f"  Average FAQ per product: {avg_faq:.1f}")

    return rows


if __name__ == "__main__":
    main()
