/**
 * slotExtractor.ts — Regex + dictionary slot filling for queries.
 *
 * The hybrid retrieval pipeline uses extracted slots in two ways:
 *   1. As SQL filters (brand=?, price >= ?, price <= ?) — narrows
 *      the candidate set before BM25 and vector ranking.
 *   2. As an input to `searchCore.filtersApplied` for debug / eval.
 *
 * The query itself keeps the slot text (we don't aggressively remove
 * "1000 TL altı" from the semantic search term because the number
 * can still help ranking), but the `remaining` field is also returned
 * for callers that want a slot-stripped variant.
 *
 * Brand list mirrors searchProducts tool enum. Slot values are
 * normalized (uppercase brand, numeric prices) to match how the
 * Botpress tool input is shaped today, so Phase 4 cutover stays
 * drop-in.
 */

import { normalizeTurkish } from './turkishNormalize.ts';

// Canonical brand names as stored in Supabase.products.brand.
// Matching is done on normalized input, but we emit the canonical
// capitalization because downstream filters do `brand = ${slot}`.
const KNOWN_BRANDS: ReadonlyArray<{
  canonical: string;
  patterns: string[];
}> = [
  { canonical: 'GYEON', patterns: ['gyeon'] },
  { canonical: 'MENZERNA', patterns: ['menzerna', 'menzerne'] },
  { canonical: 'FRA-BER', patterns: ['fra-ber', 'fraber', 'fra ber'] },
  { canonical: 'INNOVACAR', patterns: ['innovacar', 'inno'] },
  { canonical: 'MG PS', patterns: ['mg ps', 'mgps'] },
  { canonical: 'MG PADS', patterns: ['mg pads', 'mgpads'] },
  { canonical: 'MX-PRO', patterns: ['mx-pro', 'mxpro', 'mx pro'] },
  { canonical: 'Q1 TAPES', patterns: ['q1 tapes', 'q1tapes'] },
  { canonical: 'SGCB', patterns: ['sgcb'] },
  { canonical: 'EPOCA', patterns: ['epoca'] },
  { canonical: 'KLIN', patterns: ['klin'] },
  { canonical: 'FLEX', patterns: ['flex'] },
  { canonical: 'LITTLE JOE', patterns: ['little joe', 'littlejoe'] },
  { canonical: 'IK SPRAYERS', patterns: ['ik sprayers', 'iksprayers', 'ik sprayer'] },
];

// Price phrases. We capture the number, then a direction keyword.
// Turkish users mix "altı" (under), "üstü" (over), "pahalı", "ucuz",
// "ve üzeri", "ye kadar" etc.
const PRICE_MAX_RE = /(\d{2,7})\s*(?:tl|₺|lira)?\s*(?:alt[ıi]|altında|ve alt[ıi]|ye kadar|a kadar|dan az|den az|-?ucuz|daha ucuz)/i;
const PRICE_MIN_RE = /(\d{2,7})\s*(?:tl|₺|lira)?\s*(?:üst[üu]|ustu|üstünde|ve üst[üu]|dan pahal[ıi]|den pahal[ıi]|pahal[ıi]|ve üzeri|ve yukar[ıi]|fazla)/i;

// ─────────────────────────────────────────────────────────────────
// Template sub_type inverse mapping (issue #3, #10)
//
// "ceramic_coating" in the DB is a broad bucket — paint / glass / tire
// / wheel / trim / leather / fabric / interior / spray / PPF all share
// template_group='ceramic_coating' and are distinguished only by
// template_sub_type. Without sub_type filtering, "GYEON 1000 TL altı
// seramik kaplama" returned AntiFog (glass_coating sub_type, 570 TL —
// the only GYEON ceramic_coating <=1000 TL in the catalog) instead of
// the paint coatings the user expected.
//
// This table maps user phrasings to canonical sub_type values. Matches
// are longest-first so "cam kaplama" beats "kaplama". The matched
// phrase is NOT stripped from `remaining` because the semantic layer
// (vector/BM25) still benefits from the context.
// ─────────────────────────────────────────────────────────────────

interface SubTypeMapping {
  canonical: string;        // e.g. 'paint_coating'
  templateGroup: string;    // e.g. 'ceramic_coating' — for co-filtering
  patterns: string[];       // normalized Turkish phrases
}

const SUB_TYPE_PATTERNS: ReadonlyArray<SubTypeMapping> = [
  // --- ceramic_coating children ---
  {
    canonical: 'paint_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'boya seramik kaplama', 'govde seramik kaplama', 'gövde seramik kaplama',
      'oto seramik kaplama', 'arac seramik kaplama', 'boya koruma kaplama',
      '9h seramik kaplama', 'nano seramik kaplama',
    ],
  },
  {
    canonical: 'glass_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'cam seramik', 'cam kaplama', 'cam su itici', 'cam su itme',
      'antifog', 'anti fog', 'bugu onleyici', 'buğu önleyici',
      'yagmur kaydirici', 'yağmur kaydırıcı', 'cam bakimi', 'cam bakımı',
    ],
  },
  // Phase 2R: tire_coating sub_type kaldırıldı (tire_dressing'e merge edildi, tire_care altına taşındı)
  {
    canonical: 'wheel_coating',
    templateGroup: 'ceramic_coating',
    patterns: ['jant kaplama', 'jant koruyucu', 'jant seramik', 'rim coating'],
  },
  {
    canonical: 'trim_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      'plastik kaplama', 'plastik koruyucu', 'trim kaplama',
      'trim restorasyon', 'plastik yenileyici',
    ],
  },
  // Phase 2R: leather_coating, interior_coating → fabric_coating (merge edildi)
  {
    canonical: 'fabric_coating',
    templateGroup: 'ceramic_coating',
    patterns: [
      // fabric (kumaş)
      'kumas kaplama', 'kumaş kaplama', 'koltuk kumas', 'koltuk kumaş',
      'tente kaplama', 'kumas koruyucu', 'kumaş koruyucu',
      // leather (deri) — Phase 2R: fabric_coating'e merge edildi
      'deri kaplama', 'deri seramik',
      'koltuk kaplama deri',
      // interior — Phase 2R: fabric_coating'e merge edildi
      'ic mekan kaplama', 'iç mekan kaplama', 'iç yüzey kaplama',
      'antibakteriyel kaplama',
    ],
  },
  // Phase 2R: spray_coating → paint_coating (merge edildi) — pattern'ler ana paint_coating bloğuna taşındı
  // Aşağıdaki entry sadece Türkçe "sprey" aramalarını paint_coating'e yönlendirir
  {
    canonical: 'paint_coating',
    templateGroup: 'ceramic_coating',
    patterns: ['sprey seramik', 'sprey kaplama', 'spray coating', 'hizli seramik', 'hızlı seramik'],
  },
  // --- abrasive_polish children (issue #10) ---
  {
    canonical: 'heavy_cut_compound',
    templateGroup: 'abrasive_polish',
    patterns: [
      'kalin pasta', 'kalın pasta', 'agir cizik giderici', 'ağır çizik giderici',
      'heavy cut', 'agresif pasta', 'cizik giderici kalin',
    ],
  },
  {
    canonical: 'polish',
    templateGroup: 'abrasive_polish',
    patterns: [
      'ince pasta', 'ince cizik giderici', 'ince çizik giderici',
      'ara kesim', 'medium cut',
    ],
  },
  {
    canonical: 'finish',
    templateGroup: 'abrasive_polish',
    patterns: [
      'hare giderici', 'hare gidermek', 'bitiris cila', 'bitiriş cila',
      'finish polish', 'ucuncu adim', 'üçüncü adım',
    ],
  },
  // Phase 2R: one_step_polish → polish (merge edildi); sanding_paste → heavy_cut_compound
  // Phase 19: metal_polish/krom_parlatici pattern'leri industrial_products/solid_compound'a taşındı (aşağıda)
  {
    canonical: 'polish',
    templateGroup: 'abrasive_polish',
    patterns: [
      // one_step_polish pattern'leri — Phase 2R: polish'e merge
      'tek adim pasta', 'tek adım pasta', 'all in one pasta',
      '3 in 1', '3in1', 'tek adim cila',
    ],
  },
  {
    canonical: 'heavy_cut_compound',
    templateGroup: 'abrasive_polish',
    patterns: [
      // sanding_paste pattern'leri — Phase 2R: heavy_cut_compound'a merge
      'zimpara pasta', 'zımpara pasta', 'matlastirici', 'matlaştırıcı',
    ],
  },
  // --- Phase 2R: microfiber / cleaning_cloth hub ---
  {
    canonical: 'cleaning_cloth',
    templateGroup: 'microfiber',
    patterns: [
      'mikrofiber bez', 'temizlik bezi', 'silme bezi', 'cam bezi',
      'ic mekan bezi', 'iç mekan bezi', 'koltuk bezi',
      'cam silme bezi', 'deri silme bezi', 'interior wipe',
    ],
  },
  {
    canonical: 'buffing_cloth',
    templateGroup: 'microfiber',
    patterns: ['pasta sonrasi bez', 'pasta sonrası bez', 'cila silme bezi', 'buffing cloth', 'pasta bezi'],
  },
  // Phase 2R: drying_towel sub_type microfiber'dan wash_tools'a taşındı (yeni entry alttaki wash_tools bölümünde)
  // --- Phase 2R: interior_cleaner hub ---
  // Phase 1.1.13K: leather_cleaner ÖNCE — saf-deri ifadeleri fabric_leather'a düşmesin.
  {
    canonical: 'leather_cleaner',
    templateGroup: 'interior_cleaner',
    patterns: [
      'leather cleaner', 'leathercleaner',
      'saf deri temizleyici', 'sadece deri temizleyici',
      'napa deri temizleyici', 'anilin deri temizleyici',
    ],
  },
  {
    canonical: 'fabric_leather_cleaner',
    templateGroup: 'interior_cleaner',
    // Phase 1.1.13K: generic 'deri temizleyici' kaldırıldı — semantic search iki aileyi de görsün.
    // Sadece kombine/kumaş/döşeme ifadeleri yakalar.
    patterns: [
      'kumas temizleyici', 'kumaş temizleyici',
      'koltuk temizleyici', 'ic mekan temizleyici', 'iç mekan temizleyici',
      'dosemesi temizleyici', 'döşeme temizleyici', 'tekstil temizleyici',
      'deri ve kumas temizleyici', 'deri ve kumaş temizleyici',
      'kumas ve deri temizleyici', 'kumaş ve deri temizleyici',
    ],
  },
  // Phase 1.1.13L: canonical interior_apc → multi_surface_apc (DB sub_type Phase 2R rename).
  {
    canonical: 'multi_surface_apc',
    templateGroup: 'interior_cleaner',
    patterns: [
      'all purpose cleaner', 'apc', 'cok amacli temizleyici', 'çok amaçlı temizleyici',
      'genel yuzey temizleyici', 'genel yüzey temizleyici',
    ],
  },
  {
    canonical: 'plastic_dressing',
    templateGroup: 'interior_cleaner',
    patterns: [
      'plastik parlatici', 'plastik parlatıcı', 'plastik yenileyici',
      'torpido parlatici', 'torpido parlatıcı', 'plastik bakim', 'plastik bakım',
    ],
  },
  // Phase 1.1.13K: leather_care template_group kalktı, leather_dressing interior_cleaner altında.
  {
    canonical: 'leather_dressing',
    templateGroup: 'interior_cleaner',
    patterns: [
      'deri besleyici', 'deri kremi', 'deri bakim', 'deri bakım',
      'deri koruyucu', 'leather cream', 'leather conditioner',
      'deri dressing', 'leather dressing', 'deri yaglayici', 'deri yağlayıcı',
    ],
  },
  // --- Phase 2R: contaminant_solvers / surface_prep ---
  {
    canonical: 'surface_prep',
    templateGroup: 'contaminant_solvers',
    patterns: [
      'yuzey hazirlayici', 'yüzey hazırlayıcı', 'panel wipe', 'panel temizleyici',
      'ipa temizleyici', 'alkol bazli temizleyici', 'alkol bazlı temizleyici',
      'kaplama oncesi temizleyici', 'kaplama öncesi temizleyici', 'prep',
    ],
  },
  // Phase 1.1.13K: water_spot_remover — su lekesi/kireç sealant ürünlerini elimine eder.
  // Phase 1.1.13L: pattern coverage genişletildi — kullanıcı doğal Türkçe sorularda
  // "su lekesi temizleyici" tam phrase'i nadir kullanır; "inatçı su lekesi", "su izleri"
  // gibi compound varyantlar eklendi (tek başına "kireç" generic — false-positive risk).
  {
    canonical: 'water_spot_remover',
    templateGroup: 'contaminant_solvers',
    patterns: [
      'su lekesi temizleyici', 'su lekesi cikarici', 'su lekesi çıkarıcı',
      'kirec cozucu', 'kireç çözücü', 'kirec sokucu', 'kireç sökücü',
      'water spot remover', 'water spot', 'su izi temizleyici',
      'cam su lekesi', 'kirec lekesi', 'kireç lekesi',
      // Phase 1.1.13L additions (compound only, length >= 7):
      'su lekesi', 'su lekeleri', 'su izi', 'su izleri',
      'inatci su lekesi', 'inatçı su lekesi',
    ],
  },
  // --- Phase 2R: tire_care / tire_dressing (tire_gel merged) ---
  {
    canonical: 'tire_dressing',
    templateGroup: 'tire_care',
    patterns: [
      'lastik parlatici', 'lastik parlatıcı', 'lastik cilasi', 'lastik cilası',
      'lastik koruyucu', 'tire dressing', 'jel lastik', 'lastik jeli',
    ],
  },
  // --- Phase 2R: polisher_machine new structure ---
  {
    canonical: 'rotary',
    templateGroup: 'polisher_machine',
    patterns: [
      'rotary polisaj', 'dairesel polisaj', 'rotary makine',
      'yuksek torklu polisaj', 'yüksek torklu polisaj',
    ],
  },
  {
    canonical: 'orbital',
    templateGroup: 'polisher_machine',
    patterns: [
      'orbital polisaj', 'da polisaj', 'dual action polisaj',
      'random orbital', 'orbital makine',
    ],
  },
  {
    canonical: 'dual_action_polisher',
    templateGroup: 'polisher_machine',
    patterns: [
      'pozitif surus', 'pozitif sürüş', 'gear driven', 'forced rotation',
      'rotary orbital', 'nano polisaj', 'mini polisaj',
    ],
  },
  {
    canonical: 'sander',
    templateGroup: 'polisher_machine',
    patterns: ['zimpara makinesi', 'zımpara makinesi', 'sander', 'zimpara'],
  },
  // --- Phase 2R §14: wash_tools yeni grup ---
  {
    canonical: 'wash_mitt',
    templateGroup: 'wash_tools',
    patterns: [
      'yikama eldiveni', 'yıkama eldiveni', 'yikama padi', 'yıkama padı',
      'yikama sungeri', 'yıkama süngeri', 'wash mitt', 'wash pad', 'wash sponge',
      'oto yikama eldiveni', 'oto yıkama eldiveni', 'arac yikama eldiveni', 'araç yıkama eldiveni',
    ],
  },
  {
    canonical: 'drying_towel',
    templateGroup: 'wash_tools',
    patterns: [
      'kurulama bezi', 'kurulama havlusu', 'drying towel', 'waffle havlu',
      'guderi', 'güderi', 'chamois', 'sentetik guderi', 'sentetik güderi',
      'oto kurulama', 'arac kurulama', 'araç kurulama',
    ],
  },
  {
    canonical: 'foam_tool',
    templateGroup: 'wash_tools',
    patterns: [
      'kopuk tabancasi', 'köpük tabancası', 'foam lance', 'foam gun',
      'kopuk yapici', 'köpük yapıcı', 'foam cannon', 'tornador foam',
      'basincli kopuk', 'basınçlı köpük', 'karcher kopuk', 'karcher köpük',
      'hava tabancasi kopuk', 'hava tabancası köpük', 'foam tool',
    ],
  },
  // --- Phase 2R §14: bez/havlu yıkama şampuanı (mikrofiber bezleri yıkamak için) ---
  {
    canonical: 'towel_wash',
    templateGroup: 'wash_tools',
    patterns: [
      'havlu sampuani', 'havlu şampuanı', 'bez sampuani', 'bez şampuanı',
      'mikrofiber yikama sampuani', 'mikrofiber yıkama şampuanı',
      'mikrofiber sampuan', 'mikrofiber şampuan',
      'towel wash', 'havlumu nasil yikarim', 'havlumu nasıl yıkarım',
      'bezimi nasil yikarim', 'bezimi nasıl yıkarım',
      'eldiven yikama sampuani', 'eldiven yıkama şampuanı',
    ],
  },
  // --- Phase 2R §15: spare_part eritildi → polisher_machine accessory'leri ---
  {
    canonical: 'backing_plate',
    templateGroup: 'polisher_machine',
    patterns: [
      'tabanlik', 'tabanlık', 'backing plate', 'pad destek', 'velcro taban',
      'pad support', 'polisaj tabani', 'polisaj tabanı', 'polisaj makinesi tabani',
    ],
  },
  {
    canonical: 'battery',
    templateGroup: 'polisher_machine',
    patterns: ['yedek aku', 'yedek akü', 'akü', 'battery', 'lithium aku', 'lithium akü'],
  },
  {
    canonical: 'charger',
    templateGroup: 'polisher_machine',
    patterns: ['sarj cihazi', 'şarj cihazı', 'charger', 'sarj aleti', 'şarj aleti'],
  },
  {
    canonical: 'carbon_brush',
    templateGroup: 'polisher_machine',
    patterns: ['komur takimi', 'kömür takımı', 'yedek komur', 'yedek kömür', 'carbon brush'],
  },
  // --- Phase 2R §15: spare_part eritildi → sprayers_bottles parçaları ---
  {
    canonical: 'trigger_head',
    templateGroup: 'sprayers_bottles',
    patterns: [
      'yedek baslik', 'yedek başlık', 'puskurtucu baslik', 'püskürtücü başlık',
      'trigger head', 'spray head', 'sprey baslik', 'sprey başlık',
    ],
  },
  {
    canonical: 'nozzle',
    templateGroup: 'sprayers_bottles',
    patterns: ['yedek nozzle', 'nozzle ucu', 'tabanca ucu', 'sprey ucu'],
  },
  {
    canonical: 'maintenance_kit',
    templateGroup: 'sprayers_bottles',
    patterns: [
      'bakim kiti', 'bakım kiti', 'yedek kit', 'yedek bakim', 'yedek bakım',
      'maintenance kit', 'pompa bakim', 'pompa bakım',
    ],
  },
  {
    canonical: 'hose',
    templateGroup: 'sprayers_bottles',
    patterns: ['hortum', 'uzatma hortumu', 'spiral hortum', 'pompa hortumu'],
  },
  {
    canonical: 'handle',
    templateGroup: 'sprayers_bottles',
    patterns: [
      'yedek tabanca', 'puskurtme kolu', 'püskürtme kolu', 'pompa kolu',
      'handle', 'tutamak', 'tetik kolu',
    ],
  },
  // --- Phase 19: industrial solid_compound (katı pasta, abrasive_polish'in sıvı pastasından AYRI) ---
  {
    canonical: 'solid_compound',
    templateGroup: 'industrial_products',
    patterns: [
      'kati pasta', 'katı pasta', 'kati cila', 'katı cila',
      'metal cilasi', 'metal cilası', 'metal parlatici', 'metal parlatıcı',
      'aluminyum parlatici', 'alüminyum parlatıcı', 'paslanmaz cila',
      'krom parlatici', 'krom parlatıcı', 'pirinç cila', 'pirinc cila',
      'menzerna kati', 'menzerna katı', 'solid compound', 'solid bar',
    ],
  },
  // --- Phase 19: air_equipment (Phase 19'da accessory'den taşındı) ---
  {
    canonical: 'air_blow_gun',
    templateGroup: 'air_equipment',
    patterns: ['hava tabancasi', 'hava tabancası', 'air blow gun', 'kompresor tabancasi', 'kompresör tabancası', 'kisa nozul', 'kısa nozul'],
  },
  {
    canonical: 'tornador_gun',
    templateGroup: 'air_equipment',
    patterns: ['tornador tabancasi', 'tornador tabancası', 'tornador gun', 'detayli temizlik tabancasi', 'detaylı temizlik tabancası'],
  },
  {
    canonical: 'tornador_part',
    templateGroup: 'air_equipment',
    patterns: ['tornador yedek', 'tornador parca', 'tornador parça', 'yedek boncuk', 'yedek kilcal', 'yedek kılcal', 'tornador hortum'],
  },
  // --- Phase 19: marin_products yeniden adlandırma ---
  {
    canonical: 'marine_polish',
    templateGroup: 'marin_products',
    patterns: ['marin pasta', 'marin cila', 'tekne pasta', 'tekne cila', 'jelkot pasta', 'gelcoat pasta', 'gelcoat polish', 'marine polish'],
  },
  {
    canonical: 'marine_metal_cleaner',
    templateGroup: 'marin_products',
    patterns: [
      'marin metal temizleyici', 'tekne metal temizleyici', 'tekne pas kireç', 'tekne pas kirec',
      'marin pas çözücü', 'marin pas cozucu', 'marin krom çelik', 'marin krom celik',
      'tekne çelik temizleyici', 'tekne celik temizleyici', 'marine metal cleaner',
    ],
  },
  {
    canonical: 'marine_surface_cleaner',
    templateGroup: 'marin_products',
    patterns: ['marin yuzey temizleyici', 'marin yüzey temizleyici', 'tekne plastik', 'tekne fiberglass', 'fiberglas temizleyici', 'marin yag cozucu', 'marin yağ çözücü', 'marine surface cleaner'],
  },
  {
    canonical: 'marine_general_cleaner',
    templateGroup: 'marin_products',
    patterns: ['marin temizleyici', 'tekne temizleyici', 'marin alkol', 'marin tuvalet', 'tekne wc', 'marine general cleaner'],
  },
  {
    canonical: 'marine_wood_care',
    templateGroup: 'marin_products',
    patterns: ['marin ahsap', 'marin ahşap', 'tekne ahsap', 'tekne ahşap', 'marin tik', 'tik temizleyici', 'tekne tik', 'marine wood'],
  },
  // --- Phase 19: wool_pad (NPMW6555 keçe için) ---
  {
    canonical: 'wool_pad',
    templateGroup: 'polishing_pad',
    patterns: ['yun ped', 'yün ped', 'wool pad', 'kuzu postu', 'pasta keçesi', 'pasta kecesi', 'kece ped', 'keçe ped'],
  },
];

// Sort by longest pattern first so "cam kaplama" matches before "kaplama"
const SUB_TYPE_PATTERNS_SORTED: typeof SUB_TYPE_PATTERNS = [...SUB_TYPE_PATTERNS]
  .sort((a, b) => {
    const aMax = Math.max(...a.patterns.map((p) => p.length));
    const bMax = Math.max(...b.patterns.map((p) => p.length));
    return bMax - aMax;
  });

// Typo-tolerant: collapse dotless-ı → dotted-i on both sides so "kalin
// pasta" (user shift-lock typo) still matches "kalın pasta".
function foldDotlessI(s: string): string {
  return s.replace(/ı/g, 'i');
}

function matchSubType(
  normalized: string,
): { canonical: string; templateGroup: string } | null {
  const folded = foldDotlessI(normalized);
  for (const m of SUB_TYPE_PATTERNS_SORTED) {
    for (const p of m.patterns) {
      const foldedP = foldDotlessI(p);
      if (normalized.includes(p) || folded.includes(foldedP)) {
        return { canonical: m.canonical, templateGroup: m.templateGroup };
      }
    }
  }
  return null;
}

export interface Slots {
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  templateSubType?: string;
  templateGroup?: string; // only set when inferred from sub_type match
  /** Query with all matched slot phrases removed. */
  remaining: string;
}

function matchBrand(normalized: string): { canonical: string; pattern: string } | null {
  for (const { canonical, patterns } of KNOWN_BRANDS) {
    for (const p of patterns) {
      const re = new RegExp(`(?:^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|\\b)`, 'i');
      if (re.test(normalized)) return { canonical, pattern: p };
    }
  }
  return null;
}

function stripSubstring(haystack: string, needle: string): string {
  if (!needle) return haystack;
  const re = new RegExp(
    `(?:^|\\s)${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|\\b)`,
    'ig',
  );
  return haystack.replace(re, ' ').replace(/\s+/g, ' ').trim();
}

export function extractSlots(input: string): Slots {
  const normalized = normalizeTurkish(input);
  const slots: Slots = { remaining: normalized };

  // 1. Brand
  const brandMatch = matchBrand(normalized);
  if (brandMatch) {
    slots.brand = brandMatch.canonical;
    slots.remaining = stripSubstring(slots.remaining, brandMatch.pattern);
  }

  // 2. Price MAX ("1000 TL altı", "1000 ve altı", "1000'e kadar")
  const maxMatch = slots.remaining.match(PRICE_MAX_RE);
  if (maxMatch) {
    slots.priceMax = Number(maxMatch[1]);
    slots.remaining = slots.remaining.replace(maxMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  // 3. Price MIN ("1000 TL üstü", "1000'den pahalı")
  const minMatch = slots.remaining.match(PRICE_MIN_RE);
  if (minMatch) {
    slots.priceMin = Number(minMatch[1]);
    slots.remaining = slots.remaining.replace(minMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  // 4. Template sub_type (inverse lookup). Don't strip the phrase —
  // semantic ranking still benefits from the context words.
  const subTypeMatch = matchSubType(normalized);
  if (subTypeMatch) {
    slots.templateSubType = subTypeMatch.canonical;
    slots.templateGroup = subTypeMatch.templateGroup;
  }

  return slots;
}
