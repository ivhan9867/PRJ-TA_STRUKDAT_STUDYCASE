import test from 'node:test';
import assert from 'node:assert/strict';
import { Tree, TreeNode } from '../../src/ds/Tree.js';
import { Graph } from '../../src/ds/Graph.js';
import {
  aggregate,
  findPath,
  countNodes,
  flatten,
  allSimplePaths,
} from '../../src/ds/recursion.js';

function buildTree() {
  const root = new TreeNode({ id: 'wilayah', name: 'Wilayah Simpul Sehat', level: 'wilayah' });
  const tree = new Tree(root);
  tree.addChild('wilayah', new TreeNode({ id: 'surya', name: 'Surya', level: 'kota' }));
  tree.addChild('wilayah', new TreeNode({ id: 'tirta', name: 'Tirta', level: 'kota' }));
  tree.addChild('surya', new TreeNode({ id: 'rs_a', name: 'RS A', level: 'rs' }));
  tree.addChild('tirta', new TreeNode({ id: 'rs_b', name: 'RS B', level: 'rs' }));
  tree.addChild('rs_a', new TreeNode({ id: 'rs_a:inap', name: 'Rawat inap', level: 'unit', data: { used: 10, total: 30 } }));
  tree.addChild('rs_a', new TreeNode({ id: 'rs_a:icu', name: 'ICU', level: 'unit', data: { used: 2, total: 6 } }));
  tree.addChild('rs_b', new TreeNode({ id: 'rs_b:inap', name: 'Rawat inap', level: 'unit', data: { used: 20, total: 40 } }));
  return tree;
}

function buildBridgeGraph() {
  const g = new Graph();
  for (const id of ['S', 'U1', 'U2', 'B1', 'B2', 'T']) g.addNode(id);
  g.addEdge('e1', 'S', 'U1', 2);
  g.addEdge('j_utara', 'U1', 'U2', 3, { bridge: true });
  g.addEdge('e2', 'U2', 'T', 2);
  g.addEdge('e3', 'S', 'B1', 2);
  g.addEdge('j_selatan', 'B1', 'B2', 3, { bridge: true });
  g.addEdge('e4', 'B2', 'T', 2);
  return g;
}

test('aggregate menjumlahkan kapasitas dan terisi secara rekursif dari daun ke akar', () => {
  const tree = buildTree();
  const total = aggregate(
    tree.root,
    (leaf) => ({ used: leaf.data.used || 0, total: leaf.data.total || 0 }),
    (children) => children.reduce((acc, c) => ({ used: acc.used + c.used, total: acc.total + c.total }), { used: 0, total: 0 })
  );
  assert.deepEqual(total, { used: 32, total: 76 });
});

test('findPath menghasilkan jalur breadcrumb lengkap dari akar ke unit daun', () => {
  const tree = buildTree();
  const path = findPath(tree, 'rs_a:icu').map((n) => n.name);
  assert.deepEqual(path, ['Wilayah Simpul Sehat', 'Surya', 'RS A', 'ICU']);
});

test('findPath mengembalikan array kosong jika simpul tidak ditemukan atau pohon kosong', () => {
  const tree = buildTree();
  assert.deepEqual(findPath(tree, 'tidak_ada'), []);
  assert.deepEqual(findPath(new Tree(), 'wilayah'), []);
});

test('countNodes dan flatten konsisten untuk pohon berisi maupun null', () => {
  const tree = buildTree();
  assert.equal(countNodes(null), 0);
  assert.deepEqual(flatten(null), []);
  assert.equal(countNodes(tree.root), 8);
  assert.equal(flatten(tree.root).length, 8);
});

test('allSimplePaths menemukan semua rute lintas dua jembatan dan mengabaikan jembatan tertutup', () => {
  const g = buildBridgeGraph();
  const pathsOpen = allSimplePaths(g, 'S', 'T', 12);
  assert.equal(pathsOpen.length, 2);

  g.setEdgeClosed('j_utara', true);
  const pathsOneClosed = allSimplePaths(g, 'S', 'T', 12);
  assert.equal(pathsOneClosed.length, 1);
  assert.deepEqual(pathsOneClosed[0], ['S', 'B1', 'B2', 'T']);

  g.setEdgeClosed('j_selatan', true);
  const pathsBothClosed = allSimplePaths(g, 'S', 'T', 12);
  assert.deepEqual(pathsBothClosed, []);
});

test('allSimplePaths menghormati batas maxHops', () => {
  const g = buildBridgeGraph();
  // Jalur S->U1->U2->T membutuhkan 3 lompatan, sehingga maxHops=2 tidak menemukan jalur
  assert.deepEqual(allSimplePaths(g, 'S', 'T', 2), []);
  assert.equal(allSimplePaths(g, 'S', 'T', 3).length, 2);
});
