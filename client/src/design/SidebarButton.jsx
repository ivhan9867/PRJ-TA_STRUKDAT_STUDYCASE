/**
 * Tombol navigasi sidebar ikon: kotak 48 px, ikon lucide 22 px, tooltip di kanan.
 * Aktif: latar --accent-soft, ikon --accent.
 */
export function SidebarButton({
  icon: Icon,
  label,
  active = false,
  onClick,
}) {
  return (
    <div className="group relative flex items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-btn)',
          backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-muted)',
          transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)',
        }}
        className="focus-ring flex cursor-pointer items-center justify-center hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
      >
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* Tooltip di sebelah kanan */}
      <span
        role="tooltip"
        style={{
          backgroundColor: 'var(--text)',
          color: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-chip)',
          transition: 'opacity var(--t-fast) var(--ease), transform var(--t-fast) var(--ease)',
        }}
        className="pointer-events-none absolute left-[60px] z-50 translate-x-[-4px] whitespace-nowrap px-2.5 py-1.5 text-[12px] font-medium opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}
