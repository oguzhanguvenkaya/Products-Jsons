#!/usr/bin/env python3
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean

ROOT = Path('/Users/projectx/Desktop/Claude Code Projects/Products Jsons')
CSV_PATH = ROOT / 'output' / 'csv' / 'products_master.csv'
JSON_DIR = ROOT / 'agents' / 'output'
OUT_PATH = ROOT / 'output' / 'csv' / 'product_model_analysis.json'


def safe_len(v):
    return len(v) if isinstance(v, str) else 0


def nonempty(v):
    return v is not None and str(v).strip() != ''


def get_nested(d, path, default=None):
    cur = d
    for part in path:
        if not isinstance(cur, dict) or part not in cur:
            return default
        cur = cur[part]
    return cur


def walk(obj, prefix=''):
    paths = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            key = f'{prefix}.{k}' if prefix else k
            paths.append(key)
            paths.extend(walk(v, key))
    elif isinstance(obj, list):
        if obj:
            paths.extend(walk(obj[0], prefix + '[]'))
    return paths

rows = []
with CSV_PATH.open('r', encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f)
    headers = reader.fieldnames or []
    for row in reader:
        rows.append(row)

json_files = sorted(JSON_DIR.glob('*.json'))
json_samples = []
common_top_keys = Counter()
common_paths = Counter()
json_by_sku = {}
missing_json_for_csv = []
json_extra = []

for i, p in enumerate(json_files):
    try:
        data = json.loads(p.read_text(encoding='utf-8'))
    except Exception:
        continue
    sku = p.stem
    json_by_sku[sku] = data
    if i < 20:
        json_samples.append({
            'sku': sku,
            'top_level_keys': sorted(list(data.keys()))[:20],
            'sample_paths': sorted(walk(data))[:40],
        })
    for k in data.keys():
        common_top_keys[k] += 1
    for path in set(walk(data)):
        common_paths[path] += 1

csv_skus = {r['sku'] for r in rows if r.get('sku')}
json_skus = set(json_by_sku.keys())
missing_json_for_csv = sorted(list(csv_skus - json_skus))
json_extra = sorted(list(json_skus - csv_skus))

short_desc_lengths = [safe_len(r.get('short_description', '')) for r in rows if nonempty(r.get('short_description', ''))]
image_missing = sum(1 for r in rows if not nonempty(r.get('image_url', '')))
barcode_missing = sum(1 for r in rows if not nonempty(r.get('barcode', '')))
subcat2_missing = sum(1 for r in rows if not nonempty(r.get('sub_cat2', '')))

combo_counter = Counter()
main_counter = Counter()
sub_counter = Counter()
sub2_counter = Counter()
template_group_counter = Counter()
template_sub_counter = Counter()
for r in rows:
    main_counter[r.get('main_cat','')] += 1
    sub_counter[r.get('sub_cat','')] += 1
    sub2_counter[r.get('sub_cat2','')] += 1
    template_group_counter[r.get('template_group','')] += 1
    template_sub_counter[r.get('template_sub_type','')] += 1
    combo_counter[(r.get('main_cat',''), r.get('sub_cat',''), r.get('sub_cat2',''), r.get('template_group',''), r.get('template_sub_type',''))] += 1

# Compare CSV fields against JSON-derived paths for a sample of matched SKUs
matched = []
for sku in list(sorted(csv_skus & json_skus))[:50]:
    row = next(r for r in rows if r['sku'] == sku)
    data = json_by_sku[sku]
    matched.append({
        'sku': sku,
        'csv_product_name': row.get('product_name'),
        'csv_main_cat': row.get('main_cat'),
        'csv_sub_cat': row.get('sub_cat'),
        'csv_sub_cat2': row.get('sub_cat2'),
        'csv_template_group': row.get('template_group'),
        'csv_template_sub_type': row.get('template_sub_type'),
        'json_target_surface': get_nested(data, ['enriched', 'content', 'target_surface']) or get_nested(data, ['merged_data', 'merged_pool', 'content', 'target_surface']),
        'json_use_cases_count': len(get_nested(data, ['merged_data', 'merged_pool', 'content', 'use_cases'], []) or []),
        'json_benefits_count': len(get_nested(data, ['merged_data', 'merged_pool', 'content', 'benefits'], []) or []),
        'json_faq_count': len(get_nested(data, ['enriched', 'faq'], []) or []),
    })

result = {
    'csv': {
        'path': str(CSV_PATH),
        'row_count': len(rows),
        'column_count': len(headers),
        'headers': headers,
        'missing_counts': {
            'barcode': barcode_missing,
            'image_url': image_missing,
            'sub_cat2': subcat2_missing,
            'short_description': sum(1 for r in rows if not nonempty(r.get('short_description', ''))),
        },
        'short_description_stats': {
            'nonempty_count': len(short_desc_lengths),
            'avg_length': round(mean(short_desc_lengths), 2) if short_desc_lengths else 0,
            'max_length': max(short_desc_lengths) if short_desc_lengths else 0,
            'min_length': min(short_desc_lengths) if short_desc_lengths else 0,
        },
        'category_counts': {
            'main_cat_unique': len([k for k in main_counter if k]),
            'sub_cat_unique': len([k for k in sub_counter if k]),
            'sub_cat2_unique': len([k for k in sub2_counter if k]),
            'template_group_unique': len([k for k in template_group_counter if k]),
            'template_sub_type_unique': len([k for k in template_sub_counter if k]),
            'full_combo_unique': len(combo_counter),
        },
        'top_main_cat': main_counter.most_common(15),
        'top_sub_cat': sub_counter.most_common(20),
        'top_sub_cat2': sub2_counter.most_common(20),
        'top_template_group': template_group_counter.most_common(20),
        'top_template_sub_type': template_sub_counter.most_common(25),
    },
    'json': {
        'dir': str(JSON_DIR),
        'file_count': len(json_files),
        'common_top_level_keys': common_top_keys.most_common(20),
        'common_paths': common_paths.most_common(50),
        'sample_structures': json_samples[:8],
    },
    'mapping': {
        'csv_sku_count': len(csv_skus),
        'json_sku_count': len(json_skus),
        'intersection_count': len(csv_skus & json_skus),
        'missing_json_for_csv_count': len(missing_json_for_csv),
        'json_extra_count': len(json_extra),
        'missing_json_for_csv_sample': missing_json_for_csv[:20],
        'json_extra_sample': json_extra[:20],
        'matched_sample': matched[:20],
    }
}

OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(str(OUT_PATH))
