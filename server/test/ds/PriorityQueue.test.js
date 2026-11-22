import test from 'node:test';
import assert from 'node:assert/strict';
import { PriorityQueue } from '../../src/ds/PriorityQueue.js';

const TRIAGE_RANK = { gawat: 0, sedang: 1, ringan: 2 };
const compareIgd = (a, b) => {
  const diff = TRIAGE_RANK[a.triage] - TRIAGE_RANK[b.triage];
  return diff !== 0 ? diff : a.arrivedAt - b.arrivedAt;
};

test('PriorityQueue kosong: pop & peek mengembalikan null', () => {
  const pq = new PriorityQueue();
  assert.equal(pq.isEmpty(), true);
  assert.equal(pq.size(), 0);
  assert.equal(pq.peek(), null);
  assert.equal(pq.pop(), null);
});

test('PriorityQueue satu elemen: push, peek, pop', () => {
  const pq = new PriorityQueue();
  pq.push(42);
  assert.equal(pq.size(), 1);
  assert.equal(pq.peek(), 42);
  assert.equal(pq.pop(), 42);
  assert.equal(pq.isEmpty(), true);
});

test('PriorityQueue min-heap mengeluarkan angka dari terkecil ke terbesar', () => {
  const pq = new PriorityQueue();
  for (const n of [15, 3, 22, 1, 9, 3, 7]) pq.push(n);
  const out = [];
  while (!pq.isEmpty()) out.push(pq.pop());
  assert.deepEqual(out, [1, 3, 3, 7, 9, 15, 22]);
});

test('PriorityQueue triase IGD: Gawat dulu, lalu Sedang, lalu Ringan; seri ikut waktu datang', () => {
  const pq = new PriorityQueue(compareIgd);
  pq.push({ code: 'P-1', triage: 'ringan', arrivedAt: 1 });
  pq.push({ code: 'P-2', triage: 'sedang', arrivedAt: 2 });
  pq.push({ code: 'P-3', triage: 'gawat', arrivedAt: 5 });
  pq.push({ code: 'P-4', triage: 'gawat', arrivedAt: 3 });
  pq.push({ code: 'P-5', triage: 'sedang', arrivedAt: 1 });

  const order = [];
  while (!pq.isEmpty()) order.push(pq.pop().code);
  assert.deepEqual(order, ['P-4', 'P-3', 'P-5', 'P-2', 'P-1']);
});

test('PriorityQueue remove di tengah & di puncak tetap menjaga properti heap', () => {
  const pq = new PriorityQueue(compareIgd);
  pq.push({ code: 'P-1', triage: 'gawat', arrivedAt: 1 });
  pq.push({ code: 'P-2', triage: 'sedang', arrivedAt: 2 });
  pq.push({ code: 'P-3', triage: 'gawat', arrivedAt: 4 });
  pq.push({ code: 'P-4', triage: 'ringan', arrivedAt: 3 });
  pq.push({ code: 'P-5', triage: 'sedang', arrivedAt: 5 });

  assert.equal(pq.remove((p) => p.code === 'P-2')?.code, 'P-2');
  assert.equal(pq.remove((p) => p.code === 'P-1')?.code, 'P-1');
  assert.equal(pq.remove((p) => p.code === 'P-999'), null);

  const rest = [];
  while (!pq.isEmpty()) rest.push(pq.pop().code);
  assert.deepEqual(rest, ['P-3', 'P-5', 'P-4']);
});

test('PriorityQueue stress test 200 elemen acak selalu keluar terurut menaik', () => {
  const pq = new PriorityQueue();
  let seed = 12345;
  for (let i = 0; i < 200; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    pq.push(seed % 1000);
  }
  assert.equal(pq.toHeapArray().length, 200);
  let prev = -Infinity;
  while (!pq.isEmpty()) {
    const curr = pq.pop();
    assert.ok(curr >= prev);
    prev = curr;
  }
});
