#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate search_text for fragrance products
"""

import json
import re

def clean_marketing_fluff(text):
    """Remove marketing language and excessive adjectives"""
    if not text:
        return ""

    # Marketing words to remove
    fluff_words = [
        'mükemmel', 'harika', 'en iyi', 'eşsiz', 'muhteşem', 'olağanüstü',
        'benzersiz', 'kusursuz', 'ideal', 'süper', 'ultra', 'premium kalite',
        'yüksek kalite', 'profesyonel kalite', 'birinci sınıf'
    ]

    result = text
    for word in fluff_words:
        # Case insensitive replacement
        result = re.sub(r'\b' + re.escape(word) + r'\b', '', result, flags=re.IGNORECASE)

    # Clean up extra spaces
    result = re.sub(r'\s+', ' ', result).strip()
    return result

def extract_key_points(full_description, max_sentences=5):
    """Extract key technical points from description"""
    if not full_description:
        return ""

    # Split into sentences
    sentences = re.split(r'[.!?]+', full_description)

    key_points = []
    keywords = [
        'içer', 'formül', 'bileşen', 'koku', 'parfüm', 'esans',
        'uyumlu', 'kullan', 'uygula', 'çalış', 'etkili',
        'ml', 'litre', 'gram', 'konsantre', 'yoğunluk',
        'organik', 'doğal', 'sentetik', 'kimyasal', 'uzun süreli',
        'yüzey', 'malzeme', 'deri', 'plastik', 'kauçuk', 'tekstil'
    ]

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        # Check if sentence contains technical keywords
        lower_sentence = sentence.lower()
        if any(keyword in lower_sentence for keyword in keywords):
            key_points.append(sentence)
            if len(key_points) >= max_sentences:
                break

    # If we didn't find enough technical sentences, add first sentences
    if len(key_points) < 3:
        for sentence in sentences[:max_sentences]:
            sentence = sentence.strip()
            if sentence and sentence not in key_points:
                key_points.append(sentence)
                if len(key_points) >= 3:
                    break

    return ". ".join(key_points)

def generate_search_text(product):
    """Generate optimized search_text for a product"""
    parts = []

    # 1. Product name (exact)
    if product.get('name'):
        parts.append(product['name'])

    # 2. Brand
    if product.get('brand'):
        parts.append(f"Marka: {product['brand']}")

    # 3. Category
    if product.get('category'):
        parts.append(f"Kategori: {product['category']}")

    # 4. Subcategory
    if product.get('subcategory'):
        parts.append(f"Alt Kategori: {product['subcategory']}")

    # 5. Key points from full_description
    if product.get('full_description'):
        key_points = extract_key_points(product['full_description'])
        if key_points:
            cleaned = clean_marketing_fluff(key_points)
            if cleaned:
                parts.append(cleaned)

    # 6. How to use (brief)
    if product.get('how_to_use'):
        how_to = product['how_to_use'].strip()
        # Take first 2-3 sentences
        sentences = re.split(r'[.!?]+', how_to)
        brief_how_to = ". ".join([s.strip() for s in sentences[:3] if s.strip()])
        if brief_how_to:
            cleaned = clean_marketing_fluff(brief_how_to)
            if cleaned and len(cleaned) > 20:
                parts.append(f"Kullanım: {cleaned}")

    # 7. Why this product (technical advantages only)
    if product.get('why_this_product'):
        why = product['why_this_product'].strip()
        # Extract only technical advantages
        sentences = re.split(r'[.!?]+', why)
        tech_advantages = []
        tech_keywords = ['formül', 'içerik', 'konsantre', 'etki', 'koruma',
                        'dayanıklı', 'süre', 'teknoloji', 'özellik']

        for sentence in sentences[:3]:
            sentence = sentence.strip()
            if sentence and any(kw in sentence.lower() for kw in tech_keywords):
                tech_advantages.append(sentence)

        if tech_advantages:
            tech_text = ". ".join(tech_advantages)
            cleaned = clean_marketing_fluff(tech_text)
            if cleaned and len(cleaned) > 20:
                parts.append(cleaned)

    # 8. Specs summary
    if product.get('specs_summary'):
        specs = product['specs_summary'].strip()
        if specs:
            cleaned = clean_marketing_fluff(specs)
            if cleaned:
                parts.append(f"Özellikler: {cleaned}")

    # 9. Target surface
    if product.get('target_surface'):
        parts.append(f"Kullanım Alanı: {product['target_surface']}")

    # 10. Scent type (specific to fragrance)
    if product.get('scent_type'):
        parts.append(f"Koku Tipi: {product['scent_type']}")

    # Join with pipe separator
    search_text = " | ".join(parts)

    # Limit to approximately 300 words
    words = search_text.split()
    if len(words) > 300:
        search_text = " ".join(words[:300]) + "..."

    return search_text

def main():
    input_file = "/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_index_raw/fragrance.json"
    output_file = "/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_text_results/fragrance.json"

    # Read input
    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        products = json.load(f)

    print(f"Processing {len(products)} products...")

    # Generate search_text for each product
    results = []
    for i, product in enumerate(products, 1):
        if i % 10 == 0:
            print(f"  Processed {i}/{len(products)}...")

        search_text = generate_search_text(product)
        results.append({
            "sku": product.get('sku', ''),
            "search_text": search_text
        })

    # Ensure output directory exists
    import os
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    # Write output
    print(f"Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"Done! Generated search_text for {len(results)} products.")

if __name__ == '__main__':
    main()
