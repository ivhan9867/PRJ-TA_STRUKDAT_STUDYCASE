import { WORLD_W, WORLD_H, riverCenterX, riverHalfWidth } from '@shared/cityHouses.js';

export { WORLD_W, WORLD_H, riverCenterX, riverHalfWidth };

/**
 * Generator dekorasi peta deterministik (seeded PRNG mulberry32) untuk peta luas 2200x1260.
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
    const rc = riverCenterX(cy);
    const rw = riverHalfWidth(cy) + radius + 30;
    if (Math.abs(cx - rc) < rw) return false;

    if (cx < 55 || cx > WORLD_W - 55 || cy < 55 || cy > WORLD_H - 55) return false;

    // Hindari watermark nama kota
    if ((Math.abs(cx - 460) < 165 && Math.abs(cy - 145) < 55) ||
        (Math.abs(cx - 1740) < 155 && Math.abs(cy - 145) < 55)) {
      return false;
    }

    // Hindari area Alun-alun Surya
    if (Math.hypot(cx - 330, cy - 580) < radius + 58) return false;

    // Hindari marker RS
    for (const h of hospitals) {
      if (Math.hypot(cx - h.x, cy - h.y) < radius + 68) return false;
    }

    // Hindari ruas jalan
    for (const seg of segments) {
      if (distToSegment(cx, cy, seg.a.x, seg.a.y, seg.b.x, seg.b.y) < radius + 28) {
        return false;
      }
    }
    return true;
  }

  // 1. Taman hijau di kedua kota
  for (let i = 0; i < 58; i++) {
    const isSurya = i < 29;
    const cx = isSurya ? 75 + rng() * 820 : 1300 + rng() * 820;
    const cy = 75 + rng() * (WORLD_H - 150);
    const r = 24 + rng() * 32;

    if (!isClear(cx, cy, r)) continue;
    const overlapsPark = parks.some((p) => Math.hypot(cx - p.cx, cy - p.cy) < r + p.r + 18);
    if (overlapsPark) continue;

    parks.push({ id: `park_${i}`, cx: Math.round(cx), cy: Math.round(cy), r: Math.round(r) });

    const treeCount = 3 + Math.floor(rng() * 3);
    for (let t = 0; t < treeCount; t++) {
      const ang = rng() * Math.PI * 2;
      const dist = rng() * (r * 0.58);
      trees.push({
        id: `tree_${i}_${t}`,
        cx: Math.round(cx + Math.cos(ang) * dist),
        cy: Math.round(cy + Math.sin(ang) * dist),
        r: Math.round(4.5 + rng() * 4),
      });
    }
  }

  // 2. Blok bangunan kota
  const stepX = 76;
  const stepY = 66;
  let blockId = 0;

  for (let gx = 65; gx <= WORLD_W - 65; gx += stepX) {
    for (let gy = 65; gy <= WORLD_H - 65; gy += stepY) {
      const jitterX = (rng() - 0.5) * 20;
      const jitterY = (rng() - 0.5) * 18;
      const cx = gx + jitterX;
      const cy = gy + jitterY;
      const w = 30 + rng() * 36;
      const h = 22 + rng() * 28;
      const radius = Math.hypot(w / 2, h / 2);

      if (rng() < 0.25) continue;
      if (!isClear(cx, cy, radius)) continue;

      const inPark = parks.some((p) => Math.hypot(cx - p.cx, cy - p.cy) < p.r + radius + 6);
      if (inPark) continue;

      blocks.push({
        id: `blk_${blockId++}`,
        x: Math.round(cx - w / 2),
        y: Math.round(cy - h / 2),
        w: Math.round(w),
        h: Math.round(h),
        rx: Math.round(7 + rng() * 4),
      });
    }
  }

  return { blocks, parks, trees };
}
