"""
MTS Kimya — Shared utilities for CSV generation scripts.
Provides product name lookup from mtsproducts.csv and Products_with_barcode.csv.
"""

import csv
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

_name_lookup = None


def _load_name_lookup() -> dict:
    """Build SKU→productName lookup from asset CSVs (cached)."""
    lookup = {}

    # Load from Products_with_barcode.csv (Baslik field)
    barcode_path = os.path.join(ASSETS_DIR, "Products_with_barcode.csv")
    if os.path.exists(barcode_path):
        with open(barcode_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f, delimiter=";")
            for row in reader:
                sku = row.get("StokKodu", "").strip()
                name = row.get("Baslik", "").strip()
                if sku and name:
                    lookup[sku] = name

    # Override with mtsproducts.csv (post_title field — more accurate)
    mts_path = os.path.join(ASSETS_DIR, "mtsproducts.csv")
    if os.path.exists(mts_path):
        with open(mts_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f, delimiter=";")
            for row in reader:
                sku = row.get("sku", "").strip()
                name = row.get("post_title", "").strip()
                if sku and name:
                    lookup[sku] = name

    return lookup


def get_product_name(sku: str, fallback_content: dict = None) -> str:
    """
    Get the best product name for a SKU.
    Priority: mtsproducts post_title → barcode Baslik → short_description
    """
    global _name_lookup
    if _name_lookup is None:
        _name_lookup = _load_name_lookup()

    if sku in _name_lookup:
        return _name_lookup[sku]

    # Fallback: use short_description from content
    if fallback_content:
        short = fallback_content.get("short_description", "").strip()
        if short:
            # Clean HTML
            short = re.sub(r"<[^>]+>", "", short)
            short = re.sub(r"&[a-zA-Z]+;", "", short)
            return short.strip()

    return ""
