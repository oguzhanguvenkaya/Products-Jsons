#!/usr/bin/env python3
"""
Generate optimized search_text fields for Botpress vector search.
Removes marketing fluff, keeps technical specs and key features.
"""

import json
import re

def clean_marketing_fluff(text):
    """Remove subjective marketing language."""
    fluff_words = [
        'mükemmel', 'harika', 'en iyi', 'eşsiz', 'muhteşem',
        'olağanüstü', 'kusursuz', 'benzersiz', 'ideal', 'üstün',
        'maksimum performans', 'yüksek performans', 'profesyonel sonuç'
    ]
    for word in fluff_words:
        text = re.sub(r'\b' + word + r'\b', '', text, flags=re.IGNORECASE)
    return text

def extract_key_features(full_description):
    """Extract technical specs and key features from full description."""
    if not full_description:
        return ""

    # Split into lines
    lines = full_description.split('\n')
    key_points = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Skip pure marketing headers
        if line in ['Özellikler:', 'Kullanım:', 'Avantajlar:']:
            continue

        # Include technical specs lines
        if any(keyword in line.lower() for keyword in [
            'çap', 'mm', 'kalınlık', 'sertlik', 'yoğunluk', 'kesim',
            'finish', 'rotary', 'orbital', 'devir', 'rpm', 'ppi',
            'foam', 'sünger', 'keçe', 'yıkanabilir', 'güvenlik',
            'taban', 'yüzey', 'uyumlu', 'pasta', 'cila', 'compound'
        ]):
            # Clean and add
            cleaned = clean_marketing_fluff(line)
            cleaned = cleaned.replace('•', '').strip()
            if cleaned and len(cleaned) > 3:
                key_points.append(cleaned)

    return ' | '.join(key_points[:8])  # Max 8 key points

def extract_how_to_use_summary(how_to_use):
    """Extract brief summary from how_to_use."""
    if not how_to_use:
        return ""

    # Take first 2-3 sentences or first 200 chars
    sentences = how_to_use.split('.')
    summary_parts = []
    char_count = 0

    for sent in sentences[:3]:
        sent = sent.strip()
        if sent and char_count < 200:
            summary_parts.append(sent)
            char_count += len(sent)

    summary = '. '.join(summary_parts)
    if summary and not summary.endswith('.'):
        summary += '.'

    return clean_marketing_fluff(summary)

def extract_technical_advantages(why_this_product):
    """Extract only technical advantages, skip marketing."""
    if not why_this_product:
        return ""

    lines = why_this_product.split('\n')
    tech_advantages = []

    for line in lines:
        line = line.strip().replace('•', '').strip()
        if not line or len(line) < 10:
            continue

        # Only include if it contains technical terms
        if any(keyword in line.lower() for keyword in [
            'sertlik', 'kesim', 'finish', 'yoğunluk', 'kalınlık',
            'güvenlik', 'yıkanabilir', 'dayanıklı', 'foam', 'sünger',
            'keçe', 'çap', 'taban', 'pasta', 'cila', 'compound',
            'rotary', 'orbital', 'makine', 'devir'
        ]):
            cleaned = clean_marketing_fluff(line)
            if cleaned and len(cleaned) > 10:
                tech_advantages.append(cleaned)

    return ' | '.join(tech_advantages[:4])  # Max 4 advantages

def generate_search_text(product):
    """Generate optimized search_text for a product."""
    sections = []

    # 1. Product name (exact)
    sections.append(product['product_name'])

    # 2. Brand and category
    brand = product.get('brand', '')
    main_cat = product.get('main_cat', '')
    sub_cat = product.get('sub_cat', '')
    sub_cat2 = product.get('sub_cat2', '')

    if brand:
        sections.append(f"Marka: {brand}")

    cat_parts = [c for c in [main_cat, sub_cat, sub_cat2] if c]
    if cat_parts:
        sections.append(f"Kategori: {' > '.join(cat_parts)}")

    # 3. Target surface
    target_surface = product.get('target_surface', '')
    if target_surface and len(target_surface) > 5:
        sections.append(f"Yüzeyler: {target_surface}")

    # 4. Key features from full_description
    full_desc = product.get('full_description', '')
    key_features = extract_key_features(full_desc)
    if key_features:
        sections.append(key_features)

    # 5. Specs summary
    specs = product.get('specs_summary', '')
    if specs:
        sections.append(f"Özellikler: {specs}")

    # 6. How to use summary
    how_to_use = product.get('how_to_use', '')
    use_summary = extract_how_to_use_summary(how_to_use)
    if use_summary:
        sections.append(f"Kullanım: {use_summary}")

    # 7. Technical advantages
    why_this = product.get('why_this_product', '')
    tech_adv = extract_technical_advantages(why_this)
    if tech_adv:
        sections.append(f"Avantajlar: {tech_adv}")

    # Join all sections with pipe
    search_text = ' | '.join(sections)

    # Final cleanup: remove multiple spaces, trim
    search_text = re.sub(r'\s+', ' ', search_text)
    search_text = search_text.strip()

    # Word count check (aim for ~300 words max)
    words = search_text.split()
    if len(words) > 300:
        # Truncate at last complete section before 300 words
        truncated = ' '.join(words[:300])
        last_pipe = truncated.rfind('|')
        if last_pipe > 0:
            search_text = truncated[:last_pipe].strip()
        else:
            search_text = truncated

    return search_text

def main():
    input_file = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_index_raw/polishing_pad.json'
    output_file = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons/output/search_text_results/polishing_pad.json'

    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        products = json.load(f)

    print(f"Processing {len(products)} products...")
    results = []

    for i, product in enumerate(products, 1):
        sku = product.get('sku', 'UNKNOWN')
        search_text = generate_search_text(product)

        results.append({
            'sku': sku,
            'search_text': search_text
        })

        print(f"  [{i}/{len(products)}] {sku}: {len(search_text)} chars, {len(search_text.split())} words")

    print(f"\nWriting {len(results)} results to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("Done!")

if __name__ == '__main__':
    main()
