import { X, Clock, Building2, Activity, GitCommitHorizontal } from 'lucide-react';
import { Card, StatusBadge, PatientAvatar } from '../design/index.js';

/**
 * Panel mengambang Detail Pasien (muncul di samping Kartu Kiri saat pasien diklik).
 * Menampilkan avatar wajah vektor SVG sintetis, profil sintetis, dan
 * timeline perjalanan pasien yang dibaca langsung dari LinkedList PatientJourney di server.
 */
export function PatientDetailPanel({ patient, onClose }) {
  if (!patient) return null;

  return (
    <div
      role="dialog"
      aria-label={`Detail pasien ${patient.code}`}
      className="pointer-events-none absolute inset-x-4 top-4 z-30 flex max-h-[calc(100%-32px)] flex-col lg:inset-x-auto lg:left-[392px] lg:top-4 lg:w-[340px]"
    >
      <Card
        glass
        padding={false}
        className="pointer-events-auto flex max-h-full flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-glass)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-float)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
        }}
      >
        <div className="overflow-y-auto p-5">
          {/* Header avatar + kode + tutup */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <PatientAvatar code={patient.code} triage={patient.triage} size={60} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="type-h2 tabular-nums" style={{ color: 'var(--text)' }}>
                    {patient.code}
                  </h2>
                  <StatusBadge status={patient.triage} />
                </div>
                <p className="type-caption mt-1">
                  Pasien sintetis, usia {patient.age} tahun
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup detail pasien"
              className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* Ringkasan kondisi sintetis */}
          <Card variant="inner" className="mt-4 space-y-2.5">
            <div className="flex items-start gap-2.5 text-[13px]">
              <Activity
                size={15}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--accent)' }}
              />
              <div>
                <div className="type-caption">Keluhan utama</div>
                <div className="font-medium" style={{ color: 'var(--text)' }}>
                  {patient.complaint}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-[13px]">
              <Building2
                size={15}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--text-muted)' }}
              />
              <div>
                <div className="type-caption">Lokasi dan status</div>
                <div className="font-medium" style={{ color: 'var(--text)' }}>
                  {patient.currentStageLabel} di {patient.currentHospitalName}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-[13px]">
              <Clock
                size={15}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--text-muted)' }}
              />
              <div>
                <div className="type-caption">Durasi sejak tiba</div>
                <div className="tabular-nums font-medium" style={{ color: 'var(--text)' }}>
                  {patient.waitMin} menit simulasi
                  {patient.isReferred ? ' (pasien rujukan)' : ''}
                </div>
              </div>
            </div>
          </Card>

          {/* Jejak perjalanan pasien (dari LinkedList PatientJourney di server) */}
          <div className="mt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="type-h3 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                <GitCommitHorizontal size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                Riwayat perjalanan
              </h3>
              <span className="type-caption tabular-nums">
                {patient.journey?.length || 0} tahap
              </span>
            </div>

            <ol className="relative ml-2 space-y-3 border-l-2 pl-4" style={{ borderColor: 'var(--border)' }}>
              {(patient.journey || []).map((step, idx) => {
                const isLast = idx === patient.journey.length - 1;
                return (
                  <li key={`${step.stage}_${idx}`} className="relative">
                    <span
                      style={{
                        backgroundColor: isLast ? 'var(--accent)' : 'var(--surface)',
                        border: `2px solid ${isLast ? 'var(--accent)' : 'var(--neutral)'}`,
                      }}
                      className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full"
                    />
                    <div className="text-[13px] font-medium leading-5" style={{ color: 'var(--text)' }}>
                      {step.stageLabel}
                    </div>
                    <div className="type-caption">
                      {step.toHospitalName
                        ? `${step.hospitalName} ke ${step.toHospitalName}`
                        : step.hospitalName}
                    </div>
                    <div className="type-caption tabular-nums">{step.timeText}</div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
