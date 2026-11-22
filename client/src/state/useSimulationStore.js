import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import worldSeed from '@shared/world.seed.json';
import {
  IS_STATIC_MODE,
  getLocalEngine,
  subscribeLocalEngine,
  localVerifyToken,
} from './localEngineAdapter.js';

const MAX_WALKINS = 150;
const MAX_TOASTS = 3;
const TOAST_TTL_MS = 6000;

function createFallbackWorld() {
  const nodeMap = new Map(worldSeed.nodes.map((n) => [n.id, n]));
  return {
    cities: worldSeed.cities,
    nodes: worldSeed.nodes,
    edges: worldSeed.edges.map((e) => ({ ...e, closed: false })),
    hospitals: worldSeed.hospitals.map((rs) => {
      const node = nodeMap.get(rs.id);
      return {
        ...rs,
        x: node.x,
        y: node.y,
        status: 'neutral',
        occupancyPct: 0,
        inap: { used: 0, total: rs.bedsInap },
        icu: { used: 0, total: rs.bedsIcu },
        igdQueue: 0,
        igdBusy: 0,
        poliQueue: 0,
        ambFree: rs.ambulances,
      };
    }),
    bridges: worldSeed.edges
      .filter((e) => e.bridge)
      .map((e) => ({ id: e.id, name: e.name, closed: false })),
    simTime: 360,
    simTimeText: 'Hari 1, 06.00',
    speed: 1,
    paused: false,
    policy: { autoReferral: true },
    activeOutbreaks: [],
    activeReferrals: [],
    undoInfo: { canUndo: false, nextDescription: null, size: 0 },
    kpi: {
      totalIgdQueue: 0,
      waitAvg: 0,
      bedPct: 0,
      referralsToday: 0,
      unreachableToday: 0,
    },
  };
}

/**
 * Store koneksi Socket.IO untuk simulasi langsung.
 * Entitas animasi (pasien berjalan & ambulans) disimpan di Ref (bukan React state)
 * agar loop Canvas 60 fps berjalan tanpa memicu render ulang React tiap frame.
 */
export function useSimulationStore(token, { onProfileUpdated } = {}) {
  const [connected, setConnected] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [world, setWorld] = useState(() => createFallbackWorld());
  const [hospitalDetails, setHospitalDetails] = useState({});
  const [selectedPatientDetail, setSelectedPatientDetail] = useState(null);
  const [myQueue, setMyQueue] = useState(null);
  const [toasts, setToasts] = useState([]);
  const onProfileUpdatedRef = useRef(onProfileUpdated);
  onProfileUpdatedRef.current = onProfileUpdated;

  const socketRef = useRef(null);
  const walkinsRef = useRef(new Map());
  const ambulancesRef = useRef(new Map());
  const toastTimersRef = useRef(new Map());

  const pushToast = useCallback((entry) => {
    setToasts((prev) => {
      const next = [entry, ...prev].slice(0, MAX_TOASTS);
      return next;
    });

    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== entry.id));
      toastTimersRef.current.delete(entry.id);
    }, TOAST_TTL_MS);

    toastTimersRef.current.set(entry.id, timer);
  }, []);

  const dismissToast = useCallback((id) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      setInitialized(false);
      return;
    }

    // Mode GitHub Pages statis: jalankan SimulationEngine langsung di browser tanpa Socket.IO
    if (IS_STATIC_MODE) {
      const engine = getLocalEngine();
      const user = localVerifyToken(token);
      setConnected(true);
      setWorld((prev) => ({ ...prev, ...engine.getInitPayload() }));
      if (user?.role === 'warga') {
        setMyQueue(engine.getWargaQueueStatus(user.uid));
      }
      setInitialized(true);

      const unsub = subscribeLocalEngine((event, payload) => {
        if (event === 'world:tick') {
          setWorld((prev) => {
            const bridgeMap = new Map((payload.bridges || []).map((b) => [b.id, b.closed]));
            const nextEdges = prev.edges.map((e) =>
              e.bridge && bridgeMap.has(e.id) ? { ...e, closed: bridgeMap.get(e.id) } : e
            );
            return {
              ...prev,
              simTime: payload.simTime,
              simTimeText: payload.simTimeText,
              speed: payload.speed,
              paused: payload.paused,
              policy: payload.policy,
              activeOutbreaks: payload.activeOutbreaks || [],
              activeReferrals: payload.activeReferrals || [],
              undoInfo: payload.undoInfo || prev.undoInfo,
              hospitals: payload.hospitals,
              bridges: payload.bridges,
              edges: nextEdges,
              kpi: payload.kpi,
            };
          });
        } else if (event === 'walkin:spawn') {
          const map = walkinsRef.current;
          if (map.size >= MAX_WALKINS) {
            const oldestKey = map.keys().next().value;
            if (oldestKey) map.delete(oldestKey);
          }
          map.set(payload.id, { ...payload, startWallMs: performance.now() });
        } else if (event === 'ambulance:dispatch') {
          ambulancesRef.current.set(payload.id, { ...payload, phase: 'dispatch', startWallMs: performance.now() });
        } else if (event === 'ambulance:return') {
          ambulancesRef.current.set(`${payload.id}_ret_${Date.now()}`, { ...payload, phase: 'return', startWallMs: performance.now() });
        } else if (event === 'log:event') {
          pushToast(payload);
        } else if (event === 'queue:me') {
          setMyQueue(payload || null);
        }
      });

      return () => {
        unsub();
      };
    }

    const socket = io({
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('world:init', (payload) => {
      walkinsRef.current.clear();
      ambulancesRef.current.clear();
      setHospitalDetails({});
      setSelectedPatientDetail(null);
      setWorld((prev) => ({
        ...prev,
        ...payload,
      }));
      setInitialized(true);
    });

    socket.on('world:tick', (tick) => {
      setWorld((prev) => {
        const bridgeMap = new Map((tick.bridges || []).map((b) => [b.id, b.closed]));
        const nextEdges = prev.edges.map((e) =>
          e.bridge && bridgeMap.has(e.id) ? { ...e, closed: bridgeMap.get(e.id) } : e
        );
        return {
          ...prev,
          simTime: tick.simTime,
          simTimeText: tick.simTimeText,
          speed: tick.speed,
          paused: tick.paused,
          policy: tick.policy,
          activeOutbreaks: tick.activeOutbreaks || [],
          activeReferrals: tick.activeReferrals || [],
          undoInfo: tick.undoInfo || prev.undoInfo,
          hospitals: tick.hospitals,
          bridges: tick.bridges,
          edges: nextEdges,
          kpi: tick.kpi,
        };
      });
    });

    socket.on('walkin:spawn', (ev) => {
      const map = walkinsRef.current;
      // Batasi maksimal 150 titik sesuai 01_DESIGN_SYSTEM.md
      if (map.size >= MAX_WALKINS) {
        const oldestKey = map.keys().next().value;
        if (oldestKey) map.delete(oldestKey);
      }
      map.set(ev.id, {
        ...ev,
        startWallMs: performance.now(),
      });
    });

    socket.on('ambulance:dispatch', (ev) => {
      ambulancesRef.current.set(ev.id, {
        ...ev,
        phase: 'dispatch',
        startWallMs: performance.now(),
      });
    });

    socket.on('ambulance:return', (ev) => {
      ambulancesRef.current.set(`${ev.id}_ret_${Date.now()}`, {
        ...ev,
        phase: 'return',
        startWallMs: performance.now(),
      });
    });

    socket.on('log:event', (entry) => {
      pushToast(entry);
    });

    socket.on('error:permission', ({ message } = {}) => {
      pushToast({
        id: `perm_${Date.now()}`,
        severity: 'danger',
        message: message || 'Peran Anda tidak dapat melakukan ini.',
      });
    });

    socket.on('hospital:detail', (detail) => {
      setHospitalDetails((prev) => ({
        ...prev,
        [detail.hospitalId]: detail,
      }));
    });

    socket.on('patient:detail', (detail) => {
      setSelectedPatientDetail(detail);
    });

    socket.on('queue:me', (ticket) => {
      setMyQueue(ticket || null);
    });

    socket.on('profile:updated', (nextUser) => {
      onProfileUpdatedRef.current?.(nextUser);
      pushToast({
        id: `prof_${Date.now()}`,
        severity: 'info',
        message: 'Peran akun Anda baru saja diperbarui oleh Dinkes.',
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      for (const t of toastTimersRef.current.values()) {
        window.clearTimeout(t);
      }
      toastTimersRef.current.clear();
      walkinsRef.current.clear();
      ambulancesRef.current.clear();
    };
  }, [token, pushToast]);

  const sendControl = useCallback((action, value) => {
    if (IS_STATIC_MODE) {
      const engine = getLocalEngine();
      if (action === 'play') engine.setPaused(false);
      else if (action === 'pause') engine.setPaused(true);
      else if (action === 'speed') engine.setSpeed(Number(value));
      return;
    }
    socketRef.current?.emit('sim:control', { action, value });
  }, []);

  const setBridge = useCallback((edgeId, closed) => {
    if (IS_STATIC_MODE) {
      getLocalEngine().setBridgeClosed(edgeId, Boolean(closed), { recordUndo: true, scopeKey: 'dinkes' });
      return;
    }
    socketRef.current?.emit('bridge:set', { edgeId, closed });
  }, []);

  const setAutoReferral = useCallback((autoReferral) => {
    if (IS_STATIC_MODE) {
      getLocalEngine().setAutoReferral(Boolean(autoReferral), { recordUndo: true, scopeKey: 'dinkes' });
      return;
    }
    socketRef.current?.emit('policy:set', { autoReferral });
  }, []);

  const triggerScenario = useCallback((type, payload = {}) => {
    if (IS_STATIC_MODE) {
      const engine = getLocalEngine();
      if (type === 'wabah' && payload.cityId) engine.triggerOutbreak(payload.cityId);
      else if (type === 'kecelakaan' && payload.hospitalId) engine.triggerMassCasualty(payload.hospitalId);
      return;
    }
    socketRef.current?.emit('scenario:trigger', { type, ...payload });
  }, []);

  const undoLastAction = useCallback(() => {
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      const scopeKey = user?.role === 'dinkes' ? 'dinkes' : `petugas:${user?.uid}`;
      getLocalEngine().undoLastAction(scopeKey);
      return;
    }
    socketRef.current?.emit('undo');
  }, [token]);

  const resetSimulation = useCallback(() => {
    if (IS_STATIC_MODE) {
      const engine = getLocalEngine();
      engine.reset();
      walkinsRef.current.clear();
      ambulancesRef.current.clear();
      setHospitalDetails({});
      setSelectedPatientDetail(null);
      setWorld((prev) => ({ ...prev, ...engine.getInitPayload() }));
      pushToast({ id: `reset_${Date.now()}`, severity: 'info', message: 'Simulasi dimulai ulang dari awal.' });
      return;
    }
    socketRef.current?.emit('sim:reset');
  }, [pushToast]);

  const requestHospitalDetail = useCallback((hospitalId) => {
    if (!hospitalId) return;
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      const scopeKey = user?.role === 'petugas' ? `petugas:${user.uid}` : 'dinkes';
      const detail = getLocalEngine().getHospitalDetail(hospitalId, {
        viewerUid: user?.uid || null,
        viewerScopeKey: scopeKey,
      });
      if (detail) setHospitalDetails((prev) => ({ ...prev, [detail.hospitalId]: detail }));
      return;
    }
    socketRef.current?.emit('hospital:request', { hospitalId });
  }, [token]);

  const requestPatientDetail = useCallback((patientCode) => {
    if (!patientCode) return;
    if (IS_STATIC_MODE) {
      const detail = getLocalEngine().getPatientDetail(patientCode);
      if (detail) setSelectedPatientDetail(detail);
      return;
    }
    socketRef.current?.emit('patient:request', { patientCode });
  }, []);

  const clearPatientDetail = useCallback(() => {
    setSelectedPatientDetail(null);
  }, []);

  // --- Aksi Petugas RS & Dinkes Super Admin & Warga ---
  const callNextPatient = useCallback((unit, hospitalId) => {
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      const targetId = user?.role === 'dinkes' ? hospitalId : user?.hospitalId;
      const res = getLocalEngine().callNextPatient(targetId, unit);
      if (res.error) pushToast({ id: `e_${Date.now()}`, severity: 'danger', message: res.error });
      else requestHospitalDetail(targetId);
      return;
    }
    socketRef.current?.emit('hospital:callNext', { unit, hospitalId });
  }, [token, pushToast, requestHospitalDetail]);

  const dischargePatient = useCallback((patientCode, hospitalId) => {
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      const targetId = user?.role === 'dinkes' ? hospitalId : user?.hospitalId;
      getLocalEngine().dischargePatient(targetId, patientCode);
      requestHospitalDetail(targetId);
      return;
    }
    socketRef.current?.emit('hospital:discharge', { patientCode, hospitalId });
  }, [token, requestHospitalDetail]);

  const setHospitalBeds = useCallback((unit, total, hospitalId) => {
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      const targetId = user?.role === 'dinkes' ? hospitalId : user?.hospitalId;
      const scopeKey = user?.role === 'dinkes' ? 'dinkes' : `petugas:${user?.uid}`;
      getLocalEngine().setHospitalBeds(targetId, unit, total, { recordUndo: true, scopeKey });
      requestHospitalDetail(targetId);
      return;
    }
    socketRef.current?.emit('hospital:setBeds', { unit, total, hospitalId });
  }, [token, requestHospitalDetail]);

  const setHospitalAmbulances = useCallback((total, hospitalId) => {
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      const targetId = user?.role === 'dinkes' ? hospitalId : user?.hospitalId;
      const scopeKey = user?.role === 'dinkes' ? 'dinkes' : `petugas:${user?.uid}`;
      getLocalEngine().setHospitalAmbulances(targetId, total, { recordUndo: true, scopeKey });
      requestHospitalDetail(targetId);
      return;
    }
    socketRef.current?.emit('hospital:setAmbulances', { total, hospitalId });
  }, [token, requestHospitalDetail]);

  const referPatientManual = useCallback((patientCode, toHospitalId, hospitalId) => {
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      const targetId = user?.role === 'dinkes' ? hospitalId : user?.hospitalId;
      const scopeKey = user?.role === 'dinkes' ? 'dinkes' : `petugas:${user?.uid}`;
      const res = getLocalEngine().referPatientManual(targetId, patientCode, toHospitalId, { recordUndo: true, scopeKey });
      if (res.error) pushToast({ id: `e_${Date.now()}`, severity: 'danger', message: res.error });
      else requestHospitalDetail(targetId);
      return;
    }
    socketRef.current?.emit('patient:referManual', { patientCode, toHospitalId, hospitalId });
  }, [token, pushToast, requestHospitalDetail]);

  const addManualIgdPatient = useCallback((triage, hospitalId) => {
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      const targetId = user?.role === 'dinkes' ? hospitalId : user?.hospitalId;
      getLocalEngine().addManualIgdPatient(targetId, triage);
      requestHospitalDetail(targetId);
      return;
    }
    socketRef.current?.emit('hospital:addIgdPatient', { triage, hospitalId });
  }, [token, requestHospitalDetail]);

  const registerWarga = useCallback((hospitalId, unit) => {
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      const res = getLocalEngine().registerWarga(user?.uid, hospitalId, unit);
      if (res.error) pushToast({ id: `e_${Date.now()}`, severity: 'danger', message: res.error });
      else setMyQueue(res.ticket);
      return;
    }
    socketRef.current?.emit('warga:register', { hospitalId, unit });
  }, [token, pushToast]);

  const cancelWarga = useCallback(() => {
    if (IS_STATIC_MODE) {
      const user = localVerifyToken(token);
      getLocalEngine().cancelWarga(user?.uid);
      setMyQueue(null);
      return;
    }
    socketRef.current?.emit('warga:cancel');
  }, [token]);

  return {
    connected,
    initialized,
    world,
    hospitalDetails,
    selectedPatientDetail,
    myQueue,
    toasts,
    pushToast,
    dismissToast,
    walkinsRef,
    ambulancesRef,
    sendControl,
    setBridge,
    setAutoReferral,
    triggerScenario,
    undoLastAction,
    resetSimulation,
    requestHospitalDetail,
    requestPatientDetail,
    clearPatientDetail,
    callNextPatient,
    dischargePatient,
    setHospitalBeds,
    setHospitalAmbulances,
    referPatientManual,
    addManualIgdPatient,
    registerWarga,
    cancelWarga,
  };
}
