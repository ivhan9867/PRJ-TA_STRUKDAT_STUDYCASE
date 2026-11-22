const TRIAGE_STYLE = {
  gawat: { fill: '#FEE2E2', stroke: '#DC2626', ink: '#991B1B' },
  sedang: { fill: '#FEF3C7', stroke: '#D97706', ink: '#92400E' },
  ringan: { fill: '#DCFCE7', stroke: '#16A34A', ink: '#166534' },
};

/**
 * Visualisasi SVG Pohon Binary Min-Heap untuk PriorityQueue di Mode Akademik.
 * Menampilkan hingga 7 simpul (3 tingkat) agar tetap bersih dan mudah dibaca saat presentasi.
 */
export function HeapTreeVisualizer({ items = [], title }) {
  const visible = items.slice(0, 7);
  if (visible.length === 0) {
    return (
      <div className="type-caption py-4 text-center">
        Heap kosong. Tambahkan elemen untuk melihat struktur pohon biner.
      </div>
    );
  }

  // Posisi tetap untuk 3 tingkat pohon biner (viewBox 440x185)
  const positions = [
    { x: 220, y: 32 },  // 0 (akar)
    { x: 115, y: 94 },  // 1 (kiri)
    { x: 325, y: 94 },  // 2 (kanan)
    { x: 62, y: 154 },  // 3
    { x: 168, y: 154 }, // 4
    { x: 272, y: 154 }, // 5
    { x: 378, y: 154 }, // 6
  ];

  return (
    <div>
      {title && <div className="type-caption mb-2">{title}</div>}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}
      >
        <svg viewBox="0 0 440 190" className="mx-auto block w-full max-w-[460px]">
          {/* Garis induk ke anak (2i + 1 dan 2i + 2) */}
          {visible.map((_, idx) => {
            if (idx === 0) return null;
            const parentIdx = (idx - 1) >> 1;
            const p = positions[parentIdx];
            const c = positions[idx];
            return (
              <line
                key={`edge_${idx}`}
                x1={p.x}
                y1={p.y}
                x2={c.x}
                y2={c.y}
                stroke="#CBD5E1"
                strokeWidth="2"
              />
            );
          })}

          {/* Simpul heap */}
          {visible.map((item, idx) => {
            const pos = positions[idx];
            const st = TRIAGE_STYLE[item.triage] || TRIAGE_STYLE.ringan;
            return (
              <g key={`${item.code}_${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle r="24" fill={st.fill} stroke={st.stroke} strokeWidth="2.2" />
                <text
                  y="-2"
                  textAnchor="middle"
                  style={{ fontSize: '10px', fontWeight: 700, fill: st.ink, fontVariantNumeric: 'tabular-nums' }}
                >
                  {item.code}
                </text>
                <text
                  y="11"
                  textAnchor="middle"
                  style={{ fontSize: '9px', fontWeight: 600, fill: st.ink }}
                >
                  [{idx}] {item.triage}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
