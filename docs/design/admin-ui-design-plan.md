# MTS Kimya Katalog Atölyesi — Veri Düzenleme Arayüzü Tasarım Planı

**Proje kodu:** `catalog-atelier`
**Tarih:** 2026-04-22
**Durum:** Tasarım spec — ayrı oturumda implement edilecek
**Hedef:** 511 ürünlük kataloğun data kalite sorunlarını (fragmentation, null hotspot'lar, type inconsistency, FAQ/relations eksiklikleri) operatör-hızında çözmeye izin veren, sıcak tonlarla tasarlanmış yerel web arayüzü.

---

## 0. Bu dokümanı okuma rehberi

Bu plan **self-contained** — ayrı oturumda kod yazılırken bu dosya yeter. Bölümler sırayla referansla okunabilir:

- §1 **Executive Summary** → neyi yapıyoruz, niye
- §2 **Tasarım felsefesi** → aesthetic direction, neden bu seçim
- §3–§4 **Design tokens + typography** → CSS variable'ların kaynağı
- §5 **Bilgi mimarisi** → sayfa ağacı, nav kuralları
- §6 **Wireframes** → her ana sayfanın ASCII layout'u + component listesi
- §7 **Etkileşim akışları** → user flow ve state transitions
- §8 **Component library** → özel component API'leri (props, varyantlar, davranışlar)
- §9 **Tech stack + justification**
- §10 **Admin API endpoint'leri** → microservice'e eklenecek rotalar (metod, payload, response)
- §11 **Data flow** → okumalar vs yazmalar, caching, optimistic UI
- §12 **Edge case'ler**
- §13 **Accessibility** (WCAG AA+ hedefi)
- §14 **Implementation fazları** (MVP → V1 → V2)
- §15 **Test senaryoları**

---

## 1. Executive Summary

**Catalog Atelier**, MTS Kimya detailing kataloğunu "canlı bir el işi malzemesi" olarak ele alan bir operator console'dur. Airtable'ın veri zenginliği, Linear'ın klavye-önce hızlılığı ve Notion'un inline edit akışkanlığını — **terracotta & sage paletiyle renklendirilmiş bir editoryal kâğıt estetiği** içinde birleştirir. Arayüzün ana görevi bir istatistik dashboard'u sunmak değil, **veri hijyenini operatör refleksine çevirmektir**: null hotspot'lar görsel olarak ısınır, type uyumsuzlukları dokunuşla hissedilir, taksonomi ağacı dallanır ve staging hamle-geri alma öğretir.

Problem şurada: 511 ürün, 26 template_group ve 156 sub_type içinde parçalanmış; aynı kavram (`ph`, `ph_level`, `ph_tolerance`) üç farklı key'de; `durability` için 9 kardeş alan; ceramic_coating'in %4'ünde `silicone_free` dolu ve bot, kullanıcının silikon sorusuna veride cevap bulamadığı için uyduruyor. **Bu arayüz, uydurmanın alternatifini operatöre teslim etmek için var.** Her ekran tek bir hedefe hizmet eder: "veriyi açıp elle düzeltebiliyor musun, önce güvenle evet diyebiliyor musun."

**Aesthetic olarak tercih** — purple/blue SaaS tuzağından bilinçli uzak duruyoruz. Warm cream zemin (`#FAF6ED`), espresso serif başlıklar (Fraunces), technical IBM Plex gövde metin, data hücrelerinde IBM Plex Mono. Accent'ler sienna/terracotta kırmızısı (`#C65D3F`) ve sage olive (`#6B7A4B`); ısı haritası amber-clay gradient; günlük iş ortamında gözü yormaz, ama "bu bir dashboard değil, bir atölye" hissini her piksel taşır.

**Teknik felsefe** — read-heavy operasyonlar Supabase REST ile doğrudan (RLS read-only policy), write'lar retrieval-service'te yeni `/admin/*` endpoint'leri üzerinden **her zaman staging'e** düşer, sonra batch commit veya rollback. Gerçek DB yazımı, kullanıcı explicit "commit" tıklayana kadar ertelenir; bu sırada tüm değişiklikler görsel diff olarak duruyor. Optimistic UI yok — tam tersine, **pending değişikliklerin görünmesi arayüzün anatomisine dahil** (sidebar'da "Staging: 7 change").

**Öğreten bir arayüz** — her bulk operasyonun preview'i zorunlu, `cmd+K` command palette'inde transformation komutları ("normalize all cut_level to number", "merge ph/ph_level/ph_tolerance → ph") açıkça isimlendirilmiş. İş bitince CSV/JSONL export ile seed pipeline beslenir, böylece **arayüz seed script'in alternatifi değil, canlı staging alanıdır** ki veri yeniden üretilebilir kalır.

**Differentiation noktası** — Tipik admin panel'lerinde heatmap bir "view" opsiyonudur; burada heatmap **primary navigation metaphor**'udur. Ana sayfa bir liste değil; `template_group × specs_key` ısı matrisi — kataloğun sağlık durumu tek bakışta görünür, herhangi bir hücreye tıklama ilgili ürünleri açar. "Veri ne durumda" sorusu ekran açılışında cevaplıdır.

---

## 2. Tasarım felsefesi & aesthetic direction

### Kavramsal yön: "Warm Archive Atelier"

Bu bir **araştırma atölyesi** hissi vermeli — modernist lab'ın sterilliği yerine, **editoryal arşiv + zanaatkar tezgâhı** kesişimi. Referanslar:

- Type foundries (Klim, GT America) — serif başlıkların soluk espresso mürekkebi
- Yaşayan arşivler (MoMA archive pages, Rijksmuseum digital) — krem parşömen zemin
- Musaffa defter sayfaları — grain texture, ince çizgiler
- Tahıl fotoğrafı — toprak renkleri, doğal ışık hissi

Palette sıcaktır ama **mat**tir; parlak/neon hiçbir şey yok. Gradient'ler çok ince (2-3 stop), çoğunlukla single-color fade. Shadow'lar soft ve uzun, sanki sayfa üstünde gerçek kağıt duruyormuş gibi.

### Differentiation ilkeleri

1. **Heatmap-first**: Landing page = `template_group × specs_key` coverage matrisi. Not a dashboard. Direct interaction.
2. **Serif başlıklar**: Her sayfa başlığı Fraunces display serif — editorial dergi havası, admin SaaS değil.
3. **Paper grain texture**: Zemin üstünde çok ince noise overlay (opacity 3-5%, static SVG), kağıt hissi.
4. **Command palette as transformation engine**: cmd+K sadece sayfa geçiş değil, "komut" - veri dönüşümleri.
5. **Staging drawer her zaman görünür**: Sağ kenardan slide-out; pending değişiklikler durmuyor, her zaman açılabilir.
6. **Inline staging glow**: Bir alan düzenlenmiş ama commit edilmemişse, alanın etrafında soft amber pulse — sakin ama fark edilir.
7. **Tek genel-geçer font yok**: Display'de Fraunces, body'de IBM Plex Sans, data'da IBM Plex Mono — üçlü hiyerarşi.
8. **Dark mode opsiyonel, primary light**: Light mode önce; dark'ta aynı sıcak palette'in daha koyu versiyonları (espresso base, terracotta korunur).

### Ne DEĞİL

- ❌ Purple/indigo/blue gradient'ler (SaaS tuzağı)
- ❌ "Trust-blue" semantic colors (success = mavi gibi)
- ❌ Arial/Inter/Roboto (generic)
- ❌ Full-bleed hero gradients
- ❌ Glassmorphism / neumorphism
- ❌ Emoji-heavy status indicators
- ❌ Cheerful illustrations / mascot'lar

### Ne

- ✅ Warm cream + sienna accent + sage secondary
- ✅ Serif display + neutral sans body + technical mono data
- ✅ Subtle paper grain
- ✅ Staged edit state'leri visible (amber aura)
- ✅ Heatmap olarak primary nav
- ✅ Keyboard-first interactions
- ✅ Dense tables with airy white space between sections

---

## 3. Design tokens — color palette

Tüm renkler OKLCH ve HEX olarak. CSS variable naming semantic (usage-based).

### Primitive layer (ham paleti)

| Token | HEX | OKLCH | Kullanım |
|---|---|---|---|
| `--cream-50` | `#FDFAF3` | `oklch(0.983 0.013 82)` | En açık zemin, hero cards |
| `--cream-100` | `#FAF6ED` | `oklch(0.965 0.015 82)` | Ana body background |
| `--cream-200` | `#F3EDE0` | `oklch(0.933 0.020 82)` | Panel/card background |
| `--cream-300` | `#E8DFCB` | `oklch(0.887 0.029 82)` | Divider, hover zemin |
| `--sand-400` | `#C8B99A` | `oklch(0.777 0.041 82)` | Muted border, chip ground |
| `--sand-500` | `#A8998B` | `oklch(0.667 0.024 70)` | Muted text, disabled |
| `--clay-600` | `#6B5A4E` | `oklch(0.480 0.023 58)` | Secondary text |
| `--espresso-700` | `#4A3A2E` | `oklch(0.365 0.024 58)` | Primary text |
| `--espresso-900` | `#2A1F17` | `oklch(0.225 0.021 58)` | Heading, max contrast |
| `--terracotta-500` | `#C65D3F` | `oklch(0.595 0.152 40)` | Primary accent, CTA |
| `--terracotta-600` | `#9B3F2B` | `oklch(0.460 0.135 40)` | Active/pressed accent |
| `--terracotta-300` | `#E4A58E` | `oklch(0.785 0.080 40)` | Soft accent, hover glow |
| `--sage-500` | `#7A8B56` | `oklch(0.620 0.080 122)` | Secondary accent, success |
| `--sage-600` | `#6B7A4B` | `oklch(0.553 0.072 122)` | Sage active |
| `--sage-200` | `#D4DCB5` | `oklch(0.888 0.050 122)` | Soft success bg |
| `--amber-500` | `#D4953E` | `oklch(0.730 0.125 78)` | Warning, staging glow |
| `--amber-200` | `#F4D8A6` | `oklch(0.880 0.060 78)` | Staging row background |
| `--clay-red-500` | `#B8543C` | `oklch(0.540 0.140 30)` | Error, destructive |
| `--clay-red-200` | `#EEC4B5` | `oklch(0.835 0.055 30)` | Error soft bg |

### Semantic layer (usage tokens)

Component-level kullanım için **primitive → semantic** map:

```css
:root {
  /* Canvas */
  --bg-base:            var(--cream-100);   /* page background */
  --bg-elevated:        var(--cream-50);    /* cards, modals */
  --bg-sunken:          var(--cream-200);   /* panel zemin */
  --bg-hover:           var(--cream-300);   /* row hover, button hover */

  /* Text */
  --text-primary:       var(--espresso-900);
  --text-secondary:     var(--clay-600);
  --text-muted:         var(--sand-500);
  --text-on-accent:     var(--cream-50);

  /* Borders / dividers */
  --border-subtle:      var(--cream-300);
  --border-default:     var(--sand-400);
  --border-strong:      var(--clay-600);

  /* Accent (primary interaction) */
  --accent-default:     var(--terracotta-500);
  --accent-hover:       var(--terracotta-600);
  --accent-soft:        var(--terracotta-300);
  --accent-text:        var(--terracotta-600);

  /* Secondary accent */
  --secondary-default:  var(--sage-500);
  --secondary-hover:    var(--sage-600);
  --secondary-soft:     var(--sage-200);

  /* Semantic feedback */
  --success-bg:         var(--sage-200);
  --success-text:       var(--sage-600);
  --warning-bg:         var(--amber-200);
  --warning-text:       #8E5E10;
  --danger-bg:          var(--clay-red-200);
  --danger-text:        var(--clay-red-500);

  /* Data coverage heatmap (continuous scale) */
  --heat-0:   var(--clay-red-200);     /* 0-20% coverage */
  --heat-25:  #EDBDA0;                 /* 20-40% */
  --heat-50:  var(--amber-200);        /* 40-60% */
  --heat-75:  #D9DFA6;                 /* 60-80% */
  --heat-100: var(--sage-200);         /* 80-100% */

  /* Staging / pending */
  --staging-bg:         var(--amber-200);
  --staging-border:     var(--amber-500);
  --staging-pulse:      var(--amber-500);

  /* Focus ring */
  --ring:               var(--terracotta-500);
  --ring-offset:        var(--cream-50);

  /* Shadows — warm, long, soft */
  --shadow-sm:   0 1px 2px rgba(74,58,46,0.04), 0 1px 1px rgba(74,58,46,0.03);
  --shadow-md:   0 4px 8px rgba(74,58,46,0.06), 0 2px 4px rgba(74,58,46,0.04);
  --shadow-lg:   0 12px 24px rgba(74,58,46,0.08), 0 6px 12px rgba(74,58,46,0.05);
  --shadow-xl:   0 24px 48px rgba(74,58,46,0.10);
}

/* Dark mode — aynı sıcak palette, koyu espresso zeminde */
[data-theme="dark"] {
  --bg-base:       #2A1F17;   /* deep espresso */
  --bg-elevated:   #382A1E;
  --bg-sunken:     #21170F;
  --bg-hover:      #463424;
  --text-primary:  var(--cream-100);
  --text-secondary:#C8B99A;
  --text-muted:    var(--sand-500);
  --border-subtle: #463424;
  --border-default:#5C4736;
  --accent-default:var(--terracotta-300);  /* daha açık terracotta dark'ta */
  --accent-hover:  var(--terracotta-500);
  /* heat scale korundu — aynı gradient */
}
```

### Kontrast doğrulama (WCAG AA hedefi)

| Kombinasyon | Ratio | WCAG |
|---|---|---|
| `--text-primary` (#2A1F17) üstü `--bg-base` (#FAF6ED) | 13.5:1 | AAA |
| `--text-secondary` (#6B5A4E) üstü `--bg-base` | 6.8:1 | AA (large text AAA) |
| `--accent-default` (#C65D3F) üstü `--cream-50` | 4.6:1 | AA |
| `--text-on-accent` üstü `--accent-default` | 4.5:1 | AA borderline — test et |
| `--success-text` üstü `--success-bg` | 5.2:1 | AA |

Button text on terracotta: kritik mesajlarda `--espresso-900` fallback, aksi halde cream — testler bunu doğrulayacak.

### Paper grain texture

Zemin için SVG noise (inline), `background-blend-mode: multiply`, opacity 0.04:

```html
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
  <filter id="n">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
    <feColorMatrix values="0 0 0 0 0.29
                           0 0 0 0 0.23
                           0 0 0 0 0.18
                           0 0 0 0.5 0"/>
  </filter>
  <rect width="120" height="120" filter="url(#n)" opacity="0.5"/>
</svg>
```

Tile olarak repeat edilir, ana layout component'ine arka plan.

---

## 4. Typography scale

### Font stacks

```css
--font-display: 'Fraunces', 'Source Serif Pro', Georgia, serif;
--font-body:    'IBM Plex Sans', 'Inter', system-ui, sans-serif;
--font-mono:    'IBM Plex Mono', 'JetBrains Mono', 'SF Mono', monospace;
```

- **Fraunces** (Google Fonts, OFL): Variable, opsz + SOFT + WONK axes. Display için opsz=144, wght=500, SOFT=50, WONK=0. Modern serif, sıcak harf formları, "editoryal ama karakterli".
- **IBM Plex Sans**: Tüm Türkçe glif desteği, yüksek x-height, çok iyi lisibilite. Variable weights 300-700.
- **IBM Plex Mono**: Data hücreleri, SKU'lar, JSON, SQL preview. Monospace ama yuvarlak terminaller (Courier kırlığı yok).

### Scale (modular, 1.250 Major Third)

| Token | rem | px | Font | Weight | Usage |
|---|---|---|---|---|---|
| `--text-xs`   | 0.75   | 12 | Body | 400 | Timestamps, meta labels |
| `--text-sm`   | 0.875  | 14 | Body | 400-500 | Table cells, form labels |
| `--text-base` | 1      | 16 | Body | 400 | Paragraph default |
| `--text-lg`   | 1.125  | 18 | Body | 500 | Sub-headings in panels |
| `--text-xl`   | 1.25   | 20 | Body | 600 | Panel heading |
| `--text-2xl`  | 1.5    | 24 | Display | 500 SOFT=60 | Page sub-heading |
| `--text-3xl`  | 1.875  | 30 | Display | 500 SOFT=70 | Section title |
| `--text-4xl`  | 2.25   | 36 | Display | 500 SOFT=80 | Page title |
| `--text-5xl`  | 3      | 48 | Display | 500 SOFT=100 | Hero / landing |

Line-height:
- Display: 1.15
- Body: 1.55
- Mono: 1.5

Letter-spacing (tracking):
- Display 48+: `-0.02em`
- Display 24-36: `-0.01em`
- Body default: `0`
- Mono: `0`
- UPPERCASE (small caps usage): `+0.08em`

### Typographic mood examples

```
Page title (h1):         Fraunces 500, 36px, opsz=144, SOFT=80, letter-spacing -0.01em
                          → "Data Atelier"
Section head (h2):       Fraunces 500, 24px, SOFT=60
                          → "Ceramic Coating · 23 products"
Label (small caps):      IBM Plex Sans 600, 11px, tracking +0.1em, UPPERCASE
                          → "TEMPLATE GROUP"
Table header:            IBM Plex Sans 600, 12px, UPPERCASE, tracking +0.05em
Table row (default):     IBM Plex Sans 400, 14px
SKU cell:                IBM Plex Mono 500, 13px
JSON editor:             IBM Plex Mono 400, 13px, 1.6 line-height
Staging badge:           IBM Plex Sans 600, 10px, UPPERCASE, amber pill
```

---

## 5. Bilgi mimarisi — sayfa ağacı

```
/                               → Dashboard (Heatmap-first landing)
/catalog                        → Katalog Ağacı (template_group tree)
/catalog/:group                 → Grup içi ürün listesi (sub_type drill)
/catalog/:group/:subtype        → Sub_type leaf product list
/products/:sku                  → Ürün Editor (tabs: Info, Specs, Sizes, FAQ, Relations, History)
/bulk                           → Bulk Operations (query → preview → commit)
/heatmap                        → Extended heatmap (filter, pivot)
/faq                            → FAQ Manager (all FAQs, scope filter)
/faq/:id                        → FAQ Editor
/relations                      → Relations Graph (node-link görünüm)
/synonyms                       → Synonym Editor
/taxonomy                       → Primary_use_case Taxonomy (drag-drop)
/prompts                        → Prompt Lab (ajan + tool kataloğu, landing)
/prompts/agents/:agent          → Agent Instruction Editor (sectioned)
/prompts/tools/:tool            → Tool Registry Editor (description + schemas)
/prompts/history                → Prompt Version History + Diff
/prompts/playground             → Prompt Playground (token count, compile preview)
/staging                        → Staged Changes Drawer (full-screen mode)
/commit                         → Commit Workflow (SQL preview, CSV export)
/settings                       → Theme, API keys, user prefs
```

### Navigation yapısı

**Top bar** (persistent, 56px):
- Sol: Logo/brand (Catalog Atelier wordmark, Fraunces italic)
- Orta: Breadcrumb (> ile ayrılmış, serif italic)
- Sağ: Staging counter chip + Command palette trigger (⌘K) + Theme toggle + User avatar

**Left rail** (collapsible, 240px expanded / 56px collapsed):
- Dashboard
- Katalog (genişleyince: Tree, Heatmap, Taxonomy)
- Veri (FAQ, Relations, Synonyms)
- **Prompt Lab** (Agents, Tools, History, Playground)
- İşlemler (Bulk, Staging, Commit)
- Ayarlar (ince ayraç üstü)

İcon set: **Lucide** (ince stroke, warm tonda rotate). Terracotta accent'te hover glow.

### Persistent surfaces

1. **Staging drawer** (sağ kenar, 400px wide, default hidden, slide-in):
   - Her zaman `⌘J` ile açılabilir
   - Başlıkta: "Staged Changes · 7"
   - Her entry: before/after diff mini-preview, "Revert" + "Edit" aksiyon
   - Alt: "Discard all" + "Commit all" button'lar
2. **Command palette** (⌘K, modal centered, 640px wide):
   - Search + komut listesi
   - Kategoriler: Navigation, Data Transform, Bulk Actions, Export, Recent
3. **Toast container** (sağ alt, fade-in)

---

## 6. Wireframes

Her ana sayfa için ASCII sketch + key component listesi.

### 6.1 Dashboard (Heatmap-first landing)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ≡  Catalog Atelier   ⋅  Dashboard                     7 staged  ⌘K  ☀ ⎔  │← topbar
├──────────────────────────────────────────────────────────────────────────────┤
│           │                                                                  │
│   NAV     │  Veri Sağlığı                                          [Export ▾]│
│   ──      │  ─────────────────                                               │
│ • Dash    │  Fraunces 36pt serif title                                       │
│ • Catalog │                                                                  │
│   ◦ Tree  │  511 ürün · 156 sub_type · 2 gündür güncelleme yok              │
│   ◦ Heat  │                                                                  │
│   ◦ Tax   │  ┌─────────────────────────────────────────────────────────────┐ │
│ • Veri    │  │  COVERAGE HEATMAP — template_group × specs_key              │ │
│   ◦ FAQ   │  │                                                              │ │
│   ◦ Rel   │  │            howToUse  durability_months  silicone_free  ph   │ │
│   ◦ Syn   │  │  ceramic   ████ 100  ████ 95           ░░░░ 4         ██ 65│ │
│ • İşlem   │  │  abrasive  ████ 100  ░░░░ 2            ░░░░ 8         ─── 0│ │
│   ◦ Bulk  │  │  shampoo   ████ 100  ▒▒▒▒ 30           ░░░░ 10        ██ 75│ │
│   ◦ Stage │  │  …  (26 row × 40 col scrollable)                             │ │
│   ◦ Commit│  └─────────────────────────────────────────────────────────────┘ │
│           │  ↑ hover: hücre = "ceramic × silicone_free · 1/23 · 4.3%"        │
│           │  ↑ click: açılır drawer — bu hücrenin eksik ürünleri             │
│   (user)  │                                                                  │
│   ☀      │  ┌── Uyarılar (3) ─────────────┐  ┌── Son aktivite ────────────┐ │
│           │  │ ⚠ 1 ürün fiyat = 0         │  │ 14:22 · base_name seed     │ │
│           │  │   Menzerna PPC 200 (24017) │  │ 13:10 · Fix H deploy       │ │
│           │  │   [Detay →]                │  │ Dün · video_url migration  │ │
│           │  │                            │  │                            │ │
│           │  │ ⚠ 60 ürün FAQ'sız          │  │ [Full history →]           │ │
│           │  │   polishing_pad, fragrance │  └────────────────────────────┘ │
│           │  │                            │                                 │
│           │  │ ⚠ 9 durability_* key       │                                 │
│           │  │   Consolidation önerilir   │                                 │
│           │  │   [Öneri uygula →]         │                                 │
│           │  └────────────────────────────┘                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key components:** `Heatmap`, `AlertCard`, `ActivityFeed`, `ExportMenu`, `TopBar`, `LeftRail`, `StagingIndicator`.

### 6.2 Katalog Ağacı (`/catalog`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ≡  Catalog Atelier  ⋅  Catalog > Tree                7 staged  ⌘K  ☀ ⎔  │
├──────────────────────────────────────────────────────────────────────────────┤
│           │  Katalog Ağacı                                                   │
│   NAV     │  ──────────────                                                  │
│           │                                                                  │
│           │  [🔍 arama · 511 ürün]                           Sort: count ▾  │
│           │                                                                  │
│           │  ▼ ceramic_coating                              23 ürün  ●●●● 68%│
│           │    ├─ paint_coating                             1 ürün   ●   7% │
│           │    │  └─ MXP-CCN50KS · MX-PRO CRYSTAL 50ml · 2.500₺              │
│           │    ├─ paint_coating_kit                         1 ürün   ●   7% │
│           │    │  └─ Q2-SLE50M · GYEON Syncro EVO · 7.250₺                   │
│           │    ├─ glass_coating                             3 ürün   ●●  20%│
│           │    │  ├─ Q2-AF120M · GYEON AntiFog · 570₺                        │
│           │    │  ├─ Q2-VE20M · GYEON View EVO · 1.900₺                      │
│           │    │  └─ 79296 · INNOVACAR SC3 · 830₺                            │
│           │    └─ … 12 more sub_type                                         │
│           │                                                                  │
│           │  ▶ abrasive_polish                              24 ürün  ●●●● 72%│
│           │  ▶ car_shampoo                                  30 ürün  ●●●●●80%│
│           │  ▶ paint_protection_quick                       22 ürün  ●●●  55%│
│           │  ▶ fragrance                                    93 ürün  ●●   35%│
│           │                                                                  │
│           │  [Genişlet hepsi] [Daralt hepsi]                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

Coverage bar (●●●●) = sub_type'ın avg specs coverage; tıklanabilir → ilgili sub_type'ın heatmap row'u.

**Interaction:** Arrow keys ile ağaç gezinme; `Enter` açar, `Space` ürün listesi; sağ tık context menu ("Rename sub_type", "Move to…", "Bulk edit all products here").

### 6.3 Ürün Editor (`/products/Q2-OLE100M`)

Tabbed interface, tek scroll içinde 6 tab:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ≡  Catalog Atelier  ⋅  Catalog > ceramic_coating > single_layer > Q2-OLE100M│
├──────────────────────────────────────────────────────────────────────────────┤
│           │                                                                  │
│   NAV     │  ┌─ Q2-OLE100M ─────────────────────────────┐  [Preview bot]   │
│           │  │ GYEON Q One EVO Light Box                │  [Duplicate]     │
│           │  │ Seramik Kaplama                          │  [Revert all]    │
│           │  │                                           │                  │
│           │  │ ● Published · updated 2h ago · 3 staged  │                  │
│           │  └───────────────────────────────────────────┘                  │
│           │                                                                  │
│           │  ┌─[ Info ]─ Specs ─ Sizes(3) ─ FAQ(30) ─ Relations(8) ─ History│
│           │  │                                                               │
│           │  │  Name         GYEON Q One EVO Light Box Seramik Kaplama      │
│           │  │  Base name    GYEON Q One EVO                      [auto ↻]  │
│           │  │  Brand        [GYEON ▾]                                       │
│           │  │  Category     [DIŞ YÜZEY ▾] / [Seramik Kaplama ▾] / […]     │
│           │  │  Template     [ceramic_coating ▾] / [single_layer_coating ▾] │
│           │  │  Primary use  [paint_protection ▾]           ⚠ (new taxonomy)│
│           │  │  Price        4800 ₺     Stock [in_stock ▾]                  │
│           │  │  URL          https://mtskimya.com/…            [open ↗]     │
│           │  │  Image        [preview · replace]                            │
│           │  │  Video        https://youtu.be/SxEowHfp8Rs     [preview]    │
│           │  │  Target surf  [Otomotiv boyalı yüzeyler ·  ×] [Plastik · ×] │
│           │  │               [+ add surface]                                │
│           │  │  Descripton   [rich textarea, 12 rows, mono font] ◆           │
│           │  │                                                               │
│           │  └───────────────────────────────────────────────────────────────│
│           │                                                                  │
│           │  [Cancel]                                  [Stage changes (3)]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 6.3.1 Specs tab

```
│  ┌─ Specs (JSONB) ─────────────────────────────────────────┐              │
│  │                                                          │              │
│  │  ▼ Content                                               │              │
│  │    howToUse         [rich textarea, 6 rows]              │              │
│  │    whenToUse        [rich textarea, 4 rows]              │              │
│  │    whyThisProduct   [rich textarea, 4 rows]              │              │
│  │                                                          │              │
│  │  ▼ Numeric (type-coerced)                                │              │
│  │    durability_months     [24        ] number   🟢        │              │
│  │    durability_km         [25000     ] number   🟢        │              │
│  │    consumption_ml_per_car[30        ] number   🟢        │              │
│  │    cure_time_hours       [12        ] number   🟢        │              │
│  │    layer_count           [1         ] number   🟢        │              │
│  │                                                          │              │
│  │  ▼ String (parseable)                                    │              │
│  │    hardness             [9H        ] string   🟡 parse? │              │
│  │    ph_tolerance         [2-11      ] range    🟡         │              │
│  │    technology           [SiO2-based] string   🟢         │              │
│  │                                                          │              │
│  │  ▼ Boolean                                               │              │
│  │    silicone_free        [ ☑ true   ]  🟢                 │              │
│  │    filler_free          [ ☑ true   ]  🟢                 │              │
│  │    toxic_free           [ ⬚ null   ]  🔴 missing         │              │
│  │                                                          │              │
│  │  ▼ Ratings (subobject, subjective 1-5)                   │              │
│  │    ⚠ sadece beading/self_cleaning/gloss ratings tutulur, │              │
│  │      durability ratings → durability_months'u kullan     │              │
│  │    beading         [4.5  ] slider ●────○──                │              │
│  │    self_cleaning   [4.5  ] slider ●────○──                │              │
│  │    gloss           [null ] slider ○──────── [+ add]      │              │
│  │                                                          │              │
│  │  ▼ Raw JSON preview (read-only)                          │              │
│  │    {                                                     │              │
│  │      "howToUse": "1. Aracı yıkayın …",                   │              │
│  │      "durability_months": 24,                            │              │
│  │      "hardness": "9H",                                   │              │
│  │      ...                                                  │              │
│  │    }                                                     │              │
│  │  [Copy JSON]  [Edit raw JSON (advanced)]                 │              │
│  └──────────────────────────────────────────────────────────┘              │
```

#### 6.3.2 Sizes tab

```
│  ┌─ Sizes (Variants) · 3 ──────────────────────────────────┐              │
│  │                                                          │              │
│  │  Primary SKU:  Q2-OLE100M (current)                      │              │
│  │                                                          │              │
│  │  #   display   SKU          barcode       price   url    │              │
│  │  1   30 ml     Q2-OLE30M    4260063…      1.950  [link]  │              │
│  │  2   50 ml     Q2-OLE50M    4260063…      2.800  [link]  │              │
│  │  3★  100 ml    Q2-OLE100M   4260063…      4.800  [link]  │              │
│  │                                                          │              │
│  │  [+ Add variant]                                         │              │
│  │                                                          │              │
│  │  Note: Bu ürünün primary variant'ı 100ml.                │              │
│  │  searchProducts bu variant'ı döndürür; diğerleri sizes[].│              │
│  │  [Set 30ml as primary] (dikkatli — shared FAQ etkilenir)│              │
│  └──────────────────────────────────────────────────────────┘              │
```

#### 6.3.3 FAQ tab

```
│  ┌─ FAQ (30) ──────────────────────────────────────────────┐              │
│  │                                                          │              │
│  │  [🔍 filter]          [+ Add FAQ]  [Bulk from template ▾]│              │
│  │                                                          │              │
│  │  ⚠ Missing core questions (3):                           │              │
│  │    • "Silikon içerir mi?"              [Generate →]     │              │
│  │    • "Dolgu maddesi var mı?"           [Generate →]     │              │
│  │    • "Ne kadar dayanır?"      ✓ covered (sim 0.82)      │              │
│  │                                                          │              │
│  │  #  question                              sim    embed  │              │
│  │  1  Bu ürün nedir?                        —      ✓      │              │
│  │  2  Nasıl uygulanır?                      —      ✓      │              │
│  │  3  Ne kadar dayanır?                     —      ✓      │              │
│  │  4  Çıkarılabilir mi?                     —      ✓      │              │
│  │  …                                                       │              │
│  │  30 PPF/Mat boya uyumlu mu?               —      ✓      │              │
│  │                                                          │              │
│  │  Click row → expand full answer, inline edit             │              │
│  └──────────────────────────────────────────────────────────┘              │
```

"Bulk from template" açılırsa: template_group için önerilen core soru seti (silikon/dayanım/uygulama/temizlik/katkı/garanti). Seçip "Generate answer draft" dediğinde LLM/GPT-4 tarafından cevap önerilir (admin API endpoint), human review sonrası staging'e düşer.

#### 6.3.4 Relations tab

Node-link mini visualization:

```
│  ┌─ Relations · 8 ────────────────────────────────────────┐              │
│  │                                                          │              │
│  │                   [use_before: 1]                        │              │
│  │                        ↑                                 │              │
│  │                  Q2M-CCE (Clay)                          │              │
│  │                                                          │              │
│  │  [use_with: 3]  ← Q2-OLE100M →   [use_after: 1]          │              │
│  │  Q2M-PYA4000M                     Q2M-CRYA250M (Cure)    │              │
│  │  Q2M-BWE4040                                             │              │
│  │  Q2M-SWE4040C                                            │              │
│  │                        ↓                                 │              │
│  │                  [alternatives: 3]                       │              │
│  │                  Q2-MLE100M / Q2-PLE50M / Q2-SLE50M      │              │
│  │                                                          │              │
│  │  [+ Add relation]  filter: [all ▾]                      │              │
│  │                                                          │              │
│  │  Table view (alt expandable):                            │              │
│  │  type          sku          name              conf  note │              │
│  │  use_with      Q2M-PYA4000M GYEON Prep        0.9   —   │              │
│  │  use_with      Q2M-BWE4040  BaldWipe          0.85  —   │← staged NEW  │
│  │  ...                                                     │              │
│  └──────────────────────────────────────────────────────────┘              │
```

Click node → open that product in new tab. Drag to reorder. Context menu: "Set confidence", "Delete", "Make bidirectional".

#### 6.3.5 History tab

Git log-like timeline:

```
│  ┌─ History ──────────────────────────────────────────────┐               │
│  │                                                         │               │
│  │  ○ 14:22  Fiona (admin)                                 │               │
│  │  │        specs.silicone_free: null → true              │               │
│  │  │        [View diff] [Revert]                          │               │
│  │  │                                                       │               │
│  │  ○ 13:05  System (seed)                                 │               │
│  │  │        base_name: null → "GYEON Q One EVO"           │               │
│  │  │                                                       │               │
│  │  ○ Yesterday 18:10  System (migration 006)              │               │
│  │            video_url: null → "https://youtu.be/…"       │               │
│  └─────────────────────────────────────────────────────────┘               │
```

### 6.4 Bulk Operations (`/bulk`)

Üç-aşamalı: Query → Preview → Commit.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Bulk Operations                                                              │
│ ────────────────                                                             │
│                                                                              │
│  1. SELECT — hedef ürünleri seç                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ WHERE template_group = [ceramic_coating ▾]                           │   │
│  │   AND template_sub_type IN [paint_coating, paint_coating_kit, …]    │   │
│  │   AND brand = [any ▾]                                               │   │
│  │   AND specs.silicone_free IS NULL                                   │   │
│  │                                                         23 matching  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  2. TRANSFORM — ne yapılacak                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Operation: [Set specs key ▾]                                         │   │
│  │   Key: silicone_free                                                 │   │
│  │   Value: [ ☑ true ] (boolean)                                        │   │
│  │                                                                       │   │
│  │ Also: [ + Add secondary operation ]                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  3. PREVIEW — değişikliklerin diff'i                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Q2-OLE100M   specs.silicone_free: null → true                        │   │
│  │ Q2-MLE100M   specs.silicone_free: null → true                        │   │
│  │ Q2-SLE50M    specs.silicone_free: null → true                        │   │
│  │ MXP-CCN50KS  specs.silicone_free: null → true                        │   │
│  │ …                                                  23 total changes │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [← Geri]    [Staging'e at (23)]          [İptal]                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Extended Heatmap (`/heatmap`)

Dashboard'daki heatmap'in büyütülmüş, filtre + pivot seçenekli hali.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Heatmap                                                                      │
│ ───────                                                                      │
│                                                                              │
│  X axis: [specs_key ▾]      Y axis: [template_group ▾]                       │
│  Metric: [coverage % ▾]     Filter: [brand: all ▾]  [min cov: ─── 0% ]      │
│                                                                              │
│            du_mo  du_km  hard  ph   sili  fill  cons  ...                    │
│  ceramic   ████95 ██57   ██22  ██65 ░░4   ░░4   ███78 ...                    │
│  abrasive  ░░2    ─── 0  ─── 0 ─── 0 ─── 0 ─── 0 ─── 0                       │
│  shampoo   ▒▒30   ─── 0  ─── 0 ██75 ░░3   ░░3   ─── 0                       │
│  ...                                                                         │
│                                                                              │
│  Cell legend:  ─── 0%   ░░ <20%   ▒▒ 20-50%   ██ 50-80%   ████ 80-100%      │
│                                                                              │
│  Click row → filter ürün listesi                                            │
│  Click column → filter spec key (show only products missing this)           │
│  Click cell → expand: "13 products in ceramic_coating with hardness set"    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.6 FAQ Manager (`/faq`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FAQ · 3.156 items                                                            │
│ ──────────────────                                                           │
│  [🔍 question/answer]   scope: [all ▾]   embedding: [all ▾]   [+ New FAQ]   │
│                                                                              │
│  id     scope     sku/brand    question                       embed  ↓      │
│  1234   product   Q2-OLE100M   Nasıl uygulanır?               ✓      edit   │
│  1235   product   Q2-OLE100M   Ne kadar dayanır?              ✓      edit   │
│  ...                                                                         │
│                                                                              │
│  Row hover → inline answer preview (truncated)                              │
│  Row click → expand for full edit                                           │
│                                                                              │
│  Coverage alert panel (collapsed, click to expand):                          │
│  ▶ 60 products have no FAQ — "Bulk generate template FAQs?" [Run →]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.7 Relations Graph (`/relations`)

Node-link full-screen graph:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Relations Graph                                                              │
│ ─────────────────                                                            │
│                                                                              │
│  Layout: [force-directed ▾]   Filter: type=[all ▾]  conf≥[─ 0.5 ]           │
│                                                                              │
│         ┌─────────────┐                                                     │
│         │Q2M-PYA4000M │──use_with──┐                                         │
│         │   (Prep)    │            │                                         │
│         └─────────────┘            ▼                                         │
│                               ┌─────────────┐       ┌─────────────┐         │
│                       ┌───────│ Q2-OLE100M  │──alt──│ Q2-MLE100M  │         │
│                       │       │  (One EVO)  │       │  (Mohs EVO) │         │
│                       │       └─────────────┘       └─────────────┘         │
│              use_before│              │                                     │
│                       │               │use_after                             │
│         ┌─────────────┐               ▼                                     │
│         │  Q2M-CCE    │       ┌─────────────┐                                │
│         │  (Clay)     │       │Q2M-CRYA250M │                                │
│         └─────────────┘       │   (Cure)    │                                │
│                               └─────────────┘                                │
│                                                                              │
│  Click node = preview panel sağ kenarda                                     │
│  Shift+drag = select multiple                                               │
│  Right-click edge = delete / change type                                    │
│  Empty space click = show "orphans" (no relations)                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.8 Staging Drawer (ubiquitous, `⌘J`)

```
┌────────────────────────────────┐
│ Staged Changes · 7             │
│ ─────────────────────           │
│                                │
│  ○ Q2-OLE100M                  │
│    specs.silicone_free         │
│    null → true                 │
│    2 min ago  [↩] [✎]          │
│                                │
│  ○ Q2-SLE50M                   │
│    specs.silicone_free         │
│    null → true                 │
│    2 min ago  [↩] [✎]          │
│                                │
│  ○ 22202.260.001 (Menzerna)    │
│    FAQ — new                   │
│    "Silikon içerir mi?"        │
│    5 min ago  [↩] [✎]          │
│                                │
│  ...                           │
│                                │
│  ───────────────────────       │
│  [Discard all]                 │
│                   [Commit all] │
└────────────────────────────────┘
```

### 6.9 Commit Workflow (`/commit`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Commit · 7 changes                                                           │
│ ──────────                                                                   │
│                                                                              │
│  [Summary]                                                                   │
│  • 4 product updates (specs)                                                │
│  • 2 new FAQs                                                                │
│  • 1 new relation                                                            │
│                                                                              │
│  [SQL preview — read-only]                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ BEGIN;                                                                │   │
│  │                                                                       │   │
│  │ UPDATE products SET                                                   │   │
│  │   specs = jsonb_set(specs, '{silicone_free}', 'true'::jsonb),         │   │
│  │   updated_at = now()                                                  │   │
│  │ WHERE sku IN ('Q2-OLE100M', 'Q2-SLE50M', 'MXP-CCN50KS', …);           │   │
│  │                                                                       │   │
│  │ INSERT INTO product_faqs (scope, sku, question, answer) VALUES        │   │
│  │   ('product', '22202.260.001', 'Silikon içerir mi?', 'Hayır…'),       │   │
│  │   …                                                                    │   │
│  │                                                                       │   │
│  │ INSERT INTO product_relations …                                        │   │
│  │                                                                       │   │
│  │ COMMIT;                                                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [Export CSV]  [Export JSONL]                                                │
│                                                                              │
│  [← Staging]                                 [Execute on DB] [Cancel]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.10 Command Palette (⌘K)

```
┌─────────────────────────────────────────────────────┐
│ 🔍 Search commands and records…                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  RECENT                                             │
│   ↵  Q2-OLE100M — GYEON Q One EVO                   │
│   ↵  ceramic_coating heatmap                        │
│                                                     │
│  TRANSFORMATIONS                                    │
│   ⚙  Normalize numeric fields (cut_level, ph_level) │
│   ⚙  Merge ph / ph_level / ph_tolerance → ph        │
│   ⚙  Add required key to group (silicone_free…)     │
│                                                     │
│  BULK ACTIONS                                       │
│   ⚡ Bulk edit …                                    │
│   ⚡ Bulk generate FAQ from template                │
│                                                     │
│  NAVIGATION                                         │
│   →  Go to Heatmap            ⌘H                    │
│   →  Go to FAQ Manager        ⌘F                    │
│   →  Open Staging drawer      ⌘J                    │
│   →  Commit                   ⌘⇧↵                   │
│                                                     │
│  DATA                                               │
│   📤  Export coverage CSV                           │
│   📤  Export full catalog JSONL                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 7. Etkileşim akışları

### 7.1 Inline edit akışı (ürün detayında)

1. User alan üstüne hover → soft terracotta outline belirir
2. Click → alan edit mode'a geçer (input transforms, cursor placed)
3. Değişiklik → alan etrafı amber pulse glow (staged indicator)
4. Tab/Enter → commit to **local staging** (gerçek DB'ye değil)
5. Esc → revert to last saved value
6. Sayfa üstü "Stage changes (N)" button count günceller
7. Staging drawer otomatik flash animation (500ms) → kullanıcı değişikliğin kayıtlı olduğunu anlar

### 7.2 Bulk operation akışı

1. `/bulk` sayfasına git (veya `⌘K → "Bulk edit"`)
2. **Step 1 — Select**: filter builder (key-value where clauses + combinators)
3. Live counter: "N matching" her filter değişiminde
4. **Step 2 — Transform**: operation type dropdown (Set key / Delete key / Rename key / Coerce type / Apply expression)
5. Preview expression (read-only SQL-like): `specs.silicone_free := true WHERE template_group='ceramic_coating'`
6. **Step 3 — Preview diff**: list of (sku, before, after) tuples; virtualized for 500+ rows
7. "Stage (N)" button → all changes go to staging
8. Success toast: "23 changes staged. Review in Staging drawer."

### 7.3 Taxonomy (primary_use_case) ekleme

1. `/taxonomy` sayfasında mevcut taksonomi ağacı (read-only initially)
2. "+ New tag" → inline input, tag adı + renk seç
3. Tag yaratıldı → right panel: "Assign products"
4. Product list (filterable) → drag-drop ürünleri tag'e atama
   - Veya: checkbox select → "Apply tag to selected (12)"
5. Her atama staging'e düşer
6. Commit edilince `products.primary_use_case` kolonu update olur (migration önceden yapılmış olmalı)

### 7.4 FAQ generate from template

1. Ürün detayında FAQ tab → "Bulk from template"
2. Modal: template_group'un önerilen core soru listesi (silikon, dayanım, uygulama, temizlik, katkı, garanti)
3. User soruları seçer
4. "Generate draft answers with LLM" → admin API'ye POST, LLM ürün bilgisinden draft cevap üretir
5. Each generated FAQ shown in review mode: question (editable), answer (editable, LLM-generated), confidence indicator
6. User her birini approve/reject/edit eder
7. Approved olanlar staging'e FAQ eklemeleri olarak düşer
8. Commit → product_faqs'a INSERT + embedding queue'ya enqueue (async job)

### 7.5 Specs normalizasyonu

1. `⌘K → "Normalize numeric fields"` komut
2. Modal: hangi field'ları normalize et (`cut_level`, `ph_level`, `durability_months`, …)
3. Preview: "57 records will be converted string→number. 3 records cannot be parsed (inspect)"
4. "Show unparseable (3)" → manuel review (user karar verir: default değer? skip? ürüne özel düzelt?)
5. Stage → commit

### 7.6 Kaçışlar

- **Esc**: Modal kapat, inline edit revert
- **⌘Z**: Son staging değişikliğini geri al (local)
- **⌘⇧Z**: Redo
- **⌘S**: "Stage all dirty" (tüm kirli alanları aynı anda staging'e at)
- **⌘⇧↵**: Commit workflow'u aç
- **⌘J**: Staging drawer toggle
- **⌘K**: Command palette
- **⌘/**: Keyboard shortcuts cheat sheet

---

## 8. Component library

Framework-agnostic API'ler (React şemasıyla yazıldı, Vue/Svelte'de adapt edilebilir).

### 8.1 `<SpecEditor>`

Type-aware JSONB key editor.

```ts
interface SpecEditorProps {
  value: Record<string, any>;
  schema?: SpecSchema;  // per-template_group önerilen tip beyanları
  onChange: (next: Record<string, any>) => void;
  onDirtyKey?: (key: string, old: any, next: any) => void;
  groupByType?: boolean;  // numeric / string / boolean / subobject
  showRawJson?: boolean;
}

interface SpecSchema {
  keys: {
    [key: string]: {
      type: 'number' | 'string' | 'boolean' | 'range' | 'enum';
      required?: boolean;
      enum?: string[];
      min?: number; max?: number; unit?: string;
      description?: string;
    };
  };
}
```

Render: type başına farklı input. Missing required key → inline "+ add" chip. Type mismatch (string içinde number) → warning icon.

### 8.2 `<VariantEditor>`

`products.sizes[]` editör.

```ts
interface VariantEditorProps {
  primarySku: string;
  variants: SizeVariant[];
  onChange: (next: SizeVariant[]) => void;
  onPrimaryChange: (sku: string) => void;
}

interface SizeVariant {
  size_display: string;
  sku: string;
  barcode: string;
  url: string;
  price: number;
  image_url: string;
  size_sort_value?: number;
}
```

Table display, primary badge with ★, reorderable (drag handle), price edit inline, URL preview on hover.

### 8.3 `<RelationGraph>`

Force-directed node-link visualization.

```ts
interface RelationGraphProps {
  centerSku: string;
  nodes: ProductNode[];
  edges: RelationEdge[];
  onNodeClick: (sku: string) => void;
  onEdgeEdit: (edge: RelationEdge) => void;
  onAddRelation: (from: string, to: string, type: RelationType) => void;
  layout?: 'force' | 'radial' | 'tree';
}
```

Merkez ürün sabit pozisyon, relation'lar cardinal directions (use_before ↑, use_after ↓, use_with →, alternatives ←, accessories diagonal).

### 8.4 `<HeatmapCell>` + `<Heatmap>`

```ts
interface HeatmapProps {
  xAxis: string[];          // template_group listesi
  yAxis: string[];          // specs_key listesi
  data: HeatmapDatum[];
  metric: 'coverage' | 'count' | 'null_ratio';
  onCellClick: (x: string, y: string) => void;
  cellSize?: { w: number; h: number };  // default 56×32
}

interface HeatmapDatum {
  x: string; y: string;
  value: number;           // 0-100
  total: number;           // mutlak sayı
  hint?: string;           // tooltip
}
```

Color interpolation: primitive `--heat-0` → `--heat-100` linear. Hover: lift shadow + tooltip (product count).

### 8.5 `<DiffViewer>`

Before/after inline diff.

```ts
interface DiffViewerProps {
  before: any;
  after: any;
  format?: 'json' | 'text' | 'auto';
  compact?: boolean;
}
```

Key-level additions (sage green), deletions (clay red), changes (amber). Monospace font.

### 8.6 `<CommandPalette>`

```ts
interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  onExecute: (cmd: Command) => void;
  placeholder?: string;
}

interface Command {
  id: string;
  label: string;
  group: 'navigation' | 'transform' | 'bulk' | 'data' | 'recent';
  shortcut?: string;
  icon?: IconName;
  handler: () => void | Promise<void>;
}
```

Modal, fuzzy search (cmdk lib), virtualized list, group headers. Recent 5 command'ları localStorage'da tut.

### 8.7 `<StagingDrawer>`

```ts
interface StagingDrawerProps {
  open: boolean;
  onClose: () => void;
  changes: StagedChange[];
  onRevert: (id: string) => void;
  onEdit: (id: string) => void;
  onDiscardAll: () => void;
  onCommitAll: () => void;
}

interface StagedChange {
  id: string;
  entity: 'product' | 'faq' | 'relation' | 'meta';
  entityId: string;
  field: string;
  before: any;
  after: any;
  timestamp: string;
  authorHint?: string;  // "you" | "bulk op" | "generated"
}
```

Right-slide drawer, animated open. Grouped by entity.

### 8.8 `<TaxonomyTree>`

Drag-drop hiyerarşik ağaç.

```ts
interface TaxonomyTreeProps {
  nodes: TreeNode[];
  onMove: (nodeId: string, newParentId: string | null) => void;
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
  onAdd: (parentId: string | null) => void;
  selectable?: boolean;
  onSelect?: (nodeId: string) => void;
}
```

dnd-kit tabanlı, keyboard accessible (arrow keys to navigate, space to select, enter to edit).

### 8.9 `<InlineEditCell>`

Table cells için universal inline edit.

```ts
interface InlineEditCellProps {
  value: string | number | boolean;
  type: 'text' | 'number' | 'boolean' | 'enum';
  enumOptions?: string[];
  onCommit: (next: any) => void;
  onCancel: () => void;
  readOnly?: boolean;
  staged?: boolean;      // staged ise amber aura
  placeholder?: string;
}
```

Click / Enter → edit mode. Enter → commit. Esc → cancel. Tab → next cell.

### 8.10 `<StatusBadge>`

Data health indicator.

```ts
interface StatusBadgeProps {
  kind: 'ok' | 'warning' | 'error' | 'pending' | 'info';
  label: string;
  count?: number;
  icon?: IconName;
  size?: 'sm' | 'md';
}
```

Semantic color map, pill shape, uppercase tracking-wide label.

### 8.11 `<PromptSectionEditor>`

Bot conversation instruction'ı section bazında düzenleme. Markdown başlıklarını (`## Section Title`) parse edip her başlığı ayrı collapsible panel yapar; her panelde canlı token count + kaynak referans etiketi.

```ts
interface PromptSectionEditorProps {
  raw: string;                                  // full instruction template string
  sections: ParsedSection[];                    // auto-split via markdown headings
  tokenBudget?: number;                         // örn 6500
  activeSection?: string;
  onChange: (sectionId: string, next: string) => void;
  onReorder: (newOrder: string[]) => void;
  onCollapseToggle: (sectionId: string) => void;
  evaluateImpact?: (sectionId: string) => Promise<SectionImpact>;
  readOnlyIds?: string[];                       // JSX render kurallarını kilitle
}

interface ParsedSection {
  id: string;
  level: 2 | 3 | 4;                             // heading depth (##, ###, ####)
  heading: string;
  body: string;
  tokens: number;                               // char/4 tahmini (opsiyonel gerçek tokenizer)
  lines: number;
  linkedDataGaps?: DataGapRef[];                // "bu kural şu veri eksikliği için var"
  category: 'tool_selection' | 'render' | 'relevance'
          | 'fallback' | 'clarifying' | 'variant' | 'scope' | 'other';
  origin?: { commit: string; author: string; date: string };
}

interface SectionImpact {
  removeTokens: number;                         // eğer kaldırılırsa bütçe kazanımı
  behaviorRisk: 'low' | 'medium' | 'high';
  replacedBy?: 'data' | 'tool_description' | 'none';
}
```

Render: Sol sidebar'da section listesi (drag-reorder, collapse toggle, kategori renk chip'i); sağ alan aktif section için Monaco editor (markdown mode). Editor üstünde canlı token meter + budget uyarısı (`⚠ budget aşıldı +240`). Section başlığı `[v10 curator rule]` gibi version tag'leri inline renderlı. **Read-only kurallar** (JSX render kuralları, runtime contract) kilitli — lock ikonuyla işaretli.

### 8.12 `<ToolRegistryEditor>`

Botpress `Autonomous.Tool` tanımlarını görselleştirir (searchProducts, searchFaq, getProductDetails, getApplicationGuide, searchByPriceRange, searchByRating, getRelatedProducts). Her tool için description + Zod schema editor.

```ts
interface ToolRegistryEditorProps {
  tools: ToolDefinition[];
  onDescriptionChange: (toolName: string, description: string) => void;
  onSchemaChange: (toolName: string, kind: 'input'|'output', zodSource: string) => void;
  onToggleMutualExclusion: (toolA: string, toolB: string, reason: string) => void;
}

interface ToolDefinition {
  name: string;
  handlerFile: string;                          // src/tools/search-by-rating.ts
  description: string;                          // LLM'e giden açıklama
  descriptionTokens: number;
  input: ZodSchemaBlob;
  output: ZodSchemaBlob;
  microserviceEndpoint?: string;                // POST /search/rating
  lastEdited?: { commit: string; date: string };
  mutualExclusions?: Array<{ with: string; note: string }>;
  coverageHints?: {                             // hangi user phrase'ler bu tool'u tetikler
    triggers: string[];
    antiTriggers: string[];                     // hangilerinde KULLANILMAMALI
  };
}

interface ZodSchemaBlob {
  source: string;                               // editable Zod source text
  resolvedShape: Record<string, FieldMeta>;     // parsed field list (display only)
  errors: ParseError[];                         // invalid Zod syntax uyarıları
}
```

Render: tool listesi (sol, brand/group rengi ile), seçili tool'un detay paneli (sağ) 4 tab:
1. **Description** — Monaco (markdown), karakter + token sayacı + "LLM'e nasıl görünür" preview
2. **Input schema** — Zod source editor, live parse, field tablo (name / type / required / default / description)
3. **Output schema** — aynı (LLM buna göre JSX render eder)
4. **Triggers & anti-triggers** — hangi phrase'ler, mutual-exclusion listesi (ör. searchByRating ↔ searchProducts "en iyi X" sorguları için)

### 8.13 `<TokenMeter>`

Canlı token count + bütçe göstergesi. Bar chart (segmentli, kategori renkleriyle) veya donut.

```ts
interface TokenMeterProps {
  segments: Array<{
    label: string;
    tokens: number;
    color?: string;                             // default: kategori semantic color
    critical?: boolean;                         // read-only/kritik segment
  }>;
  budget: number;
  variant?: 'bar' | 'donut' | 'stack';
  showBreakdown?: boolean;                      // alt-altı label listesi
}
```

Örnek:
```
Token Budget ─────────────────────────────────── 6.536 / 6.000 ⚠ +536
┃tool select│render│relevance│fallback│faq RAG│spec first│variant│META│clarify│
 400        450    550       700      550     450        650     650  300
```

Bar'ın üstünde hover → hangi section, kaç token, hangi commit'te eklendi. Click → PromptSectionEditor'da ilgili section'a scroll.

### 8.14 `<DiffPromptViewer>`

İki instruction version'ı yan yana. Unified veya split view.

```ts
interface DiffPromptViewerProps {
  from: PromptVersion;
  to: PromptVersion;
  mode?: 'split' | 'unified';
  highlightTokenDeltas?: boolean;
}

interface PromptVersion {
  id: string;
  label: string;                                // "v10", "v10.1", "main@abc123"
  compiledText: string;                         // tool schemas dahil edilmiş sistem prompt
  tokenCount: number;
  sections: ParsedSection[];
  createdAt: string;
  author?: string;
  commitSha?: string;
}
```

Git-style diff ama instruction section'larına duyarlı: tek satır değişiklik yerine **section-level** insertion/deletion/modification olarak gruplar. Sağ margin'de her hunk için `+15 tokens` / `-40 tokens` etiketi; üstte toplam `Δ: -120 tokens, 3 sections changed`.

### 8.15 `<PromptPlayground>`

Sandbox — mevcut instruction + seçilen tool set ile **compiled system prompt**'u görselleştirir, hipotetik user query'sini simüle eder.

```ts
interface PromptPlaygroundProps {
  agentId: string;
  instructionOverride?: string;
  toolsOverride?: ToolDefinition[];
  onCompile: (compiled: CompiledPrompt) => void;
  onRunSimulation?: (query: string) => Promise<SimulationResult>;
}

interface CompiledPrompt {
  adkPrelude: string;                           // ~2.500 token, sabit
  toolSchemas: string;                          // serialize edilmiş tüm tool JSON schema
  conversationInstruction: string;
  stateRenderStub: string;                      // boş state / örnek state
  totalTokens: number;
}

interface SimulationResult {
  turnChoices: Array<{
    iteration: number;
    selectedTool: string | 'none';
    toolInput: Record<string, unknown>;
    promptedReason?: string;
  }>;
  totalInputTokens: number;
  totalOutputTokens: number;
  estCostUsd: number;
}
```

Simülasyon microservice'e POST (`/admin/prompts/simulate`) — gerçek Gemini çağrısı opsiyonel (fiyat uyarısı) veya cached mock run.

### 8.16 `<AgentSwitcher>`

Üst bar'da veya Prompt Lab landing'de agent seçici (detailagent-ms, detailagent v9.2, detailagent-dist vs.).

```ts
interface AgentSwitcherProps {
  agents: AgentSummary[];
  activeAgentId: string;
  onSwitch: (id: string) => void;
}

interface AgentSummary {
  id: string;
  name: string;
  status: 'dev' | 'staging' | 'production' | 'frozen';
  botId: string;                                // Botpress bot id
  tokenUsage: number;
  lastDeployedAt?: string;
  channels: string[];                           // webchat, chat, instagram…
}
```

### 8.17 Shared primitives

- `<Button>` variants: primary (terracotta), secondary (sage), ghost (text-only), destructive (clay red), link
- `<IconButton>` — 32×32 square, Lucide icon
- `<Tooltip>` — Radix Tooltip, dark espresso bg, cream text
- `<Popover>` — Radix
- `<DropdownMenu>` — Radix, terracotta selected
- `<Dialog>` — Radix, cream modal, warm shadow
- `<Toast>` — Sonner lib, right-bottom, warm palette
- `<ScrollArea>` — Radix, thin warm scrollbar

---

## 9. Tech stack önerisi

### Ana stack

- **Next.js 15 (App Router)** — file-based routing, server components, streaming; hem UI hem admin API tek repo'da
- **TypeScript strict** — `strict: true`, `noUncheckedIndexedAccess: true`
- **Tailwind CSS v4** — CSS variable-first, design token'lar Tailwind theme'e mapped
- **shadcn/ui (customized)** — Radix tabanlı primitive'ler, tema override (terracotta accent)
- **TanStack Query (v5)** — server state + optimistic mutations
- **TanStack Table (v8)** — headless virtualized table (511+ rows için)
- **Zustand** — local staging store (persisted to localStorage)
- **@dnd-kit** — TaxonomyTree drag-drop
- **react-flow** — Relations graph (force layout, Elkjs backend opsiyonel)
- **cmdk** — Command palette (Radix Dialog + filter)
- **react-markdown + remark-gfm** — rich text preview
- **Monaco Editor** — JSON/SQL edit (lazy loaded, code splitting)
- **Sonner** — Toast notifications
- **lucide-react** — Icon set
- **Supabase JS client** — read-only queries (RLS policy: read all, write via admin API)
- **tRPC veya REST** — admin API contract (önerim REST + Zod validation, mevcut microservice paterniyle uyumlu)

### Justification

- **Neden Next.js, Vite değil?** Admin API için server routes aynı repo'da yaşasın. Server components büyük list'leri SSR ile hızlı ilk paint. Static export mümkünse dashboard landing için.
- **Neden shadcn?** Copy-paste component'ler full kontrol, custom theme kolay. Radix primitives A11y çözülmüş.
- **Neden TanStack Table?** Virtualization (react-virtuoso veya TanStack Virtual ile) 500+ row'da smooth scroll. Columndef DSL güçlü.
- **Neden Zustand?** Staging state persistence (localStorage) + reactive + no provider hell. TanStack Query ile ortogonal — query = server state, Zustand = UI/staging state.

### Alternatif: Daha hafif stack

React + Vite + tanstack-router + aynı ekosistem — eğer admin API ayrı microservice'te ve UI pure SPA ise. Next.js'siz kurulum daha hızlı ama SSR avantajı kaybolur.

### Build ve deploy

- **Dev:** `next dev` localhost:3001 (microservice 8787'den ayrı)
- **Prod:** `next build` static + serverless functions, Fly.io veya Vercel
- **Env:**
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS read-only)
  - `ADMIN_API_URL` (retrieval-service `/admin/*`)
  - `ADMIN_API_TOKEN` (shared secret, admin-only)

### Dosya yapısı

```
admin-ui/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                    # Dashboard
│  ├─ catalog/
│  │  ├─ page.tsx                 # Tree
│  │  └─ [group]/[subtype]/
│  │     └─ page.tsx
│  ├─ products/[sku]/
│  │  ├─ page.tsx
│  │  ├─ info/
│  │  ├─ specs/
│  │  ├─ sizes/
│  │  ├─ faq/
│  │  ├─ relations/
│  │  └─ history/
│  ├─ bulk/page.tsx
│  ├─ heatmap/page.tsx
│  ├─ faq/page.tsx
│  ├─ relations/page.tsx
│  ├─ synonyms/page.tsx
│  ├─ taxonomy/page.tsx
│  ├─ staging/page.tsx
│  ├─ commit/page.tsx
│  └─ api/
│     └─ admin/
│        └─ …                     # admin API proxy routes
├─ components/
│  ├─ atelier/                    # özel component'ler
│  │  ├─ SpecEditor.tsx
│  │  ├─ VariantEditor.tsx
│  │  ├─ RelationGraph.tsx
│  │  ├─ Heatmap.tsx
│  │  ├─ DiffViewer.tsx
│  │  ├─ CommandPalette.tsx
│  │  ├─ StagingDrawer.tsx
│  │  ├─ TaxonomyTree.tsx
│  │  ├─ InlineEditCell.tsx
│  │  └─ StatusBadge.tsx
│  └─ ui/                         # shadcn primitives
├─ lib/
│  ├─ supabase.ts
│  ├─ api/
│  │  ├─ products.ts
│  │  ├─ faq.ts
│  │  └─ staging.ts
│  ├─ staging/
│  │  ├─ store.ts                 # Zustand
│  │  └─ reducers.ts
│  └─ schemas/                    # per-group spec schemas
│     ├─ ceramic_coating.ts
│     ├─ abrasive_polish.ts
│     └─ …
├─ public/
│  └─ paper-grain.svg
├─ styles/
│  └─ globals.css
└─ tailwind.config.ts
```

---

## 10. Admin API layer

Retrieval-service'e (`retrieval-service/src/routes/admin/`) eklenecek endpoint'ler. Tümü Bearer token auth + timing-safe compare.

### 10.1 Products

```
GET  /admin/products                        → liste + filter
     ?template_group=ceramic_coating
     &template_sub_type=paint_coating_kit
     &brand=GYEON
     &page=1&limit=50
     &include=faq_count,relation_count
     → { items: [...], total, page, perPage }

GET  /admin/products/:sku                   → detail (joined)
     → { product, specs_schema, sizes, faqs, relations, meta, history }

PUT  /admin/products/:sku                   → update (transactional)
     Body: { name?, base_name?, brand?, template_group?, template_sub_type?,
             specs?, sizes?, price?, primary_use_case? … }
     → { ok, updated_product, updated_at }

POST /admin/products/bulk-edit              → apply transformation to multiple
     Body: {
       filter: { template_group?, template_sub_type?, brand?, spec_is_null? },
       operation: 'set' | 'delete' | 'rename' | 'coerce',
       payload: { … }
     }
     → { affected: number, preview: DiffEntry[] }
     (if ?dry_run=true, no write happens)
```

### 10.2 FAQ

```
GET  /admin/faq?sku=&scope=&search=        → liste
POST /admin/faq                             → new FAQ (queue embedding)
PUT  /admin/faq/:id                         → update
DELETE /admin/faq/:id                       → delete (staging aware)

POST /admin/faq/generate                    → LLM draft generator
     Body: { sku, questions: string[] }
     → { drafts: [{question, answer_draft, confidence}] }
```

### 10.3 Relations

```
GET  /admin/relations?sku=                  → ürünün relations'ı
POST /admin/relations                       → new
PUT  /admin/relations/:id
DELETE /admin/relations/:id
```

### 10.4 Meta

```
GET  /admin/meta?sku=                       → ürünün meta key'leri
POST /admin/meta                            → upsert meta entry
DELETE /admin/meta/:sku/:key
```

### 10.5 Taxonomy / Normalization

```
GET  /admin/taxonomy                        → primary_use_case ağacı
POST /admin/taxonomy                        → tag yarat
PUT  /admin/taxonomy/:id                    → rename
DELETE /admin/taxonomy/:id                  → delete (cascade check)
POST /admin/taxonomy/assign                 → bulk assign products

POST /admin/normalize/specs                 → type coercion (numeric parse vs)
     Body: { keys: string[], dry_run: boolean }
     → { parsed: number, skipped: number, errors: [{sku, reason}] }

POST /admin/normalize/merge-keys            → ph/ph_level/ph_tolerance → ph
     Body: { source_keys: string[], target_key: string, strategy: 'prefer_first'|'prefer_numeric' }
     → { affected: number }
```

### 10.6 Coverage / Heatmap

```
GET  /admin/coverage                        → heatmap data
     ?axis=template_group,specs_key
     &metric=coverage|count|null_ratio
     → { xAxis, yAxis, cells: [{x,y,value,total}] }

GET  /admin/coverage/cell                   → hücre detay
     ?template_group=ceramic_coating&specs_key=silicone_free
     → { filled: [{sku,name}], missing: [{sku,name}] }
```

### 10.7 Staging

```
GET  /admin/staging                         → user'ın pending change listesi
POST /admin/staging/add                     → change ekle (idempotent)
DELETE /admin/staging/:id                   → revert (tek)
DELETE /admin/staging                       → discard all
POST /admin/staging/commit                  → tek SQL transaction'da uygula
     Body: { change_ids?: string[] } (boşsa tümü)
     → { applied: number, sql_preview?: string, committed_at }
POST /admin/staging/preview                 → diff + SQL preview
     → { diffs: [...], sql: "BEGIN; ... COMMIT;" }
```

### 10.8 Export

```
POST /admin/export                          → download CSV/JSONL
     Body: { table: 'products'|'faqs'|'relations'|'meta', format: 'csv'|'jsonl', filter? }
     → { download_url, expires_at }
```

### 10.9 History

```
GET  /admin/history?sku=                    → ürün history'si
GET  /admin/history/:id                     → tek kayıt detay + diff
```

### 10.10 Embedding maintenance

```
POST /admin/embed/queue                     → re-embed tetikle (async job)
     Body: { scope: 'products'|'faqs', skus?: string[] }
     → { job_id, estimated_duration }

GET  /admin/embed/job/:id                   → job durum
```

### 10.11 Agents

```
GET  /admin/agents                          → kayıtlı agent'lar
     → [{ id, name, botId, status, channels, tokenUsage, lastDeployedAt }]

GET  /admin/agents/:id                      → detail
     → { summary, instructionFile, toolRegistryFile, stateSchema }

POST /admin/agents/:id/build                → adk build (dry-run validation)
     → { ok, errors?: string[] }

POST /admin/agents/:id/deploy               → Cloud deploy
     Body: { confirm: true, env?: 'dev'|'staging'|'prod' }
     → { ok, revisionId, deployedAt }
```

### 10.12 Prompts (bot conversation instruction)

```
GET  /admin/prompts/:agentId                → aktif instruction (parsed sections)
     → {
         raw: string,
         sections: [{ id, heading, level, body, tokens, lines, category }],
         totalTokens, budget, lastEdited: { commit, date }
       }

PUT  /admin/prompts/:agentId                → instruction update (validation dahil)
     Body: { raw: string }  |  { sections: [{ id, body }] }
     → { ok, totalTokens, warnings: string[], escapeErrors?: string[] }
     // Template literal içindeki unescape backtick'leri tespit eder
     // (önceki v10.1 bug'ının tekrar yaşanmasını engeller)

POST /admin/prompts/:agentId/compile        → compiled system prompt preview
     → { adkPrelude, toolSchemas, conversationInstruction, stateRenderStub,
         totalTokens: { empty_state, populated_state } }

POST /admin/prompts/:agentId/simulate       → Gemini dry-run simulation
     Body: { userQuery: string, state?: Record<string, unknown>, live: boolean }
     → { turnChoices: [...], inputTokens, outputTokens, costUsd }
     // live=true ise gerçek Gemini call (ücret uyarısı), false ise mock replay
```

### 10.13 Tools registry

```
GET  /admin/tools/:agentId                  → agent'ın tool listesi
     → [{ name, handlerFile, description, descriptionTokens,
          input, output, microserviceEndpoint, lastEdited,
          mutualExclusions, triggers, antiTriggers }]

GET  /admin/tools/:agentId/:toolName        → tek tool detayı

PUT  /admin/tools/:agentId/:toolName        → description + schema update
     Body: { description?, input?: zodSource, output?: zodSource,
             mutualExclusions?, triggers?, antiTriggers? }
     → { ok, warnings, descriptionTokens, schemaErrors? }

POST /admin/tools/:agentId/:toolName/validate  → Zod source parse test
     → { ok, parsedShape, errors? }
```

### 10.14 Prompt version history

```
GET  /admin/prompts/:agentId/history        → commit bazlı versiyon listesi
     ?since=2026-04-01
     → [{ commitSha, date, author, message, totalTokens, sectionDeltas: {...} }]

GET  /admin/prompts/:agentId/diff           → iki versiyon karşılaştırma
     ?from=bd647c5&to=5f23e8c
     → { sectionChanges: [...], tokenDelta, addedLines, removedLines,
         behaviorSummary: "Rule 0 + 4-step relevance check eklendi" }

POST /admin/prompts/:agentId/rollback       → önceki commit'e dön
     Body: { commitSha: string, reason: string }
     → { ok, newInstructionSaved }
     // staging'e düşer — commit workflow'u üzerinden gerçekleşir
```

**Zod schemas** — her endpoint için input/output validation. Microservice pattern'ine uyumlu.

**Audit log** — her write operasyonu `admin_audit_log` tablosuna (new migration 008): `id, timestamp, user, action, entity, entity_id, before, after`.

**Prompt compile implementasyonu** — `/admin/prompts/:agentId/compile` retrieval-service'te değil, direkt `Botpress/detailagent-ms/` klasörünü process eder:
1. `conversations/index.ts` parse et (template string yakala, state stub ile render)
2. `tools/*.ts` parse et → Zod schema'ları JSON Schema'ya çevir (adk runtime taklit)
3. ADK prelude şablonunu sabit ekle
4. Gemini-tokenizer (veya char/4 yaklaşık) ile token count

---

## 11. Data flow

### 11.1 Read path (heavy)

```
UI           Supabase JS       Postgres
 │                │                │
 ├── query ──────>│                │
 │                ├── PostgREST ──>│
 │                │<── rows ───────┤
 │<── rows ───────┤                │
 │                                 │
```

Supabase RLS policy: `authenticated` role read-all, write-none. UI ham read yapar; cacheable, fast.

TanStack Query: stale-while-revalidate (staleTime 60s, cacheTime 5min).

### 11.2 Write path (staging → commit)

```
UI (edit)    Zustand          Admin API        Postgres
 │              │                  │               │
 │─ stage ────>│                  │               │
 │              │ (local only)     │               │
 │              │                  │               │
 │─ commit ────>│                  │               │
 │              │─ POST staging/commit →           │
 │              │                  │── BEGIN ─────>│
 │              │                  │── UPDATE… ───>│
 │              │                  │── INSERT… ───>│
 │              │                  │── COMMIT ────>│
 │              │<── ok, audit_id ─┤               │
 │              │ clear staging    │               │
 │<── toast ───┤                  │               │
```

Staging persisted in localStorage (key: `atelier-staging-v1`), survives reload.

### 11.3 Concurrent edit

`products.updated_at` her ürün için optimistic lock. Commit sırasında:
- `UPDATE products SET … WHERE sku=? AND updated_at=?` (where old updated_at)
- Row affected 0 ise → conflict, UI'ya "someone else edited this, see diff" modal

### 11.4 Embedding drift

`specs.howToUse` veya `search_text` etkileyen alanlar değişince → embedding outdated olur. Commit response'da "Re-embed recommended (4 products affected)" uyarısı; async job queue'ya ekleyebilir.

---

## 12. Edge case'ler

### 12.1 Concurrent edit (2 operator aynı ürün)
- Optimistic lock via `updated_at`
- Conflict UI: three-way merge görünümü (base / yours / theirs)
- Default resolution: prefer yours, allow manual override

### 12.2 Validation failure (commit sırasında)
- Pre-commit validation endpoint (`POST /admin/staging/preview`)
- Her change için `validation_errors[]` döner
- UI staging drawer'da her error'u inline göster, commit button disabled until resolved

### 12.3 Undo/Redo
- Zustand + zundo middleware
- Her stage action undo stack'e girer
- `⌘Z` son staged change'i revert eder (ama local; commit edilmişse git revert gerekli)

### 12.4 Network failure during commit
- Commit tek transaction; ya hepsi ya hiçbiri
- Network timeout → "Commit status unknown. Refresh to check." → refresh sonrası staging hâlâ duruyorsa retry, boşsa başarılı

### 12.5 Büyük bulk operation (500+ değişiklik)
- Chunked staging (batch 100)
- Progress bar
- Commit de chunked SQL transaction, rollback-on-failure

### 12.6 Embedding queue backlog
- Queue'da 100+ job varsa UI uyarı
- Commit hala çalışır ama "Search results may lag by ~5min" bildirimi

### 12.7 Schema migration gerektirir bir değişiklik
- Örn primary_use_case kolonu henüz yok
- Migration plan'ı ayrıca; UI "Pending migration: 008_add_primary_use_case" alert gösterir
- Migration uygulanmadan ilgili feature kilitli ve "Apply migration first" CTA

### 12.8 LLM-generated FAQ halüsinasyonu
- Her generate'de `confidence` skoru
- User review zorunlu (cannot auto-commit)
- "Flag as uncertain" option, reviewer'a işaretli gönderir

### 12.9 Soft delete vs hard delete
- Products: hard delete yok (history korunsun); `is_archived` flag
- FAQs/Relations: hard delete (rebuildable via seed)
- Audit log tüm delete'leri kaydeder

### 12.10 Fiyat = 0 veya NULL uyarısı
- Dashboard alert card; commit sırasında her ürün için "price = 0, intended?" confirmation

---

## 13. Accessibility

### Genel ilkeler
- **WCAG 2.2 AA hedefi**; AAA yakalanan yerler (body text) bonus
- Semantic HTML first (button, nav, main, section, article)
- ARIA yalnızca gerektiğinde (custom widget'larda — RelationGraph, Heatmap)

### Spesifik

- **Kontrast**: Her palette kombinasyonu kontrast test edildi (§3); renkler semantic var's üzerinden kullanılır, inline hex değil
- **Focus indicators**: Tüm interactive element'lerde `outline: 2px solid var(--ring); outline-offset: 2px`
- **Keyboard navigation**:
  - Tab order doğal DOM flow
  - Trees: arrow keys (↑↓ navigate, ← collapse, → expand, Enter open)
  - Tables: arrow keys navigate cells, Enter edit, Esc cancel, Tab next column
  - Modals: focus trap, Esc close, initial focus first input
  - Command palette: ↑↓ select, Enter execute, Esc close
- **Screen reader announcements**: Staging changes, toast messages, loading states `aria-live="polite"`
- **Reduced motion**: `prefers-reduced-motion: reduce` → disable amber pulse, staging flash animations; keep functional transitions (panel slide) with shorter duration
- **High contrast mode**: Windows HCM respect — borders visible, focus outlines preserved
- **Zoom**: 200% zoom'da layout bozulmamalı (test)
- **Touch targets**: Minimum 44×44 px tıklanabilir alan

### Heatmap accessibility
- Visual color alone yetersiz → her hücrede `aria-label="ceramic_coating × silicone_free: 4.3% coverage (1/23)"`
- Alternative table view toggle (`View as table`)
- Keyboard navigation cells arasında

### Relations graph accessibility
- Node-link görselin altında `<details><summary>Text view</summary>…</details>` — textual adjacency list
- Keyboard: Tab nodes arasında, Enter open preview, arrow keys navigate edges

---

## 14. Implementation phases

### Phase 0 — Scaffolding (1-2 gün)
- Next.js 15 init, Tailwind v4 config, design tokens CSS variables
- shadcn/ui init + theme override
- Font loading (Fraunces + IBM Plex)
- Supabase client setup
- Top bar + left rail layout
- Dark mode toggle
- Paper grain background
- **Delivery:** Empty shell with nav working

### Phase 1 — MVP (1 hafta)
- Dashboard landing (heatmap + 3 alert cards)
- Catalog Tree (`/catalog`)
- Product detail view (read-only, all 6 tabs display)
- Admin API: `GET /admin/products`, `GET /admin/products/:sku`, `GET /admin/coverage`
- Command palette skeleton (navigation only)
- **Delivery:** Navigable catalog, read-only views complete

### Phase 2 — V1 Write operations (2 hafta)
- Inline edit on all product fields (name, brand, template_group, price, basic specs)
- Specs editor (type-aware)
- Variant editor (sizes[])
- Staging drawer + localStorage persistence
- Admin API: `PUT /admin/products/:sku`, `POST /admin/staging/commit`
- Commit workflow page with SQL preview
- Undo/redo (zundo)
- **Delivery:** Full CRUD for products + staging/commit

### Phase 3 — V1.5 Rich data editors (1 hafta)
- FAQ Manager page + editor
- Relations table editor (graph view deferred to V2)
- Admin API: FAQ, relations CRUD
- History tab with diff viewer
- Export CSV/JSONL
- **Delivery:** FAQ + relations editable

### Phase 4 — V2 Advanced features (2 hafta)
- Bulk operations page (filter → transform → preview → commit)
- Specs normalization (`POST /admin/normalize/specs`, `/merge-keys`)
- Taxonomy tree (primary_use_case) + drag-drop assignment
- Command palette transformations
- Relations graph (react-flow)
- LLM FAQ generation
- **Delivery:** Power-user tools complete

### Phase 5 — V2.5 Polish + a11y (1 hafta)
- Full keyboard navigation audit
- Screen reader pass
- Reduced motion, high-contrast
- Performance (virtualization tuning, table row rendering)
- Error boundaries, network failure UX
- Print styles (for PDF export of diff views)
- **Delivery:** Production-ready

**Toplam: 6-8 hafta** (solo dev), 3-4 hafta (paralel 2 dev — biri UI, biri admin API).

---

## 15. Test senaryoları

### 15.1 Dashboard render
- [ ] Dashboard 511 ürün için <2s ilk paint
- [ ] Heatmap 26×40 cell virtualization smooth scroll (60fps)
- [ ] Alert cards correct counts (price=0, FAQ-less, duplicate keys)

### 15.2 Product edit flow
- [ ] Open `/products/Q2-OLE100M`, all 6 tabs load
- [ ] Edit `specs.silicone_free` false → true, see amber glow, "Stage (1)" badge
- [ ] Esc cancels pending edit, amber glow fades
- [ ] `⌘J` opens staging drawer, shows 1 change
- [ ] Revert single change → product back to original
- [ ] Add 2 more changes, Commit → all applied in single transaction (verify via Supabase log)
- [ ] Concurrent edit test: open same product in 2 tabs, edit both, commit both → second shows conflict

### 15.3 Bulk operation
- [ ] Filter ceramic_coating AND specs.silicone_free IS NULL → 22 matches
- [ ] Set silicone_free := true → preview shows 22 diff entries
- [ ] Stage → staging drawer 22 changes
- [ ] Commit → Supabase UPDATE affects exactly 22 rows
- [ ] Rollback test: commit fails mid-way (simulated network error) → no partial changes

### 15.4 FAQ generation
- [ ] `/products/Q2-OLE100M/faq` → "Missing: silikon, dolgu, garanti"
- [ ] "Bulk from template" → select "silikon içerir mi" + "dolgu var mı"
- [ ] LLM draft 2 cevap üretir
- [ ] User edit 1, accept both → 2 changes staged
- [ ] Commit → product_faqs'a 2 row INSERT, embedding queue'da 2 job

### 15.5 Specs normalization
- [ ] `⌘K → "Normalize numeric fields"` → modal
- [ ] Select cut_level → preview shows "57 will convert, 3 cannot parse"
- [ ] Inspect 3 unparseable → one has value "3/5" → user decides "use 3"
- [ ] Apply → 58 changes staged
- [ ] Commit → verify specs.cut_level now numeric everywhere

### 15.6 Taxonomy assignment
- [ ] Create tag "paint_protection" under root
- [ ] Drag 20 products from paint_coating + paint_coating_kit + single_layer_coating onto tag
- [ ] Staging: 20 changes
- [ ] Commit → verify products.primary_use_case='paint_protection'

### 15.7 Accessibility
- [ ] Complete catalog navigation using keyboard only
- [ ] Screen reader (VoiceOver) announces heatmap cell values
- [ ] 200% zoom: no horizontal scroll on main layout
- [ ] `prefers-reduced-motion` disables amber pulse animation
- [ ] Color-blind mode: heatmap legible via pattern overlay (dots/stripes) added as fallback

### 15.8 Performance
- [ ] 511 products in catalog tree: virtualized, no lag on scroll
- [ ] Open relations graph with 100 nodes: <3s initial layout
- [ ] Staging 50 changes, commit: <2s round-trip
- [ ] Dashboard heatmap re-fetch: <500ms

### 15.9 Export round-trip
- [ ] Export products as CSV → 511 rows
- [ ] Export FAQs as JSONL → 3.156 lines
- [ ] Verify seed script (`seed-products.ts`) can consume exported CSV without loss

### 15.10 Dark mode
- [ ] Toggle dark mode; all colors adapt (espresso base)
- [ ] Heatmap colors still legible
- [ ] Paper grain texture invisible / subtle in dark

---

## 16. Prompt Lab — Agent Instruction & Tool Registry (derin dalış)

Token bloat endişesinin operatör cevabı burada yaşar. Phase 4 Round 2'de gözlenen `10k → 16k` input token sıçramasının %11'i bot instruction'dan (`+800 token`), geri kalan %89'u conversation state render'ından kaynaklanıyordu. Prompt Lab her iki tarafı da — **statik instruction** ve **dinamik state insertion** — tek ekranda görünür kılar. İki ana hedefi var:

1. **Görünürlük** — hangi section kaç token tüketiyor, hangi commit'te eklendi, hangi veri eksikliğini kompanse ediyor
2. **Güvenli düzenleme** — inline staging (diğer her sayfayla aynı staging drawer), syntax guard (v10.1'deki 14-error backtick bug'ını engeller), simulate-before-commit (Gemini dry-run)

Bu bölüm dört alt-yüzey tanımlar: **Prompt Lab Landing**, **Agent Instruction Editor**, **Tool Registry Editor**, **Prompt Playground**. Her biri ayrı route altında; staging drawer ve command palette ortak.

### 16.1 Prompt Lab Landing (`/prompts`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ≡  Catalog Atelier  ⋅  Prompt Lab                    7 staged  ⌘K  ☀ ⎔  │
├──────────────────────────────────────────────────────────────────────────────┤
│           │                                                                  │
│   NAV     │  Prompt Lab                                                      │
│   ──      │  ────────────                                                    │
│           │  Fraunces 36pt — "Where instructions live as craft"              │
│           │                                                                  │
│           │  ┌────────────── AGENT SEÇİCİ ───────────────────────────────┐  │
│           │  │                                                             │  │
│           │  │  ● detailagent-ms  [v10.1 · prod]  6.536 tok  3 staged     │  │
│           │  │  ○ detailagent     [v9.2 · frozen] 5.820 tok  dokunulmaz    │  │
│           │  │  ⊕ New agent (klonla)                                       │  │
│           │  │                                                             │  │
│           │  └─────────────────────────────────────────────────────────────┘  │
│           │                                                                  │
│           │  [Instruction] [Tools] [History] [Playground]                    │
│           │                                                                  │
│           │  ┌─────────────── TOKEN BUDGET ─────────────────────────────┐  │
│           │  │                                                           │  │
│           │  │  Mevcut:  6.536 / 6.000 hedef  ⚠ +536                     │  │
│           │  │                                                           │  │
│           │  │  ┃tool│render│relev│fallbk│faq RAG│spec│variant│META│etc│ │  │
│           │  │   450 │ 450  │ 550 │ 700  │ 550   │450 │ 650   │650 │300│ │  │
│           │  │                                                           │  │
│           │  │  Dominant: fallback (700) · META (650) · variant (650)   │  │
│           │  │  Kategori rengi: tool=terracotta, render=sage,           │  │
│           │  │                  relevance=amber, fallback=clay          │  │
│           │  └───────────────────────────────────────────────────────────┘  │
│           │                                                                  │
│           │  ┌── Bloat önerileri (data coverage ile eşleşmiş) ───────────┐  │
│           │  │                                                            │  │
│           │  │  🟢 DÜŞÜK RİSK (önerilen)                                  │  │
│           │  │    ↳ PROACTIVE + RELEVANCE birleştir    −350 tok          │  │
│           │  │    ↳ RATINGS v9.0 + v10 merge           −150 tok          │  │
│           │  │    ↳ versiyon tag trim                   −80 tok          │  │
│           │  │                                                            │  │
│           │  │  🟡 ORTA — data fix gerekli                                │  │
│           │  │    ↳ SPEC-FIRST kaldır (specs null temizlenirse) −450    │  │
│           │  │    ↳ META tablosu 13→5 örnek                     −350    │  │
│           │  │                                                            │  │
│           │  │  🔴 YÜKSEK — mimari karar gerekli                          │  │
│           │  │    ↳ KEYWORD TUZAK trim (taxonomy normalize)    −150    │  │
│           │  │                                                            │  │
│           │  │  [Öneriyi uygula (seçili)]       [Öneriler nedir? →]      │  │
│           │  └────────────────────────────────────────────────────────────┘  │
│           │                                                                  │
│           │  ┌── Tool Registry özeti (7 tool · 787 tok) ────────────────┐  │
│           │  │  searchProducts  59 tok   🟢 stable (değiştirme 16h önce)│  │
│           │  │  searchFaq       216 tok  🟡 en uzun (RAG anlatımı)      │  │
│           │  │  getProductDetails 83 tok 🟢                              │  │
│           │  │  getApplicationGuide 101 tok 🟢                           │  │
│           │  │  searchByPriceRange 86 tok 🟢                             │  │
│           │  │  searchByRating   126 tok 🟡 (composite açıklama)         │  │
│           │  │  getRelatedProducts 115 tok 🟢                            │  │
│           │  │                                                            │  │
│           │  │  ⚠ Mutual exclusion eksik: searchByRating ↔ searchProducts│  │
│           │  │    "en dayanıklı" için her ikisi de tetiklenebilir.       │  │
│           │  │    [Çift yönlü anti-trigger ekle →]                      │  │
│           │  └────────────────────────────────────────────────────────────┘  │
│           │                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Davranışlar:**
- Agent seçici hover → kısa metadata (botId, son deploy zamanı, aktif kanallar)
- Token budget bar hover → hangi section hangi renk
- Bloat öneri'lerine click → Agent Instruction Editor'da ilgili section'lar scroll'da + highlight
- "Öneriyi uygula" → otomatik section re-organize (birleştirme/silme) staging drawer'a atılır; user commit öncesi diff'te gözden geçirir

### 16.2 Agent Instruction Editor (`/prompts/agents/detailagent-ms`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ≡  Prompt Lab > detailagent-ms > Instruction          7 staged  ⌘K  ☀ ⎔  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ SECTION LIST (320px) ─┐  ┌─ EDITOR (flex, Monaco markdown mode) ───────┐│
│  │                         │  │                                             ││
│  │ 🔍 section ara          │  │ ## TOOL SEÇİMİ — Karar Tablosu            ││
│  │                         │  │                                             ││
│  │ GOAL                    │  │ **🔴 EN YÜKSEK ÖNCELİKLİ KURAL — RATING…** ││
│  │ ● 114-122 · 140 tok     │  │ Kullanıcı sorusu **"en iyi X", "en         ││
│  │ ● tool_selection        │  │ dayanıklı", "top N", …                     ││
│  │ ● locked (persona)      │  │                                             ││
│  │                         │  │ - "En dayanıklı seramik kaplama" →          ││
│  │ TOOL SEÇİMİ ★active     │  │   \`searchByRating({metric:'durability'})\` ││
│  │ ● 126-145 · 450 tok     │  │ ...                                         ││
│  │ 🟢 last edited v10.1    │  │                                             ││
│  │                         │  │                                             ││
│  │ CONTEXT-AWARE v8.2      │  │                                             ││
│  │ ● 146-164 · 550 tok     │  │ ┌─ meta ──────────────────────┐            ││
│  │ 🔒 runtime contract     │  │ │ id: tool_selection           │            ││
│  │                         │  │ │ category: tool_selection     │            ││
│  │ SET/PAKET v8.4          │  │ │ tokens: 450  · lines: 20     │            ││
│  │ ● 167-203 · 800 tok     │  │ │ last: 5f23e8c · 2026-04-22   │            ││
│  │ 🟡 (workflow recipe)    │  │ │ impact if removed:            │            ││
│  │                         │  │ │   tokens: −450                │            ││
│  │ RENDER v8.5             │  │ │   risk: HIGH — LLM searchBy…  │            ││
│  │ ● 213-241 · 450 tok     │  │ │   replaced by: tool_description│           ││
│  │ 🔒 JSX runtime contract │  │ │ linked_data_gaps:             │            ││
│  │                         │  │ │   (none — pure behavior rule) │            ││
│  │ SPEC-FIRST v9.0         │  │ └───────────────────────────────┘           ││
│  │ ● 243-254 · 450 tok     │  │                                             ││
│  │ 🟡 (data-fix eliminates)│  │ Token meter (live):                         ││
│  │                         │  │ ┃ ████████░░ 450 tok (target 300) ⚠     │  ││
│  │ RATINGS v9.0            │  │                                             ││
│  │ ● 255-276 · 150 tok     │  │ [Revert] [Stage]               [Copy raw]  ││
│  │ 🟡 merge öneriliyor     │  │                                             ││
│  │                         │  │ ✓ Syntax OK · 3 escape detected (ok)        ││
│  │ searchFaq v10 RAG       │  │                                             ││
│  │ ● 278-313 · 550 tok     │  │                                             ││
│  │ 🟡 data-fix softens     │  │                                             ││
│  │                         │  │                                             ││
│  │ searchByRating v10 ★    │  │                                             ││
│  │ ● 320-335 · 400 tok     │  │                                             ││
│  │ 🟢 recently revised     │  │                                             ││
│  │                         │  │                                             ││
│  │ PROACTIVE FALLBACK v10  │  │                                             ││
│  │ ● 337-351 · 700 tok     │  │                                             ││
│  │ 🟡 merge ile 350'e iner │  │                                             ││
│  │                         │  │                                             ││
│  │ RELEVANCE CHECK v10.1 ★ │  │                                             ││
│  │ ● 353-385 · 550 tok     │  │                                             ││
│  │ 🟢 new · anti-hallucin. │  │                                             ││
│  │                         │  │                                             ││
│  │ CLARIFYING QUESTION     │  │                                             ││
│  │ ● 387-407 · 300 tok     │  │                                             ││
│  │ 🟢                       │  │                                             ││
│  │                         │  │                                             ││
│  │ TOOL ÇAĞRI KURALLARI    │  │                                             ││
│  │ ● 410-418 · 350 tok     │  │                                             ││
│  │ 🟢 (multi-turn re-tool) │  │                                             ││
│  │                         │  │                                             ││
│  │ VARIANT AWARENESS v8.5  │  │                                             ││
│  │ ● 454-484 · 650 tok     │  │                                             ││
│  │ 🟡 variant collapse P5  │  │                                             ││
│  │                         │  │                                             ││
│  │ META FİLTRE v8.4        │  │                                             ││
│  │ ● 486-503 · 650 tok     │  │                                             ││
│  │ 🟡 data enrichment P6   │  │                                             ││
│  │                         │  │                                             ││
│  │ (… 17 section total)   │  │                                             ││
│  │                         │  │                                             ││
│  │ ───────────────────     │  │                                             ││
│  │ TOPLAM: 6.536 / 6.000 ⚠ │  │                                             ││
│  │                         │  │                                             ││
│  │ [+ New section]         │  │                                             ││
│  └─────────────────────────┘  └─────────────────────────────────────────────┘│
│                                                                              │
│  [Preview compiled prompt]   [Simulate query ⌘⇧S]   [Discard]  [Stage all] │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Icon anahtarı:**
- 🔒 **lock** — runtime contract (JSX, persona, context retention); read-only, sadece explicit "unlock" ile düzenlenir
- ★ **active** — şu an editor'da açık olan section
- 🟢 son 16 saatte revize edilmiş
- 🟡 data fix ile shrink/merge edilebilir
- ● **dot renk** — kategori (tool_selection, render, relevance, vs.)

**Davranışlar:**
- Section drag-reorder → staging'e "reorder" entry olarak düşer (text değişmese bile)
- "+ New section" → boş H2 başlıklı section ekler, ID slug otomatik
- Editor üstünde `cmd+K` palette section-level komutlar açar: "Move to V2", "Mark read-only", "Explain impact"
- Syntax guard otomatik: template literal içinde unescape backtick yakalarsa kırmızı gutter + tooltip ("v10.1'deki 14-error bug'ı buradan gelmişti")

### 16.3 Tool Registry Editor (`/prompts/tools/searchByRating`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ≡  Prompt Lab > Tools > searchByRating              7 staged  ⌘K  ☀ ⎔  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ TOOL LIST (260px) ──┐  ┌─ TOOL DETAIL (flex) ──────────────────────────┐│
│  │                       │  │                                                ││
│  │ searchProducts  59   │  │  searchByRating                                ││
│  │ searchFaq       216  │  │  ──────────────                                ││
│  │ getProductDetails 83 │  │  src/tools/search-by-rating.ts                 ││
│  │ getApplicationGuide  │  │  microservice: POST /search/rating             ││
│  │   101                │  │  last edit: 49fc83c · 2026-04-22               ││
│  │ searchByPriceRange   │  │                                                 ││
│  │   86                 │  │  [Description] [Input] [Output] [Triggers]     ││
│  │ searchByRating ★126  │  │                                                 ││
│  │ getRelatedProducts   │  │  ┌─ Description (Monaco, markdown) ─────────┐  ││
│  │   115                │  │  │                                           │  ││
│  │                       │  │  │ Üretici puanı (rating) en yüksek         │  ││
│  │ ─────────             │  │  │ ürünleri döner. 'En iyi X', 'boncuk-     │  ││
│  │ TOPLAM: 787 tok       │  │  │ lanma puanı en yüksek', 'self-cleaning   │  ││
│  │                       │  │  │ en güçlü', 'dayanıklılık puanı top 3'    │  ││
│  │ [+ Add tool]          │  │  │ gibi KARŞILAŞTIRMALI sorularda kullan.   │  ││
│  │                       │  │  │ ...                                       │  ││
│  │                       │  │  │                                           │  ││
│  │                       │  │  │ 505 chars · ~126 tokens                  │  ││
│  │                       │  │  └───────────────────────────────────────────┘  ││
│  │                       │  │                                                 ││
│  │                       │  │  ┌─ LLM'e nasıl görünür (preview) ────────────┐││
│  │                       │  │  │ {                                           │││
│  │                       │  │  │   "name": "searchByRating",                │││
│  │                       │  │  │   "description": "Üretici puanı…",         │││
│  │                       │  │  │   "parameters": { … Input schema }         │││
│  │                       │  │  │ }                                           │││
│  │                       │  │  └─────────────────────────────────────────────┘││
│  │                       │  │                                                 ││
│  │                       │  │  Triggers (phrase → tetikleyici):              ││
│  │                       │  │  ✓ "en dayanıklı"           en iyi" "top N"    ││
│  │                       │  │  ✓ "en yüksek X puan"  "en uzun ömürlü"        ││
│  │                       │  │  ✓ "en parlak" (gloss metric)                  ││
│  │                       │  │  [+ Add trigger]                                ││
│  │                       │  │                                                 ││
│  │                       │  │  Anti-triggers (bu tool KULLANILMAMALI):       ││
│  │                       │  │  ⚠ Mutual exclusion: searchProducts            ││
│  │                       │  │    "en X için searchProducts YASAK"            ││
│  │                       │  │    [Sync to searchProducts description →]      ││
│  │                       │  │                                                 ││
│  │                       │  │  [Revert] [Stage]                               ││
│  └───────────────────────┘  └─────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

**Tab içerikleri:**
- **Description**: Markdown Monaco, token/char sayacı, "LLM'e nasıl görünür" yan panelde canlı JSON render
- **Input schema**: Zod source (input z.object'i), field tablosu (name, type, required, default, description), live parse error highlight
- **Output schema**: aynı — bot output'unu nasıl parse ettiği (carouselItems, productSummaries, vs.)
- **Triggers**: tool'u tetikleyen/hariç tutan user phrase listesi. "Mutual exclusion" sync butonu: searchByRating'e anti-trigger eklendiyse searchProducts'ın description'ına otomatik "en X için KULLANILMAZ" cümlesi önerilir

**Schema kaynak kodunu doğrudan değiştirmek** tehlikeli (bot runtime break). Bu yüzden her schema değişikliği `adk build` dry-run ile doğrulanır (Admin API `/admin/agents/:id/build`), başarılı sonra staging'e düşer.

### 16.4 Prompt Playground (`/prompts/playground`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ≡  Prompt Lab > Playground                          7 staged  ⌘K  ☀ ⎔  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Agent: [detailagent-ms ▾]    Version: [v10.1 (current) ▾]                  │
│                                                                              │
│  ┌─ USER QUERY ─────────────────────────────────────────────────────────┐   │
│  │  > en dayanıklı seramik kaplama                                       │   │
│  │                                                                        │   │
│  │  State: [ empty ▾ ]     [ with lastProducts · with lastFaqAnswer]     │   │
│  │                                                                        │   │
│  │  [Compile system prompt]  [Simulate (live Gemini, ~$0.003)]           │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─ COMPILED SYSTEM PROMPT (read-only) ─ 12.036 tokens ─────────────────┐   │
│  │                                                                        │   │
│  │  ► ADK prelude                        2.500 tok                       │   │
│  │  ► Tool schemas (7)                   3.000 tok                       │   │
│  │  ► Conversation instruction           6.536 tok                       │   │
│  │    ● 17 sections (expand to inspect)                                  │   │
│  │  ► State render (empty)                 0 tok                         │   │
│  │                                                                        │   │
│  │  [Expand full prompt] [Copy to clipboard] [Export .txt]               │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─ SIMULATION RESULT (mock replay veya live Gemini) ───────────────────┐   │
│  │                                                                        │   │
│  │  Iteration 1                                                           │   │
│  │    ├─ LLM decision: call searchByRating                                │   │
│  │    ├─ input: { metric: "durability", templateGroup: "ceramic_coating",│   │
│  │    │           limit: 3 }                                              │   │
│  │    ├─ reasoning (Gemini chain-of-thought özeti):                       │   │
│  │    │   "User 'en dayanıklı' dedi → TOOL SEÇİMİ Rule 0 devreye girdi   │   │
│  │    │    → searchByRating zorunlu, searchProducts yasak"                │   │
│  │    └─ ✓ Matches Rule 0                                                 │   │
│  │                                                                        │   │
│  │  Iteration 2 (after tool result)                                       │   │
│  │    ├─ LLM decision: yield <Carousel … />                               │   │
│  │    ├─ text summary: "GYEON Syncro EVO 50 ay / 50.000 km …"             │   │
│  │    └─ ✓ Follows VARIANT AWARENESS (3 variant carousel)                │   │
│  │                                                                        │   │
│  │  Token usage:                                                          │   │
│  │    input:   12.834                                                     │   │
│  │    output:     823                                                     │   │
│  │    cost:   $0.0028                                                     │   │
│  │                                                                        │   │
│  │  [Run 5 more similar queries (batch)]  [Compare vs v10 version]       │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Davranışlar:**
- **Mock vs Live** — default `mock` (önceden kaydedilmiş tool trace replay, ücretsiz). `Live` check edilirse gerçek Gemini çağrısı ve ücret uyarısı
- **State override** — empty / lastProducts dolu / lastFocusSku + lastFaqAnswer dolu gibi predefined stateler; compiled prompt size'ı bu state'e göre değişir (boş state 12k → dolu state 16k)
- **Version compare** — v10 ile v10.1'i aynı sorguya atıp yan yana karar zincirini göster
- **Batch mode** — 10-query smoke set (Phase 4 Round 2'deki `inspect-phase4-round2` query'lerinden türetilmiş) otomatik sırayla koş, her biri için pass/fail + tool seçim doğruluğu (beklenen vs gerçek)

### 16.5 Prompt Version History (`/prompts/history`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Prompt Version History — detailagent-ms                                      │
│ ──────────────────────────────────────────                                    │
│                                                                              │
│  ┌─ Timeline (git log) ──────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ○ 5f23e8c   v10.1   2026-04-22 01:09   +38/-6 lines  6.536 tok ↑ +72│  │
│  │  │ feat(bot): instruction v10.1 — searchByRating enforcement +        │  │
│  │  │ pre-yield relevance check                                           │  │
│  │  │                                                                     │  │
│  │  ○ bd647c5   v10     2026-04-21 22:39   +66/-32       6.464 tok ↑ +328│  │
│  │  │ feat(bot): instruction v10 — RAG, proactive fallback, re-tool      │  │
│  │  │                                                                     │  │
│  │  ○ 6370ecc   v8.5→v9 2026-04-21 18:12   +38/-0        6.136 tok ↑ +152│  │
│  │    feat(bot): instruction refinement (Medium, microservice-aware)     │  │
│  │                                                                        │  │
│  │  [Load older (25)]                                                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ DIFF (bd647c5 ↔ 5f23e8c) ────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Section changes:                                                     │  │
│  │    + TOOL SEÇİMİ preamble (Rule 0)         +8 lines  +400 tok         │  │
│  │    ~ SEARCH RESULT RELEVANCE CHECK         ±32 lines ±0 tok (reframe) │  │
│  │    + TOOL ÇAĞRI KURALLARI madde 7          +2 lines   +60 tok         │  │
│  │                                                                        │  │
│  │  Token Δ: +460 (but net +72 due to internal reframe savings)          │  │
│  │  Behavior Δ: Rule 0 forces searchByRating, Curator now 4-step         │  │
│  │                                                                        │  │
│  │  [Rollback to bd647c5 (stages change)]  [Export diff as patch]        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Rollback direkt DB yazmaz — seçilen commit'in instruction'ını staging'e yeni bir revize olarak bırakır. Commit workflow'dan onaylandığında `conversations/index.ts` dosyasına yazılır (git commit + push ayrı bir aksiyon).

### 16.6 Staging Drawer entegrasyonu

Prompt Lab değişiklikleri diğer staging entry'leriyle aynı drawer'da toplanır — ama `entity: 'prompt' | 'tool'` ile etiketlenmiş. Örnek:

```
○ detailagent-ms / instruction
  PROACTIVE FALLBACK section deleted (merged into RESULT VALIDATION)
  −700 tokens, +1 new section RESULT VALIDATION (450 tok) = Δ −250
  [↩] [✎] [view section diff]

○ searchByRating / description
  +2 line mutual-exclusion note with searchProducts
  Δ +24 tokens
  [↩] [✎]

○ searchProducts / description
  +1 line "en X" anti-trigger note (synced from searchByRating)
  Δ +18 tokens
  [↩] [✎]
```

Commit workflow'u bu entry'leri toplayıp:
- **Prompt/tool instruction değişiklikleri** → `conversations/index.ts` veya `tools/*.ts` dosyalarına patch
- Patch preview göster (git diff formatı)
- "Apply + stage git commit" butonu → dosya yazılır, kullanıcı sonra IDE'den `git add + commit` yapar
- Opsiyonel `/admin/agents/:id/build` çağrısı → adk build dry-run, hata varsa commit blocklı

### 16.7 Token bütçesi yönetim felsefesi

Bu ekranın **tek gözlemlenebilir hedefi** `totalInstructionTokens ≤ budget`. Budget başlangıçta `6.000` (mevcut 6.536'dan ~%9 reduction hedefi) — user ayarlardan değiştirebilir.

Budget aşıldığında sadece **uyarı** verilir, hard block yok. Ama her instruction save'de:
- Hangi section'lar hangi token'ları eklediği görülür (stacked bar)
- "Bloat önerileri" panelinde (§16.1) yeni bir aday belirirse otomatik listeye gelir

### 16.8 Prompt Lab component özet tablosu

| Surface | Rota | Ana component'ler | Admin API tüketimi |
|---|---|---|---|
| Landing | `/prompts` | AgentSwitcher, TokenMeter (bar), bloat recommendation cards | `GET /admin/agents`, `GET /admin/prompts/:id` |
| Instruction Editor | `/prompts/agents/:id` | PromptSectionEditor, TokenMeter (live), DiffPromptViewer (inline) | `GET/PUT /admin/prompts/:id`, `POST /compile` |
| Tool Registry | `/prompts/tools/:tool` | ToolRegistryEditor, Monaco (Zod), JSON preview | `GET/PUT /admin/tools/:agent/:tool`, `POST /validate` |
| History | `/prompts/history` | DiffPromptViewer (split), timeline | `GET /admin/prompts/:id/history`, `/diff` |
| Playground | `/prompts/playground` | PromptPlayground, CompiledPromptView | `POST /compile`, `POST /simulate` |

### 16.9 Güvenlik & koruma

1. **Runtime contract section'ları kilitli** — `RENDER KURALLARI (JSX)`, `CONTEXT-AWARE TOOL ÇAĞRI (v8.2 state)` gibi Botpress runtime'ının beklediği davranışlar read-only; unlock için explicit uyarı modal + admin onay
2. **Syntax pre-commit hook** — template literal içinde unescape backtick, `${` leak, HTML injection yakalanır (v10.1'de yaşanan 14-error bug'ı repeat olmasın)
3. **Build validation zorunlu** — instruction veya tool değişikliği commit öncesi `adk build` dry-run ile test edilir; hata varsa commit blocklu
4. **Rate-limit simulation** — `live` Gemini simulation saatte 20 call limit (kazara ücret patlaması olmasın)
5. **Audit log** — tüm prompt/tool değişiklikleri `admin_audit_log` tablosuna before/after JSON dump ile

### 16.10 Önerilen implementation sırası (§14 Phase 4 genişlemesi)

Phase 4 (V2 Advanced features) içine dahil edilecek alt-bullet'lar:

- **Phase 4.1 — Prompt Lab Landing + Agent switcher** (2 gün) — read-only, token meter + bloat recommendations list (static data)
- **Phase 4.2 — Agent Instruction Editor** (3 gün) — section parsing, Monaco editor, staging entegrasyonu
- **Phase 4.3 — Tool Registry Editor** (2 gün) — Zod source editor, preview, validation
- **Phase 4.4 — Prompt Playground (mock mode)** (2 gün) — compiled prompt view, cached simulation replay
- **Phase 4.5 — History + Diff + Rollback** (2 gün) — git timeline, DiffPromptViewer
- **Phase 4.6 — Live Gemini simulation** (1 gün) — rate-limited, cost warnings
- **Phase 4.7 — Build validation + syntax guard** (1 gün) — adk build proxy, backtick escape checker
- **Phase 4.8 — Anti-bloat auto-apply actions** (2 gün) — "Öneriyi uygula" → otomatik section merge/delete staging'e düşer

**Toplam:** ~2 hafta Prompt Lab alt-modülü için. Phase 4'ün genel 2 haftalık bütçesi ile üst üste; paralel çalışılabilir.

---

## Ek A — Komut palette komut listesi

```
NAVIGATION
  → Go to Dashboard                         ⌘1
  → Go to Catalog Tree                      ⌘2
  → Go to Heatmap                           ⌘3
  → Go to FAQ Manager                       ⌘4
  → Go to Relations                         ⌘5
  → Go to Bulk                              ⌘6
  → Go to Prompt Lab                        ⌘P
  → Go to Instruction Editor (active agent) ⌘⇧P
  → Go to Tool Registry                     ⌘⇧T
  → Go to Prompt Playground                 ⌘⇧G
  → Go to Staging                           ⌘J
  → Go to Commit workflow                   ⌘⇧↵

PROMPT / AGENT
  🤖 Switch agent (detailagent-ms / detailagent / …)
  🤖 Compile system prompt (current agent)
  🤖 Simulate query (mock)
  🤖 Simulate query (live Gemini, with cost warning)
  🤖 Compare two prompt versions
  🤖 Rollback to commit …
  🤖 Apply bloat recommendation — merge PROACTIVE+RELEVANCE
  🤖 Apply bloat recommendation — trim version tags
  🤖 Lock/unlock section (runtime contract)
  🤖 Check syntax (backtick escape validator)
  🤖 Sync mutual-exclusion (searchByRating ↔ searchProducts)

DATA TRANSFORMATIONS
  ⚙ Normalize numeric fields
  ⚙ Merge duplicate spec keys
  ⚙ Add required key to template_group
  ⚙ Coerce type (string → number)
  ⚙ Extract ph_tolerance "2-11" → ph_min/ph_max
  ⚙ Parse hardness "9H" → hardness_value (integer 9)

BULK ACTIONS
  ⚡ Select ceramic_coating with null silicone_free
  ⚡ Add FAQ template to all GYEON paint_coating
  ⚡ Assign primary_use_case to sub_type_group
  ⚡ Re-embed products with stale search_text

EXPORT / IMPORT
  📤 Export products CSV
  📤 Export FAQs JSONL
  📤 Export coverage heatmap PNG
  📥 Import CSV (staging)

VIEW
  👁 Preview bot response for this product
  👁 Open preview carousel (variant collapse test)

STAGING
  ↩ Undo last change                        ⌘Z
  ↪ Redo                                    ⌘⇧Z
  ⚠ Discard all staged changes
  ✓ Commit all staged changes

HELP
  ? Keyboard shortcuts                      ⌘/
  📖 Open documentation
```

---

## Ek B — CSS variable reference (özet)

```css
/* Tailwind v4 @theme directive */
@theme {
  --color-bg-base: #FAF6ED;
  --color-bg-elevated: #FDFAF3;
  --color-bg-sunken: #F3EDE0;
  --color-text-primary: #2A1F17;
  --color-text-secondary: #6B5A4E;
  --color-text-muted: #A8998B;
  --color-accent: #C65D3F;
  --color-accent-hover: #9B3F2B;
  --color-secondary: #7A8B56;
  --color-warning: #D4953E;
  --color-danger: #B8543C;

  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  --shadow-sm: 0 1px 2px rgba(74,58,46,0.04), 0 1px 1px rgba(74,58,46,0.03);
  --shadow-md: 0 4px 8px rgba(74,58,46,0.06), 0 2px 4px rgba(74,58,46,0.04);
  --shadow-lg: 0 12px 24px rgba(74,58,46,0.08), 0 6px 12px rgba(74,58,46,0.05);

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Kapanış

Bu doküman ile başka bir oturumda geliştirme yapılırken:
1. `§3` design tokens CSS variable olarak `globals.css`'e kopyalanır
2. `§4` typography Tailwind theme'e + Google Fonts yüklenir
3. `§5` bilgi mimarisi Next.js App Router klasör yapısına dönüşür
4. `§6` wireframes component'lere dağıtılır, `§8`'de her component için prop contract belirli
5. `§10` admin API endpoint'leri retrieval-service'e eklenir (Hono router'a yeni `/admin/*` grupları)
6. `§14` implementation phases sırasıyla takip edilir; her phase sonunda `§15`'ten ilgili test senaryoları geçilir

Sıcak palette + editorial typography + heatmap-first navigation + keyboard-first UX birleşimi, hem veri teknisyeni için verimli hem göze estetik. SaaS generic'liğinden uzak, MTS Kimya kataloğunun karakteriyle uyumlu bir atölye hissi.

**Toplam satır:** ~1.450 · **14 ana bölüm · 2 ek** · self-contained.
