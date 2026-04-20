/**
 * scripts/full-refresh.ts — Tek komut full pipeline.
 *
 * Faz 1.1 v5.4/v5.5 workflow'unu tek komutta koşturur:
 *
 *   1. refresh_data.py      → CSV'leri güncelle (URL backfill, enrichment)
 *   2. clear-tables.ts      → 3 değişen tablonun satırlarını sil (async job)
 *   3. 25s bekleme          → async delete job'lar bitsin
 *   4. seed.ts              → 7 tabloyu yeniden yükle
 *   5. verify-schema.ts     → şema doğrulaması + filter testi
 *
 * Çalıştırma (detailagent klasöründen):
 *   PATH="$HOME/.bun/bin:$PATH" adk run scripts/full-refresh.ts
 *
 * NOT: clear-tables.ts tüm 7 tabloyu temizler, seed.ts hepsini yeniden
 * yükler. Bu **destructive** bir operasyon — idempotent değil, tam reseed
 * yapar. Cerrahi URL update için scripts/update-urls.ts kullan.
 *
 * Kullanım durumu:
 *   - Schema değiştiğinde (yeni kolon eklendi, kolon silindi)
 *   - CSV'lerde çok fazla satır değiştiğinde
 *   - Cloud tablolarını "temiz" hale getirmek istendiğinde
 *
 * Süre: ~2-3 dakika (7 tablo × ~30 sn seed + 25 sn async wait)
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
const SCRIPTS_DIR = resolve(import.meta.dirname ?? __dirname);

function banner(msg: string): void {
  const line = '━'.repeat(70);
  console.log(`\n${line}`);
  console.log(`  ${msg}`);
  console.log(line);
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    console.log(`$ ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env },
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolvePromise(code);
      } else {
        reject(new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${code})`));
      }
    });
    proc.on('error', reject);
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const startTime = Date.now();

  banner('Full Refresh Pipeline — detailagent');
  console.log('Adımlar:');
  console.log('  1. refresh_data.py   → CSV\'leri güncelle');
  console.log('  2. clear-tables.ts   → Tabloları temizle (async)');
  console.log('  3. 25s bekleme       → Delete job\'lar bitsin');
  console.log('  4. seed.ts           → Tabloları yeniden yükle');
  console.log('  5. verify-schema.ts  → Doğrula');
  console.log();

  // Adım 1: CSV refresh (Python)
  banner('1/5 · refresh_data.py');
  try {
    await runCommand('python3', ['etl/refresh_data.py'], PROJECT_ROOT);
  } catch (err) {
    console.error('❌ refresh_data.py başarısız:', err);
    process.exit(1);
  }

  // Adım 2: Clear tables (adk run)
  banner('2/5 · clear-tables.ts');
  try {
    // adk run script path (relative to detailagent dir)
    await runCommand('adk', ['run', 'scripts/clear-tables.ts'], resolve(SCRIPTS_DIR, '..'));
  } catch (err) {
    console.error('❌ clear-tables.ts başarısız:', err);
    process.exit(1);
  }

  // Adım 3: Async delete job'ları için bekleme
  banner('3/5 · Async delete job\'lar için 25 saniye bekleniyor...');
  for (let i = 25; i > 0; i -= 5) {
    console.log(`  ${i}s...`);
    await sleep(5000);
  }
  console.log('  ✓ Bekleme tamamlandı');

  // Adım 4: Seed
  banner('4/5 · seed.ts');
  try {
    await runCommand('adk', ['run', 'scripts/seed.ts'], resolve(SCRIPTS_DIR, '..'));
  } catch (err) {
    console.error('❌ seed.ts başarısız:', err);
    process.exit(1);
  }

  // Adım 5: Verify
  banner('5/5 · verify-schema.ts');
  try {
    await runCommand('adk', ['run', 'scripts/verify-schema.ts'], resolve(SCRIPTS_DIR, '..'));
  } catch (err) {
    console.error('⚠️  verify-schema.ts başarısız (veri yüklü ama şema uyuşmazlığı olabilir):', err);
    process.exit(1);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  banner(`✅ Full refresh tamamlandı — ${elapsed}s`);
  console.log('Sonraki adımlar:');
  console.log('  • adk chat ile test et');
  console.log('  • traces.db\'yi incele');
}

main().catch((err) => {
  console.error('💥 Pipeline hatası:', err);
  process.exit(1);
});
