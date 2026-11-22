/**
 * Generator dekorasi peta deterministik (seeded PRNG mulberry32).
 * Menghasilkan blok bangunan kota, taman hijau, dan titik pohon
 * yang selalu menghindari sungai, ruas jalan utama, dan area marker RS.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Kurva pusat sungai pada koordinat x untuk y tertentu (0..900).
 * Tetap berada di koridor x ~ 700..900 agar kedua ujung jembatan selalu pas di tepi sungai.
 */
export function riverCenterX(y) {
  return 800 + Math.sin((y / 900) * Math.PI * 1.65 - 0.4) * 28;
}

export function riverHalfWidth(y) {
  return 86 + Math.cos((y / 900) * Math.PI * 2.2) * 10;
}

export function generateCityDecor(nodes, edges) {
  const rng = mulberry32(20260308);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const segments = edges.map((e) => ({
    a: nodeMap.get(e.a),
    b: nodeMap.get(e.b),
  }));

  const hospitals = nodes.filter((n) => n.kind === 'hospital');
  const blocks = [];
  const parks = [];
  const trees = [];

  function isClear(cx, cy, radius) {
    // Hindari sungai
    const rc = riverCenterX(cy);
    const rw = riverHalfWidth(cy) + radius + 24;
    if (Math.abs(cx - rc) < rw) return false;

    // Hindari tepi luar kanvas terlalu mepet
    if (cx < 45 || cx > 1555 || cy < 45 || cy > 855) return false;

    // Hindari area label nama kota besar
    if ((Math.abs(cx - 350) < 130 && Math.abs(cy - 120) < 42) ||
        (Math.abs(cx - 1250) < 120 && Math.abs(cy - 120) < 42)) {
      return false;
    }

    // Hindari marker RS
    for (const h of hospitals) {
      if (Math.hypot(cx - h.x, cy - h.y) < radius + 54) return false;
    }

    // Hindari ruas jalan
    for (const seg of segments) {
      if (distToSegment(cx, cy, seg.a.x, seg.a.y, seg.b.x, seg.b.y) < radius + 24) {
        return false;
      }
    }
    return true;
  }

  // 1. Taman hijau di kedua kota
  for (let i = 0; i < 42; i++) {
    const isSurya = i < 21;
    const cx = isSurya ? 60 + rng() * 590 : 950 + rng() * 590;
    const cy = 60 + rng() * 780;
    const r = 20 + rng() * 26;

    if (!isClear(cx, cy, r)) continue;
    const overlapsPark = parks.some((p) => Math.hypot(cx - p.cx, cy - p.cy) < r + p.r + 14);
    if (overlapsPark) continue;

    parks.push({ id: `park_${i}`, cx: Math.round(cx), cy: Math.round(cy), r: Math.round(r) });

    // Tambahkan 3-5 titik pohon di dalam taman
    const treeCount = 3 + Math.floor(rng() * 3);
    for (let t = 0; t < treeCount; t++) {
      const ang = rng() * Math.PI * 2;
      const dist = rng() * (r * 0.58);
      trees.push({
        id: `tree_${i}_${t}`,
        cx: Math.round(cx + Math.cos(ang) * dist),
        cy: Math.round(cy + Math.sin(ang) * dist),
        r: Math.round(4 + rng() * 3.5),
      });
    }
  }

  // 2. Blok bangunan kota (grid semi-teratur agar terasa seperti peta perkotaan nyata)
  const stepX = 64;
  const stepY = 56;
  let blockId = 0;

  for (let gx = 55; gx <= 1540; gx += stepX) {
    for (let gy = 55; gy <= 845; gy += stepY) {
      const jitterX = (rng() - 0.5) * 16;
      const jitterY = (rng() - 0.5) * 14;
      const cx = gx + jitterX;
      const cy = gy + jitterY;
      const w = 26 + rng() * 30;
      const h = 20 + rng() * 24;
      const radius = Math.hypot(w / 2, h / 2);

      if (rng() < 0.22) continue; // sisakan ruang bernapas
      if (!isClear(cx, cy, radius)) continue;

      const inPark = parks.some((p) => Math.hypot(cx - p.cx, cy - p.cy) < p.r + radius + 4);
      if (inPark) continue;

      blocks.push({
        id: `blk_${blockId++}`,
        x: Math.round(cx - w / 2),
        y: Math.round(cy - h / 2),
        w: Math.round(w),
        h: Math.round(h),
        rx: Math.round(6 + rng() * 4),
      });
    }
  }

  return { blocks, parks, trees };
}
