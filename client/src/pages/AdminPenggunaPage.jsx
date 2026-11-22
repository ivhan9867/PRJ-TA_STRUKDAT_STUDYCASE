import { useCallback, useEffect, useState } from 'react';
import { Users, Check } from 'lucide-react';
import { ROLE_LABEL } from '@shared/constants.js';
import { Card, Button, EmptyState } from '../design/index.js';
import { IS_STATIC_MODE, localListUsers, localUpdateUserRole } from '../state/localEngineAdapter.js';

/**
 * Halaman Pengguna khusus Dinkes (02_UI_SPEC.md bagian 7).
 * Mengatur peran (Warga, Petugas RS, Dinkes) dan penugasan RS untuk Petugas RS.
 * Dinkes tidak bisa mengubah perannya sendiri.
 */
export function AdminPenggunaPage({ currentUser, token, hospitals, onToast }) {
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingUid, setSavingUid] = useState(null);
  const [error, setError] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (IS_STATIC_MODE) {
      const list = localListUsers();
      setUsers(list);
      const initial = {};
      for (const u of list) initial[u.uid] = { role: u.role, hospitalId: u.hospitalId || '' };
      setDrafts(initial);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat daftar pengguna.');
      setUsers(data.users || []);
      const initial = {};
      for (const u of data.users || []) {
        initial[u.uid] = { role: u.role, hospitalId: u.hospitalId || '' };
      }
      setDrafts(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSave = async (u) => {
    const draft = drafts[u.uid];
    if (!draft) return;
    setSavingUid(u.uid);
    try {
      if (IS_STATIC_MODE) {
        const result = localUpdateUserRole(currentUser, u.uid, {
          role: draft.role,
          hospitalId: draft.role === 'petugas' ? draft.hospitalId || null : null,
        });
        if (result.error) {
          onToast?.({ id: `err_${Date.now()}`, severity: 'danger', message: result.error });
          return;
        }
        setUsers((prev) => prev.map((item) => (item.uid === u.uid ? result.user : item)));
        onToast?.({
          id: `role_${Date.now()}`,
          severity: 'info',
          message: `Peran ${result.user.displayName} diubah menjadi ${ROLE_LABEL[result.user.role] || result.user.role}.`,
        });
        return;
      }
      const res = await fetch(`/api/users/${u.uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: draft.role,
          hospitalId: draft.role === 'petugas' ? draft.hospitalId || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast?.({
          id: `err_${Date.now()}`,
          severity: 'danger',
          message: data.error || 'Gagal menyimpan perubahan peran.',
        });
        return;
      }

      setUsers((prev) => prev.map((item) => (item.uid === u.uid ? data.user : item)));
      onToast?.({
        id: `role_${Date.now()}`,
        severity: 'info',
        message: `Peran ${data.user.displayName} diubah menjadi ${ROLE_LABEL[data.user.role] || data.user.role}.`,
      });
    } finally {
      setSavingUid(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="type-h1" style={{ color: 'var(--text)' }}>
            Pengguna
          </h1>
          <p className="type-caption mt-1">
            Atur peran akun dan penugasan rumah sakit untuk petugas.
          </p>
        </div>

        <Card>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl"
                  style={{ backgroundColor: 'var(--neutral-soft)' }}
                />
              ))}
            </div>
          ) : error ? (
            <EmptyState icon={Users} message={error} actionLabel="Muat ulang" onAction={loadUsers} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="py-3 pr-4 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Nama
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Email
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Peran
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Rumah sakit
                    </th>
                    <th className="py-3 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.uid === currentUser.uid;
                    const draft = drafts[u.uid] || { role: u.role, hospitalId: u.hospitalId || '' };
                    const isChanged =
                      draft.role !== u.role ||
                      (draft.role === 'petugas' ? draft.hospitalId || null : null) !== (u.hospitalId || null);

                    return (
                      <tr
                        key={u.uid}
                        style={{ borderBottom: '1px solid var(--border)', height: '56px' }}
                      >
                        <td className="py-2.5 pr-4 font-semibold" style={{ color: 'var(--text)' }}>
                          {u.displayName}
                          {isSelf && (
                            <span className="type-caption ml-2 font-normal">(Anda)</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4" style={{ color: 'var(--text-muted)' }}>
                          {u.email}
                        </td>
                        <td className="py-2.5 pr-4">
                          <select
                            aria-label={`Peran untuk ${u.displayName}`}
                            disabled={isSelf}
                            title={isSelf ? 'Anda tidak bisa mengubah peran sendiri' : undefined}
                            value={draft.role}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [u.uid]: {
                                  role: e.target.value,
                                  hospitalId:
                                    e.target.value === 'petugas'
                                      ? prev[u.uid]?.hospitalId || hospitals[0]?.id || ''
                                      : '',
                                },
                              }))
                            }
                            style={{
                              backgroundColor: isSelf ? 'var(--neutral-soft)' : 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-btn)',
                              color: isSelf ? 'var(--text-faint)' : 'var(--text)',
                            }}
                            className="focus-ring h-9 px-2.5 text-[13px] disabled:cursor-not-allowed"
                          >
                            <option value="warga">Warga</option>
                            <option value="petugas">Petugas RS</option>
                            <option value="dinkes">Dinkes</option>
                          </select>
                        </td>
                        <td className="py-2.5 pr-4">
                          <select
                            aria-label={`Rumah sakit untuk ${u.displayName}`}
                            disabled={isSelf || draft.role !== 'petugas'}
                            value={draft.role === 'petugas' ? draft.hospitalId : ''}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [u.uid]: { ...draft, hospitalId: e.target.value },
                              }))
                            }
                            style={{
                              backgroundColor:
                                isSelf || draft.role !== 'petugas'
                                  ? 'var(--neutral-soft)'
                                  : 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-btn)',
                              color:
                                isSelf || draft.role !== 'petugas'
                                  ? 'var(--text-faint)'
                                  : 'var(--text)',
                            }}
                            className="focus-ring h-9 px-2.5 text-[13px] disabled:cursor-not-allowed"
                          >
                            <option value="">Belum ditugaskan</option>
                            {hospitals.map((rs) => (
                              <option key={rs.id} value={rs.id}>
                                {rs.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 text-right">
                          <Button
                            variant={isChanged ? 'primary' : 'secondary'}
                            size="sm"
                            disabled={isSelf || !isChanged || savingUid === u.uid}
                            onClick={() => handleSave(u)}
                          >
                            <Check size={14} strokeWidth={2} />
                            {savingUid === u.uid ? 'Menyimpan...' : 'Simpan'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
