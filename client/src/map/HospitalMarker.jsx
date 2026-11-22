import { memo, useState } from 'react';

const STATUS_COLOR = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  neutral: 'var(--neutral)',
};

const STATUS_SOFT = {
  ok: 'var(--ok-soft)',
  warn: 'var(--warn-soft)',
  danger: 'var(--danger-soft)',
  neutral: 'var(--neutral-soft)',
};

const STATUS_WORD = {
  ok: 'Lega',
  warn: 'Hampir penuh',
  danger: 'Penuh',
  neutral: 'Memuat',
};

const SCALE_BY_TYPE = {
  A: 1.12,
  B: 0.96,
  C: 0.84,
};

/**
 * Marker Gedung Rumah Sakit 2.5D di atas peta SVG.
 * Bentuk gedung berbeda menurut tipe (A: gedung utama + sayap, B: dua blok, C: kompak).
 * Warna atap, palang medis, dan cincin dasar mengikuti status (Lega / Hampir penuh / Penuh).
 */
export const HospitalMarker = memo(function HospitalMarker({
  hospital,
  zoom,
  selected = false,
  dimmed = false,
  onSelect,
}) {
  const [hovered, setHovered] = useState(false);
  const typeScale = SCALE_BY_TYPE[hospital.type] || 0.96;
  const color = STATUS_COLOR[hospital.status] || STATUS_COLOR.ok;
  const softBg = STATUS_SOFT[hospital.status] || STATUS_SOFT.ok;
  const statusWord = STATUS_WORD[hospital.status] || 'Lega';
  const showName = !selected && (hovered || zoom > 1.25);
  const isFull = hospital.status === 'danger';

  const usedBeds = (hospital.inap?.used ?? 0) + (hospital.icu?.used ?? 0);
  const totalBeds = (hospital.inap?.total ?? 0) + (hospital.icu?.total ?? 0);

  return (
    <g
      transform={`translate(${hospital.x}, ${hospital.y})`}
      style={{
        cursor: 'pointer',
        opacity: dimmed ? 0.28 : 1,
        transition: 'opacity var(--t-base) var(--ease)',
      }}
      role="button"
      tabIndex={0}
      aria-label={`${hospital.name}, ${statusWord}, keterisian ${hospital.occupancyPct} persen`}
      onPointerDown={(e) => {
        // Cegah MapCanvas menangkap pointer sehingga klik marker selalu terdeteksi
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(hospital.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(hospital.id);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Grup skala saat hover / terpilih */}
      <g
        style={{
          transform: selected
            ? `scale(${(typeScale * 1.1).toFixed(2)})`
            : hovered
              ? `scale(${(typeScale * 1.06).toFixed(2)})`
              : `scale(${typeScale})`,
          transition: 'transform var(--t-fast) var(--ease)',
        }}
      >
        {/* Cincin aura berdenyut saat status Penuh */}
        {isFull && (
          <ellipse
            cx="0"
            cy="8"
            rx="30"
            ry="16"
            fill="none"
            stroke="var(--danger)"
            strokeWidth="3"
            className="hospital-pulse-ring reduce-motion-pause"
          />
        )}

        {/* Cincin luar aksen saat terpilih */}
        {selected && (
          <ellipse
            cx="0"
            cy="8"
            rx="34"
            ry="18"
            fill="var(--accent-soft)"
            fillOpacity="0.45"
            stroke="var(--accent)"
            strokeWidth="2.8"
          />
        )}

        {/* Pelat dasar gedung berwarna status lembut */}
        <ellipse
          cx="0"
          cy="10"
          rx="27"
          ry="13"
          fill={softBg}
          stroke={color}
          strokeWidth="2.2"
          style={{ transition: 'fill var(--t-base) var(--ease), stroke var(--t-base) var(--ease)' }}
        />

        {/* Bayangan gedung */}
        <ellipse cx="2" cy="11" rx="22" ry="8" fill="rgba(15, 23, 42, 0.14)" />

        {/* Sayap kiri-kanan khusus Tipe A */}
        {hospital.type === 'A' && (
          <g>
            <rect
              x="-24"
              y="-6"
              width="12"
              height="16"
              rx="2.5"
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            <rect x="-21" y="-2" width="3" height="3" rx="0.6" fill="#93C5FD" />
            <rect x="-21" y="3" width="3" height="3" rx="0.6" fill="#93C5FD" />

            <rect
              x="12"
              y="-6"
              width="12"
              height="16"
              rx="2.5"
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            <rect x="18" y="-2" width="3" height="3" rx="0.6" fill="#93C5FD" />
            <rect x="18" y="3" width="3" height="3" rx="0.6" fill="#93C5FD" />
          </g>
        )}

        {/* Sayap kanan khusus Tipe B */}
        {hospital.type === 'B' && (
          <g>
            <rect
              x="11"
              y="-5"
              width="11"
              height="15"
              rx="2.5"
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            <rect x="15" y="-1" width="3" height="3" rx="0.6" fill="#93C5FD" />
            <rect x="15" y="4" width="3" height="3" rx="0.6" fill="#93C5FD" />
          </g>
        )}

        {/* Gedung utama */}
        <rect
          x="-15"
          y="-20"
          width="30"
          height="30"
          rx="4"
          fill="#FFFFFF"
          stroke={color}
          strokeWidth="2.2"
          style={{ transition: 'stroke var(--t-base) var(--ease)' }}
        />

        {/* Strip atap berwarna status */}
        <rect
          x="-15"
          y="-20"
          width="30"
          height="7"
          rx="3"
          fill={color}
          style={{ transition: 'fill var(--t-base) var(--ease)' }}
        />

        {/* Lencana palang medis bulat di puncak gedung */}
        <circle
          cx="0"
          cy="-21"
          r="9"
          fill="#FFFFFF"
          stroke={color}
          strokeWidth="2.2"
          style={{ transition: 'stroke var(--t-base) var(--ease)' }}
        />
        <rect x="-1.8" y="-25.5" width="3.6" height="9" rx="1" fill={color} />
        <rect x="-4.5" y="-22.8" width="9" height="3.6" rx="1" fill={color} />

        {/* Jendela kaca lantai 2 */}
        <rect x="-10.5" y="-9.5" width="5" height="4.5" rx="1" fill="#BFDBFE" />
        <rect x="-2.5" y="-9.5" width="5" height="4.5" rx="1" fill="#BFDBFE" />
        <rect x="5.5" y="-9.5" width="5" height="4.5" rx="1" fill="#BFDBFE" />

        {/* Jendela samping & pintu masuk IGD lantai 1 */}
        <rect x="-10.5" y="-2.5" width="4.5" height="4.5" rx="1" fill="#DBEAFE" />
        <rect x="6" y="-2.5" width="4.5" height="4.5" rx="1" fill="#DBEAFE" />
        <rect x="-3.5" y="0.5" width="7" height="9" rx="1.5" fill="#1E3A8A" fillOpacity="0.82" />

        {/* Badge mini jumlah antrean IGD di pojok kanan atas gedung (hanya tampil jika > 0) */}
        {hospital.igdQueue > 0 && (
          <g transform="translate(17, -21)">
            <circle
              r="9.5"
              fill={isFull ? 'var(--danger)' : 'var(--accent)'}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <text
              y="3.5"
              textAnchor="middle"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: 700,
                fill: '#FFFFFF',
                fontVariantNumeric: 'tabular-nums',
                userSelect: 'none',
              }}
            >
              {hospital.igdQueue > 99 ? '99+' : hospital.igdQueue}
            </text>
          </g>
        )}
      </g>

      {/* Pill persen keterisian di bawah gedung */}
      <g transform="translate(0, 29)">
        <rect
          x="-23"
          y="-10"
          width="46"
          height="20"
          rx="10"
          fill="#FFFFFF"
          stroke={selected ? 'var(--accent)' : 'rgba(226, 232, 240, 0.95)'}
          strokeWidth={selected ? '1.6' : '1'}
          style={{ filter: 'drop-shadow(0 2px 5px rgba(15,23,42,0.12))' }}
        />
        <text
          y="4"
          textAnchor="middle"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 600,
            fill: 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
            userSelect: 'none',
          }}
        >
          {hospital.occupancyPct}%
        </text>
      </g>

      {/* Nama RS saat hover atau zoom > 1.25x (ketika belum terpilih) */}
      {showName && (
        <g transform="translate(0, -44)">
          <rect
            x={-(hospital.name.length * 3.7 + 12)}
            y="-12"
            width={hospital.name.length * 7.4 + 24}
            height="22"
            rx="11"
            fill="rgba(255, 255, 255, 0.95)"
            stroke="rgba(226, 232, 240, 0.95)"
            strokeWidth="1"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(15,23,42,0.12))' }}
          />
          <text
            y="3"
            textAnchor="middle"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 600,
              fill: 'var(--text)',
              userSelect: 'none',
            }}
          >
            {hospital.name}
          </text>
        </g>
      )}

      {/* Kartu info ringkas mengambang tepat di atas gedung RS saat diklik/terpilih */}
      {selected && (
        <g transform="translate(0, -68)" pointerEvents="none">
          <rect
            x="-118"
            y="-28"
            width="236"
            height="48"
            rx="14"
            fill="rgba(255, 255, 255, 0.96)"
            stroke="var(--accent)"
            strokeWidth="1.5"
            style={{ filter: 'drop-shadow(0 6px 18px rgba(15,23,42,0.14))' }}
          />
          <text
            y="-10"
            textAnchor="middle"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 600,
              fill: 'var(--text)',
              userSelect: 'none',
            }}
          >
            {hospital.name}
          </text>
          <text
            y="8"
            textAnchor="middle"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: 500,
              fill: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
              userSelect: 'none',
            }}
          >
            {statusWord}, tempat tidur {usedBeds}/{totalBeds}, IGD {hospital.igdQueue}
          </text>
        </g>
      )}
    </g>
  );
});
