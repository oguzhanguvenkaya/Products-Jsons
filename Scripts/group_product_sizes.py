#!/usr/bin/env python3
"""
MTS Kimya — Product Size Variant Grouping (LLM-Driven)

Reads Products_with_barcode.csv, groups products by base name using Claude LLM,
identifies size variants, and outputs a structured JSON.

Usage:
    python3 group_product_sizes.py                    # Full run
    python3 group_product_sizes.py --dry-run          # Parse only, no LLM
    python3 group_product_sizes.py --brand GYEON      # Single brand test
    python3 group_product_sizes.py --output out.json  # Custom output path
    python3 group_product_sizes.py --model claude-haiku-4-5-20251001  # Cheaper model
"""

import argparse
import csv
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import unicodedata
from datetime import datetime, timezone

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
ASSETS_DIR = os.path.join(PROJECT_DIR, "assets")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output")
CSV_PATH = os.path.join(ASSETS_DIR, "Products_with_barcode.csv")
DEFAULT_OUTPUT = os.path.join(OUTPUT_DIR, "product_size_groups.json")

# ── Brand list (from generate_products_master_csv.py) ────────────────────────
KNOWN_BRANDS = [
    "GYEON", "MENZERNA", "FRA-BER", "FRABER", "INNOVACAR",
    "MG PADS", "MG PS", "Q1 TAPES", "Q1", "SGCB", "EPOCA",
    "MTS KİMYA", "MX-PRO", "RUPES", "SONAX", "KOCH", "3M",
    "DETAIL GUARDZ", "MJJC", "NANOLEX", "CARPRO", "IK SPRAYERS",
    "IK", "GLORIA", "FLEX", "KLIN", "LITTLE JOE",
]

# ── Default model (empty = use claude CLI default) ──────────────────────────
DEFAULT_MODEL = ""


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 1: CSV Parse & Pre-process
# ═══════════════════════════════════════════════════════════════════════════════

def parse_csv() -> list[dict]:
    """Read Products_with_barcode.csv and return cleaned product list."""
    products = []
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            sku = row.get("StokKodu", "").strip()
            if not sku:
                continue

            baslik = row.get("Baslik", "").strip()
            # Clean HTML entities
            baslik = baslik.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")

            beden = row.get("Beden", "").strip()
            # Invalid Beden: too long or no digits → treat as "0"
            if len(beden) > 30 or (beden != "0" and not re.search(r"\d", beden)):
                beden = "0"

            marka = row.get("Marka", "").strip()
            # Validate brand
            if not _is_valid_brand(marka):
                marka = extract_brand_from_name(baslik)

            products.append({
                "sku": sku,
                "title": baslik,
                "barcode": row.get("Barkodu", "").strip(),
                "beden": beden,
                "category": row.get("Kategori", "").strip(),
                "brand": marka,
                "size_hint": extract_size_from_title(baslik),
            })

    print(f"  CSV parsed: {len(products)} products")
    return products


def _is_valid_brand(brand: str) -> bool:
    """Check if brand string looks like a real brand name."""
    if not brand or len(brand) > 30:
        return False
    if ">" in brand:  # Category path leaked into brand column
        return False
    return True


def extract_brand_from_name(product_name: str) -> str:
    """Extract brand from product name (matching known brands)."""
    name_upper = product_name.upper()
    # Sort by length descending to match "MTS KİMYA" before "MTS", "Q1 TAPES" before "Q1"
    for brand in sorted(KNOWN_BRANDS, key=len, reverse=True):
        if name_upper.startswith(brand.upper()):
            return brand
    return product_name.split()[0] if product_name else "OTHER"


SIZE_PATTERN = re.compile(
    r"(\d+[.,]?\d*)\s*(ml|lt|l|litre|kg|gr|g|mm|cm|m)\b",
    re.IGNORECASE,
)

DIMENSION_PATTERN = re.compile(
    r"(\d+[/]?\d*)\s*x\s*(\d+[/]?\d*)\s*(cm|mm|m)?\b",
    re.IGNORECASE,
)


def extract_size_from_title(title: str) -> str:
    """Extract size token from product title as a hint for LLM."""
    # Try dimension first (e.g. 90x70 cm, 150/130x25)
    dim = DIMENSION_PATTERN.search(title)
    if dim:
        return dim.group(0).strip()

    # Try volume/weight
    m = SIZE_PATTERN.search(title)
    if m:
        return m.group(0).strip()

    return ""


def group_by_brand(products: list[dict]) -> dict[str, list[dict]]:
    """Bucket products by normalized brand name."""
    groups = {}
    for p in products:
        brand = p["brand"].upper().replace("FRABER", "FRA-BER")
        if brand not in groups:
            groups[brand] = []
        groups[brand].append(p)

    print(f"  Brands: {len(groups)}")
    for brand, items in sorted(groups.items(), key=lambda x: -len(x[1])):
        print(f"    {brand}: {len(items)} products")

    return groups


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 2: LLM Batch Grouping
# ═══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are a product catalog specialist for MTS Kimya, a Turkish auto detailing chemical and accessories store.

YOUR TASK: Group products that are SIZE VARIANTS of the same base product. Products that differ ONLY in volume/weight/dimensions MUST be in the SAME group with MULTIPLE entries in the "products" array.

EXAMPLE — these 3 products are ONE group:
- "GYEON QM Iron REDEFINED ... - 500 ml" (SKU: Q2M-IR500M)
- "GYEON QM Iron REDEFINED ... - 1000 ml" (SKU: Q2M-IR1000M)
- "GYEON QM Iron REDEFINED ... - 4000 ml" (SKU: Q2M-IR4000M)
→ ONE group with base_name="GYEON QM Iron REDEFINED Demir Tozu Temizleyici", products array has 3 entries.

RULES:
1. SIZE VARIANTS = identical function/formula, different volume/weight/dimension. MERGE them into ONE group.
2. Color variants of the SAME SIZE → ONE size entry with "color_variants" and "all_skus" arrays.
3. Fragrance/scent variants → SEPARATE groups (different products).
4. Formula variants (e.g., "Lava B" vs "Lava Ultra") → SEPARATE groups.
5. Chemical resistance variants (e.g., "Asit" vs "Alkali") → SEPARATE groups.
6. Dual kits "30 ml + 30 ml" vs "50 ml + 50 ml" → size variants in SAME group. Display as "30+30 ml".
7. Set descriptions like "9x80 ML" → standalone single product.
8. Cloth/pad/tape dimensions ARE size variants. E.g., 90x70 cm and 70x45 cm → SAME group.
9. Tape widths (18mm, 24mm, 36mm, 48mm) → SAME group.
10. Products with Beden="0" and no size in title → single-size group (1 product).
11. If "Beden" column conflicts with title, trust the TITLE.
12. base_name MUST NOT contain any size/volume/weight info. Strip "- 500 ml", "- 1000 ml", etc.

OUTPUT FORMAT: Return a valid JSON array. Each element is a group:
{
  "base_name": "Product name WITHOUT any size info (no ml, lt, kg, cm, mm)",
  "brand": "BRAND",
  "category": "Category from first product",
  "products": [
    {"sku": "SKU1", "title": "Full title", "size_raw": "500 ML", "size_normalized": "500 ml"},
    {"sku": "SKU2", "title": "Full title", "size_raw": "1000 ML", "size_normalized": "1000 ml"}
  ]
}

CRITICAL RULES:
- Every input SKU MUST appear exactly ONCE in the output.
- Products with the SAME base name but DIFFERENT sizes MUST be in ONE group with MULTIPLE products.
- Return ONLY valid JSON array. No markdown fences, no explanation, no text before or after the JSON."""


def build_llm_prompt(brand: str, products: list[dict]) -> tuple[str, str]:
    """Build system + user prompt for a brand batch."""
    lines = []
    for i, p in enumerate(products, 1):
        parts = [
            f"SKU: {p['sku']}",
            f"Title: {p['title']}",
            f"Beden: {p['beden']}",
        ]
        if p["size_hint"]:
            parts.append(f"SizeHint: {p['size_hint']}")
        parts.append(f"Category: {p['category']}")
        lines.append(f"{i}. " + " | ".join(parts))

    user_msg = (
        f"Here are all {brand} products ({len(products)} items). "
        f"Group them by base product and identify size variants.\n\n"
        + "\n".join(lines)
    )
    return SYSTEM_PROMPT, user_msg


def call_claude_cli(
    system: str,
    user: str,
    model: str = "",
    max_retries: int = 3,
) -> str:
    """Call Claude CLI (claude -p) via subprocess."""
    full_prompt = f"{system}\n\n---\n\n{user}"

    for attempt in range(max_retries):
        try:
            # Write prompt to temp file to avoid shell escaping issues
            with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as tmp:
                tmp.write(full_prompt)
                tmp_path = tmp.name

            cmd = ["claude", "-p", "--output-format", "text"]
            if model:
                cmd.extend(["--model", model])

            # Read prompt from stdin via file
            with open(tmp_path, "r", encoding="utf-8") as f:
                result = subprocess.run(
                    cmd,
                    stdin=f,
                    capture_output=True,
                    text=True,
                    timeout=600,
                )

            os.unlink(tmp_path)

            if result.returncode != 0:
                print(f"    [WARN] claude CLI returned {result.returncode}: {result.stderr[:200]}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                return ""

            return result.stdout.strip()

        except subprocess.TimeoutExpired:
            print(f"    [WARN] claude CLI timeout (attempt {attempt + 1})")
            if attempt < max_retries - 1:
                time.sleep(2)
        except Exception as e:
            print(f"    [ERROR] claude CLI: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                return ""

    return ""


def parse_llm_response(response: str, expected_skus: set[str]) -> list[dict]:
    """Parse and validate LLM JSON response."""
    text = response.strip()

    # Strip markdown fences if present
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)

    # Find the JSON array — LLM may add text before/after
    start = text.find("[")
    if start == -1:
        print(f"    [ERROR] No JSON array found in response")
        print(f"    Response preview: {text[:300]}")
        return []

    # Find matching closing bracket
    depth = 0
    end = start
    for i in range(start, len(text)):
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    json_text = text[start:end]

    try:
        groups = json.loads(json_text)
    except json.JSONDecodeError as e:
        print(f"    [ERROR] JSON parse failed: {e}")
        print(f"    JSON preview: {json_text[:500]}")
        return []

    if not isinstance(groups, list):
        print(f"    [ERROR] Expected JSON array, got {type(groups)}")
        return []

    # Validate SKU coverage
    found_skus = set()
    for group in groups:
        for product in group.get("products", []):
            sku = product.get("sku", "")
            found_skus.add(sku)
            # Also count all_skus for color variants
            for extra_sku in product.get("all_skus", []):
                found_skus.add(extra_sku)

    missing = expected_skus - found_skus
    extra = found_skus - expected_skus

    if missing:
        print(f"    [WARN] Missing {len(missing)} SKUs: {list(missing)[:5]}...")
    if extra:
        print(f"    [WARN] Extra {len(extra)} SKUs: {list(extra)[:5]}...")

    return groups


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 3: Normalize, Sort & Write
# ═══════════════════════════════════════════════════════════════════════════════

UNIT_TO_ML = {
    "ml": 1, "l": 1000, "lt": 1000, "litre": 1000,
    "gr": 1, "g": 1, "kg": 1000,
    "mm": 1, "cm": 10, "m": 1000,
}


def normalize_size(size_str: str) -> float:
    """Convert size string to a sortable numeric value."""
    if not size_str:
        return 0.0

    s = size_str.strip().lower().replace(",", ".")

    # Dual kit: "30+30 ml" → parse first number + unit
    dual = re.match(r"(\d+[.]?\d*)\s*\+\s*(\d+[.]?\d*)\s*(ml|l|lt|litre|kg|gr|g)", s)
    if dual:
        val = float(dual.group(1)) + float(dual.group(2))
        unit = dual.group(3)
        return val * UNIT_TO_ML.get(unit, 1)

    # Dimension: "90x70 cm" → area
    dim = re.match(r"(\d+[.]?\d*)\s*x\s*(\d+[.]?\d*)\s*(cm|mm|m)?", s)
    if dim:
        w, h = float(dim.group(1)), float(dim.group(2))
        unit = dim.group(3) or "mm"
        multiplier = UNIT_TO_ML.get(unit, 1)
        return w * h * (multiplier ** 2)

    # Pad dimension: "150/130x25" → outer diameter
    pad = re.match(r"(\d+)/(\d+)\s*x?\s*(\d+)?", s)
    if pad:
        return float(pad.group(1))

    # Simple: "500 ml", "1 lt", "25 kg"
    simple = re.match(r"(\d+[.]?\d*)\s*(ml|l|lt|litre|kg|gr|g|mm|cm|m)", s)
    if simple:
        val = float(simple.group(1))
        unit = simple.group(2)
        return val * UNIT_TO_ML.get(unit, 1)

    # Tape: "18mm x 50m" → sort by width
    tape = re.match(r"(\d+)\s*mm\s*x", s)
    if tape:
        return float(tape.group(1))

    # Just a number
    num = re.match(r"(\d+[.]?\d*)", s)
    if num:
        return float(num.group(1))

    return 0.0


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    # Turkish character mapping
    tr_map = {
        "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
        "Ç": "c", "Ğ": "g", "İ": "i", "Ö": "o", "Ş": "s", "Ü": "u",
    }
    for k, v in tr_map.items():
        text = text.replace(k, v)

    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[-\s]+", "-", text).strip("-")
    return text[:80]


def _strip_size_from_name(name: str) -> str:
    """Remove size/volume/weight info from product name for matching."""
    s = name.strip()
    # Remove trailing size patterns: "- 500 ml", "- 1000 ML", "- 25 kg", etc.
    s = re.sub(r"\s*-\s*\d+[.,]?\d*\s*(ml|ML|lt|LT|L|Litre|litre|kg|KG|gr|GR|g)\b", "", s)
    # Remove trailing dimension: "- 90x70 cm", "- 40x40cm"
    s = re.sub(r"\s*-\s*\d+\s*x\s*\d+\s*(cm|mm|m)?\b", "", s, flags=re.IGNORECASE)
    # Remove embedded size: "500 ml", "1000ml" at the end
    s = re.sub(r"\s+\d+[.,]?\d*\s*(ml|ML|lt|LT|kg|KG|gr|GR)\s*$", "", s)
    # Remove "30ml", "50ml" glued to text
    s = re.sub(r"\s+\d+\s*(ml|ML)\s*", " ", s)
    return s.strip().rstrip("-").strip()


def merge_same_base_groups(raw_groups: list[dict]) -> list[dict]:
    """Merge groups that have the same base_name (after stripping size info)."""
    from collections import OrderedDict

    merged = OrderedDict()
    for group in raw_groups:
        # Normalize base_name by stripping residual size info
        key = _strip_size_from_name(group.get("base_name", ""))
        if not key:
            key = group.get("base_name", "unknown")

        if key in merged:
            # Merge products into existing group
            merged[key]["products"].extend(group.get("products", []))
        else:
            merged[key] = {
                "base_name": key,
                "brand": group.get("brand", ""),
                "category": group.get("category", ""),
                "products": list(group.get("products", [])),
            }

    result = list(merged.values())
    merged_count = len(raw_groups) - len(result)
    if merged_count > 0:
        print(f"    Post-merge: {len(raw_groups)} → {len(result)} groups ({merged_count} merged)")
    return result


def process_groups(raw_groups: list[dict]) -> list[dict]:
    """Normalize sizes, sort, and add metadata to each group."""
    processed = []
    for group in raw_groups:
        products = group.get("products", [])

        sizes = []
        for p in products:
            size_raw = p.get("size_raw", "")
            size_norm = p.get("size_normalized", size_raw)
            sort_val = normalize_size(size_norm)

            entry = {
                "sku": p["sku"],
                "title": p.get("title", ""),
                "size_display": size_norm if size_norm else "Standart",
                "size_sort_value": sort_val,
            }

            # Preserve color variant info
            if "color_variants" in p:
                entry["color_variants"] = p["color_variants"]
            if "all_skus" in p:
                entry["all_skus"] = p["all_skus"]

            sizes.append(entry)

        # Sort by size_sort_value (smallest first)
        sizes.sort(key=lambda x: x["size_sort_value"])

        base_name = group.get("base_name", "")
        processed.append({
            "group_id": slugify(base_name),
            "base_name": base_name,
            "brand": group.get("brand", ""),
            "category": group.get("category", ""),
            "variant_count": len(sizes),
            "sizes": sizes,
        })

    return processed


def build_output(all_groups: list[dict], model: str) -> dict:
    """Assemble final JSON with metadata."""
    total_products = sum(
        sum(
            len(s.get("all_skus", [s["sku"]])) if "all_skus" in s else 1
            for s in g["sizes"]
        )
        for g in all_groups
    )
    multi_variant = sum(1 for g in all_groups if g["variant_count"] > 1)

    return {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_products": total_products,
            "total_groups": len(all_groups),
            "multi_variant_groups": multi_variant,
            "single_variant_products": len(all_groups) - multi_variant,
            "model_used": model,
            "source_csv": "assets/Products_with_barcode.csv",
        },
        "product_groups": all_groups,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Group products by size variants using LLM")
    parser.add_argument("--dry-run", action="store_true", help="Parse CSV only, no LLM calls")
    parser.add_argument("--brand", type=str, help="Process only this brand")
    parser.add_argument("--output", type=str, default=DEFAULT_OUTPUT, help="Output JSON path")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Model override for claude CLI")
    args = parser.parse_args()

    print("=" * 60)
    print("MTS Kimya — Product Size Variant Grouping")
    print("=" * 60)

    # Phase 1
    print("\n[Phase 1] Parsing CSV...")
    products = parse_csv()
    brand_groups = group_by_brand(products)

    if args.dry_run:
        print("\n[DRY-RUN] Exiting without LLM calls.")
        # Show some sample groups
        for brand, items in list(brand_groups.items())[:3]:
            print(f"\n  Sample: {brand} ({len(items)} products)")
            for p in items[:3]:
                print(f"    {p['sku']}: {p['title'][:60]}... | Beden={p['beden']} | Hint={p['size_hint']}")
        return

    # Phase 2
    print(f"\n[Phase 2] LLM Grouping (via claude CLI, model={args.model})...")

    all_groups = []

    brands_to_process = brand_groups.items()
    if args.brand:
        brand_key = args.brand.upper()
        if brand_key in brand_groups:
            brands_to_process = [(brand_key, brand_groups[brand_key])]
        else:
            print(f"  [ERROR] Brand '{args.brand}' not found. Available: {list(brand_groups.keys())}")
            return

    for brand, items in brands_to_process:
        print(f"\n  Processing {brand} ({len(items)} products)...")

        expected_skus = set(p["sku"] for p in items)
        system_prompt, user_prompt = build_llm_prompt(brand, items)

        t0 = time.time()
        response = call_claude_cli(system_prompt, user_prompt, args.model)
        elapsed = time.time() - t0

        if not response:
            print(f"    [ERROR] Empty response for {brand}, skipping")
            # Fallback: each product is its own group
            for p in items:
                all_groups.append({
                    "base_name": p["title"],
                    "brand": brand,
                    "category": p["category"],
                    "products": [{
                        "sku": p["sku"],
                        "title": p["title"],
                        "size_raw": p["beden"],
                        "size_normalized": p["beden"] if p["beden"] != "0" else "",
                    }],
                })
            continue

        groups = parse_llm_response(response, expected_skus)

        if not groups:
            print(f"    [ERROR] Failed to parse response for {brand}, using fallback")
            for p in items:
                all_groups.append({
                    "base_name": p["title"],
                    "brand": brand,
                    "category": p["category"],
                    "products": [{
                        "sku": p["sku"],
                        "title": p["title"],
                        "size_raw": p["beden"],
                        "size_normalized": p["beden"] if p["beden"] != "0" else "",
                    }],
                })
            continue

        multi = sum(1 for g in groups if len(g.get("products", [])) > 1)
        print(f"    Done in {elapsed:.1f}s → {len(groups)} groups ({multi} multi-variant)")
        all_groups.extend(groups)

    # Phase 3
    print(f"\n[Phase 3] Merging, normalizing and sorting...")
    all_groups = merge_same_base_groups(all_groups)
    processed = process_groups(all_groups)
    output = build_output(processed, args.model)

    # Write JSON
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    meta = output["metadata"]
    print(f"\n{'=' * 60}")
    print(f"DONE!")
    print(f"  Total groups:         {meta['total_groups']}")
    print(f"  Multi-variant groups: {meta['multi_variant_groups']}")
    print(f"  Single-variant:       {meta['single_variant_products']}")
    print(f"  Total products:       {meta['total_products']}")
    print(f"  Output: {args.output}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
