// Phase 19 — kullanıcı feedback düzeltmeleri (post-Phase 18 audit)
import { writeFileSync } from 'fs';

type Change = { id: string; scope: string; sku: string; field: string; before: unknown; after: unknown; label: string; };
const changes: Change[] = [];

// === MADDE 1: NPMW6555 → wool_pad ===
changes.push({
  id: 'phase19-NPMW6555-sub-wool_pad', scope: 'product', sku: 'NPMW6555',
  field: 'template_sub_type', before: 'microfiber_pad', after: 'wool_pad',
  label: 'Phase 19: NPMW6555 keçe → wool_pad (microfiber DEĞİL)',
});

// === MADDE 2: industrial metal_polish → solid_compound + surface[] + purpose ===
const solidCompounds: { sku: string; purpose: string; surface: string[] }[] = [
  { sku: '06008.056.001', purpose: 'heavy_cut', surface: ['brass','zamak','aluminum'] },
  { sku: '07001.056.001', purpose: 'heavy_cut', surface: ['stainless_steel','aluminum','brass'] },
  { sku: '12001.056.001', purpose: 'heavy_cut', surface: ['plastic','composite','painted_surface'] },
  { sku: '07945.056.001', purpose: 'medium_cut', surface: ['multi_purpose'] },
  { sku: '07163.056.001', purpose: 'medium_cut', surface: ['aluminum','brass','stainless_steel'] },
  { sku: '07008.056.001', purpose: 'finish', surface: ['brass','chrome','zamak','aluminum','composite'] },
  { sku: '12002.056.001', purpose: 'finish', surface: ['plastic','composite','painted_surface'] },
  { sku: '07201.056.001', purpose: 'finish', surface: ['stainless_steel','precious_metals'] },
  { sku: '07006.056.001', purpose: 'finish', surface: ['plastic','composite','precious_metals','painted_surface'] },
  { sku: '07933.056.001', purpose: 'super_finish', surface: ['precious_metals','stainless_steel','painted_surface'] },
  { sku: '07984.056.001', purpose: 'super_finish', surface: ['multi_purpose'] },
];
for (const c of solidCompounds) {
  changes.push({
    id: `phase19-${c.sku}-sub-solid_compound`, scope: 'product', sku: c.sku,
    field: 'template_sub_type', before: 'metal_polish', after: 'solid_compound',
    label: `Phase 19: ${c.sku} metal_polish → solid_compound`,
  });
  changes.push({
    id: `phase19-${c.sku}-purpose-set`, scope: 'product.specs', sku: c.sku,
    field: 'specs.purpose', before: null, after: c.purpose,
    label: `Phase 19: purpose=${c.purpose}`,
  });
  changes.push({
    id: `phase19-${c.sku}-surface-set`, scope: 'product.specs', sku: c.sku,
    field: 'specs.surface', before: null, after: c.surface,
    label: `Phase 19: surface=[${c.surface.join(',')}]`,
  });
}

// === MADDE 3: accessory → air_equipment (5 ürün) ===
const accessorySkus = ['SGGC086','SGGS003','SGYC010','SGYC011','SGGC055'];
for (const sku of accessorySkus) {
  changes.push({
    id: `phase19-${sku}-tg-air_equipment`, scope: 'product', sku,
    field: 'template_group', before: 'accessory', after: 'air_equipment',
    label: `Phase 19: ${sku} accessory → air_equipment`,
  });
}

// === MADDE 4: repair_part → tornador_part (2 ürün) ===
for (const sku of ['SGYC010','SGYC011']) {
  changes.push({
    id: `phase19-${sku}-sub-tornador_part`, scope: 'product', sku,
    field: 'template_sub_type', before: 'repair_part', after: 'tornador_part',
    label: `Phase 19: ${sku} repair_part → tornador_part`,
  });
}

// === MADDE 5: marin/interior_detailer rename ===
const marinInterior: { sku: string; after: string }[] = [
  { sku: '701283', after: 'marine_general_cleaner' },     // WC KEM (alkol/sanitizer)
  { sku: '75112', after: 'marine_general_cleaner' },      // Fiocco (alkol bazlı)
  { sku: '75132', after: 'marine_wood_care' },             // Dory (Tik+parke temizleyici)
  { sku: '77192', after: 'marine_wood_care' },             // X-Wood (ahşap koruyucu)
];
for (const c of marinInterior) {
  changes.push({
    id: `phase19-${c.sku}-sub-${c.after}`, scope: 'product', sku: c.sku,
    field: 'template_sub_type', before: 'interior_detailer', after: c.after,
    label: `Phase 19: ${c.sku} interior_detailer → ${c.after}`,
  });
}

// === MADDE 6: marin/Tritone + Reef + Menzerna ===
const marinReclassify: { sku: string; before: string; after: string }[] = [
  { sku: '75131', before: 'iron_remover', after: 'marine_surface_cleaner' },     // Tritone yağ+plastik+fiber
  { sku: '75130', before: 'water_spot_remover', after: 'marine_metal_cleaner' }, // Reef pas+kireç+metal
  { sku: '24011.261.080', before: 'one_step_polish', after: 'marine_polish' },   // Menzerna Gelcoat
];
for (const c of marinReclassify) {
  changes.push({
    id: `phase19-${c.sku}-sub-${c.after}`, scope: 'product', sku: c.sku,
    field: 'template_sub_type', before: c.before, after: c.after,
    label: `Phase 19: ${c.sku} ${c.before} → ${c.after}`,
  });
}

writeFileSync('../data/consolidation/phase19-payload.json', JSON.stringify({
  total_changes: changes.length, batch_count: 1, batches: [{ changes }],
}, null, 2));

console.log(`✓ Phase 19 payload: ${changes.length} change`);
console.log(`Breakdown:`);
const byField: Record<string, number> = {};
for (const c of changes) { byField[c.field] = (byField[c.field] || 0) + 1; }
for (const [k, v] of Object.entries(byField)) console.log(`  ${k}: ${v}`);
process.exit(0);
