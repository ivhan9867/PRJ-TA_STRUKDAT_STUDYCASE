import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StaticCityLayer } from './StaticCityLayer.jsx';
import { BridgeLayer } from './BridgeLayer.jsx';
import { HospitalMarker } from './HospitalMarker.jsx';
import { MapOverlayCanvas } from './MapOverlayCanvas.jsx';
import { WORLD_W, WORLD_H } from './cityDecor.js';

const MIN_ZOOM = 0.52;
const MAX_ZOOM = 2.5;

/**
 * Menghitung lapisan suasana warna peta berdasarkan jam simulasi (Pagi / Siang / Sore / Malam).
 * Kartu UI putih tetap terang & terbaca jelas; hanya suasana peta yang bertransisi halus.
 */
function getAtmosphereTint(simTime = 360, enabled = true) {
  if (!enabled) return 'rgba(0, 0, 0, 0)';
  const hour = Math.floor((((simTime % 1440) + 1440) % 1440) / 60);
  if (hour >= 5 && hour <= 9) return 'rgba(254, 243, 199, 0.06)';   // Pagi segar
  if (hour >= 10 && hour <= 15) return 'rgba(0, 0, 0, 0)';          // Siang cerah
  if (hour >= 16 && hour <= 18) return 'rgba(251, 146, 60, 0.15)';  // Sore keemasan
  return 'rgba(15, 23, 42, 0.34)';                                  // Malam tenang
}

/**
 * Kanvas peta interaktif 2 kota (viewBox 1600x900).
 * Pan dan zoom memakai CSS transform translate3d + scale agar tetap 60 fps.
 */
export const MapCanvas = forwardRef(function MapCanvas(
  {
    cities,
    nodes,
    edges,
    hospitals,
    selectedHospitalId,
    highlightedHospitalIds,
    walkinsRef,
    ambulancesRef,
    helpCallsRef,
    paused = false,
    simTime = 360,
    dynamicAtmosphere = true,
    canToggleBridge = false,
    onToggleBridge,
    onSelectHospital,
    onClearSelection,
  },
  ref
) {
  const containerRef = useRef(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [animating, setAnimating] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0, moved: false });
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const animTimerRef = useRef(null);

  const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  // Hitung kamera default agar seluruh peta 1600x900 pas di area peta (mengakomodasi kartu kiri 360px di desktop)
  const computeFitCamera = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0, zoom: 1 };
    const { width, height } = el.getBoundingClientRect();
    const fitScale = Math.min(width / WORLD_W, height / WORLD_H);
    const zoom = clampZoom(Math.max(0.58, fitScale * 0.98));
    const x = (width - WORLD_W * zoom) / 2;
    const y = (height - WORLD_H * zoom) / 2;
    return { x, y, zoom };
  }, []);

  const flyTo = useCallback((worldX, worldY, targetZoom = 1.45) => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const zoom = clampZoom(targetZoom);
    // Sedikit geser pusat ke kanan di layar lebar agar tidak tertutup kartu kiri 360px
    const centerOffsetX = width >= 1024 ? 170 : 0;
    const x = width / 2 + centerOffsetX - worldX * zoom;
    const y = height / 2 - worldY * zoom;

    setAnimating(true);
    setCamera({ x, y, zoom });
    window.clearTimeout(animTimerRef.current);
    animTimerRef.current = window.setTimeout(() => setAnimating(false), 420);
  }, []);

  const resetView = useCallback(() => {
    setAnimating(true);
    setCamera(computeFitCamera());
    window.clearTimeout(animTimerRef.current);
    animTimerRef.current = window.setTimeout(() => setAnimating(false), 420);
  }, [computeFitCamera]);

  const zoomBy = useCallback((delta) => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;

    setAnimating(true);
    setCamera((prev) => {
      const nextZoom = clampZoom(Number((prev.zoom + delta).toFixed(2)));
      const scaleRatio = nextZoom / prev.zoom;
      return {
        x: cx - (cx - prev.x) * scaleRatio,
        y: cy - (cy - prev.y) * scaleRatio,
        zoom: nextZoom,
      };
    });
    window.clearTimeout(animTimerRef.current);
    animTimerRef.current = window.setTimeout(() => setAnimating(false), 260);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      flyTo,
      resetView,
      zoomIn: () => zoomBy(0.25),
      zoomOut: () => zoomBy(-0.25),
    }),
    [flyTo, resetView, zoomBy]
  );

  // Atur kamera awal saat komponen terpasang & saat ukuran layar berubah
  useEffect(() => {
    setCamera(computeFitCamera());
    const onResize = () => setCamera(computeFitCamera());
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(animTimerRef.current);
    };
  }, [computeFitCamera]);

  // Zoom dengan roda mouse menuju titik kursor
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;

    setAnimating(false);
    setCamera((prev) => {
      const nextZoom = clampZoom(prev.zoom * factor);
      const ratio = nextZoom / prev.zoom;
      return {
        x: mx - (mx - prev.x) * ratio,
        y: my - (my - prev.y) * ratio,
        zoom: nextZoom,
      };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setAnimating(false);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);

    // Jika 2 jari menyentuh layar (pinch-to-zoom Android/touch)
    if (pointersRef.current.size === 2) {
      dragRef.current.active = false;
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const rect = containerRef.current?.getBoundingClientRect();
      const midX = (pts[0].x + pts[1].x) / 2 - (rect?.left || 0);
      const midY = (pts[0].y + pts[1].y) / 2 - (rect?.top || 0);
      pinchRef.current = {
        startDist: Math.max(dist, 1),
        startZoom: camera.zoom,
        startX: camera.x,
        startY: camera.y,
        midX,
        midY,
      };
      return;
    }

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: camera.x,
      originY: camera.y,
      moved: false,
    };
  };

  const handlePointerMove = (e) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch-to-zoom 2 jari di layar sentuh Android
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const p = pinchRef.current;
      const nextZoom = clampZoom(p.startZoom * (dist / p.startDist));
      const ratio = nextZoom / p.startZoom;
      setCamera({
        x: p.midX - (p.midX - p.startX) * ratio,
        y: p.midY - (p.midY - p.startY) * ratio,
        zoom: nextZoom,
      });
      return;
    }

    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      d.moved = true;
    }
    setCamera((prev) => ({
      ...prev,
      x: d.originX + dx,
      y: d.originY + dy,
    }));
  };

  const handlePointerUp = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    const d = dragRef.current;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!d.active) return;
    d.active = false;
    if (!d.moved && e.target === e.currentTarget) {
      onClearSelection?.();
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative h-full w-full overflow-hidden select-none touch-none"
      style={{
        backgroundColor: 'var(--map-land-surya)',
        cursor: dragRef.current.active ? 'grabbing' : 'grab',
      }}
    >
      <div
        className="relative"
        style={{
          width: `${WORLD_W}px`,
          height: `${WORLD_H}px`,
          transformOrigin: '0 0',
          transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`,
          transition: animating ? 'transform var(--t-slow) var(--ease)' : 'none',
          willChange: 'transform',
        }}
      >
        {/* Lapisan 1 & 2: Daratan, sungai, blok kota, taman, jalan, jembatan (SVG statis) */}
        <svg
          width={WORLD_W}
          height={WORLD_H}
          viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
          className="block h-full w-full overflow-visible"
        >
          <StaticCityLayer cities={cities} nodes={nodes} edges={edges} />
          <BridgeLayer
            nodes={nodes}
            edges={edges}
            canToggleBridge={canToggleBridge}
            onToggleBridge={onToggleBridge}
          />
        </svg>

        {/* Lapisan 3: Canvas overlay 60 fps (rute rujukan, pasien NPC, ambulans, lampu malam) */}
        <MapOverlayCanvas
          nodes={nodes}
          walkinsRef={walkinsRef}
          ambulancesRef={ambulancesRef}
          helpCallsRef={helpCallsRef}
          paused={paused}
          simTime={simTime}
          dynamicAtmosphere={dynamicAtmosphere}
        />

        {/* Lapisan 3b: Tint suasana waktu 24 jam (Pagi / Siang / Sore / Malam) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: getAtmosphereTint(simTime, dynamicAtmosphere),
            transition: 'background-color 1500ms var(--ease)',
          }}
        />

        {/* Lapisan 4: Marker 6 rumah sakit (selalu paling atas) */}
        <svg
          width={WORLD_W}
          height={WORLD_H}
          viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
          className="pointer-events-none absolute inset-0 block h-full w-full overflow-visible"
        >
          <g className="hospital-markers-layer pointer-events-auto">
            {hospitals.map((hospital) => {
              const dimmed =
                highlightedHospitalIds !== null &&
                !highlightedHospitalIds.has(hospital.id);
              return (
                <HospitalMarker
                  key={hospital.id}
                  hospital={hospital}
                  zoom={camera.zoom}
                  selected={hospital.id === selectedHospitalId}
                  dimmed={dimmed}
                  onSelect={onSelectHospital}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
});
