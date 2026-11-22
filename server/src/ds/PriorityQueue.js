/**
 * PriorityQueue (Antrean Prioritas) berbasis Binary Min-Heap.
 *
 * Fungsi di aplikasi:
 *   1. Antrean IGD per RS (pasien Gawat dilayani lebih dulu, lalu Sedang, lalu Ringan;
 *      jika tingkat sama, yang datang lebih awal didahulukan).
 *   2. EventScheduler simulasi global (kejadian dengan waktu simulasi terkecil diproses dulu).
 *   3. Pendukung algoritma Dijkstra pada Graph.
 * Alasan dipilih:
 *   Binary min-heap menjaga elemen prioritas tertinggi selalu di puncak (index 0)
 *   sehingga penyisipan dan pengambilan selalu O(log n).
 * Kelebihan & keterbatasan:
 *   (+) push dan pop O(log n), peek O(1).
 *   (-) Menghapus elemen di tengah (remove) memerlukan pencarian linear O(n).
 */
export class PriorityQueue {
  /**
   * @param {(a: any, b: any) => number} compare
   *   Fungsi pembanding: nilai < 0 berarti `a` memiliki prioritas lebih tinggi dari `b`.
   */
  constructor(compare = (a, b) => a - b) {
    this._compare = compare;
    this._heap = [];
  }

  /** Menambahkan elemen baru sambil menjaga sifat min-heap. Kompleksitas: O(log n). */
  push(item) {
    this._heap.push(item);
    this._siftUp(this._heap.length - 1);
    return this._heap.length;
  }

  /** Mengambil dan menghapus elemen prioritas tertinggi. Kompleksitas: O(log n). */
  pop() {
    const n = this._heap.length;
    if (n === 0) return null;
    if (n === 1) return this._heap.pop();

    const top = this._heap[0];
    this._heap[0] = this._heap.pop();
    this._siftDown(0);
    return top;
  }

  /** Melihat elemen prioritas tertinggi tanpa menghapusnya. Kompleksitas: O(1). */
  peek() {
    return this._heap.length > 0 ? this._heap[0] : null;
  }

  /**
   * Menghapus elemen pertama yang memenuhi predicate(item), lalu memperbaiki heap.
   * Kompleksitas: O(n).
   */
  remove(predicate) {
    const idx = this._heap.findIndex(predicate);
    if (idx === -1) return null;

    const removed = this._heap[idx];
    const last = this._heap.pop();

    if (idx < this._heap.length) {
      this._heap[idx] = last;
      this._siftUp(idx);
      this._siftDown(idx);
    }

    return removed;
  }

  /** Mengosongkan priority queue. Kompleksitas: O(1). */
  clear() {
    this._heap = [];
  }

  /** Jumlah elemen. Kompleksitas: O(1). */
  size() {
    return this._heap.length;
  }

  /** Mengembalikan true jika kosong. Kompleksitas: O(1). */
  isEmpty() {
    return this._heap.length === 0;
  }

  /**
   * Mengembalikan salinan elemen terurut sesuai prioritas (untuk tabel antrean).
   * Kompleksitas: O(n log n).
   */
  toArray() {
    return this._heap.slice().sort(this._compare);
  }

  /**
   * Mengembalikan salinan array internal heap (level-order pohon biner)
   * untuk visualisasi struktur heap di Mode Akademik. Kompleksitas: O(n).
   */
  toHeapArray() {
    return this._heap.slice();
  }

  _siftUp(index) {
    let i = index;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._compare(this._heap[i], this._heap[parent]) < 0) {
        this._swap(i, parent);
        i = parent;
      } else {
        break;
      }
    }
  }

  _siftDown(index) {
    let i = index;
    const n = this._heap.length;

    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;

      if (left < n && this._compare(this._heap[left], this._heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < n && this._compare(this._heap[right], this._heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === i) break;

      this._swap(i, smallest);
      i = smallest;
    }
  }

  _swap(i, j) {
    const tmp = this._heap[i];
    this._heap[i] = this._heap[j];
    this._heap[j] = tmp;
  }
}
