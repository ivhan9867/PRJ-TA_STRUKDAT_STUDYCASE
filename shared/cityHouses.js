/**
 * Generator deterministik titik pemukiman rumah warga untuk Kota Surya & Kota Tirta.
 * Dipakai bersama oleh server (titik asal pasien keluar rumah) dan client (gambar rumah di peta SVG)
 * agar setiap pasien berjalan tepat dari pintu rumah warga yang tampil di peta.
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

export function riverCenterX(y) {
  return 800 + Math.sin((y / 900) * Math.PI * 1.65 - 0.4) * 28;
}

export function riverHalfWidth(y) {
  return 86 + Math.cos((y / 900) * Math.PI * 2.2) * 10;
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
    if (cx < 55 || cx > 1545 || cy < 55 || cy > 845) return false;
    const rc = riverCenterX(cy);
    const rw = riverHalfWidth(cy) + 38;
    if (Math.abs(cx - rc) < rw) return false;

    // Hindari watermark nama kota
    if ((Math.abs(cx - 350) < 135 && Math.abs(cy - 120) < 46) ||
        (Math.abs(cx - 1250) < 125 && Math.abs(cy - 120) < 46)) {
      return false;
    }

    // Hindari marker RS
    for (const h of hospitals) {
      if (Math.hypot(cx - h.x, cy - h.y) < 70) return false;
    }

    // Hindari badan jalan utama
    for (const seg of segments) {
      if (distToSegment(cx, cy, seg.a.x, seg.a.y, seg.b.x, seg.b.y) < 34) {
        return false;
      }
    }

    // Hindari tumpang tindih dengan rumah lain
    for (const existing of houses) {
      if (Math.hypot(cx - existing.x, cy - existing.y) < 34) return false;
    }

    return true;
  }

  let houseIdx = 0;
  // Buat klaster pemukiman di sekitar tiap persimpangan (masing-masing 7–9 rumah)
  for (const j of junctions) {
    let placed = 0;
    let attempts = 0;
    while (placed < 8 && attempts < 90) {
      attempts += 1;
      const angle = rng() * Math.PI * 2;
      const dist = 54 + rng() * 145;
      const cx = Math.round(j.x + Math.cos(angle) * dist);
      const cy = Math.round(j.y + Math.sin(angle) * dist);

      // Pastikan tetap di sisi kota yang sama
      if (j.city === 'surya' && cx > 655) continue;
      if (j.city === 'tirta' && cx < 945) continue;
      if (!isHouseClear(cx, cy)) continue;

      houses.push({
        id: `house_${++houseIdx}`,
        city: j.city,
        x: cx,
        y: cy,
        w: Math.round(18 + rng() * 8),
        h: Math.round(14 + rng() * 6),
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
