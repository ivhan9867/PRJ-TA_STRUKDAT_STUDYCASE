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
 * Interpolasi sudut terpendek (radian) agar ambulans berbelok halus di persimpangan.
 */
function lerpAngle(current, target, factor) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * factor;
}

/**
 * Kurva akselerasi lembut saat berangkat (6% awal) dan pengereman lembut saat tiba (6% akhir).
 */
function easeDepartureArrival(t) {
  const clamped = Math.min(1, Math.max(0, t));
  const ramp = 0.06;
  if (clamped < ramp) {
    const u = clamped / ramp;
    return ramp * (u * u * 0.5 + u * 0.5);
  }
  if (clamped > 1 - ramp) {
    const u = (1 - clamped) / ramp;
    return 1 - ramp * (u * u * 0.5 + u * 0.5);
  }
  return clamped;
}

/**
 * Pra-hitung panjang & sudut tiap segmen sekali per entitas agar loop 60 fps bebas alokasi array & Math.hypot.
 */
function buildPathMeta(points) {
  if (!points || points.length === 0) return null;
  if (points.length === 1) {
    return { points, segs: [], totalLen: 0 };
  }
  let totalLen = 0;
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    segs.push({ a, b, len, angle });
    totalLen += len;
  }
  return { points, segs, totalLen };
}

function samplePathMeta(meta, progress) {
  if (!meta || meta.points.length === 0) return null;
  if (meta.segs.length === 0 || meta.totalLen === 0) {
    return { x: meta.points[0].x, y: meta.points[0].y, angle: 0 };
  }

  const targetDist = Math.min(Math.max(progress, 0), 1) * meta.totalLen;
  let accum = 0;
  const segs = meta.segs;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (accum + seg.len >= targetDist || i === segs.length - 1) {
      const localT = seg.len > 0 ? (targetDist - accum) / seg.len : 0;
      return {
        x: seg.a.x + (seg.b.x - seg.a.x) * localT,
        y: seg.a.y + (seg.b.y - seg.a.y) * localT,
        angle: seg.angle,
      };
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

function drawPatientSprite(ctx, x, y, { unit, triage, animNow, seedOffset, alpha, reducedMotion }) {
  const isPoli = unit === 'poli';
  const color = isPoli ? POLI_COLOR : TRIAGE_COLOR[triage] || TRIAGE_COLOR.ringan;
  const isGawat = !isPoli && triage === 'gawat';
  const isSedang = !isPoli && triage === 'sedang';

  const walkSpeed = isGawat ? 0.022 : isSedang ? 0.017 : 0.013;
  const bob = reducedMotion ? 0 : Math.sin(animNow * walkSpeed + seedOffset) * 1.3;
  const scale = isPoli ? 0.85 : isGawat ? 1.15 : 1.0;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  if (isGawat && !reducedMotion) {
    const pulse = (animNow * 0.002 + seedOffset) % 1;
    ctx.beginPath();
    ctx.arc(0, -3, 6 + pulse * 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(220, 38, 38, ${(1 - pulse) * 0.6})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(0, 3.5, 4.2 * scale, 2 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.fill();

  ctx.translate(0, bob);
  ctx.scale(scale, scale);

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
 * Lapisan Canvas overlay 60 fps dengan:
 * - Jam animasi virtual (true pause freeze saat Jeda ditekan)
 * - Rotasi belok halus (lerpAngle) + akselerasi/pengereman lembut untuk ambulans
 * - Lampu jendela rumah & headlight ambulans saat malam
 * - Indikator lembut "Tiba" + ripple saat ambulans tiba di RS tujuan
 */
export const MapOverlayCanvas = memo(function MapOverlayCanvas({
  nodes,
  walkinsRef,
  ambulancesRef,
  helpCallsRef,
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
    const ripples = [];
    const floatingNotices = []; // { x, y, text, color, startAnimMs, durationMs }
    let rafId = null;
    let dashOffset = 0;
    let riverOffset = 0;

    // Jam animasi virtual: berhenti persis saat simulasi dijeda (true pause freeze)
    let animNow = 0;
    let lastWallNow = performance.now();

    function render(wallNow) {
      if (document.hidden) {
        rafId = null;
        return;
      }

      const rawDt = Math.min(64, Math.max(0, wallNow - lastWallNow));
      lastWallNow = wallNow;
      if (!pausedRef.current) {
        animNow += rawDt;
      }

      ctx.clearRect(0, 0, WORLD_W, WORLD_H);

      if (!reducedMotion && !pausedRef.current) {
        dashOffset = (dashOffset - 0.65) % 36;
        riverOffset = (riverOffset + 0.35) % 64;
      }

      // 0a. Arus sungai mengalir halus
      if (!reducedMotion) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.setLineDash([18, 46]);
        ctx.lineDashOffset = -riverOffset;

        for (const laneOffset of [-38, 0, 38]) {
          ctx.beginPath();
          for (let y = 0; y <= WORLD_H; y += 50) {
            const x = riverCenterX(y) + laneOffset;
            if (y === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // 0b. Lampu jendela rumah warga menyala hangat saat malam hari (1 batch fill call untuk seluruh rumah)
      const nightLevel = nightRef.current;
      if (nightLevel > 0.12) {
        ctx.save();
        ctx.fillStyle = `rgba(254, 240, 138, ${(0.72 * nightLevel).toFixed(2)})`;
        ctx.beginPath();
        for (let i = 0; i < houses.length; i++) {
          if (i % 4 === 0) continue;
          const h = houses[i];
          ctx.moveTo(h.x + 2.3, h.y + 1);
          ctx.arc(h.x, h.y + 1, 2.3, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      }

      const ambulances = ambulancesRef?.current;
      const walkins = walkinsRef?.current;
      const helpCalls = helpCallsRef?.current;

      // 0b2. Animasi panggilan bantuan ambulans (dialing / sinyal radio antar-RS)
      if (helpCalls && helpCalls.size > 0) {
        for (const [callId, call] of helpCalls.entries()) {
          if (call._startAnimMs === undefined) call._startAnimMs = animNow;
          const t = (animNow - call._startAnimMs) / Math.max(call.durationMs || 2400, 1);
          if (t >= 1) {
            helpCalls.delete(callId);
            continue;
          }
          const fromNode = nodeMap.get(call.from);
          const toNode = nodeMap.get(call.to);
          if (!fromNode || !toNode) continue;

          const fadeAlpha = t < 0.12 ? t / 0.12 : t > 0.82 ? (1 - t) / 0.18 : 1;

          // Gelombang sonar radio melingkar memancar dari RS asal
          if (!reducedMotion) {
            for (let ring = 0; ring < 3; ring++) {
              const rt = (t * 2.4 + ring * 0.33) % 1;
              ctx.save();
              ctx.beginPath();
              ctx.arc(fromNode.x, fromNode.y, 18 + rt * 52, 0, Math.PI * 2);
              ctx.strokeStyle = '#F59E0B';
              ctx.globalAlpha = (1 - rt) * 0.65 * fadeAlpha;
              ctx.lineWidth = 2.4;
              ctx.stroke();
              ctx.restore();
            }
          }

          // Garis lengkung sinyal radio dari RS asal ke RS penolong
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2 - Math.min(110, Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y) * 0.16);

          ctx.save();
          ctx.globalAlpha = 0.85 * fadeAlpha;
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'round';
          ctx.setLineDash([8, 8]);
          ctx.lineDashOffset = reducedMotion ? 0 : dashOffset * 1.4;
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.quadraticCurveTo(midX, midY, toNode.x, toNode.y);
          ctx.stroke();

          // Titik pulsa sinyal meluncur sepanjang kurva dari RS asal ke RS tujuan
          if (!reducedMotion) {
            const p = (t * 2.2) % 1;
            const inv = 1 - p;
            const sx = inv * inv * fromNode.x + 2 * inv * p * midX + p * p * toNode.x;
            const sy = inv * inv * fromNode.y + 2 * inv * p * midY + p * p * toNode.y;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FEF3C7';
            ctx.fill();
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Pil "Memanggil bantuan..." di atas RS asal
          ctx.setLineDash([]);
          ctx.font = '600 11px Figtree, system-ui, sans-serif';
          const labelText = 'Memanggil bantuan...';
          const textW = ctx.measureText(labelText).width;
          const pillW = textW + 24;
          const pillH = 22;
          const px = fromNode.x;
          const py = fromNode.y - 46;
          ctx.fillStyle = 'rgba(255, 251, 235, 0.96)';
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 1.5;
          drawRoundedRect(ctx, px - pillW / 2, py - pillH / 2, pillW, pillH, 11);
          ctx.fill();
          ctx.stroke();

          // Titik indikator berkedip di kiri pil
          const blink = Math.floor(animNow / 240) % 2 === 0;
          ctx.beginPath();
          ctx.arc(px - pillW / 2 + 10, py, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = blink ? '#D97706' : '#FCD34D';
          ctx.fill();

          ctx.fillStyle = '#92400E';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, px + 4, py + 0.5);
          ctx.restore();
        }
      }

      // 0c. Micro-ripple di RS saat ambulans/pasien gawat tiba
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const t = (animNow - rp.startAnimMs) / rp.durationMs;
        if (t >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 18 + t * 38, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color;
        ctx.globalAlpha = (1 - t) * 0.55;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // 1. Garis rute rujukan & jemputan aktif + label estimasi menit Dijkstra
      if (ambulances && ambulances.size > 0) {
        const routeLabels = [];

        for (const [id, amb] of ambulances.entries()) {
          if (amb._startAnimMs === undefined) amb._startAnimMs = animNow;
          const progress = (animNow - amb._startAnimMs) / Math.max(amb.durationMs, 1);
          if (progress >= 1) {
            if ((amb.phase === 'dispatch' || amb.phase === 'pickup') && !reducedMotion) {
              const dest = nodeMap.get(amb.to);
              if (dest) {
                const isPickup = amb.phase === 'pickup';
                const noticeColor = isPickup ? '#D97706' : amb.isAssist ? '#0891B2' : '#2563EB';
                ripples.push({
                  x: dest.x,
                  y: dest.y,
                  color: noticeColor,
                  startAnimMs: animNow,
                  durationMs: 650,
                });
                floatingNotices.push({
                  x: dest.x,
                  y: dest.y - 36,
                  text: isPickup ? 'Jemput' : 'Tiba',
                  color: noticeColor,
                  startAnimMs: animNow,
                  durationMs: 950,
                });
              }
            }
            ambulances.delete(id);
            continue;
          }
          if ((amb.phase !== 'dispatch' && amb.phase !== 'pickup') || !amb.path || amb.path.length < 2) continue;

          if (!amb._pathMeta) {
            const coords = buildCoordsFromPath(amb.path, nodeMap);
            amb._coords = coords;
            amb._pathMeta = buildPathMeta(coords);
          }

          const isPickup = amb.phase === 'pickup';
          const isAssistDispatch = amb.phase === 'dispatch' && amb.isAssist;
          const strokeColor = isPickup ? '#D97706' : isAssistDispatch ? '#0891B2' : '#2563EB';

          ctx.save();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = isAssistDispatch ? 3.8 : 3.4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.setLineDash(isPickup ? [7, 7] : [10, 8]);
          ctx.lineDashOffset = reducedMotion ? 0 : isPickup ? dashOffset * 1.25 : dashOffset;

          ctx.beginPath();
          amb._coords.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
          ctx.restore();

          const mid = samplePathMeta(amb._pathMeta, 0.5);
          if (mid && amb.travelMin) {
            routeLabels.push({
              x: mid.x,
              y: mid.y,
              text: isPickup
                ? `Jemput · ±${amb.travelMin} mnt`
                : isAssistDispatch
                  ? `Bantuan · ±${amb.travelMin} mnt`
                  : `±${amb.travelMin} mnt`,
              borderColor: strokeColor,
              textColor: isPickup ? '#92400E' : isAssistDispatch ? '#155E75' : '#1E3A8A',
            });
          }
        }

        for (const lbl of routeLabels) {
          ctx.save();
          ctx.font = '600 11px Figtree, system-ui, sans-serif';
          const textW = ctx.measureText(lbl.text).width;
          const pillW = textW + 14;
          const pillH = 20;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.strokeStyle = lbl.borderColor;
          ctx.lineWidth = 1.3;
          drawRoundedRect(ctx, lbl.x - pillW / 2, lbl.y - pillH / 2 - 14, pillW, pillH, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = lbl.textColor;
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
          if (wk._startAnimMs === undefined) wk._startAnimMs = animNow;
          const progress = (animNow - wk._startAnimMs) / Math.max(wk.durationMs, 1);
          if (progress >= 1) {
            if (wk.triage === 'gawat' && !reducedMotion) {
              const dest = nodeMap.get(wk.toHospital);
              if (dest) {
                ripples.push({
                  x: dest.x,
                  y: dest.y,
                  color: '#DC2626',
                  startAnimMs: animNow,
                  durationMs: 500,
                });
              }
            }
            walkins.delete(id);
            continue;
          }

          if (!wk._pathMeta) {
            const coords = buildCoordsFromPath(wk.path, nodeMap, wk.originCoord);
            wk._pathMeta = buildPathMeta(coords);
            wk._seedOffset = (idx * 1.37) % 6.28;
          }

          const pos = samplePathMeta(wk._pathMeta, progress);
          if (!pos) continue;

          const fadeIn = Math.min(1, progress / 0.08);
          const fadeOut = Math.min(1, (1 - progress) / 0.08);
          const alpha = Math.min(fadeIn, fadeOut) * 0.92;

          drawPatientSprite(ctx, pos.x, pos.y, {
            unit: wk.unit,
            triage: wk.triage,
            animNow,
            seedOffset: wk._seedOffset || 0,
            alpha,
            reducedMotion,
          });
          idx += 1;
        }
      }

      // 3. Ambulans reguler & ambulans bantuan (belok halus lerpAngle + akselerasi + sirine + headlight)
      if (ambulances && ambulances.size > 0) {
        const sirenRedOn = Math.floor(animNow / 180) % 2 === 0;
        const assistSirenOn = Math.floor(animNow / 130) % 2 === 0;

        for (const amb of ambulances.values()) {
          const rawProgress = (animNow - (amb._startAnimMs ?? animNow)) / Math.max(amb.durationMs, 1);
          if (rawProgress >= 1) continue;

          if (!amb._pathMeta) {
            const coords = buildCoordsFromPath(amb.path, nodeMap);
            amb._coords = coords;
            amb._pathMeta = buildPathMeta(coords);
          }

          const easedProgress = easeDepartureArrival(rawProgress);
          const pos = samplePathMeta(amb._pathMeta, easedProgress);
          if (!pos) continue;

          // Rotasi belok halus di persimpangan
          if (amb._smoothAngle === undefined) {
            amb._smoothAngle = pos.angle;
          } else if (!pausedRef.current) {
            amb._smoothAngle = lerpAngle(amb._smoothAngle, pos.angle, 0.18);
          }

          const isPickup = amb.phase === 'pickup';
          const isAssist = Boolean(amb.isAssist) || isPickup;
          const isActiveEmergency = amb.phase === 'dispatch' || isPickup;

          // Jejak cahaya di belakang ambulans saat menjemput / mengantar
          if (isActiveEmergency && easedProgress > 0.03) {
            const trailPos = samplePathMeta(amb._pathMeta, Math.max(0, easedProgress - 0.04));
            if (trailPos) {
              ctx.save();
              ctx.strokeStyle = isPickup
                ? 'rgba(245, 158, 11, 0.34)'
                : isAssist
                  ? 'rgba(8, 145, 178, 0.34)'
                  : 'rgba(37, 99, 235, 0.28)';
              ctx.lineWidth = isAssist ? 8 : 7;
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
          ctx.rotate(amb._smoothAngle);

          // Sorot lampu depan (headlight cone) ambulans saat malam hari
          if (nightLevel > 0.15) {
            const grad = ctx.createRadialGradient(14, 0, 2, 36, 0, 38);
            grad.addColorStop(0, `rgba(254, 249, 195, ${(0.45 * nightLevel).toFixed(2)})`);
            grad.addColorStop(1, 'rgba(254, 249, 195, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(13, -4);
            ctx.lineTo(52, -20);
            ctx.lineTo(52, 20);
            ctx.lineTo(13, 4);
            ctx.closePath();
            ctx.fill();
          }

          // Bayangan lembut
          ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
          drawRoundedRect(ctx, -15, -6, 30, 17, 5);
          ctx.fill();

          // Badan ambulans (ambulans bantuan memakai latar krem-putih & garis tepi amber/tosca)
          ctx.fillStyle = isAssist ? '#FFFBEB' : '#FFFFFF';
          ctx.strokeStyle = isPickup
            ? '#D97706'
            : isAssist && amb.phase === 'dispatch'
              ? '#0891B2'
              : amb.phase === 'dispatch'
                ? '#2563EB'
                : '#64748B';
          ctx.lineWidth = isAssist ? 2.3 : 2;
          drawRoundedRect(ctx, -15, -8.5, 30, 17, 5);
          ctx.fill();
          ctx.stroke();

          // Strip darurat amber di sisi badan khusus ambulans bantuan
          if (isAssist) {
            ctx.fillStyle = '#F59E0B';
            ctx.fillRect(-13, -7.5, 19, 2.2);
            ctx.fillRect(-13, 5.3, 19, 2.2);
          }

          // Kaca depan kabin
          ctx.fillStyle = isAssist ? '#CFFAFE' : '#DBEAFE';
          drawRoundedRect(ctx, 6.5, -5.5, 5.5, 11, 2);
          ctx.fill();

          // Tanda plus di atap (tosca untuk ambulans bantuan, merah untuk reguler)
          ctx.fillStyle = isAssist ? '#0891B2' : '#DC2626';
          ctx.fillRect(-5.5, -4.5, 3, 9);
          ctx.fillRect(-8.5, -1.5, 9, 3);

          // Lampu sirine berkedip (amber-cyan cepat untuk ambulans bantuan; merah-biru untuk reguler)
          if (isActiveEmergency && !reducedMotion) {
            ctx.beginPath();
            ctx.arc(3.5, -3.5, 2.3, 0, Math.PI * 2);
            ctx.fillStyle = isAssist
              ? assistSirenOn
                ? '#F59E0B'
                : '#67E8F9'
              : sirenRedOn
                ? '#DC2626'
                : '#93C5FD';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(3.5, 3.5, 2.3, 0, Math.PI * 2);
            ctx.fillStyle = isAssist
              ? assistSirenOn
                ? '#67E8F9'
                : '#0891B2'
              : sirenRedOn
                ? '#93C5FD'
                : '#2563EB';
            ctx.fill();
          }

          // Titik triase pasien di pojok belakang saat membawa pasien
          if (amb.phase === 'dispatch' && amb.triage) {
            ctx.beginPath();
            ctx.arc(-11.5, -4.5, 2.6, 0, Math.PI * 2);
            ctx.fillStyle = TRIAGE_COLOR[amb.triage] || TRIAGE_COLOR.gawat;
            ctx.fill();
          }

          ctx.restore();
        }
      }

      // 4. Indikator lembut fade-up saat ambulans tiba di RS tujuan
      for (let i = floatingNotices.length - 1; i >= 0; i--) {
        const fn = floatingNotices[i];
        const t = (animNow - fn.startAnimMs) / fn.durationMs;
        if (t >= 1) {
          floatingNotices.splice(i, 1);
          continue;
        }
        const yOff = t * 22;
        const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.font = '600 11px Figtree, system-ui, sans-serif';
        const pillW = 46;
        const pillH = 20;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = fn.color;
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, fn.x - pillW / 2, fn.y - yOff - pillH / 2, pillW, pillH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = fn.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fn.text, fn.x, fn.y - yOff + 0.5);
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(render);
    }

    function handleVisibility() {
      if (!document.hidden && rafId === null) {
        lastWallNow = performance.now();
        rafId = window.requestAnimationFrame(render);
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    rafId = window.requestAnimationFrame(render);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [nodes, walkinsRef, ambulancesRef, helpCallsRef, houses]);

  return (
    <canvas
      ref={canvasRef}
      width={WORLD_W}
      height={WORLD_H}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
});
