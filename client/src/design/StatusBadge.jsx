import { CheckCircle2, AlertTriangle, AlertOctagon, CircleDot } from 'lucide-react';

const STATUS_CONFIG = {
  ok: {
    label: 'Lega',
    bg: 'var(--ok-soft)',
    color: 'var(--ok)',
    Icon: CheckCircle2,
  },
  warn: {
    label: 'Hampir penuh',
    bg: 'var(--warn-soft)',
    color: 'var(--warn)',
    Icon: AlertTriangle,
  },
  danger: {
    label: 'Penuh',
    bg: 'var(--danger-soft)',
    color: 'var(--danger)',
    Icon: AlertOctagon,
  },
  ringan: {
    label: 'Ringan',
    bg: 'var(--ok-soft)',
    color: 'var(--ok)',
    Icon: CheckCircle2,
  },
  sedang: {
    label: 'Sedang',
    bg: 'var(--warn-soft)',
    color: 'var(--warn)',
    Icon: AlertTriangle,
  },
  gawat: {
    label: 'Gawat',
    bg: 'var(--danger-soft)',
    color: 'var(--danger)',
    Icon: AlertOctagon,
  },
  neutral: {
    label: 'Memuat',
    bg: 'var(--neutral-soft)',
    color: 'var(--text-muted)',
    Icon: CircleDot,
  },
};

/**
 * Lencana status pill kecil: latar *-soft, ikon + teks status.
 * Status selalu ditulis dengan kata dan ikon, bukan hanya warna.
 */
export function StatusBadge({ status = 'ok', label, className = '' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.neutral;
  const Icon = cfg.Icon;

  return (
    <span
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        borderRadius: 'var(--radius-pill)',
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] leading-4 font-semibold whitespace-nowrap ${className}`}
    >
      <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
      <span>{label || cfg.label}</span>
    </span>
  );
}
