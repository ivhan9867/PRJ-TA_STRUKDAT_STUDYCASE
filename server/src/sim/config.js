/**
 * Parameter terpusat mesin simulasi Simpul Sehat.
 * Seluruh angka mengacu pada 03_ARSITEKTUR_DAN_STRUKTUR_DATA.md bagian 3.
 */
export const SIM_CONFIG = {
  // Waktu awal: Hari 1, 06.00 (360 menit sejak 00.00)
  startSimTime: 360,
  defaultSeed: 42,
  defaultSpeed: 1,
  broadcastIntervalMs: 250,

  // Kecepatan pergerakan di peta (piksel SVG per menit simulasi)
  ambulancePxPerMin: 80, // 60 km/jam (1 px = 0,0125 km)
  walkinPxPerMin: 55,

  // Laju kedatangan dasar pasien IGD per jam per kota
  baseIgdRatePerHour: {
    surya: 6,
    tirta: 5,
  },
  // Laju kedatangan pasien poli = 1,5x laju IGD
  poliRateMultiplier: 1.5,

  // Pengali laju kedatangan berdasarkan jam (0..23)
  hourlyMultiplier(hour) {
    if (hour <= 5) return 0.4;
    if (hour <= 10) return 1.0;
    if (hour <= 15) return 1.3;
    if (hour <= 20) return 1.1;
    return 0.7;
  },

  // Distribusi triase pasien IGD
  triageProbabilities: {
    ringan: 0.55,
    sedang: 0.33,
    gawat: 0.12,
  },

  // Durasi layanan IGD (menit simulasi, seragam)
  igdDurationMin: {
    ringan: [15, 30],
    sedang: [30, 60],
    gawat: [45, 90],
  },

  // Durasi layanan poli (menit simulasi, seragam)
  poliDurationMin: [10, 25],

  // Probabilitas hasil setelah selesai IGD: { pulang, inap, icu }
  postIgdOutcome: {
    ringan: { pulang: 0.95, inap: 0.05, icu: 0.0 },
    sedang: { pulang: 0.55, inap: 0.45, icu: 0.0 },
    gawat: { pulang: 0.0, inap: 0.4, icu: 0.6 },
  },

  // Lama rawat inap & ICU (menit simulasi: 8 sampai 30 jam, dikalibrasi agar baseline 24 jam stabil)
  stayDurationMin: {
    inap: [480, 1800],
    icu: [480, 1800],
  },

  // Keadaan awal tempat tidur terisi (35% - 48%)
  initialOccupancyRange: [0.35, 0.48],

  // Batas maksimal log per RS (LinkedList) dan log global
  maxHospitalLog: 200,
  maxGlobalLog: 300,

  // Skenario (dikalibrasi agar wabah membuat RS kota merah < 4 jam & memicu rujukan lintas jembatan)
  outbreakMultiplier: 6,
  outbreakDurationMin: 360, // 6 jam simulasi
  massCasualtyCount: 12,
};

export const TRIAGE_RANK = {
  gawat: 0,
  sedang: 1,
  ringan: 2,
};

export function formatSimTime(simTime) {
  const safe = Math.max(0, Math.floor(simTime));
  const day = Math.floor(safe / 1440) + 1;
  const rem = safe % 1440;
  const hour = String(Math.floor(rem / 60)).padStart(2, '0');
  const minute = String(rem % 60).padStart(2, '0');
  return `Hari ${day}, ${hour}.${minute}`;
}

export function getSimDay(simTime) {
  return Math.floor(Math.max(0, simTime) / 1440) + 1;
}
