import { SIM_CONFIG } from '../sim/config.js';
import { requireSocketRole } from '../auth/roleGuard.js';

/**
 * Mendaftarkan seluruh handler Socket.IO dengan verifikasi token pada handshake
 * dan pemeriksaan peran di setiap perintah client -> server.
 */
export function registerSocketHandlers(io, { engine, userStore }) {
  // Middleware verifikasi token saat koneksi Socket.IO dibuka
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = userStore.verifyToken(token);
    if (!user) {
      return next(new Error('AUTH_REQUIRED'));
    }
    socket.data.user = user;
    return next();
  });

  // Helper mengirim update antrean terbaru ke semua warga yang terhubung
  const broadcastWargaQueues = () => {
    for (const s of io.sockets.sockets.values()) {
      if (s.data?.user?.role === 'warga') {
        s.emit('queue:me', engine.getWargaQueueStatus(s.data.user.uid));
      }
    }
  };

  // Sinkronkan posisi antrean warga tiap 1 detik
  const wargaInterval = setInterval(() => {
    if (io.engine.clientsCount > 0) {
      broadcastWargaQueues();
    }
  }, 1000);
  wargaInterval.unref?.();

  io.on('connection', (socket) => {
    const getFreshUser = () => {
      const latest = userStore.getUserByUid(socket.data.user.uid);
      if (latest) socket.data.user = latest;
      return socket.data.user;
    };

    const emitHospitalDetailToSocket = (hospitalId) => {
      const user = getFreshUser();
      const scopeKey = user.role === 'petugas' ? `petugas:${user.uid}` : 'dinkes';
      const detail = engine.getHospitalDetail(hospitalId, {
        viewerUid: user.uid,
        viewerScopeKey: scopeKey,
      });
      if (detail) socket.emit('hospital:detail', detail);
    };

    // Kirim keadaan awal dunia + profil pengguna
    const initialUser = getFreshUser();
    socket.emit('world:init', {
      ...engine.getInitPayload(),
      profile: initialUser,
    });
    if (initialUser.role === 'warga') {
      socket.emit('queue:me', engine.getWargaQueueStatus(initialUser.uid));
    }

    // --- Perintah khusus Dinkes ---
    socket.on('sim:control', ({ action, value } = {}) => {
      getFreshUser();
      if (!requireSocketRole(socket, ['dinkes'])) return;
      if (action === 'play') engine.setPaused(false);
      else if (action === 'pause') engine.setPaused(true);
      else if (action === 'speed') engine.setSpeed(Number(value));
      io.emit('world:tick', engine.getTickPayload());
    });

    socket.on('policy:set', ({ autoReferral } = {}) => {
      getFreshUser();
      if (!requireSocketRole(socket, ['dinkes'])) return;
      engine.setAutoReferral(Boolean(autoReferral), { recordUndo: true, scopeKey: 'dinkes' });
      io.emit('world:tick', engine.getTickPayload());
    });

    socket.on('bridge:set', ({ edgeId, closed } = {}) => {
      getFreshUser();
      if (!requireSocketRole(socket, ['dinkes'])) return;
      if (engine.setBridgeClosed(edgeId, Boolean(closed), { recordUndo: true, scopeKey: 'dinkes' })) {
        io.emit('world:tick', engine.getTickPayload());
      }
    });

    socket.on('scenario:trigger', ({ type, cityId, hospitalId } = {}) => {
      getFreshUser();
      if (!requireSocketRole(socket, ['dinkes'])) return;
      if (type === 'wabah' && cityId) {
        engine.triggerOutbreak(cityId);
      } else if (type === 'kecelakaan' && hospitalId) {
        engine.triggerMassCasualty(hospitalId);
      }
      io.emit('world:tick', engine.getTickPayload());
    });

    socket.on('sim:reset', () => {
      getFreshUser();
      if (!requireSocketRole(socket, ['dinkes'])) return;
      engine.reset(SIM_CONFIG.defaultSeed);
      io.emit('world:init', engine.getInitPayload());
      broadcastWargaQueues();
      io.emit('log:event', {
        id: `reset_${Date.now()}`,
        simTime: engine.simTime,
        simTimeText: engine.getInitPayload().simTimeText,
        type: 'reset',
        severity: 'info',
        hospitalId: null,
        message: 'Simulasi dimulai ulang dari awal.',
      });
    });

    // Helper menentukan target RS: Petugas terkunci ke RS miliknya, Dinkes (Super Admin) bisa memilih RS mana pun
    const resolveManagedHospitalId = (user, requestedHospitalId) => {
      if (user.role === 'dinkes') {
        return requestedHospitalId || null;
      }
      if (user.role === 'petugas') {
        if (!user.hospitalId) return null;
        if (requestedHospitalId && requestedHospitalId !== user.hospitalId) return null;
        return user.hospitalId;
      }
      return null;
    };

    // --- Perintah operasional RS (Petugas hanya RS miliknya; Dinkes Super Admin bisa semua RS) ---
    socket.on('hospital:callNext', ({ hospitalId, unit } = {}) => {
      const user = getFreshUser();
      if (!requireSocketRole(socket, ['petugas', 'dinkes'])) return;
      const targetId = resolveManagedHospitalId(user, hospitalId);
      if (!targetId) {
        socket.emit('error:permission', { message: 'Pilih rumah sakit yang valid untuk dikelola.' });
        return;
      }
      const res = engine.callNextPatient(targetId, unit === 'poli' ? 'poli' : 'igd');
      if (res.error) {
        socket.emit('error:permission', { message: res.error });
        return;
      }
      io.emit('world:tick', engine.getTickPayload());
      emitHospitalDetailToSocket(targetId);
      broadcastWargaQueues();
    });

    socket.on('hospital:discharge', ({ hospitalId, patientCode } = {}) => {
      const user = getFreshUser();
      if (!requireSocketRole(socket, ['petugas', 'dinkes'])) return;
      const targetId = resolveManagedHospitalId(user, hospitalId);
      if (!targetId) return;
      const res = engine.dischargePatient(targetId, patientCode);
      if (res.error) {
        socket.emit('error:permission', { message: res.error });
        return;
      }
      io.emit('world:tick', engine.getTickPayload());
      emitHospitalDetailToSocket(targetId);
      broadcastWargaQueues();
    });

    socket.on('hospital:setBeds', ({ hospitalId, unit, total } = {}) => {
      const user = getFreshUser();
      if (!requireSocketRole(socket, ['petugas', 'dinkes'])) return;
      const targetId = resolveManagedHospitalId(user, hospitalId);
      if (!targetId) return;
      const scopeKey = user.role === 'dinkes' ? 'dinkes' : `petugas:${user.uid}`;
      const res = engine.setHospitalBeds(targetId, unit, total, {
        recordUndo: true,
        scopeKey,
      });
      if (res.error) {
        socket.emit('error:permission', { message: res.error });
        return;
      }
      io.emit('world:tick', engine.getTickPayload());
      emitHospitalDetailToSocket(targetId);
    });

    socket.on('patient:referManual', ({ hospitalId, patientCode, toHospitalId } = {}) => {
      const user = getFreshUser();
      if (!requireSocketRole(socket, ['petugas', 'dinkes'])) return;
      const targetId = resolveManagedHospitalId(user, hospitalId);
      if (!targetId) return;
      const scopeKey = user.role === 'dinkes' ? 'dinkes' : `petugas:${user.uid}`;
      const res = engine.referPatientManual(targetId, patientCode, toHospitalId, {
        recordUndo: true,
        scopeKey,
      });
      if (res.error) {
        socket.emit('error:permission', { message: res.error });
        return;
      }
      io.emit('world:tick', engine.getTickPayload());
      emitHospitalDetailToSocket(targetId);
      broadcastWargaQueues();
    });

    socket.on('hospital:addIgdPatient', ({ hospitalId, triage } = {}) => {
      const user = getFreshUser();
      if (!requireSocketRole(socket, ['petugas', 'dinkes'])) return;
      const targetId = resolveManagedHospitalId(user, hospitalId);
      if (!targetId) return;
      const res = engine.addManualIgdPatient(targetId, triage);
      if (res.error) {
        socket.emit('error:permission', { message: res.error });
        return;
      }
      io.emit('world:tick', engine.getTickPayload());
      emitHospitalDetailToSocket(targetId);
    });

    // --- Perintah khusus Warga ---
    socket.on('warga:register', ({ hospitalId, unit } = {}) => {
      const user = getFreshUser();
      if (!requireSocketRole(socket, ['warga'])) return;
      const res = engine.registerWarga(user.uid, hospitalId, unit);
      if (res.error) {
        socket.emit('error:permission', { message: res.error });
        return;
      }
      socket.emit('queue:me', res.ticket);
      io.emit('world:tick', engine.getTickPayload());
    });

    socket.on('warga:cancel', () => {
      const user = getFreshUser();
      if (!requireSocketRole(socket, ['warga'])) return;
      const res = engine.cancelWarga(user.uid);
      if (res.error) {
        socket.emit('error:permission', { message: res.error });
        return;
      }
      socket.emit('queue:me', null);
      io.emit('world:tick', engine.getTickPayload());
    });

    // --- Perintah Undo (Dinkes memakai stack global, Petugas memakai stack sendiri) ---
    socket.on('undo', () => {
      const user = getFreshUser();
      if (!requireSocketRole(socket, ['dinkes', 'petugas'])) return;
      const scopeKey = user.role === 'dinkes' ? 'dinkes' : `petugas:${user.uid}`;
      const undone = engine.undoLastAction(scopeKey);
      if (undone) {
        io.emit('world:tick', engine.getTickPayload());
        if (user.role === 'petugas' && user.hospitalId) {
          emitHospitalDetailToSocket(user.hospitalId);
        }
      }
    });

    // --- Permintaan baca (semua peran terautentikasi) ---
    socket.on('hospital:request', ({ hospitalId } = {}) => {
      emitHospitalDetailToSocket(hospitalId);
    });

    socket.on('patient:request', ({ patientCode } = {}) => {
      const detail = engine.getPatientDetail(patientCode);
      if (detail) {
        socket.emit('patient:detail', detail);
      }
    });
  });
}
