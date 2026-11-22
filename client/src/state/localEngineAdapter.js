import worldSeed from '@shared/world.seed.json';
import { SimulationEngine } from '@server-sim/engine.js';
import { SIM_CONFIG, formatSimTime } from '@server-sim/config.js';
import { runAbExperiment, runDataStructureBenchmarks } from '@server-sim/experiments.js';
import { allSimplePaths } from '@server-ds/recursion.js';

export const IS_STATIC_MODE = import.meta.env.VITE_STATIC_MODE === 'true';

const IMPORTANT_LOG_TYPES = new Set([
  'rujukan',
  'rs_penuh',
  'wabah',
  'kecelakaan',
  'jembatan',
  'tidak_ada_rute',
  'kebijakan',
  'undo',
]);

const STATIC_USERS = [
  { uid: 'demo_dinkes_1', displayName: 'Dinas Kesehatan', shortName: 'Dinkes', email: 'dinkes@simpulsehat.demo', role: 'dinkes', hospitalId: null },
  { uid: 'demo_petugas_surya', displayName: 'Petugas RS Surya Utama', shortName: 'Petugas Surya', email: 'petugas.surya@simpulsehat.demo', role: 'petugas', hospitalId: 'rs_surya_utama' },
  { uid: 'demo_petugas_tirta', displayName: 'Petugas RS Tirta Raya', shortName: 'Petugas Tirta', email: 'petugas.tirta@simpulsehat.demo', role: 'petugas', hospitalId: 'rs_tirta_raya' },
  { uid: 'demo_petugas_selatan', displayName: 'Petugas RS Tirta Selatan', shortName: 'Petugas Selatan', email: 'petugas.selatan@simpulsehat.demo', role: 'petugas', hospitalId: 'rs_tirta_selatan' },
  { uid: 'demo_warga_1', displayName: 'Budi Santoso', shortName: 'Budi', email: 'warga@simpulsehat.demo', role: 'warga', hospitalId: null },
];

let singletonEngine = null;
let latestExperiment = null;
const listeners = new Set();
let loopStarted = false;
let currentUser = null;

function emitLocal(event, payload) {
  for (const fn of listeners) {
    fn(event, payload);
  }
}

export function getLocalEngine() {
  if (!singletonEngine) {
    singletonEngine = new SimulationEngine(worldSeed, {
      seed: SIM_CONFIG.defaultSeed,
      onEvent: (name, payload) => {
        const msPerTick = 1000 / singletonEngine.speed;
        if (name === 'walkin:spawn') {
          emitLocal('walkin:spawn', { ...payload, durationMs: Math.max(900, Math.round(payload.travelMin * msPerTick)) });
        } else if (name === 'ambulance:dispatch') {
          emitLocal('ambulance:dispatch', { ...payload, durationMs: Math.max(1200, Math.round(payload.travelMin * msPerTick)) });
        } else if (name === 'ambulance:return') {
          emitLocal('ambulance:return', { ...payload, durationMs: Math.max(1000, Math.round(payload.travelMin * msPerTick)) });
        } else if (name === 'ambulance:arrive') {
          emitLocal('ambulance:arrive', payload);
        } else if (name === 'log:event' && IMPORTANT_LOG_TYPES.has(payload.type)) {
          emitLocal('log:event', payload);
        }
      },
    });
  }

  if (!loopStarted && typeof window !== 'undefined') {
    loopStarted = true;
    let lastWall = performance.now();
    let acc = 0;

    window.setInterval(() => {
      const now = performance.now();
      const dtSec = Math.min((now - lastWall) / 1000, 0.5);
      lastWall = now;
      if (singletonEngine.paused) return;
      acc += dtSec * singletonEngine.speed;
      let steps = 0;
      while (acc >= 1 && steps < 12) {
        singletonEngine.step();
        acc -= 1;
        steps += 1;
      }
    }, 50);

    window.setInterval(() => {
      emitLocal('world:tick', singletonEngine.getTickPayload());
      if (currentUser?.role === 'warga') {
        emitLocal('queue:me', singletonEngine.getWargaQueueStatus(currentUser.uid));
      }
    }, SIM_CONFIG.broadcastIntervalMs);
  }

  return singletonEngine;
}

export function subscribeLocalEngine(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLocalActiveUser(user) {
  currentUser = user;
}

export function localLogin(email, password) {
  const norm = String(email || '').trim().toLowerCase();
  const found = STATIC_USERS.find((u) => u.email.toLowerCase() === norm);
  if (!found || password !== 'demo1234') {
    return { error: 'Email atau kata sandi salah. Periksa lagi atau pilih Daftar.' };
  }
  currentUser = found;
  return { user: found, token: `static.${found.uid}` };
}

export function localRegister({ displayName, email, password }) {
  const cleanName = String(displayName || '').trim();
  const norm = String(email || '').trim().toLowerCase();
  if (!cleanName || !norm || String(password || '').length < 6) {
    return { error: 'Isi nama, email valid, dan kata sandi minimal 6 karakter.' };
  }
  if (STATIC_USERS.some((u) => u.email.toLowerCase() === norm)) {
    return { error: 'Email tersebut sudah terdaftar. Silakan masuk.' };
  }
  const user = {
    uid: `static_${Date.now()}`,
    displayName: cleanName,
    shortName: cleanName.split(' ')[0],
    email: norm,
    role: 'warga',
    hospitalId: null,
  };
  STATIC_USERS.push(user);
  currentUser = user;
  return { user, token: `static.${user.uid}` };
}

export function localVerifyToken(token) {
  if (!token || !token.startsWith('static.')) return null;
  const uid = token.slice(7);
  const found = STATIC_USERS.find((u) => u.uid === uid) || null;
  currentUser = found;
  return found;
}

export function localListUsers() {
  return STATIC_USERS.map((u) => ({ ...u }));
}

export function localUpdateUserRole(actor, targetUid, { role, hospitalId }) {
  if (!actor || actor.role !== 'dinkes') return { error: 'Peran Anda tidak dapat melakukan ini.' };
  if (actor.uid === targetUid) return { error: 'Anda tidak bisa mengubah peran sendiri.' };
  const target = STATIC_USERS.find((u) => u.uid === targetUid);
  if (!target) return { error: 'Pengguna tidak ditemukan.' };
  target.role = role;
  target.hospitalId = role === 'petugas' ? hospitalId || null : null;
  return { user: { ...target } };
}

export function localGetAnalytics() {
  const engine = getLocalEngine();
  const tick = engine.getTickPayload();
  const summary = engine.metrics.getSummary(tick.kpi.bedPct);
  const waitByHospital = engine.metrics.getHospitalWaitAverages();
  return {
    simTime: engine.simTime,
    simTimeText: formatSimTime(engine.simTime),
    kpi: {
      waitAvg: summary.waitAvg,
      waitGawatAvg: summary.waitGawatAvg,
      bedPct: summary.bedPct,
      referralsToday: summary.referralsToday,
      unreachableToday: summary.unreachableToday,
    },
    series: engine.metrics.series,
    waitByHospital: worldSeed.hospitals.map((h) => ({
      id: h.id,
      name: h.name.replace('RS ', ''),
      fullName: h.name,
      waitMin: waitByHospital[h.id] || 0,
    })),
    events: engine.globalLog.toArray().slice(-30).reverse(),
    latestExperiment,
  };
}

export function localGetAcademicLive() {
  const engine = getLocalEngine();
  const tick = engine.getTickPayload();
  const sampleRs = engine.hospitals.get('rs_tirta_raya');
  const firstPatientCode = Array.from(engine.patientRegistry.keys()).slice(-1)[0];
  return {
    authMode: 'static-pages',
    undoStackDinkes: engine.undoManager.getDescriptions('dinkes'),
    sampleHospital: sampleRs
      ? {
          id: sampleRs.id,
          name: sampleRs.name,
          igdHeap: sampleRs.igdQueue.toHeapArray().slice(0, 12).map((p) => ({ code: p.code, triage: p.triage })),
          poliQueue: sampleRs.poliQueue.toArray().slice(0, 10).map((p) => ({ code: p.code })),
        }
      : null,
    sampleJourney: firstPatientCode ? engine.getPatientDetail(firstPatientCode) : null,
    regionTree: engine.regionTree.toArray(),
    regionAggregation: {
      wilayah: engine.getRegionAggregation('wilayah'),
      surya: engine.getRegionAggregation('surya'),
      tirta: engine.getRegionAggregation('tirta'),
    },
    bridges: tick.bridges,
    maskedUsers: STATIC_USERS.slice(0, 4).map((u) => ({
      uid: u.uid,
      role: u.role,
      hospitalId: u.hospitalId,
      emailMasked: u.email.replace(/(^.).*(@.*$)/, '$1***$2'),
    })),
  };
}

export function localGraphQuery(fromId, toId) {
  const engine = getLocalEngine();
  const dijkstra = engine.graph.dijkstra(fromId, toId, (e) => engine._edgeWeight(e));
  const bfs = engine.graph.bfs(fromId, toId);
  const allPaths = allSimplePaths(engine.graph, fromId, toId, 10).slice(0, 8);
  return {
    dijkstra: { ...dijkstra, distanceMin: dijkstra.found ? Math.round(dijkstra.distance * 10) / 10 : null },
    bfs,
    allPaths,
  };
}

export function localRunExperiment(params) {
  latestExperiment = runAbExperiment(worldSeed, params);
  return latestExperiment;
}

export function localRunBenchmark() {
  return runDataStructureBenchmarks();
}
