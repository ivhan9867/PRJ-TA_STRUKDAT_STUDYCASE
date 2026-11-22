const BAR_COLOR = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  accent: 'var(--accent)',
  neutral: 'var(--neutral)',
};

/**
 * Menentukan status warna otomatis berdasarkan rasio (0..1) sesuai 01_DESIGN_SYSTEM.md:
 * < 60% = ok (Lega), 60-85% = warn (Hampir penuh), > 85% = danger (Penuh).
 */
export function ratioToStatus(ratio) {
  if (ratio > 0.85) return 'danger';
  if (ratio >= 0.6) return 'warn';
  return 'ok';
}

/**
 * Batang progres tinggi 8 px, radius pill, teks "12 dari 60" di kanan.
 */
export function ProgressBar({
  value = 0,
  max = 100,
  status,
  rightText,
  label,
  className = '',
}) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.min(Math.max(value / safeMax, 0), 1);
  const resolvedStatus = status || ratioToStatus(ratio);
  const fillColor = BAR_COLOR[resolvedStatus] || BAR_COLOR.ok;
  const displayRight = rightText ?? (max > 0 ? `${value} dari ${max}` : '-');

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
            {label}
          </span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          style={{
            height: '8px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--neutral-soft)',
          }}
          className="flex-1 overflow-hidden"
        >
          <div
            style={{
              width: `${Math.round(ratio * 100)}%`,
              height: '100%',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: fillColor,
              transition: 'width var(--t-base) var(--ease), background-color var(--t-base) var(--ease)',
            }}
          />
        </div>
        <span
          className="tabular-nums text-[12px] font-medium whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          {displayRight}
        </span>
      </div>
    </div>
  );
}
