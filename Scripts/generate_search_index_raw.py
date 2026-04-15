#!/usr/bin/env python3
"""
MTS Kimya — Search Index Raw Data Generator (Phase B.1)
Collects ALL data per product into category-based JSON files for AI subagent consumption.
Output: output/search_index_raw/{category}.json (24 files)
"""

import csv
import json
import glob
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
JSON_DIR = os.path.join(PROJECT_DIR, "Product Groups")
ASSETS_DIR = os.path.join(PROJECT_DIR, "assets")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output", "search_index_raw")

# Import field mapping for specs_summary generation
import sys
sys.path.insert(0, BASE_DIR)
from field_name_mapping import build_specs_summary


def load_barcode_lookup() -> dict:
    lookup = {}
    csv_path = os.path.join(ASSETS_DIR, "Products_with_barcode.csv")
    if not os.path.exists(csv_path):
        return lookup
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            sku = row.get("StokKodu", "").strip()
            if not sku:
                continue
            lookup[sku] = {
                "barcode": row.get("Barkodu", "").strip(),
                "imageUrl": row.get("Resim", "").strip(),
                "url": row.get("Url", "").strip(),
                "productName": row.get("Baslik", "").strip(),
            }
    return lookup


def load_mtsproducts_lookup() -> dict:
    lookup = {}
    csv_path = os.path.join(ASSETS_DIR, "mtsproducts.csv")
    if not os.path.exists(csv_path):
        return lookup
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            sku = row.get("sku", "").strip()
            if not sku:
                continue
            images = row.get("images", "").strip()
            first_image = images.split("!")[0].strip() if images else ""
            lookup[sku] = {
                "imageUrl": first_image,
                "brand": row.get("tax:product_brand", "").strip(),
                "productName": row.get("post_title", "").strip(),
            }
    return lookup


def extract_brand_from_name(product_name: str) -> str:
    known_brands = [
        "GYEON", "Menzerna", "FRA-BER", "FRABER", "Innovacar", "INNOVACAR",
        "MG PADS", "MG PS", "Q1", "SGCB", "EPOCA", "MTS KİMYA", "MX-PRO",
        "RUPES", "Sonax", "Koch", "3M", "Detail Guardz", "MJJC",
        "Nanolex", "CarPro", "IK", "Gloria", "Flex"
    ]
    name_upper = product_name.upper()
    for brand in known_brands:
        if name_upper.startswith(brand.upper()):
            return brand
    return product_name.split()[0] if product_name else ""


def clean_html(text: str) -> str:
    """Remove HTML/CSS, normalize whitespace, preserve structure."""
    if not text:
        return ""
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(p|div|h[1-6]|li|tr)>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&quot;", '"', text)
    text = re.sub(r"&#39;", "'", text)
    text = re.sub(r"&[a-zA-Z]+;", "", text)
    text = re.sub(r"\.[\w-]+\s*\{[^}]*\}", "", text)
    text = re.sub(r"style\s*=\s*['\"][^'\"]*['\"]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"[^\S\n]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def format_price(price_raw) -> str:
    if price_raw is None or price_raw == 0:
        return ""
    tl = price_raw / 100
    if tl == int(tl):
        return str(int(tl))
    return f"{tl:.2f}"


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Loading supplementary data...")
    barcode_lookup = load_barcode_lookup()
    mts_lookup = load_mtsproducts_lookup()

    print("Processing JSON files for search_index_raw...")
    json_files = sorted(glob.glob(os.path.join(JSON_DIR, "*.json")))

    total_products = 0

    for json_path in json_files:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        group_id = data["metadata"]["group_id"]
        products_data = []

        for product in data["products"]:
            sku = product.get("sku", "")
            content = product.get("content", {})
            template = product.get("template", {})
            fields = template.get("fields", {})
            category = product.get("category", {})

            # Product name resolution
            product_name = ""
            if sku in mts_lookup and mts_lookup[sku]["productName"]:
                product_name = mts_lookup[sku]["productName"]
            elif sku in barcode_lookup and barcode_lookup[sku]["productName"]:
                product_name = barcode_lookup[sku]["productName"]
            else:
                product_name = clean_html(content.get("short_description", ""))

            # Brand
            brand = ""
            if sku in mts_lookup and mts_lookup[sku]["brand"]:
                brand = mts_lookup[sku]["brand"]
            else:
                brand = extract_brand_from_name(product_name)

            # Price
            price = format_price(product.get("price", 0))

            # Image URL
            image_url = product.get("image_url", "").strip()
            if not image_url and sku in barcode_lookup:
                image_url = barcode_lookup[sku]["imageUrl"]
            if not image_url and sku in mts_lookup:
                image_url = mts_lookup[sku]["imageUrl"]

            # URL from barcode CSV
            url = ""
            if sku in barcode_lookup:
                url = barcode_lookup[sku]["url"]

            # Clean content fields
            full_description = clean_html(content.get("full_description", ""))
            # Truncate very long descriptions to 3000 chars
            if len(full_description) > 3000:
                full_description = full_description[:3000] + "..."

            how_to_use = clean_html(content.get("how_to_use", ""))
            why_this_product = clean_html(content.get("why_this_product", ""))
            short_description = clean_html(content.get("short_description", ""))
            target_surface = clean_html(content.get("target_surface", ""))

            # Specs summary
            specs_summary = build_specs_summary(fields)

            products_data.append({
                "sku": sku,
                "product_name": product_name,
                "brand": brand,
                "price": price,
                "image_url": image_url,
                "url": url,
                "main_cat": category.get("main_cat", ""),
                "sub_cat": category.get("sub_cat", ""),
                "sub_cat2": category.get("sub_cat2", ""),
                "target_surface": target_surface,
                "short_description": short_description,
                "full_description": full_description,
                "how_to_use": how_to_use,
                "why_this_product": why_this_product,
                "specs_summary": specs_summary,
            })

        # Write category JSON file
        output_path = os.path.join(OUTPUT_DIR, f"{group_id}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(products_data, f, ensure_ascii=False, indent=2)

        total_products += len(products_data)
        print(f"  {group_id}.json: {len(products_data)} products")

    print(f"\n✓ search_index_raw generated: {total_products} products across {len(json_files)} category files")
    print(f"  Output: {OUTPUT_DIR}/")

    return total_products


if __name__ == "__main__":
    main()
