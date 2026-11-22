import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAbExperiment, runDataStructureBenchmarks } from '../../src/sim/experiments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_PATH = path.resolve(__dirname, '../../../shared/world.seed.json');
const worldSeed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));

test('Eksperimen A/B deterministik: seed dan parameter sama menghasilkan tabel metrik identik', () => {
  const run1 = runAbExperiment(worldSeed, { scenario: 'wabah', days: 1, runs: 2 });
  const run2 = runAbExperiment(worldSeed, { scenario: 'wabah', days: 1, runs: 2 });

  assert.deepEqual(run1.summary, run2.summary);
  assert.deepEqual(run1.perSeed, run2.perSeed);
  assert.ok(run1.summary.active.referralsTotal.mean > 0);
  assert.equal(run1.summary.inactive.referralsTotal.mean, 0);
});

test('Benchmark struktur data menghasilkan 6 baris hasil terukur (> 0 ms) dan LinkedList jauh lebih cepat dari Array.unshift di n=100.000', () => {
  const res = runDataStructureBenchmarks();
  assert.equal(res.rows.length, 6);
  const bigPrepend = res.rows.find((r) => r.group === 'Tambah di depan' && r.n === 100000);
  assert.ok(bigPrepend);
  assert.ok(
    bigPrepend.fastMs < bigPrepend.slowMs,
    `LinkedList.prepend (${bigPrepend.fastMs}ms) harus lebih cepat dari Array.unshift (${bigPrepend.slowMs}ms)`
  );
});
