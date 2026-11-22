import { useState } from 'react';
import { ShieldCheck, Building2, User } from 'lucide-react';
import { APP_NAME } from '@shared/constants.js';
import { Card, Button } from '../design/index.js';

const QUICK_DEMO_ACCOUNTS = [
  { label: 'Dinkes', email: 'dinkes@simpulsehat.demo', icon: ShieldCheck },
  { label: 'Petugas RS', email: 'petugas.surya@simpulsehat.demo', icon: Building2 },
  { label: 'Warga', email: 'warga@simpulsehat.demo', icon: User },
];

/**
 * Halaman Login dan Daftar sesuai 02_UI_SPEC.md bagian 2.
 * Layout dua kolom: kiri (logo, deskripsi, ilustrasi peta mini), kanan (form Masuk/Daftar).
 */
export function LoginPage({ onLogin, onRegister, error, onClearError }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInfoMsg('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister({ displayName, email, password });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail) => {
    setInfoMsg('');
    setSubmitting(true);
    try {
      await onLogin(demoEmail, 'demo1234');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    onClearError?.();
    setInfoMsg('');
    setMode((m) => (m === 'login' ? 'register' : 'login'));
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-8"
      style={{ backgroundColor: 'var(--map-land-surya)' }}
    >
      <Card
        padding={false}
        className="grid w-full max-w-[860px] overflow-hidden md:grid-cols-2"
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-float)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Kolom kiri: brand & ilustrasi peta mini dua kota */}
        <div
          className="flex flex-col justify-between p-8"
          style={{ backgroundColor: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[11px]"
                style={{ backgroundColor: 'var(--accent)' }}
                aria-hidden="true"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4z" fill="#FFFFFF" />
                </svg>
              </div>
              <span className="font-display text-[20px]" style={{ color: 'var(--text)' }}>
                {APP_NAME}
              </span>
            </div>

            <h1 className="type-h1 mt-6" style={{ color: 'var(--text)' }}>
              Pantau kapasitas rumah sakit dua kota
            </h1>
            <p className="type-body mt-2.5" style={{ color: 'var(--text-muted)' }}>
              Saat rumah sakit di satu kota penuh, sistem otomatis merujuk pasien ke rumah sakit
              di kota lain yang masih punya tempat lewat rute tercepat.
            </p>
          </div>

          {/* Ilustrasi peta mini dua kota */}
          <div
            className="mt-8 overflow-hidden rounded-[18px] border"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--map-land-surya)' }}
          >
            <svg viewBox="0 0 360 170" className="block w-full" aria-hidden="true">
              <rect x="0" y="0" width="160" height="170" fill="#E8EFF8" />
              <rect x="200" y="0" width="160" height="170" fill="#E6F2EF" />
              <path d="M160 0 Q176 85 156 170 L204 170 Q218 85 200 0 Z" fill="#BFD9F0" />

              {/* Jalan & jembatan */}
              <g stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round">
                <line x1="60" y1="55" x2="300" y2="55" />
                <line x1="60" y1="120" x2="300" y2="120" />
                <line x1="115" y1="55" x2="115" y2="120" />
                <line x1="250" y1="55" x2="250" y2="120" />
              </g>

              {/* Garis rute rujukan putus-putus */}
              <path
                d="M300 55 L60 55"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeDasharray="6 5"
                fill="none"
              />

              {/* Ambulans melintas jembatan */}
              <g transform="translate(180, 55)">
                <rect x="-12" y="-7" width="24" height="14" rx="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.8" />
                <rect x="-1.2" y="-4" width="2.4" height="8" fill="#DC2626" />
                <rect x="-4" y="-1.2" width="8" height="2.4" fill="#DC2626" />
              </g>

              {/* Marker RS Surya (Lega) & RS Tirta (Penuh) */}
              <g transform="translate(60, 55)">
                <rect x="-13" y="-13" width="26" height="26" rx="7" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2.5" />
                <rect x="-2" y="-6.5" width="4" height="13" rx="1" fill="#16A34A" />
                <rect x="-6.5" y="-2" width="13" height="4" rx="1" fill="#16A34A" />
              </g>
              <g transform="translate(300, 55)">
                <rect x="-13" y="-13" width="26" height="26" rx="7" fill="#FFFFFF" stroke="#DC2626" strokeWidth="2.5" />
                <rect x="-2" y="-6.5" width="4" height="13" rx="1" fill="#DC2626" />
                <rect x="-6.5" y="-2" width="13" height="4" rx="1" fill="#DC2626" />
              </g>

              <text x="72" y="152" fontSize="12" fontWeight="600" fill="#64748B">
                Kota Surya
              </text>
              <text x="234" y="152" fontSize="12" fontWeight="600" fill="#64748B">
                Kota Tirta
              </text>
            </svg>
          </div>
        </div>

        {/* Kolom kanan: form Masuk / Daftar */}
        <div className="flex flex-col justify-center p-8">
          <h2 className="type-h1" style={{ color: 'var(--text)' }}>
            {mode === 'login' ? 'Masuk' : 'Daftar akun warga'}
          </h2>
          <p className="type-caption mt-1">
            {mode === 'login'
              ? 'Masuk dengan akun Anda untuk membuka peta dan layanan.'
              : 'Akun baru otomatis terdaftar sebagai Warga.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                  Nama lengkap
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Siti Aminah"
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inner)',
                  }}
                  className="focus-ring h-11 w-full px-3.5 text-[14px]"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inner)',
                }}
                className="focus-ring h-11 w-full px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                Kata sandi
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inner)',
                }}
                className="focus-ring h-11 w-full px-3.5 text-[14px]"
              />
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: 'var(--danger-soft)',
                  color: 'var(--danger)',
                  borderRadius: 'var(--radius-btn)',
                }}
                className="px-3.5 py-2.5 text-[13px] font-medium"
              >
                {error}
              </div>
            )}

            {infoMsg && (
              <div
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent-ink)',
                  borderRadius: 'var(--radius-btn)',
                }}
                className="px-3.5 py-2.5 text-[13px] font-medium"
              >
                {infoMsg}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
            </Button>

            {mode === 'login' && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() =>
                  setInfoMsg(
                    'Login Google akan aktif otomatis setelah kredensial Firebase dipasang pada tahap akhir. Gunakan akun demo di bawah untuk pengujian lokal.'
                  )
                }
              >
                Masuk dengan Google
              </Button>
            )}
          </form>

          <p className="mt-4 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button
              type="button"
              onClick={switchMode}
              className="focus-ring cursor-pointer font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              {mode === 'login' ? 'Daftar' : 'Masuk'}
            </button>
          </p>

          {/* Pintasan akun demo lokal untuk pengujian 3 peran */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="type-caption mb-2.5 text-center">
              Masuk cepat mode pengujian lokal (sandi: demo1234)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickDemo(acc.email)}
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-btn)',
                      color: 'var(--text)',
                    }}
                    className="focus-ring flex cursor-pointer flex-col items-center gap-1 py-2.5 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    <span>{acc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
