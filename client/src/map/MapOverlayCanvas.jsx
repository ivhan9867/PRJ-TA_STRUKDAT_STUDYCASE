import { memo, useEffect, useMemo, useRef } from 'react';
import { riverCenterX, WORLD_W, WORLD_H } from './cityDecor.js';
import { generateCityHouses } from '@shared/cityHouses.js';
import worldSeed from '@shared/world.seed.json';

/**
 * Menghitung intensitas malam (0 = terang siang/pagi, 1 = malam penuh) dari simTime.
 */
function computeNightIntensity(simTime = 360) {
  const mins = ((simTime % 1440) + 1440) % 1440;
  const hour = mins / 60;
  if (hour >= 19.5 || hour < 4.5) return 1;
  if (hour >= 18 && hour < 19.5) return (hour - 18) / 1.5;
  if (hour >= 4.5 && hour < 6) return 1 - (hour - 4.5) / 1.5;
  return 0;
}

const TRIAGE_COLOR = {
  ringan: '#16A34A',
  sedang: '#D97706',
  gawat: '#DC2626',
};

const POLI_COLOR = '#3B82F6';

/**
 * Menghitung posisi (x, y) dan sudut arah (rad) pada daftar titik koordinat [{x, y}] di progres t (0..1).
 */
function samplePoints(points, progress) {
  if (!points || points.length === 0) return null;
  if (points.length === 1) {
    return { x: points[0].x, y: points[0].y, angle: 0 };
  }

  let totalLen = 0;
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len });
    totalLen += len;
  }
  if (segs.length === 0 || totalLen === 0) {
    return { x: points[0].x, y: points[0].y, angle: 0 };
  }

  const targetDist = Math.min(Math.max(progress, 0), 1) * totalLen;
  let accum = 0;

  for (const seg of segs) {
    if (accum + seg.len >= targetDist || seg === segs[segs.length - 1]) {
      const localT = seg.len > 0 ? (targetDist - accum) / seg.len : 0;
      const x = seg.a.x + (seg.b.x - seg.a.x) * localT;
      const y = seg.a.y + (seg.b.y - seg.a.y) * localT;
      const angle = Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x);
      return { x, y, angle };
    }
    accum += seg.len;
  }
  return null;
}

function buildCoordsFromPath(pathIds, nodeMap, originCoord = null) {
  const pts = [];
  if (originCoord && typeof originCoord.x === 'number') {
    pts.push({ x: originCoord.x, y: originCoord.y });
  }
  if (pathIds) {
    for (const id of pathIds) {
      const n = nodeMap.get(id);
      if (n) pts.push({ x: n.x, y: n.y });
    }
  }
  return pts;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Menggambar siluet vektor mini orang berjalan untuk pasien NPC di Canvas 60 fps.
 * Jelas dibedakan antara Poli (biru lembut) dan IGD (Ringan/Sedang/Gawat + denyut merah).
 */
function drawPatientSprite(ctx, x, y, { unit, triage, now, seedOffset, alpha, reducedMotion }) {
  const isPoli = unit === 'poli';
  const color = isPoli ? POLI_COLOR : TRIAGE_COLOR[triage] || TRIAGE_COLOR.ringan;
  const isGawat = !isPoli && triage === 'gawat';
  const isSedang = !isPoli && triage === 'sedang';

  const walkSpeed = isGawat ? 0.022 : isSedang ? 0.017 : 0.013;
  const bob = reducedMotion ? 0 : Math.sin(now * walkSpeed + seedOffset) * 1.3;
  const scale = isPoli ? 0.85 : isGawat ? 1.15 : 1.0;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  // Cincin peringatan berdenyut untuk pasien Gawat
  if (isGawat && !reducedMotion) {
    const pulse = ((now * 0.002 + seedOffset) % 1);
    ctx.beginPath();
    ctx.arc(0, -3, 6 + pulse * 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(220, 38, 38, ${(1 - pulse) * 0.6})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // Bayangan kecil di kaki
  ctx.beginPath();
  ctx.ellipse(0, 3.5, 4.2 * scale, 2 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.fill();

  ctx.translate(0, bob);
  ctx.scale(scale, scale);

  // Badan/bahu membulat dengan tepi putih agar kontras di atas jalan putih/blok
  ctx.beginPath();
  ctx.arc(0, 0.5, 4.2, Math.PI, 0, false);
  ctx.lineTo(4.2, 3);
  ctx.lineTo(-4.2, 3);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Kepala
  ctx.beginPath();
  ctx.arc(0, -5.2, 2.7, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.restore();
}

/**
 * Lapisan Canvas overlay 60 fps di atas SVG statis.
 * Menggambar garis rute rujukan Dijkstra + label menit, pasien NPC siluet orang berjalan
 * dari rumah warga, ambulans bersirine berkedip, dan ripple saat tiba di RS.
 */
export const MapOverlayCanvas = memo(function MapOverlayCanvas({
  nodes,
  walkinsRef,
  ambulancesRef,
  paused,
  simTime = 360,
  dynamicAtmosphere = true,
}) {
  const canvasRef = useRef(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const nightRef = useRef(0);
  nightRef.current = dynamicAtmosphere ? computeNightIntensity(simTime) : 0;
  const houses = useMemo(() => generateCityHouses(worldSeed.nodes, worldSeed.edges), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const ripples = []; // { x, y, color, startMs, durationMs }
    let rafId = null;
    let dashOffset = 0;
    let riverOffset = 0;

    function render(now) {
      if (document.hidden) {
        rafId = null;
        return;
      }

      ctx.clearRect(0, 0, WORLD_W, WORLD_H);

      if (!reducedMotion && !pausedRef.current) {
        dashOffset = (dashOffset - 0.65) % 36;
        riverOffset = (riverOffset + 0.35) % 64;
      }

      // 0a. Arus sungai mengalir halus (otomatis diam saat reducedMotion atau dijeda)
      if (!reducedMotion) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.setLineDash([18, 46]);
        ctx.lineDashOffset = -riverOffset;

        for (const laneOffset of [-34, 0, 34]) {
          ctx.beginPath();
          for (let y = 0; y <= WORLD_H; y += 45) {
            const x = riverCenterX(y) + laneOffset;
            if (y === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // 0b. Lampu jendela rumah warga menyala hangat saat malam hari
      const nightLevel = nightRef.current;
      if (nightLevel > 0.12) {
        ctx.save();
        for (let i = 0; i < houses.length; i++) {
          // Sekitar 75% rumah menyalakan lampu malam agar terlihat alami
          if (i % 4 === 0) continue;
          const h = houses[i];
          ctx.fillStyle = `rgba(254, 240, 138, ${(0.72 * nightLevel).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(h.x, h.y + 1, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      const ambulances = ambulancesRef?.current;
      const walkins = walkinsRef?.current;

      // 0. Micro-ripple di RS saat ambulans/pasien gawat tiba
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const t = (now - rp.startMs) / rp.durationMs;
        if (t >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 16 + t * 34, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color;
        ctx.globalAlpha = (1 - t) * 0.55;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // 1. Garis rute rujukan aktif (--accent lebar 3, putus-putus bergerak) + label estimasi menit Dijkstra
      if (ambulances && ambulances.size > 0) {
        ctx.save();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = reducedMotion ? 0 : dashOffset;

        const routeLabels = [];

        for (const [id, amb] of ambulances.entries()) {
          const progress = (now - amb.startWallMs) / Math.max(amb.durationMs, 1);
          if (progress >= 1) {
            // Munculkan ripple singkat di RS tujuan saat ambulans tiba
            if (amb.phase === 'dispatch' && !reducedMotion) {
              const dest = nodeMap.get(amb.to);
              if (dest) {
                ripples.push({
                  x: dest.x,
                  y: dest.y,
                  color: '#2563EB',
                  startMs: now,
                  durationMs: 650,
                });
              }
            }
            ambulances.delete(id);
            continue;
          }
          if (amb.phase !== 'dispatch' || !amb.path || amb.path.length < 2) continue;

          const pts = buildCoordsFromPath(amb.path, nodeMap);
          ctx.beginPath();
          pts.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();

          // Simpan titik tengah rute untuk label estimasi menit Dijkstra
          const mid = samplePoints(pts, 0.5);
          if (mid && amb.travelMin) {
            routeLabels.push({ x: mid.x, y: mid.y, text: `±${amb.travelMin} mnt` });
          }
        }
        ctx.restore();

        // Gambar pill estimasi menit di tengah rute rujukan
        for (const lbl of routeLabels) {
          ctx.save();
          ctx.font = '600 11px Figtree, system-ui, sans-serif';
          const textW = ctx.measureText(lbl.text).width;
          const pillW = textW + 14;
          const pillH = 20;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
          ctx.strokeStyle = '#2563EB';
          ctx.lineWidth = 1.25;
          drawRoundedRect(ctx, lbl.x - pillW / 2, lbl.y - pillH / 2 - 14, pillW, pillH, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#1E3A8A';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(lbl.text, lbl.x, lbl.y - 13.5);
          ctx.restore();
        }
      }

      // 2. Pasien NPC siluet orang berjalan keluar dari rumah warga
      if (walkins && walkins.size > 0) {
        let idx = 0;
        for (const [id, wk] of walkins.entries()) {
          const progress = (now - wk.startWallMs) / Math.max(wk.durationMs, 1);
          if (progress >= 1) {
            if (wk.triage === 'gawat' && !reducedMotion) {
              const dest = nodeMap.get(wk.toHospital);
              if (dest) {
                ripples.push({
                  x: dest.x,
                  y: dest.y,
                  color: '#DC2626',
                  startMs: now,
                  durationMs: 500,
                });
              }
            }
            walkins.delete(id);
            continue;
          }

          if (!wk._coords) {
            wk._coords = buildCoordsFromPath(wk.path, nodeMap, wk.originCoord);
            wk._seedOffset = (idx * 1.37) % 6.28;
          }

          const pos = samplePoints(wk._coords, progress);
          if (!pos) continue;

          // Fade-in halus saat keluar pintu rumah & fade-out saat masuk pintu RS
          const fadeIn = Math.min(1, progress / 0.08);
          const fadeOut = Math.min(1, (1 - progress) / 0.08);
          const alpha = Math.min(fadeIn, fadeOut) * 0.92;

          drawPatientSprite(ctx, pos.x, pos.y, {
            unit: wk.unit,
            triage: wk.triage,
            now,
            seedOffset: wk._seedOffset || 0,
            alpha,
            reducedMotion,
          });
          idx += 1;
        }
      }

      // 3. Ambulans (bodi detail + kaca depan + sirine berkedip + tanda plus merah + titik triase)
      if (ambulances && ambulances.size > 0) {
        const sirenRedOn = Math.floor(now / 180) % 2 === 0;

        for (const amb of ambulances.values()) {
          const progress = (now - amb.startWallMs) / Math.max(amb.durationMs, 1);
          if (progress >= 1) continue;

          if (!amb._coords) {
            amb._coords = buildCoordsFromPath(amb.path, nodeMap);
          }

          const pos = samplePoints(amb._coords, progress);
          if (!pos) continue;

          // Jejak cahaya biru singkat di belakang ambulans saat mengantar
          if (amb.phase === 'dispatch' && progress > 0.03) {
            const trailPos = samplePoints(amb._coords, Math.max(0, progress - 0.045));
            if (trailPos) {
              ctx.save();
              ctx.strokeStyle = 'rgba(37, 99, 235, 0.28)';
              ctx.lineWidth = 7;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(trailPos.x, trailPos.y);
              ctx.lineTo(pos.x, pos.y);
              ctx.stroke();
              ctx.restore();
            }
          }

          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(pos.angle);

          // Sorot lampu depan (headlight cone) ambulans saat malam hari
          if (nightLevel > 0.15) {
            const grad = ctx.createRadialGradient(14, 0, 2, 34, 0, 34);
            grad.addColorStop(0, `rgba(254, 249, 195, ${(0.45 * nightLevel).toFixed(2)})`);
            grad.addColorStop(1, 'rgba(254, 249, 195, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(13, -4);
            ctx.lineTo(48, -18);
            ctx.lineTo(48, 18);
            ctx.lineTo(13, 4);
            ctx.closePath();
            ctx.fill();
          }

          // Bayangan lembut
          ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
          drawRoundedRect(ctx, -15, -6, 30, 17, 5);
          ctx.fill();

          // Badan ambulans
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = amb.phase === 'dispatch' ? '#2563EB' : '#64748B';
          ctx.lineWidth = 2;
          drawRoundedRect(ctx, -15, -8.5, 30, 17, 5);
          ctx.fill();
          ctx.stroke();

          // Kaca depan kabin (arah kanan +x)
          ctx.fillStyle = '#DBEAFE';
          drawRoundedRect(ctx, 6.5, -5.5, 5.5, 11, 2);
          ctx.fill();

          // Tanda plus merah di atap
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(-5.5, -4.5, 3, 9);
          ctx.fillRect(-8.5, -1.5, 9, 3);

          // Lampu sirine merah-biru berkedip lembut saat mengantar pasien
          if (amb.phase === 'dispatch' && !reducedMotion) {
            ctx.beginPath();
            ctx.arc(3.5, -3.5, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = sirenRedOn ? '#DC2626' : '#93C5FD';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(3.5, 3.5, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = sirenRedOn ? '#93C5FD' : '#2563EB';
            ctx.fill();
          }

          // Titik triase pasien di pojok belakang
          if (amb.phase === 'dispatch' && amb.triage) {
            ctx.beginPath();
            ctx.arc(-11.5, -4.5, 2.6, 0, Math.PI * 2);
            ctx.fillStyle = TRIAGE_COLOR[amb.triage] || TRIAGE_COLOR.gawat;
            ctx.fill();
          }

          ctx.restore();
        }
      }

      rafId = window.requestAnimationFrame(render);
    }

    function handleVisibility() {
      if (!document.hidden && rafId === null) {
        rafId = window.requestAnimationFrame(render);
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    rafId = window.requestAnimationFrame(render);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [nodes, walkinsRef, ambulancesRef]);

  return (
    <canvas
      ref={canvasRef}
      width={WORLD_W}
      height={WORLD_H}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
});
