import { useState } from 'react';
import { ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import {
  Card,
  StatusBadge,
  ProgressBar,
  Button,
  EmptyState,
} from '../design/index.js';

/**
 * Halaman Antrean saya (khusus Warga, sesuai 02_UI_SPEC.md bagian 5).
 * Menampilkan status antrean aktif warga secara langsung dan daftar RS yang masih lega.
 */
export function AntreanSayaPage({ sim }) {
  const { connected, world, myQueue, registerWarga, cancelWarga } = sim;
  const [selectedUnitByRs, setSelectedUnitByRs] = useState({});

  const sortedHospitals = [...world.hospitals].sort(
    (a, b) => a.occupancyPct - b.occupancyPct
  );

  const hasActiveQueue = Boolean(myQueue);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="type-h1" style={{ color: 'var(--text)' }}>
            Antrean saya
          </h1>
          <p className="type-caption mt-1">
            Pantau posisi antrean dan perkiraan waktu layanan Anda secara langsung.
          </p>
        </div>

        {/* Kartu antrean aktif */}
        <Card>
          {!myQueue ? (
            <EmptyState
              icon={ClipboardList}
              message="Anda belum punya antrean. Pilih rumah sakit yang masih lega di bawah."
            />
          ) : myQueue.status === 'dipanggil' ? (
            <div
              style={{
                backgroundColor: 'var(--ok-soft)',
                borderRadius: 'var(--radius-inner)',
              }}
              className="flex items-start gap-3.5 p-5"
            >
              <CheckCircle2
                size={26}
                strokeWidth={1.75}
                style={{ color: 'var(--ok)' }}
                className="mt-0.5 shrink-0"
              />
              <div>
                <h2 className="type-h2" style={{ color: 'var(--ok)' }}>
                  Giliran Anda
                </h2>
                <p className="mt-1 text-[15px] font-medium" style={{ color: 'var(--text)' }}>
                  Giliran Anda. Silakan menuju {myQueue.unitLabel} {myQueue.hospitalName}.
                </p>
                <p className="type-caption mt-1 tabular-nums">
                  Nomor pasien Anda: {myQueue.patientCode}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="type-h2" style={{ color: 'var(--text)' }}>
                    {myQueue.hospitalName}, {myQueue.unitLabel}
                  </h2>
                  <p className="type-caption mt-0.5 tabular-nums">
                    Kode antrean: {myQueue.patientCode}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!connected}
                  onClick={() => cancelWarga()}
                >
                  <XCircle size={15} strokeWidth={1.75} />
                  Batalkan antrean
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card variant="inner">
                  <div className="type-caption">Posisi antrean</div>
                  <div className="type-kpi mt-1" style={{ color: 'var(--accent)' }}>
                    {myQueue.position}
                  </div>
                </Card>
                <Card variant="inner">
                  <div className="type-caption">Perkiraan tunggu</div>
                  <div className="type-kpi mt-1" style={{ color: 'var(--text)' }}>
                    {myQueue.etaMin} <span className="text-[16px] font-medium">menit</span>
                  </div>
                </Card>
              </div>

              <ProgressBar
                value={Math.max(1, (myQueue.totalInQueue || 1) - myQueue.position + 1)}
                max={Math.max(1, myQueue.totalInQueue || 1)}
                status="accent"
                rightText={`Urutan ${myQueue.position} dari ${myQueue.totalInQueue}`}
              />
            </div>
          )}
        </Card>

        {/* Daftar rumah sakit yang masih lega */}
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="type-h2" style={{ color: 'var(--text)' }}>
                Rumah sakit yang masih lega
              </h2>
              {hasActiveQueue && (
                <p className="type-caption mt-0.5">
                  Selesaikan atau batalkan antrean Anda lebih dulu.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {sortedHospitals.map((rs) => {
              const unit = selectedUnitByRs[rs.id] || 'poli';
              return (
                <div
                  key={rs.id}
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    borderRadius: 'var(--radius-inner)',
                  }}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                        {rs.name}
                      </span>
                      <StatusBadge status={rs.status} />
                    </div>
                    <div className="type-caption mt-0.5 tabular-nums">
                      Kota {rs.city === 'surya' ? 'Surya' : 'Tirta'}, Antrean IGD {rs.igdQueue}, Antrean Poli {rs.poliQueue}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Pilih unit di ${rs.name}`}
                      disabled={hasActiveQueue || !connected}
                      value={unit}
                      onChange={(e) =>
                        setSelectedUnitByRs((prev) => ({ ...prev, [rs.id]: e.target.value }))
                      }
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-btn)',
                      }}
                      className="focus-ring h-9 px-2.5 text-[13px] disabled:opacity-50"
                    >
                      <option value="poli">Poli</option>
                      <option value="igd">IGD</option>
                    </select>

                    <Button
                      variant="primary"
                      size="sm"
                      disabled={hasActiveQueue || !connected}
                      onClick={() => registerWarga(rs.id, unit)}
                    >
                      Daftar antrean
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
