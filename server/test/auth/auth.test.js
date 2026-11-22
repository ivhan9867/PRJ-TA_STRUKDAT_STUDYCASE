import test from 'node:test';
import assert from 'node:assert/strict';
import { UserStore } from '../../src/auth/userStore.js';
import { requireSocketRole, requireHospitalOwnership } from '../../src/auth/roleGuard.js';

const HOSPITAL_IDS = [
  'rs_surya_utama',
  'rs_surya_timur',
  'rs_surya_barat',
  'rs_tirta_raya',
  'rs_tirta_utara',
  'rs_tirta_selatan',
];

function createMockSocket(user) {
  const emitted = [];
  return {
    data: { user },
    emitted,
    emit(event, payload) {
      emitted.push({ event, payload });
    },
  };
}

test('UserStore login akun demo berhasil dan kata sandi salah ditolak', () => {
  const store = new UserStore(HOSPITAL_IDS);
  const ok = store.login('dinkes@simpulsehat.demo', 'demo1234');
  assert.ok(ok);
  assert.equal(ok.user.role, 'dinkes');
  assert.equal(store.verifyToken(ok.token)?.uid, ok.user.uid);

  assert.equal(store.login('dinkes@simpulsehat.demo', 'salah'), null);
  assert.equal(store.verifyToken('token.tidak.valid'), null);
});

test('UserStore daftar akun baru selalu membuat peran warga tanpa hospitalId', () => {
  const store = new UserStore(HOSPITAL_IDS);
  const res = store.register({
    displayName: 'Siti Aminah',
    email: 'siti@example.com',
    password: 'password123',
  });
  assert.ok(res.user);
  assert.equal(res.user.role, 'warga');
  assert.equal(res.user.hospitalId, null);

  // Email duplikat ditolak
  const dup = store.register({
    displayName: 'Siti Lain',
    email: 'siti@example.com',
    password: 'password123',
  });
  assert.ok(dup.error);
});

test('UserStore ubah peran: hanya Dinkes bisa mengubah peran orang lain, tidak bisa mengubah peran sendiri', () => {
  const store = new UserStore(HOSPITAL_IDS);
  const dinkes = store.login('dinkes@simpulsehat.demo', 'demo1234').user;
  const warga = store.login('warga@simpulsehat.demo', 'demo1234').user;

  // Warga tidak boleh mengubah peran
  const denied = store.updateUserRole(warga, dinkes.uid, { role: 'warga' });
  assert.equal(denied.status, 403);

  // Dinkes tidak boleh mengubah peran sendiri
  const selfEdit = store.updateUserRole(dinkes, dinkes.uid, { role: 'warga' });
  assert.equal(selfEdit.status, 400);

  // Dinkes mengubah warga menjadi petugas RS Tirta Utara
  const updated = store.updateUserRole(dinkes, warga.uid, {
    role: 'petugas',
    hospitalId: 'rs_tirta_utara',
  });
  assert.equal(updated.user.role, 'petugas');
  assert.equal(updated.user.hospitalId, 'rs_tirta_utara');
});

test('RoleGuard menolak warga yang mencoba memicu skenario atau kontrol waktu lewat socket', () => {
  const store = new UserStore(HOSPITAL_IDS);
  const warga = store.login('warga@simpulsehat.demo', 'demo1234').user;
  const socket = createMockSocket(warga);

  const allowed = requireSocketRole(socket, ['dinkes']);
  assert.equal(allowed, false);
  assert.equal(socket.emitted.length, 1);
  assert.equal(socket.emitted[0].event, 'error:permission');
  assert.equal(socket.emitted[0].payload.message, 'Peran Anda tidak dapat melakukan ini.');
});

test('RoleGuard memastikan petugas hanya boleh mengelola rumah sakit miliknya sendiri', () => {
  const store = new UserStore(HOSPITAL_IDS);
  const petugasSurya = store.login('petugas.surya@simpulsehat.demo', 'demo1234').user;
  const socket = createMockSocket(petugasSurya);

  assert.equal(requireHospitalOwnership(socket, 'rs_surya_utama'), true);
  assert.equal(requireHospitalOwnership(socket, 'rs_tirta_raya'), false);
  assert.equal(socket.emitted[0].event, 'error:permission');
});
