import { PriorityQueue } from './PriorityQueue.js';
import { Queue } from './Queue.js';

/**
 * Graph berbobot tak berarah (Adjacency List berbasis Map).
 *
 * Fungsi di aplikasi:
 *   Memodelkan jaringan jalan dan 2 jembatan di antara Kota Surya dan Kota Tirta.
 *   - Dijkstra: mencari rute tercepat (menit) untuk ambulans rujukan & pasien menuju RS.
 *   - BFS: menghitung jumlah lompatan (persimpangan) minimum dan memeriksa keterjangkauan.
 * Alasan dipilih:
 *   Jaringan jalan bersifat jarang (sparse graph), sehingga adjacency list berbasis Map
 *   hemat memori O(V + E) dan cepat saat menelusuri tetangga.
 * Kelebihan & keterbatasan:
 *   (+) Dijkstra dengan binary heap O((V + E) log V), BFS O(V + E), mendukung buka/tutup jembatan dinamis.
 *   (-) Dijkstra mensyaratkan seluruh bobot edge non-negatif (terpenuhi karena bobot adalah waktu tempuh > 0).
 */
export class Graph {
  constructor() {
    this._nodes = new Map(); // id -> { id, ...data }
    this._edges = new Map(); // edgeId -> { id, a, b, weight, closed, meta }
    this._adj = new Map();   // nodeId -> Array<{ edgeId, to }>
  }

  /** Menambahkan simpul baru ke graph. Kompleksitas: O(1). */
  addNode(id, data = {}) {
    if (!this._nodes.has(id)) {
      this._nodes.set(id, { id, ...data });
      this._adj.set(id, []);
    }
    return this._nodes.get(id);
  }

  hasNode(id) {
    return this._nodes.has(id);
  }

  getNode(id) {
    return this._nodes.get(id) || null;
  }

  /** Menambahkan ruas jalan/jembatan tak berarah antara simpul a dan b. Kompleksitas: O(1). */
  addEdge(id, a, b, weight = 1, meta = {}) {
    if (!this._nodes.has(a) || !this._nodes.has(b)) {
      throw new Error(`Simpul "${a}" atau "${b}" belum terdaftar di graph.`);
    }
    const edge = {
      id,
      a,
      b,
      weight,
      closed: Boolean(meta.closed),
      meta,
    };
    this._edges.set(id, edge);
    this._adj.get(a).push({ edgeId: id, to: b });
    this._adj.get(b).push({ edgeId: id, to: a });
    return edge;
  }

  getEdge(edgeId) {
    return this._edges.get(edgeId) || null;
  }

  /** Membuka atau menutup suatu edge (misalnya Jembatan Utara/Selatan). Kompleksitas: O(1). */
  setEdgeClosed(edgeId, closed) {
    const edge = this._edges.get(edgeId);
    if (!edge) return false;
    edge.closed = Boolean(closed);
    return true;
  }

  /**
   * Mengembalikan daftar tetangga dari nodeId.
   * Secara default mengabaikan edge yang sedang ditutup (closed === true).
   * Kompleksitas: O(derajat simpul).
   */
  neighbors(nodeId, { includeClosed = false } = {}) {
    const list = this._adj.get(nodeId);
    if (!list) return [];
    const result = [];
    for (const entry of list) {
      const edge = this._edges.get(entry.edgeId);
      if (!edge) continue;
      if (!includeClosed && edge.closed) continue;
      result.push({
        to: entry.to,
        edgeId: edge.id,
        weight: edge.weight,
        edge,
      });
    }
    return result;
  }

  /**
   * Algoritma Dijkstra untuk mencari rute dengan total bobot (waktu tempuh) terkecil.
   * Mengabaikan edge yang ditutup.
   * @param {string} startId
   * @param {string} endId
   * @param {(edge: object) => number} [weightFn] opsional untuk bobot dinamis (mis. faktor lalu lintas)
   * Kompleksitas: O((V + E) log V).
   */
  dijkstra(startId, endId, weightFn = null) {
    if (!this._nodes.has(startId) || !this._nodes.has(endId)) {
      return { found: false, path: [], edges: [], distance: Infinity };
    }
    if (startId === endId) {
      return { found: true, path: [startId], edges: [], distance: 0 };
    }

    const dist = new Map();
    const prevNode = new Map();
    const prevEdge = new Map();
    const visited = new Set();

    for (const id of this._nodes.keys()) {
      dist.set(id, Infinity);
    }
    dist.set(startId, 0);

    const pq = new PriorityQueue((a, b) => a.dist - b.dist);
    pq.push({ id: startId, dist: 0 });

    while (!pq.isEmpty()) {
      const current = pq.pop();
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      if (current.id === endId) break;

      for (const { to, edge } of this.neighbors(current.id)) {
        if (visited.has(to)) continue;
        const w = weightFn ? weightFn(edge) : edge.weight;
        const alt = current.dist + w;
        if (alt < dist.get(to)) {
          dist.set(to, alt);
          prevNode.set(to, current.id);
          prevEdge.set(to, edge.id);
          pq.push({ id: to, dist: alt });
        }
      }
    }

    if (!Number.isFinite(dist.get(endId))) {
      return { found: false, path: [], edges: [], distance: Infinity };
    }

    // Rekonstruksi jalur dari endId mundur ke startId
    const path = [];
    const edges = [];
    let curr = endId;
    while (curr !== undefined) {
      path.push(curr);
      const eId = prevEdge.get(curr);
      if (eId) edges.push(eId);
      curr = prevNode.get(curr);
    }
    path.reverse();
    edges.reverse();

    return {
      found: true,
      path,
      edges,
      distance: dist.get(endId),
    };
  }

  /**
   * Breadth-First Search (BFS) untuk menghitung jalur dengan jumlah lompatan (hops) paling sedikit
   * dan memeriksa keterjangkauan antar dua simpul. Mengabaikan edge tertutup.
   * Kompleksitas: O(V + E).
   */
  bfs(startId, endId) {
    if (!this._nodes.has(startId) || !this._nodes.has(endId)) {
      return { found: false, path: [], hops: Infinity };
    }
    if (startId === endId) {
      return { found: true, path: [startId], hops: 0 };
    }

    const visited = new Set([startId]);
    const prevNode = new Map();
    const queue = new Queue();
    queue.enqueue(startId);

    let found = false;
    while (!queue.isEmpty()) {
      const curr = queue.dequeue();
      if (curr === endId) {
        found = true;
        break;
      }
      for (const { to } of this.neighbors(curr)) {
        if (!visited.has(to)) {
          visited.add(to);
          prevNode.set(to, curr);
          queue.enqueue(to);
        }
      }
    }

    if (!found) {
      return { found: false, path: [], hops: Infinity };
    }

    const path = [];
    let curr = endId;
    while (curr !== undefined) {
      path.push(curr);
      curr = prevNode.get(curr);
    }
    path.reverse();

    return {
      found: true,
      path,
      hops: path.length - 1,
    };
  }

  /** Jumlah simpul (V) di dalam graph. Kompleksitas: O(1). */
  size() {
    return this._nodes.size;
  }

  /** Jumlah edge (E) di dalam graph. Kompleksitas: O(1). */
  edgeCount() {
    return this._edges.size;
  }

  /** Mengembalikan true jika belum ada simpul. Kompleksitas: O(1). */
  isEmpty() {
    return this._nodes.size === 0;
  }

  /** Mengembalikan salinan daftar simpul dan edge (untuk visualisasi). Kompleksitas: O(V + E). */
  toArray() {
    return {
      nodes: Array.from(this._nodes.values()),
      edges: Array.from(this._edges.values()),
    };
  }
}
