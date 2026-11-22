/**
 * Stack (Tumpukan — LIFO: Last In, First Out)
 *
 * Fungsi di aplikasi:
 *   Menyimpan riwayat aksi manual (UndoManager) milik petugas RS dan Dinkes
 *   sehingga aksi terakhir dapat dibatalkan dengan cepat.
 * Alasan dipilih:
 *   Operasi pembatalan (undo) selalu mengambil aksi paling baru (puncak tumpukan),
 *   sehingga LIFO sangat sesuai dengan kompleksitas O(1).
 * Kelebihan & keterbatasan:
 *   (+) push, pop, dan peek berjalan dalam O(1) dengan memori ringan.
 *   (-) Tidak mendukung akses acak; saat melebihi maxSize, penghapusan elemen
 *       paling bawah membutuhkan O(n) (jarang terjadi).
 */
export class Stack {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this._items = [];
  }

  /** Menambahkan elemen ke puncak stack. Kompleksitas: O(1) (O(n) jika melebihi maxSize). */
  push(item) {
    if (this.maxSize > 0 && this._items.length >= this.maxSize) {
      // Buang elemen paling bawah (paling lama) saat kapasitas penuh
      this._items.splice(0, 1);
    }
    this._items.push(item);
    return this._items.length;
  }

  /** Mengambil dan menghapus elemen paling atas. Kompleksitas: O(1). */
  pop() {
    if (this._items.length === 0) return null;
    return this._items.pop();
  }

  /** Melihat elemen paling atas tanpa menghapusnya. Kompleksitas: O(1). */
  peek() {
    if (this._items.length === 0) return null;
    return this._items[this._items.length - 1];
  }

  /** Mengosongkan seluruh isi stack. Kompleksitas: O(1). */
  clear() {
    this._items = [];
  }

  /** Jumlah elemen di dalam stack. Kompleksitas: O(1). */
  size() {
    return this._items.length;
  }

  /** Mengembalikan true bila stack kosong. Kompleksitas: O(1). */
  isEmpty() {
    return this._items.length === 0;
  }

  /** Salinan isi stack dari bawah ke atas (untuk visualisasi). Kompleksitas: O(n). */
  toArray() {
    return this._items.slice();
  }
}
