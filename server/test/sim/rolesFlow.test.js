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

test('Alur Warga & Petugas: warga mendaftar poli, petugas panggil berikutnya, posisi warga berkurang dan berubah dipanggil', () => {
  const engine = new SimulationEngine(worldSeed, { seed: 55 });

  // Warga 1 & Warga 2 mendaftar antrean Poli di RS Surya Utama
  const reg1 = engine.registerWarga('warga_1', 'rs_surya_utama', 'poli');
  const reg2 = engine.registerWarga('warga_2', 'rs_surya_utama', 'poli');

  assert.equal(reg1.ticket.position, 1);
  assert.equal(reg2.ticket.position, 2);

  // Warga 1 tidak boleh mendaftar dua antrean bersamaan
  const dup = engine.registerWarga('warga_1', 'rs_surya_timur', 'igd');
  assert.ok(dup.error);

  // Petugas RS Surya Utama memanggil pasien berikutnya di Poli
  const call1 = engine.callNextPatient('rs_surya_utama', 'poli');
  assert.equal(call1.patientCode, reg1.ticket.patientCode);

  // Warga 1 kini berstatus "dipanggil", dan posisi Warga 2 berkurang dari 2 menjadi 1!
  assert.equal(engine.getWargaQueueStatus('warga_1').status, 'dipanggil');
  assert.equal(engine.getWargaQueueStatus('warga_2').position, 1);

  // Petugas memulangkan Warga 1 -> tiket Warga 1 selesai (null)
  const dis = engine.dischargePatient('rs_surya_utama', reg1.ticket.patientCode);
  assert.equal(dis.ok, true);
  assert.equal(engine.getWargaQueueStatus('warga_1'), null);
});

test('Warga dapat membatalkan antreannya dan langsung dihapus dari Queue', () => {
  const engine = new SimulationEngine(worldSeed, { seed: 56 });
  const reg = engine.registerWarga('warga_cancel', 'rs_tirta_utara', 'igd');
  assert.equal(reg.ticket.position, 1);

  const cancel = engine.cancelWarga('warga_cancel');
  assert.equal(cancel.ok, true);
  assert.equal(engine.getWargaQueueStatus('warga_cancel'), null);
  assert.equal(engine.hospitals.get('rs_tirta_utara').igdQueue.size(), 0);
});

test('Petugas RS ubah kapasitas tempat tidur (batas 0..2x) dan Undo mengembalikan kapasitas sebelumnya', () => {
  const engine = new SimulationEngine(worldSeed, { seed: 57 });
  const scope = 'petugas:demo_petugas_surya';
  const rs = engine.hospitals.get('rs_surya_utama');
  assert.equal(rs.bedsInapTotal, 60);

  engine.setHospitalBeds('rs_surya_utama', 'inap', 65, { recordUndo: true, scopeKey: scope });
  assert.equal(rs.bedsInapTotal, 65);

  // Melebihi 2x kapasitas awal (120) akan dibatasi di 120
  engine.setHospitalBeds('rs_surya_utama', 'inap', 999, { recordUndo: true, scopeKey: scope });
  assert.equal(rs.bedsInapTotal, 120);

  // Undo 1 -> kembali ke 65
  engine.undoLastAction(scope);
  assert.equal(rs.bedsInapTotal, 65);

  // Undo 2 -> kembali ke 60
  engine.undoLastAction(scope);
  assert.equal(rs.bedsInapTotal, 60);
});

test('Petugas RS dapat mengalihkan pasien IGD secara manual ke RS lain dan ambulans berangkat', () => {
  const dispatches = [];
  const engine = new SimulationEngine(worldSeed, {
    seed: 58,
    onEvent: (name, payload) => {
      if (name === 'ambulance:dispatch') dispatches.push(payload);
    },
  });

  const reg = engine.registerWarga('warga_refer', 'rs_tirta_raya', 'igd');
  const res = engine.referPatientManual(
    'rs_tirta_raya',
    reg.ticket.patientCode,
    'rs_surya_utama',
    { recordUndo: true, scopeKey: 'petugas:demo_petugas_tirta' }
  );

  assert.equal(res.ok, true);
  assert.equal(dispatches.length, 1);
  assert.equal(dispatches[0].from, 'rs_tirta_raya');
  assert.equal(dispatches[0].to, 'rs_surya_utama');
});

test('Tambah pasien IGD manual: pasien Gawat langsung menyalip ke puncak PriorityQueue', () => {
  const engine = new SimulationEngine(worldSeed, { seed: 59 });
  const r1 = engine.addManualIgdPatient('rs_tirta_utara', 'ringan');
  const r2 = engine.addManualIgdPatient('rs_tirta_utara', 'sedang');
  const r3 = engine.addManualIgdPatient('rs_tirta_utara', 'gawat');

  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(r3.ok, true);

  const top = engine.hospitals.get('rs_tirta_utara').igdQueue.peek();
  assert.equal(top.code, r3.patientCode);
  assert.equal(top.triage, 'gawat');
});

test('Atur armada ambulans: menambah ambulans langsung memberangkatkan antrean rujukan dan Undo mengembalikan jumlahnya', () => {
  const dispatches = [];
  const engine = new SimulationEngine(worldSeed, {
    seed: 60,
    onEvent: (name, payload) => {
      if (name === 'ambulance:dispatch') dispatches.push(payload);
    },
  });

  // RS Tirta Utara awalnya punya 1 ambulans; buat 2 rujukan manual -> 1 berangkat, 1 antre di ambRequestQueue
  const p1 = engine.addManualIgdPatient('rs_tirta_utara', 'gawat');
  const p2 = engine.addManualIgdPatient('rs_tirta_utara', 'gawat');
  engine.referPatientManual('rs_tirta_utara', p1.patientCode, 'rs_tirta_raya', { recordUndo: false });
  engine.referPatientManual('rs_tirta_utara', p2.patientCode, 'rs_tirta_raya', { recordUndo: false });

  assert.equal(dispatches.length, 1);
  assert.equal(engine.hospitals.get('rs_tirta_utara').ambRequestQueue.size(), 1);

  // Tambah 1 ambulans -> permintaan kedua langsung berangkat!
  engine.setHospitalAmbulances('rs_tirta_utara', 2, { recordUndo: true, scopeKey: 'dinkes' });
  assert.equal(engine.hospitals.get('rs_tirta_utara').ambulancesTotal, 2);
  assert.equal(dispatches.length, 2);
  assert.equal(engine.hospitals.get('rs_tirta_utara').ambRequestQueue.size(), 0);

  // Undo mengembalikan kapasitas armada ke 1
  engine.undoLastAction('dinkes');
  assert.equal(engine.hospitals.get('rs_tirta_utara').ambulancesTotal, 1);
});
