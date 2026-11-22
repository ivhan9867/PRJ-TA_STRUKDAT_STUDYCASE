import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SimulationEngine } from '../../src/sim/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_PATH = path.resolve(__dirname, '../../../shared/world.seed.json');
const worldSeed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));

test('Kalibrasi wabah: wabah di Kota Tirta membuat minimal 1 RS Tirta Penuh dalam 4 jam dan memicu >= 3 rujukan lintas jembatan', () => {
  const crossBridgeDispatches = [];
  const engine = new SimulationEngine(worldSeed, {
    seed: 42,
    onEvent: (name, payload) => {
      if (name === 'ambulance:dispatch') {
        const crossedNorth =
          payload.path.includes('jb_t_utara') && payload.path.includes('jb_s_utara');
        const crossedSouth =
          payload.path.includes('jb_t_selatan') && payload.path.includes('jb_s_selatan');
        if (crossedNorth || crossedSouth) {
          crossBridgeDispatches.push(payload);
        }
      }
    },
  });

  engine.triggerOutbreak('tirta');

  let anyTirtaRedWithin4h = false;
  for (let i = 0; i < 360; i++) {
    engine.step();
    if (i < 240) {
      const tick = engine.getTickPayload();
      const tirtaRed = tick.hospitals.some((h) => h.city === 'tirta' && h.status === 'danger');
      if (tirtaRed) anyTirtaRedWithin4h = true;
    }
  }

  assert.equal(anyTirtaRedWithin4h, true, 'Minimal 1 RS di Kota Tirta harus Penuh dalam 4 jam wabah');
  assert.ok(
    crossBridgeDispatches.length >= 3,
    `Minimal 3 rujukan lintas jembatan terjadi (tercatat: ${crossBridgeDispatches.length})`
  );
});

test('Kalibrasi kebijakan: saat wabah, waktu tunggu rata-rata IGD tanpa rujukan otomatis lebih besar daripada dengan rujukan otomatis', () => {
  const runScenario = (autoReferral) => {
    const engine = new SimulationEngine(worldSeed, { seed: 77 });
    engine.setAutoReferral(autoReferral, { recordUndo: false });
    engine.triggerOutbreak('tirta');
    // 24 jam (6 jam wabah + 18 jam pemulihan) agar seluruh antrean terlayani dan perbandingan adil
    for (let i = 0; i < 1440; i++) {
      engine.step();
    }
    return engine.metrics.getSummary(0);
  };

  const withAuto = runScenario(true);
  const withoutAuto = runScenario(false);

  assert.ok(
    withoutAuto.waitAvg > withAuto.waitAvg,
    `Waktu tunggu tanpa rujukan (${withoutAuto.waitAvg}m) harus > dengan rujukan (${withAuto.waitAvg}m)`
  );
  assert.ok(withAuto.referralsTotal > 0);
  assert.equal(withoutAuto.referralsTotal, 0);
});

test('Kecelakaan massal: 12 pasien tiba pada tick berikutnya di RS tujuan', () => {
  const logs = [];
  const engine = new SimulationEngine(worldSeed, {
    seed: 12,
    onEvent: (name, payload) => {
      if (name === 'log:event') logs.push(payload);
    },
  });

  const beforeTotal = engine.patientCounter;
  engine.triggerMassCasualty('rs_tirta_raya');
  engine.step();

  assert.ok(
    engine.patientCounter >= beforeTotal + 12,
    'Minimal 12 pasien baru harus tercatat setelah kecelakaan massal'
  );
  assert.ok(
    logs.some((l) => l.type === 'kecelakaan' && l.message.includes('Kecelakaan massal: 12 pasien tiba di RS Tirta Raya')),
    'Log kecelakaan massal harus berbahasa manusia sesuai pola'
  );
});

test('Tutup kedua jembatan saat RS Tirta penuh memunculkan kejadian tidak ada rute', () => {
  const logs = [];
  const engine = new SimulationEngine(worldSeed, {
    seed: 21,
    onEvent: (name, payload) => {
      if (name === 'log:event') logs.push(payload);
    },
  });

  engine.setBridgeClosed('e_jembatan_utara', true);
  engine.setBridgeClosed('e_jembatan_selatan', true);

  // Penuhkan semua RS di Kota Tirta
  for (const rs of engine.hospitals.values()) {
    if (rs.city === 'tirta') {
      while (rs.inpatientsInap.size() < rs.bedsInapTotal) {
        const p = engine._createPatient('sedang', rs.id, 'inap');
        engine._admitToBed(rs, p, 'inap', 1000, true);
      }
      while (rs.inpatientsIcu.size() < rs.bedsIcuTotal) {
        const p = engine._createPatient('gawat', rs.id, 'icu');
        engine._admitToBed(rs, p, 'icu', 1000, true);
      }
    }
  }
  engine._syncTreeAndStatuses(false);

  const rsTirtaRaya = engine.hospitals.get('rs_tirta_raya');
  const p = engine._createPatient('gawat', 'rs_tirta_raya', 'igd');
  const referred = engine._tryReferPatient(rsTirtaRaya, p, 'icu');

  assert.equal(referred, false);
  assert.equal(engine.metrics.unreachableTotal, 1);
  assert.ok(logs.some((l) => l.type === 'tidak_ada_rute' && l.message.includes('tidak ada rute')));
});

test('Stack Undo: membatalkan tutup jembatan dan nonaktifkan rujukan otomatis secara LIFO', () => {
  const logs = [];
  const engine = new SimulationEngine(worldSeed, {
    seed: 5,
    onEvent: (name, payload) => {
      if (name === 'log:event') logs.push(payload);
    },
  });

  engine.setBridgeClosed('e_jembatan_utara', true);
  engine.setAutoReferral(false);

  assert.equal(engine.graph.getEdge('e_jembatan_utara').closed, true);
  assert.equal(engine.autoReferral, false);
  assert.equal(engine.undoManager.getInfo('dinkes').size, 2);
  assert.equal(engine.undoManager.getInfo('dinkes').nextDescription, 'Nonaktifkan rujukan otomatis');

  // Undo 1: kembalikan rujukan otomatis
  const undone1 = engine.undoLastAction('dinkes');
  assert.equal(undone1, 'Nonaktifkan rujukan otomatis');
  assert.equal(engine.autoReferral, true);

  // Undo 2: buka kembali Jembatan Utara
  const undone2 = engine.undoLastAction('dinkes');
  assert.equal(undone2, 'Tutup Jembatan Utara');
  assert.equal(engine.graph.getEdge('e_jembatan_utara').closed, false);

  // Stack kini kosong
  assert.equal(engine.undoManager.getInfo('dinkes').canUndo, false);
  assert.equal(engine.undoLastAction('dinkes'), null);
  assert.ok(logs.some((l) => l.type === 'undo' && l.message.includes('Aksi dibatalkan: Tutup Jembatan Utara.')));
});
