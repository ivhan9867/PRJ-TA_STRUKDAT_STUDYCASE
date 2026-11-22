import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import worldSeed from '@shared/world.seed.json';

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
    socketRef.current?.emit('sim:control', { action, value });
  }, []);

  const setBridge = useCallback((edgeId, closed) => {
    socketRef.current?.emit('bridge:set', { edgeId, closed });
  }, []);

  const setAutoReferral = useCallback((autoReferral) => {
    socketRef.current?.emit('policy:set', { autoReferral });
  }, []);

  const triggerScenario = useCallback((type, payload = {}) => {
    socketRef.current?.emit('scenario:trigger', { type, ...payload });
  }, []);

  const undoLastAction = useCallback(() => {
    socketRef.current?.emit('undo');
  }, []);

  const resetSimulation = useCallback(() => {
    socketRef.current?.emit('sim:reset');
  }, []);

  const requestHospitalDetail = useCallback((hospitalId) => {
    if (!hospitalId) return;
    socketRef.current?.emit('hospital:request', { hospitalId });
  }, []);

  const requestPatientDetail = useCallback((patientCode) => {
    if (!patientCode) return;
    socketRef.current?.emit('patient:request', { patientCode });
  }, []);

  const clearPatientDetail = useCallback(() => {
    setSelectedPatientDetail(null);
  }, []);

  // --- Aksi Petugas RS & Dinkes Super Admin & Warga ---
  const callNextPatient = useCallback((unit, hospitalId) => {
    socketRef.current?.emit('hospital:callNext', { unit, hospitalId });
  }, []);

  const dischargePatient = useCallback((patientCode, hospitalId) => {
    socketRef.current?.emit('hospital:discharge', { patientCode, hospitalId });
  }, []);

  const setHospitalBeds = useCallback((unit, total, hospitalId) => {
    socketRef.current?.emit('hospital:setBeds', { unit, total, hospitalId });
  }, []);

  const setHospitalAmbulances = useCallback((total, hospitalId) => {
    socketRef.current?.emit('hospital:setAmbulances', { total, hospitalId });
  }, []);

  const referPatientManual = useCallback((patientCode, toHospitalId, hospitalId) => {
    socketRef.current?.emit('patient:referManual', { patientCode, toHospitalId, hospitalId });
  }, []);

  const addManualIgdPatient = useCallback((triage, hospitalId) => {
    socketRef.current?.emit('hospital:addIgdPatient', { triage, hospitalId });
  }, []);

  const registerWarga = useCallback((hospitalId, unit) => {
    socketRef.current?.emit('warga:register', { hospitalId, unit });
  }, []);

  const cancelWarga = useCallback(() => {
    socketRef.current?.emit('warga:cancel');
  }, []);

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
