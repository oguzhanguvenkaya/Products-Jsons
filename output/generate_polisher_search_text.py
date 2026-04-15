#!/usr/bin/env python3
"""
Generate optimized search_text for polisher_machine.json
"""

import json
import re

def clean_marketing_fluff(text):
    """Remove marketing language and subjective terms"""
    fluff_words = [
        'mükemmel', 'harika', 'en iyi', 'eşsiz', 'kusursuz', 'benzersiz',
        'olağanüstü', 'muhteşem', 'şahane', 'fevkalade', 'rakipsiz',
        'üstün'
    ]
    for word in fluff_words:
        text = re.sub(r'\b' + word + r'\b', '', text, flags=re.IGNORECASE)
    return text

def generate_search_text(product):
    """Generate optimized search_text for one product"""
    sections = []

    # 1. Product name exactly as-is (FIRST LINE)
    sections.append(product['product_name'])

    # 2. Brand and category
    brand_cat = f"Marka: {product['brand']}"
    if product.get('sub_cat2'):
        brand_cat += f" | Kategori: {product['sub_cat2']}"
    sections.append(brand_cat)

    # 3. Specs summary (already structured)
    if product.get('specs_summary'):
        sections.append(product['specs_summary'])

    # 4. Target surface
    if product.get('target_surface'):
        sections.append(f"Yüzeyler: {product['target_surface']}")

    # 5. Key features from why_this_product (technical only)
    if product.get('why_this_product'):
        why = product['why_this_product']
        # Extract bullet points
        features = []
        for line in why.split('\n'):
            line = line.strip()
            if line.startswith('•'):
                clean_line = line.replace('•', '').strip()
                clean_line = clean_marketing_fluff(clean_line)
                if clean_line:
                    features.append(clean_line)
        if features:
            sections.append('Özellikler: ' + ' | '.join(features[:5]))

    # 6. Brief how-to-use summary (2-3 steps)
    if product.get('how_to_use'):
        steps = [s.strip() for s in product['how_to_use'].split('\n') if s.strip()]
        if steps:
            # Take first 3 steps, clean numbering
            key_steps = []
            for step in steps[:3]:
                step = re.sub(r'^\d+\.\s*', '', step)
                key_steps.append(step)
            if key_steps:
                sections.append('Kullanım: ' + ' '.join(key_steps))

    # 7. Short description (clean it)
    if product.get('short_description'):
        short = clean_marketing_fluff(product['short_description'])
        short = short.strip()
        if short and len(short) > 20:
            sections.append(short)

    # Join all sections with pipe separator
    search_text = ' | '.join(sections)

    # Clean up extra whitespace
    search_text = re.sub(r'\s+', ' ', search_text)
    search_text = re.sub(r'\|\s*\|', '|', search_text)
    search_text = search_text.strip()

    # Enforce max length (~300 words ≈ 2000 chars)
    if len(search_text) > 2000:
        search_text = search_text[:1997] + '...'

    return search_text

def main():
    # Input and output paths
    input_file = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_index_raw/polisher_machine.json'
    output_file = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_text_results/polisher_machine.json'

    # Read input
    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        products = json.load(f)

    print(f"Processing {len(products)} products...")

    # Generate search_text for each product
    results = []
    for i, product in enumerate(products, 1):
        sku = product.get('sku', 'UNKNOWN')
        search_text = generate_search_text(product)

        results.append({
            'sku': sku,
            'search_text': search_text
        })

        # Count words (rough estimate)
        word_count = len(search_text.split())
        print(f"  [{i}/{len(products)}] {sku}: {len(search_text)} chars, {word_count} words")

    # Write output
    print(f"\nWriting to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Successfully generated search_text for {len(results)} products")
    print(f"✓ Output: {output_file}")

    # Show sample
    if results:
        print(f"\nSample (first product):")
        print(f"SKU: {results[0]['sku']}")
        print(f"Text length: {len(results[0]['search_text'])} chars")
        print(f"Preview: {results[0]['search_text'][:200]}...")

if __name__ == '__main__':
    main()
