// Phase 1.1.11 Spot-Fix Script
//
// 1. Şema normalize (proposed→value, source→evidence, old/new_value→current/proposed)
// 2. Manuel override uygula (kullanıcının verdiği 17 SKU/key)
// 3. target_surface → target_surfaces transfer (kullanıcı kararı REV2)
// 4. data_gap → category_mismatch (rating_* hariç — otomatik kaldırma)
// 5. Q2-CCE200M kullanıcı manuel düzeltmesini KORU (overwrite etme)
//
// Backup: scripts/audit/proposals.bak/ (rollback için)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const PROPOSALS_DIR = 'scripts/audit/proposals';
const INPUTS_DIR = 'scripts/audit/inputs';

const SKIP_OVERWRITE = new Set(['Q2-CCE200M']);

const OVERRIDES: Record<string, Record<string, any>> = {
  '22070.261.001': { consumption_per_car_ml: 30 },
  '22870.261.001': { consumption_per_car_ml: 30 },
  '26919.271.001': { consumption_per_car_ml: 50 },
  '74059': { consumption_per_car_ml: 15 },
  '74062': { scent: 'vişne', volume_ml: 1000, durability_months: 1 },
  '75016': { volume_ml: 750 },
  '75182': { consumption_per_car_ml: 60, durability_months: 1, application_method: 'Sık sil' },
  '79301': { durability_months: 1 },
  'MXP-DPCN50KS': { ph_tolerance: '3-12' },
  'Q2-W175G': { application_method: 'wax applicator' },
  'Q2-AF120M': { application_method: 'wax applicator' },
};

const RATING_KEYS = new Set(['rating_beading', 'rating_durability', 'rating_self_cleaning']);

function normalizeFill(item: any) {
  return {
    key: item.key,
    value: item.value !== undefined ? item.value : item.proposed,
    evidence: item.evidence ?? item.source ?? '',
    confidence: item.confidence ?? 'high',
  };
}

function normalizeUpdate(item: any) {
  return {
    key: item.key,
    current: item.current !== undefined ? item.current : item.old_value,
    proposed: item.proposed !== undefined ? item.proposed : item.new_value,
    evidence: item.evidence ?? item.source ?? '',
    confidence: item.confidence ?? 'high',
  };
}

function normalizeSkip(item: any) {
  return {
    key: item.key,
    current: item.current,
    evidence: item.evidence ?? item.source ?? '',
  };
}

function normalizeDataGap(item: any) {
  return { key: item.key, reason: item.reason ?? '' };
}

function normalizeCatMismatch(item: any) {
  return { key: item.key, reason: item.reason ?? '' };
}

function removeKeyFromAll(p: any, key: string) {
  p.proposed_changes.fill = p.proposed_changes.fill.filter((x: any) => x.key !== key);
  p.proposed_changes.update = p.proposed_changes.update.filter((x: any) => x.key !== key);
  p.proposed_changes.skip = p.proposed_changes.skip.filter((x: any) => x.key !== key);
  p.proposed_changes.data_gap = p.proposed_changes.data_gap.filter((x: any) => x.key !== key);
  p.proposed_changes.category_mismatch = p.proposed_changes.category_mismatch.filter((x: any) => x.key !== key);
}

const files = readdirSync(PROPOSALS_DIR).filter((f) => f.endsWith('.json')).sort();
const stats = { schemaFixed: 0, overridesApplied: 0, surfaceTransferred: 0, dataGapToRemove: 0, ratingKept: 0, skipped: 0, processed: 0 };

for (const f of files) {
  const sku = f.replace('.json', '');
  const path = `${PROPOSALS_DIR}/${f}`;
  const p = JSON.parse(readFileSync(path, 'utf-8'));
  const input = JSON.parse(readFileSync(`${INPUTS_DIR}/${sku}.json`, 'utf-8'));

  if (SKIP_OVERWRITE.has(sku)) {
    console.log(`⊘ ${sku} — kullanıcı manuel düzeltmesi korunuyor (skip overwrite)`);
    stats.skipped++;
    continue;
  }

  // Adım 1: Schema normalize
  const before = JSON.stringify(p.proposed_changes);
  p.proposed_changes.fill = (p.proposed_changes.fill ?? []).map(normalizeFill);
  p.proposed_changes.update = (p.proposed_changes.update ?? []).map(normalizeUpdate);
  p.proposed_changes.skip = (p.proposed_changes.skip ?? []).map(normalizeSkip);
  p.proposed_changes.data_gap = (p.proposed_changes.data_gap ?? []).map(normalizeDataGap);
  p.proposed_changes.category_mismatch = (p.proposed_changes.category_mismatch ?? []).map(normalizeCatMismatch);
  if (JSON.stringify(p.proposed_changes) !== before) stats.schemaFixed++;

  // Adım 2: Manuel override
  const overrides = OVERRIDES[sku];
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      removeKeyFromAll(p, key);
      p.proposed_changes.fill.push({
        key,
        value,
        evidence: 'Manual override - kullanıcı kararı (Phase 1.1.11 REV2)',
        confidence: 'manual_override',
      });
      stats.overridesApplied++;
    }
  }

  // Adım 3: target_surface → target_surfaces transfer
  // 3a) fill'de target_surface varsa → target_surfaces'a taşı (input'ta target_surfaces canonical mı bak)
  const tsFill = p.proposed_changes.fill.find((x: any) => x.key === 'target_surface');
  if (tsFill) {
    p.proposed_changes.fill = p.proposed_changes.fill.filter((x: any) => x.key !== 'target_surface');
    // Eğer target_surfaces zaten fill listesinde varsa, value'ları birleştir
    const existingTs = p.proposed_changes.fill.find((x: any) => x.key === 'target_surfaces');
    if (!existingTs) {
      p.proposed_changes.fill.push({
        key: 'target_surfaces',
        value: tsFill.value,
        evidence: tsFill.evidence + ' (transferred from target_surface — kullanıcı kararı REV2: tek key target_surfaces)',
        confidence: tsFill.confidence,
      });
    }
    stats.surfaceTransferred++;
  }

  // 3b) target_surfaces category_mismatch'ten çıkar (artık aktif)
  p.proposed_changes.category_mismatch = p.proposed_changes.category_mismatch.filter((x: any) => x.key !== 'target_surfaces');

  // 3c) target_surface'ı category_mismatch'e ekle (deprecated, DB'den sil) — sadece input canonical_keys'te ise
  if (input.canonical_keys.includes('target_surface')) {
    if (!p.proposed_changes.category_mismatch.find((x: any) => x.key === 'target_surface')) {
      p.proposed_changes.category_mismatch.push({
        key: 'target_surface',
        reason: 'Deprecated — target_surfaces tek key olarak kullanılıyor (kullanıcı kararı REV2). DB\'den SİL.',
      });
    }
  }

  // Adım 4: data_gap → category_mismatch (rating_* hariç)
  const newDataGap: any[] = [];
  const transferredFromGap: any[] = [];
  for (const d of p.proposed_changes.data_gap) {
    if (RATING_KEYS.has(d.key)) {
      newDataGap.push(d);
      stats.ratingKept++;
    } else {
      transferredFromGap.push({
        key: d.key,
        reason: `Otomatik kaldırma — kullanıcı manuel değer vermedi, kaynaklarda yok. Original: ${d.reason?.slice(0, 80)}`,
      });
      stats.dataGapToRemove++;
    }
  }
  p.proposed_changes.data_gap = newDataGap;
  p.proposed_changes.category_mismatch.push(...transferredFromGap);

  // Notes ekle
  p.notes = (p.notes ? p.notes + ' | ' : '') + 'REV2 spot-fix: schema normalize, manuel override, target_surface→target_surfaces, data_gap→category_mismatch (rating_* hariç)';

  writeFileSync(path, JSON.stringify(p, null, 2));
  stats.processed++;
}

console.log(`\n=== Spot-Fix Tamamlandı ===`);
console.log(`Toplam dosya: ${files.length}`);
console.log(`İşlenen: ${stats.processed}, Atlanan (Q2-CCE200M): ${stats.skipped}`);
console.log(`Schema normalize: ${stats.schemaFixed} dosyada değişiklik`);
console.log(`Manuel override uygulandı: ${stats.overridesApplied} key`);
console.log(`target_surface → target_surfaces transferred: ${stats.surfaceTransferred} ürün`);
console.log(`data_gap → category_mismatch: ${stats.dataGapToRemove} key (otomatik kaldırma)`);
console.log(`rating_* data_gap'te korundu: ${stats.ratingKept} key`);
process.exit(0);
