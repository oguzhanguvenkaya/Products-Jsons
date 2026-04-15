#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate optimized search_text for Botpress vector search
Removes marketing fluff, keeps technical specs and key features
"""

import json
import re
import sys

def remove_marketing_fluff(text):
    """Remove subjective marketing language"""
    if not text:
        return ""

    # Common Turkish marketing words to filter out
    fluff_words = [
        'mükemmel', 'harika', 'en iyi', 'eşsiz', 'muhteşem',
        'olağanüstü', 'benzersiz', 'üstün', 'kusursuz', 'etkileyici',
        'profesyonel kalite', 'yüksek kalite', 'premium kalite'
    ]

    cleaned = text
    for word in fluff_words:
        # Case insensitive replacement
        cleaned = re.sub(r'\b' + re.escape(word) + r'\b', '', cleaned, flags=re.IGNORECASE)

    # Clean up extra spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def extract_key_features(full_description, max_features=5):
    """Extract key technical features from description"""
    if not full_description:
        return ""

    # Split into sentences
    sentences = re.split(r'[.!?]+', full_description)

    key_features = []
    tech_keywords = [
        'cut', 'finish', 'abrasiv', 'silikon', 'hologram', 'çizik',
        'pasta', 'polish', 'compound', 'rotary', 'da', 'dual action',
        'mikron', 'μm', 'rpm', 'vernik', 'boya', 'lake', 'seramik',
        'naylon', 'yün', 'sünger', 'pad', 'makine', 'machine'
    ]

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        # Check if sentence contains technical keywords
        sentence_lower = sentence.lower()
        if any(keyword in sentence_lower for keyword in tech_keywords):
            # Remove marketing fluff
            cleaned = remove_marketing_fluff(sentence)
            if cleaned and len(cleaned) > 20:
                key_features.append(cleaned)
                if len(key_features) >= max_features:
                    break

    return ' | '.join(key_features)

def extract_how_to_use_summary(how_to_use):
    """Extract brief summary from how_to_use"""
    if not how_to_use:
        return ""

    # Split into sentences and take first 2-3
    sentences = re.split(r'[.!?]+', how_to_use)
    summary_sentences = []

    for sentence in sentences[:3]:
        sentence = sentence.strip()
        if sentence and len(sentence) > 15:
            summary_sentences.append(sentence)

    summary = '. '.join(summary_sentences)
    if summary and not summary.endswith('.'):
        summary += '.'

    return remove_marketing_fluff(summary)

def extract_technical_advantages(why_this_product):
    """Extract technical advantages, remove marketing fluff"""
    if not why_this_product:
        return ""

    cleaned = remove_marketing_fluff(why_this_product)

    # Keep only sentences with technical info
    sentences = re.split(r'[.!?]+', cleaned)
    tech_sentences = []

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence or len(sentence) < 20:
            continue

        # Keep if it contains technical terms
        if any(term in sentence.lower() for term in [
            'cut', 'finish', 'abrasiv', 'silikon', 'hologram',
            'mikron', 'rpm', 'vernik', 'boya', 'seramik', 'pad'
        ]):
            tech_sentences.append(sentence)

    return ' | '.join(tech_sentences[:3])

def generate_search_text(product):
    """Generate optimized search_text for a single product"""
    sections = []

    # 1. Product name exactly as-is
    sections.append(product['product_name'])

    # 2. Brand and category info
    if product.get('brand'):
        sections.append(f"Marka: {product['brand']}")

    if product.get('main_cat'):
        cat_text = f"Kategori: {product['main_cat']}"
        if product.get('sub_cat'):
            cat_text += f" > {product['sub_cat']}"
        if product.get('sub_cat2'):
            cat_text += f" > {product['sub_cat2']}"
        sections.append(cat_text)

    # 3. Target surface
    if product.get('target_surface'):
        sections.append(f"Yüzey: {product['target_surface']}")

    # 4. Key features from full_description
    key_features = extract_key_features(product.get('full_description', ''))
    if key_features:
        sections.append(key_features)

    # 5. Specs summary
    if product.get('specs_summary'):
        specs = remove_marketing_fluff(product['specs_summary'])
        if specs:
            sections.append(f"Özellikler: {specs}")

    # 6. How to use summary
    how_to_summary = extract_how_to_use_summary(product.get('how_to_use', ''))
    if how_to_summary:
        sections.append(f"Kullanım: {how_to_summary}")

    # 7. Technical advantages from why_this_product
    tech_advantages = extract_technical_advantages(product.get('why_this_product', ''))
    if tech_advantages:
        sections.append(tech_advantages)

    # Join all sections with pipe separator
    search_text = ' | '.join(sections)

    # Final cleanup
    search_text = re.sub(r'\s+', ' ', search_text).strip()

    # Truncate to approximately 300 words if needed
    words = search_text.split()
    if len(words) > 300:
        search_text = ' '.join(words[:300]) + '...'

    return search_text

def main():
    input_file = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_index_raw/abrasive_polish.json'
    output_file = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_text_results/abrasive_polish.json'

    # Read input
    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        products = json.load(f)

    print(f"Processing {len(products)} products...")

    # Generate search_text for each product
    results = []
    for i, product in enumerate(products, 1):
        search_text = generate_search_text(product)
        results.append({
            'sku': product['sku'],
            'search_text': search_text
        })

        if i % 10 == 0:
            print(f"Processed {i}/{len(products)} products")

    # Write output
    print(f"Writing results to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"✓ Done! Generated search_text for {len(results)} products")
    print(f"\nSample output (first product):")
    print(f"SKU: {results[0]['sku']}")
    print(f"Length: {len(results[0]['search_text'])} chars, {len(results[0]['search_text'].split())} words")
    print(f"Preview: {results[0]['search_text'][:200]}...")

if __name__ == '__main__':
    main()
