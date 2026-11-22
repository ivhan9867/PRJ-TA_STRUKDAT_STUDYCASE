export class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

/**
 * Singly LinkedList dengan pointer head dan tail.
 *
 * Fungsi di aplikasi:
 *   1. PatientJourney: mencatat tahapan perjalanan setiap pasien (datang, IGD, dirujuk, rawat inap, pulang).
 *   2. Log kejadian per RS (dibatasi 200 entri; entri terlama dihapus dari kepala dalam O(1)).
 *   3. Daftar ambulans siaga per RS (ambil dari kepala, kembalikan ke ekor).
 *   4. Daftar pasien rawat inap aktif (hapus di tengah saat pasien pulang).
 * Alasan dipilih:
 *   Penambahan di kepala/ekor dan penghapusan dari kepala semuanya O(1) tanpa realokasi array.
 * Kelebihan & keterbatasan:
 *   (+) append, prepend, dan removeFirst berjalan O(1).
 *   (-) Tidak bisa diakses langsung lewat indeks; pencarian (find/removeWhere) O(n).
 */
export class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this._size = 0;
  }

  /** Menambahkan elemen di akhir (ekor) daftar. Kompleksitas: O(1). */
  append(value) {
    const node = new ListNode(value);
    if (this.tail === null) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
    this._size += 1;
    return node;
  }

  /** Menambahkan elemen di awal (kepala) daftar. Kompleksitas: O(1). */
  prepend(value) {
    const node = new ListNode(value);
    if (this.head === null) {
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head = node;
    }
    this._size += 1;
    return node;
  }

  /** Menghapus dan mengembalikan elemen pertama (kepala). Kompleksitas: O(1). */
  removeFirst() {
    if (this.head === null) return null;
    const value = this.head.value;
    this.head = this.head.next;
    if (this.head === null) {
      this.tail = null;
    }
    this._size -= 1;
    return value;
  }

  /**
   * Menghapus elemen pertama yang memenuhi predicate(value).
   * Mengembalikan nilainya, atau null jika tidak ditemukan.
   * Kompleksitas: O(n).
   */
  removeWhere(predicate) {
    if (this.head === null) return null;

    let prev = null;
    let curr = this.head;

    while (curr !== null) {
      if (predicate(curr.value)) {
        if (prev === null) {
          this.head = curr.next;
        } else {
          prev.next = curr.next;
        }
        if (curr === this.tail) {
          this.tail = prev;
        }
        this._size -= 1;
        return curr.value;
      }
      prev = curr;
      curr = curr.next;
    }

    return null;
  }

  /** Mencari elemen pertama yang memenuhi predicate(value). Kompleksitas: O(n). */
  find(predicate) {
    let curr = this.head;
    while (curr !== null) {
      if (predicate(curr.value)) return curr.value;
      curr = curr.next;
    }
    return null;
  }

  /** Menelusuri setiap elemen dari kepala ke ekor. Kompleksitas: O(n). */
  forEach(callback) {
    let curr = this.head;
    let index = 0;
    while (curr !== null) {
      callback(curr.value, index);
      curr = curr.next;
      index += 1;
    }
  }

  /** Mengosongkan daftar. Kompleksitas: O(1). */
  clear() {
    this.head = null;
    this.tail = null;
    this._size = 0;
  }

  /** Jumlah elemen. Kompleksitas: O(1). */
  size() {
    return this._size;
  }

  /** Mengembalikan true jika daftar kosong. Kompleksitas: O(1). */
  isEmpty() {
    return this._size === 0;
  }

  /** Salinan elemen dalam bentuk array (untuk visualisasi). Kompleksitas: O(n). */
  toArray() {
    const result = [];
    this.forEach((val) => result.push(val));
    return result;
  }
}
