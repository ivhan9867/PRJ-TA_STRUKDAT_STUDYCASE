import test from 'node:test';
import assert from 'node:assert/strict';
import { Tree, TreeNode } from '../../src/ds/Tree.js';

function buildSampleRegionTree() {
  const root = new TreeNode({ id: 'wilayah', name: 'Wilayah Simpul Sehat', level: 'wilayah' });
  const tree = new Tree(root);

  const surya = new TreeNode({ id: 'surya', name: 'Kota Surya', level: 'kota' });
  const tirta = new TreeNode({ id: 'tirta', name: 'Kota Tirta', level: 'kota' });
  tree.addChild('wilayah', surya);
  tree.addChild('wilayah', tirta);

  const rs1 = new TreeNode({ id: 'rs_surya_utama', name: 'RS Surya Utama', level: 'rs' });
  const rs2 = new TreeNode({ id: 'rs_tirta_raya', name: 'RS Tirta Raya', level: 'rs' });
  tree.addChild('surya', rs1);
  tree.addChild('tirta', rs2);

  tree.addChild('rs_surya_utama', new TreeNode({ id: 'rs_surya_utama:inap', name: 'Rawat inap', level: 'unit', data: { used: 20, total: 60 } }));
  tree.addChild('rs_surya_utama', new TreeNode({ id: 'rs_surya_utama:icu', name: 'ICU', level: 'unit', data: { used: 4, total: 12 } }));
  tree.addChild('rs_tirta_raya', new TreeNode({ id: 'rs_tirta_raya:inap', name: 'Rawat inap', level: 'unit', data: { used: 45, total: 55 } }));

  return tree;
}

test('Tree kosong: isEmpty true, size 0, height 0, find null', () => {
  const tree = new Tree();
  assert.equal(tree.isEmpty(), true);
  assert.equal(tree.size(), 0);
  assert.equal(tree.height(), 0);
  assert.equal(tree.find('wilayah'), null);
  assert.deepEqual(tree.levelOrder(), []);
});

test('Tree satu simpul akar: size 1, height 1', () => {
  const tree = new Tree(new TreeNode({ id: 'wilayah', name: 'Wilayah', level: 'wilayah' }));
  assert.equal(tree.isEmpty(), false);
  assert.equal(tree.size(), 1);
  assert.equal(tree.height(), 1);
  assert.equal(tree.find('wilayah')?.name, 'Wilayah');
});

test('Tree find menemukan simpul di kedalaman berapa pun dan null jika tidak ada', () => {
  const tree = buildSampleRegionTree();
  assert.equal(tree.find('rs_surya_utama:icu')?.name, 'ICU');
  assert.equal(tree.find('rs_tirta_raya')?.parent.id, 'tirta');
  assert.equal(tree.find('tidak_ada'), null);
});

test('Tree traversal preorder, postorder, dan levelOrder menghasilkan urutan yang tepat', () => {
  const tree = buildSampleRegionTree();
  const pre = tree.preorder().map((n) => n.id);
  const post = tree.postorder().map((n) => n.id);
  const lvl = tree.levelOrder().map((n) => n.id);

  assert.equal(pre[0], 'wilayah');
  assert.equal(post[post.length - 1], 'wilayah');
  assert.deepEqual(lvl.slice(0, 3), ['wilayah', 'surya', 'tirta']);
  assert.equal(tree.size(), 8);
  assert.equal(tree.height(), 4);
});

test('Tree addChild melempar error jika parentId tidak ditemukan', () => {
  const tree = buildSampleRegionTree();
  assert.throws(() => {
    tree.addChild('induk_gaib', new TreeNode({ id: 'x', name: 'X' }));
  });
});

test('Tree toArray menyertakan informasi parentId dan childCount', () => {
  const tree = buildSampleRegionTree();
  const flat = tree.toArray();
  const rootItem = flat.find((x) => x.id === 'wilayah');
  assert.equal(rootItem.parentId, null);
  assert.equal(rootItem.childCount, 2);
});
