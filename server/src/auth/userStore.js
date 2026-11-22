import crypto from 'node:crypto';

const VALID_ROLES = new Set(['warga', 'petugas', 'dinkes']);
const TOKEN_SECRET = process.env.DEMO_TOKEN_SECRET || 'simpul-sehat-demo-secret-2026';
const PROFILE_CACHE_TTL_MS = 60_000; // Cache profil pengguna 60 detik (03_ARSITEKTUR bagian 7)

/**
 * Akun demo bawaan (1 Dinkes, 3 Petugas RS, 1 Warga) sesuai 03_ARSITEKTUR_DAN_STRUKTUR_DATA.md bagian 6.
 * Kata sandi demo: "demo1234" (hanya untuk pengujian lokal sebelum Firebase dipasang).
 */
const DEMO_SEED_USERS = [
  {
    uid: 'demo_dinkes_1',
    displayName: 'Dinas Kesehatan',
    shortName: 'Dinkes',
    email: 'dinkes@simpulsehat.demo',
    role: 'dinkes',
    hospitalId: null,
  },
  {
    uid: 'demo_petugas_surya',
    displayName: 'Petugas RS Surya Utama',
    shortName: 'Petugas Surya',
    email: 'petugas.surya@simpulsehat.demo',
    role: 'petugas',
    hospitalId: 'rs_surya_utama',
  },
  {
    uid: 'demo_petugas_tirta',
    displayName: 'Petugas RS Tirta Raya',
    shortName: 'Petugas Tirta',
    email: 'petugas.tirta@simpulsehat.demo',
    role: 'petugas',
    hospitalId: 'rs_tirta_raya',
  },
  {
    uid: 'demo_petugas_selatan',
    displayName: 'Petugas RS Tirta Selatan',
    shortName: 'Petugas Selatan',
    email: 'petugas.selatan@simpulsehat.demo',
    role: 'petugas',
    hospitalId: 'rs_tirta_selatan',
  },
  {
    uid: 'demo_warga_1',
    displayName: 'Budi Santoso',
    shortName: 'Budi',
    email: 'warga@simpulsehat.demo',
    role: 'warga',
    hospitalId: null,
  },
];

function hashPassword(password) {
  return crypto.createHash('sha256').update(`simpul:${password}`).digest('hex');
}

function signDemoToken(uid) {
  const payload = Buffer.from(JSON.stringify({ uid, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `demo.${payload}.${sig}`;
}

function verifyDemoToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('demo.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payload, sig] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return parsed?.uid || null;
  } catch {
    return null;
  }
}

/**
 * Repositori pengguna & autentikasi dengan pola Adapter.
 * Saat AUTH_MODE=demo (default lokal), menggunakan akun demo + token HMAC lokal.
 * Saat AUTH_MODE=firebase di tahap akhir, verifikasi token & pembacaan profil otomatis
 * didelegasikan ke Firebase Admin SDK tanpa mengubah kode handler Socket.IO / UI.
 */
export class UserStore {
  constructor(validHospitalIds = []) {
    this.authMode = process.env.AUTH_MODE || 'demo';
    this.validHospitalIds = new Set(validHospitalIds);
    this._usersByUid = new Map();
    this._uidByEmail = new Map();
    this._profileCache = new Map(); // uid -> { user, cachedAt }

    const defaultPassHash = hashPassword('demo1234');
    for (const u of DEMO_SEED_USERS) {
      const record = {
        ...u,
        passwordHash: defaultPassHash,
        createdAt: new Date().toISOString(),
      };
      this._usersByUid.set(record.uid, record);
      this._uidByEmail.set(record.email.toLowerCase(), record.uid);
    }
  }

  _toPublicUser(record) {
    if (!record) return null;
    return {
      uid: record.uid,
      displayName: record.displayName,
      shortName: record.shortName || record.displayName.split(' ')[0],
      email: record.email,
      role: record.role,
      hospitalId: record.hospitalId || null,
      createdAt: record.createdAt,
    };
  }

  login(email, password) {
    const normEmail = String(email || '').trim().toLowerCase();
    const uid = this._uidByEmail.get(normEmail);
    if (!uid) return null;

    const record = this._usersByUid.get(uid);
    if (!record || record.passwordHash !== hashPassword(String(password || ''))) {
      return null;
    }

    const user = this._toPublicUser(record);
    this._profileCache.set(uid, { user, cachedAt: Date.now() });
    return { user, token: signDemoToken(uid) };
  }

  register({ displayName, email, password }) {
    const normEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(displayName || '').trim();
    if (!cleanName || !normEmail || String(password || '').length < 6) {
      return { error: 'Isi nama, email valid, dan kata sandi minimal 6 karakter.' };
    }
    if (this._uidByEmail.has(normEmail)) {
      return { error: 'Email tersebut sudah terdaftar. Silakan masuk.' };
    }

    const uid = `usr_${crypto.randomBytes(6).toString('hex')}`;
    const record = {
      uid,
      displayName: cleanName,
      shortName: cleanName.split(' ')[0],
      email: normEmail,
      role: 'warga', // Daftar selalu membuat akun Warga (02_UI_SPEC bagian 2)
      hospitalId: null,
      passwordHash: hashPassword(String(password)),
      createdAt: new Date().toISOString(),
    };

    this._usersByUid.set(uid, record);
    this._uidByEmail.set(normEmail, uid);

    const user = this._toPublicUser(record);
    this._profileCache.set(uid, { user, cachedAt: Date.now() });
    return { user, token: signDemoToken(uid) };
  }

  /**
   * Memverifikasi token dan mengembalikan profil pengguna (menggunakan cache 60 detik).
   */
  verifyToken(token) {
    const uid = verifyDemoToken(token);
    if (!uid) return null;

    const cached = this._profileCache.get(uid);
    if (cached && Date.now() - cached.cachedAt < PROFILE_CACHE_TTL_MS) {
      return cached.user;
    }

    const record = this._usersByUid.get(uid);
    if (!record) return null;

    const user = this._toPublicUser(record);
    this._profileCache.set(uid, { user, cachedAt: Date.now() });
    return user;
  }

  getUserByUid(uid) {
    return this._toPublicUser(this._usersByUid.get(uid));
  }

  listUsers() {
    return Array.from(this._usersByUid.values()).map((r) => this._toPublicUser(r));
  }

  /**
   * Mengubah peran dan penugasan RS pengguna (hanya boleh dilakukan Dinkes, bukan ke diri sendiri).
   */
  updateUserRole(actorUser, targetUid, { role, hospitalId = null }) {
    if (!actorUser || actorUser.role !== 'dinkes') {
      return { error: 'Peran Anda tidak dapat melakukan ini.', status: 403 };
    }
    if (actorUser.uid === targetUid) {
      return { error: 'Anda tidak bisa mengubah peran sendiri.', status: 400 };
    }
    if (!VALID_ROLES.has(role)) {
      return { error: 'Peran tidak valid.', status: 400 };
    }

    const target = this._usersByUid.get(targetUid);
    if (!target) {
      return { error: 'Pengguna tidak ditemukan.', status: 404 };
    }

    let nextHospitalId = null;
    if (role === 'petugas') {
      if (hospitalId && !this.validHospitalIds.has(hospitalId)) {
        return { error: 'Rumah sakit tujuan tidak valid.', status: 400 };
      }
      nextHospitalId = hospitalId || null;
    }

    target.role = role;
    target.hospitalId = nextHospitalId;

    // Invalidate cache agar perubahan peran langsung berlaku
    const updated = this._toPublicUser(target);
    this._profileCache.set(targetUid, { user: updated, cachedAt: Date.now() });

    return { user: updated };
  }
}
