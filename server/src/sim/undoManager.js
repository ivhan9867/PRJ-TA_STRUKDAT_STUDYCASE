import { Stack } from '../ds/Stack.js';

/**
 * Pengelola Undo berbasis Stack (LIFO) buatan sendiri.
 * Menyediakan satu Stack global untuk Dinkes ("dinkes") dan satu Stack per petugas RS.
 */
export class UndoManager {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this._stacks = new Map();
  }

  _getStack(scopeKey) {
    if (!this._stacks.has(scopeKey)) {
      this._stacks.set(scopeKey, new Stack(this.maxSize));
    }
    return this._stacks.get(scopeKey);
  }

  /** Mendorong aksi yang dapat dibatalkan ke puncak Stack. */
  record(scopeKey, description, undoFn) {
    const stack = this._getStack(scopeKey);
    stack.push({
      description,
      undo: undoFn,
      recordedAt: Date.now(),
    });
  }

  /** Membatalkan aksi paling atas pada Stack (pop lalu jalankan undo). */
  undo(scopeKey) {
    const stack = this._getStack(scopeKey);
    const entry = stack.pop();
    if (!entry) return null;
    entry.undo();
    return entry.description;
  }

  /** Melihat deskripsi aksi teratas tanpa menghapusnya. */
  peekDescription(scopeKey) {
    const stack = this._getStack(scopeKey);
    return stack.peek()?.description || null;
  }

  /** Ringkasan status stack untuk dikirim ke client. */
  getInfo(scopeKey) {
    const stack = this._getStack(scopeKey);
    const top = stack.peek();
    return {
      canUndo: !stack.isEmpty(),
      nextDescription: top ? top.description : null,
      size: stack.size(),
    };
  }

  /** Daftar deskripsi dari bawah ke atas (untuk visualisasi live di Mode Akademik). */
  getDescriptions(scopeKey) {
    const stack = this._getStack(scopeKey);
    return stack.toArray().map((e) => e.description);
  }

  clearScope(scopeKey) {
    this._getStack(scopeKey).clear();
  }

  clearAll() {
    for (const stack of this._stacks.values()) {
      stack.clear();
    }
    this._stacks.clear();
  }
}
