import { Play, Pause, Sunrise, Sun, Sunset, Moon } from 'lucide-react';

const SPEEDS = [1, 5, 10];

function getDayPhase(simTime = 360) {
  const hour = Math.floor((Math.max(0, simTime) % 1440) / 60);
  if (hour >= 5 && hour <= 10) return { Icon: Sunrise, label: 'Pagi', color: '#D97706' };
  if (hour >= 11 && hour <= 15) return { Icon: Sun, label: 'Siang (jam sibuk)', color: '#D97706' };
  if (hour >= 16 && hour <= 18) return { Icon: Sunset, label: 'Sore', color: '#EA580C' };
  return { Icon: Moon, label: 'Malam', color: '#475569' };
}

/**
 * Kontrol waktu mengambang di tengah bawah peta.
 * Pill dengan tombol jalan/jeda, pilihan 1x/5x/10x, ikon fase waktu, dan teks "Hari 3, 14.20".
 */
export function TimeControl({
  paused = false,
  speed = 1,
  simTime = 360,
  simTimeText = 'Hari 1, 06.00',
  canControl = true,
  dynamicAtmosphere = true,
  onToggleAtmosphere,
  onTogglePause,
  onChangeSpeed,
}) {
  const { Icon: PhaseIcon, label: phaseLabel, color: phaseColor } = getDayPhase(simTime);
  const disabledTitle = !canControl
    ? 'Hanya Dinkes yang dapat mengatur waktu'
    : undefined;

  return (
    <div
      style={{
        borderRadius: 'var(--radius-pill)',
        boxShadow: 'var(--shadow-chip)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
      }}
      className="surface-glass inline-flex items-center gap-1.5 px-2 py-1 sm:gap-2 sm:px-2.5 sm:py-1.5"
      title={disabledTitle}
    >
      <button
        type="button"
        disabled={!canControl}
        onClick={onTogglePause}
        style={{
          borderRadius: 'var(--radius-pill)',
          backgroundColor: !canControl
            ? 'var(--neutral-soft)'
            : paused
              ? 'var(--accent)'
              : 'var(--surface-2)',
          color: !canControl
            ? 'var(--text-faint)'
            : paused
              ? '#FFFFFF'
              : 'var(--text)',
          transition: 'background-color var(--t-fast) var(--ease)',
        }}
        className={`focus-ring inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-semibold sm:h-9 sm:px-3.5 sm:text-[13px] ${
          canControl ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed'
        }`}
      >
        {paused ? (
          <>
            <Play size={14} strokeWidth={2} fill="currentColor" />
            <span className="hidden sm:inline">Jalan</span>
          </>
        ) : (
          <>
            <Pause size={14} strokeWidth={2} fill="currentColor" />
            <span className="hidden sm:inline">Jeda</span>
          </>
        )}
      </button>

      <div
        className="flex items-center gap-0.5 rounded-full p-0.5"
        style={{ backgroundColor: 'var(--surface-2)' }}
        role="group"
        aria-label="Kecepatan simulasi"
      >
        {SPEEDS.map((s) => {
          const active = speed === s;
          return (
            <button
              key={s}
              type="button"
              disabled={!canControl}
              onClick={() => onChangeSpeed?.(s)}
              style={{
                borderRadius: 'var(--radius-pill)',
                backgroundColor: active ? 'var(--surface)' : 'transparent',
                color: !canControl
                  ? 'var(--text-faint)'
                  : active
                    ? 'var(--accent)'
                    : 'var(--text-muted)',
                boxShadow: active ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
              }}
              className={`focus-ring tabular-nums h-7 min-w-[30px] px-1.5 text-[12px] font-semibold sm:h-8 sm:min-w-[38px] sm:px-2 sm:text-[13px] ${
                canControl ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
            >
              {s}x
            </button>
          );
        })}
      </div>

      <div
        className="h-4 w-px sm:h-5"
        style={{ backgroundColor: 'var(--border)' }}
        aria-hidden="true"
      />

      <span
        title={phaseLabel}
        className="tabular-nums inline-flex items-center gap-1 px-1 text-[12px] font-semibold whitespace-nowrap sm:gap-1.5 sm:px-2 sm:text-[13px]"
        style={{ color: 'var(--text)' }}
      >
        <PhaseIcon size={14} strokeWidth={1.85} style={{ color: phaseColor }} aria-hidden="true" />
        <span>{simTimeText.replace('Hari ', 'H')}</span>
      </span>

      {onToggleAtmosphere && (
        <>
          <div className="hidden h-5 w-px sm:block" style={{ backgroundColor: 'var(--border)' }} aria-hidden="true" />
          <button
            type="button"
            onClick={onToggleAtmosphere}
            title={
              dynamicAtmosphere
                ? 'Suasana peta mengikuti jam simulasi (klik untuk selalu terang)'
                : 'Peta selalu terang (klik untuk ikuti suasana pagi/sore/malam)'
            }
            style={{
              borderRadius: 'var(--radius-pill)',
              backgroundColor: dynamicAtmosphere ? 'var(--accent-soft)' : 'var(--surface-2)',
              color: dynamicAtmosphere ? 'var(--accent-ink)' : 'var(--text-muted)',
            }}
            className="focus-ring hidden h-8 cursor-pointer px-2.5 text-[12px] font-semibold whitespace-nowrap hover:opacity-90 sm:inline-flex sm:items-center"
          >
            {dynamicAtmosphere ? phaseLabel.split(' ')[0] : 'Terang'}
          </button>
        </>
      )}
    </div>
  );
}
