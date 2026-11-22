import test from 'node:test';
import assert from 'node:assert/strict';
import { Queue } from '../../src/ds/Queue.js';

test('Queue kosong: dequeue & peek mengembalikan null', () => {
  const q = new Queue();
  assert.equal(q.isEmpty(), true);
  assert.equal(q.size(), 0);
  assert.equal(q.peek(), null);
  assert.equal(q.dequeue(), null);
  assert.deepEqual(q.toArray(), []);
});

test('Queue satu elemen: enqueue lalu dequeue mengembalikan elemen dan kosong lagi', () => {
  const q = new Queue();
  q.enqueue('P-0001');
  assert.equal(q.size(), 1);
  assert.equal(q.peek(), 'P-0001');
  assert.equal(q.dequeue(), 'P-0001');
  assert.equal(q.isEmpty(), true);
  assert.equal(q.peek(), null);
});

test('Queue urutan FIFO benar untuk banyak elemen', () => {
  const q = new Queue();
  q.enqueue('P-0001');
  q.enqueue('P-0002');
  q.enqueue('P-0003');
  assert.deepEqual(q.toArray(), ['P-0001', 'P-0002', 'P-0003']);
  assert.equal(q.dequeue(), 'P-0001');
  assert.equal(q.dequeue(), 'P-0002');
  assert.equal(q.dequeue(), 'P-0003');
  assert.equal(q.isEmpty(), true);
});

test('Queue remove di tengah mempertahankan urutan', () => {
  const q = new Queue();
  q.enqueue({ code: 'P-1' });
  q.enqueue({ code: 'P-2' });
  q.enqueue({ code: 'P-3' });

  const removed = q.remove((item) => item.code === 'P-2');
  assert.deepEqual(removed, { code: 'P-2' });
  assert.equal(q.size(), 2);
  assert.deepEqual(q.toArray().map((x) => x.code), ['P-1', 'P-3']);
});

test('Queue remove di kepala dan di ekor tetap menjaga pointer tail valid', () => {
  const q = new Queue();
  q.enqueue('A');
  q.enqueue('B');
  q.enqueue('C');

  assert.equal(q.remove((x) => x === 'A'), 'A');
  assert.equal(q.remove((x) => x === 'C'), 'C');
  q.enqueue('D');
  assert.deepEqual(q.toArray(), ['B', 'D']);
  assert.equal(q.dequeue(), 'B');
  assert.equal(q.dequeue(), 'D');
});

test('Queue remove elemen tidak ditemukan mengembalikan null dan clear mengosongkan', () => {
  const q = new Queue();
  q.enqueue('A');
  assert.equal(q.remove((x) => x === 'Z'), null);
  assert.equal(q.size(), 1);
  q.clear();
  assert.equal(q.isEmpty(), true);
  assert.equal(q.size(), 0);
});
