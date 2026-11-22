/**
 * Pemeriksa peran dan hak akses di sisi server (Socket.IO dan Express).
 * Browser hanya menampilkan UI; server selalu memvalidasi setiap perintah.
 */

export const PERMISSION_DENIED_MESSAGE = 'Peran Anda tidak dapat melakukan ini.';

/**
 * Memeriksa apakah pengguna pada socket memiliki salah satu peran yang diizinkan.
 * Jika tidak, mengirim event `error:permission` ke client dan mengembalikan false.
 */
export function requireSocketRole(socket, allowedRoles) {
  const user = socket.data?.user;
  if (!user || !allowedRoles.includes(user.role)) {
    socket.emit('error:permission', { message: PERMISSION_DENIED_MESSAGE });
    return false;
  }
  return true;
}

/**
 * Memeriksa apakah petugas RS hanya mengakses rumah sakit miliknya sendiri.
 */
export function requireHospitalOwnership(socket, targetHospitalId) {
  const user = socket.data?.user;
  if (!user || user.role !== 'petugas' || !user.hospitalId || user.hospitalId !== targetHospitalId) {
    socket.emit('error:permission', { message: PERMISSION_DENIED_MESSAGE });
    return false;
  }
  return true;
}

/**
 * Middleware Express untuk memverifikasi Bearer token dari header Authorization.
 */
export function createAuthMiddleware(userStore) {
  return function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    const user = userStore.verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Sesi tidak valid. Silakan masuk kembali.' });
    }
    req.user = user;
    return next();
  };
}

/**
 * Middleware Express untuk membatasi endpoint ke peran tertentu.
 */
export function requireHttpRole(...allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: PERMISSION_DENIED_MESSAGE });
    }
    return next();
  };
}
