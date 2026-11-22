import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Plus,
  Minus,
  Maximize2,
  Info,
  Siren,
  Undo2,
  RotateCcw,
  Ambulance,
} from 'lucide-react';
import { StatChip, TimeControl, Button } from '../design/index.js';

/**
 * Seluruh elemen mengambang di atas peta (margin 16 px dari tepi area peta):
 * - Chip status (tengah atas)
 * - Tombol Skenario & popover (kanan atas, khusus Dinkes)
 * - Keterangan / legenda (kiri bawah)
 * - Kontrol waktu (tengah bawah)
 * - Tombol zoom +, -, Lihat semua (kanan bawah)
 */
export function PetaOverlays({
  userRole,
  connected = true,
  statusCounts,
  activeStatusFilter,
  onClickStatusChip,
  autoReferral = true,
  onToggleAutoReferral,
  hospitals = [],
  activeOutbreaks = [],
  activeReferrals = [],
  onSelectPatient,
  undoInfo = { canUndo: false, nextDescription: null, size: 0 },
  onTriggerOutbreak,
  onTriggerMassCasualty,
  onUndo,
  onResetSimulation,
  bridges,
  onToggleBridge,
  paused,
  speed,
  simTime,
  simTimeText,
  onTogglePause,
  onChangeSpeed,
  onZoomIn,
  onZoomOut,
  onResetView,
}) {
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [outbreakCity, setOutbreakCity] = useState('tirta');
  const [casualtyHospital, setCasualtyHospital] = useState('rs_tirta_raya');
  const [confirmReset, setConfirmReset] = useState(false);
  const scenarioRef = useRef(null);
  const legendRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (scenarioRef.current && !scenarioRef.current.contains(e.target)) {
        setScenarioOpen(false);
      }
      if (legendRef.current && !legendRef.current.contains(e.target)) {
        setLegendOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDinkes = userRole === 'dinkes';

  return (
    <>
      {/* 1. Chip status (tengah atas) + pill peringatan jika wabah sedang aktif */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <StatChip
            status="ok"
            count={statusCounts.ok}
            label="Lega"
            active={activeStatusFilter === 'ok'}
            onClick={() => onClickStatusChip?.('ok')}
          />
          <StatChip
            status="warn"
            count={statusCounts.warn}
            label="Hampir penuh"
            active={activeStatusFilter === 'warn'}
            onClick={() => onClickStatusChip?.('warn')}
          />
          <StatChip
            status="danger"
            count={statusCounts.danger}
            label="Penuh"
            active={activeStatusFilter === 'danger'}
            onClick={() => onClickStatusChip?.('danger')}
          />
        </div>

        {activeOutbreaks.length > 0 && (
          <div
            role="status"
            style={{
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--warn-soft)',
              color: 'var(--warn)',
              border: '1px solid rgba(217, 119, 6, 0.35)',
              boxShadow: 'var(--shadow-chip)',
            }}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1 text-[12px] font-semibold"
          >
            <Siren size={14} strokeWidth={1.85} aria-hidden="true" />
            <span>
              Lonjakan pasien aktif di Kota{' '}
              {activeOutbreaks.map((c) => (c === 'surya' ? 'Surya' : 'Tirta')).join(' dan ')}
            </span>
          </div>
        )}
      </div>

      {/* 2. Tombol Skenario (kanan atas, khusus Dinkes) */}
      {isDinkes && (
        <div ref={scenarioRef} className="absolute right-4 top-4 z-30">
          <button
            type="button"
            onClick={() => setScenarioOpen((v) => !v)}
            style={{
              height: '40px',
              borderRadius: 'var(--radius-pill)',
              boxShadow: 'var(--shadow-chip)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              color: 'var(--text)',
            }}
            className="surface-glass focus-ring inline-flex cursor-pointer items-center gap-2 px-4 text-[13px] font-semibold hover:bg-[var(--surface)]"
            aria-expanded={scenarioOpen}
          >
            <Siren size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <span>Skenario</span>
            <ChevronDown size={15} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
          </button>

          {scenarioOpen && (
            <div
              style={{
                width: '340px',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-float)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
              }}
              className="surface-glass absolute right-0 top-[48px] max-h-[calc(100vh-140px)] space-y-4 overflow-y-auto p-5"
            >
              {/* Rujukan otomatis */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                    Rujukan otomatis
                  </div>
                  <p className="type-caption mt-0.5">
                    Saat Aktif, pasien dirujuk ke RS lain yang masih lega.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoReferral}
                  disabled={!connected}
                  onClick={() => onToggleAutoReferral?.(!autoReferral)}
                  style={{
                    backgroundColor: autoReferral ? 'var(--accent)' : 'var(--neutral)',
                    borderRadius: 'var(--radius-pill)',
                  }}
                  className="focus-ring relative h-6 w-11 shrink-0 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <span
                    className={`block h-5 w-5 translate-y-[0px] rounded-full bg-white shadow transition-transform ${
                      autoReferral ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>

              <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

              {/* Wabah di kota */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                    Wabah di kota
                  </div>
                  {activeOutbreaks.length > 0 && (
                    <span
                      style={{
                        backgroundColor: 'var(--warn-soft)',
                        color: 'var(--warn)',
                        borderRadius: 'var(--radius-pill)',
                      }}
                      className="px-2 py-0.5 text-[11px] font-semibold"
                    >
                      Aktif: {activeOutbreaks.map((c) => (c === 'surya' ? 'Surya' : 'Tirta')).join(', ')}
                    </span>
                  )}
                </div>
                <p className="type-caption mt-0.5">
                  Jumlah pasien naik sekitar 4 kali lipat selama 6 jam simulasi.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    aria-label="Pilih kota untuk wabah"
                    value={outbreakCity}
                    onChange={(e) => setOutbreakCity(e.target.value)}
                    disabled={!connected}
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-btn)',
                      color: 'var(--text)',
                    }}
                    className="focus-ring h-9 flex-1 px-2.5 text-[13px]"
                  >
                    <option value="tirta">Kota Tirta</option>
                    <option value="surya">Kota Surya</option>
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!connected}
                    onClick={() => onTriggerOutbreak?.(outbreakCity)}
                  >
                    Mulai wabah
                  </Button>
                </div>
              </div>

              {/* Kecelakaan massal */}
              <div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                  Kecelakaan massal
                </div>
                <p className="type-caption mt-0.5">
                  12 pasien tiba bersamaan, banyak yang gawat.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    aria-label="Pilih rumah sakit untuk kecelakaan massal"
                    value={casualtyHospital}
                    onChange={(e) => setCasualtyHospital(e.target.value)}
                    disabled={!connected}
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-btn)',
                      color: 'var(--text)',
                    }}
                    className="focus-ring h-9 flex-1 px-2.5 text-[13px]"
                  >
                    {hospitals.map((rs) => (
                      <option key={rs.id} value={rs.id}>
                        {rs.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!connected}
                    onClick={() => onTriggerMassCasualty?.(casualtyHospital)}
                  >
                    Picu kecelakaan
                  </Button>
                </div>
              </div>

              <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

              {/* Jembatan (sudah bisa dicoba visual buka/tutup di Fase 1!) */}
              <div>
                <div className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                  Jembatan
                </div>
                <div className="space-y-2">
                  {bridges.map((b) => {
                    const isOpen = !b.closed;
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded-xl px-3 py-2"
                        style={{ backgroundColor: 'var(--surface-2)' }}
                      >
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                          {b.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleBridge?.(b.id)}
                          style={{
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: isOpen ? 'var(--ok-soft)' : 'var(--danger-soft)',
                            color: isOpen ? 'var(--ok)' : 'var(--danger)',
                          }}
                          className="focus-ring cursor-pointer px-3 py-1 text-[12px] font-semibold"
                        >
                          {isOpen ? 'Buka' : 'Tutup'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

              {/* Mulai ulang & Batalkan aksi terakhir */}
              <div className="space-y-2.5">
                {!confirmReset ? (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    disabled={!connected}
                    onClick={() => setConfirmReset(true)}
                  >
                    <RotateCcw size={15} strokeWidth={1.75} />
                    Mulai ulang simulasi
                  </Button>
                ) : (
                  <div
                    style={{
                      backgroundColor: 'var(--danger-soft)',
                      borderRadius: 'var(--radius-inner)',
                    }}
                    className="space-y-2 p-3"
                  >
                    <p className="text-[12px] font-medium leading-4" style={{ color: 'var(--danger)' }}>
                      Simulasi diulang dari awal dan semua kejadian dihapus. Lanjutkan?
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setConfirmReset(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setConfirmReset(false);
                          onResetSimulation?.();
                        }}
                      >
                        Lanjutkan
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={!connected || !undoInfo?.canUndo}
                    onClick={() => onUndo?.()}
                  >
                    <Undo2 size={15} strokeWidth={1.75} />
                    Batalkan aksi terakhir
                  </Button>
                  <p className="type-caption mt-1 text-center">
                    {undoInfo?.canUndo
                      ? `Akan dibatalkan: ${undoInfo.nextDescription}`
                      : 'Belum ada aksi yang bisa dibatalkan'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Keterangan / Legenda (kiri bawah, tampil di desktop agar tidak menumpuk bottom sheet mobile) */}
      <div ref={legendRef} className="absolute bottom-4 left-4 z-20 hidden lg:block">
        {legendOpen && (
          <div
            style={{
              borderRadius: 'var(--radius-inner)',
              boxShadow: 'var(--shadow-float)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
            }}
            className="surface-glass mb-2.5 w-60 space-y-2.5 p-4 text-[13px]"
          >
            <div className="font-semibold" style={{ color: 'var(--text)' }}>
              Keterangan peta
            </div>
            <div className="space-y-2">
              <LegendRow color="var(--ok)" label="Lega (di bawah 60%)" />
              <LegendRow color="var(--warn)" label="Hampir penuh (60–85%)" />
              <LegendRow color="var(--danger)" label="Penuh (di atas 85%)" />
              <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-3.5 w-5 rounded-[4px] bg-white"
                  style={{ border: '2px solid var(--accent)' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>Ambulans rujukan</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--danger)' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>Pasien IGD (Gawat / Sedang / Ringan)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: '#3B82F6' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>Pasien Poli (rawat jalan)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-3 w-4 rounded-[3px]"
                  style={{ backgroundColor: '#B9CCE2', border: '1px solid #9EB6D2' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>Pemukiman rumah warga</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-2.5 w-5 rounded-[2px] bg-white"
                  style={{ borderTop: '2px solid #94A3B8', borderBottom: '2px solid #94A3B8' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>Jembatan</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: 'var(--danger)' }}
                >
                  ×
                </span>
                <span style={{ color: 'var(--text-muted)' }}>Jembatan ditutup</span>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          style={{
            height: '40px',
            borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--shadow-chip)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            color: 'var(--text)',
          }}
          className="surface-glass focus-ring inline-flex cursor-pointer items-center gap-2 px-3.5 text-[13px] font-semibold hover:bg-[var(--surface)]"
          aria-expanded={legendOpen}
        >
          <Info size={16} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
          <span>Keterangan</span>
        </button>
      </div>

      {/* 4. Kontrol waktu (tengah bawah, tampil mulai md agar tablet juga melihat jam) */}
      <div className="absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 md:block">
        <TimeControl
          paused={paused}
          speed={speed}
          simTime={simTime}
          simTimeText={simTimeText}
          canControl={isDinkes && connected}
          onTogglePause={onTogglePause}
          onChangeSpeed={onChangeSpeed}
        />
      </div>

      {/* 4b. Kartu mini Rujukan berjalan (muncul saat ada ambulans mengantar pasien) */}
      {activeReferrals.length > 0 && (
        <div
          style={{
            borderRadius: 'var(--radius-inner)',
            boxShadow: 'var(--shadow-chip)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
          }}
          className="surface-glass absolute bottom-[152px] right-4 z-20 hidden w-[260px] p-3 lg:block"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>
              <Ambulance size={14} strokeWidth={1.85} />
              Rujukan berjalan ({activeReferrals.length})
            </span>
            <span className="type-caption">Klik pasien</span>
          </div>
          <div className="space-y-1.5">
            {activeReferrals.slice(0, 3).map((refItem) => (
              <button
                key={refItem.id}
                type="button"
                onClick={() => onSelectPatient?.(refItem.patientCode)}
                style={{
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: '10px',
                }}
                className="focus-ring block w-full cursor-pointer px-2.5 py-1.5 text-left hover:bg-[var(--accent-soft)]/50"
              >
                <div className="flex items-center justify-between text-[12px]">
                  <span className="tabular-nums font-semibold" style={{ color: 'var(--text)' }}>
                    {refItem.patientCode}
                  </span>
                  <span className="tabular-nums font-semibold" style={{ color: 'var(--accent)' }}>
                    ±{refItem.remainMin} mnt
                  </span>
                </div>
                <div className="type-caption truncate">
                  {refItem.fromName.replace('RS ', '')} ke {refItem.toName.replace('RS ', '')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Kontrol Zoom: +, -, Lihat semua (kanan bawah) */}
      <div className="absolute bottom-4 right-4 z-20 hidden flex-col items-end gap-2 lg:flex">
        <div
          style={{
            borderRadius: 'var(--radius-inner)',
            boxShadow: 'var(--shadow-chip)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
          }}
          className="surface-glass flex flex-col overflow-hidden"
        >
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Perbesar peta"
            className="focus-ring flex h-10 w-10 cursor-pointer items-center justify-center hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
          >
            <Plus size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Perkecil peta"
            className="focus-ring flex h-10 w-10 cursor-pointer items-center justify-center hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text)' }}
          >
            <Minus size={18} strokeWidth={1.75} />
          </button>
        </div>

        <button
          type="button"
          onClick={onResetView}
          style={{
            height: '38px',
            borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--shadow-chip)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            color: 'var(--text)',
          }}
          className="surface-glass focus-ring inline-flex cursor-pointer items-center gap-1.5 px-3.5 text-[12px] font-semibold hover:bg-[var(--surface)]"
        >
          <Maximize2 size={14} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
          <span>Lihat semua</span>
        </button>
      </div>
    </>
  );
}

function LegendRow({ color, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
