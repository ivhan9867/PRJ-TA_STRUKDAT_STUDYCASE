import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import { APP_NAME } from '../../shared/constants.js';
import { SimulationEngine } from './sim/engine.js';
import { SIM_CONFIG, formatSimTime } from './sim/config.js';
import { runAbExperiment, runDataStructureBenchmarks } from './sim/experiments.js';
import { allSimplePaths } from './ds/recursion.js';
import { UserStore } from './auth/userStore.js';
import { createAuthMiddleware, requireHttpRole } from './auth/roleGuard.js';
import { registerSocketHandlers } from './socket/registerSocketHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_PATH = path.resolve(__dirname, '../../shared/world.seed.json');
const CLIENT_DIST_PATH = path.resolve(__dirname, '../../client/dist');
const HAS_CLIENT_DIST = fs.existsSync(path.join(CLIENT_DIST_PATH, 'index.html'));

const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

function loadWorldSeed() {
  const raw = fs.readFileSync(SEED_PATH, 'utf-8');
  const seed = JSON.parse(raw);

  const nodeMap = new Map(seed.nodes.map((node) => [node.id, node]));
  const edges = seed.edges.map((edge) => {
    const a = nodeMap.get(edge.a);
    const b = nodeMap.get(edge.b);
    const lengthPx = Math.round(Math.hypot(b.x - a.x, b.y - a.y) * 100) / 100;
    const baseMinutes = Math.round((lengthPx / SIM_CONFIG.ambulancePxPerMin) * 100) / 100;
    return {
      ...edge,
      lengthPx,
      baseMinutes,
      closed: false,
    };
  });

  return {
    appName: APP_NAME,
    cities: seed.cities,
    nodes: seed.nodes,
    edges,
    hospitals: seed.hospitals,
  };
}

const worldSeed = loadWorldSeed();
const userStore = new UserStore(worldSeed.hospitals.map((h) => h.id));
const requireAuth = createAuthMiddleware(userStore);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

if (HAS_CLIENT_DIST) {
  app.use(express.static(CLIENT_DIST_PATH));
}

app.get('/', (_req, res) => {
  if (HAS_CLIENT_DIST) {
    return res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
  }
  return res.type('html').send(`
    <!doctype html>
    <html lang="id">
      <head><meta charset="utf-8"><title>${APP_NAME} — Server</title></head>
      <body style="font-family:system-ui,sans-serif;padding:32px;color:#0F172A;background:#F5F7FA;">
        <h2>Server ${APP_NAME} aktif</h2>
        <p>Ini adalah alamat server backend (API &amp; Socket.IO).</p>
        <p>Untuk membuka tampilan aplikasi web, klik: <a href="${CLIENT_ORIGIN}" style="color:#2563EB;font-weight:600;">${CLIENT_ORIGIN}</a></p>
      </body>
    </html>
  `);
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    appName: APP_NAME,
    phase: 5,
    authMode: userStore.authMode,
    simTime: engine.simTime,
    paused: engine.paused,
    speed: engine.speed,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/world/seed', (_req, res) => {
  res.json(worldSeed);
});

// ==================== ENDPOINT AUTENTIKASI & PENGGUNA ====================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const result = userStore.login(email, password);
  if (!result) {
    return res.status(401).json({
      error: 'Email atau kata sandi salah. Periksa lagi atau pilih Daftar.',
    });
  }
  return res.json(result);
});

app.post('/api/auth/register', (req, res) => {
  const { displayName, email, password } = req.body || {};
  const result = userStore.register({ displayName, email, password });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json(result);
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user, authMode: userStore.authMode });
});

app.get('/api/users', requireAuth, requireHttpRole('dinkes'), (_req, res) => {
  res.json({ users: userStore.listUsers() });
});

app.patch('/api/users/:uid', requireAuth, requireHttpRole('dinkes'), (req, res) => {
  const { role, hospitalId } = req.body || {};
  const result = userStore.updateUserRole(req.user, req.params.uid, { role, hospitalId });
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  // Sinkronkan perubahan peran secara real-time ke tab pengguna yang sedang aktif
  for (const s of io.sockets.sockets.values()) {
    if (s.data?.user?.uid === result.user.uid) {
      s.data.user = result.user;
      s.emit('profile:updated', result.user);
    }
  }
  return res.json({ user: result.user });
});

// ==================== ANALITIK & MODE AKADEMIK (FASE 7) ====================

let latestExperiment = null;
let academicBusy = false;

app.get('/api/analytics', requireAuth, requireHttpRole('dinkes'), (_req, res) => {
  const tick = engine.getTickPayload();
  const summary = engine.metrics.getSummary(tick.kpi.bedPct);
  const waitByHospital = engine.metrics.getHospitalWaitAverages();

  res.json({
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
  });
});

app.get('/api/academic/live', requireAuth, (_req, res) => {
  const tick = engine.getTickPayload();
  const sampleRs = engine.hospitals.get('rs_tirta_raya');
  const firstPatientCode = Array.from(engine.patientRegistry.keys()).slice(-1)[0];
  const samplePatient = firstPatientCode ? engine.getPatientDetail(firstPatientCode) : null;

  res.json({
    authMode: userStore.authMode,
    undoStackDinkes: engine.undoManager.getDescriptions('dinkes'),
    sampleHospital: sampleRs
      ? {
          id: sampleRs.id,
          name: sampleRs.name,
          igdHeap: sampleRs.igdQueue.toHeapArray().slice(0, 12).map((p) => ({ code: p.code, triage: p.triage })),
          poliQueue: sampleRs.poliQueue.toArray().slice(0, 10).map((p) => ({ code: p.code })),
        }
      : null,
    sampleJourney: samplePatient,
    regionTree: engine.regionTree.toArray(),
    regionAggregation: {
      wilayah: engine.getRegionAggregation('wilayah'),
      surya: engine.getRegionAggregation('surya'),
      tirta: engine.getRegionAggregation('tirta'),
    },
    bridges: tick.bridges,
    maskedUsers: userStore.listUsers().slice(0, 4).map((u) => ({
      uid: u.uid,
      role: u.role,
      hospitalId: u.hospitalId,
      emailMasked: u.email.replace(/(^.).*(@.*$)/, '$1***$2'),
    })),
  });
});

app.post('/api/academic/graph-query', requireAuth, (req, res) => {
  const { fromId, toId } = req.body || {};
  const dijkstra = engine.graph.dijkstra(fromId, toId, (e) => engine._edgeWeight(e));
  const bfs = engine.graph.bfs(fromId, toId);
  const allPaths = allSimplePaths(engine.graph, fromId, toId, 10).slice(0, 8);
  res.json({
    dijkstra: {
      ...dijkstra,
      distanceMin: dijkstra.found ? Math.round(dijkstra.distance * 10) / 10 : null,
    },
    bfs,
    allPaths,
  });
});

app.post('/api/academic/experiment', requireAuth, (req, res) => {
  if (academicBusy) {
    return res.status(429).json({ error: 'Eksperimen atau benchmark lain sedang berjalan. Tunggu sebentar.' });
  }
  academicBusy = true;
  try {
    const { scenario = 'wabah', days = 3, runs = 5 } = req.body || {};
    const result = runAbExperiment(worldSeed, { scenario, days, runs });
    latestExperiment = result;
    return res.json(result);
  } finally {
    academicBusy = false;
  }
});

app.post('/api/academic/benchmark', requireAuth, (_req, res) => {
  if (academicBusy) {
    return res.status(429).json({ error: 'Eksperimen atau benchmark lain sedang berjalan. Tunggu sebentar.' });
  }
  academicBusy = true;
  try {
    const result = runDataStructureBenchmarks();
    return res.json(result);
  } finally {
    academicBusy = false;
  }
});

// ==================== MESIN SIMULASI & SOCKET.IO ====================

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});

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

const engine = new SimulationEngine(worldSeed, {
  seed: SIM_CONFIG.defaultSeed,
  onEvent: (name, payload) => {
    const msPerTick = 1000 / engine.speed;

    if (name === 'walkin:spawn') {
      io.emit('walkin:spawn', {
        ...payload,
        durationMs: Math.max(900, Math.round(payload.travelMin * msPerTick)),
      });
      return;
    }

    if (name === 'ambulance:dispatch') {
      io.emit('ambulance:dispatch', {
        ...payload,
        durationMs: Math.max(1200, Math.round(payload.travelMin * msPerTick)),
      });
      return;
    }

    if (name === 'ambulance:return') {
      io.emit('ambulance:return', {
        ...payload,
        durationMs: Math.max(1000, Math.round(payload.travelMin * msPerTick)),
      });
      return;
    }

    if (name === 'ambulance:arrive') {
      io.emit('ambulance:arrive', payload);
      return;
    }

    if (name === 'log:event' && IMPORTANT_LOG_TYPES.has(payload.type)) {
      io.emit('log:event', payload);
    }
  },
});

registerSocketHandlers(io, { engine, userStore });

// Loop simulasi berbasis akumulator (mendukung 1x, 5x, 10x tanpa drift)
let lastStepWallMs = Date.now();
let tickAccumulator = 0;

setInterval(() => {
  const now = Date.now();
  const dtSec = Math.min((now - lastStepWallMs) / 1000, 0.5);
  lastStepWallMs = now;

  if (engine.paused) return;

  tickAccumulator += dtSec * engine.speed;
  const maxTicksPerCycle = 12;
  let processed = 0;
  while (tickAccumulator >= 1 && processed < maxTicksPerCycle) {
    engine.step();
    tickAccumulator -= 1;
    processed += 1;
  }
}, 50);

// Siaran ringkasan keadaan tiap 250 ms
setInterval(() => {
  if (io.engine.clientsCount === 0) return;
  io.emit('world:tick', engine.getTickPayload());
}, SIM_CONFIG.broadcastIntervalMs);

server.listen(PORT, () => {
  console.log(`[${APP_NAME}] Server berjalan di http://localhost:${PORT} (mode: ${userStore.authMode})`);
});
