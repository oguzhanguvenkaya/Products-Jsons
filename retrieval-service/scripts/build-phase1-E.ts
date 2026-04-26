// Faz 1 — Aile E: Consumption (DÜZELTİLDİ — motorcycle key UYDURMASI kaldırıldı)
// Canonical: consumption_per_car_ml (number)
// Defaults seed (üretici verisi yoksa):
//   ceramic_coating: 25 ml/oto
//   tire_dressing/tire_gel: 10 ml/oto
//   Q2-FCNA400M (fabric_coating): 150 ml/oto (kullanıcı kararı)
// Motosiklet kuralı: BOT INSTRUCTION'a girer (15 ml/moto), per-product key DEĞİL
// Drop: consumption_ml_per_cabin (Q2-LSE50M için), coverage_ml_per_sqm, recommended_bucket_ml, recommended_foam_cannon_ratio
import { sql } from '../src/lib/db.ts';
import { writeFileSync } from 'fs';
import { makeDropChange, makeSetChange, type Change } from './build-phase1-helper.ts';

const rows = await sql<any[]>`
  SELECT sku, template_group, template_sub_type,
    specs ? 'consumption_ml_per_car' AS h_old_car, specs->>'consumption_ml_per_car' AS old_car,
    specs ? 'consumption_per_car_ml' AS h_new_car, specs->>'consumption_per_car_ml' AS new_car,
    specs ? 'consumption_ml_per_cabin' AS h_cabin, specs->>'consumption_ml_per_cabin' AS cabin,
    specs ? 'coverage_ml_per_sqm' AS h_sqm, specs->>'coverage_ml_per_sqm' AS sqm,
    specs ? 'recommended_bucket_ml' AS h_bucket, specs->>'recommended_bucket_ml' AS bucket,
    specs ? 'recommended_foam_cannon_ratio' AS h_foam, specs->>'recommended_foam_cannon_ratio' AS foam
  FROM products
  WHERE specs ?| array['consumption_ml_per_car','consumption_per_car_ml','consumption_ml_per_cabin','coverage_ml_per_sqm','recommended_bucket_ml','recommended_foam_cannon_ratio']
     OR template_group = 'ceramic_coating'
     OR template_sub_type IN ('tire_dressing','tire_gel')
  ORDER BY sku
`;
console.log(`✓ DB'den ${rows.length} ürün`);

const fnum = (v: any) => v !== null && !isNaN(parseFloat(v)) ? parseFloat(v) : null;
const changes: Change[] = [];

for (const r of rows) {
  // === consumption_per_car_ml set (rename + defaults) ===
  let perCar: number|null = null, src = '';

  if (fnum(r.old_car) !== null) {
    perCar = Math.round(fnum(r.old_car)!);
    src = 'rename consumption_ml_per_car';
  } else if (r.sku === 'Q2-FCNA400M') {
    perCar = 150;
    src = 'kullanıcı kararı (fabric_coating)';
  } else if (r.template_group === 'ceramic_coating') {
    perCar = 25;
    src = 'default 25 (seramik global kural)';
  } else if (r.template_sub_type === 'tire_dressing' || r.template_sub_type === 'tire_gel') {
    perCar = 10;
    src = 'default 10 (lastik dressing)';
  }

  // Q2-LSE50M (leather_coating) için consumption yazma — kullanıcı: "saçma olur"
  if (r.sku === 'Q2-LSE50M') perCar = null;

  if (perCar !== null && (!r.h_new_car || fnum(r.new_car) !== perCar)) {
    changes.push(makeSetChange('E', r.sku, 'consumption_per_car_ml', fnum(r.new_car), perCar,
      `Phase 1E: consumption_per_car_ml=${perCar} (${src})`));
  }

  // === motorcycle key YOK — kullanıcı kararı: BOT INSTRUCTION'a global kural (15 ml/moto) ===

  // === Drops ===
  if (r.h_old_car) changes.push(makeDropChange('E', r.sku, 'consumption_ml_per_car', fnum(r.old_car),
    `Phase 1E: alias drop (canonical consumption_per_car_ml)`));
  if (r.h_cabin) changes.push(makeDropChange('E', r.sku, 'consumption_ml_per_cabin', fnum(r.cabin),
    `Phase 1E: drop consumption_ml_per_cabin (kullanıcı: saçma olur)`));
  if (r.h_sqm) changes.push(makeDropChange('E', r.sku, 'coverage_ml_per_sqm', fnum(r.sqm),
    `Phase 1E: drop coverage_ml_per_sqm`));
  if (r.h_bucket) changes.push(makeDropChange('E', r.sku, 'recommended_bucket_ml', r.bucket,
    `Phase 1E: drop recommended_bucket_ml (8 ürün hepsi BOŞ)`));
  if (r.h_foam) changes.push(makeDropChange('E', r.sku, 'recommended_foam_cannon_ratio', r.foam,
    `Phase 1E: drop recommended_foam_cannon_ratio (8 ürün hepsi BOŞ)`));
}

writeFileSync('../data/consolidation/phase1-E-consumption-payload.json', JSON.stringify({
  total_changes: changes.length, batch_count: 1, batches: [{ changes }],
}, null, 2));
console.log(`✓ ${changes.length} change`);
process.exit(0);
