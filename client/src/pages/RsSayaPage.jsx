import { useEffect, useState } from 'react';
import {
  Building2,
  Undo2,
  Minus,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react';
import {
  Card,
  StatusBadge,
  Button,
  EmptyState,
  PatientAvatar,
} from '../design/index.js';

/**
 * Halaman RS saya (khusus Petugas RS, sesuai 02_UI_SPEC.md bagian 4).
 * Layout dua kolom di atas latar --surface-2.
 */
export function RsSayaPage({ user, sim }) {
  const {
    connected,
    world,
    hospitalDetails,
    requestHospitalDetail,
    callNextPatient,
    dischargePatient,
    setHospitalBeds,
    referPatientManual,
    undoLastAction,
  } = sim;

  const [referringCode, setReferringCode] = useState(null);

  const hospital = world.hospitals.find((h) => h.id === user.hospitalId) || null;
  const detail = user.hospitalId ? hospitalDetails[user.hospitalId] || null : null;

  useEffect(() => {
    if (!user.hospitalId || !connected) return;
    requestHospitalDetail(user.hospitalId);
    const id = window.setInterval(() => requestHospitalDetail(user.hospitalId), 1000);
    return () => window.clearInterval(id);
  }, [user.hospitalId, connected, requestHospitalDetail]);

  if (!user.hospitalId || !hospital) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <EmptyState
            icon={Building2}
            message="Akun Anda belum ditugaskan ke rumah sakit. Hubungi Dinkes."
          />
        </Card>
      </div>
    );
  }

  const igdQueue = detail?.queue || [];
  const poliQueue = detail?.poliQueue || [];
  const activeIgd = detail?.activeIgd || [];
  const activePoli = detail?.activePoli || [];
  const activeAll = [...activeIgd, ...activePoli];
  const events = detail?.events || [];
  const candidates = detail?.referralCandidates || [];
  const undoInfo = detail?.undoInfo || { canUndo: false, nextDescription: null };

  const baseInap = detail?.baseCaps?.inap ?? hospital.bedsInap;
  const baseIcu = detail?.baseCaps?.icu ?? hospital.bedsIcu;
  const maxInap = baseInap * 2;
  const maxIcu = baseIcu * 2;

  const igdDoctorsFull = hospital.igdBusy >= hospital.igdDoctors;
  const poliDoctorsFull = activePoli.length >= hospital.poliDoctors;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header RS + Status + Undo */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="type-h1" style={{ color: 'var(--text)' }}>
              {hospital.name}
            </h1>
            <StatusBadge status={hospital.status} />
            <span className="type-caption">
              Tipe {hospital.type}, Kota {hospital.city === 'surya' ? 'Surya' : 'Tirta'}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={!connected || !undoInfo.canUndo}
              onClick={() => undoLastAction()}
            >
              <Undo2 size={15} strokeWidth={1.75} />
              Batalkan aksi terakhir
            </Button>
            {undoInfo.canUndo && (
              <span className="type-caption mt-1">{undoInfo.nextDescription}</span>
            )}
          </div>
        </div>

        {/* Layout dua kolom */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* ==================== KOLOM KIRI: ANTREAN IGD & POLI ==================== */}
          <div className="space-y-5">
            {/* Antrean IGD */}
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="type-h2" style={{ color: 'var(--text)' }}>
                  Antrean IGD ({igdQueue.length})
                </h2>
                <span className="type-caption tabular-nums">
                  Dokter bertugas: {hospital.igdBusy} dari {hospital.igdDoctors}
                </span>
              </div>

              {igdQueue.length > 0 ? (
                <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  {igdQueue.map((p) => {
                    const isMenuOpen = referringCode === p.code;
                    return (
                      <div
                        key={p.code}
                        style={{
                          backgroundColor: 'var(--surface-2)',
                          borderRadius: 'var(--radius-inner)',
                        }}
                        className="p-3"
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <PatientAvatar code={p.code} triage={p.triage} size={34} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums text-[14px] font-semibold">
                                  {p.code}
                                </span>
                                <StatusBadge status={p.triage} />
                              </div>
                              <div className="type-caption truncate">
                                {p.complaint} — menunggu {p.waitMin} menit
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!connected}
                            onClick={() => setReferringCode(isMenuOpen ? null : p.code)}
                          >
                            <Send size={13} strokeWidth={1.75} />
                            Alihkan
                          </Button>
                        </div>

                        {/* Daftar pilihan RS tujuan rujukan manual */}
                        {isMenuOpen && (
                          <div
                            className="mt-2.5 space-y-1.5 border-t pt-2.5"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <div className="type-caption">Pilih rumah sakit tujuan:</div>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {candidates.map((cand) => (
                                <button
                                  key={cand.id}
                                  type="button"
                                  disabled={!cand.reachable}
                                  onClick={() => {
                                    referPatientManual(p.code, cand.id);
                                    setReferringCode(null);
                                  }}
                                  style={{
                                    backgroundColor: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-btn)',
                                  }}
                                  className="focus-ring flex cursor-pointer items-center justify-between gap-2 px-2.5 py-2 text-left text-[12px] hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <span className="truncate font-semibold" style={{ color: 'var(--text)' }}>
                                    {cand.name}
                                  </span>
                                  <span className="type-caption tabular-nums shrink-0">
                                    {cand.reachable ? `±${cand.travelMin} mnt` : 'Tutup'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Clock}
                  message="Belum ada antrean di IGD. Pasien yang datang akan muncul di sini."
                />
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="primary"
                  disabled={!connected || igdQueue.length === 0 || igdDoctorsFull}
                  onClick={() => callNextPatient('igd')}
                >
                  Panggil berikutnya
                </Button>
                {igdDoctorsFull && (
                  <span className="type-caption" style={{ color: 'var(--warn)' }}>
                    Semua dokter sedang bertugas.
                  </span>
                )}
              </div>
            </Card>

            {/* Antrean Poli */}
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="type-h2" style={{ color: 'var(--text)' }}>
                  Antrean poli ({poliQueue.length})
                </h2>
                <span className="type-caption tabular-nums">
                  Dokter bertugas: {activePoli.length} dari {hospital.poliDoctors}
                </span>
              </div>

              {poliQueue.length > 0 ? (
                <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {poliQueue.map((p, idx) => (
                    <div
                      key={p.code}
                      style={{
                        backgroundColor: 'var(--surface-2)',
                        borderRadius: 'var(--radius-inner)',
                      }}
                      className="flex items-center justify-between px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="tabular-nums flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold"
                          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="tabular-nums text-[14px] font-semibold">{p.code}</div>
                          <div className="type-caption">{p.complaint}</div>
                        </div>
                      </div>
                      <span className="type-caption tabular-nums">{p.waitMin} menit</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Clock}
                  message="Belum ada antrean di Poli. Pasien rawat jalan akan muncul di sini."
                />
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="primary"
                  disabled={!connected || poliQueue.length === 0 || poliDoctorsFull}
                  onClick={() => callNextPatient('poli')}
                >
                  Panggil berikutnya
                </Button>
                {poliDoctorsFull && (
                  <span className="type-caption" style={{ color: 'var(--warn)' }}>
                    Semua dokter sedang bertugas.
                  </span>
                )}
              </div>
            </Card>
          </div>

          {/* ==================== KOLOM KANAN: TEMPAT TIDUR, DILAYANI, KEJADIAN ==================== */}
          <div className="space-y-5">
            {/* Kapasitas tempat tidur (- / + masuk Stack Undo) */}
            <Card>
              <h2 className="type-h2 mb-3" style={{ color: 'var(--text)' }}>
                Tempat tidur
              </h2>
              <div className="space-y-3">
                <BedCounterRow
                  label="Rawat inap"
                  used={hospital.inap.used}
                  total={hospital.inap.total}
                  maxCap={maxInap}
                  disabled={!connected}
                  onChange={(next) => setHospitalBeds('inap', next)}
                />
                {baseIcu > 0 ? (
                  <BedCounterRow
                    label="ICU"
                    used={hospital.icu.used}
                    total={hospital.icu.total}
                    maxCap={maxIcu}
                    disabled={!connected}
                    onChange={(next) => setHospitalBeds('icu', next)}
                  />
                ) : (
                  <div
                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-[14px]"
                    style={{ backgroundColor: 'var(--surface-2)' }}
                  >
                    <span className="font-medium">ICU</span>
                    <span className="type-caption">Tidak tersedia di tipe C</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Sedang dilayani */}
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="type-h2" style={{ color: 'var(--text)' }}>
                  Sedang dilayani ({activeAll.length} dari {hospital.igdDoctors + hospital.poliDoctors})
                </h2>
                <Stethoscope size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
              </div>

              {activeAll.length > 0 ? (
                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {activeAll.map((p) => (
                    <div
                      key={`${p.unit}_${p.code}`}
                      style={{
                        backgroundColor: 'var(--surface-2)',
                        borderRadius: 'var(--radius-inner)',
                      }}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-[14px] font-semibold">{p.code}</span>
                          <span className="type-caption">
                            {p.unit}, {p.elapsedMin} menit
                          </span>
                        </div>
                        <div className="type-caption truncate">{p.complaint}</div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!connected}
                        onClick={() => dischargePatient(p.code)}
                      >
                        <CheckCircle2 size={14} strokeWidth={1.75} />
                        Pulangkan pasien
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Saat ini belum ada pasien yang sedang ditangani dokter." />
              )}
            </Card>

            {/* Kejadian terbaru (10) */}
            <Card>
              <h2 className="type-h2 mb-3" style={{ color: 'var(--text)' }}>
                Kejadian terbaru
              </h2>
              {events.length > 0 ? (
                <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {events.slice(0, 10).map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        backgroundColor: 'var(--surface-2)',
                        borderRadius: 'var(--radius-inner)',
                      }}
                      className="px-3.5 py-2.5"
                    >
                      <div className="text-[13px]" style={{ color: 'var(--text)' }}>
                        {ev.message}
                      </div>
                      <div className="type-caption mt-0.5">{ev.simTimeText || ev.simTime}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Belum ada kejadian tercatat di rumah sakit ini." />
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function BedCounterRow({ label, used, total, maxCap, disabled, onChange }) {
  return (
    <div
      style={{ backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-inner)' }}
      className="flex items-center justify-between gap-3 px-4 py-3"
    >
      <div>
        <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
          {label}
        </div>
        <div className="type-caption tabular-nums">
          Terisi {used} dari {total} (batas 0–{maxCap})
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Kurangi kapasitas ${label}`}
          disabled={disabled || total <= 0}
          onClick={() => onChange(total - 1)}
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
          }}
          className="focus-ring flex h-9 w-9 cursor-pointer items-center justify-center hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Minus size={16} strokeWidth={1.75} />
        </button>

        <span className="font-display tabular-nums w-16 text-center text-[15px]">
          {used}/{total}
        </span>

        <button
          type="button"
          aria-label={`Tambah kapasitas ${label}`}
          disabled={disabled || total >= maxCap}
          onClick={() => onChange(total + 1)}
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
          }}
          className="focus-ring flex h-9 w-9 cursor-pointer items-center justify-center hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
