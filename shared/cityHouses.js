/**
 * Generator deterministik titik pemukiman rumah warga untuk Kota Surya & Kota Tirta (peta 2200x1260).
 * Dipakai bersama oleh server (titik asal pasien keluar rumah) dan client (gambar rumah di peta SVG)
 * agar setiap pasien berjalan tepat dari pintu rumah warga yang tampil di peta.
 */

export const WORLD_W = 2200;
export const WORLD_H = 1260;

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

export function riverCenterX(y) {
  return 1100 + Math.sin((y / WORLD_H) * Math.PI * 1.65 - 0.4) * 38;
}

export function riverHalfWidth(y) {
  return 110 + Math.cos((y / WORLD_H) * Math.PI * 2.2) * 14;
}

/**
 * Menghasilkan daftar rumah warga deterministik di sekitar persimpangan kedua kota.
 */
export function generateCityHouses(nodes, edges) {
  const rng = mulberry32(20260415);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const segments = edges.map((e) => ({
    a: nodeMap.get(e.a),
    b: nodeMap.get(e.b),
  }));
  const hospitals = nodes.filter((n) => n.kind === 'hospital');
  const junctions = nodes.filter((n) => n.kind === 'junction');

  const houses = [];

  function isHouseClear(cx, cy) {
    if (cx < 65 || cx > WORLD_W - 65 || cy < 65 || cy > WORLD_H - 65) return false;
    const rc = riverCenterX(cy);
    const rw = riverHalfWidth(cy) + 46;
    if (Math.abs(cx - rc) < rw) return false;

    // Hindari watermark nama kota
    if ((Math.abs(cx - 460) < 160 && Math.abs(cy - 145) < 55) ||
        (Math.abs(cx - 1740) < 150 && Math.abs(cy - 145) < 55)) {
      return false;
    }

    // Hindari marker RS
    for (const h of hospitals) {
      if (Math.hypot(cx - h.x, cy - h.y) < 82) return false;
    }

    // Hindari badan jalan utama
    for (const seg of segments) {
      if (distToSegment(cx, cy, seg.a.x, seg.a.y, seg.b.x, seg.b.y) < 38) {
        return false;
      }
    }

    // Hindari tumpang tindih dengan rumah lain
    for (const existing of houses) {
      if (Math.hypot(cx - existing.x, cy - existing.y) < 38) return false;
    }

    return true;
  }

  let houseIdx = 0;
  for (const j of junctions) {
    let placed = 0;
    let attempts = 0;
    while (placed < 10 && attempts < 110) {
      attempts += 1;
      const angle = rng() * Math.PI * 2;
      const dist = 62 + rng() * 195;
      const cx = Math.round(j.x + Math.cos(angle) * dist);
      const cy = Math.round(j.y + Math.sin(angle) * dist);

      if (j.city === 'surya' && cx > 905) continue;
      if (j.city === 'tirta' && cx < 1295) continue;
      if (!isHouseClear(cx, cy)) continue;

      houses.push({
        id: `house_${++houseIdx}`,
        city: j.city,
        x: cx,
        y: cy,
        w: Math.round(20 + rng() * 8),
        h: Math.round(15 + rng() * 6),
        roofShade: rng() < 0.5 ? 0 : 1,
        nearestJunctionId: j.id,
        junctionX: j.x,
        junctionY: j.y,
      });
      placed += 1;
    }
  }

  return houses;
}
