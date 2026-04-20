/**
 * Verify GYEON data sync status in Cloud across 4 phases.
 *
 * Checks:
 *   3a — spec corrections (FabriCoat pH, PPF durability, Bathe+ pH, Prep consumption)
 *   3b — HYBRID HTU content (LeatherShield 6h cure, OdorRemover Pads backing)
 *   3c — FAQ count: expect ~799 GYEON rows
 *   3d — ratings in specs_object for 3 sample SKUs
 *
 * Output: concise report printed to console.
 */
import { client } from '@botpress/runtime';

type Row = Record<string, unknown>;

async function getSpecs(sku: string): Promise<Row | null> {
  const res = await client.findTableRows({
    table: 'productSpecsTable',
    filter: { sku: { $eq: sku } } as any,
    limit: 1,
  });
  return res.rows[0] ?? null;
}

async function getContent(sku: string): Promise<Row | null> {
  const res = await client.findTableRows({
    table: 'productContentTable',
    filter: { sku: { $eq: sku } } as any,
    limit: 1,
  });
  return res.rows[0] ?? null;
}

function parseSpecs(row: Row | null): any {
  if (!row) return null;
  const raw = row.specs_object;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

function check(label: string, actual: unknown, expected: unknown, match?: (a: any) => boolean): 'PASS' | 'FAIL' {
  const ok = match ? match(actual) : actual === expected;
  const status = ok ? 'PASS' : 'FAIL';
  const showActual = typeof actual === 'string' && actual.length > 80 ? actual.slice(0, 80) + '...' : JSON.stringify(actual);
  console.log(`  [${status}] ${label} | expected=${JSON.stringify(expected)} actual=${showActual}`);
  return status;
}

async function main() {
  console.log('🔍 GYEON Cloud Sync Verify\n');
  const results: Record<string, string[]> = { '3a': [], '3b': [], '3c': [], '3d': [] };

  // === 3a — SPEC CORRECTIONS ===
  console.log('── Faz 3a: Spec düzeltme ──');
  const fabri = parseSpecs(await getSpecs('Q2-FCNA400M'));
  const ppf = parseSpecs(await getSpecs('Q2-PPFE50M'));
  const bathePlus = parseSpecs(await getSpecs('Q2M-BPYA1000M'));
  const prep = parseSpecs(await getSpecs('Q2M-PYA4000M'));
  const mohs = parseSpecs(await getSpecs('Q2-MLE100M'));

  results['3a'].push(check('FabriCoat pH range', fabri?.ph || fabri?.pH_range || fabri?.ph_range, '4-9',
    (a) => typeof a === 'string' && /4.*9|4-9/.test(a)));
  results['3a'].push(check('PPF EVO durability_km', ppf?.durability_km || ppf?.durabilityKm, 25000,
    (a) => a === 25000 || a === '25000' || String(a).includes('25000')));
  results['3a'].push(check('Bathe+ pH', bathePlus?.ph || bathePlus?.pH || bathePlus?.ph_level, 6,
    (a) => a === 6 || a === '6' || String(a) === '6'));
  results['3a'].push(check('Prep consumption_ml_car', prep?.consumption_ml || prep?.consumption_ml_car || prep?.consumption, 150,
    (a) => a === 150 || a === '150' || String(a).includes('150')));
  results['3a'].push(check('Mohs EVO durability_months (48)', mohs?.durability_months || mohs?.durabilityMonths, 48,
    (a) => a === 48 || a === '48' || String(a).includes('48')));

  // === 3b — HYBRID HTU ===
  console.log('\n── Faz 3b: HYBRID HTU ──');
  const leather = await getContent('Q2-LSE50M');
  const odorPads = await getContent('Q2M-ORP4P');
  const leatherHtu = (leather?.howToUse as string) ?? '';
  const odorHtu = (odorPads?.howToUse as string) ?? '';
  results['3b'].push(check('LeatherShield howToUse "6 saat"', leatherHtu.slice(0, 100), '6 saat contain',
    () => /6\s*saat/i.test(leatherHtu)));
  results['3b'].push(check('OdorRemover Pads "arka koruma"', odorHtu.slice(0, 100), 'arka koruma tabakası contain',
    () => /arka koruma|koruma tabakas/i.test(odorHtu)));

  // === 3c — FAQ COUNT ===
  console.log('\n── Faz 3c: FAQ merge ──');
  const faqRes = await client.findTableRows({
    table: 'productFaqTable',
    filter: { sku: { $regex: '^Q2[-M]', $options: 'i' } } as any,
    limit: 1000,
  });
  const count = faqRes.rows.length;
  results['3c'].push(check(`GYEON FAQ count`, count, '~799 (pre-merge 414)',
    (a) => typeof a === 'number' && a >= 750));

  // === 3d — RATINGS ===
  console.log('\n── Faz 3d: Ratings ──');
  const sle = parseSpecs(await getSpecs('Q2-SLE50M'));
  const cce = parseSpecs(await getSpecs('Q2-CCE200M'));
  const mle = parseSpecs(await getSpecs('Q2-MLE100M'));
  results['3d'].push(check('Q2-SLE50M ratings.durability (5.5)', sle?.ratings?.durability, 5.5,
    (a) => a === 5.5));
  results['3d'].push(check('Q2-CCE200M ratings.beading (4.5)', cce?.ratings?.beading, 4.5,
    (a) => a === 4.5));
  results['3d'].push(check('Q2-MLE100M ratings.self_cleaning (5.0)', mle?.ratings?.self_cleaning, 5.0,
    (a) => a === 5 || a === 5.0));

  // === SUMMARY ===
  console.log('\n═══ SUMMARY ═══');
  for (const [phase, arr] of Object.entries(results)) {
    const pass = arr.filter((s) => s === 'PASS').length;
    const total = arr.length;
    const icon = pass === total ? '✅' : pass === 0 ? '❌' : '⚠️';
    console.log(`${icon} Faz ${phase}: ${pass}/${total}`);
  }
  const totalPass = Object.values(results).flat().filter((s) => s === 'PASS').length;
  const totalAll = Object.values(results).flat().length;
  console.log(`\nOverall: ${totalPass}/${totalAll}`);
  console.log(totalPass === totalAll ? '\n✅ Cloud fully synced — smoke test ready' : '\n⚠️ Some phases pending sync — run upsert scripts');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
