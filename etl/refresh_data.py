"""
refresh_data.py — v5.4 plan (Faz 1.1) — Schema + Data Refresh

Üç işi tek yerde yapar:
  1. URL backfill: assets/Products_with_barcode.csv'den products_master.csv ve
     product_search_index.csv'ye URL ekler (barcode match primary, SKU fallback).
  2. Search index enrichment: master'dan search_index'e 5 kolon kopyalar
     (sub_cat, sub_cat2, target_surface, template_group, template_sub_type).
  3. Content table cleanup: product_content.csv'den 3 duplicate kolonu siler
     (productName, targetSurface, templateGroup).

Çıktılar:
  - output/csv/products_master.csv (+url kolonu)
  - output/csv/product_search_index.csv (+5 kolon, +url doldurma)
  - output/csv/product_content.csv (-3 kolon)
  - output/unmatched_urls.csv (15 ürün, Faz 2'ye)

Backup: Her CSV için .bak kopya yazılır.

Idempotent: ikinci koşturmada da aynı sonucu verir (URL ekleme tekrarlanabilir,
kolon ekleme/silme zaten olana dokunmaz).
"""

from __future__ import annotations

import csv
import os
import shutil
from collections import Counter
from typing import Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_CSV = os.path.join(BASE_DIR, "assets", "Products_with_barcode.csv")
MANUAL_URLS_CSV = os.path.join(BASE_DIR, "assets", "manual_urls.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "data")
CSV_DIR = os.path.join(OUTPUT_DIR, "csv")

MASTER_PATH = os.path.join(CSV_DIR, "products_master.csv")
SEARCH_INDEX_PATH = os.path.join(CSV_DIR, "product_search_index.csv")
CONTENT_PATH = os.path.join(CSV_DIR, "product_content.csv")
UNMATCHED_PATH = os.path.join(OUTPUT_DIR, "unmatched_urls.csv")


def backup(path: str) -> None:
    bak = f"{path}.bak"
    if not os.path.exists(bak) and os.path.exists(path):
        shutil.copy2(path, bak)
        print(f"  📋 backup: {os.path.basename(bak)}")


def read_csv(path: str, **kwargs: Any) -> tuple[list[str], list[dict[str, str]]]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, **kwargs)
        fieldnames = reader.fieldnames or []
        rows = list(reader)
    return fieldnames, rows


def write_csv(path: str, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def normalize_sku(s: str) -> str:
    """
    SKU normalizasyonu — leading zero'ları kaldır, noktaları sil, uppercase.
    '08410' ↔ '8410', '22.202.281.001' ↔ '22202281001' eşleşsin diye.
    """
    s = (s or "").strip().upper()
    s = s.replace(".", "").replace("-", "").replace(" ", "")
    s = s.lstrip("0")  # leading zero'lar
    return s


def normalize_name(s: str) -> str:
    """Ürün adı normalizasyonu — kıyaslama için."""
    import re
    s = (s or "").lower()
    tr_map = str.maketrans("çğıöşü", "cgiosu")
    s = s.translate(tr_map)
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def load_manual_urls() -> dict[str, str]:
    """
    assets/manual_urls.csv'den {sku: url} map'i okur.
    Kullanıcı tarafından manuel eşleştirilmiş ürün URL'leri — automatic
    match'ten önce öncelik verilir. Dosya yoksa boş dict döner.
    """
    if not os.path.exists(MANUAL_URLS_CSV):
        print(f"  📥 manual_urls.csv yok, atlanıyor")
        return {}

    manual: dict[str, str] = {}
    with open(MANUAL_URLS_CSV, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            sku = (r.get("sku") or "").strip()
            url = (r.get("url") or "").strip()
            if sku and url:
                manual[sku] = url
    print(f"  📥 manual_urls: {len(manual)} mapping")
    return manual


def load_url_sources() -> tuple[
    dict[str, str],
    dict[str, str],
    dict[str, str],
    dict[str, str],
]:
    """
    Products_with_barcode.csv'den 4 map üretir:
      - barcode → url (primary)
      - stokkodu → url (direct SKU)
      - normalized_sku → url (fallback, leading zero/format farkları için)
      - normalized_name → url (son çare, ürün adı tam eşleşmesi)
    """
    _, src_rows = read_csv(ASSETS_CSV, delimiter=";")
    barcode_to_url: dict[str, str] = {}
    stokkodu_to_url: dict[str, str] = {}
    normalized_sku_to_url: dict[str, str] = {}
    normalized_name_to_url: dict[str, str] = {}

    for r in src_rows:
        url = (r.get("Url") or "").strip()
        if not url:
            continue
        barcode = (r.get("Barkodu") or "").strip()
        stokkodu = (r.get("StokKodu") or "").strip()
        name = (r.get("Baslik") or "").strip()

        if barcode:
            barcode_to_url[barcode] = url
        if stokkodu:
            stokkodu_to_url[stokkodu] = url
            norm = normalize_sku(stokkodu)
            if norm:
                normalized_sku_to_url[norm] = url
        if name:
            n = normalize_name(name)
            if n:
                normalized_name_to_url[n] = url

    print(
        f"  📥 source: {len(src_rows)} rows — "
        f"barcode={len(barcode_to_url)}, "
        f"sku={len(stokkodu_to_url)}, "
        f"norm_sku={len(normalized_sku_to_url)}, "
        f"norm_name={len(normalized_name_to_url)}"
    )
    return barcode_to_url, stokkodu_to_url, normalized_sku_to_url, normalized_name_to_url


def refresh_master(
    manual_urls: dict[str, str],
    barcode_to_url: dict[str, str],
    stokkodu_to_url: dict[str, str],
    normalized_sku_to_url: dict[str, str],
    normalized_name_to_url: dict[str, str],
) -> tuple[dict[str, dict[str, str]], list[dict[str, str]]]:
    """
    products_master.csv'yi url kolonu ile genişletir.
    Eşleşme sırası: manual_urls → barcode → stokkodu → normalized_sku → normalized_name.
    Manuel mapping en yüksek öncelik (user tarafından elden doğrulanmış).
    Dönüş: (sku→row map — search_index enrichment için), unmatched list
    """
    print("\n🔹 Master refresh...")
    backup(MASTER_PATH)

    fieldnames, rows = read_csv(MASTER_PATH)
    if "url" not in fieldnames:
        fieldnames = fieldnames + ["url"]

    master_by_sku: dict[str, dict[str, str]] = {}
    unmatched: list[dict[str, str]] = []
    match_manual = 0
    match_barcode = 0
    match_sku = 0
    match_norm_sku = 0
    match_name = 0

    for r in rows:
        sku = (r.get("sku") or "").strip()
        barcode = (r.get("barcode") or "").strip()
        product_name = (r.get("product_name") or "").strip()

        url = ""
        if sku in manual_urls:
            url = manual_urls[sku]
            match_manual += 1
        elif barcode and barcode in barcode_to_url:
            url = barcode_to_url[barcode]
            match_barcode += 1
        elif sku in stokkodu_to_url:
            url = stokkodu_to_url[sku]
            match_sku += 1
        elif normalize_sku(sku) in normalized_sku_to_url:
            url = normalized_sku_to_url[normalize_sku(sku)]
            match_norm_sku += 1
        elif normalize_name(product_name) in normalized_name_to_url:
            url = normalized_name_to_url[normalize_name(product_name)]
            match_name += 1
        else:
            unmatched.append(
                {
                    "sku": sku,
                    "barcode": barcode,
                    "brand": r.get("brand", ""),
                    "product_name": product_name,
                }
            )

        r["url"] = url
        master_by_sku[sku] = r

    write_csv(MASTER_PATH, fieldnames, rows)
    total_matched = (
        match_manual + match_barcode + match_sku + match_norm_sku + match_name
    )
    print(
        f"  ✅ master: {len(rows)} rows, {total_matched} matched "
        f"(manual={match_manual}, barcode={match_barcode}, sku={match_sku}, "
        f"norm_sku={match_norm_sku}, name={match_name}), "
        f"{len(unmatched)} unmatched"
    )
    return master_by_sku, unmatched


def refresh_search_index(master_by_sku: dict[str, dict[str, str]]) -> None:
    """
    product_search_index.csv'ye 5 yeni kolon ekler (master'dan kopya) ve
    boş URL'leri master'dan doldurur.
    """
    print("\n🔹 Search index refresh...")
    backup(SEARCH_INDEX_PATH)

    fieldnames, rows = read_csv(SEARCH_INDEX_PATH)
    new_cols = ["sub_cat", "sub_cat2", "target_surface", "template_group", "template_sub_type"]
    for col in new_cols:
        if col not in fieldnames:
            # search_text'ten önce eklemek istemiyorsak sona at
            fieldnames.append(col)

    # search_text kolonu sonda kalsın, yeni kolonlar ondan önce olsun
    if "search_text" in fieldnames:
        fieldnames = [c for c in fieldnames if c != "search_text"]
        fieldnames.append("search_text")

    url_filled = 0
    enriched = 0

    for r in rows:
        sku = (r.get("sku") or "").strip()
        master = master_by_sku.get(sku)
        if not master:
            # Master'da yoksa search_index'te durma sebebi — nadir
            for col in new_cols:
                r[col] = r.get(col, "") or ""
            continue

        # URL backfill: search_index'te boşsa master'dan al
        current_url = (r.get("url") or "").strip()
        if not current_url:
            master_url = (master.get("url") or "").strip()
            if master_url:
                r["url"] = master_url
                url_filled += 1

        # 5 kolon enrichment
        for col in new_cols:
            r[col] = master.get(col, "") or ""
        enriched += 1

    write_csv(SEARCH_INDEX_PATH, fieldnames, rows)
    print(f"  ✅ search_index: {len(rows)} rows, {url_filled} URLs filled, "
          f"{enriched} enriched with 5 cols")


def clean_content() -> None:
    """
    product_content.csv'den duplicate kolonları siler.
    """
    print("\n🔹 Content cleanup...")
    if not os.path.exists(CONTENT_PATH):
        print(f"  ⚠️  {CONTENT_PATH} yok, atlanıyor")
        return

    backup(CONTENT_PATH)

    fieldnames, rows = read_csv(CONTENT_PATH)
    drop_cols = ["productName", "targetSurface", "templateGroup"]
    kept_fields = [c for c in fieldnames if c not in drop_cols]
    dropped = [c for c in drop_cols if c in fieldnames]

    if not dropped:
        print(f"  ℹ️  content: dropCols {drop_cols} zaten yok, dokunulmadı")
        return

    cleaned_rows = [{k: r.get(k, "") for k in kept_fields} for r in rows]
    write_csv(CONTENT_PATH, kept_fields, cleaned_rows)
    print(f"  ✅ content: {len(rows)} rows, dropped {dropped}, kept {kept_fields}")


def write_unmatched(unmatched: list[dict[str, str]]) -> None:
    print("\n🔹 Unmatched report...")
    if not unmatched:
        print("  ✅ tüm ürünler eşleşti")
        return

    os.makedirs(os.path.dirname(UNMATCHED_PATH), exist_ok=True)
    fieldnames = ["sku", "barcode", "brand", "product_name"]
    write_csv(UNMATCHED_PATH, fieldnames, unmatched)

    by_brand: Counter[str] = Counter(r["brand"] for r in unmatched)
    print(f"  ⚠️  {len(unmatched)} unmatched → {UNMATCHED_PATH}")
    for b, c in by_brand.most_common():
        print(f"      {b}: {c}")


def main() -> None:
    print("=" * 60)
    print("refresh_data.py v5.4 — Schema + Data Refresh")
    print("=" * 60)

    print("\n🔹 Loading URL sources...")
    manual_urls = load_manual_urls()
    barcode_to_url, stokkodu_to_url, norm_sku_to_url, norm_name_to_url = load_url_sources()

    master_by_sku, unmatched = refresh_master(
        manual_urls,
        barcode_to_url,
        stokkodu_to_url,
        norm_sku_to_url,
        norm_name_to_url,
    )
    refresh_search_index(master_by_sku)
    clean_content()
    write_unmatched(unmatched)

    print("\n" + "=" * 60)
    print("✅ refresh_data.py tamamlandı")
    print("=" * 60)
    print("\nÇıktılar:")
    print(f"  • {MASTER_PATH} (+url kolonu)")
    print(f"  • {SEARCH_INDEX_PATH} (+5 kolon, +URL backfill)")
    print(f"  • {CONTENT_PATH} (-3 duplicate kolon)")
    print(f"  • {UNMATCHED_PATH} ({len(unmatched)} ürün Faz 2'ye)")
    print("\nSonraki adım:")
    print("  D2: Botpress tablo şemalarını güncelle")
    print("  D6: Tabloları drop + adk dev restart + seed")


if __name__ == "__main__":
    main()
