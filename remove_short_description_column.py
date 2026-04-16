#!/usr/bin/env python3
import csv
from pathlib import Path

ROOT = Path('/Users/projectx/Desktop/Claude Code Projects/Products Jsons')
TARGETS = [
    ROOT / 'output' / 'csv' / 'products_master.csv',
    ROOT / 'Scripts' / 'output' / 'csv' / 'products_master.csv',
]
COLUMN = 'short_description'

for path in TARGETS:
    if not path.exists():
        print(f'SKIP {path} (not found)')
        continue

    with path.open('r', encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []
        rows = list(reader)

    if COLUMN not in fields:
        print(f'OK {path} (column already absent)')
        continue

    new_fields = [f for f in fields if f != COLUMN]
    backup = path.with_suffix(path.suffix + '.bak')
    if not backup.exists():
        backup.write_text(path.read_text(encoding='utf-8-sig'), encoding='utf-8-sig')

    with path.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=new_fields)
        writer.writeheader()
        for row in rows:
            row.pop(COLUMN, None)
            writer.writerow({k: row.get(k, '') for k in new_fields})

    print(f'UPDATED {path} -> removed {COLUMN}; rows={len(rows)}; columns={len(new_fields)}; backup={backup.name}')
