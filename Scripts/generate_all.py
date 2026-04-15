#!/usr/bin/env python3
"""
MTS Kimya — Master CSV Generation Script
Runs all table generators in sequence.

Phase A: Mechanical tables (1-5)
Phase B.1: Search index raw data preparation
Phase B.2: AI enrichment (manual — Claude Code subagents, not run here)
Phase B.3: Search index assembly
"""

import os
import sys
import shutil
import time

# Ensure Scripts directory is in path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)


def run_phase(label: str, func):
    """Run a generation phase with timing."""
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    start = time.time()
    result = func()
    elapsed = time.time() - start
    print(f"  [{elapsed:.1f}s]")
    return result


def archive_old_scripts():
    """Archive generate_product_content_csv.py to .bak."""
    src = os.path.join(BASE_DIR, "generate_product_content_csv.py")
    dst = os.path.join(BASE_DIR, "generate_product_content_csv.py.bak")
    if os.path.exists(src) and not os.path.exists(dst):
        shutil.copy2(src, dst)
        print(f"  Archived: generate_product_content_csv.py → .bak")


def main():
    print("=" * 60)
    print("  MTS Kimya — CSV Generation Pipeline")
    print("  6 Tables: master, specs, faq, relations, categories, search_index")
    print("=" * 60)

    start_total = time.time()

    # Archive old content script
    archive_old_scripts()

    # Phase A: Mechanical tables
    import generate_products_master_csv
    import generate_product_specs_csv
    import generate_product_faq_csv
    import generate_product_relations_csv
    import generate_product_categories_csv

    run_phase("Phase A.1: products_master.csv", generate_products_master_csv.main)
    run_phase("Phase A.2: product_specs.csv", generate_product_specs_csv.main)
    run_phase("Phase A.3: product_faq.csv", generate_product_faq_csv.main)
    run_phase("Phase A.4: product_relations.csv", generate_product_relations_csv.main)
    run_phase("Phase A.5: product_categories.csv", generate_product_categories_csv.main)

    # Phase B.1: Search index raw data
    import generate_search_index_raw
    run_phase("Phase B.1: search_index_raw (data preparation)", generate_search_index_raw.main)

    # Phase B.2: AI enrichment — manual step
    print(f"\n{'='*60}")
    print("  Phase B.2: AI Enrichment (MANUAL STEP)")
    print("  Run Claude Code subagents to generate search_text")
    print("  Input:  output/search_index_raw/*.json")
    print("  Output: output/search_text_results/*.json")
    print(f"{'='*60}")

    # Phase B.3: Assembly
    import assemble_search_index_csv
    run_phase("Phase B.3: product_search_index.csv (assembly)", assemble_search_index_csv.main)

    elapsed_total = time.time() - start_total
    print(f"\n{'='*60}")
    print(f"  Pipeline complete! Total time: {elapsed_total:.1f}s")
    print(f"{'='*60}")

    # Summary of output files
    csv_dir = os.path.join(os.path.dirname(BASE_DIR), "output", "csv")
    print(f"\nGenerated CSV files in {csv_dir}/:")
    if os.path.exists(csv_dir):
        for f in sorted(os.listdir(csv_dir)):
            if f.endswith(".csv"):
                path = os.path.join(csv_dir, f)
                size = os.path.getsize(path)
                print(f"  {f} ({size:,} bytes)")


if __name__ == "__main__":
    main()
