#!/usr/bin/env python3
"""
Kategori JSON → Chatbot-Ready Markdown Dönüşümü

24 kategori JSON dosyasını (622 ürün) chatbot.com RAG bilgi bankası için
Markdown formatına dönüştürür.

Çıktı: chatbot_md/ klasörü (24 kategori MD + 1 index MD = 25 dosya)
"""

import json
import os
import re
import html
import glob

# ---------- CONFIGURATION ----------

INPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Product Groups")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chatbot_md")

# Template field Türkçe çeviri sözlüğü
# Sadece emin olunan, açık çevirileri olan alanlar
FIELD_TRANSLATIONS = {
    # Genel
    "durability_months": "Dayanım (Ay)",
    "durability_km": "Dayanım (Km)",
    "durability_label": "Dayanım",
    "durability_days": "Dayanım (Gün)",
    "durability": "Dayanım",
    "layer_count": "Kat Sayısı",
    "hardness": "Sertlik",
    "ph_tolerance": "pH Toleransı",
    "application_surface": "Uygulama Yüzeyi",
    "cure_time_hours": "Kürleşme Süresi (Saat)",
    "consumption_ml_per_car": "Tüketim (ml/araç)",
    "technology": "Teknoloji",
    "note": "Not",
    "color": "Renk",
    "material": "Malzeme",
    "weight_g": "Ağırlık (g)",
    "size": "Boyut",
    "diameter": "Çap",
    "thickness": "Kalınlık",
    "dimensions_mm": "Boyutlar (mm)",
    "capacity_ml": "Kapasite (ml)",
    "capacity_l": "Kapasite (L)",
    "volume_ml": "Hacim (ml)",
    "volume_l": "Hacim (L)",
    "scent": "Koku",
    "design": "Tasarım",
    "made_in": "Üretim Yeri",
    "grade": "Agresiflik Seviyesi",
    "reusable": "Yeniden Kullanılabilir",
    "machine_compatible": "Makine Uyumlu",
    "lubricant_required": "Kaydırıcı Gerektirir",
    "ph_level": "pH Seviyesi",
    "dilution_ratio": "Seyreltme Oranı",
    "foam_level": "Köpük Seviyesi",
    "concentrate": "Konsantre",
    "application_method": "Uygulama Yöntemi",
    "safe_on_coatings": "Kaplama Üzerinde Güvenli",
    "safe_on_ppf": "PPF Üzerinde Güvenli",
    "uv_protection": "UV Koruma",
    "gloss_level": "Parlaklık Seviyesi",
    "pad_type": "Pad Tipi",
    "pad_size": "Pad Boyutu",
    "pad_hardness": "Pad Sertliği",
    "backing_type": "Taban Tipi",
    "gsm": "GSM",
    "pile_type": "Hav Tipi",
    "pile_length": "Hav Uzunluğu",
    "edge_type": "Kenar Tipi",
    "pieces_per_pack": "Adet/Paket",
    "power_w": "Güç (W)",
    "speed_rpm": "Hız (RPM)",
    "orbit_mm": "Orbit (mm)",
    "weight_kg": "Ağırlık (kg)",
    "voltage": "Voltaj",
    "cord_length_m": "Kablo Uzunluğu (m)",
    "backing_plate_size": "Taban Plakası Boyutu",
    "alcohol_free": "Alkolsüz",
    "toxic_free": "Toksik Madde İçermez",
    "clay_form": "Kil Formu",
    "width_mm": "Genişlik (mm)",
    "length_m": "Uzunluk (m)",
    "temperature_resistance_c": "Sıcaklık Dayanımı (°C)",
    "adhesion_level": "Yapışma Seviyesi",
    "spray_type": "Sprey Tipi",
    "trigger_type": "Tetik Tipi",
    "bottle_material": "Şişe Malzemesi",
    "chemical_resistant": "Kimyasal Dayanımlı",
    "max_pressure_bar": "Maks. Basınç (Bar)",
    "cut_level": "Kesme Gücü",
    "finish_level": "Son Kat Seviyesi",
    "abrasive_type": "Aşındırıcı Tipi",
    "shelf_life_months": "Raf Ömrü (Ay)",
    "country_of_origin": "Menşe Ülke",
    "contact_angle": "Temas Açısı",
    "shrinkage": "Büzülme",
}

# Relations Türkçe etiketleri
RELATION_LABELS = {
    "use_before": "Öncesinde kullan",
    "use_after": "Sonrasında kullan",
    "use_with": "Birlikte kullan",
    "accessories": "Aksesuarlar",
    "alternatives": "Alternatifler",
}


# ---------- TEXT CLEANING ----------

def clean_text(text):
    """Metin temizleme: HTML entity, tag, Windows satır sonu, bozuk unicode."""
    if text is None:
        return ""
    if not isinstance(text, str):
        return str(text)

    # 1. HTML entity decode (nested entities dahil)
    text = html.unescape(text)
    # İkinci geçiş: çift encode edilmiş entity'ler için
    text = html.unescape(text)

    # 2. Windows satır sonu
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # 3. HTML tag kalıntıları → newline (block-level)
    text = re.sub(r'<\s*br\s*/?\s*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<\s*/?\s*(p|div|li|tr|td|th|h[1-6])\s*[^>]*>', '\n', text, flags=re.IGNORECASE)
    # Diğer HTML tagları → sil
    text = re.sub(r'<[^>]+>', '', text)

    # 4. Bozuk unicode kontrol karakterleri (tab, newline hariç)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    # \u00100 gibi bozuk unicode (U+0100 = Ā, ama bağlamda bozuk)
    # Sadece gerçekten bozuk olanları temizle - Latin Extended karakterleri koru
    # Ama \u00100 gibi "sıfırlı" bozuk durumlar → sil
    text = re.sub(r'\u0100', '', text)

    # 5. Çoklu boş satır → max 2
    text = re.sub(r'\n{3,}', '\n\n', text)

    # 6. Trailing whitespace
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)

    return text.strip()


# ---------- PRICE FORMATTING ----------

def format_price(price_kurus):
    """Kuruş → TL formatı: 280000 → 2.800,00 TL"""
    if price_kurus is None or price_kurus == 0:
        return None
    tl = price_kurus / 100
    # Türk formatı: binlik ayracı nokta, ondalık virgül
    if tl == int(tl):
        formatted = f"{int(tl):,}".replace(",", ".") + ",00"
    else:
        # Ondalık kısmı ayır
        integer_part = int(tl)
        decimal_part = round((tl - integer_part) * 100)
        formatted = f"{integer_part:,}".replace(",", ".") + f",{decimal_part:02d}"
    return f"{formatted} TL"


# ---------- FIELD FORMATTING ----------

def translate_field_name(key):
    """Template field adını Türkçeleştir veya Title Case yap."""
    if key in FIELD_TRANSLATIONS:
        return FIELD_TRANSLATIONS[key]
    # snake_case → Title Case
    return key.replace("_", " ").title()


def format_field_value(value):
    """Template field değerini okunabilir stringe çevir."""
    if isinstance(value, bool):
        return "Evet" if value else "Hayır"
    if isinstance(value, (int, float)):
        return str(value)
    return clean_text(str(value))


# ---------- SKU→NAME MAPPING ----------

def build_sku_map(all_products):
    """Tüm ürünlerden SKU → ürün adı mapping oluştur."""
    sku_map = {}
    for product in all_products:
        sku = product.get("sku", "")
        # Ürün adı: short_description'ın ilk cümlesi veya SKU
        short_desc = product.get("content", {}).get("short_description", "")
        if short_desc:
            # İlk virgül veya nokta öncesi genellikle ürün adıdır
            # Ör: "GYEON Q One EVO 50 ml Seramik Kaplama - MTS Kimya..."
            name = short_desc.split(" - ")[0].split(",")[0].strip()
            # Çok uzunsa kısalt
            if len(name) > 80:
                name = name[:77] + "..."
            sku_map[sku] = clean_text(name)
        else:
            sku_map[sku] = sku
    return sku_map


# ---------- MARKDOWN GENERATION ----------

def generate_product_md(product, sku_map):
    """Tek ürün için Markdown bloğu oluştur."""
    lines = []

    sku = product.get("sku", "Bilinmiyor")
    content = product.get("content", {})
    template = product.get("template", {})
    relations = product.get("relations", {})
    faq_list = product.get("faq", [])
    price = product.get("price")
    barcode = product.get("barcode", "")
    category = product.get("category", {})
    cleaned_content = product.get("cleaned_content", {})

    # Ürün adı: short_description'dan çıkar
    short_desc = content.get("short_description", "")
    product_name = short_desc.split(" - ")[0].split(",")[0].strip() if short_desc else sku
    product_name = clean_text(product_name)

    # H2 başlık
    lines.append(f"## {product_name} (SKU: {sku})")
    lines.append("")

    # Temel bilgiler
    if barcode:
        lines.append(f"**Barkod:** {barcode}")
    if price is not None and price > 0:
        formatted_price = format_price(price)
        if formatted_price:
            lines.append(f"**Fiyat:** {formatted_price}")

    # Kategori breadcrumb
    cat_parts = []
    for key in ["main_cat", "sub_cat", "sub_cat2"]:
        val = category.get(key, "")
        if val:
            cat_parts.append(val)
    if cat_parts:
        lines.append(f"**Kategori:** {' > '.join(cat_parts)}")

    lines.append("")

    # Kısa Açıklama
    if short_desc:
        lines.append("### Kısa Açıklama")
        lines.append(clean_text(short_desc))
        lines.append("")

    # Detaylı Açıklama
    full_desc = content.get("full_description", "")
    if full_desc:
        lines.append("### Detaylı Açıklama")
        lines.append(clean_text(full_desc))
        lines.append("")

    # Teknik Özellikler
    fields = template.get("fields", {})
    if fields:
        lines.append("### Teknik Özellikler")
        lines.append("| Özellik | Değer |")
        lines.append("|---------|-------|")
        for key, value in fields.items():
            field_name = translate_field_name(key)
            field_value = format_field_value(value)
            # Pipe karakterlerini escape et
            field_name = field_name.replace("|", "\\|")
            field_value = field_value.replace("|", "\\|")
            lines.append(f"| {field_name} | {field_value} |")
        lines.append("")

    # Nasıl Kullanılır?
    how_to_use = content.get("how_to_use", "")
    if how_to_use:
        lines.append("### Nasıl Kullanılır?")
        lines.append(clean_text(how_to_use))
        lines.append("")

    # Ne Zaman Kullanılır?
    when_to_use = content.get("when_to_use", "")
    if when_to_use:
        lines.append("### Ne Zaman Kullanılır?")
        lines.append(clean_text(when_to_use))
        lines.append("")

    # Hedef Yüzeyler
    target_surface = content.get("target_surface", "")
    if target_surface:
        lines.append("### Hedef Yüzeyler")
        lines.append(clean_text(target_surface))
        lines.append("")

    # Neden Bu Ürün?
    why_this = content.get("why_this_product", "")
    if why_this:
        lines.append("### Neden Bu Ürün?")
        lines.append(clean_text(why_this))
        lines.append("")

    # İlişkili Ürünler
    has_relations = False
    relation_lines = []
    for rel_key, rel_label in RELATION_LABELS.items():
        rel_skus = relations.get(rel_key, [])
        if rel_skus:
            has_relations = True
            sku_names = []
            for rel_sku in rel_skus:
                name = sku_map.get(rel_sku, rel_sku)
                if name != rel_sku:
                    sku_names.append(f"{name} ({rel_sku})")
                else:
                    sku_names.append(rel_sku)
            relation_lines.append(f"- **{rel_label}:** {', '.join(sku_names)}")

    if has_relations:
        lines.append("### İlişkili Ürünler")
        lines.extend(relation_lines)
        lines.append("")

    # Sıkça Sorulan Sorular
    if faq_list:
        lines.append("### Sıkça Sorulan Sorular")
        for faq in faq_list:
            q = clean_text(faq.get("question", ""))
            a = clean_text(faq.get("answer", ""))
            if q and a:
                lines.append(f"**S: {q}**")
                lines.append(f"C: {a}")
                lines.append("")

    # Web Kaynak İçerikleri (cleaned_content)
    if cleaned_content:
        source_lines = []
        i = 1
        while True:
            url_key = f"url_{i}"
            content_key = f"cleaned_content_{i}"
            url = cleaned_content.get(url_key)
            cc = cleaned_content.get(content_key)
            if url is None and cc is None:
                break
            if url and cc:
                source_lines.append(f"> Kaynak {i}: {url}")
                source_lines.append("")
                source_lines.append(clean_text(cc))
                source_lines.append("")
            i += 1

        if source_lines:
            lines.append("### Web Kaynak İçerikleri")
            lines.extend(source_lines)

    # Ayırıcı
    lines.append("---")
    lines.append("")

    return "\n".join(lines)


def generate_category_md(metadata, products, sku_map):
    """Bir kategori için tam Markdown dosyası oluştur."""
    lines = []

    group_name = metadata.get("group_name", "Bilinmiyor")
    description = metadata.get("description", "")
    sub_types = metadata.get("sub_types", [])

    # H1 başlık
    lines.append(f"# {group_name}")
    lines.append("")

    if description:
        lines.append(clean_text(description))
        lines.append("")

    # Alt kategoriler
    if sub_types:
        sub_names = [st.get("name", st.get("id", "")) for st in sub_types]
        lines.append(f"**Alt kategoriler:** {', '.join(sub_names)}")
        lines.append("")

    lines.append("---")
    lines.append("")

    # Ürünler
    for product in products:
        lines.append(generate_product_md(product, sku_map))

    return "\n".join(lines)


def generate_index_md(category_data):
    """00_index.md rehber dosyasını oluştur."""
    lines = []

    total_products = sum(len(cat["products"]) for cat in category_data)

    lines.append("# Ürün Kataloğu Rehberi")
    lines.append("")
    lines.append(f"Bu bilgi bankası {len(category_data)} ürün kategorisinde toplam {total_products} ürün içerir.")
    lines.append("")
    lines.append("## Kategoriler")
    lines.append("")

    for cat in sorted(category_data, key=lambda c: c["metadata"].get("group_id", "")):
        meta = cat["metadata"]
        group_name = meta.get("group_name", "")
        group_id = meta.get("group_id", "")
        description = meta.get("description", "")
        product_count = len(cat["products"])

        lines.append(f"### {group_name} ({group_id})")
        if description:
            lines.append(clean_text(description))
        lines.append(f"**Ürün sayısı:** {product_count}")
        lines.append("")

    return "\n".join(lines)


# ---------- MAIN ----------

def main():
    # Çıktı klasörünü oluştur
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Tüm JSON dosyalarını oku
    json_files = sorted(glob.glob(os.path.join(INPUT_DIR, "*.json")))
    if not json_files:
        print(f"HATA: {INPUT_DIR} klasöründe JSON dosyası bulunamadı!")
        return

    print(f"Bulunan JSON dosyaları: {len(json_files)}")

    # 1. İlk geçiş: Tüm ürünleri oku ve SKU map oluştur
    category_data = []
    all_products = []

    for json_file in json_files:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        metadata = data.get("metadata", {})
        products = data.get("products", [])
        all_products.extend(products)
        category_data.append({
            "metadata": metadata,
            "products": products,
            "filename": os.path.basename(json_file).replace(".json", "")
        })

    print(f"Toplam ürün: {len(all_products)}")

    # SKU → ürün adı mapping
    sku_map = build_sku_map(all_products)
    print(f"SKU map oluşturuldu: {len(sku_map)} kayıt")

    # 2. Her kategori için MD dosyası oluştur
    total_md_products = 0
    for cat in category_data:
        md_content = generate_category_md(cat["metadata"], cat["products"], sku_map)
        md_filename = f"{cat['filename']}.md"
        md_path = os.path.join(OUTPUT_DIR, md_filename)

        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)

        product_count = len(cat["products"])
        total_md_products += product_count
        print(f"  ✓ {md_filename} — {product_count} ürün")

    # 3. Index dosyası oluştur
    index_content = generate_index_md(category_data)
    index_path = os.path.join(OUTPUT_DIR, "00_index.md")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_content)
    print(f"  ✓ 00_index.md — kategori rehberi")

    # 4. Doğrulama
    print("\n" + "=" * 60)
    print("DOĞRULAMA")
    print("=" * 60)

    # Dosya sayısı
    md_files = glob.glob(os.path.join(OUTPUT_DIR, "*.md"))
    print(f"Oluşturulan MD dosya sayısı: {len(md_files)} (beklenen: 25)")

    # Ürün sayısı doğrulama (SKU pattern ile eşleşen H2 başlıkları)
    total_h2_count = 0
    for md_file in sorted(md_files):
        if os.path.basename(md_file) == "00_index.md":
            continue
        with open(md_file, "r", encoding="utf-8") as f:
            content = f.read()
        h2_count = len(re.findall(r'^## .+\(SKU: .+\)', content, re.MULTILINE))
        total_h2_count += h2_count

    print(f"Toplam ürün başlığı (SKU): {total_h2_count} (beklenen: {len(all_products)})")

    # HTML entity kontrolü
    issues = []
    for md_file in sorted(md_files):
        with open(md_file, "r", encoding="utf-8") as f:
            content = f.read()
        fname = os.path.basename(md_file)

        # HTML entity kalıntıları
        for entity in ["&amp;", "&gt;", "&lt;", "&quot;"]:
            count = content.count(entity)
            if count > 0:
                issues.append(f"  {fname}: {entity} × {count}")

        # \r\n kalıntısı
        if "\r\n" in content:
            issues.append(f"  {fname}: \\r\\n kalıntısı bulundu")

        # HTML tag kalıntıları
        html_tags = re.findall(r'<(br|p|div|span|table|tr|td|th|h[1-6])[^>]*>', content, re.IGNORECASE)
        if html_tags:
            issues.append(f"  {fname}: HTML tag kalıntısı: {', '.join(set(html_tags))}")

    if issues:
        print("\n⚠ Temizlik sorunları:")
        for issue in issues:
            print(issue)
    else:
        print("✓ HTML entity, \\r\\n ve HTML tag kalıntısı bulunamadı")

    # Özet
    if len(md_files) == 25 and total_h2_count == len(all_products) and not issues:
        print(f"\n✅ BAŞARILI: {len(md_files)} dosya, {total_h2_count} ürün — tüm doğrulamalar geçti!")
    else:
        print(f"\n⚠ Doğrulama sonuçlarını kontrol edin.")


if __name__ == "__main__":
    main()
