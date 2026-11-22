import { Queue } from './Queue.js';

/**
 * Simpul untuk pohon n-ary (RegionTree).
 */
export class TreeNode {
  constructor({ id, name, level = 'node', data = {} }) {
    this.id = id;
    this.name = name;
    this.level = level;
    this.data = data;
    this.children = [];
    this.parent = null;
  }

  addChild(childNode) {
    childNode.parent = this;
    this.children.push(childNode);
    return childNode;
  }

  isLeaf() {
    return this.children.length === 0;
  }
}

/**
 * Tree (Pohon N-ary) untuk menyusun hierarki wilayah kesehatan.
 *
 * Fungsi di aplikasi:
 *   RegionTree menyusun data secara bertingkat: Wilayah -> Kota -> Rumah Sakit -> Unit (IGD, Poli, Rawat inap, ICU).
 * Alasan dipilih:
 *   Data administratif layanan kesehatan bersifat hierarkis alami, sehingga
 *   agregasi kapasitas per kota atau seluruh wilayah bisa dihitung otomatis dari daun ke akar.
 * Kelebihan & keterbatasan:
 *   (+) Sangat rapi untuk agregasi bertingkat dan traversal (preorder, postorder, level-order).
 *   (-) Pencarian simpul berdasarkan id membutuhkan penelusuran O(n) jika tidak diindeks tambahan.
 */
export class Tree {
  constructor(root = null) {
    this.root = root;
  }

  /** Menambahkan childNode ke simpul dengan id === parentId. Kompleksitas: O(n). */
  addChild(parentId, childNode) {
    const parent = this.find(parentId);
    if (!parent) {
      throw new Error(`Simpul induk "${parentId}" tidak ditemukan di pohon.`);
    }
    return parent.addChild(childNode);
  }

  /** Mencari simpul berdasarkan id secara rekursif (DFS). Kompleksitas: O(n). */
  find(id, node = this.root) {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = this.find(id, child);
      if (found) return found;
    }
    return null;
  }

  /** Traversal preorder (akar dulu, lalu anak-anak). Kompleksitas: O(n). */
  preorder(visit) {
    const result = [];
    const walk = (node) => {
      if (!node) return;
      result.push(node);
      if (visit) visit(node);
      for (const child of node.children) {
        walk(child);
      }
    };
    walk(this.root);
    return result;
  }

  /** Traversal postorder (anak-anak dulu, lalu akar — dasar agregasi). Kompleksitas: O(n). */
  postorder(visit) {
    const result = [];
    const walk = (node) => {
      if (!node) return;
      for (const child of node.children) {
        walk(child);
      }
      result.push(node);
      if (visit) visit(node);
    };
    walk(this.root);
    return result;
  }

  /** Traversal level-order (BFS per tingkat, memakai Queue buatan sendiri). Kompleksitas: O(n). */
  levelOrder(visit) {
    const result = [];
    if (!this.root) return result;

    const q = new Queue();
    q.enqueue(this.root);

    while (!q.isEmpty()) {
      const curr = q.dequeue();
      result.push(curr);
      if (visit) visit(curr);
      for (const child of curr.children) {
        q.enqueue(child);
      }
    }
    return result;
  }

  /** Tinggi pohon (pohon kosong = 0, hanya akar = 1). Kompleksitas: O(n). */
  height(node = this.root) {
    if (!node) return 0;
    if (node.children.length === 0) return 1;
    let maxChildHeight = 0;
    for (const child of node.children) {
      const h = this.height(child);
      if (h > maxChildHeight) maxChildHeight = h;
    }
    return 1 + maxChildHeight;
  }

  /** Jumlah seluruh simpul di pohon. Kompleksitas: O(n). */
  size() {
    return this.preorder().length;
  }

  /** Mengembalikan true jika pohon kosong. Kompleksitas: O(1). */
  isEmpty() {
    return this.root === null;
  }

  /** Representasi datar (preorder) berisi ringkasan simpul untuk visualisasi. Kompleksitas: O(n). */
  toArray() {
    return this.preorder().map((n) => ({
      id: n.id,
      name: n.name,
      level: n.level,
      data: n.data,
      parentId: n.parent ? n.parent.id : null,
      childCount: n.children.length,
    }));
  }
}
