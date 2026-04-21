// Minimal migration runner — reads migrations/NNN_*.sql file and executes it.
// Usage: bun run scripts/apply-migration.ts 006_add_video_url
//
// Idempotent: uses CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS in
// migration files. No migration history tracking (Supabase handles its own
// via dashboard when applied there); this runner is for local/CI use.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from '../src/lib/db.ts';

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: bun run scripts/apply-migration.ts <migration_name>');
    console.error('  e.g. bun run scripts/apply-migration.ts 006_add_video_url');
    process.exit(1);
  }

  const path = join(import.meta.dir, '..', 'migrations', `${arg}.sql`);
  const contents = readFileSync(path, 'utf8');

  console.log(`[apply-migration] Running ${arg}.sql (${contents.length} bytes)`);
  await sql.unsafe(contents);
  console.log('[apply-migration] Done.');
  await sql.end();
}

main().catch((err) => {
  console.error('[apply-migration] FAILED:', err);
  process.exit(1);
});
