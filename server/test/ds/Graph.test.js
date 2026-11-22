import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Graph } from '../../src/ds/Graph.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_PATH = path.resolve(__dirname, '../../../shared/world.seed.json');

function loadSeedGraph() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  const g = new Graph();
  for (const n of seed.nodes) {
    g.addNode(n.id, n);
  }
  for (const e of seed.edges) {
    const a = g.getNode(e.a);
    const b = g.getNode(e.b);
    const lengthPx = Math.hypot(b.x - a.x, b.y - a.y);
    const baseMinutes = lengthPx / 80;
    g.addEdge(e.id, e.a, e.b, baseMinutes, { ...e, lengthPx });
  }
  return g;
}

test('Graph kosong: isEmpty true, dijkstra dan bfs mengembalikan found false', () => {
  const g = new Graph();
  assert.equal(g.isEmpty(), true);
  assert.equal(g.size(), 0);
  assert.equal(g.dijkstra('a', 'b').found, false);
  assert.equal(g.bfs('a', 'b').found, false);
});

test('Graph satu simpul: dijkstra dan bfs ke diri sendiri jarak 0 dan lompatan 0', () => {
  const g = new Graph();
  g.addNode('rs_1');
  assert.deepEqual(g.dijkstra('rs_1', 'rs_1'), { found: true, path: ['rs_1'], edges: [], distance: 0 });
  assert.deepEqual(g.bfs('rs_1', 'rs_1'), { found: true, path: ['rs_1'], hops: 0 });
});

test('Graph dijkstra memilih bobot total terkecil dibanding jalur lebih sedikit lompatan', () => {
  const g = new Graph();
  for (const id of ['A', 'B', 'C', 'D']) g.addNode(id);
  g.addEdge('ab', 'A', 'B', 2);
  g.addEdge('bc', 'B', 'C', 2);
  g.addEdge('cd', 'C', 'D', 2); // total 6
  g.addEdge('ad', 'A', 'D', 10); // langsung tapi bobot 10

  const shortest = g.dijkstra('A', 'D');
  assert.equal(shortest.found, true);
  assert.deepEqual(shortest.path, ['A', 'B', 'C', 'D']);
  assert.equal(shortest.distance, 6);

  const minHops = g.bfs('A', 'D');
  assert.equal(minHops.found, true);
  assert.deepEqual(minHops.path, ['A', 'D']);
  assert.equal(minHops.hops, 1);
});

test('Graph dunia dua kota (seed): rute RS Tirta Raya ke RS Surya Utama melewati Jembatan Utara', () => {
  const g = loadSeedGraph();
  assert.equal(g.size(), 17);
  assert.equal(g.edgeCount(), 21);

  const res = g.dijkstra('rs_tirta_raya', 'rs_surya_utama');
  assert.equal(res.found, true);
  assert.ok(res.edges.includes('e_jembatan_utara'));
  assert.ok(res.distance > 0);
});

test('Graph tutup Jembatan Utara mengubah rute lewat Jembatan Selatan; tutup keduanya tidak ada rute', () => {
  const g = loadSeedGraph();

  g.setEdgeClosed('e_jembatan_utara', true);
  const rerouted = g.dijkstra('rs_tirta_raya', 'rs_surya_utama');
  assert.equal(rerouted.found, true);
  assert.ok(!rerouted.edges.includes('e_jembatan_utara'));
  assert.ok(rerouted.edges.includes('e_jembatan_selatan'));

  g.setEdgeClosed('e_jembatan_selatan', true);
  const blocked = g.dijkstra('rs_tirta_raya', 'rs_surya_utama');
  assert.equal(blocked.found, false);
  assert.equal(blocked.distance, Infinity);

  const blockedBfs = g.bfs('rs_tirta_raya', 'rs_surya_utama');
  assert.equal(blockedBfs.found, false);
});

test('Graph dijkstra mendukung weightFn dinamis (faktor kepadatan lalu lintas ambulans)', () => {
  const g = loadSeedGraph();
  const normal = g.dijkstra('rs_tirta_raya', 'rs_surya_utama');
  // Simulasikan kemacetan berat di Jembatan Utara (5x lebih lambat)
  const withTraffic = g.dijkstra('rs_tirta_raya', 'rs_surya_utama', (edge) =>
    edge.id === 'e_jembatan_utara' ? edge.weight * 5 : edge.weight
  );
  assert.equal(withTraffic.found, true);
  assert.ok(withTraffic.edges.includes('e_jembatan_selatan'));
  assert.ok(withTraffic.distance > normal.distance);
});
