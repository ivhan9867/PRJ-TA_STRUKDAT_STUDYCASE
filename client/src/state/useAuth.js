import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'simpul_sehat_session';

/**
 * Hook manajemen sesi autentikasi client.
 * Menyimpan sesi di sessionStorage agar pengguna dapat menguji beberapa peran
 * secara bersamaan di tab browser berbeda (mis. Warga di Tab 1, Petugas di Tab 2).
 */
export function useAuth() {
  const [token, setToken] = useState(() => {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(null);

  const saveSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setError(null);
    try {
      if (nextToken) window.sessionStorage.setItem(STORAGE_KEY, nextToken);
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Abaikan jika sessionStorage tidak tersedia
    }
  }, []);

  // Verifikasi token tersimpan saat halaman dimuat ulang
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('expired'))))
      .then((data) => {
        if (!cancelled) {
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          saveSession(null, null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, saveSession]);

  const login = useCallback(
    async (email, password) => {
      setError(null);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || 'Email atau kata sandi salah. Periksa lagi atau pilih Daftar.';
        setError(msg);
        return false;
      }
      saveSession(data.token, data.user);
      return true;
    },
    [saveSession]
  );

  const register = useCallback(
    async ({ displayName, email, password }) => {
      setError(null);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Pendaftaran gagal. Periksa kembali data Anda.');
        return false;
      }
      saveSession(data.token, data.user);
      return true;
    },
    [saveSession]
  );

  const logout = useCallback(() => {
    saveSession(null, null);
  }, [saveSession]);

  return {
    user,
    token,
    loading,
    error,
    clearError: () => setError(null),
    login,
    register,
    logout,
  };
}
