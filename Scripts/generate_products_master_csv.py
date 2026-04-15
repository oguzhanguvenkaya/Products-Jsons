#!/usr/bin/env python3
"""
MTS Kimya — products_master.csv Generator
Reads 24 JSON files from Product Groups/ and generates a flat CSV with 13 columns.
Missing barcode/imageUrl fields are supplemented from assets/Products_with_barcode.csv.
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
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output", "csv")

COLUMNS = [
    "sku", "barcode", "product_name", "brand", "price",
    "image_url", "main_cat", "sub_cat", "sub_cat2",
    "target_surface", "short_description", "template_group", "template_sub_type"
]


def load_barcode_lookup() -> dict:
    """Load assets/Products_with_barcode.csv as SKU→{barcode, imageUrl, productName} lookup."""
    lookup = {}
    csv_path = os.path.join(ASSETS_DIR, "Products_with_barcode.csv")
    if not os.path.exists(csv_path):
        print(f"  [WARN] {csv_path} not found, skipping barcode lookup")
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
                "productName": row.get("Baslik", "").strip(),
            }
    print(f"  Loaded {len(lookup)} entries from Products_with_barcode.csv")
    return lookup


def load_mtsproducts_lookup() -> dict:
    """Load assets/mtsproducts.csv as SKU→{imageUrl, brand, productName} supplementary lookup."""
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
            first_image = ""
            if images:
                first_image = images.split("!")[0].strip()
            lookup[sku] = {
                "imageUrl": first_image,
                "brand": row.get("tax:product_brand", "").strip(),
                "productName": row.get("post_title", "").strip(),
            }
    print(f"  Loaded {len(lookup)} entries from mtsproducts.csv")
    return lookup


def extract_brand_from_name(product_name: str) -> str:
    """Extract brand from product name (first word or known patterns)."""
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
    # Fallback: first word
    return product_name.split()[0] if product_name else ""


def clean_text(text: str) -> str:
    """Remove HTML tags and normalize whitespace."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&[a-zA-Z]+;", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def format_price(price_raw) -> str:
    """Format price: JSON stores as integer kuruş (e.g., 85000 = 850.00 TL).
    If no kuruş (e.g., 67000 → 670), drop decimals. If kuruş exists (67050 → 670.50), keep."""
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

    print("Processing JSON files...")
    rows = []
    json_files = sorted(glob.glob(os.path.join(JSON_DIR, "*.json")))

    for json_path in json_files:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        group_id = data["metadata"]["group_id"]

        for product in data["products"]:
            sku = product.get("sku", "")

            # Barcode: prefer JSON, fallback to barcode CSV
            barcode = str(product.get("barcode", "")).strip()
            if not barcode and sku in barcode_lookup:
                barcode = barcode_lookup[sku]["barcode"]

            # Content fields
            content = product.get("content", {})
            short_desc = clean_text(content.get("short_description", ""))

            # Product name: prefer mtsproducts post_title → barcode Baslik → short_description
            product_name = ""
            if sku in mts_lookup and mts_lookup[sku]["productName"]:
                product_name = mts_lookup[sku]["productName"]
            elif sku in barcode_lookup and barcode_lookup[sku]["productName"]:
                product_name = barcode_lookup[sku]["productName"]
            else:
                product_name = short_desc

            # Brand extraction: prefer mtsproducts brand → extract from product name
            brand = ""
            if sku in mts_lookup and mts_lookup[sku]["brand"]:
                brand = mts_lookup[sku]["brand"]
            else:
                brand = extract_brand_from_name(product_name)

            # Price
            price = format_price(product.get("price", 0))

            # Category
            category = product.get("category", {})
            main_cat = category.get("main_cat", "")
            sub_cat = category.get("sub_cat", "")
            sub_cat2 = category.get("sub_cat2", "")

            # Template info
            template = product.get("template", {})
            template_group = template.get("group", group_id)
            template_sub_type = template.get("sub_type", "")

            # Target surface
            target_surface = clean_text(content.get("target_surface", ""))

            # Image URL: prefer JSON, fallback to barcode CSV, then mtsproducts
            image_url = product.get("image_url", "").strip()
            if not image_url and sku in barcode_lookup:
                image_url = barcode_lookup[sku]["imageUrl"]
            if not image_url and sku in mts_lookup:
                image_url = mts_lookup[sku]["imageUrl"]

            rows.append({
                "sku": sku,
                "barcode": barcode,
                "product_name": product_name,
                "brand": brand,
                "price": price,
                "image_url": image_url,
                "main_cat": main_cat,
                "sub_cat": sub_cat,
                "sub_cat2": sub_cat2,
                "target_surface": target_surface,
                "short_description": short_desc,
                "template_group": template_group,
                "template_sub_type": template_sub_type,
            })

    # Write CSV with UTF-8-BOM for Excel compatibility
    output_path = os.path.join(OUTPUT_DIR, "products_master.csv")
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✓ products_master.csv generated: {len(rows)} rows, {len(COLUMNS)} columns")
    print(f"  Output: {output_path}")

    # Quick validation
    skus = [r["sku"] for r in rows]
    unique_skus = set(skus)
    if len(skus) != len(unique_skus):
        dupes = [s for s in skus if skus.count(s) > 1]
        print(f"  [WARN] Duplicate SKUs found: {set(dupes)}")
    else:
        print(f"  ✓ All {len(unique_skus)} SKUs are unique")

    empty_brands = sum(1 for r in rows if not r["brand"])
    empty_prices = sum(1 for r in rows if not r["price"])
    empty_images = sum(1 for r in rows if not r["image_url"])
    print(f"  Empty brands: {empty_brands}, Empty prices: {empty_prices}, Empty images: {empty_images}")

    return rows


if __name__ == "__main__":
    main()
