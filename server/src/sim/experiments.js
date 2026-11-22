import { performance } from 'node:perf_hooks';
import { SimulationEngine } from './engine.js';
import { LinkedList, Graph } from '../ds/index.js';

function meanAndSd(values) {
  if (!values.length) return { mean: 0, sd: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return {
    mean: Math.round(mean * 100) / 100,
    sd: Math.round(Math.sqrt(variance) * 100) / 100,
  };
}

/**
 * Menjalankan eksperimen A/B deterministik (Rujukan otomatis: Aktif vs Nonaktif)
 * pada N seed identik (seed 1..runs) tanpa animasi.
 */
export function runAbExperiment(worldSeed, { scenario = 'wabah', days = 3, runs = 5 } = {}) {
  const safeDays = Math.max(1, Math.min(5, Number(days) || 3));
  const safeRuns = Math.max(1, Math.min(10, Number(runs) || 5));
  const totalTicks = safeDays * 1440;

  const runSingle = (seed, autoReferral) => {
    const engine = new SimulationEngine(worldSeed, { seed });
    engine.setAutoReferral(autoReferral, { recordUndo: false });

    if (scenario === 'jembatan_tutup') {
      engine.setBridgeClosed('e_jembatan_utara', true, { recordUndo: false });
    }

    for (let t = 0; t < totalTicks; t++) {
      // Picu wabah di Kota Tirta pada jam ke-2 hari pertama (dan hari kedua jika >= 2 hari)
      if ((scenario === 'wabah' || scenario === 'jembatan_tutup') && (t === 120 || t === 1560)) {
        engine.triggerOutbreak('tirta');
      }
      engine.step();
    }

    const agg = engine.getRegionAggregation('wilayah');
    const finalBedPct = agg.bedsTotal > 0 ? Math.round((agg.bedsUsed / agg.bedsTotal) * 100) : 0;
    return engine.metrics.getSummary(finalBedPct);
  };

  const perSeed = [];
  const activeMetrics = {
    waitAvg: [],
    waitGawatAvg: [],
    peakBedPct: [],
    referralsTotal: [],
    unreachableTotal: [],
    referralDurationAvg: [],
  };
  const inactiveMetrics = {
    waitAvg: [],
    waitGawatAvg: [],
    peakBedPct: [],
    referralsTotal: [],
    unreachableTotal: [],
    referralDurationAvg: [],
  };

  for (let seed = 1; seed <= safeRuns; seed++) {
    const on = runSingle(seed, true);
    const off = runSingle(seed, false);

    perSeed.push({ seed, active: on, inactive: off });

    for (const key of Object.keys(activeMetrics)) {
      activeMetrics[key].push(on[key]);
      inactiveMetrics[key].push(off[key]);
    }
  }

  const summary = {
    active: {},
    inactive: {},
  };
  for (const key of Object.keys(activeMetrics)) {
    summary.active[key] = meanAndSd(activeMetrics[key]);
    summary.inactive[key] = meanAndSd(inactiveMetrics[key]);
  }

  return {
    scenario,
    days: safeDays,
    runs: safeRuns,
    summary,
    perSeed,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Dijkstra dengan pencarian linear O(V^2) sebagai pembanding benchmark terhadap
 * Dijkstra berbasis Binary Min-Heap O((V + E) log V).
 */
function dijkstraLinear(graph, startId, endId) {
  const { nodes } = graph.toArray();
  const dist = new Map();
  const visited = new Set();
  for (const n of nodes) dist.set(n.id, Infinity);
  dist.set(startId, 0);

  for (let iter = 0; iter < nodes.length; iter++) {
    let bestId = null;
    let bestDist = Infinity;
    for (const [id, d] of dist.entries()) {
      if (!visited.has(id) && d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    if (bestId === null || bestId === endId) break;
    visited.add(bestId);

    for (const { to, weight } of graph.neighbors(bestId)) {
      if (visited.has(to)) continue;
      const alt = bestDist + weight;
      if (alt < dist.get(to)) {
        dist.set(to, alt);
      }
    }
  }
  return dist.get(endId);
}

function buildSyntheticGraph(nodeCount) {
  const g = new Graph();
  for (let i = 0; i < nodeCount; i++) {
    g.addNode(`n_${i}`);
  }
  let edgeId = 0;
  for (let i = 0; i < nodeCount - 1; i++) {
    g.addEdge(`e_${++edgeId}`, `n_${i}`, `n_${i + 1}`, (i % 7) + 1);
    if (i + 5 < nodeCount) {
      g.addEdge(`e_${++edgeId}`, `n_${i}`, `n_${i + 5}`, ((i * 3) % 9) + 2);
    }
  }
  return g;
}

/**
 * Menjalankan 2 benchmark struktur data sesuai 02_UI_SPEC.md bagian 8.2:
 * 1. Tambah di depan: LinkedList.prepend O(1) vs Array.unshift O(n) untuk n = 1.000, 10.000, 100.000
 * 2. Dijkstra Heap O((V+E) log V) vs Dijkstra Linear O(V^2) untuk n = 100, 1.000, 5.000 simpul
 */
export function runDataStructureBenchmarks() {
  const rows = [];

  // Benchmark 1: Tambah di depan
  for (const n of [1000, 10000, 100000]) {
    const ll = new LinkedList();
    const t0 = performance.now();
    for (let i = 0; i < n; i++) ll.prepend(i);
    const llMs = Math.round((performance.now() - t0) * 100) / 100;

    const arr = [];
    const t1 = performance.now();
    for (let i = 0; i < n; i++) arr.unshift(i);
    const arrMs = Math.round((performance.now() - t1) * 100) / 100;

    rows.push({
      group: 'Tambah di depan',
      n,
      fastLabel: 'LinkedList.prepend O(1)',
      fastMs: llMs,
      slowLabel: 'Array.unshift O(n)',
      slowMs: arrMs,
    });
  }

  // Benchmark 2: Dijkstra Heap vs Linear
  for (const n of [100, 1000, 5000]) {
    const g = buildSyntheticGraph(n);
    const start = 'n_0';
    const end = `n_${n - 1}`;

    const t0 = performance.now();
    g.dijkstra(start, end);
    const heapMs = Math.round((performance.now() - t0) * 100) / 100;

    const t1 = performance.now();
    dijkstraLinear(g, start, end);
    const linearMs = Math.round((performance.now() - t1) * 100) / 100;

    rows.push({
      group: 'Dijkstra rute tercepat',
      n,
      fastLabel: 'Binary Heap O((V+E) log V)',
      fastMs: heapMs,
      slowLabel: 'Pencarian linear O(V^2)',
      slowMs: linearMs,
    });
  }

  return {
    rows,
    completedAt: new Date().toISOString(),
  };
}
