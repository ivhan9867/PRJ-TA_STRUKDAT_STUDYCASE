import { memo, useMemo } from 'react';
import { generateCityDecor, riverCenterX, riverHalfWidth, WORLD_W, WORLD_H } from './cityDecor.js';
import { generateCityHouses } from '@shared/cityHouses.js';

/**
 * Membangun path SVG untuk daratan Surya, daratan Tirta, dan sungai melengkung di tengah (2200x1260).
 */
function buildGeographyPaths() {
  const steps = 22;
  const leftEdge = [];
  const rightEdge = [];
  const centerLine = [];

  for (let i = 0; i <= steps; i++) {
    const y = (WORLD_H / steps) * i;
    const cx = riverCenterX(y);
    const hw = riverHalfWidth(y);
    leftEdge.push([Math.round(cx - hw), Math.round(y)]);
    rightEdge.push([Math.round(cx + hw), Math.round(y)]);
    centerLine.push([Math.round(cx), Math.round(y)]);
  }

  const leftLine = leftEdge.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const rightLineRev = [...rightEdge]
    .reverse()
    .map(([x, y]) => `L ${x} ${y}`)
    .join(' ');
  const rightLineFwd = rightEdge.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

  const riverPath = `${leftLine} ${rightLineRev} Z`;
  const suryaLandPath = `M 0 0 ${leftLine.replace('M', 'L')} L 0 ${WORLD_H} Z`;
  const tirtaLandPath = `${rightLineFwd} L ${WORLD_W} ${WORLD_H} L ${WORLD_W} 0 Z`;

  // Garis arus sungai halus (dekoratif)
  const rippleA = centerLine
    .filter((_, idx) => idx % 2 === 0)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x - 22} ${y}`)
    .join(' ');
  const rippleB = centerLine
    .filter((_, idx) => idx % 2 === 1)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x + 24} ${y}`)
    .join(' ');

  return { riverPath, suryaLandPath, tirtaLandPath, rippleA, rippleB };
}

/**
 * Lapisan peta SVG statis (daratan, sungai, blok kota, taman, pemukiman rumah warga, nama kota, jalan).
 * Di-memo agar TIDAK PERNAH dirender ulang saat world:tick masuk (0 ms biaya per tick).
 */
export const StaticCityLayer = memo(function StaticCityLayer({ cities, nodes, edges }) {
  const geo = useMemo(() => buildGeographyPaths(), []);
  const decor = useMemo(() => generateCityDecor(nodes, edges), [nodes, edges]);
  const houses = useMemo(() => generateCityHouses(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const roadEdges = useMemo(() => edges.filter((e) => !e.bridge), [edges]);

  return (
    <g className="static-city-layer" pointerEvents="none">
      {/* 1. Daratan dua kota */}
      <path d={geo.suryaLandPath} fill="var(--map-land-surya)" />
      <path d={geo.tirtaLandPath} fill="var(--map-land-tirta)" />

      {/* 2. Sungai melengkung di tengah dengan tepi sungai bertingkat (shoreline) */}
      <path
        d={geo.riverPath}
        fill="var(--map-water)"
        stroke="#DCEBF8"
        strokeWidth="14"
        strokeLinejoin="round"
      />
      <path
        d={geo.riverPath}
        fill="var(--map-water)"
        stroke="#A9CBEB"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d={geo.rippleA}
        fill="none"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="24 38"
      />
      <path
        d={geo.rippleB}
        fill="none"
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="18 46"
      />

      {/* Landmark khas Kota Surya: Alun-alun bundar berair mancur */}
      <g transform="translate(330, 580)">
        <circle r="46" fill="var(--map-park)" stroke="#B7D9BE" strokeWidth="2.2" />
        <line x1="-44" y1="0" x2="44" y2="0" stroke="#F8FAFC" strokeWidth="4.5" />
        <line x1="0" y1="-44" x2="0" y2="44" stroke="#F8FAFC" strokeWidth="4.5" />
        <circle r="18" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
        <circle r="11" fill="#93C5FD" opacity="0.85" />
        <circle r="4" fill="#FFFFFF" opacity="0.9" />
      </g>

      {/* Landmark khas Kota Tirta: Dermaga sungai & perahu kecil */}
      <g transform="translate(1224, 640)">
        <rect x="-20" y="-16" width="32" height="8" rx="2" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
        <rect x="-14" y="8" width="26" height="8" rx="2" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
        <rect x="8" y="-26" width="9" height="52" rx="2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
        <path d="M-32 -3 Q-24 -10 -15 -3 Q-24 4 -32 -3 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.2" />
      </g>

      {/* 3. Taman hijau dan pohon */}
      <g>
        {decor.parks.map((p) => (
          <circle
            key={p.id}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill="var(--map-park)"
            opacity="0.92"
          />
        ))}
        {decor.trees.map((t) => (
          <circle
            key={t.id}
            cx={t.cx}
            cy={t.cy}
            r={t.r}
            fill="#B7D9BE"
          />
        ))}
      </g>

      {/* 4. Blok gedung kota dengan bayangan tipis */}
      <g>
        {decor.blocks.map((b) => (
          <g key={b.id}>
            <rect
              x={b.x + 2}
              y={b.y + 3}
              width={b.w}
              height={b.h}
              rx={b.rx}
              fill="rgba(15, 23, 42, 0.045)"
            />
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={b.rx}
              fill="var(--map-block)"
            />
          </g>
        ))}
      </g>

      {/* 5. Gang / jalan lingkungan tipis dari rumah warga menuju persimpangan */}
      <g strokeLinecap="round" opacity="0.65">
        {houses.map((h) => (
          <line
            key={`${h.id}_lane`}
            x1={h.x}
            y1={h.y}
            x2={h.junctionX}
            y2={h.junctionY}
            stroke="#FFFFFF"
            strokeWidth="4.5"
          />
        ))}
      </g>

      {/* 6. Nama kota besar (watermark 6% opasitas di belakang marker) */}
      <g>
        {cities.map((city) => (
          <text
            key={city.id}
            x={city.labelAt[0]}
            y={city.labelAt[1]}
            textAnchor="middle"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '64px',
              fontWeight: 600,
              fill: 'var(--text)',
              opacity: 0.06,
              letterSpacing: '0.02em',
              userSelect: 'none',
            }}
          >
            {city.name}
          </text>
        ))}
      </g>

      {/* 7. Jalan utama (2 lapis: tepi --map-road-edge lebar 18, isi --map-road lebar 14) */}
      <g strokeLinecap="round" strokeLinejoin="round">
        {roadEdges.map((edge) => {
          const a = nodeMap.get(edge.a);
          const b = nodeMap.get(edge.b);
          return (
            <line
              key={`${edge.id}_edge`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--map-road-edge)"
              strokeWidth="18"
            />
          );
        })}
        {roadEdges.map((edge) => {
          const a = nodeMap.get(edge.a);
          const b = nodeMap.get(edge.b);
          return (
            <line
              key={`${edge.id}_fill`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--map-road)"
              strokeWidth="14"
            />
          );
        })}
        {/* Marka garis tengah jalan halus */}
        {roadEdges.map((edge) => {
          const a = nodeMap.get(edge.a);
          const b = nodeMap.get(edge.b);
          return (
            <line
              key={`${edge.id}_dash`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#DCE4EE"
              strokeWidth="1.5"
              strokeDasharray="8 12"
            />
          );
        })}
      </g>

      {/* 8. Klaster rumah warga (badan putih + atap miring lembut + bayangan) */}
      <g>
        {houses.map((h) => {
          const hw = h.w / 2;
          const hh = h.h / 2;
          const roofFill =
            h.city === 'surya'
              ? h.roofShade === 0
                ? '#B9CCE2'
                : '#C7D6E8'
              : h.roofShade === 0
                ? '#B4D6CA'
                : '#C2DFD5';
          const roofRidge = h.city === 'surya' ? '#9EB6D2' : '#96C0B2';

          return (
            <g key={h.id} transform={`translate(${h.x}, ${h.y})`}>
              {/* Bayangan tipis */}
              <rect
                x={-hw + 2}
                y={-hh + 3}
                width={h.w}
                height={h.h}
                rx={3}
                fill="rgba(15, 23, 42, 0.08)"
              />
              {/* Badan rumah */}
              <rect
                x={-hw}
                y={-hh}
                width={h.w}
                height={h.h}
                rx={3}
                fill="#FFFFFF"
                stroke="#D0D8E3"
                strokeWidth="1"
              />
              {/* Atap dua sisi */}
              <polygon
                points={`${-hw - 1},${-hh + 2} 0,${-hh - 5} ${hw + 1},${-hh + 2} ${hw + 1},${hh - 1} ${-hw - 1},${hh - 1}`}
                fill={roofFill}
              />
              <line
                x1={-hw + 2}
                y1={-hh + 1}
                x2={hw - 2}
                y2={-hh + 1}
                stroke={roofRidge}
                strokeWidth="1.2"
              />
            </g>
          );
        })}
      </g>

      {/* Titik persimpangan halus */}
      <g>
        {nodes
          .filter((n) => n.kind === 'junction')
          .map((n) => (
            <circle
              key={n.id}
              cx={n.x}
              cy={n.y}
              r="7"
              fill="var(--map-road)"
              stroke="var(--map-road-edge)"
              strokeWidth="1.5"
            />
          ))}
      </g>
    </g>
  );
});
