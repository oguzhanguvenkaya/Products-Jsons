#!/usr/bin/env python3
"""
Generate search_text for storage_accessories products.
Optimized for Botpress vector search with Turkish content.
"""

import json
import re

def clean_marketing_fluff(text):
    """Remove subjective marketing language."""
    if not text:
        return ""

    fluff_words = [
        'mükemmel', 'harika', 'en iyi', 'eşsiz', 'muhteşem',
        'kusursuz', 'olağanüstü', 'benzersiz', 'ideal', 'üstün',
        'kaliteli', 'profesyonel', 'premium', 'lüks'
    ]

    # Remove sentences with fluff words
    sentences = text.split('.')
    clean_sentences = []
    for sent in sentences:
        sent_lower = sent.lower()
        if not any(fluff in sent_lower for fluff in fluff_words):
            clean_sentences.append(sent.strip())

    return '. '.join(clean_sentences) if clean_sentences else text

def extract_key_points(full_description):
    """Extract technical specs and key features from description."""
    if not full_description:
        return ""

    # Split into sentences
    sentences = [s.strip() for s in full_description.split('.') if s.strip()]

    key_points = []
    tech_keywords = [
        'kapasite', 'boyut', 'ebat', 'malzeme', 'ağırlık', 'yük',
        'ölçü', 'litre', 'cm', 'mm', 'kg', 'gram',
        'bölme', 'bölüm', 'göz', 'cepler', 'kilitli',
        'taşıma', 'saklama', 'düzenleme', 'organize',
        'uyumlu', 'uygunluk', 'sığ', 'içer', 'yerleşim'
    ]

    for sent in sentences[:10]:  # First 10 sentences
        sent_lower = sent.lower()
        if any(kw in sent_lower for kw in tech_keywords):
            key_points.append(sent)
        if len(key_points) >= 5:
            break

    return '. '.join(key_points)

def generate_search_text(product):
    """Generate optimized search_text for a single product."""
    parts = []

    # 1. Product name (exact)
    if product.get('name'):
        parts.append(product['name'])

    # 2. Brand and category
    if product.get('brand'):
        parts.append(f"Marka: {product['brand']}")

    if product.get('category'):
        parts.append(f"Kategori: {product['category']}")

    if product.get('sub_category'):
        parts.append(f"Alt Kategori: {product['sub_category']}")

    # 3. Key points from full_description
    if product.get('full_description'):
        key_points = extract_key_points(product['full_description'])
        if key_points:
            parts.append(f"Özellikler: {key_points}")

    # 4. How to use (brief summary)
    if product.get('how_to_use'):
        how_to = product['how_to_use'][:300]  # Max 300 chars
        how_to = clean_marketing_fluff(how_to)
        if how_to:
            parts.append(f"Kullanım: {how_to}")

    # 5. Why this product (technical advantages only)
    if product.get('why_this_product'):
        why = clean_marketing_fluff(product['why_this_product'])
        if why:
            # Extract only technical info
            sentences = [s.strip() for s in why.split('.') if s.strip()]
            tech_sentences = [s for s in sentences[:3] if any(
                kw in s.lower() for kw in [
                    'kapasite', 'boyut', 'malzeme', 'dayanıklı',
                    'su geçirmez', 'bölme', 'organize', 'taşıma'
                ]
            )]
            if tech_sentences:
                parts.append(f"Avantajlar: {'. '.join(tech_sentences)}")

    # 6. Specs summary
    if product.get('specs_summary'):
        specs = product['specs_summary'][:200]  # Limit length
        parts.append(f"Teknik: {specs}")

    # 7. Target surface
    if product.get('target_surface'):
        parts.append(f"Kullanım Alanı: {product['target_surface']}")

    # Join with pipe separator
    search_text = ' | '.join(parts)

    # Limit total length (approx 300 words ~ 2000 chars for Turkish)
    if len(search_text) > 2000:
        search_text = search_text[:2000] + '...'

    return search_text

def main():
    input_path = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_index_raw/storage_accessories.json'
    output_path = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_text_results/storage_accessories.json'

    # Read input
    with open(input_path, 'r', encoding='utf-8') as f:
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

        print(f"  [{i}/{len(products)}] {sku}: {len(search_text)} chars")

    # Ensure output directory exists
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Written {len(results)} products to {output_path}")

if __name__ == '__main__':
    main()
