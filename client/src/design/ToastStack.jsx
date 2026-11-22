import { Ambulance, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';

const ICON_BY_SEVERITY = {
  accent: { Icon: Ambulance, color: 'var(--accent)', bg: 'var(--accent-soft)' },
  danger: { Icon: AlertOctagon, color: 'var(--danger)', bg: 'var(--danger-soft)' },
  warn: { Icon: AlertTriangle, color: 'var(--warn)', bg: 'var(--warn-soft)' },
  info: { Icon: Info, color: 'var(--ok)', bg: 'var(--ok-soft)' },
};

/**
 * Tumpukan notifikasi Toast (maksimal 3, radius 16, hilang otomatis 6 detik).
 * Muncul di bawah tombol Skenario (kanan atas area peta).
 */
export function ToastStack({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute right-4 top-[64px] z-20 flex w-[320px] max-w-[calc(100vw-32px)] flex-col gap-2"
    >
      {toasts.map((toast) => {
        const cfg = ICON_BY_SEVERITY[toast.severity] || ICON_BY_SEVERITY.info;
        const Icon = cfg.Icon;

        return (
          <div
            key={toast.id}
            style={{
              borderRadius: 'var(--radius-inner)',
              boxShadow: 'var(--shadow-float)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
            }}
            className="surface-glass pointer-events-auto flex items-start gap-2.5 px-3.5 py-3"
          >
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}
              aria-hidden="true"
            >
              <Icon size={15} strokeWidth={1.75} />
            </span>
            <p className="flex-1 text-[13px] leading-5" style={{ color: 'var(--text)' }}>
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss?.(toast.id)}
              aria-label="Tutup pemberitahuan"
              className="focus-ring flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text-faint)' }}
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
