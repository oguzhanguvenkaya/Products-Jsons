// Runs all seed scripts sequentially (order matters: products first, then children).
// Idempotent — safe to re-run.

const steps = [
  'seed-products.ts',
  'seed-faqs.ts',
  'seed-relations.ts',
  'seed-meta.ts',
  'seed-synonyms.ts',
];

for (const step of steps) {
  console.log(`\n========== ${step} ==========`);
  const proc = Bun.spawn(['bun', `scripts/${step}`], {
    cwd: import.meta.dir + '/..',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`\n${step} failed with exit code ${exitCode}`);
    process.exit(exitCode);
  }
}
console.log('\n✅ All seeds complete.');
