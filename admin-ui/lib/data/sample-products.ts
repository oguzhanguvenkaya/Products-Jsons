/**
 * Örnek ürün kayıtları (Phase 4.9.3 read-only detail).
 *
 * Phase 4.9.4 Admin API (GET /admin/products/:sku) bağlanınca bu sabit
 * koleksiyon kalkacak; imza korunur. Alan yapısı microservice
 * /products/:sku response'uyla birebir paralel tutuluyor.
 */

export type Variant = {
  sku: string;
  size_label: string;
  price: number;
  is_primary: boolean;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  scope: "product" | "brand" | "category";
  confidence?: "high" | "medium" | "low";
};

export type Relation = {
  target_sku: string;
  target_name: string;
  relation_type:
    | "use_with"
    | "use_before"
    | "use_after"
    | "accessories"
    | "alternatives";
  note?: string;
};

export type HistoryEvent = {
  when: string; // ISO
  who: string;
  action: string;
  diff?: string;
};

export type SampleProduct = {
  sku: string;
  name: string;
  base_name: string;
  brand: string;
  price: number;
  image_url: string | null;
  url: string;
  template_group: string;
  template_sub_type: string;
  target_surface: string | null;
  full_description: string;
  video_url: string | null;
  specs: Record<string, unknown>;
  sizes: Variant[];
  faqs: Faq[];
  relations: Relation[];
  history: HistoryEvent[];
};

export const SAMPLE_SKUS = [
  "Q2-OLE100M",
  "22202.260.001",
  "MXP-DPCN50KS",
] as const;

export const SAMPLE_PRODUCTS: Record<string, SampleProduct> = {
  "Q2-OLE100M": {
    sku: "Q2-OLE100M",
    name: "GYEON Q² OneLight EVO 100ml",
    base_name: "GYEON Q² OneLight EVO",
    brand: "GYEON",
    price: 3650,
    image_url: null,
    url: "https://mtskimya.com/products/gyeon-onelight-evo",
    template_group: "ceramic_coating",
    template_sub_type: "paint_coating",
    target_surface: "Boya",
    full_description:
      "Tek kat uygulanan seramik kaplama. 24 aya kadar dayanıklılık sağlar. DIY dostu, uzun çalışma penceresi.",
    video_url: "https://www.youtube.com/watch?v=example-onelight",
    specs: {
      howToUse:
        "Aplikatör bezi seramik pad ile beraber kullanarak küçük bölgeler halinde uygulayın, 2-3 dakika bekleyip temiz mikrofiber ile silin.",
      whenToUse:
        "Tam decon (demir + boya koruyucu temizleyici) sonrası, polisaj + IPA wipe down sonrasında.",
      whyThisProduct:
        "Tek uygulama ile 24 ay koruma; fiyat/performans dengesi yüksek; amateur-dostu.",
      durability_months: 24,
      consumption_ml_per_car: 30,
      application_surface: "Paint",
      contact_angle: "110°+",
      cure_time_hours: 12,
      no_water_hours: 24,
      layer_count: 1,
      hardness: "9H",
      ph_tolerance: "2-11",
      ratings: {
        durability: 5,
        beading: 4.5,
        self_cleaning: 4,
        gloss: 4.5,
      },
      features: ["kolay_uygulama", "tek_kat", "diy_dostu"],
    },
    sizes: [
      {
        sku: "Q2-OLE30M",
        size_label: "30 ml",
        price: 1200,
        is_primary: false,
      },
      {
        sku: "Q2-OLE100M",
        size_label: "100 ml",
        price: 3650,
        is_primary: true,
      },
    ],
    faqs: [
      {
        id: "faq-ole-1",
        question: "Silikon içerir mi?",
        answer:
          "Hayır. GYEON OneLight Evo silikon içermez; SiO₂ bazlı cam-seramik hibrit formül kullanır.",
        scope: "product",
        confidence: "high",
      },
      {
        id: "faq-ole-2",
        question: "Kaç ay dayanır?",
        answer:
          "Üretici test koşullarında 24 aya kadar. Kullanım sıklığına, yıkama rutinine ve bakım şampuanına göre 18-24 ay aralığında.",
        scope: "product",
        confidence: "high",
      },
      {
        id: "faq-ole-3",
        question: "Çok sıcak havada uygulanır mı?",
        answer:
          "35°C üzerinde önerilmez; hızlı kürlenme nedeniyle yüzeyde leke riski vardır. Gölge + 15-25°C ideal.",
        scope: "product",
        confidence: "medium",
      },
    ],
    relations: [
      {
        target_sku: "Q2-PREP500M",
        target_name: "GYEON Q² Prep 500ml",
        relation_type: "use_before",
        note: "Son IPA wipe down, uygulama öncesi zorunlu.",
      },
      {
        target_sku: "Q2M-BWA100",
        target_name: "GYEON BaldWipe Applicator",
        relation_type: "use_with",
        note: "Uygulamaya özel seramik pad.",
      },
      {
        target_sku: "Q2M-SWL40",
        target_name: "GYEON SoftWipe L 40×40",
        relation_type: "use_with",
        note: "Silme için low-lint mikrofiber.",
      },
      {
        target_sku: "Q2-CURE500M",
        target_name: "GYEON Cure 500ml",
        relation_type: "use_after",
        note: "Topper — dayanıklılık +6 ay.",
      },
      {
        target_sku: "Q2-SLE50M",
        target_name: "GYEON Syncro LightBox EVO 50ml",
        relation_type: "alternatives",
        note: "Multi-step alternatif, 50 ay dayanıklılık.",
      },
    ],
    history: [
      {
        when: "2026-04-18T14:23:00Z",
        who: "oguzhanguvenkaya",
        action: "specs.ratings.self_cleaning updated: 3.5 → 4.0",
      },
      {
        when: "2026-04-11T10:02:00Z",
        who: "seed-v2",
        action: "video_url set",
      },
      {
        when: "2026-03-30T08:45:00Z",
        who: "seed-v1",
        action: "Initial import (products_master.csv)",
      },
    ],
  },

  "22202.260.001": {
    sku: "22202.260.001",
    name: "MENZERNA Heavy Cut Compound 400 — 250 ml",
    base_name: "MENZERNA 400",
    brand: "MENZERNA",
    price: 750,
    image_url: null,
    url: "https://mtskimya.com/products/menzerna-400",
    template_group: "abrasive_polish",
    template_sub_type: "heavy_cut_compound",
    target_surface: "Boya",
    full_description:
      "Ağır çizik giderici, rotary + DA uyumlu. Toz minimal, silinebilirlik yüksek.",
    video_url: null,
    specs: {
      howToUse:
        "Hedef alana ~4 bezelye. Düşük devirde yayılım, 1.200-1.800 rpm'de kesim. Temiz mikrofiber ile silin.",
      whenToUse:
        "P1500+ sanding iz, yoğun çizik, galip kademeli hologram öncesi kalın kesim.",
      whyThisProduct:
        "Menzerna klasiği — hızlı kesim + temiz yüzey + kolay silme.",
      cut_level: "5/5",
      gloss_level: "2/5",
      machine_compat: ["rotary", "da"],
      features: ["hızlı_kesim", "düşük_toz", "kolay_silme"],
    },
    sizes: [
      {
        sku: "22202.260.001",
        size_label: "250 ml",
        price: 750,
        is_primary: true,
      },
      {
        sku: "22202.261.001",
        size_label: "1 L",
        price: 2450,
        is_primary: false,
      },
    ],
    faqs: [
      {
        id: "faq-mz4-1",
        question: "Hangi pad ile kullanılır?",
        answer:
          "P150M (MG PADS sarı agresif) ya da MG PADS kırmızı wool pad ile optimum. Ardından finish polish (Menzerna 2500) + ince pad.",
        scope: "product",
        confidence: "high",
      },
      {
        id: "faq-mz4-2",
        question: "DA'da çalışır mı?",
        answer:
          "Evet, ancak kesim gücü rotary'de daha verimli. DA kullanırken 5-6 pass öngörün.",
        scope: "product",
        confidence: "high",
      },
    ],
    relations: [
      {
        target_sku: "MG-P150M",
        target_name: "MG PADS P150M Heavy Cut Foam (sarı)",
        relation_type: "use_with",
      },
      {
        target_sku: "MG-WOOL-RED",
        target_name: "MG PADS Wool Pad (kırmızı, ağır kesim)",
        relation_type: "use_with",
      },
      {
        target_sku: "22064.261.001",
        target_name: "MENZERNA 2500 Fine Finish 1L",
        relation_type: "use_after",
        note: "Kesim sonrası ince pasta.",
      },
    ],
    history: [
      {
        when: "2026-04-14T09:20:00Z",
        who: "oguzhanguvenkaya",
        action: "relations use_with: P150M pad eklendi",
      },
      {
        when: "2026-03-30T08:45:00Z",
        who: "seed-v1",
        action: "Initial import",
      },
    ],
  },

  "MXP-DPCN50KS": {
    sku: "MXP-DPCN50KS",
    name: "MX-PRO Diamond Pro 50ml Kit",
    base_name: "MX-PRO Diamond",
    brand: "MX-PRO",
    price: 3400,
    image_url: null,
    url: "https://mtskimya.com/products/mxpro-diamond",
    template_group: "ceramic_coating",
    template_sub_type: "paint_coating_kit",
    target_surface: "Boya",
    full_description:
      "MX-PRO üst segment seramik kaplama. Diamond serisi 5 yıl dayanıklılık iddiası.",
    video_url: null,
    specs: {
      howToUse:
        "Prep + IPA wipe down sonrası, 30x30 cm bölgeler halinde. 2 dakika bekleyip silme.",
      whenToUse: "İleri seviye boya koruma, uzun dönem yatırım.",
      whyThisProduct: "5 yıla kadar dayanıklılık, maksimum parlaklık.",
      durability_months: 60,
      ratings: {
        durability: 5,
        gloss: 5,
      },
    },
    sizes: [
      {
        sku: "MXP-DPCN30KS",
        size_label: "30 ml",
        price: 2500,
        is_primary: false,
      },
      {
        sku: "MXP-DPCN50KS",
        size_label: "50 ml",
        price: 3400,
        is_primary: true,
      },
    ],
    faqs: [
      {
        id: "faq-mxp-1",
        question: "5 yıl dayanıklılık gerçekçi mi?",
        answer:
          "Üretici laboratuvar koşullarında beyan edilen rakam. Saha kullanımında yıllık bakım + koruyucu şampuan ile 3-4 yıl gerçekçi.",
        scope: "product",
        confidence: "medium",
      },
    ],
    relations: [
      {
        target_sku: "Q2-SLE50M",
        target_name: "GYEON Syncro LightBox EVO",
        relation_type: "alternatives",
        note: "Benzer dayanıklılık segment.",
      },
    ],
    history: [
      {
        when: "2026-04-22T11:00:00Z",
        who: "oguzhanguvenkaya",
        action: "price variant 30ml: 2500 TL eklendi",
      },
    ],
  },
};

export function findProduct(sku: string): SampleProduct | null {
  return SAMPLE_PRODUCTS[sku] ?? null;
}
