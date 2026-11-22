import { useEffect, useRef, useState } from 'react';
import {
  Map as MapIcon,
  BarChart3,
  Users,
  Building2,
  ClipboardList,
  Search,
  ChevronDown,
  FlaskConical,
  LogOut,
  X,
} from 'lucide-react';
import { APP_NAME, ROLE_LABEL } from '@shared/constants.js';
import { SidebarButton } from '../design/index.js';

const MENU_BY_ROLE = {
  warga: [
    { id: 'peta', label: 'Peta', icon: MapIcon },
    { id: 'antrean', label: 'Antrean saya', icon: ClipboardList },
  ],
  petugas: [
    { id: 'peta', label: 'Peta', icon: MapIcon },
    { id: 'rs_saya', label: 'RS saya', icon: Building2 },
  ],
  dinkes: [
    { id: 'peta', label: 'Peta', icon: MapIcon },
    { id: 'rs_saya', label: 'Kelola RS', icon: Building2 },
    { id: 'analitik', label: 'Analitik', icon: BarChart3 },
    { id: 'pengguna', label: 'Pengguna', icon: Users },
  ],
};

const DEMO_ROLE_SHORTCUTS = [
  { label: 'Dinkes (Super Admin)', email: 'dinkes@simpulsehat.demo' },
  { label: 'Petugas RS Surya', email: 'petugas.surya@simpulsehat.demo' },
  { label: 'Warga', email: 'warga@simpulsehat.demo' },
];

/**
 * Kerangka umum semua halaman setelah login (02_UI_SPEC.md bagian 1).
 * Topbar 56 px (logo + nama, kolom cari RS khusus di halaman Peta, menu profil).
 * Sidebar 72 px (hanya ikon + tooltip di kanan).
 */
export function AppShell({
  user,
  activePage,
  onNavigate,
  searchQuery,
  onSearchChange,
  onSwitchDemoRole,
  onLogout,
  children,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const menuItems = MENU_BY_ROLE[user.role] || MENU_BY_ROLE.dinkes;

  useEffect(() => {
    function handleOutsideClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const initials = user.displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="flex h-[100dvh] w-screen flex-col overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
      {/* Topbar 56 px */}
      <header
        style={{
          height: '56px',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
        className="z-30 flex shrink-0 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4"
      >
        {/* 1. Logo dan nama */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: 'var(--accent)' }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4z"
                fill="#FFFFFF"
              />
            </svg>
          </div>
          <span
            className={`font-display text-[17px] leading-none tracking-[-0.01em] ${
              activePage === 'peta' ? 'hidden sm:inline' : 'inline'
            }`}
            style={{ color: 'var(--text)' }}
          >
            {APP_NAME}
          </span>
        </div>

        {/* 2. Kolom cari RS (hanya di halaman Peta) */}
        <div className="flex flex-1 justify-center px-2">
          {activePage === 'peta' && (
            <div className="relative w-full max-w-[340px]">
              <Search
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--text-faint)' }}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Cari rumah sakit"
                aria-label="Cari rumah sakit"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-pill)',
                  color: 'var(--text)',
                }}
                className="focus-ring h-9 w-full pl-9 pr-8 text-[13px] placeholder:text-[var(--text-faint)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  aria-label="Hapus pencarian"
                  className="focus-ring absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--border)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Menu profil */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            style={{
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
            }}
            className="focus-ring flex h-9 cursor-pointer items-center gap-2 pl-1.5 pr-3 hover:bg-[var(--surface-2)]"
            aria-expanded={profileOpen}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {initials}
            </span>
            <span className="hidden text-[13px] font-medium sm:inline" style={{ color: 'var(--text)' }}>
              {ROLE_LABEL[user.role] || user.role}
            </span>
            <ChevronDown size={14} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
          </button>

          {profileOpen && (
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-inner)',
                boxShadow: 'var(--shadow-float)',
                border: '1px solid var(--border)',
              }}
              className="absolute right-0 top-[44px] z-50 w-56 p-1.5"
            >
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="truncate text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                  {user.displayName}
                </div>
                <div className="type-caption">{ROLE_LABEL[user.role] || user.role}</div>
              </div>

              <div className="mt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate?.('akademik');
                  }}
                  style={{ borderRadius: '10px', color: 'var(--text)' }}
                  className="focus-ring flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] font-medium hover:bg-[var(--surface-2)]"
                >
                  <FlaskConical size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                  <span>Mode Akademik</span>
                </button>

                {onSwitchDemoRole && (
                  <div className="my-1 border-t pt-1.5" style={{ borderColor: 'var(--border)' }}>
                    <div className="type-caption px-3 pb-1">Pindah peran cepat (demo)</div>
                    {DEMO_ROLE_SHORTCUTS.map((item) => (
                      <button
                        key={item.email}
                        type="button"
                        disabled={user.email === item.email}
                        onClick={() => {
                          setProfileOpen(false);
                          onSwitchDemoRole(item.email);
                        }}
                        style={{
                          borderRadius: '10px',
                          color: user.email === item.email ? 'var(--accent)' : 'var(--text-muted)',
                        }}
                        className="focus-ring flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--surface-2)] disabled:cursor-default"
                      >
                        <span>{item.label}</span>
                        {user.email === item.email && <span className="text-[11px]">Aktif</span>}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout?.();
                  }}
                  style={{ borderRadius: '10px', color: 'var(--danger)' }}
                  className="focus-ring flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] font-medium hover:bg-[var(--danger-soft)]"
                >
                  <LogOut size={16} strokeWidth={1.75} />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Area isi: Sidebar 72 px di desktop + konten utama */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav
          aria-label="Navigasi utama"
          style={{
            width: '72px',
            backgroundColor: 'var(--surface)',
            borderRight: '1px solid var(--border)',
          }}
          className="z-20 hidden shrink-0 flex-col items-center gap-2 py-3 md:flex"
        >
          {menuItems.map((item) => (
            <SidebarButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activePage === item.id}
              onClick={() => onNavigate?.(item.id)}
            />
          ))}
        </nav>

        <main className="relative min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>

      {/* Navigasi bawah khusus layar mobile / Android (< md) */}
      <nav
        aria-label="Navigasi mobile"
        style={{
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--border)',
        }}
        className="z-30 flex shrink-0 items-center justify-around px-1 py-1.5 md:hidden"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              style={{
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                borderRadius: '12px',
              }}
              className="focus-ring flex min-w-[64px] cursor-pointer flex-col items-center justify-center gap-0.5 px-3 py-1.5"
            >
              <Icon size={18} strokeWidth={active ? 2.1 : 1.75} />
              <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
