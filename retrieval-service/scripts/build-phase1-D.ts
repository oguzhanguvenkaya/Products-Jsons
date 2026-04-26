// Faz 1 — Aile D: Dilution NESTED OBJECT (kullanıcı son kararı)
// Kural:
//   1) Spesifik (kova/foam_lance/pump/manual) HİÇ yoksa ve sadece genel (dilution_ratio veya dilution) varsa
//      → 5 alt-key'in HEPSİNİ aynı değerle doldur (ratio, bucket, foam_lance, pump_sprayer, manual)
//   2) Spesifik key VARSA → sadece var olanları doldur, diğerlerini boş bırak (uydurma yok)
//      Genel dilution_ratio da varsa dilution.ratio'da tut
import { sql } from '../src/lib/db.ts';
import { writeFileSync } from 'fs';
import { makeDropChange, makeSetChange, type Change } from './build-phase1-helper.ts';

const rows = await sql<any[]>`
  SELECT sku,
    specs ? 'dilution' AS h_dil, specs->>'dilution' AS dil,
    specs ? 'dilution_ratio' AS h_ratio, specs->>'dilution_ratio' AS ratio,
    specs ? 'dilution_scale' AS h_scale, specs->>'dilution_scale' AS scale,
    specs ? 'dilution_foam_lance' AS h_fl, specs->>'dilution_foam_lance' AS fl,
    specs ? 'dilution_kova' AS h_kova, specs->>'dilution_kova' AS kova,
    specs ? 'dilution_pump' AS h_pump, specs->>'dilution_pump' AS pump,
    specs ? 'dilution_manual' AS h_manual, specs->>'dilution_manual' AS manual,
    specs ? 'dilution_steps_ml' AS h_steps, specs->>'dilution_steps_ml' AS steps
  FROM products
  WHERE specs ?| array['dilution','dilution_ratio','dilution_scale','dilution_foam_lance','dilution_kova','dilution_pump','dilution_manual','dilution_steps_ml']
  ORDER BY sku
`;
console.log(`✓ DB'den ${rows.length} ürün`);

const changes: Change[] = [];

for (const r of rows) {
  // Spesifik değerler (yöntem belirtilmiş)
  const specifics: Record<string, string|null> = {
    bucket: r.kova || null,
    foam_lance: r.fl || null,
    pump_sprayer: r.pump || null,
    manual: r.manual || null,
  };
  const specificCount = Object.values(specifics).filter(v => v !== null).length;

  // Genel değer (yöntem belirtilmemiş)
  let general = r.ratio || r.dil || null;

  // Özel vaka: dilution_ratio JSON object string ise parse et (700888 gibi)
  if (general && typeof general === 'string' && general.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(general);
      if (parsed && typeof parsed === 'object') {
        // JSON içindeki key'leri specifics'e dağıt
        if (parsed.manual && !specifics.manual) specifics.manual = String(parsed.manual);
        if (parsed.bucket && !specifics.bucket) specifics.bucket = String(parsed.bucket);
        if (parsed.foam_lance && !specifics.foam_lance) specifics.foam_lance = String(parsed.foam_lance);
        if (parsed.pump_sprayer && !specifics.pump_sprayer) specifics.pump_sprayer = String(parsed.pump_sprayer);
        // automatic, ratio gibi anahtarları drop et (bizim canonical değil)
        general = null; // genel değer artık kullanılmaz, parse edildi
      }
    } catch { /* parse fail, string olarak kalsın */ }
  }
  const specificCount2 = Object.values(specifics).filter(v => v !== null).length;

  let nested: Record<string, string> | null = null;

  if (specificCount2 === 0 && general) {
    // Kural 1: SADECE genel değer var, 5 alt-key'in hepsini aynı değerle doldur
    nested = {
      ratio: general,
      bucket: general,
      foam_lance: general,
      pump_sprayer: general,
      manual: general,
    };
  } else if (specificCount2 > 0) {
    // Kural 2: Spesifik değerler var, sadece var olanları doldur (uydurma yok)
    nested = {};
    if (general) nested.ratio = general;
    if (specifics.bucket) nested.bucket = specifics.bucket;
    if (specifics.foam_lance) nested.foam_lance = specifics.foam_lance;
    if (specifics.pump_sprayer) nested.pump_sprayer = specifics.pump_sprayer;
    if (specifics.manual) nested.manual = specifics.manual;
  }
  // specificCount === 0 && general === null → hiç değer yok, hiçbir şey yazma

  if (nested && Object.keys(nested).length > 0) {
    const keysList = Object.keys(nested).join(',');
    const labelMode = specificCount2 === 0 ? 'tek değer fallback (hepsi=' + general + ')' : `spesifik+genel (${keysList})`;
    changes.push(makeSetChange('D', r.sku, 'dilution', null, nested,
      `Phase 1D: nested {${keysList}} — ${labelMode}`));
  }

  // Drop legacy keyler
  if (r.h_ratio) changes.push(makeDropChange('D', r.sku, 'dilution_ratio', r.ratio, `Phase 1D: alias drop`));
  if (r.h_scale) changes.push(makeDropChange('D', r.sku, 'dilution_scale', r.scale, `Phase 1D: alias drop`));
  if (r.h_kova) changes.push(makeDropChange('D', r.sku, 'dilution_kova', r.kova, `Phase 1D: kova→dilution.bucket migrate, drop`));
  if (r.h_fl) changes.push(makeDropChange('D', r.sku, 'dilution_foam_lance', r.fl, `Phase 1D: foam_lance→dilution.foam_lance, drop`));
  if (r.h_pump) changes.push(makeDropChange('D', r.sku, 'dilution_pump', r.pump, `Phase 1D: pump→dilution.pump_sprayer, drop`));
  if (r.h_manual) changes.push(makeDropChange('D', r.sku, 'dilution_manual', r.manual, `Phase 1D: manual→dilution.manual, drop`));
  if (r.h_steps) changes.push(makeDropChange('D', r.sku, 'dilution_steps_ml', r.steps, `Phase 1D: dilution_steps_ml drop (kullanıcı: uydurma yok)`));
}

writeFileSync('../data/consolidation/phase1-D-dilution-payload.json', JSON.stringify({
  total_changes: changes.length, batch_count: 1, batches: [{ changes }],
}, null, 2));
console.log(`✓ ${changes.length} change`);

// Sample
console.log(`\n=== Sample SKU before/after ===`);
for (const sku of ['70616', '701003', '70942', '700888', '71132', 'Q2M-FYA4000M']) {
  const skuChanges = changes.filter(c => c.sku === sku);
  if (!skuChanges.length) continue;
  console.log(`\n${sku}:`);
  for (const c of skuChanges) console.log(`  [${c.field}] ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`);
}
process.exit(0);
