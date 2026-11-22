import worldSeed from '@shared/world.seed.json';

/**
 * Menghitung status rumah sakit sesuai aturan 01_DESIGN_SYSTEM.md bagian 2:
 * max(rasio tempat tidur gabungan, rasio antrean IGD)
 * < 60% = ok (Lega), 60-85% = warn (Hampir penuh), > 85% = danger (Penuh)
 */
export function computeHospitalStatus({ inapUsed, inapTotal, icuUsed, icuTotal, igdQueueCount, igdDoctors }) {
  const totalBeds = inapTotal + icuTotal;
  const usedBeds = inapUsed + icuUsed;
  const bedRatio = totalBeds > 0 ? usedBeds / totalBeds : 0;
  const igdRatio = igdDoctors > 0 ? igdQueueCount / (2 * igdDoctors) : 0;
  const maxRatio = Math.max(bedRatio, igdRatio);

  let status = 'ok';
  if (maxRatio > 0.85) status = 'danger';
  else if (maxRatio >= 0.6) status = 'warn';

  return {
    status,
    occupancyPct: Math.round(maxRatio * 100),
    bedPct: Math.round(bedRatio * 100),
  };
}

/**
 * Data tiruan Fase 1 untuk menampilkan tampilan penuh halaman Peta
 * sebelum mesin simulasi real-time dipasang di Fase 3.
 */
const MOCK_SNAPSHOT = {
  rs_surya_utama: {
    inapUsed: 25,
    icuUsed: 5,
    igdBusy: 3,
    ambFree: 2,
    queue: [
      { code: 'P-0118', triage: 'sedang', waitMin: 12 },
      { code: 'P-0121', triage: 'ringan', waitMin: 8 },
    ],
    events: [
      { id: 'ev1', simTime: 'Hari 1, 08.15', message: 'Pasien P-0102 selesai dirawat dan pulang dari RS Surya Utama.' },
      { id: 'ev2', simTime: 'Hari 1, 07.50', message: 'Ambulans tiba di RS Surya Utama. Pasien masuk antrean IGD.' },
      { id: 'ev3', simTime: 'Hari 1, 07.20', message: 'Pasien P-0098 dirawat inap di RS Surya Utama.' },
    ],
  },
  rs_surya_timur: {
    inapUsed: 12,
    icuUsed: 2,
    igdBusy: 2,
    ambFree: 1,
    queue: [
      { code: 'P-0124', triage: 'ringan', waitMin: 5 },
    ],
    events: [
      { id: 'ev4', simTime: 'Hari 1, 08.10', message: 'Pasien P-0110 selesai dirawat dan pulang dari RS Surya Timur.' },
    ],
  },
  rs_surya_barat: {
    inapUsed: 8,
    icuUsed: 0,
    igdBusy: 2,
    ambFree: 1,
    queue: [
      { code: 'P-0115', triage: 'sedang', waitMin: 19 },
      { code: 'P-0120', triage: 'ringan', waitMin: 11 },
      { code: 'P-0125', triage: 'ringan', waitMin: 4 },
    ],
    events: [
      { id: 'ev5', simTime: 'Hari 1, 08.05', message: 'Pasien P-0112 dirawat inap di RS Surya Barat.' },
    ],
  },
  rs_tirta_raya: {
    inapUsed: 49,
    icuUsed: 9,
    igdBusy: 6,
    ambFree: 1,
    queue: [
      { code: 'P-0109', triage: 'gawat', waitMin: 14 },
      { code: 'P-0114', triage: 'gawat', waitMin: 9 },
      { code: 'P-0111', triage: 'sedang', waitMin: 26 },
      { code: 'P-0116', triage: 'sedang', waitMin: 18 },
      { code: 'P-0119', triage: 'ringan', waitMin: 22 },
      { code: 'P-0122', triage: 'ringan', waitMin: 15 },
      { code: 'P-0126', triage: 'ringan', waitMin: 6 },
    ],
    events: [
      { id: 'ev6', simTime: 'Hari 1, 08.18', message: 'RS Tirta Raya penuh. Pasien baru akan dirujuk ke RS lain.' },
      { id: 'ev7', simTime: 'Hari 1, 08.12', message: 'Pasien Gawat dirujuk dari RS Tirta Raya ke RS Surya Utama (±14 menit).' },
      { id: 'ev8', simTime: 'Hari 1, 07.55', message: 'Pasien P-0104 masuk ICU RS Tirta Raya.' },
      { id: 'ev9', simTime: 'Hari 1, 07.30', message: 'Pasien P-0101 dirawat inap di RS Tirta Raya.' },
    ],
  },
  rs_tirta_utara: {
    inapUsed: 5,
    icuUsed: 0,
    igdBusy: 1,
    ambFree: 1,
    queue: [],
    events: [
      { id: 'ev10', simTime: 'Hari 1, 07.45', message: 'Pasien P-0095 selesai dirawat dan pulang dari RS Tirta Utara.' },
    ],
  },
  rs_tirta_selatan: {
    inapUsed: 21,
    icuUsed: 4,
    igdBusy: 3,
    ambFree: 1,
    queue: [
      { code: 'P-0117', triage: 'sedang', waitMin: 16 },
      { code: 'P-0123', triage: 'ringan', waitMin: 7 },
    ],
    events: [
      { id: 'ev11', simTime: 'Hari 1, 08.02', message: 'Pasien P-0107 dirawat inap di RS Tirta Selatan.' },
      { id: 'ev12', simTime: 'Hari 1, 07.40', message: 'Pasien P-0099 selesai dirawat dan pulang dari RS Tirta Selatan.' },
    ],
  },
};

export function createMockWorldState() {
  const nodeMap = new Map(worldSeed.nodes.map((n) => [n.id, n]));

  const hospitals = worldSeed.hospitals.map((rs) => {
    const snap = MOCK_SNAPSHOT[rs.id];
    const node = nodeMap.get(rs.id);
    const computed = computeHospitalStatus({
      inapUsed: snap.inapUsed,
      inapTotal: rs.bedsInap,
      icuUsed: snap.icuUsed,
      icuTotal: rs.bedsIcu,
      igdQueueCount: snap.queue.length,
      igdDoctors: rs.igdDoctors,
    });

    return {
      ...rs,
      x: node.x,
      y: node.y,
      inap: { used: snap.inapUsed, total: rs.bedsInap },
      icu: { used: snap.icuUsed, total: rs.bedsIcu },
      igdQueue: snap.queue.length,
      igdBusy: snap.igdBusy,
      ambFree: snap.ambFree,
      queue: snap.queue,
      events: snap.events,
      ...computed,
    };
  });

  const totalIgdQueue = hospitals.reduce((acc, h) => acc + h.igdQueue, 0);
  const totalBedsUsed = hospitals.reduce((acc, h) => acc + h.inap.used + h.icu.used, 0);
  const totalBedsCap = hospitals.reduce((acc, h) => acc + h.inap.total + h.icu.total, 0);

  return {
    cities: worldSeed.cities,
    nodes: worldSeed.nodes,
    edges: worldSeed.edges.map((e) => ({ ...e, closed: false })),
    hospitals,
    kpi: {
      totalIgdQueue,
      bedPct: Math.round((totalBedsUsed / totalBedsCap) * 100),
      referralsToday: 3,
    },
  };
}
