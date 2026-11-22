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

test('SimulationEngine deterministik: dua simulasi dengan seed sama menghasilkan state identik', () => {
  const e1 = new SimulationEngine(worldSeed, { seed: 101 });
  const e2 = new SimulationEngine(worldSeed, { seed: 101 });

  for (let i = 0; i < 360; i++) {
    e1.step();
    e2.step();
  }

  assert.deepEqual(e1.getTickPayload(), e2.getTickPayload());
});

test('Kalibrasi baseline 24 jam: tidak ada RS berstatus Penuh terus-menerus > 2 jam (120 tick)', () => {
  const engine = new SimulationEngine(worldSeed, { seed: 42 });
  const streak = new Map();
  const maxStreak = new Map();

  for (const rs of worldSeed.hospitals) {
    streak.set(rs.id, 0);
    maxStreak.set(rs.id, 0);
  }

  for (let i = 0; i < 1440; i++) {
    engine.step();
    const tick = engine.getTickPayload();
    for (const h of tick.hospitals) {
      if (h.status === 'danger') {
        const next = streak.get(h.id) + 1;
        streak.set(h.id, next);
        if (next > maxStreak.get(h.id)) maxStreak.set(h.id, next);
      } else {
        streak.set(h.id, 0);
      }
    }
  }

  for (const [rsId, longest] of maxStreak.entries()) {
    assert.ok(
      longest <= 120,
      `${rsId} berstatus Penuh selama ${longest} menit berturut-turut (batas 120)`
    );
  }
});

test('Rujukan otomatis: saat ICU RS Tirta Utara tidak tersedia dan pasien butuh ICU, ambulans dikirim ke RS lain', () => {
  const dispatches = [];
  const engine = new SimulationEngine(worldSeed, {
    seed: 7,
    onEvent: (name, payload) => {
      if (name === 'ambulance:dispatch') dispatches.push(payload);
    },
  });

  // Masukkan beberapa pasien gawat ke RS Tirta Utara (Tipe C, 0 ICU) agar memicu rujukan ICU otomatis
  for (let i = 0; i < 4; i++) {
    engine.addManualIgdPatient('rs_tirta_utara', 'gawat');
  }

  for (let i = 0; i < 360; i++) {
    engine.step();
  }

  assert.ok(dispatches.length > 0, 'Minimal ada rujukan otomatis saat RS Tipe C menerima pasien butuh ICU');
  assert.ok(engine.metrics.referralsTotal > 0);
});

test('Jembatan tertutup: ambulans tidak melewati jembatan yang ditutup', () => {
  const dispatches = [];
  const engine = new SimulationEngine(worldSeed, {
    seed: 19,
    onEvent: (name, payload) => {
      if (name === 'ambulance:dispatch') dispatches.push(payload);
    },
  });

  engine.setBridgeClosed('e_jembatan_utara', true);

  // Paksa seluruh RS Tirta penuh agar rujukan dari Tirta harus menyeberang ke Surya lewat Jembatan Selatan
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
  const urgentPatient = engine._createPatient('gawat', 'rs_tirta_raya', 'igd');
  const referred = engine._tryReferPatient(rsTirtaRaya, urgentPatient, 'icu');

  assert.equal(referred, true);
  assert.equal(dispatches.length, 1);
  const pathNodes = dispatches[0].path;
  // Tidak boleh melewati ujung Jembatan Utara secara langsung
  const crossedNorth = pathNodes.includes('jb_t_utara') && pathNodes.includes('jb_s_utara');
  const crossedSouth = pathNodes.includes('jb_t_selatan') && pathNodes.includes('jb_s_selatan');
  assert.equal(crossedNorth, false);
  assert.equal(crossedSouth, true);
});

test('Detail pasien dan rumah asal: walkin menyertakan koordinat rumah warga dan getPatientDetail membaca LinkedList perjalanan', () => {
  const walkins = [];
  const engine = new SimulationEngine(worldSeed, {
    seed: 33,
    onEvent: (name, payload) => {
      if (name === 'walkin:spawn') walkins.push(payload);
    },
  });

  for (let i = 0; i < 60; i++) engine.step();

  assert.ok(walkins.length > 0, 'Harus ada pasien jalan kaki yang muncul');
  assert.ok(walkins[0].originCoord && typeof walkins[0].originCoord.x === 'number');

  const firstCode = Array.from(engine.patientRegistry.keys())[0];
  const detail = engine.getPatientDetail(firstCode);
  assert.ok(detail);
  assert.equal(detail.code, firstCode);
  assert.ok(detail.complaint.length > 0);
  assert.ok(detail.age >= 18 && detail.age <= 72);
  assert.ok(Array.isArray(detail.journey) && detail.journey.length >= 1);
});
