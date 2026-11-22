/**
 * Tab di dalam kartu: garis bawah 2 px --accent untuk tab aktif, tanpa kotak.
 */
export function Tabs({ items, activeId, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      style={{ borderBottom: '1px solid var(--border)' }}
      className={`flex items-center gap-5 ${className}`}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.id)}
            style={{
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease)',
            }}
            className="focus-ring cursor-pointer pb-2.5 pt-1 text-[14px] font-semibold hover:text-[var(--text)]"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
