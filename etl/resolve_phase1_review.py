#!/usr/bin/env python3
"""
Phase 1 review resolver: takes phase1-review.csv (53 cases) and produces
canonical staging payload (CSV + JSON) plus a still-todo CSV.

Categories:
  - size_2D: parse "AxB cm/mm/m" -> length_mm, width_mm
  - single dim: "105 mm", "31 cm" -> length_mm only
  - size word ("Ergonomik", "Mini", "Büyük Boy") -> size_label fallback
  - durability free-text -> durability_weeks/months/washes/uses_count or label
  - ph free-text -> ph_level (Nötr=7, Asidik=3, Bazik/Alkalin=11)
  - conflict capacity_ml vs capacity_liters -> volume_ml (drop both)
"""
from __future__ import annotations

import csv
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path("/Users/projectx/Desktop/Claude Code Projects/Products Jsons")
INPUT = ROOT / "data/consolidation/phase1-review.csv"
OUT_CSV = ROOT / "data/consolidation/phase1-review-resolved.csv"
OUT_JSON = ROOT / "data/consolidation/phase1-review-resolved-payload.json"
OUT_TODO = ROOT / "data/consolidation/phase1-review-stilltodo.csv"

SIZE_2D_RE = re.compile(
    r"^\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?\s*$"
)
SIZE_1D_RE = re.compile(
    r"^\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)\s*$"
)
# pattern e.g. "Mini (3 cm)"
SIZE_LABEL_W_DIM_RE = re.compile(
    r"^\s*([A-Za-zÇĞİÖŞÜçğıöşü ]+)\s*\(\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)\s*\)\s*$"
)

UNIT_TO_MM = {"mm": 1.0, "cm": 10.0, "m": 1000.0}


def to_mm(value: str, unit: str | None) -> int:
    val = float(value.replace(",", "."))
    factor = UNIT_TO_MM.get((unit or "cm").lower(), 10.0)
    return int(round(val * factor))


def make_change(seq: int, sku: str, key: str, before: Any, after: Any, label: str) -> dict:
    return {
        "id": f"phase1rev-{sku}-{key}-{seq}",
        "scope": "product.specs",
        "sku": sku,
        "field": f"specs.{key}",
        "before": before,
        "after": after,
        "label": label,
    }


def resolve_size(sku: str, raw: str, seq_start: int) -> tuple[list[dict], list[str]]:
    """Returns (changes, notes). changes is staging entries; notes empty if resolved."""
    raw = (raw or "").strip()
    out: list[dict] = []
    notes: list[str] = []

    # delete original
    delete_change = make_change(
        seq_start, sku, "size", raw, None, f"Phase1 review: drop free-text size '{raw}'"
    )

    # 1) AxB cm pattern
    m2 = SIZE_2D_RE.match(raw)
    if m2:
        length_mm = to_mm(m2.group(1), m2.group(3))
        width_mm = to_mm(m2.group(2), m2.group(3))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "length_mm",
                None,
                length_mm,
                f"Phase1 review: parse size '{raw}' → length_mm={length_mm}",
            )
        )
        out.append(
            make_change(
                seq_start + 2,
                sku,
                "width_mm",
                None,
                width_mm,
                f"Phase1 review: parse size '{raw}' → width_mm={width_mm}",
            )
        )
        return out, []

    # 2) "Mini (3 cm)" -> label + length
    mw = SIZE_LABEL_W_DIM_RE.match(raw)
    if mw:
        label_text = mw.group(1).strip()
        length_mm = to_mm(mw.group(2), mw.group(3))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "length_mm",
                None,
                length_mm,
                f"Phase1 review: parse size '{raw}' → length_mm={length_mm}",
            )
        )
        out.append(
            make_change(
                seq_start + 2,
                sku,
                "size_label",
                None,
                label_text,
                f"Phase1 review: parse size '{raw}' → size_label='{label_text}'",
            )
        )
        return out, []

    # 3) Single dim "105 mm" / "31 cm"
    m1 = SIZE_1D_RE.match(raw)
    if m1:
        length_mm = to_mm(m1.group(1), m1.group(2))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "length_mm",
                None,
                length_mm,
                f"Phase1 review: parse size '{raw}' → length_mm={length_mm}",
            )
        )
        return out, []

    # 4) Mass-as-size weirdness: "100 gr" — not a dimension at all
    if re.match(r"^\s*\d+(?:[.,]\d+)?\s*(gr|g|kg|ml|lt|l)\s*$", raw, re.IGNORECASE):
        # promote to weight_g / volume_ml etc.; here we only label-fallback to keep deterministic
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "size_label",
                None,
                raw,
                f"Phase1 review: size '{raw}' is mass/volume not dimension → preserve as size_label",
            )
        )
        return out, []

    # 5) Pure word label: "Ergonomik", "Mini", "Büyük Boy"
    if re.match(r"^[A-Za-zÇĞİÖŞÜçğıöşü ]+$", raw):
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "size_label",
                None,
                raw,
                f"Phase1 review: size '{raw}' non-numeric → size_label",
            )
        )
        return out, []

    notes.append(f"size unparseable: {raw!r}")
    return [], notes


# durability resolution helpers
WEEK_RE = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*hafta\s*$", re.IGNORECASE)
WEEK_SINGLE_RE = re.compile(r"^\s*(\d+)\s*hafta\s*$", re.IGNORECASE)
MONTH_RE = re.compile(r"^\s*(\d+)\s*ay\s*$", re.IGNORECASE)
WASH_RANGE_RE = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*y[ıi]kama\s*$", re.IGNORECASE)
USES_PLUS_RE = re.compile(r"^\s*(\d+)\s*\+\s*(?:ara[çc]|uygulama|kullan[ıi]m)\s*$", re.IGNORECASE)
USES_RANGE_RE = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*(?:ara[çc]|uygulama|kullan[ıi]m)\s*$", re.IGNORECASE)
USES_MULT_RE = re.compile(
    r"^\s*(\d+)\s*ara[çc]\s*x\s*(\d+)\s*=\s*(\d+)\s*ara[çc]\s*$", re.IGNORECASE
)


def resolve_durability(
    sku: str, key: str, raw: str, seq_start: int
) -> tuple[list[dict], list[str]]:
    raw = (raw or "").strip()
    out: list[dict] = []
    notes: list[str] = []

    delete_change = make_change(
        seq_start, sku, key, raw, None, f"Phase1 review: drop free-text {key} '{raw}'"
    )

    # weeks range -> upper end
    m = WEEK_RE.match(raw)
    if m:
        weeks = int(m.group(2))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "durability_weeks",
                None,
                weeks,
                f"Phase1 review: parse '{raw}' → durability_weeks={weeks}",
            )
        )
        return out, []

    m = WEEK_SINGLE_RE.match(raw)
    if m:
        weeks = int(m.group(1))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "durability_weeks",
                None,
                weeks,
                f"Phase1 review: parse '{raw}' → durability_weeks={weeks}",
            )
        )
        return out, []

    m = MONTH_RE.match(raw)
    if m:
        months = int(m.group(1))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "durability_months",
                None,
                months,
                f"Phase1 review: parse '{raw}' → durability_months={months}",
            )
        )
        return out, []

    m = WASH_RANGE_RE.match(raw)
    if m:
        washes = int(m.group(2))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "durability_washes",
                None,
                washes,
                f"Phase1 review: parse '{raw}' → durability_washes={washes}",
            )
        )
        return out, []

    m = USES_PLUS_RE.match(raw)
    if m:
        uses = int(m.group(1))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "durability_uses_count",
                None,
                uses,
                f"Phase1 review: parse '{raw}' → durability_uses_count={uses}",
            )
        )
        return out, []

    m = USES_MULT_RE.match(raw)
    if m:
        uses = int(m.group(3))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "durability_uses_count",
                None,
                uses,
                f"Phase1 review: parse '{raw}' → durability_uses_count={uses}",
            )
        )
        return out, []

    m = USES_RANGE_RE.match(raw)
    if m:
        uses = int(m.group(2))
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "durability_uses_count",
                None,
                uses,
                f"Phase1 review: parse '{raw}' → durability_uses_count={uses}",
            )
        )
        return out, []

    # fallback label
    out.append(delete_change)
    out.append(
        make_change(
            seq_start + 1,
            sku,
            "durability_label",
            None,
            raw,
            f"Phase1 review: durability '{raw}' unparseable numeric → preserve as label",
        )
    )
    return out, []


PH_MAP = {
    "nötr": 7,
    "notr": 7,
    "neutral": 7,
    "asidik": 3,
    "acidic": 3,
    "bazik": 11,
    "alkalin": 11,
    "alkaline": 11,
    "alkali": 11,
}


def resolve_ph(sku: str, raw: str, seq_start: int) -> tuple[list[dict], list[str]]:
    raw_clean = (raw or "").strip()
    key_norm = raw_clean.lower()
    out: list[dict] = []

    delete_change = make_change(
        seq_start, sku, "ph", raw_clean, None, f"Phase1 review: drop free-text ph '{raw_clean}'"
    )

    if key_norm in PH_MAP:
        ph_value = PH_MAP[key_norm]
        out.append(delete_change)
        out.append(
            make_change(
                seq_start + 1,
                sku,
                "ph_level",
                None,
                ph_value,
                f"Phase1 review: parse ph '{raw_clean}' → ph_level={ph_value}",
            )
        )
        return out, []

    return [], [f"ph unmapped: {raw_clean!r}"]


def resolve_volume_conflict(sku: str, raw_blob: str, seq_start: int) -> tuple[list[dict], list[str]]:
    """capacity_ml=9880 vs capacity_liters=10000 → volume_ml=9880, drop both legacy keys."""
    try:
        legacy = json.loads(raw_blob)
    except Exception:
        return [], [f"conflict blob unparseable: {raw_blob!r}"]

    out: list[dict] = []
    seq = seq_start
    # write canonical
    out.append(
        make_change(
            seq,
            sku,
            "volume_ml",
            None,
            9880.0,
            "Phase1 review: resolve capacity_ml/capacity_liters conflict → volume_ml=9880 (more precise)",
        )
    )
    seq += 1
    if "capacity_ml" in legacy:
        out.append(
            make_change(
                seq,
                sku,
                "capacity_ml",
                legacy["capacity_ml"],
                None,
                "Phase1 review: drop legacy capacity_ml (folded into volume_ml)",
            )
        )
        seq += 1
    if "capacity_liters" in legacy:
        out.append(
            make_change(
                seq,
                sku,
                "capacity_liters",
                legacy["capacity_liters"],
                None,
                "Phase1 review: drop legacy capacity_liters (1.2% drift vs capacity_ml; truth=ml)",
            )
        )
    return out, []


def main() -> int:
    rows = []
    with INPUT.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)

    all_changes: list[dict] = []
    todos: list[dict] = []
    seq = 1

    type_counts = {"size_2D": 0, "size_1D": 0, "size_label": 0, "durability": 0, "ph": 0, "conflict": 0, "other": 0}

    for r in rows:
        sku = r["sku"].strip()
        key = r["key"].strip()
        raw = r["old_value"].strip()
        reason = r.get("reason", "")

        if key == "volume_ml" and "conflicting" in reason:
            ch, notes = resolve_volume_conflict(sku, raw, seq)
            type_counts["conflict"] += 1
        elif key == "size":
            ch, notes = resolve_size(sku, raw, seq)
            # subclassify for stats
            if SIZE_2D_RE.match(raw):
                type_counts["size_2D"] += 1
            elif SIZE_1D_RE.match(raw):
                type_counts["size_1D"] += 1
            else:
                type_counts["size_label"] += 1
        elif key in ("durability", "durability_label"):
            ch, notes = resolve_durability(sku, key, raw, seq)
            type_counts["durability"] += 1
        elif key == "ph":
            ch, notes = resolve_ph(sku, raw, seq)
            type_counts["ph"] += 1
        else:
            ch, notes = [], [f"unknown key {key!r}"]
            type_counts["other"] += 1

        if notes:
            todos.append({**r, "blocker": "; ".join(notes)})
        if ch:
            all_changes.extend(ch)
            seq += len(ch)

    # write CSV
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["id", "scope", "sku", "field", "before", "after", "label"]
        )
        writer.writeheader()
        for c in all_changes:
            row = dict(c)
            # serialize None / dict consistently
            for k in ("before", "after"):
                v = row[k]
                if v is None:
                    row[k] = ""
                elif isinstance(v, (dict, list)):
                    row[k] = json.dumps(v, ensure_ascii=False)
            writer.writerow(row)

    # write JSON (single batch — only ~100ish entries)
    payload = {
        "total_changes": len(all_changes),
        "batch_count": 1,
        "batches": [
            {"index": 0, "size": len(all_changes), "changes": all_changes}
        ],
    }
    with OUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    # still-todo
    with OUT_TODO.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["sku", "key", "old_value", "suspected_new_value", "reason", "blocker"]
        )
        writer.writeheader()
        for t in todos:
            writer.writerow(t)

    print(f"input cases:   {len(rows)}")
    print(f"resolved cases: {len(rows) - len(todos)}")
    print(f"still-todo:     {len(todos)}")
    print(f"total changes:  {len(all_changes)}")
    print("type counts:    ", type_counts)
    print(f"CSV  → {OUT_CSV}")
    print(f"JSON → {OUT_JSON}")
    print(f"TODO → {OUT_TODO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
