import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { FlaskConical, RefreshCw } from 'lucide-react';
import { Card, Button, EmptyState } from '../design/index.js';

const EVENT_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'rujukan', label: 'Rujukan' },
  { id: 'peringatan', label: 'Peringatan' },
];

/**
 * Halaman Analitik khusus Dinkes (02_UI_SPEC.md bagian 6).
 * Menampilkan 4 KPI, grafik garis keterisian 24 jam (Surya vs Tirta),
 * grafik batang waktu tunggu per RS, ringkasan eksperimen A/B, dan 30 kejadian terbaru.
 */
export function AnalitikPage({ token, onOpenAcademic }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('all');

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
    const id = window.setInterval(fetchAnalytics, 2000);
    return () => window.clearInterval(id);
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-8 w-40 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--neutral-soft)' }} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl" style={{ backgroundColor: 'var(--neutral-soft)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const kpi = data?.kpi || { waitAvg: 0, bedPct: 0, referralsToday: 0, unreachableToday: 0 };
  const series = data?.series || [];
  const waitByHospital = data?.waitByHospital || [];
  const latestExp = data?.latestExperiment || null;
  const events = (data?.events || []).filter((ev) => {
    if (eventFilter === 'rujukan') return ev.type === 'rujukan' || ev.type === 'ambulans_tiba';
    if (eventFilter === 'peringatan') {
      return ['rs_penuh', 'tidak_ada_rute', 'wabah', 'kecelakaan', 'jembatan'].includes(ev.type);
    }
    return true;
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="type-h1" style={{ color: 'var(--text)' }}>
              Analitik
            </h1>
            <p className="type-caption mt-0.5">
              Ringkasan kinerja layanan dan pemerataan beban dua kota
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="tabular-nums text-[14px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              {data?.simTimeText || '-'}
            </span>
            <Button variant="secondary" size="sm" onClick={fetchAnalytics}>
              <RefreshCw size={14} strokeWidth={1.75} />
              Perbarui
            </Button>
          </div>
        </div>

        {/* 4 Kartu KPI */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Waktu tunggu rata-rata" value={`${kpi.waitAvg} menit`} />
          <KpiCard label="Tempat tidur terisi" value={`${kpi.bedPct}%`} />
          <KpiCard label="Pasien dirujuk hari ini" value={String(kpi.referralsToday)} />
          <KpiCard
            label="Pasien belum bisa dirujuk"
            value={String(kpi.unreachableToday)}
            danger={kpi.unreachableToday > 0}
          />
        </div>

        {/* Grafik garis keterisian tempat tidur per kota (24 jam terakhir) */}
        <Card>
          <h2 className="type-h2 mb-1">Keterisian tempat tidur per kota (24 jam terakhir)</h2>
          <p className="type-caption mb-4">Persentase tempat tidur terisi tiap 15 menit simulasi</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} minTickGap={32} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="surya"
                  name="Kota Surya"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="tirta"
                  name="Kota Tirta"
                  stroke="#16A34A"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Baris 2 kolom: Waktu tunggu per RS & Perbandingan Eksperimen A/B */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="type-h2 mb-1">Waktu tunggu per RS (menit)</h2>
            <p className="type-caption mb-4">Rata-rata waktu tunggu antrean IGD tiap rumah sakit</p>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waitByHospital} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="waitMin" name="Rata-rata tunggu (menit)" fill="#2563EB" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="type-h2">Dengan vs tanpa rujukan otomatis</h2>
                <p className="type-caption">
                  {latestExp
                    ? `Skenario ${latestExp.scenario}, ${latestExp.days} hari, ${latestExp.runs} ulangan`
                    : 'Ringkasan hasil eksperimen A/B'}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={onOpenAcademic}>
                <FlaskConical size={14} strokeWidth={1.75} />
                Mode Akademik
              </Button>
            </div>

            {!latestExp ? (
              <EmptyState
                icon={FlaskConical}
                message="Belum ada eksperimen. Jalankan di Mode Akademik."
                actionLabel="Buka Mode Akademik"
                onAction={onOpenAcademic}
              />
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="py-2 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Metrik
                    </th>
                    <th className="py-2 text-right font-semibold" style={{ color: 'var(--accent)' }}>
                      Aktif
                    </th>
                    <th className="py-2 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Nonaktif
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <CompareRow
                    label="Waktu tunggu rata-rata (menit)"
                    a={latestExp.summary.active.waitAvg}
                    b={latestExp.summary.inactive.waitAvg}
                  />
                  <CompareRow
                    label="Waktu tunggu pasien gawat (menit)"
                    a={latestExp.summary.active.waitGawatAvg}
                    b={latestExp.summary.inactive.waitGawatAvg}
                  />
                  <CompareRow
                    label="Keterisian puncak (%)"
                    a={latestExp.summary.active.peakBedPct}
                    b={latestExp.summary.inactive.peakBedPct}
                  />
                  <CompareRow
                    label="Pasien berhasil dirujuk"
                    a={latestExp.summary.active.referralsTotal}
                    b={latestExp.summary.inactive.referralsTotal}
                  />
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Kejadian semua RS */}
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="type-h2">Kejadian (semua RS)</h2>
            <div
              className="inline-flex rounded-full p-0.5"
              style={{ backgroundColor: 'var(--surface-2)' }}
            >
              {EVENT_FILTERS.map((f) => {
                const active = eventFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setEventFilter(f.id)}
                    style={{
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: active ? 'var(--surface)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                    className="focus-ring cursor-pointer px-3 py-1 text-[12px] font-semibold"
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {events.length > 0 ? (
            <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  style={{ backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-inner)' }}
                  className="flex items-center justify-between gap-4 px-3.5 py-2.5"
                >
                  <span className="text-[13px]" style={{ color: 'var(--text)' }}>
                    {ev.message}
                  </span>
                  <span className="type-caption tabular-nums shrink-0">{ev.simTimeText}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Belum ada kejadian untuk filter yang dipilih." />
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, danger = false }) {
  return (
    <Card>
      <div className="type-caption">{label}</div>
      <div
        className="type-kpi mt-2"
        style={{ color: danger ? 'var(--danger)' : 'var(--text)' }}
      >
        {value}
      </div>
    </Card>
  );
}

function CompareRow({ label, a, b }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)', height: '42px' }}>
      <td style={{ color: 'var(--text)' }}>{label}</td>
      <td className="text-right font-semibold" style={{ color: 'var(--accent)' }}>
        {a?.mean ?? '-'} <span className="type-caption">±{a?.sd ?? 0}</span>
      </td>
      <td className="text-right" style={{ color: 'var(--text-muted)' }}>
        {b?.mean ?? '-'} <span className="type-caption">±{b?.sd ?? 0}</span>
      </td>
    </tr>
  );
}
