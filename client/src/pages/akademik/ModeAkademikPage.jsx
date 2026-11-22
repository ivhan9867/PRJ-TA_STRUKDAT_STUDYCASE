import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  FlaskConical,
  Play,
  Download,
  RefreshCw,
  ArrowRight,
  Route,
  Database,
  Layers,
} from 'lucide-react';
import { Card, Button, Tabs, StatusBadge } from '../../design/index.js';
import { ACADEMIC_STRUCTURES } from './academicMetadata.js';

const MAIN_TABS = [
  { id: 'ds', label: 'Struktur data' },
  { id: 'exp', label: 'Eksperimen' },
];

const TRIAGE_ORDER = { gawat: 0, sedang: 1, ringan: 2 };

/**
 * Halaman Mode Akademik (02_UI_SPEC.md bagian 8, dapat dibuka semua peran dari menu profil).
 * Tab 1: Visualisasi interaktif & operasi uji 7 struktur data + bacaan langsung dari simulasi.
 * Tab 2: Eksperimen A/B (dengan vs tanpa rujukan otomatis) + Benchmark + Unduh CSV.
 */
export function ModeAkademikPage({ token, hospitals }) {
  const [activeTab, setActiveTab] = useState('ds');
  const [selectedDs, setSelectedDs] = useState('stack');
  const [liveData, setLiveData] = useState(null);

  // State sandbox uji interaktif per struktur data
  const [stackItems, setStackItems] = useState(['Tutup Jembatan Utara', 'Nonaktifkan rujukan otomatis']);
  const [queueItems, setQueueItems] = useState(['P-0101', 'P-0102', 'P-0103']);
  const [pqItems, setPqItems] = useState([
    { code: 'P-0201', triage: 'gawat' },
    { code: 'P-0202', triage: 'sedang' },
    { code: 'P-0203', triage: 'ringan' },
  ]);
  const [llItems, setLlItems] = useState(['Terdaftar', 'Layanan IGD', 'Dirujuk']);
  const [opLogs, setOpLogs] = useState([]);
  const [treeTraversalOrder, setTreeTraversalOrder] = useState([]);

  // Graph query state (menjalankan Dijkstra, BFS, allSimplePaths di server)
  const [graphFrom, setGraphFrom] = useState('rs_tirta_raya');
  const [graphTo, setGraphTo] = useState('rs_surya_utama');
  const [graphResult, setGraphResult] = useState(null);

  // Eksperimen A/B & Benchmark state
  const [scenario, setScenario] = useState('wabah');
  const [days, setDays] = useState(2);
  const [runs, setRuns] = useState(3);
  const [expLoading, setExpLoading] = useState(false);
  const [expResult, setExpResult] = useState(null);
  const [benchLoading, setBenchLoading] = useState(false);
  const [benchResult, setBenchResult] = useState(null);

  const appendLog = (text) => {
    setOpLogs((prev) => [`${new Date().toLocaleTimeString('id-ID')} — ${text}`, ...prev].slice(0, 8));
  };

  const fetchLive = useCallback(async () => {
    const res = await fetch('/api/academic/live', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLiveData(await res.json());
  }, [token]);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  const runGraphQuery = async () => {
    const res = await fetch('/api/academic/graph-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fromId: graphFrom, toId: graphTo }),
    });
    if (res.ok) {
      const data = await res.json();
      setGraphResult(data);
      appendLog(
        data.dijkstra.found
          ? `dijkstra('${graphFrom}', '${graphTo}') → ${data.dijkstra.distanceMin} menit (${data.bfs.hops} lompatan, ${data.allPaths.length} rute alternatif)`
          : `dijkstra('${graphFrom}', '${graphTo}') → tidak ada rute`
      );
    }
  };

  const runExperiment = async () => {
    setExpLoading(true);
    try {
      const res = await fetch('/api/academic/experiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scenario, days, runs }),
      });
      if (res.ok) setExpResult(await res.json());
    } finally {
      setExpLoading(false);
    }
  };

  const runBenchmark = async () => {
    setBenchLoading(true);
    try {
      const res = await fetch('/api/academic/benchmark', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBenchResult(await res.json());
    } finally {
      setBenchLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!expResult) return;
    const headers = [
      'seed',
      'kebijakan',
      'waktu_tunggu_rata_menit',
      'waktu_tunggu_gawat_menit',
      'keterisian_puncak_persen',
      'jumlah_rujukan',
      'pasien_belum_bisa_dirujuk',
      'rata_waktu_rujukan_menit',
    ];
    const lines = [headers.join(',')];
    for (const row of expResult.perSeed) {
      for (const [label, m] of [
        ['Rujukan otomatis Aktif', row.active],
        ['Rujukan otomatis Nonaktif', row.inactive],
      ]) {
        lines.push(
          [
            row.seed,
            `"${label}"`,
            m.waitAvg,
            m.waitGawatAvg,
            m.peakBedPct,
            m.referralsTotal,
            m.unreachableTotal,
            m.referralDurationAvg,
          ].join(',')
        );
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eksperimen_${expResult.scenario}_${expResult.days}hari_${expResult.runs}seed.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentMeta = ACADEMIC_STRUCTURES.find((s) => s.id === selectedDs) || ACADEMIC_STRUCTURES[0];

  const runTreeTraversal = (mode) => {
    const nodes = liveData?.regionTree || [];
    if (nodes.length === 0) return;
    const byId = new Map(nodes.map((n) => [n.id, { ...n, children: [] }]));
    let root = null;
    for (const n of byId.values()) {
      if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId).children.push(n);
      else root = n;
    }
    const visited = [];
    if (mode === 'preorder') {
      const walk = (n) => {
        visited.push(n.name);
        n.children.forEach(walk);
      };
      if (root) walk(root);
    } else if (mode === 'postorder') {
      const walk = (n) => {
        n.children.forEach(walk);
        visited.push(n.name);
      };
      if (root) walk(root);
    } else {
      const q = root ? [root] : [];
      while (q.length) {
        const curr = q.shift();
        visited.push(curr.name);
        curr.children.forEach((c) => q.push(c));
      }
    }
    setTreeTraversalOrder(visited);
    appendLog(`${mode}() mengunjungi ${visited.length} simpul`);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Banner info Mode Akademik */}
        <div
          style={{
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--accent-ink)',
            borderRadius: 'var(--radius-inner)',
          }}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px] font-medium"
        >
          <div className="flex items-center gap-2.5">
            <FlaskConical size={18} strokeWidth={1.75} />
            <span>
              Halaman ini untuk penilaian proyek. Data uji interaktif dibuat dari contoh uji,
              sedangkan bagian bertanda langsung dibaca dari mesin simulasi server.
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchLive}>
            <RefreshCw size={14} strokeWidth={1.75} />
            Segarkan data langsung
          </Button>
        </div>

        <Tabs items={MAIN_TABS} activeId={activeTab} onChange={setActiveTab} />

        {/* ==================== TAB 1: STRUKTUR DATA ==================== */}
        {activeTab === 'ds' && (
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            {/* Daftar 7 struktur data */}
            <Card className="h-fit space-y-1 p-3" padding={false}>
              {ACADEMIC_STRUCTURES.map((item) => {
                const active = item.id === selectedDs;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedDs(item.id)}
                    style={{
                      borderRadius: 'var(--radius-btn)',
                      backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                      color: active ? 'var(--accent-ink)' : 'var(--text)',
                    }}
                    className="focus-ring flex w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-left text-[14px] font-semibold hover:bg-[var(--surface-2)]"
                  >
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </Card>

            {/* Panel detail struktur terpilih */}
            <div className="space-y-5">
              <Card>
                <h1 className="type-h1">{currentMeta.name}</h1>
                <div className="mt-3 space-y-1.5 text-[14px]">
                  <p>
                    <span className="font-semibold">Fungsi di aplikasi: </span>
                    <span style={{ color: 'var(--text-muted)' }}>{currentMeta.role}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Alasan dipilih: </span>
                    <span style={{ color: 'var(--text-muted)' }}>{currentMeta.reason}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Kelebihan dan keterbatasan: </span>
                    <span style={{ color: 'var(--text-muted)' }}>{currentMeta.tradeoff}</span>
                  </p>
                </div>

                {/* Tabel kompleksitas */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th className="py-2 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                          Operasi
                        </th>
                        <th className="py-2 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                          Kompleksitas
                        </th>
                        <th className="py-2 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                          Keterangan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMeta.ops.map((row) => (
                        <tr key={row.op} style={{ borderBottom: '1px solid var(--border)', height: '40px' }}>
                          <td className="font-mono text-[12px] font-semibold">{row.op}</td>
                          <td className="font-mono text-[12px]" style={{ color: 'var(--accent)' }}>
                            {row.time}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Visualisasi & operasi uji interaktif */}
              <Card>
                <h2 className="type-h2 mb-3">Visualisasi dan operasi uji</h2>

                {selectedDs === 'stack' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const label = `Aksi manual #${stackItems.length + 1}`;
                          setStackItems((s) => [...s, label]);
                          appendLog(`push('${label}') → ukuran: ${stackItems.length + 1}`);
                        }}
                      >
                        Push
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={stackItems.length === 0}
                        onClick={() => {
                          const top = stackItems[stackItems.length - 1];
                          setStackItems((s) => s.slice(0, -1));
                          appendLog(`pop() → '${top}', sisa: ${stackItems.length - 1}`);
                        }}
                      >
                        Pop
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          appendLog(`peek() → '${stackItems[stackItems.length - 1] || 'kosong'}'`)
                        }
                      >
                        Peek
                      </Button>
                    </div>

                    <div className="flex flex-col-reverse gap-2 max-w-sm">
                      {stackItems.length === 0 ? (
                        <p className="type-caption">Stack kosong.</p>
                      ) : (
                        stackItems.map((it, idx) => (
                          <div
                            key={`${it}_${idx}`}
                            style={{
                              backgroundColor: idx === stackItems.length - 1 ? 'var(--accent-soft)' : 'var(--surface-2)',
                              border: idx === stackItems.length - 1 ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                              borderRadius: 'var(--radius-btn)',
                            }}
                            className="flex items-center justify-between px-3.5 py-2 text-[13px] font-medium"
                          >
                            <span>{it}</span>
                            {idx === stackItems.length - 1 && (
                              <span className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                                Puncak
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {liveData && (
                      <Card variant="inner">
                        <div className="type-caption mb-1">Langsung dari simulasi (Stack Undo Dinkes):</div>
                        <div className="text-[13px]">
                          {liveData.undoStackDinkes?.length
                            ? liveData.undoStackDinkes.join(' → ')
                            : 'Belum ada aksi manual di stack simulasi.'}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {selectedDs === 'queue' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const code = `P-0${101 + queueItems.length + Math.floor(Math.random() * 50)}`;
                          setQueueItems((q) => [...q, code]);
                          appendLog(`enqueue('${code}') → ukuran: ${queueItems.length + 1}`);
                        }}
                      >
                        Enqueue
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={queueItems.length === 0}
                        onClick={() => {
                          const head = queueItems[0];
                          setQueueItems((q) => q.slice(1));
                          appendLog(`dequeue() → '${head}', sisa: ${queueItems.length - 1}`);
                        }}
                      >
                        Dequeue
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => appendLog(`peek() → '${queueItems[0] || 'kosong'}'`)}
                      >
                        Peek
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {queueItems.map((q, idx) => (
                        <div key={`${q}_${idx}`} className="flex items-center gap-2">
                          <div
                            style={{
                              backgroundColor: idx === 0 ? 'var(--accent-soft)' : 'var(--surface-2)',
                              border: idx === 0 ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                              borderRadius: 'var(--radius-btn)',
                            }}
                            className="tabular-nums px-3 py-2 text-[13px] font-semibold"
                          >
                            {q}
                            {idx === 0 && <span className="ml-1.5 text-[11px]">(Depan)</span>}
                          </div>
                          {idx < queueItems.length - 1 && <ArrowRight size={14} style={{ color: 'var(--text-faint)' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDs === 'pq' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {['gawat', 'sedang', 'ringan'].map((triage) => (
                        <Button
                          key={triage}
                          size="sm"
                          variant={triage === 'gawat' ? 'danger' : 'secondary'}
                          onClick={() => {
                            const code = `P-0${210 + pqItems.length}`;
                            const next = [...pqItems, { code, triage }].sort(
                              (a, b) => TRIAGE_ORDER[a.triage] - TRIAGE_ORDER[b.triage]
                            );
                            setPqItems(next);
                            appendLog(`push(${code}, ${triage}) → puncak: ${next[0].code}`);
                          }}
                        >
                          Push {triage}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        disabled={pqItems.length === 0}
                        onClick={() => {
                          const top = pqItems[0];
                          setPqItems((arr) => arr.slice(1));
                          appendLog(`pop() → ${top.code} (${top.triage})`);
                        }}
                      >
                        Pop prioritas tertinggi
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {pqItems.map((p, idx) => (
                        <div
                          key={`${p.code}_${idx}`}
                          style={{
                            backgroundColor: 'var(--surface-2)',
                            border: idx === 0 ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                            borderRadius: 'var(--radius-btn)',
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-[13px]"
                        >
                          <span className="tabular-nums font-semibold">{p.code}</span>
                          <StatusBadge status={p.triage} />
                        </div>
                      ))}
                    </div>

                    {liveData?.sampleHospital && (
                      <Card variant="inner">
                        <div className="type-caption mb-1.5">
                          Langsung dari simulasi — Binary Min-Heap IGD {liveData.sampleHospital.name}:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {liveData.sampleHospital.igdHeap.length > 0 ? (
                            liveData.sampleHospital.igdHeap.map((item, i) => (
                              <span
                                key={`${item.code}_${i}`}
                                className="tabular-nums rounded-lg bg-white px-2.5 py-1 text-[12px] font-medium"
                                style={{ border: '1px solid var(--border)' }}
                              >
                                [{i}] {item.code} ({item.triage})
                              </span>
                            ))
                          ) : (
                            <span className="type-caption">Antrean IGD sedang kosong.</span>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {selectedDs === 'linkedlist' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const label = `Tahap ${llItems.length + 1}`;
                          setLlItems((l) => [...l, label]);
                          appendLog(`append('${label}') → tail baru`);
                        }}
                      >
                        Append (ekor)
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const label = `Awal #${llItems.length + 1}`;
                          setLlItems((l) => [label, ...l]);
                          appendLog(`prepend('${label}') → head baru O(1)`);
                        }}
                      >
                        Prepend (kepala)
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={llItems.length === 0}
                        onClick={() => {
                          const first = llItems[0];
                          setLlItems((l) => l.slice(1));
                          appendLog(`removeFirst() → '${first}' O(1)`);
                        }}
                      >
                        Hapus awal
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {llItems.map((val, idx) => (
                        <div key={`${val}_${idx}`} className="flex items-center gap-2">
                          <div
                            style={{
                              backgroundColor: 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-btn)',
                            }}
                            className="px-3 py-2 text-[13px] font-medium"
                          >
                            {val}
                          </div>
                          <ArrowRight size={14} style={{ color: 'var(--accent)' }} />
                        </div>
                      ))}
                      <span className="font-mono text-[12px]" style={{ color: 'var(--text-faint)' }}>
                        null
                      </span>
                    </div>

                    {liveData?.sampleJourney && (
                      <Card variant="inner">
                        <div className="type-caption mb-1">
                          Langsung dari simulasi — LinkedList perjalanan pasien {liveData.sampleJourney.code}:
                        </div>
                        <div className="text-[13px]">
                          {liveData.sampleJourney.journey
                            .map((s) => `${s.stageLabel} (${s.hospitalName})`)
                            .join(' → ')}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {selectedDs === 'tree' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => runTreeTraversal('preorder')}>
                        Preorder
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => runTreeTraversal('postorder')}>
                        Postorder
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => runTreeTraversal('levelOrder')}>
                        Level order
                      </Button>
                    </div>

                    {liveData?.regionAggregation && (
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {(['wilayah', 'surya', 'tirta']).map((key) => {
                          const agg = liveData.regionAggregation[key];
                          return (
                            <Card key={key} variant="inner">
                              <div className="type-caption">
                                Agregasi rekursif: {key === 'wilayah' ? 'Seluruh wilayah' : `Kota ${key === 'surya' ? 'Surya' : 'Tirta'}`}
                              </div>
                              <div className="mt-1 tabular-nums text-[14px] font-semibold">
                                {agg.bedsUsed}/{agg.bedsTotal} tempat tidur, {agg.igdQueue} antrean IGD
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {treeTraversalOrder.length > 0 && (
                      <Card variant="inner">
                        <div className="type-caption mb-1.5">Urutan kunjungan traversal:</div>
                        <div className="flex flex-wrap gap-1.5 text-[12px]">
                          {treeTraversalOrder.slice(0, 18).map((name, i) => (
                            <span
                              key={`${name}_${i}`}
                              className="rounded-lg bg-white px-2 py-1 font-medium"
                              style={{ border: '1px solid var(--border)' }}
                            >
                              {i + 1}. {name}
                            </span>
                          ))}
                          {treeTraversalOrder.length > 18 && (
                            <span className="type-caption self-center">
                              +{treeTraversalOrder.length - 18} simpul lainnya
                            </span>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {selectedDs === 'graph' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={graphFrom}
                        onChange={(e) => setGraphFrom(e.target.value)}
                        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)' }}
                        className="h-9 px-3 text-[13px]"
                      >
                        {hospitals.map((rs) => (
                          <option key={rs.id} value={rs.id}>{rs.name}</option>
                        ))}
                      </select>
                      <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                      <select
                        value={graphTo}
                        onChange={(e) => setGraphTo(e.target.value)}
                        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)' }}
                        className="h-9 px-3 text-[13px]"
                      >
                        {hospitals.map((rs) => (
                          <option key={rs.id} value={rs.id}>{rs.name}</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={runGraphQuery}>
                        <Route size={14} strokeWidth={1.75} />
                        Cari rute tercepat dan semua rute
                      </Button>
                    </div>

                    {graphResult && (
                      <div className="space-y-2.5">
                        <Card variant="inner">
                          <div className="text-[13px] font-semibold">
                            Dijkstra (rute tercepat):{' '}
                            {graphResult.dijkstra.found
                              ? `±${graphResult.dijkstra.distanceMin} menit`
                              : 'Tidak ada rute'}
                          </div>
                          {graphResult.dijkstra.found && (
                            <div className="type-caption mt-1 font-mono">
                              {graphResult.dijkstra.path.join(' → ')}
                            </div>
                          )}
                        </Card>

                        <Card variant="inner">
                          <div className="text-[13px] font-semibold">
                            BFS (lompatan minimum):{' '}
                            {graphResult.bfs.found ? `${graphResult.bfs.hops} lompatan` : 'Tidak terjangkau'}
                          </div>
                          {graphResult.bfs.found && (
                            <div className="type-caption mt-1 font-mono">
                              {graphResult.bfs.path.join(' → ')}
                            </div>
                          )}
                        </Card>

                        <Card variant="inner">
                          <div className="text-[13px] font-semibold">
                            Rekursif allSimplePaths ({graphResult.allPaths.length} rute alternatif ditampilkan):
                          </div>
                          <div className="mt-1.5 space-y-1 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {graphResult.allPaths.length > 0 ? (
                              graphResult.allPaths.map((p, i) => <div key={i}>{i + 1}. {p.join(' → ')}</div>)
                            ) : (
                              <div>Tidak ada rute sederhana tersedia.</div>
                            )}
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                )}

                {selectedDs === 'database' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[14px] font-semibold">
                      <Database size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                      <span>
                        Status koneksi: {liveData?.authMode === 'firebase' ? 'Firebase Auth & Firestore aktif' : 'Mode pengujian lokal (siap sambung Firebase via .env)'}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Card variant="inner">
                        <div className="type-caption mb-1.5">Koleksi Firestore & contoh dokumen users (email disamarkan):</div>
                        <div className="space-y-1 font-mono text-[12px]">
                          {(liveData?.maskedUsers || []).map((u) => (
                            <div key={u.uid}>
                              {u.emailMasked} — role: {u.role}
                            </div>
                          ))}
                        </div>
                      </Card>
                      <Card variant="inner">
                        <div className="type-caption mb-1.5">Ringkasan aturan keamanan (firestore.rules):</div>
                        <ul className="list-disc space-y-1 pl-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          <li>Daftar akun baru wajib peran Warga tanpa RS.</li>
                          <li>Hanya Dinkes dapat mengubah peran akun lain (bukan diri sendiri).</li>
                          <li>Koleksi hospitals, events, runs hanya boleh ditulis server.</li>
                        </ul>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Log operasi uji */}
                {opLogs.length > 0 && (
                  <div className="mt-5 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="type-caption mb-1.5">Log operasi uji:</div>
                    <div className="space-y-1 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {opLogs.map((l, i) => (
                        <div key={i}>{l}</div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: EKSPERIMEN A/B & BENCHMARK ==================== */}
        {activeTab === 'exp' && (
          <div className="space-y-5">
            <Card>
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                {/* Pengaturan eksperimen */}
                <div className="space-y-4">
                  <div>
                    <h2 className="type-h2">Eksperimen A/B</h2>
                    <p className="type-caption mt-0.5">
                      Bandingkan Rujukan otomatis Aktif vs Nonaktif pada seed yang sama.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium">Skenario</label>
                    <select
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                      style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)' }}
                      className="h-10 w-full px-3 text-[13px]"
                    >
                      <option value="normal">Normal</option>
                      <option value="wabah">Wabah di Kota Tirta</option>
                      <option value="jembatan_tutup">Wabah + Jembatan Utara tutup</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-[13px] font-medium">Lama (hari)</label>
                      <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)' }}
                        className="h-10 w-full px-3 text-[13px]"
                      >
                        <option value={1}>1 hari</option>
                        <option value={2}>2 hari</option>
                        <option value={3}>3 hari</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium">Ulangan (seed)</label>
                      <select
                        value={runs}
                        onChange={(e) => setRuns(Number(e.target.value))}
                        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)' }}
                        className="h-10 w-full px-3 text-[13px]"
                      >
                        <option value={3}>3 seed</option>
                        <option value={5}>5 seed</option>
                      </select>
                    </div>
                  </div>

                  <Button className="w-full" disabled={expLoading} onClick={runExperiment}>
                    <Play size={15} strokeWidth={1.75} />
                    {expLoading ? 'Menjalankan eksperimen...' : 'Jalankan eksperimen'}
                  </Button>
                </div>

                {/* Hasil eksperimen */}
                <div>
                  {!expResult ? (
                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
                      <Layers size={30} strokeWidth={1.75} style={{ color: 'var(--neutral)' }} />
                      <p className="type-caption mt-2">
                        Pilih skenario lalu klik Jalankan eksperimen untuk melihat perbandingan metrik.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[15px] font-semibold">
                            Hasil {expResult.runs} ulangan ({expResult.days} hari simulasi)
                          </div>
                          <div className="type-caption">Rata-rata ± simpangan baku dari seed 1 sampai {expResult.runs}</div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={downloadCsv}>
                          <Download size={14} strokeWidth={1.75} />
                          Unduh CSV
                        </Button>
                      </div>

                      <table className="w-full border-collapse text-[13px]">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className="py-2 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Metrik</th>
                            <th className="py-2 text-right font-semibold" style={{ color: 'var(--accent)' }}>Rujukan Aktif</th>
                            <th className="py-2 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>Rujukan Nonaktif</th>
                          </tr>
                        </thead>
                        <tbody className="tabular-nums">
                          {[
                            ['Waktu tunggu rata-rata IGD (menit)', 'waitAvg'],
                            ['Waktu tunggu pasien gawat (menit)', 'waitGawatAvg'],
                            ['Keterisian puncak (%)', 'peakBedPct'],
                            ['Pasien berhasil dirujuk', 'referralsTotal'],
                            ['Pasien belum bisa dirujuk', 'unreachableTotal'],
                            ['Rata-rata waktu rujukan (menit)', 'referralDurationAvg'],
                          ].map(([label, key]) => (
                            <tr key={key} style={{ borderBottom: '1px solid var(--border)', height: '40px' }}>
                              <td>{label}</td>
                              <td className="text-right font-semibold" style={{ color: 'var(--accent)' }}>
                                {expResult.summary.active[key].mean} ± {expResult.summary.active[key].sd}
                              </td>
                              <td className="text-right" style={{ color: 'var(--text-muted)' }}>
                                {expResult.summary.inactive[key].mean} ± {expResult.summary.inactive[key].sd}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              {
                                name: 'Tunggu rata-rata',
                                Aktif: expResult.summary.active.waitAvg.mean,
                                Nonaktif: expResult.summary.inactive.waitAvg.mean,
                              },
                              {
                                name: 'Tunggu gawat',
                                Aktif: expResult.summary.active.waitGawatAvg.mean,
                                Nonaktif: expResult.summary.inactive.waitGawatAvg.mean,
                              },
                              {
                                name: 'Keterisian puncak',
                                Aktif: expResult.summary.active.peakBedPct.mean,
                                Nonaktif: expResult.summary.inactive.peakBedPct.mean,
                              },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Aktif" fill="#2563EB" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="Nonaktif" fill="#94A3B8" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Benchmark struktur data */}
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="type-h2">Benchmark struktur data</h2>
                  <p className="type-caption">
                    Perbandingan efisiensi empiris LinkedList vs Array dan Dijkstra Heap vs Linear (CPMK-1).
                  </p>
                </div>
                <Button variant="secondary" disabled={benchLoading} onClick={runBenchmark}>
                  <Play size={14} strokeWidth={1.75} />
                  {benchLoading ? 'Mengukur waktu...' : 'Jalankan benchmark'}
                </Button>
              </div>

              {benchResult && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th className="py-2 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Operasi</th>
                        <th className="py-2 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>Ukuran n</th>
                        <th className="py-2 text-right font-semibold" style={{ color: 'var(--accent)' }}>Struktur efisien (ms)</th>
                        <th className="py-2 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>Pembanding (ms)</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {benchResult.rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)', height: '42px' }}>
                          <td className="font-medium">{r.group}</td>
                          <td className="text-right">{r.n.toLocaleString('id-ID')}</td>
                          <td className="text-right font-semibold" style={{ color: 'var(--accent)' }}>
                            {r.fastMs} ms <span className="type-caption">({r.fastLabel})</span>
                          </td>
                          <td className="text-right" style={{ color: 'var(--text-muted)' }}>
                            {r.slowMs} ms <span className="type-caption">({r.slowLabel})</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
