import { formatSimTime, getSimDay } from './config.js';

/**
 * Pengumpul metrik simulasi untuk KPI peta, halaman Analitik, dan Eksperimen A/B.
 * Menyimpan seri waktu keterisian tempat tidur per kota tiap 15 menit simulasi (maksimal 96 titik = 24 jam).
 */
export class SimulationMetrics {
  constructor(hospitalIds) {
    this.hospitalIds = hospitalIds;
    this.reset(1);
  }

  reset(startDay = 1) {
    this.currentDay = startDay;

    // Waktu tunggu IGD (menit simulasi)
    this.igdWaitSum = 0;
    this.igdWaitCount = 0;
    this.gawatWaitSum = 0;
    this.gawatWaitCount = 0;
    this.waitByHospital = new Map();
    for (const id of this.hospitalIds) {
      this.waitByHospital.set(id, { sum: 0, count: 0 });
    }

    // Rujukan & tidak ada rute
    this.referralsToday = 0;
    this.referralsTotal = 0;
    this.referralDurationSum = 0;
    this.referralDurationCount = 0;
    this.unreachableToday = 0;
    this.unreachableTotal = 0;

    // Keterisian puncak
    this.peakBedPct = 0;

    // Seri waktu keterisian tempat tidur tiap 15 menit (maks 96 titik)
    this.series = [];
  }

  checkDayRollover(simTime) {
    const day = getSimDay(simTime);
    if (day !== this.currentDay) {
      this.currentDay = day;
      this.referralsToday = 0;
      this.unreachableToday = 0;
    }
  }

  recordIgdWait(hospitalId, triage, waitMin) {
    const safeWait = Math.max(0, waitMin);
    this.igdWaitSum += safeWait;
    this.igdWaitCount += 1;

    if (triage === 'gawat') {
      this.gawatWaitSum += safeWait;
      this.gawatWaitCount += 1;
    }

    const entry = this.waitByHospital.get(hospitalId);
    if (entry) {
      entry.sum += safeWait;
      entry.count += 1;
    }
  }

  recordReferral(durationMin) {
    this.referralsToday += 1;
    this.referralsTotal += 1;
    if (Number.isFinite(durationMin)) {
      this.referralDurationSum += durationMin;
      this.referralDurationCount += 1;
    }
  }

  recordUnreachable() {
    this.unreachableToday += 1;
    this.unreachableTotal += 1;
  }

  recordBedSample(simTime, suryaPct, tirtaPct, totalPct) {
    if (totalPct > this.peakBedPct) {
      this.peakBedPct = totalPct;
    }
    this.series.push({
      simTime,
      label: formatSimTime(simTime),
      surya: suryaPct,
      tirta: tirtaPct,
      total: totalPct,
    });
    if (this.series.length > 96) {
      this.series.shift();
    }
  }

  getSummary(currentBedPct) {
    const waitAvg =
      this.igdWaitCount > 0 ? Math.round(this.igdWaitSum / this.igdWaitCount) : 0;
    const waitGawatAvg =
      this.gawatWaitCount > 0 ? Math.round(this.gawatWaitSum / this.gawatWaitCount) : 0;
    const referralDurationAvg =
      this.referralDurationCount > 0
        ? Math.round((this.referralDurationSum / this.referralDurationCount) * 10) / 10
        : 0;

    return {
      waitAvg,
      waitGawatAvg,
      bedPct: currentBedPct,
      peakBedPct: Math.max(this.peakBedPct, currentBedPct),
      referralsToday: this.referralsToday,
      referralsTotal: this.referralsTotal,
      unreachableToday: this.unreachableToday,
      unreachableTotal: this.unreachableTotal,
      referralDurationAvg,
    };
  }

  getHospitalWaitAverages() {
    const out = {};
    for (const [id, entry] of this.waitByHospital.entries()) {
      out[id] = entry.count > 0 ? Math.round(entry.sum / entry.count) : 0;
    }
    return out;
  }
}
