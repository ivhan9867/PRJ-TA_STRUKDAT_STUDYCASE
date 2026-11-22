const STATUS_DOT_COLOR = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  accent: 'var(--accent)',
  neutral: 'var(--neutral)',
};

/**
 * Chip status mengambang di atas peta.
 * Tinggi 40 px, radius pill, titik status 8 px + angka (Bricolage 600) + label.
 */
export function StatChip({
  status = 'ok',
  count,
  label,
  active = false,
  onClick,
  className = '',
}) {
  const dotColor = STATUS_DOT_COLOR[status] || STATUS_DOT_COLOR.neutral;
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        height: '40px',
        borderRadius: 'var(--radius-pill)',
        boxShadow: 'var(--shadow-chip)',
        border: active ? '2px solid var(--accent)' : '1px solid rgba(226, 232, 240, 0.85)',
        transition: 'transform var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease)',
      }}
      className={`surface-glass inline-flex items-center gap-2 px-3.5 select-none ${
        onClick ? 'cursor-pointer focus-ring hover:scale-[1.02] active:scale-[0.99]' : ''
      } ${className}`}
    >
      <span
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '999px',
          backgroundColor: dotColor,
          flexShrink: 0,
        }}
      />
      <span
        className="font-display tabular-nums text-[16px] leading-none"
        style={{ color: 'var(--text)' }}
      >
        {count ?? '-'}
      </span>
      <span
        className="text-[13px] font-medium leading-none"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
    </Tag>
  );
}
