/**
 * Generator angka acak berseed (Mulberry32) agar hasil simulasi dan eksperimen
 * selalu deterministik (seed sama -> hasil identik).
 */
export function createRng(seed = 1) {
  let state = (seed >>> 0) || 1;

  function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function uniform(min, max) {
    return min + next() * (max - min);
  }

  function int(min, max) {
    return Math.floor(uniform(min, max + 1));
  }

  function pick(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(next() * array.length)];
  }

  /**
   * Sampel distribusi Poisson (algoritma Knuth) untuk jumlah kedatangan pasien per tick.
   */
  function poisson(lambda) {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k += 1;
      p *= next();
    } while (p > L);
    return k - 1;
  }

  return { next, uniform, int, pick, poisson };
}
