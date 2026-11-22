import { StatusBadge } from './StatusBadge.jsx';

/**
 * Item daftar rumah sakit di kartu kiri.
 * Tinggi ~56 px, hover latar --surface-2, terpilih border --accent.
 */
export function HospitalListItem({
  hospital,
  selected = false,
  onClick,
}) {
  const cityLabel = hospital.city === 'surya' ? 'Kota Surya' : 'Kota Tirta';

  return (
    <button
      type="button"
      onClick={() => onClick?.(hospital.id)}
      style={{
        borderRadius: 'var(--radius-inner)',
        border: selected ? '1.5px solid var(--accent)' : '1.5px solid transparent',
        backgroundColor: selected ? 'var(--accent-soft)' : 'transparent',
        transition: 'background-color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease)',
      }}
      className="focus-ring group flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
    >
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[14px] font-semibold leading-5"
          style={{ color: selected ? 'var(--accent-ink)' : 'var(--text)' }}
        >
          {hospital.name}
        </div>
        <div className="type-caption truncate">
          Tipe {hospital.type}, {cityLabel}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={hospital.status} />
        <span
          className="font-display tabular-nums w-10 text-right text-[14px]"
          style={{ color: 'var(--text)' }}
        >
          {hospital.occupancyPct}%
        </span>
      </div>
    </button>
  );
}
