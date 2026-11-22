import { lazy, Suspense, useEffect, useState } from 'react';
import { Layers, WifiOff } from 'lucide-react';
import { APP_NAME } from '@shared/constants.js';
import { AppShell } from './components/AppShell.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { PetaPage } from './pages/PetaPage.jsx';
import { Card, EmptyState, ToastStack } from './design/index.js';
import { useAuth } from './state/useAuth.js';
import { useSimulationStore } from './state/useSimulationStore.js';

// Code-splitting halaman sekunder & grafik Recharts agar muat awal Peta ringan dan cepat
const AdminPenggunaPage = lazy(() =>
  import('./pages/AdminPenggunaPage.jsx').then((m) => ({ default: m.AdminPenggunaPage }))
);
const RsSayaPage = lazy(() =>
  import('./pages/RsSayaPage.jsx').then((m) => ({ default: m.RsSayaPage }))
);
const AntreanSayaPage = lazy(() =>
  import('./pages/AntreanSayaPage.jsx').then((m) => ({ default: m.AntreanSayaPage }))
);
const AnalitikPage = lazy(() =>
  import('./pages/AnalitikPage.jsx').then((m) => ({ default: m.AnalitikPage }))
);
const ModeAkademikPage = lazy(() =>
  import('./pages/akademik/ModeAkademikPage.jsx').then((m) => ({ default: m.ModeAkademikPage }))
);

const PAGE_PLACEHOLDER = {
  rs_saya: 'Halaman RS saya untuk petugas sedang disiapkan pada Fase 6.',
  antrean: 'Halaman Antrean saya untuk warga sedang disiapkan pada Fase 6.',
  analitik: 'Halaman Analitik untuk Dinkes sedang disiapkan pada Fase 7.',
  akademik: 'Mode Akademik untuk pengujian 7 struktur data sedang disiapkan pada Fase 7.',
};

export default function App() {
  const auth = useAuth();
  const sim = useSimulationStore(auth.token, {
    onProfileUpdated: auth.updateCurrentUser,
  });
  const [activePage, setActivePage] = useState('peta');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  // Reset halaman ke Peta setiap kali berganti akun / login baru
  useEffect(() => {
    if (auth.user) {
      setActivePage('peta');
      setSearchQuery('');
    }
  }, [auth.user?.uid]);

  if (auth.loading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: 'var(--surface-2)' }}
      >
        <div className="type-caption">Memuat sesi...</div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <LoginPage
        onLogin={auth.login}
        onRegister={auth.register}
        error={auth.error}
        onClearError={auth.clearError}
      />
    );
  }

  const renderPage = () => {
    if (activePage === 'peta') {
      return (
        <PetaPage
          user={auth.user}
          searchQuery={searchQuery}
          sim={sim}
          onNavigate={setActivePage}
        />
      );
    }

    if (activePage === 'rs_saya' && auth.user.role === 'petugas') {
      return <RsSayaPage user={auth.user} sim={sim} />;
    }

    if (activePage === 'antrean' && auth.user.role === 'warga') {
      return <AntreanSayaPage sim={sim} />;
    }

    if (activePage === 'analitik' && auth.user.role === 'dinkes') {
      return (
        <AnalitikPage
          token={auth.token}
          onOpenAcademic={() => setActivePage('akademik')}
        />
      );
    }

    if (activePage === 'akademik') {
      return (
        <ModeAkademikPage
          token={auth.token}
          hospitals={sim.world.hospitals}
        />
      );
    }

    if (activePage === 'pengguna' && auth.user.role === 'dinkes') {
      return (
        <AdminPenggunaPage
          currentUser={auth.user}
          token={auth.token}
          hospitals={sim.world.hospitals}
          onToast={sim.pushToast}
        />
      );
    }

    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <EmptyState
            icon={Layers}
            message={PAGE_PLACEHOLDER[activePage] || 'Halaman tidak ditemukan.'}
            actionLabel="Kembali ke Peta"
            onAction={() => setActivePage('peta')}
          />
        </Card>
      </div>
    );
  };

  return (
    <AppShell
      user={auth.user}
      activePage={activePage}
      onNavigate={(page) => {
        setActivePage(page);
        if (page !== 'peta') setSearchQuery('');
      }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onLogout={auth.logout}
    >
      {/* Banner tipis saat server tidak terhubung (02_UI_SPEC.md bagian 9) */}
      {!sim.connected && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--warn-soft)',
            color: 'var(--warn)',
            borderBottom: '1px solid rgba(217, 119, 6, 0.25)',
          }}
          className="absolute inset-x-0 top-0 z-40 flex items-center justify-center gap-2 px-4 py-1.5 text-[13px] font-medium"
        >
          <WifiOff size={15} strokeWidth={1.75} />
          <span>Tidak terhubung ke simulasi. Mencoba menyambung kembali...</span>
        </div>
      )}

      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center p-6">
            <div className="type-caption">Memuat halaman...</div>
          </div>
        }
      >
        {renderPage()}
      </Suspense>

      {/* Toast global untuk halaman non-Peta (mis. halaman Pengguna) */}
      {activePage !== 'peta' && (
        <ToastStack toasts={sim.toasts} onDismiss={sim.dismissToast} />
      )}
    </AppShell>
  );
}
