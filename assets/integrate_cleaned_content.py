#!/usr/bin/env python3
"""
Cleaned content'i kategori JSON dosyalarına entegre eden script.

- agents/cleaned_data/*.json dosyalarından SKU bazlı cleaned content okur
- 24 kategori dosyasındaki her ürünü multi-normalization ile eşleştirir
- Eşleşen ürünlere 'cleaned_content' alanı ekler
- Mevcut alanlara (template, content, relations, faq vb.) dokunmaz
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).parent
CLEANED_DATA_DIR = BASE_DIR / "agents" / "cleaned_data"

CATEGORY_FILES = [
    "abrasive_polishes.json",
    "applicators.json",
    "brushes.json",
    "car_shampoo.json",
    "ceramic_coatings.json",
    "clay_products.json",
    "fragrance.json",
    "glass_cleaner.json",
    "industrial_products.json",
    "interior_cleaner.json",
    "leather_care.json",
    "marin_products.json",
    "masking_tapes.json",
    "microfiber.json",
    "polishing_pad.json",
    "ppf_tools.json",
    "product_sets.json",
    "products_contaminant_solvers.json",
    "products_paint_protection.json",
    "products_polisher_machine.json",
    "products_spare_part.json",
    "spray_bottles.json",
    "storage_accessories.json",
    "tire_care.json",
]

# SKU that has no match in any category - skip it
SKIP_SKUS = {"3213MN"}


def clean_text(text: str) -> str:
    """cleaned_content metinlerinden URL/HTML artıklarını temizle."""
    # Markdown image links: ![alt](url)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
    # Empty markdown links: [](url)
    text = re.sub(r"\[\]\([^)]+\)", "", text)
    # Standalone URLs (not inside markdown link syntax)
    text = re.sub(r"(?<!\()https?://\S+", "", text)
    # HTML tags
    text = re.sub(r"<[^>]+>", "", text)
    # HTML entities
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&quot;", '"', text)
    text = re.sub(r"&#\d+;", "", text)
    text = re.sub(r"&\w+;", "", text)
    # Lines that are just "Product Image:" or "Safety Image:" followed by nothing (URL was removed)
    text = re.sub(r"^(Product Image|Safety Image|Image):?\s*$", "", text, flags=re.MULTILINE)
    # Multiple blank lines -> max 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Trailing whitespace on lines
    text = re.sub(r"[ \t]+$", "", text, flags=re.MULTILINE)
    return text.strip()


def load_cleaned_data() -> dict:
    """cleaned_data dizinindeki tüm JSON dosyalarını SKU bazlı dict'e yükle."""
    cleaned = {}
    for fpath in CLEANED_DATA_DIR.glob("*.json"):
        sku = fpath.stem  # filename without .json
        if sku in SKIP_SKUS:
            continue
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        cleaned[sku] = data
    return cleaned


def build_lookup(cleaned_data: dict) -> dict:
    """
    Multi-normalization lookup tablosu oluştur.
    Key: normalized form -> Value: original cleaned_data SKU

    Normalization stratejileri (öncelik sırasıyla):
    1. Exact match
    2. Dots removed (tüm noktalar kaldırılır)
    3. Leading zeros stripped (baştaki sıfırlar + noktalar kaldırılır)
    4. Suffix match (cleaned SKU, category SKU'nun sonunda yer alıyorsa)
    """
    lookup = {
        "exact": {},
        "no_dots": {},
        "no_leading_zeros": {},
        "suffix_candidates": [],
    }

    for sku in cleaned_data:
        # Exact
        lookup["exact"][sku] = sku
        # No dots
        no_dots = sku.replace(".", "")
        lookup["no_dots"][no_dots] = sku
        # No leading zeros (strip dots first, then leading zeros)
        no_lz = no_dots.lstrip("0")
        lookup["no_leading_zeros"][no_lz] = sku
        # Suffix candidates (for cases like 684173 matching category 84173)
        lookup["suffix_candidates"].append(sku)

    return lookup


def find_match(category_sku: str, lookup: dict) -> Optional[str]:
    """Kategori SKU'su için cleaned_data eşleşmesi bul."""
    # Strategy 1: Exact match
    if category_sku in lookup["exact"]:
        return lookup["exact"][category_sku]

    # Strategy 2: Dots removed
    cat_no_dots = category_sku.replace(".", "")
    if cat_no_dots in lookup["no_dots"]:
        return lookup["no_dots"][cat_no_dots]

    # Strategy 3: Leading zeros stripped
    cat_no_lz = cat_no_dots.lstrip("0")
    if cat_no_lz in lookup["no_leading_zeros"]:
        return lookup["no_leading_zeros"][cat_no_lz]

    # Strategy 4: Suffix match - cleaned SKU ends with category SKU (or vice versa)
    for cleaned_sku in lookup["suffix_candidates"]:
        cleaned_no_dots = cleaned_sku.replace(".", "")
        if cleaned_no_dots.endswith(cat_no_dots) or cat_no_dots.endswith(cleaned_no_dots):
            # Only match if the shorter one is at least 4 chars to avoid false positives
            shorter = min(len(cleaned_no_dots), len(cat_no_dots))
            if shorter >= 4:
                return cleaned_sku

    return None


def build_cleaned_content_field(cleaned_data_entry: dict) -> dict:
    """Cleaned data entry'den cleaned_content alanı oluştur."""
    sources = cleaned_data_entry.get("sources", [])
    result = {}

    for i, source in enumerate(sources, 1):
        url = source.get("url", "")
        content = source.get("cleaned_content", "")
        # Temizle
        content = clean_text(content)
        result[f"url_{i}"] = url
        result[f"cleaned_content_{i}"] = content

    return result


def main():
    print("=" * 60)
    print("Cleaned Content Entegrasyon Scripti")
    print("=" * 60)

    # Step 1: Load cleaned data
    print("\n[1/4] Cleaned data yükleniyor...")
    cleaned_data = load_cleaned_data()
    print(f"  -> {len(cleaned_data)} SKU yüklendi")

    # Step 2: Build lookup
    print("\n[2/4] Normalizasyon lookup tablosu oluşturuluyor...")
    lookup = build_lookup(cleaned_data)
    print(f"  -> Exact: {len(lookup['exact'])}, No-dots: {len(lookup['no_dots'])}, "
          f"No-LZ: {len(lookup['no_leading_zeros'])}, Suffix candidates: {len(lookup['suffix_candidates'])}")

    # Step 3: Process category files
    print("\n[3/4] Kategori dosyaları işleniyor...")
    total_matched = 0
    total_products = 0
    match_details = {}

    for cat_file in CATEGORY_FILES:
        cat_path = BASE_DIR / cat_file
        with open(cat_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        products = data.get("products", [])
        cat_matched = 0

        for product in products:
            total_products += 1
            sku = product.get("sku", "")
            matched_cleaned_sku = find_match(sku, lookup)

            if matched_cleaned_sku:
                cleaned_entry = cleaned_data[matched_cleaned_sku]
                cleaned_content = build_cleaned_content_field(cleaned_entry)
                product["cleaned_content"] = cleaned_content
                cat_matched += 1
                total_matched += 1

        # Save updated file
        with open(cat_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        match_details[cat_file] = cat_matched
        if cat_matched > 0:
            print(f"  {cat_file}: {cat_matched}/{len(products)} ürün eşleşti")
        else:
            print(f"  {cat_file}: 0 eşleşme")

    # Step 4: Summary
    print("\n[4/4] Özet")
    print(f"  Toplam ürün: {total_products}")
    print(f"  Eşleşen: {total_matched}")
    print(f"  Eşleşmeyen: {total_products - total_matched}")
    print(f"  Cleaned data'da olup kategoride olmayan: {len(cleaned_data) - total_matched}")

    # Validation
    print("\n" + "=" * 60)
    print("DOĞRULAMA")
    print("=" * 60)

    errors = []
    validated_count = 0

    for cat_file in CATEGORY_FILES:
        cat_path = BASE_DIR / cat_file
        try:
            with open(cat_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Check JSON validity - already passed by loading
            for product in data.get("products", []):
                # Verify essential fields still exist
                if "sku" not in product:
                    errors.append(f"{cat_file}: SKU alanı eksik!")
                if "template" not in product:
                    errors.append(f"{cat_file}: {product.get('sku','?')} - template alanı eksik!")
                if "content" not in product:
                    errors.append(f"{cat_file}: {product.get('sku','?')} - content alanı eksik!")
                if "cleaned_content" in product:
                    validated_count += 1
                    cc = product["cleaned_content"]
                    # Check url/content pairs
                    urls = [k for k in cc if k.startswith("url_")]
                    contents = [k for k in cc if k.startswith("cleaned_content_")]
                    if len(urls) != len(contents):
                        errors.append(f"{cat_file}: {product['sku']} - url/content sayısı uyuşmuyor!")
        except json.JSONDecodeError as e:
            errors.append(f"{cat_file}: Geçersiz JSON! {e}")

    print(f"\n  Geçerli JSON dosyaları: {len(CATEGORY_FILES)}/{len(CATEGORY_FILES)}")
    print(f"  cleaned_content eklenen ürün: {validated_count}")
    print(f"  Beklenen: 176")

    if errors:
        print(f"\n  HATALAR ({len(errors)}):")
        for err in errors:
            print(f"    - {err}")
    else:
        print("\n  Tüm doğrulamalar başarılı!")

    if validated_count == 176:
        print("\n  SONUÇ: BAŞARILI - 176/176 ürün eşleşti ve entegre edildi.")
    else:
        print(f"\n  UYARI: {validated_count}/176 ürün entegre edildi (beklenen: 176)")

    return 0 if not errors and validated_count == 176 else 1


if __name__ == "__main__":
    sys.exit(main())
