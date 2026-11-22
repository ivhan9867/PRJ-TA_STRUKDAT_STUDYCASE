import test from 'node:test';
import assert from 'node:assert/strict';
import { LinkedList } from '../../src/ds/LinkedList.js';

test('LinkedList kosong: removeFirst & find mengembalikan null', () => {
  const list = new LinkedList();
  assert.equal(list.isEmpty(), true);
  assert.equal(list.size(), 0);
  assert.equal(list.removeFirst(), null);
  assert.equal(list.find(() => true), null);
  assert.deepEqual(list.toArray(), []);
});

test('LinkedList satu elemen: append lalu removeFirst menjaga head & tail null', () => {
  const list = new LinkedList();
  list.append('tahap-1');
  assert.equal(list.size(), 1);
  assert.equal(list.head.value, 'tahap-1');
  assert.equal(list.tail.value, 'tahap-1');
  assert.equal(list.removeFirst(), 'tahap-1');
  assert.equal(list.isEmpty(), true);
  assert.equal(list.head, null);
  assert.equal(list.tail, null);
});

test('LinkedList append dan prepend menjaga urutan benar', () => {
  const list = new LinkedList();
  list.append('B');
  list.append('C');
  list.prepend('A');
  assert.deepEqual(list.toArray(), ['A', 'B', 'C']);
  assert.equal(list.head.value, 'A');
  assert.equal(list.tail.value, 'C');
});

test('LinkedList removeWhere di kepala, tengah, dan ekor menjaga pointer tail', () => {
  const list = new LinkedList();
  list.append({ id: 1 });
  list.append({ id: 2 });
  list.append({ id: 3 });
  list.append({ id: 4 });

  assert.equal(list.removeWhere((x) => x.id === 2)?.id, 2);
  assert.equal(list.removeWhere((x) => x.id === 1)?.id, 1);
  assert.equal(list.removeWhere((x) => x.id === 4)?.id, 4);

  list.append({ id: 5 });
  assert.deepEqual(list.toArray().map((x) => x.id), [3, 5]);
  assert.equal(list.tail.value.id, 5);
});

test('LinkedList find dan forEach mengunjungi seluruh elemen dengan indeks benar', () => {
  const list = new LinkedList();
  list.append({ code: 'P-1', bed: 'inap' });
  list.append({ code: 'P-2', bed: 'icu' });
  list.append({ code: 'P-3', bed: 'inap' });

  const found = list.find((x) => x.code === 'P-2');
  assert.equal(found.bed, 'icu');

  const seen = [];
  list.forEach((val, idx) => seen.push(`${idx}:${val.code}`));
  assert.deepEqual(seen, ['0:P-1', '1:P-2', '2:P-3']);
});

test('LinkedList simulasi log terbatas 200 (append ekor + removeFirst kepala O(1))', () => {
  const log = new LinkedList();
  for (let i = 1; i <= 205; i++) {
    log.append(`log-${i}`);
    if (log.size() > 200) log.removeFirst();
  }
  assert.equal(log.size(), 200);
  assert.equal(log.head.value, 'log-6');
  assert.equal(log.tail.value, 'log-205');
});
