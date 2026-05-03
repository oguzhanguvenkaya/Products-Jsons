// Starter synonym dictionary for Turkish detailing domain.
// Query-time: "cila" → {cila, polisaj, pasta, polish, compound} for both BM25 expansion and embedding input.

import { sql } from '../src/lib/db.ts';

type SynonymEntry = { term: string; aliases: string[]; category: string };

const SYNONYMS: SynonymEntry[] = [
  // pasta cila terminolojisi
  { term: 'cila', aliases: ['polisaj', 'pasta', 'polish', 'compound'], category: 'abrasive_polish' },
  { term: 'polisaj', aliases: ['cila', 'pasta', 'polish'], category: 'abrasive_polish' },
  { term: 'pasta', aliases: ['cila', 'polisaj', 'compound'], category: 'abrasive_polish' },
  { term: 'compound', aliases: ['kalın pasta', 'heavy cut', 'ağır çizik giderici'], category: 'abrasive_polish' },
  { term: 'finish pasta', aliases: ['ince pasta', 'finishing polish', 'parlatıcı pasta'], category: 'abrasive_polish' },

  // seramik / kaplama
  { term: 'seramik', aliases: ['coating', 'kaplama', 'nano kaplama', 'ceramic'], category: 'ceramic_coating' },
  { term: 'kaplama', aliases: ['seramik', 'coating', 'ceramic'], category: 'ceramic_coating' },
  { term: 'nano', aliases: ['seramik', 'coating', 'kaplama'], category: 'ceramic_coating' },

  // yıkama / şampuan
  { term: 'şampuan', aliases: ['sampuan', 'sampuanı', 'yıkama', 'wash', 'shampoo'], category: 'car_shampoo' },
  { term: 'ph nötr', aliases: ['ph neutral', 'nötr şampuan', 'hassas şampuan'], category: 'car_shampoo' },
  { term: 'foam', aliases: ['köpük', 'kopuk', 'ön yıkama', 'prewash'], category: 'car_shampoo' },
  { term: 'köpük', aliases: ['foam', 'kopuk', 'ön yıkama'], category: 'car_shampoo' },

  // koku
  { term: 'koku giderici', aliases: ['odor remover', 'deodorizer', 'kokugiderici', 'koku'], category: 'fragrance' },
  { term: 'parfüm', aliases: ['parfum', 'fragrance', 'koku', 'esans'], category: 'fragrance' },

  // kirlilik / leke
  { term: 'su lekesi', aliases: ['water spot', 'kireç lekesi', 'kirec lekesi', 'mineral leke', 'mineral birikintisi'], category: 'contaminant_solvers' },
  { term: 'kuş pisliği', aliases: ['kus pisligi', 'kuş dışkısı', 'bird dropping'], category: 'contaminant_solvers' },
  { term: 'katran', aliases: ['tar', 'zift'], category: 'contaminant_solvers' },
  { term: 'demir tozu', aliases: ['iron out', 'fallout remover', 'iron remover'], category: 'contaminant_solvers' },

  // cam
  { term: 'cam temizleyici', aliases: ['glass cleaner', 'cam silici', 'cam'], category: 'glass_cleaner' },
  { term: 'cam kaplama', aliases: ['glass coating', 'rain repellent', 'yağmur kovucu', 'yagmur kovucu'], category: 'glass_cleaner_protectant' },

  // iç mekan
  { term: 'deri bakım', aliases: ['deri bakim', 'leather care', 'leather conditioner', 'deri'], category: 'interior_cleaner' },
  { term: 'kumaş koltuk', aliases: ['kumas koltuk', 'fabric seat', 'fabric', 'textile'], category: 'interior_cleaner' },
  { term: 'iç temizleyici', aliases: ['ic temizleyici', 'interior cleaner', 'ic bakim', 'iç bakım'], category: 'interior_cleaner' },
  { term: 'plastik bakım', aliases: ['plastik bakim', 'plastic dressing', 'interior detailer'], category: 'interior_cleaner' },

  // mikrofiber / aksesuar
  { term: 'mikrofiber', aliases: ['microfiber', 'mikro fiber', 'havlu', 'towel'], category: 'microfiber' },
  { term: 'aplikatör', aliases: ['aplikator', 'applicator', 'uygulama pedi'], category: 'applicators' },

  // ped / pasta aksesuarı
  { term: 'ped', aliases: ['pad', 'keçe', 'kece', 'foam pad'], category: 'polishing_pad' },
  { term: 'sert ped', aliases: ['heavy cut pad', 'kalın ped', 'sari ped', 'sarı ped'], category: 'polishing_pad' },
  { term: 'yumuşak ped', aliases: ['yumusak ped', 'finish pad', 'siyah ped', 'beyaz ped'], category: 'polishing_pad' },

  // makine
  { term: 'orbital', aliases: ['eksantrik', 'eccentric', 'rastgele hareketli', 'DA'], category: 'polisher_machine' },
  { term: 'rotary', aliases: ['döner', 'rotatif'], category: 'polisher_machine' },

  // maskeleme / ppf
  { term: 'maskeleme', aliases: ['masking', 'masking tape', 'koruma bandı', 'bant'], category: 'masking_tapes' },
  { term: 'ppf', aliases: ['paint protection film', 'boya koruma filmi', 'koruma filmi'], category: 'ppf_tools' },

  // lastik / jant
  { term: 'lastik parlatıcı', aliases: ['lastik parlatici', 'tire shine', 'tire dressing'], category: 'tire_care' },
  { term: 'jant', aliases: ['wheel', 'wheel cleaner', 'jant temizleyici'], category: 'brushes' },

  // genel
  { term: 'mat', aliases: ['matte', 'satin'], category: 'ceramic_coating' },
  { term: 'parlak', aliases: ['glossy', 'gloss', 'parlaklik'], category: 'ceramic_coating' },
];

async function main() {
  console.log(`[seed-synonyms] upserting ${SYNONYMS.length} terms...`);
  for (const entry of SYNONYMS) {
    await sql`
      INSERT INTO synonyms (term, aliases, category)
      VALUES (${entry.term}, ${entry.aliases}, ${entry.category})
      ON CONFLICT (term) DO UPDATE SET
        aliases = EXCLUDED.aliases,
        category = EXCLUDED.category
    `;
  }
  console.log('[seed-synonyms] DONE');
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
