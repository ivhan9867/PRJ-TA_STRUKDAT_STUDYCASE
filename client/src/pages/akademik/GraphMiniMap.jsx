import worldSeed from '@shared/world.seed.json';

/**
 * Peta mini SVG 2 kota untuk Mode Akademik tab Graph.
 * Menampilkan 17 simpul, 21 ruas jalan, status jembatan, dan menyorot jalur
 * Dijkstra (biru) serta jalur BFS (hijau) secara visual.
 */
export function GraphMiniMap({ bridges = [], dijkstraPath = [], bfsPath = [], fromId, toId }) {
  const nodeMap = new Map(worldSeed.nodes.map((n) => [n.id, n]));
  const bridgeClosed = new Map(bridges.map((b) => [b.id, b.closed]));

  const buildPathD = (ids) => {
    if (!ids || ids.length < 2) return '';
    return ids
      .map((id, idx) => {
        const n = nodeMap.get(id);
        return n ? `${idx === 0 ? 'M' : 'L'} ${n.x} ${n.y}` : '';
      })
      .join(' ');
  };

  const dijkstraD = buildPathD(dijkstraPath);
  const bfsD = buildPathD(bfsPath);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ borderColor: 'var(--border)', backgroundColor: '#E8EFF8' }}
    >
      <svg viewBox="0 0 2200 1260" className="block w-full">
        {/* Daratan Surya, Sungai, Daratan Tirta */}
        <rect x="0" y="0" width="980" height="1260" fill="#E8EFF8" />
        <rect x="1220" y="0" width="980" height="1260" fill="#E6F2EF" />
        <rect x="980" y="0" width="240" height="1260" fill="#BFD9F0" />

        {/* Semua ruas jalan & jembatan */}
        {worldSeed.edges.map((e) => {
          const a = nodeMap.get(e.a);
          const b = nodeMap.get(e.b);
          const closed = e.bridge && bridgeClosed.get(e.id);
          return (
            <g key={e.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={closed ? '#DC2626' : '#FFFFFF'}
                strokeWidth={e.bridge ? 16 : 12}
                strokeDasharray={closed ? '16 12' : undefined}
                strokeLinecap="round"
              />
              {closed && (
                <g transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}>
                  <circle r="20" fill="#DC2626" />
                  <line x1="-8" y1="-8" x2="8" y2="8" stroke="#FFFFFF" strokeWidth="4" />
                  <line x1="8" y1="-8" x2="-8" y2="8" stroke="#FFFFFF" strokeWidth="4" />
                </g>
              )}
            </g>
          );
        })}

        {/* Sorotan jalur BFS (hijau transparan lebar) */}
        {bfsD && (
          <path
            d={bfsD}
            fill="none"
            stroke="#16A34A"
            strokeWidth="14"
            strokeOpacity="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Sorotan jalur Dijkstra (biru solid putus-putus) */}
        {dijkstraD && (
          <path
            d={dijkstraD}
            fill="none"
            stroke="#2563EB"
            strokeWidth="8"
            strokeDasharray="18 10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Simpul jalan & 6 RS */}
        {worldSeed.nodes.map((n) => {
          const isHospital = n.kind === 'hospital';
          const isEndpoint = n.id === fromId || n.id === toId;
          const rsInfo = isHospital ? worldSeed.hospitals.find((h) => h.id === n.id) : null;

          return (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <circle
                r={isHospital ? (isEndpoint ? 26 : 20) : 9}
                fill={isEndpoint ? '#2563EB' : isHospital ? '#FFFFFF' : '#94A3B8'}
                stroke={isHospital ? '#2563EB' : '#FFFFFF'}
                strokeWidth={isHospital ? 5 : 2}
              />
              {rsInfo && (
                <text
                  y={-34}
                  textAnchor="middle"
                  style={{ fontSize: '24px', fontWeight: 700, fill: '#0F172A' }}
                >
                  {rsInfo.name.replace('RS ', '')}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div
        className="flex flex-wrap items-center gap-4 px-3.5 py-2 text-[12px]"
        style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-5 rounded bg-[#2563EB]" />
          Rute tercepat (Dijkstra)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-5 rounded bg-[#16A34A]/50" />
          Lompatan minimum (BFS)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
          Jembatan ditutup
        </span>
      </div>
    </div>
  );
}
