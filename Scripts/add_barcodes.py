#!/usr/bin/env python3
"""
Products_with_barcode.csv'den barcode bilgilerini alıp
Product Groups/ altındaki 24 kategori JSON dosyasına ekleyen script.

Barcode, her üründe "sku" alanından hemen sonra eklenir.
Multi-normalization ile SKU eşleştirmesi yapılır.
"""

import csv
import json
import os
import sys
from collections import OrderedDict
from pathlib import Path

BASE_DIR = Path(__file__).parent
CSV_PATH = BASE_DIR / "assets" / "Products_with_barcode.csv"
PRODUCT_GROUPS_DIR = BASE_DIR / "Product Groups"


def load_barcode_csv():
    """CSV'den SKU -> barcode mapping'i yükle."""
    sku_barcode = {}
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            sku = row.get("StokKodu", "").strip()
            barcode = row.get("Barkodu", "").strip()
            if sku and barcode:
                sku_barcode[sku] = barcode
    return sku_barcode


def build_lookup(sku_barcode):
    """Multi-normalization lookup tablosu."""
    lookup = {
        "exact": dict(sku_barcode),
        "no_dots": {},
        "no_leading_zeros": {},
        "suffix_list": list(sku_barcode.items()),
    }
    for sku, bc in sku_barcode.items():
        nd = sku.replace(".", "")
        lookup["no_dots"][nd] = bc
        nlz = nd.lstrip("0")
        lookup["no_leading_zeros"][nlz] = bc
    return lookup


def find_barcode(category_sku, lookup):
    """Kategori SKU'su için barcode bul. 4 strateji dener."""
    # 1. Exact
    if category_sku in lookup["exact"]:
        return lookup["exact"][category_sku]

    # 2. Dots removed
    cat_nd = category_sku.replace(".", "")
    if cat_nd in lookup["no_dots"]:
        return lookup["no_dots"][cat_nd]

    # 3. Leading zeros stripped
    cat_nlz = cat_nd.lstrip("0")
    if cat_nlz in lookup["no_leading_zeros"]:
        return lookup["no_leading_zeros"][cat_nlz]

    # 4. Suffix match
    for csv_sku, bc in lookup["suffix_list"]:
        csv_nd = csv_sku.replace(".", "")
        if csv_nd.endswith(cat_nd) or cat_nd.endswith(csv_nd):
            if min(len(csv_nd), len(cat_nd)) >= 4:
                return bc

    return None


def reorder_product(product, barcode):
    """Ürün dict'ine barcode ekle, sku'dan hemen sonra gelecek şekilde sırala."""
    ordered = OrderedDict()
    for key, value in product.items():
        ordered[key] = value
        if key == "sku":
            ordered["barcode"] = barcode
    return ordered


def main():
    print("=" * 60)
    print("Barcode Ekleme Scripti")
    print("=" * 60)

    # Step 1: Load CSV
    print("\n[1/3] CSV yükleniyor...")
    sku_barcode = load_barcode_csv()
    print(f"  -> {len(sku_barcode)} SKU-barcode çifti yüklendi")

    # Step 2: Build lookup
    lookup = build_lookup(sku_barcode)

    # Step 3: Process category files
    print("\n[2/3] Kategori dosyaları işleniyor...")
    total_products = 0
    total_matched = 0
    total_no_barcode = 0
    unmatched_skus = []

    cat_files = sorted(f for f in os.listdir(PRODUCT_GROUPS_DIR) if f.endswith(".json"))

    for cat_file in cat_files:
        cat_path = PRODUCT_GROUPS_DIR / cat_file

        with open(cat_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        products = data.get("products", [])
        cat_matched = 0
        new_products = []

        for product in products:
            total_products += 1
            sku = product.get("sku", "")
            barcode = find_barcode(sku, lookup)

            if barcode:
                new_products.append(reorder_product(product, barcode))
                cat_matched += 1
                total_matched += 1
            else:
                # Barcode bulunamadı - ürünü olduğu gibi bırak
                new_products.append(product)
                total_no_barcode += 1
                unmatched_skus.append((cat_file, sku))

        data["products"] = new_products

        with open(cat_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        status = f"{cat_matched}/{len(products)}" if cat_matched > 0 else "0 eşleşme"
        print(f"  {cat_file}: {status}")

    # Step 4: Summary & Validation
    print("\n[3/3] Özet & Doğrulama")
    print(f"  Toplam ürün: {total_products}")
    print(f"  Barcode eklenen: {total_matched}")
    print(f"  Barcode bulunamayan: {total_no_barcode}")

    if unmatched_skus:
        print(f"\n  CSV'de karşılığı olmayan SKU'lar ({len(unmatched_skus)}):")
        for cf, sku in unmatched_skus:
            print(f"    {cf}: {sku}")

    # Validation
    print("\n" + "=" * 60)
    print("DOĞRULAMA")
    print("=" * 60)

    errors = []
    barcode_count = 0

    for cat_file in cat_files:
        cat_path = PRODUCT_GROUPS_DIR / cat_file
        try:
            with open(cat_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            for product in data.get("products", []):
                if "sku" not in product:
                    errors.append(f"{cat_file}: SKU alanı eksik!")
                if "template" not in product:
                    errors.append(f"{cat_file}: {product.get('sku','?')} - template alanı eksik!")
                if "barcode" in product:
                    barcode_count += 1
                    # Verify barcode is right after sku
                    keys = list(product.keys())
                    sku_idx = keys.index("sku")
                    bc_idx = keys.index("barcode")
                    if bc_idx != sku_idx + 1:
                        errors.append(f"{cat_file}: {product['sku']} - barcode sıralama hatası")
        except json.JSONDecodeError as e:
            errors.append(f"{cat_file}: Geçersiz JSON! {e}")

    print(f"\n  Geçerli JSON: {len(cat_files)}/{len(cat_files)}")
    print(f"  Barcode eklenen ürün: {barcode_count}")
    print(f"  Mevcut alanlar (template, content) bozulmamış: ", end="")
    print("EVET" if not errors else "HAYIR")

    if errors:
        print(f"\n  HATALAR ({len(errors)}):")
        for err in errors:
            print(f"    - {err}")
    else:
        print("\n  Tüm doğrulamalar başarılı!")

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
