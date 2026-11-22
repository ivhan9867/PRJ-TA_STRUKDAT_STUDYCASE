import test from 'node:test';
import assert from 'node:assert/strict';
import { Stack } from '../../src/ds/Stack.js';

test('Stack kosong: pop & peek mengembalikan null, isEmpty true', () => {
  const s = new Stack();
  assert.equal(s.isEmpty(), true);
  assert.equal(s.size(), 0);
  assert.equal(s.peek(), null);
  assert.equal(s.pop(), null);
  assert.deepEqual(s.toArray(), []);
});

test('Stack satu elemen: push, peek, lalu pop kembali kosong', () => {
  const s = new Stack();
  s.push('Tutup Jembatan Utara');
  assert.equal(s.size(), 1);
  assert.equal(s.isEmpty(), false);
  assert.equal(s.peek(), 'Tutup Jembatan Utara');
  assert.equal(s.pop(), 'Tutup Jembatan Utara');
  assert.equal(s.isEmpty(), true);
});

test('Stack urutan LIFO benar untuk banyak elemen', () => {
  const s = new Stack();
  s.push('Aksi 1');
  s.push('Aksi 2');
  s.push('Aksi 3');
  assert.deepEqual(s.toArray(), ['Aksi 1', 'Aksi 2', 'Aksi 3']);
  assert.equal(s.pop(), 'Aksi 3');
  assert.equal(s.pop(), 'Aksi 2');
  assert.equal(s.pop(), 'Aksi 1');
  assert.equal(s.pop(), null);
});

test('Stack batas maxSize: membuang elemen paling bawah saat penuh', () => {
  const s = new Stack(3);
  s.push(1);
  s.push(2);
  s.push(3);
  s.push(4);
  assert.equal(s.size(), 3);
  assert.deepEqual(s.toArray(), [2, 3, 4]);
  assert.equal(s.peek(), 4);
});

test('Stack clear mengosongkan seluruh elemen', () => {
  const s = new Stack();
  s.push('A');
  s.push('B');
  s.clear();
  assert.equal(s.size(), 0);
  assert.equal(s.isEmpty(), true);
  assert.equal(s.peek(), null);
});

test('Stack toArray mengembalikan salinan aman (mutasi luar tidak merusak stack)', () => {
  const s = new Stack();
  s.push('X');
  s.push('Y');
  const arr = s.toArray();
  arr.push('Z');
  assert.equal(s.size(), 2);
  assert.deepEqual(s.toArray(), ['X', 'Y']);
});
