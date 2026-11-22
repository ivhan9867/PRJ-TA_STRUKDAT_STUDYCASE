class QueueNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

/**
 * Queue (Antrean — FIFO: First In, First Out) berbasis simpul berantai (head & tail).
 * Tidak menggunakan Array.prototype.shift agar dequeue tetap O(1).
 *
 * Fungsi di aplikasi:
 *   Antrean layanan Poli per RS dan antrean permintaan ambulans per RS.
 * Alasan dipilih:
 *   Pasien poli dan permintaan ambulans dilayani sesuai urutan kedatangan (adil / FIFO),
 *   dengan enqueue dan dequeue konstan O(1).
 * Kelebihan & keterbatasan:
 *   (+) enqueue, dequeue, dan peek O(1) tanpa pergeseran elemen array.
 *   (-) Pencarian atau penghapusan elemen di tengah (remove) tetap O(n).
 */
export class Queue {
  constructor() {
    this._head = null;
    this._tail = null;
    this._size = 0;
  }

  /** Menambahkan elemen ke belakang antrean. Kompleksitas: O(1). */
  enqueue(item) {
    const node = new QueueNode(item);
    if (this._tail === null) {
      this._head = node;
      this._tail = node;
    } else {
      this._tail.next = node;
      this._tail = node;
    }
    this._size += 1;
    return this._size;
  }

  /** Mengambil dan menghapus elemen terdepan. Kompleksitas: O(1). */
  dequeue() {
    if (this._head === null) return null;
    const value = this._head.value;
    this._head = this._head.next;
    if (this._head === null) {
      this._tail = null;
    }
    this._size -= 1;
    return value;
  }

  /** Melihat elemen terdepan tanpa menghapusnya. Kompleksitas: O(1). */
  peek() {
    return this._head ? this._head.value : null;
  }

  /**
   * Menghapus elemen pertama yang memenuhi predicate(item).
   * Mengembalikan elemen yang dihapus, atau null jika tidak ditemukan.
   * Kompleksitas: O(n).
   */
  remove(predicate) {
    if (this._head === null) return null;

    let prev = null;
    let curr = this._head;

    while (curr !== null) {
      if (predicate(curr.value)) {
        if (prev === null) {
          this._head = curr.next;
        } else {
          prev.next = curr.next;
        }
        if (curr === this._tail) {
          this._tail = prev;
        }
        this._size -= 1;
        return curr.value;
      }
      prev = curr;
      curr = curr.next;
    }

    return null;
  }

  /** Mengosongkan seluruh antrean. Kompleksitas: O(1). */
  clear() {
    this._head = null;
    this._tail = null;
    this._size = 0;
  }

  /** Jumlah elemen dalam antrean. Kompleksitas: O(1). */
  size() {
    return this._size;
  }

  /** Mengembalikan true jika antrean kosong. Kompleksitas: O(1). */
  isEmpty() {
    return this._size === 0;
  }

  /** Salinan elemen dari depan ke belakang (untuk visualisasi). Kompleksitas: O(n). */
  toArray() {
    const result = [];
    let curr = this._head;
    while (curr !== null) {
      result.push(curr.value);
      curr = curr.next;
    }
    return result;
  }
}
