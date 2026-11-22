import { memo, useMemo, useState } from 'react';

/**
 * Lapisan jembatan (Jembatan Utara & Jembatan Selatan).
 * Lebar 16, dua garis pagar tipis di sisi.
 * Tertutup: abu miring-miring, lencana merah bulat dengan tanda silang di tengah, tooltip "Jembatan ditutup".
 * Khusus Dinkes: dapat diklik langsung di peta untuk membuka/menutup jembatan.
 */
export const BridgeLayer = memo(function BridgeLayer({
  nodes,
  edges,
  canToggleBridge = false,
  onToggleBridge,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const bridges = useMemo(() => edges.filter((e) => e.bridge), [edges]);

  return (
    <g className="bridge-layer">
      <defs>
        <pattern
          id="bridge-closed-stripe"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="10" height="10" fill="#E2E8F0" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#94A3B8" strokeWidth="5" />
        </pattern>
      </defs>

      {bridges.map((bridge) => {
        const a = nodeMap.get(bridge.a);
        const b = nodeMap.get(bridge.b);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const closed = Boolean(bridge.closed);
        const isHovered = hoveredId === bridge.id && canToggleBridge;

        const tooltipText = closed
          ? `${bridge.name} — Jembatan ditutup${canToggleBridge ? ' (klik untuk buka)' : ''}`
          : `${bridge.name}${canToggleBridge ? ' (klik untuk tutup)' : ''}`;

        return (
          <g
            key={bridge.id}
            style={{ cursor: canToggleBridge ? 'pointer' : 'default' }}
            role={canToggleBridge ? 'button' : undefined}
            tabIndex={canToggleBridge ? 0 : undefined}
            aria-label={tooltipText}
            onPointerDown={(e) => {
              if (canToggleBridge) e.stopPropagation();
            }}
            onClick={(e) => {
              if (!canToggleBridge) return;
              e.stopPropagation();
              onToggleBridge?.(bridge.id);
            }}
            onKeyDown={(e) => {
              if (!canToggleBridge) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleBridge?.(bridge.id);
              }
            }}
            onMouseEnter={() => setHoveredId(bridge.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <title>{tooltipText}</title>

            {/* Area klik lebih lega agar mudah diklik */}
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="transparent"
              strokeWidth="36"
            />

            {/* Bayangan jembatan di atas sungai */}
            <line
              x1={a.x}
              y1={a.y + 4}
              x2={b.x}
              y2={b.y + 4}
              stroke="rgba(15, 23, 42, 0.10)"
              strokeWidth="18"
              strokeLinecap="butt"
            />

            {/* Badan jembatan lebar 16 */}
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={closed ? 'url(#bridge-closed-stripe)' : 'var(--map-road)'}
              strokeWidth="16"
              strokeLinecap="butt"
            />

            {/* Dua garis pagar tipis di sisi atas dan bawah (sorot aksen saat hover) */}
            <line
              x1={a.x}
              y1={a.y - 9}
              x2={b.x}
              y2={b.y - 9}
              stroke={isHovered ? 'var(--accent)' : '#94A3B8'}
              strokeWidth={isHovered ? '3.2' : '2.5'}
              strokeLinecap="round"
            />
            <line
              x1={a.x}
              y1={a.y + 9}
              x2={b.x}
              y2={b.y + 9}
              stroke={isHovered ? 'var(--accent)' : '#94A3B8'}
              strokeWidth={isHovered ? '3.2' : '2.5'}
              strokeLinecap="round"
            />

            {/* Label nama jembatan */}
            <text
              x={midX}
              y={midY - 17}
              textAnchor="middle"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: 600,
                fill: closed ? 'var(--danger)' : isHovered ? 'var(--accent)' : 'var(--text-muted)',
                userSelect: 'none',
              }}
            >
              {bridge.name}
            </text>

            {/* Lencana merah bulat berisi tanda silang bila jembatan ditutup */}
            {closed && (
              <g transform={`translate(${midX}, ${midY})`}>
                <circle r="12" fill="var(--danger)" stroke="#FFFFFF" strokeWidth="2.5" />
                <line x1="-4.5" y1="-4.5" x2="4.5" y2="4.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="4.5" y1="-4.5" x2="-4.5" y2="4.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
});
