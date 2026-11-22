const SKIN_TONES = ['#FDE2CC', '#F6CBA6', '#E5B28A', '#C88D63', '#A56D49'];
const HAIR_COLORS = ['#1E293B', '#3B2F2F', '#4A3728', '#5C4033', '#334155'];
const SHIRT_COLORS = ['#3B82F6', '#0EA5E9', '#10B981', '#8B5CF6', '#64748B', '#F59E0B'];

const BG_BY_TRIAGE = {
  ringan: '#DCFCE7',
  sedang: '#FEF3C7',
  gawat: '#FEE2E2',
};

const RING_BY_TRIAGE = {
  ringan: '#16A34A',
  sedang: '#D97706',
  gawat: '#DC2626',
};

function hashCode(str = 'P-0001') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Avatar wajah vektor SVG sintetis (deterministik dari kode pasien P-xxxx & tingkat triase).
 * Ekspresi wajah menyesuaikan triase: tenang (Ringan), cemas (Sedang), serius/meringis (Gawat).
 */
export function PatientAvatar({ code = 'P-0001', triage = 'ringan', size = 40, className = '' }) {
  const h = hashCode(code);
  const skin = SKIN_TONES[h % SKIN_TONES.length];
  const hair = HAIR_COLORS[(h >> 3) % HAIR_COLORS.length];
  const shirt = SHIRT_COLORS[(h >> 6) % SHIRT_COLORS.length];
  const hairStyle = (h >> 9) % 4; // 0: pendek, 1: bob, 2: ikal/samping, 3: sanggul/panjang
  const hasGlasses = ((h >> 12) % 4) === 0;

  const bg = BG_BY_TRIAGE[triage] || '#F1F5F9';
  const ring = RING_BY_TRIAGE[triage] || '#94A3B8';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <clipPath id={`clip_${code}_${size}`}>
          <circle cx="32" cy="32" r="29" />
        </clipPath>
      </defs>

      {/* Latar bulat lembut sesuai triase */}
      <circle cx="32" cy="32" r="30" fill={bg} stroke={ring} strokeWidth="2.5" />

      <g clipPath={`url(#clip_${code}_${size})`}>
        {/* Rambut belakang (untuk gaya bob/panjang) */}
        {hairStyle === 1 && (
          <path d="M16 30 C16 17, 48 17, 48 30 L50 44 L14 44 Z" fill={hair} />
        )}
        {hairStyle === 3 && (
          <>
            <circle cx="32" cy="14" r="8" fill={hair} />
            <path d="M17 30 C17 18, 47 18, 47 30 L47 41 L17 41 Z" fill={hair} />
          </>
        )}

        {/* Bahu & baju */}
        <path d="M12 64 C14 49, 50 49, 52 64 Z" fill={shirt} />
        {/* Leher */}
        <rect x="27" y="42" width="10" height="10" rx="4" fill={skin} />

        {/* Telinga */}
        <circle cx="19" cy="33" r="3.5" fill={skin} />
        <circle cx="45" cy="33" r="3.5" fill={skin} />

        {/* Kepala */}
        <ellipse cx="32" cy="32" rx="13.5" ry="15" fill={skin} />

        {/* Rambut depan */}
        {hairStyle === 0 && (
          <path d="M18 29 C18 17, 46 17, 46 29 C42 23, 24 23, 18 29 Z" fill={hair} />
        )}
        {hairStyle === 1 && (
          <path d="M18 29 C18 18, 46 18, 46 29 C40 24, 24 25, 18 29 Z" fill={hair} />
        )}
        {hairStyle === 2 && (
          <path d="M18 30 C17 16, 47 16, 46 29 C41 21, 30 27, 18 30 Z" fill={hair} />
        )}
        {hairStyle === 3 && (
          <path d="M18.5 29 C19 18, 45 18, 45.5 29 C40 24, 24 24, 18.5 29 Z" fill={hair} />
        )}

        {/* Alis menyesuaikan ekspresi triase */}
        {triage === 'gawat' ? (
          <>
            <path d="M23 27 L29 29" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M41 27 L35 29" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : triage === 'sedang' ? (
          <>
            <path d="M23 28.5 Q26 26.5 29 28" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M35 28 Q38 26.5 41 28.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M23.5 27.5 Q26.5 26 29 27.5" stroke="#1E293B" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M35 27.5 Q37.5 26 40.5 27.5" stroke="#1E293B" strokeWidth="1.4" strokeLinecap="round" />
          </>
        )}

        {/* Mata */}
        <circle cx="26.5" cy="32" r="1.9" fill="#0F172A" />
        <circle cx="37.5" cy="32" r="1.9" fill="#0F172A" />

        {/* Kacamata opsional */}
        {hasGlasses && (
          <g stroke="#334155" strokeWidth="1.4" fill="none">
            <rect x="22" y="29" width="8.5" height="6" rx="2.5" />
            <rect x="33.5" y="29" width="8.5" height="6" rx="2.5" />
            <line x1="30.5" y1="32" x2="33.5" y2="32" />
          </g>
        )}

        {/* Mulut menyesuaikan ekspresi triase */}
        {triage === 'ringan' && (
          <path d="M27.5 39 Q32 42.5 36.5 39" stroke="#7C2D12" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        )}
        {triage === 'sedang' && (
          <>
            <path d="M28 40 Q32 38.5 36 40" stroke="#7C2D12" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            {/* Tetes keringat kecil tanda kurang sehat */}
            <path d="M43 24 C44.5 26, 44.5 28, 43 28 C41.5 28, 41.5 26, 43 24 Z" fill="#60A5FA" />
          </>
        )}
        {triage === 'gawat' && (
          <>
            <path d="M28 41 Q32 37.5 36 41" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M43 23 C44.8 25.5, 44.8 28, 43 28 C41.2 28, 41.2 25.5, 43 23 Z" fill="#60A5FA" />
          </>
        )}
      </g>
    </svg>
  );
}
