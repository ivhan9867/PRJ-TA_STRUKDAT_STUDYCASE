import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Ambulance,
  Stethoscope,
  SearchX,
  Clock,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  Card,
  StatusBadge,
  ProgressBar,
  HospitalListItem,
  Tabs,
  EmptyState,
  Button,
  PatientAvatar,
  AnimatedNumber,
} from '../design/index.js';

const CITY_FILTER = [
  { id: 'all', label: 'Semua' },
  { id: 'surya', label: 'Surya' },
  { id: 'tirta', label: 'Tirta' },
];

const DETAIL_TABS = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'antrean', label: 'Antrean' },
  { id: 'kejadian', label: 'Kejadian' },
];

/**
 * Kartu kiri mengambang di halaman Peta (lebar 360 px di desktop, bottom sheet 45% di <1024px).
 * Memiliki 2 keadaan: "Ringkasan" (default) dan "Detail RS" dengan transisi halus 250 ms.
 */
export function PetaLeftCard({
  user,
  kpi,
  hospitals,
  cityFilter,
  searchQuery,
  selectedHospital,
  selectedHospitalDetail,
  selectedPatientCode,
  hasActiveQueue = false,
  onRegisterWarga,
  onGoToRsSaya,
  onManageHospital,
  onTriggerCasualtyHere,
  onChangeCityFilter,
  onSelectHospital,
  onSelectPatient,
  onBackToSummary,
}) {
  const [detailTab, setDetailTab] = useState('ringkasan');
  const [showInpatients, setShowInpatients] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerUnit, setRegisterUnit] = useState('poli');
  // Di layar HP/Android (<1024px) mulai dalam keadaan ringkas agar peta langsung lega; di desktop mulai terbuka
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  // Otomatis buka panel ketika pengguna mengetuk gedung RS di peta
  useEffect(() => {
    if (selectedHospital) {
      setCollapsed(false);
    }
  }, [selectedHospital?.id]);

  const filteredHospitals = hospitals.filter((rs) => {
    const matchCity = cityFilter === 'all' || rs.city === cityFilter;
    const matchSearch =
      !searchQuery.trim() ||
      rs.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchCity && matchSearch;
  });

  const handleSelect = (id) => {
    setDetailTab('ringkasan');
    onSelectHospital?.(id);
  };

  // Tampilan ringkas (sembunyi) — pil mengambang di kiri atas (desktop) & bar tipis di bawah (Android/mobile)
  if (collapsed) {
    return (
      <>
        {/* Desktop: tombol pil di kiri atas */}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{
            height: '40px',
            borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--shadow-chip)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            color: 'var(--text)',
          }}
          className="surface-glass focus-ring absolute left-4 top-4 z-20 hidden cursor-pointer items-center gap-2 px-3.5 text-[13px] font-semibold hover:bg-[var(--surface)] lg:inline-flex"
        >
          <PanelLeftOpen size={16} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
          <span>Panel RS</span>
          <span
            style={{
              backgroundColor: 'var(--accent-soft)',
              color: 'var(--accent-ink)',
              borderRadius: 'var(--radius-pill)',
            }}
            className="tabular-nums px-2 py-0.5 text-[11px] font-semibold"
          >
            {kpi.bedPct}% · {hospitals.length} RS
          </span>
        </button>

        {/* Mobile / Android: bar ringkas di bawah agar peta 90% layar tetap bebas */}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-float)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
          }}
          className="surface-glass focus-ring absolute inset-x-3 bottom-3 z-20 flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left lg:hidden"
        >
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
              Halo, {user.shortName || user.displayName}
            </div>
            <div className="type-caption tabular-nums truncate">
              IGD {kpi.totalIgdQueue} · Tempat tidur {kpi.bedPct}% · Dirujuk {kpi.referralsToday}
            </div>
          </div>
          <span
            style={{
              backgroundColor: 'var(--accent-soft)',
              color: 'var(--accent)',
              borderRadius: 'var(--radius-pill)',
            }}
            className="inline-flex shrink-0 items-center gap-1 px-2.5 py-1 text-[12px] font-semibold"
          >
            <span>Buka</span>
            <ChevronUp size={15} strokeWidth={2} />
          </span>
        </button>
      </>
    );
  }

  return (
    <aside
      aria-label="Panel ringkasan dan detail rumah sakit"
      className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex max-h-[56dvh] flex-col lg:inset-x-auto lg:bottom-auto lg:left-4 lg:top-4 lg:max-h-[calc(100%-32px)] lg:w-[360px]"
    >
      <Card
        glass
        padding={false}
        className="pointer-events-auto flex max-h-full flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-glass)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-float)',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          transition: 'all var(--t-base) var(--ease)',
        }}
      >
        {/* Pegangan tarik tipis di mobile untuk menutup cepat */}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Sembunyikan panel"
          className="flex w-full shrink-0 cursor-pointer items-center justify-center pt-2 pb-1 lg:hidden"
        >
          <span className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </button>

        <div className="overflow-y-auto px-4 pb-4 pt-2 lg:p-5">
          {!selectedHospital ? (
            /* ================= KEADAAN RINGKASAN ================= */
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="type-h1" style={{ color: 'var(--text)' }}>
                    Halo, {user.shortName || user.displayName}
                  </h1>
                  <p className="type-caption mt-0.5">Berikut kondisi dua kota.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  title="Sembunyikan panel"
                  aria-label="Sembunyikan panel"
                  style={{
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--surface-2)',
                    color: 'var(--text-muted)',
                  }}
                  className="focus-ring inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 px-2.5 text-[12px] font-semibold hover:bg-[var(--border)]"
                >
                  <PanelLeftClose size={15} strokeWidth={1.8} className="hidden lg:inline" />
                  <ChevronDown size={15} strokeWidth={2} className="inline lg:hidden" />
                  <span>Tutup</span>
                </button>
              </div>

              {/* 3 blok angka dengan transisi hitung 400 ms */}
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <Card variant="inner" className="px-3 py-3">
                  <div
                    className="font-display tabular-nums text-[24px] leading-7"
                    style={{ color: 'var(--text)' }}
                  >
                    <AnimatedNumber value={kpi.totalIgdQueue} />
                  </div>
                  <div className="type-caption mt-1 leading-4">Antrean IGD</div>
                </Card>

                <Card variant="inner" className="px-3 py-3">
                  <div
                    className="font-display tabular-nums text-[24px] leading-7"
                    style={{ color: 'var(--text)' }}
                  >
                    <AnimatedNumber value={kpi.bedPct} suffix="%" />
                  </div>
                  <div className="type-caption mt-1 leading-4">Tempat tidur terisi</div>
                </Card>

                <Card variant="inner" className="px-3 py-3">
                  <div
                    className="font-display tabular-nums text-[24px] leading-7"
                    style={{ color: 'var(--text)' }}
                  >
                    <AnimatedNumber value={kpi.referralsToday} />
                  </div>
                  <div className="type-caption mt-1 leading-4">Dirujuk hari ini</div>
                </Card>
              </div>

              {/* Daftar rumah sakit + filter kota */}
              <div className="mt-5 flex items-center justify-between gap-2">
                <h2 className="type-h3" style={{ color: 'var(--text)' }}>
                  Rumah sakit
                </h2>

                <div
                  className="inline-flex rounded-full p-0.5"
                  style={{ backgroundColor: 'var(--surface-2)' }}
                  role="group"
                  aria-label="Saring kota"
                >
                  {CITY_FILTER.map((item) => {
                    const active = cityFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChangeCityFilter?.(item.id)}
                        style={{
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: active ? 'var(--surface)' : 'transparent',
                          color: active ? 'var(--accent)' : 'var(--text-muted)',
                          boxShadow: active ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                        }}
                        className="focus-ring cursor-pointer px-2.5 py-1 text-[12px] font-semibold"
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2.5 space-y-1">
                {filteredHospitals.length > 0 ? (
                  filteredHospitals.map((rs) => (
                    <HospitalListItem
                      key={rs.id}
                      hospital={rs}
                      onClick={handleSelect}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={SearchX}
                    message="Tidak ada rumah sakit dengan nama itu."
                  />
                )}
              </div>
            </div>
          ) : (
            /* ================= KEADAAN DETAIL RS ================= */
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onBackToSummary}
                  style={{ color: 'var(--text-muted)' }}
                  className="focus-ring -ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1 py-1 text-[13px] font-semibold hover:text-[var(--text)]"
                >
                  <ArrowLeft size={16} strokeWidth={1.75} />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  title="Sembunyikan panel"
                  aria-label="Sembunyikan panel"
                  style={{
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--surface-2)',
                    color: 'var(--text-muted)',
                  }}
                  className="focus-ring inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 px-2.5 text-[12px] font-semibold hover:bg-[var(--border)]"
                >
                  <PanelLeftClose size={14} strokeWidth={1.8} className="hidden lg:inline" />
                  <ChevronDown size={14} strokeWidth={2} className="inline lg:hidden" />
                  <span>Tutup</span>
                </button>
              </div>

              <h1 className="type-h1" style={{ color: 'var(--text)' }}>
                {selectedHospital.name}
              </h1>

              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="type-caption">
                  Tipe {selectedHospital.type}, Kota{' '}
                  {selectedHospital.city === 'surya' ? 'Surya' : 'Tirta'}
                </span>
                <StatusBadge status={selectedHospital.status} />
              </div>

              <Tabs
                items={DETAIL_TABS}
                activeId={detailTab}
                onChange={setDetailTab}
                className="mt-4"
              />

              {/* Tab Ringkasan */}
              {detailTab === 'ringkasan' && (
                <div className="mt-4 space-y-4">
                  <ProgressBar
                    label="Tempat tidur rawat inap"
                    value={selectedHospital.inap.used}
                    max={selectedHospital.inap.total}
                  />

                  {selectedHospital.icu.total > 0 ? (
                    <ProgressBar
                      label="ICU"
                      value={selectedHospital.icu.used}
                      max={selectedHospital.icu.total}
                    />
                  ) : (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium" style={{ color: 'var(--text)' }}>
                        ICU
                      </span>
                      <span className="type-caption">Tidak tersedia</span>
                    </div>
                  )}

                  <ProgressBar
                    label="Antrean IGD"
                    value={selectedHospital.igdQueue}
                    max={Math.max(selectedHospital.igdDoctors * 2, 1)}
                    rightText={`${selectedHospital.igdQueue} pasien`}
                  />

                  <Card variant="inner" className="space-y-2.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Ambulance size={16} strokeWidth={1.75} />
                        Ambulans siaga
                      </span>
                      <span className="tabular-nums font-semibold" style={{ color: 'var(--text)' }}>
                        {selectedHospital.ambFree} dari {selectedHospital.ambulances}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Stethoscope size={16} strokeWidth={1.75} />
                        Dokter IGD bertugas
                      </span>
                      <span className="tabular-nums font-semibold" style={{ color: 'var(--text)' }}>
                        {selectedHospital.igdBusy} dari {selectedHospital.igdDoctors}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Clock size={16} strokeWidth={1.75} />
                        Antrean poli
                      </span>
                      <span className="tabular-nums font-semibold" style={{ color: 'var(--text)' }}>
                        {selectedHospital.poliQueue ?? 0} pasien ({selectedHospital.poliDoctors} dokter)
                      </span>
                    </div>
                  </Card>

                  {/* Tombol sesuai peran */}
                  {user.role === 'warga' && (
                    <div className="space-y-2">
                      {!showRegisterForm ? (
                        <>
                          <Button
                            variant="primary"
                            className="w-full"
                            disabled={hasActiveQueue}
                            onClick={() => setShowRegisterForm(true)}
                          >
                            Daftar antrean
                          </Button>
                          {hasActiveQueue && (
                            <p className="type-caption text-center">
                              Selesaikan atau batalkan antrean Anda lebih dulu.
                            </p>
                          )}
                        </>
                      ) : (
                        <Card variant="inner" className="space-y-2.5">
                          <div className="text-[13px] font-semibold">Pilih unit antrean</div>
                          <div className="grid grid-cols-2 gap-2">
                            {['poli', 'igd'].map((u) => (
                              <button
                                key={u}
                                type="button"
                                onClick={() => setRegisterUnit(u)}
                                style={{
                                  borderRadius: 'var(--radius-btn)',
                                  border:
                                    registerUnit === u
                                      ? '1.5px solid var(--accent)'
                                      : '1px solid var(--border)',
                                  backgroundColor:
                                    registerUnit === u ? 'var(--accent-soft)' : 'var(--surface)',
                                  color:
                                    registerUnit === u ? 'var(--accent-ink)' : 'var(--text)',
                                }}
                                className="focus-ring cursor-pointer py-2 text-[13px] font-semibold"
                              >
                                {u === 'poli' ? 'Poli' : 'IGD'}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex-1"
                              onClick={() => setShowRegisterForm(false)}
                            >
                              Batal
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                onRegisterWarga?.(selectedHospital.id, registerUnit);
                                setShowRegisterForm(false);
                              }}
                            >
                              Daftar
                            </Button>
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                  {user.role === 'petugas' && user.hospitalId === selectedHospital.id && (
                    <Button variant="primary" className="w-full" onClick={() => onGoToRsSaya?.()}>
                      Kelola di RS saya
                    </Button>
                  )}
                  {user.role === 'dinkes' && (
                    <div className="space-y-2">
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => onManageHospital?.(selectedHospital.id)}
                      >
                        Kelola rumah sakit ini
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="w-full"
                        onClick={() => onTriggerCasualtyHere?.(selectedHospital.id)}
                      >
                        Picu kecelakaan massal di sini
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Antrean: Sedang dilayani dokter IGD + Menunggu di antrean IGD (semua bisa diklik) */}
              {detailTab === 'antrean' && (
                <div className="mt-3 space-y-4">
                  {/* Bagian 1: Sedang dilayani dokter IGD */}
                  {(selectedHospitalDetail?.activeIgd?.length ?? 0) > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          Sedang dilayani dokter IGD ({selectedHospitalDetail.activeIgd.length})
                        </span>
                        <span className="type-caption">Klik untuk detail</span>
                      </div>
                      <div className="space-y-1.5">
                        {selectedHospitalDetail.activeIgd.map((p) => {
                          const isSelected = selectedPatientCode === p.code;
                          return (
                            <button
                              key={p.code}
                              type="button"
                              onClick={() => onSelectPatient?.(p.code)}
                              style={{
                                borderRadius: 'var(--radius-inner)',
                                backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--surface-2)',
                                border: isSelected ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                              }}
                              className="focus-ring flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-[var(--accent-soft)]/50"
                            >
                              <PatientAvatar code={p.code} triage={p.triage} size={32} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="tabular-nums text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                                    {p.code}
                                    {p.isMe && (
                                      <span className="ml-1.5 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                                        (Anda)
                                      </span>
                                    )}
                                  </span>
                                  <StatusBadge status={p.triage} />
                                </div>
                                <div className="mt-0.5 flex items-center justify-between gap-2">
                                  <span className="type-caption truncate">{p.complaint || 'Pemeriksaan IGD'}</span>
                                  <span className="type-caption tabular-nums shrink-0">{p.elapsedMin} mnt</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bagian 2: Menunggu di antrean IGD */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                        Menunggu di antrean IGD ({selectedHospitalDetail?.queue?.length ?? 0})
                      </span>
                    </div>

                    {(selectedHospitalDetail?.queue?.length ?? 0) > 0 ? (
                      <div className="space-y-1.5">
                        {selectedHospitalDetail.queue.slice(0, 20).map((p) => {
                          const isSelected = selectedPatientCode === p.code;
                          return (
                            <button
                              key={p.code}
                              type="button"
                              onClick={() => onSelectPatient?.(p.code)}
                              style={{
                                borderRadius: 'var(--radius-inner)',
                                backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                                border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                              }}
                              className="focus-ring flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                            >
                              <PatientAvatar code={p.code} triage={p.triage} size={32} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="tabular-nums text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                                    {p.code}
                                    {p.isMe && (
                                      <span className="ml-1.5 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                                        (Anda)
                                      </span>
                                    )}
                                  </span>
                                  <StatusBadge status={p.triage} />
                                </div>
                                <div className="mt-0.5 flex items-center justify-between gap-2">
                                  <span className="type-caption truncate">{p.complaint || 'Menunggu triase'}</span>
                                  <span className="type-caption tabular-nums shrink-0">{p.waitMin} mnt</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Clock}
                        message="Belum ada antrean di IGD. Pasien yang datang akan muncul di sini."
                      />
                    )}
                  </div>

                  {/* Bagian 3: Dirawat inap dan ICU (dapat dilipat agar tetap rapi) */}
                  {(selectedHospitalDetail?.inpatients?.length ?? 0) > 0 && (
                    <div className="pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                      <button
                        type="button"
                        onClick={() => setShowInpatients((v) => !v)}
                        className="focus-ring flex w-full cursor-pointer items-center justify-between rounded-lg py-1.5 text-left"
                      >
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          Dirawat inap dan ICU ({selectedHospitalDetail.inpatients.length} terbaru)
                        </span>
                        {showInpatients ? (
                          <ChevronUp size={15} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
                        ) : (
                          <ChevronDown size={15} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </button>

                      {showInpatients && (
                        <div className="mt-1.5 space-y-1.5">
                          {selectedHospitalDetail.inpatients.map((p) => {
                            const isSelected = selectedPatientCode === p.code;
                            return (
                              <button
                                key={p.code}
                                type="button"
                                onClick={() => onSelectPatient?.(p.code)}
                                style={{
                                  borderRadius: 'var(--radius-inner)',
                                  backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--surface-2)',
                                  border: isSelected ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                                }}
                                className="focus-ring flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-[var(--accent-soft)]/50"
                              >
                                <PatientAvatar code={p.code} triage={p.triage} size={30} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="tabular-nums text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                                      {p.code}
                                    </span>
                                    <span
                                      style={{
                                        borderRadius: 'var(--radius-pill)',
                                        backgroundColor: p.bedType === 'icu' ? 'var(--danger-soft)' : 'var(--accent-soft)',
                                        color: p.bedType === 'icu' ? 'var(--danger)' : 'var(--accent-ink)',
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-semibold"
                                    >
                                      {p.bedType === 'icu' ? 'ICU' : 'Rawat inap'}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex items-center justify-between gap-2">
                                    <span className="type-caption truncate">{p.complaint}</span>
                                    <span className="type-caption tabular-nums shrink-0">{p.stayMin} mnt</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Kejadian */}
              {detailTab === 'kejadian' && (
                <div className="mt-3 space-y-2">
                  {(selectedHospitalDetail?.events?.length ?? 0) > 0 ? (
                    selectedHospitalDetail.events.slice(0, 15).map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          backgroundColor: 'var(--surface-2)',
                          borderRadius: 'var(--radius-inner)',
                        }}
                        className="px-3.5 py-2.5"
                      >
                        <div className="text-[13px] leading-5" style={{ color: 'var(--text)' }}>
                          {ev.message}
                        </div>
                        <div className="type-caption mt-1">{ev.simTimeText || ev.simTime}</div>
                      </div>
                    ))
                  ) : (
                    <EmptyState message="Belum ada kejadian tercatat di rumah sakit ini." />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </aside>
  );
}
