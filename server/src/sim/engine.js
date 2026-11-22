import {
  Queue,
  PriorityQueue,
  LinkedList,
  Tree,
  TreeNode,
  Graph,
  aggregate,
} from '../ds/index.js';
import {
  SIM_CONFIG,
  TRIAGE_RANK,
  formatSimTime,
  getSimDay,
} from './config.js';
import { createRng } from './rng.js';
import { SimulationMetrics } from './metrics.js';
import { UndoManager } from './undoManager.js';
import { generateCityHouses } from '../../../shared/cityHouses.js';

const TRIAGE_LABEL = {
  ringan: 'Ringan',
  sedang: 'Sedang',
  gawat: 'Gawat',
};

const SYNTHETIC_COMPLAINTS = {
  ringan: [
    'Demam ringan dan flu',
    'Batuk dan pilek',
    'Kontrol kesehatan rutin',
    'Pusing ringan',
    'Alergi kulit ringan',
  ],
  sedang: [
    'Demam tinggi mendadak',
    'Nyeri perut sedang',
    'Sesak napas sedang',
    'Cedera terkilir atau retak ringan',
    'Dehidrasi sedang',
  ],
  gawat: [
    'Sesak napas berat',
    'Nyeri dada akut',
    'Cedera kepala akibat kecelakaan',
    'Penurunan kesadaran',
    'Perdarahan serius',
  ],
};

const STAGE_LABEL = {
  terdaftar: 'Tiba dan terdaftar',
  layanan_igd: 'Ditangani dokter IGD',
  layanan_poli: 'Ditangani dokter Poli',
  dirujuk: 'Dirujuk dengan ambulans',
  tiba_rujukan: 'Tiba di RS rujukan',
  rawat_inap: 'Dirawat inap',
  icu: 'Dirawat di ICU',
  pulang: 'Selesai dirawat dan pulang',
};

/**
 * Mesin simulasi utama Simpul Sehat (satu-satunya pemilik state simulasi di server).
 * Menggunakan seluruh 7 struktur data secara nyata:
 * - Graph: jaringan jalan & 2 jembatan (Dijkstra untuk rute tercepat, BFS untuk lompatan)
 * - Tree + Rekursif: RegionTree (Wilayah -> Kota -> RS -> Unit) & agregasi kapasitas postorder
 * - PriorityQueue: EventScheduler global & antrean IGD berbasis triase per RS
 * - Queue: antrean Poli FIFO & antrean permintaan ambulans FIFO per RS
 * - LinkedList: PatientJourney, log kejadian per RS (maks 200), daftar ambulans siaga, pasien rawat inap
 * - Stack: UndoManager (siap dipakai untuk aksi manual di Fase 4)
 */
export class SimulationEngine {
  constructor(worldSeed, { seed = SIM_CONFIG.defaultSeed, onEvent = null } = {}) {
    this.seedData = worldSeed;
    this.initialSeed = seed;
    this.onEvent = onEvent;

    this.speed = SIM_CONFIG.defaultSpeed;
    this.paused = false;
    this.autoReferral = true;

    this.reset(seed);
  }

  reset(seed = this.initialSeed) {
    this.initialSeed = seed;
    this.rng = createRng(seed);
    this.simTime = SIM_CONFIG.startSimTime;
    this.seqCounter = 0;
    this.patientCounter = 0;
    this.eventLogCounter = 0;
    this.walkinCounter = 0;
    this.ambulanceSeq = 0;

    // Skenario wabah aktif per kota: cityId -> simTime berakhir
    this.outbreaks = new Map();

    // Penghitung kepadatan ambulans per edge: edgeId -> jumlah ambulans melintas
    this.edgeTraffic = new Map();

    // 1. Bangun Graph jaringan jalan & 2 jembatan
    this.graph = new Graph();
    for (const node of this.seedData.nodes) {
      this.graph.addNode(node.id, node);
    }
    for (const edge of this.seedData.edges) {
      const a = this.graph.getNode(edge.a);
      const b = this.graph.getNode(edge.b);
      const lengthPx = Math.hypot(b.x - a.x, b.y - a.y);
      const baseMinutes = lengthPx / SIM_CONFIG.ambulancePxPerMin;
      this.graph.addEdge(edge.id, edge.a, edge.b, baseMinutes, {
        ...edge,
        lengthPx,
        baseMinutes,
      });
      this.edgeTraffic.set(edge.id, 0);
    }

    // Daftar simpul persimpangan & rumah warga per kota untuk asal pasien berjalan
    this.junctionsByCity = new Map();
    this.housesByCity = new Map();
    const allHouses = generateCityHouses(this.seedData.nodes, this.seedData.edges);
    for (const city of this.seedData.cities) {
      this.junctionsByCity.set(
        city.id,
        this.seedData.nodes.filter((n) => n.city === city.id && n.kind === 'junction')
      );
      this.housesByCity.set(
        city.id,
        allHouses.filter((h) => h.city === city.id)
      );
    }

    // Registri pasien aktif/terakhir (dibatasi 500 agar memori stabil) untuk Detail Pasien
    this.patientRegistry = new Map();
    // Tiket antrean aktif milik pengguna Warga (uid -> { patientCode, hospitalId, unit, status })
    this.wargaTickets = new Map();
    // Daftar rujukan yang sedang dalam perjalanan ambulans (id -> ringkasan untuk UI)
    this.activeReferrals = new Map();

    // 2. Bangun EventScheduler (PriorityQueue berbasis min-heap)
    this.scheduler = new PriorityQueue((a, b) =>
      a.time !== b.time ? a.time - b.time : a.seq - b.seq
    );

    // 3. Bangun State Rumah Sakit & RegionTree (Tree n-ary)
    this.hospitals = new Map();
    this.regionTree = new Tree(
      new TreeNode({
        id: 'wilayah',
        name: 'Wilayah Simpul Sehat',
        level: 'wilayah',
      })
    );

    for (const city of this.seedData.cities) {
      this.regionTree.addChild(
        'wilayah',
        new TreeNode({
          id: city.id,
          name: `Kota ${city.name}`,
          level: 'kota',
        })
      );
    }

    for (const cfg of this.seedData.hospitals) {
      const node = this.graph.getNode(cfg.id);
      const rsState = {
        ...cfg,
        x: node.x,
        y: node.y,
        bedsInapTotal: cfg.bedsInap,
        bedsIcuTotal: cfg.bedsIcu,
        igdQueue: new PriorityQueue((a, b) => {
          const tDiff = TRIAGE_RANK[a.triage] - TRIAGE_RANK[b.triage];
          if (tDiff !== 0) return tDiff;
          if (a.arrivedAt !== b.arrivedAt) return a.arrivedAt - b.arrivedAt;
          return a.seq - b.seq;
        }),
        poliQueue: new Queue(),
        ambRequestQueue: new Queue(),
        freeAmbulances: new LinkedList(),
        activeIgd: new LinkedList(),
        activePoli: new LinkedList(),
        inpatientsInap: new LinkedList(),
        inpatientsIcu: new LinkedList(),
        waitingBedInap: new Queue(),
        waitingBedIcu: new Queue(),
        eventLog: new LinkedList(),
        status: 'ok',
        occupancyPct: 0,
        lastStatus: 'ok',
      };

      // Inisialisasi ambulans siaga RS di LinkedList
      for (let i = 1; i <= cfg.ambulances; i++) {
        rsState.freeAmbulances.append({
          id: `amb_${cfg.id}_${i}`,
          homeHospitalId: cfg.id,
          status: 'siaga',
        });
      }

      // Tambahkan RS & 4 unit ke RegionTree
      this.regionTree.addChild(
        cfg.city,
        new TreeNode({ id: cfg.id, name: cfg.name, level: 'rs' })
      );
      this.regionTree.addChild(
        cfg.id,
        new TreeNode({ id: `${cfg.id}:igd`, name: 'IGD', level: 'unit', data: { queue: 0, used: 0, total: cfg.igdDoctors } })
      );
      this.regionTree.addChild(
        cfg.id,
        new TreeNode({ id: `${cfg.id}:poli`, name: 'Poli', level: 'unit', data: { queue: 0, used: 0, total: cfg.poliDoctors } })
      );
      this.regionTree.addChild(
        cfg.id,
        new TreeNode({ id: `${cfg.id}:rawat_inap`, name: 'Rawat inap', level: 'unit', data: { used: 0, total: cfg.bedsInap } })
      );
      this.regionTree.addChild(
        cfg.id,
        new TreeNode({ id: `${cfg.id}:icu`, name: 'ICU', level: 'unit', data: { used: 0, total: cfg.bedsIcu } })
      );

      this.hospitals.set(cfg.id, rsState);
    }

    // Log global & UndoManager berbasis Stack
    this.globalLog = new LinkedList();
    this.undoManager = new UndoManager(100);
    this.metrics = new SimulationMetrics(Array.from(this.hospitals.keys()));
    this.metrics.reset(getSimDay(this.simTime));

    // 4. Isi keadaan awal tempat tidur (40% - 55% terisi, sisa lama rawat acak)
    for (const rs of this.hospitals.values()) {
      const [minOcc, maxOcc] = SIM_CONFIG.initialOccupancyRange;
      const initInap = Math.round(rs.bedsInapTotal * this.rng.uniform(minOcc, maxOcc));
      const initIcu =
        rs.bedsIcuTotal > 0
          ? Math.round(rs.bedsIcuTotal * this.rng.uniform(minOcc, maxOcc))
          : 0;

      for (let i = 0; i < initInap; i++) {
        const p = this._createPatient('sedang', rs.id, 'inap');
        const remain = this.rng.int(120, SIM_CONFIG.stayDurationMin.inap[1]);
        this._admitToBed(rs, p, 'inap', remain, true);
      }
      for (let i = 0; i < initIcu; i++) {
        const p = this._createPatient('gawat', rs.id, 'icu');
        const remain = this.rng.int(120, SIM_CONFIG.stayDurationMin.icu[1]);
        this._admitToBed(rs, p, 'icu', remain, true);
      }
    }

    this._syncTreeAndStatuses(false);
    this._sampleMetrics();
  }

  /**
   * Memajukan simulasi sebanyak 1 tick (= 1 menit simulasi).
   */
  step() {
    this.simTime += 1;
    this.metrics.checkDayRollover(this.simTime);

    // 1. Bersihkan wabah yang sudah selesai
    for (const [cityId, endsAt] of this.outbreaks.entries()) {
      if (this.simTime >= endsAt) {
        this.outbreaks.delete(cityId);
      }
    }

    // 2. Proses seluruh kejadian terjadwal pada simTime ini (PriorityQueue EventScheduler)
    while (!this.scheduler.isEmpty() && this.scheduler.peek().time <= this.simTime) {
      const ev = this.scheduler.pop();
      this._processScheduledEvent(ev);
    }

    // 3. Bangkitkan kedatangan pasien NPC baru per kota (proses Poisson)
    this._spawnArrivalsForTick();

    // 4. Pastikan dokter & tempat tidur yang kosong melayani antrean
    for (const rs of this.hospitals.values()) {
      this._fillIgdDoctors(rs);
      this._fillPoliDoctors(rs);
      this._assignWaitingBeds(rs);
      this._dispatchPendingAmbulanceRequests(rs);
    }

    // 5. Perbarui RegionTree, status RS, dan sampel metrik tiap 15 menit
    this._syncTreeAndStatuses(true);
    if (this.simTime % 15 === 0) {
      this._sampleMetrics();
    }
  }

  /**
   * Bobot dinamis edge untuk Dijkstra: waktuTempuh = baseMinutes * (1 + 0.2 * min(ambulansDiEdge, 5))
   */
  _edgeWeight(edge) {
    const count = this.edgeTraffic.get(edge.id) || 0;
    const trafficFactor = 1 + 0.2 * Math.min(count, 5);
    return edge.weight * trafficFactor;
  }

  _schedule(time, type, payload) {
    this.seqCounter += 1;
    this.scheduler.push({
      time: Math.max(this.simTime, Math.round(time)),
      seq: this.seqCounter,
      type,
      payload,
    });
  }

  _createPatient(triage, hospitalId, unit = 'igd') {
    this.patientCounter += 1;
    const code = `P-${String(this.patientCounter).padStart(4, '0')}`;
    const complaints = SYNTHETIC_COMPLAINTS[triage] || SYNTHETIC_COMPLAINTS.ringan;
    const complaint = complaints[(this.patientCounter * 7) % complaints.length];
    const age = 18 + ((this.patientCounter * 13 + 5) % 55); // Usia sintetis 18–72 tahun

    const journey = new LinkedList();
    journey.append({
      stage: 'terdaftar',
      hospitalId,
      unit,
      enteredAt: this.simTime,
      exitedAt: null,
    });

    const patient = {
      code,
      triage,
      unit,
      age,
      complaint,
      originHospitalId: hospitalId,
      currentHospitalId: hospitalId,
      currentStage: unit === 'inap' ? 'rawat_inap' : unit === 'icu' ? 'icu' : 'menunggu',
      arrivedAt: this.simTime,
      seq: ++this.seqCounter,
      alreadyReferred: false,
      unreachableCounted: false,
      journey,
    };

    this.patientRegistry.set(code, patient);
    if (this.patientRegistry.size > 500) {
      const oldestKey = this.patientRegistry.keys().next().value;
      if (oldestKey) this.patientRegistry.delete(oldestKey);
    }

    return patient;
  }

  _spawnArrivalsForTick() {
    const hour = Math.floor((this.simTime % 1440) / 60);
    const hourMult = SIM_CONFIG.hourlyMultiplier(hour);

    for (const city of this.seedData.cities) {
      const baseRate = SIM_CONFIG.baseIgdRatePerHour[city.id] || 5;
      const outbreakMult = this.outbreaks.has(city.id)
        ? SIM_CONFIG.outbreakMultiplier
        : 1;
      const igdLambdaPerMin = (baseRate * hourMult * outbreakMult) / 60;
      const poliLambdaPerMin = igdLambdaPerMin * SIM_CONFIG.poliRateMultiplier;

      const igdCount = this.rng.poisson(igdLambdaPerMin);
      for (let i = 0; i < igdCount; i++) {
        const triage = this._sampleTriage();
        this._spawnWalkinPatient(city.id, 'igd', triage);
      }

      const poliCount = this.rng.poisson(poliLambdaPerMin);
      for (let i = 0; i < poliCount; i++) {
        this._spawnWalkinPatient(city.id, 'poli', 'ringan');
      }
    }
  }

  _sampleTriage() {
    const r = this.rng.next();
    if (r < SIM_CONFIG.triageProbabilities.ringan) return 'ringan';
    if (r < SIM_CONFIG.triageProbabilities.ringan + SIM_CONFIG.triageProbabilities.sedang) {
      return 'sedang';
    }
    return 'gawat';
  }

  _spawnWalkinPatient(cityId, unit, triage) {
    const junctions = this.junctionsByCity.get(cityId) || [];
    const fromNode = this.rng.pick(junctions);
    if (!fromNode) return;
    const fromNodeId = fromNode.id;

    const cityHouses = this.housesByCity.get(cityId) || [];
    const junctionHouses = cityHouses.filter((h) => h.nearestJunctionId === fromNodeId);
    const house = this.rng.pick(junctionHouses.length > 0 ? junctionHouses : cityHouses);

    // Cari RS terdekat di kota yang sama lewat Dijkstra
    const cityHospitals = Array.from(this.hospitals.values()).filter(
      (h) => h.city === cityId
    );
    let bestRs = null;
    let bestRoute = null;

    for (const rs of cityHospitals) {
      const route = this.graph.dijkstra(fromNodeId, rs.id);
      if (route.found && (!bestRoute || route.distance < bestRoute.distance)) {
        bestRoute = route;
        bestRs = rs;
      }
    }
    if (!bestRs || !bestRoute) return;

    // Hitung waktu jalan kaki pasien dari rumah -> persimpangan -> RS (minimal 1 menit)
    const houseToJunctionPx = house ? Math.hypot(house.x - house.junctionX, house.y - house.junctionY) : 0;
    const lengthPx = houseToJunctionPx + bestRoute.distance * SIM_CONFIG.ambulancePxPerMin;
    const walkMin = Math.max(1, Math.round(lengthPx / SIM_CONFIG.walkinPxPerMin));
    const walkinId = `wk_${++this.walkinCounter}`;

    this._emit('walkin:spawn', {
      id: walkinId,
      fromNode: fromNodeId,
      houseId: house ? house.id : null,
      originCoord: house ? { x: house.x, y: house.y } : null,
      toHospital: bestRs.id,
      path: bestRoute.path,
      travelMin: walkMin,
      triage,
      unit,
    });

    this._schedule(this.simTime + walkMin, 'walkin_arrive', {
      hospitalId: bestRs.id,
      unit,
      triage,
    });
  }

  _processScheduledEvent(ev) {
    switch (ev.type) {
      case 'walkin_arrive': {
        const { hospitalId, unit, triage } = ev.payload;
        const rs = this.hospitals.get(hospitalId);
        if (!rs) return;
        const patient = this._createPatient(triage, hospitalId, unit);
        if (unit === 'poli') {
          rs.poliQueue.enqueue(patient);
          this._fillPoliDoctors(rs);
        } else {
          this._handleIgdArrival(rs, patient);
        }
        break;
      }

      case 'igd_finish': {
        const { hospitalId, patientCode } = ev.payload;
        const rs = this.hospitals.get(hospitalId);
        if (!rs) return;
        const patient = rs.activeIgd.removeWhere((p) => p.code === patientCode);
        if (!patient) return;
        this._handlePostIgdOutcome(rs, patient);
        this._fillIgdDoctors(rs);
        break;
      }

      case 'poli_finish': {
        const { hospitalId, patientCode } = ev.payload;
        const rs = this.hospitals.get(hospitalId);
        if (!rs) return;
        const patient = rs.activePoli.removeWhere((p) => p.code === patientCode);
        if (!patient) return;
        patient.currentStage = 'pulang';
        patient.journey.append({
          stage: 'pulang',
          hospitalId: rs.id,
          enteredAt: this.simTime,
          exitedAt: this.simTime,
        });
        this._clearWargaTicketIfMatch(patient);
        this._fillPoliDoctors(rs);
        break;
      }

      case 'amb_arrive_dest': {
        const { ambulance, dispatchId, patient, fromHospitalId, toHospitalId, routeEdges, neededUnit } =
          ev.payload;
        if (dispatchId) this.activeReferrals.delete(dispatchId);
        this._updateEdgeTraffic(routeEdges, -1);

        const destRs = this.hospitals.get(toHospitalId);
        if (destRs) {
          this._emit('ambulance:arrive', {
            id: ambulance.id,
            hospitalId: toHospitalId,
            patientCode: patient.code,
          });
          this._logEvent(
            'ambulans_tiba',
            'info',
            toHospitalId,
            `Ambulans tiba di ${destRs.name}. Pasien masuk antrean IGD.`
          );

          patient.currentHospitalId = toHospitalId;
          patient.arrivedAt = this.simTime;
          patient.neededUnitAfterIgd = neededUnit || null;
          patient.journey.append({
            stage: 'tiba_rujukan',
            hospitalId: toHospitalId,
            enteredAt: this.simTime,
            exitedAt: null,
          });

          if (neededUnit === 'icu' && destRs.bedsIcuTotal > 0 && destRs.inpatientsIcu.size() < destRs.bedsIcuTotal) {
            this._admitToBed(destRs, patient, 'icu');
          } else if (neededUnit === 'inap' && destRs.inpatientsInap.size() < destRs.bedsInapTotal) {
            this._admitToBed(destRs, patient, 'inap');
          } else {
            destRs.igdQueue.push(patient);
            this._fillIgdDoctors(destRs);
          }
        }

        // Ambulans kembali ke RS asal (ikuti rute Dijkstra jika ada, atau balik jalur semula)
        let returnRoute = this.graph.dijkstra(toHospitalId, fromHospitalId, (e) =>
          this._edgeWeight(e)
        );
        if (!returnRoute.found) {
          returnRoute = {
            found: true,
            path: [...ev.payload.routePath].reverse(),
            edges: [...routeEdges].reverse(),
            distance: ev.payload.travelMin,
          };
        }

        const returnMin = Math.max(1, Math.round(returnRoute.distance));
        ambulance.status = 'kembali';
        this._updateEdgeTraffic(returnRoute.edges, +1);

        this._emit('ambulance:return', {
          id: ambulance.id,
          from: toHospitalId,
          to: fromHospitalId,
          path: returnRoute.path,
          travelMin: returnMin,
        });

        this._schedule(this.simTime + returnMin, 'amb_return_base', {
          ambulance,
          homeHospitalId: fromHospitalId,
          routeEdges: returnRoute.edges,
        });
        break;
      }

      case 'amb_return_base': {
        const { ambulance, homeHospitalId, routeEdges } = ev.payload;
        this._updateEdgeTraffic(routeEdges, -1);
        const homeRs = this.hospitals.get(homeHospitalId);
        if (!homeRs) return;
        ambulance.status = 'siaga';
        homeRs.freeAmbulances.append(ambulance);
        this._dispatchPendingAmbulanceRequests(homeRs);
        break;
      }

      case 'inpatient_discharge': {
        const { hospitalId, patientCode, bedType } = ev.payload;
        const rs = this.hospitals.get(hospitalId);
        if (!rs) return;
        const list = bedType === 'icu' ? rs.inpatientsIcu : rs.inpatientsInap;
        const patient = list.removeWhere((p) => p.code === patientCode);
        if (!patient) return;
        patient.journey.append({
          stage: 'pulang',
          hospitalId: rs.id,
          enteredAt: this.simTime,
          exitedAt: this.simTime,
        });
        this._logEvent(
          'pulang',
          'info',
          rs.id,
          `Pasien ${patient.code} selesai dirawat dan pulang dari ${rs.name}.`
        );
        this._assignWaitingBeds(rs);
        break;
      }

      default:
        break;
    }
  }

  _handleIgdArrival(rs, patient) {
    // Kebijakan rujukan otomatis (Pemicu 1: saat triase IGD mulai padat atau RS berstatus Penuh)
    const isUrgent = patient.triage === 'sedang' || patient.triage === 'gawat';
    const igdOverloaded =
      rs.igdQueue.size() >= rs.igdDoctors || rs.status === 'danger';

    if (this.autoReferral && !patient.alreadyReferred && isUrgent && igdOverloaded) {
      const referred = this._tryReferPatient(rs, patient, 'igd');
      if (referred) return;
    }

    rs.igdQueue.push(patient);
    this._fillIgdDoctors(rs);
  }

  _fillIgdDoctors(rs) {
    while (rs.activeIgd.size() < rs.igdDoctors && !rs.igdQueue.isEmpty()) {
      const patient = rs.igdQueue.pop();
      const waitMin = this.simTime - patient.arrivedAt;
      this.metrics.recordIgdWait(rs.id, patient.triage, waitMin);

      const [minDur, maxDur] = SIM_CONFIG.igdDurationMin[patient.triage] || [15, 30];
      const dur = this.rng.int(minDur, maxDur);
      patient.serviceStartedAt = this.simTime;
      patient.currentStage = 'layanan_igd';
      this._markWargaTicketCalled(patient);
      patient.journey.append({
        stage: 'layanan_igd',
        hospitalId: rs.id,
        enteredAt: this.simTime,
        exitedAt: this.simTime + dur,
      });

      rs.activeIgd.append(patient);
      this._schedule(this.simTime + dur, 'igd_finish', {
        hospitalId: rs.id,
        patientCode: patient.code,
      });
    }
  }

  _fillPoliDoctors(rs) {
    while (rs.activePoli.size() < rs.poliDoctors && !rs.poliQueue.isEmpty()) {
      const patient = rs.poliQueue.dequeue();
      const [minDur, maxDur] = SIM_CONFIG.poliDurationMin;
      const dur = this.rng.int(minDur, maxDur);
      patient.serviceStartedAt = this.simTime;
      patient.currentStage = 'layanan_poli';
      this._markWargaTicketCalled(patient);
      rs.activePoli.append(patient);
      this._schedule(this.simTime + dur, 'poli_finish', {
        hospitalId: rs.id,
        patientCode: patient.code,
      });
    }
  }

  _handlePostIgdOutcome(rs, patient) {
    // Jika pasien rujukan sudah membawa kebutuhan unit tertentu
    let outcome = patient.neededUnitAfterIgd || null;

    if (!outcome) {
      const probs = SIM_CONFIG.postIgdOutcome[patient.triage];
      const r = this.rng.next();
      if (r < probs.pulang) {
        outcome = 'pulang';
      } else if (r < probs.pulang + probs.inap) {
        outcome = 'inap';
      } else {
        outcome = 'icu';
      }
    }

    if (outcome === 'pulang') {
      patient.currentStage = 'pulang';
      patient.journey.append({
        stage: 'pulang',
        hospitalId: rs.id,
        enteredAt: this.simTime,
        exitedAt: this.simTime,
      });
      this._clearWargaTicketIfMatch(patient);
      this._logEvent(
        'pulang',
        'info',
        rs.id,
        `Pasien ${patient.code} selesai dirawat dan pulang dari ${rs.name}.`
      );
      return;
    }

    if (outcome === 'icu') {
      if (rs.bedsIcuTotal > 0 && rs.inpatientsIcu.size() < rs.bedsIcuTotal) {
        this._admitToBed(rs, patient, 'icu');
        return;
      }
      // Butuh ICU tapi tidak punya atau penuh -> rujuk jika autoReferral aktif & belum pernah dirujuk
      if (this.autoReferral && !patient.alreadyReferred) {
        const referred = this._tryReferPatient(rs, patient, 'icu');
        if (referred) return;
      }
      // Jika nonaktif atau tidak ada rute: bila RS tidak punya ICU, masuk rawat inap jika ada tempat
      if (rs.bedsIcuTotal === 0) {
        if (rs.inpatientsInap.size() < rs.bedsInapTotal) {
          this._admitToBed(rs, patient, 'inap');
        } else {
          rs.waitingBedInap.enqueue(patient);
        }
      } else {
        rs.waitingBedIcu.enqueue(patient);
      }
      return;
    }

    // outcome === 'inap'
    if (rs.inpatientsInap.size() < rs.bedsInapTotal) {
      this._admitToBed(rs, patient, 'inap');
      return;
    }
    if (this.autoReferral && !patient.alreadyReferred) {
      const referred = this._tryReferPatient(rs, patient, 'inap');
      if (referred) return;
    }
    rs.waitingBedInap.enqueue(patient);
  }

  _admitToBed(rs, patient, bedType, customStayMin = null, silent = false) {
    const [minStay, maxStay] = SIM_CONFIG.stayDurationMin[bedType];
    const stay = customStayMin ?? this.rng.int(minStay, maxStay);
    const list = bedType === 'icu' ? rs.inpatientsIcu : rs.inpatientsInap;

    patient.admittedAt = this.simTime;
    patient.bedType = bedType;
    patient.currentStage = bedType === 'icu' ? 'icu' : 'rawat_inap';
    list.append(patient);

    if (!silent) {
      patient.journey.append({
        stage: bedType === 'icu' ? 'icu' : 'rawat_inap',
        hospitalId: rs.id,
        enteredAt: this.simTime,
        exitedAt: this.simTime + stay,
      });
      this._logEvent(
        bedType === 'icu' ? 'masuk_icu' : 'rawat_inap',
        'info',
        rs.id,
        bedType === 'icu'
          ? `Pasien ${patient.code} masuk ICU ${rs.name}.`
          : `Pasien ${patient.code} dirawat inap di ${rs.name}.`
      );
    }

    this._schedule(this.simTime + stay, 'inpatient_discharge', {
      hospitalId: rs.id,
      patientCode: patient.code,
      bedType,
    });
  }

  _assignWaitingBeds(rs) {
    while (rs.inpatientsInap.size() < rs.bedsInapTotal && !rs.waitingBedInap.isEmpty()) {
      const p = rs.waitingBedInap.dequeue();
      this._admitToBed(rs, p, 'inap');
    }
    while (rs.inpatientsIcu.size() < rs.bedsIcuTotal && !rs.waitingBedIcu.isEmpty()) {
      const p = rs.waitingBedIcu.dequeue();
      this._admitToBed(rs, p, 'icu');
    }
  }

  /**
   * Memilih RS tujuan rujukan terbaik lewat Dijkstra (mengabaikan jembatan tertutup).
   */
  findBestReferralTarget(fromRs, neededUnit = 'igd') {
    let best = null;

    for (const cand of this.hospitals.values()) {
      if (cand.id === fromRs.id) continue;
      if (cand.status === 'danger') continue;

      if (neededUnit === 'icu') {
        if (cand.bedsIcuTotal <= 0 || cand.inpatientsIcu.size() >= cand.bedsIcuTotal) continue;
      } else if (neededUnit === 'inap') {
        if (cand.inpatientsInap.size() >= cand.bedsInapTotal) continue;
      } else {
        // igd: cari kandidat yang lebih longgar (antrean IGD di bawah kapasitas dokter & bukan kota yang sedang wabah jika ada RS kota lain yang lega)
        if (cand.igdQueue.size() >= cand.igdDoctors) continue;
      }

      const route = this.graph.dijkstra(fromRs.id, cand.id, (edge) => this._edgeWeight(edge));
      if (!route.found) continue;

      const occRatio = this._computeOccupancy(cand).maxRatio;
      const igdLoadPenalty =
        neededUnit === 'igd' && cand.igdDoctors > 0
          ? (cand.igdQueue.size() / cand.igdDoctors) * 12
          : 0;
      // Saat kota asal sedang wabah, prioritaskan RS di kota lain yang masih lega agar beban dua kota merata
      const sameOutbreakPenalty =
        this.outbreaks.has(fromRs.city) && cand.city === fromRs.city ? 8 : 0;
      const effectiveCost = route.distance + sameOutbreakPenalty + igdLoadPenalty;

      if (
        !best ||
        effectiveCost < best.effectiveCost - 0.01 ||
        (Math.abs(effectiveCost - best.effectiveCost) <= 0.01 && occRatio < best.occRatio)
      ) {
        best = { hospital: cand, route, occRatio, effectiveCost };
      }
    }

    return best;
  }

  _tryReferPatient(fromRs, patient, neededUnit) {
    const target = this.findBestReferralTarget(fromRs, neededUnit);

    if (!target) {
      if (!patient.unreachableCounted) {
        patient.unreachableCounted = true;
        this.metrics.recordUnreachable();
        this._logEvent(
          'tidak_ada_rute',
          'danger',
          fromRs.id,
          `Pasien ${patient.code} belum bisa dirujuk: tidak ada rute ke RS lain.`
        );
      }
      return false;
    }

    patient.alreadyReferred = true;
    const travelMin = Math.max(2, Math.round(target.route.distance));

    const request = {
      patient,
      fromHospitalId: fromRs.id,
      toHospitalId: target.hospital.id,
      route: target.route,
      travelMin,
      neededUnit: neededUnit === 'igd' ? null : neededUnit,
    };

    if (!fromRs.freeAmbulances.isEmpty()) {
      this._dispatchAmbulance(fromRs, request);
    } else {
      // Semua ambulans sedang bertugas -> masuk Queue FIFO permintaan ambulans
      fromRs.ambRequestQueue.enqueue(request);
    }

    return true;
  }

  _dispatchPendingAmbulanceRequests(rs) {
    while (!rs.freeAmbulances.isEmpty() && !rs.ambRequestQueue.isEmpty()) {
      const req = rs.ambRequestQueue.dequeue();
      // Re-cek rute saat ambulans berangkat (jembatan bisa saja baru ditutup)
      const freshRoute = this.graph.dijkstra(req.fromHospitalId, req.toHospitalId, (e) =>
        this._edgeWeight(e)
      );
      if (!freshRoute.found) {
        // Kembalikan ke antrean IGD lokal jika rute tiba-tiba putus
        const destRs = this.hospitals.get(req.toHospitalId);
        this._logEvent(
          'tidak_ada_rute',
          'danger',
          rs.id,
          `Pasien ${req.patient.code} belum bisa dirujuk ke ${destRs?.name || 'RS tujuan'}: tidak ada rute.`
        );
        if (!req.patient.unreachableCounted) {
          req.patient.unreachableCounted = true;
          this.metrics.recordUnreachable();
        }
        rs.igdQueue.push(req.patient);
        continue;
      }
      req.route = freshRoute;
      req.travelMin = Math.max(2, Math.round(freshRoute.distance));
      this._dispatchAmbulance(rs, req);
    }
  }

  _dispatchAmbulance(fromRs, req) {
    const ambulance = fromRs.freeAmbulances.removeFirst();
    if (!ambulance) return;

    const destRs = this.hospitals.get(req.toHospitalId);
    ambulance.status = 'mengantar';
    this._updateEdgeTraffic(req.route.edges, +1);
    this.metrics.recordReferral(req.travelMin);

    req.patient.journey.append({
      stage: 'dirujuk',
      hospitalId: fromRs.id,
      toHospitalId: destRs.id,
      enteredAt: this.simTime,
      exitedAt: this.simTime + req.travelMin,
    });

    const triageWord = TRIAGE_LABEL[req.patient.triage] || 'Sedang';
    this._logEvent(
      'rujukan',
      'accent',
      fromRs.id,
      `Pasien ${triageWord} dirujuk dari ${fromRs.name} ke ${destRs.name} (±${req.travelMin} menit).`
    );

    const dispatchId = `${ambulance.id}_${++this.ambulanceSeq}`;
    this.activeReferrals.set(dispatchId, {
      id: dispatchId,
      patientCode: req.patient.code,
      triage: req.patient.triage,
      fromId: fromRs.id,
      fromName: fromRs.name,
      toId: destRs.id,
      toName: destRs.name,
      travelMin: req.travelMin,
      etaSimTime: this.simTime + req.travelMin,
    });

    this._emit('ambulance:dispatch', {
      id: dispatchId,
      ambulanceId: ambulance.id,
      from: fromRs.id,
      to: destRs.id,
      path: req.route.path,
      travelMin: req.travelMin,
      triage: req.patient.triage,
      patientCode: req.patient.code,
    });

    this._schedule(this.simTime + req.travelMin, 'amb_arrive_dest', {
      ambulance,
      dispatchId,
      patient: req.patient,
      fromHospitalId: fromRs.id,
      toHospitalId: destRs.id,
      routePath: req.route.path,
      routeEdges: req.route.edges,
      travelMin: req.travelMin,
      neededUnit: req.neededUnit,
    });
  }

  _updateEdgeTraffic(edgeIds, delta) {
    for (const edgeId of edgeIds) {
      const nextVal = Math.max(0, (this.edgeTraffic.get(edgeId) || 0) + delta);
      this.edgeTraffic.set(edgeId, nextVal);
    }
  }

  _computeOccupancy(rs) {
    const totalBeds = rs.bedsInapTotal + rs.bedsIcuTotal;
    const usedBeds = rs.inpatientsInap.size() + rs.inpatientsIcu.size();
    const bedRatio = totalBeds > 0 ? usedBeds / totalBeds : 0;
    const igdRatio = rs.igdDoctors > 0 ? rs.igdQueue.size() / (2 * rs.igdDoctors) : 0;
    const maxRatio = Math.max(bedRatio, igdRatio);

    let status = 'ok';
    if (maxRatio > 0.85) status = 'danger';
    else if (maxRatio >= 0.6) status = 'warn';

    return {
      status,
      maxRatio,
      bedRatio,
      occupancyPct: Math.min(100, Math.round(maxRatio * 100)),
    };
  }

  _syncTreeAndStatuses(emitStatusAlerts) {
    for (const rs of this.hospitals.values()) {
      const occ = this._computeOccupancy(rs);
      rs.status = occ.status;
      rs.occupancyPct = occ.occupancyPct;

      if (emitStatusAlerts && rs.lastStatus !== 'danger' && rs.status === 'danger') {
        this._logEvent(
          'rs_penuh',
          'danger',
          rs.id,
          `${rs.name} penuh. Pasien baru akan dirujuk ke RS lain.`
        );
      }
      rs.lastStatus = rs.status;

      // Perbarui daun RegionTree
      const igdNode = this.regionTree.find(`${rs.id}:igd`);
      const poliNode = this.regionTree.find(`${rs.id}:poli`);
      const inapNode = this.regionTree.find(`${rs.id}:rawat_inap`);
      const icuNode = this.regionTree.find(`${rs.id}:icu`);

      if (igdNode) igdNode.data = { queue: rs.igdQueue.size(), used: rs.activeIgd.size(), total: rs.igdDoctors };
      if (poliNode) poliNode.data = { queue: rs.poliQueue.size(), used: rs.activePoli.size(), total: rs.poliDoctors };
      if (inapNode) inapNode.data = { used: rs.inpatientsInap.size(), total: rs.bedsInapTotal };
      if (icuNode) icuNode.data = { used: rs.inpatientsIcu.size(), total: rs.bedsIcuTotal };
    }
  }

  /**
   * Agregasi rekursif (memakai fungsi aggregate dari recursion.js) pada RegionTree.
   */
  getRegionAggregation(nodeId = 'wilayah') {
    const node = this.regionTree.find(nodeId);
    if (!node) return { bedsUsed: 0, bedsTotal: 0, igdQueue: 0 };

    return aggregate(
      node,
      (leaf) => {
        if (leaf.id.endsWith(':rawat_inap') || leaf.id.endsWith(':icu')) {
          return { bedsUsed: leaf.data.used || 0, bedsTotal: leaf.data.total || 0, igdQueue: 0 };
        }
        if (leaf.id.endsWith(':igd')) {
          return { bedsUsed: 0, bedsTotal: 0, igdQueue: leaf.data.queue || 0 };
        }
        return { bedsUsed: 0, bedsTotal: 0, igdQueue: 0 };
      },
      (children) =>
        children.reduce(
          (acc, c) => ({
            bedsUsed: acc.bedsUsed + c.bedsUsed,
            bedsTotal: acc.bedsTotal + c.bedsTotal,
            igdQueue: acc.igdQueue + c.igdQueue,
          }),
          { bedsUsed: 0, bedsTotal: 0, igdQueue: 0 }
        )
    );
  }

  _sampleMetrics() {
    const suryaAgg = this.getRegionAggregation('surya');
    const tirtaAgg = this.getRegionAggregation('tirta');
    const totalAgg = this.getRegionAggregation('wilayah');

    const suryaPct = suryaAgg.bedsTotal > 0 ? Math.round((suryaAgg.bedsUsed / suryaAgg.bedsTotal) * 100) : 0;
    const tirtaPct = tirtaAgg.bedsTotal > 0 ? Math.round((tirtaAgg.bedsUsed / tirtaAgg.bedsTotal) * 100) : 0;
    const totalPct = totalAgg.bedsTotal > 0 ? Math.round((totalAgg.bedsUsed / totalAgg.bedsTotal) * 100) : 0;

    this.metrics.recordBedSample(this.simTime, suryaPct, tirtaPct, totalPct);
  }

  _logEvent(type, severity, hospitalId, message) {
    const entry = {
      id: `ev_${++this.eventLogCounter}`,
      simTime: this.simTime,
      simTimeText: formatSimTime(this.simTime),
      type,
      severity,
      hospitalId,
      message,
    };

    if (hospitalId && this.hospitals.has(hospitalId)) {
      const rs = this.hospitals.get(hospitalId);
      rs.eventLog.append(entry);
      if (rs.eventLog.size() > SIM_CONFIG.maxHospitalLog) {
        rs.eventLog.removeFirst();
      }
    }

    this.globalLog.append(entry);
    if (this.globalLog.size() > SIM_CONFIG.maxGlobalLog) {
      this.globalLog.removeFirst();
    }

    this._emit('log:event', entry);
  }

  _emit(name, payload) {
    if (this.onEvent) {
      this.onEvent(name, payload);
    }
  }

  // ==================== KONTROL PUBLIK & SKENARIO (FASE 4) ====================

  /**
   * Memicu skenario wabah di kota tertentu (Surya atau Tirta):
   * Laju kedatangan dikali 4 selama 360 menit simulasi (6 jam).
   * Tidak masuk Stack Undo karena lonjakan pasien yang sudah masuk tidak dapat ditarik kembali.
   */
  triggerOutbreak(cityId) {
    const city = this.seedData.cities.find((c) => c.id === cityId);
    if (!city) return false;

    this.outbreaks.set(cityId, this.simTime + SIM_CONFIG.outbreakDurationMin);
    this._logEvent(
      'wabah',
      'warn',
      null,
      `Lonjakan pasien di kota ${city.name}.`
    );
    return true;
  }

  /**
   * Memicu kecelakaan massal di RS tertentu:
   * 12 pasien tiba pada tick berikutnya (Gawat 40%, Sedang 40%, Ringan 20%).
   * Tidak masuk Stack Undo.
   */
  triggerMassCasualty(hospitalId) {
    const rs = this.hospitals.get(hospitalId);
    if (!rs) return false;

    const count = SIM_CONFIG.massCasualtyCount;
    // Distribusi deterministik sesuai proporsi 40% Gawat, 40% Sedang, 20% Ringan
    for (let i = 0; i < count; i++) {
      const r = this.rng.next();
      let triage = 'ringan';
      if (r < 0.4) triage = 'gawat';
      else if (r < 0.8) triage = 'sedang';

      this._schedule(this.simTime + 1, 'walkin_arrive', {
        hospitalId: rs.id,
        unit: 'igd',
        triage,
      });
    }

    this._logEvent(
      'kecelakaan',
      'danger',
      rs.id,
      `Kecelakaan massal: ${count} pasien tiba di ${rs.name}.`
    );
    return true;
  }

  setBridgeClosed(edgeId, closed, { recordUndo = true, scopeKey = 'dinkes' } = {}) {
    const edge = this.graph.getEdge(edgeId);
    if (!edge || !edge.meta?.bridge) return false;
    const prevClosed = edge.closed;
    const nextClosed = Boolean(closed);
    if (prevClosed === nextClosed) return true;

    this.graph.setEdgeClosed(edgeId, nextClosed);
    const name = edge.meta.name || edgeId;

    if (recordUndo) {
      const desc = `${nextClosed ? 'Tutup' : 'Buka'} ${name}`;
      this.undoManager.record(scopeKey, desc, () => {
        this.setBridgeClosed(edgeId, prevClosed, { recordUndo: false });
      });
    }

    this._logEvent(
      'jembatan',
      nextClosed ? 'warn' : 'info',
      null,
      `${name} ${nextClosed ? 'ditutup' : 'dibuka'}.`
    );
    return true;
  }

  setAutoReferral(enabled, { recordUndo = true, scopeKey = 'dinkes' } = {}) {
    const prev = this.autoReferral;
    const next = Boolean(enabled);
    if (prev === next) return true;

    this.autoReferral = next;
    if (recordUndo) {
      const desc = next ? 'Aktifkan rujukan otomatis' : 'Nonaktifkan rujukan otomatis';
      this.undoManager.record(scopeKey, desc, () => {
        this.setAutoReferral(prev, { recordUndo: false });
      });
    }

    this._logEvent(
      'kebijakan',
      'info',
      null,
      `Rujukan otomatis ${next ? 'diaktifkan' : 'dinonaktifkan'}.`
    );
    return true;
  }

  undoLastAction(scopeKey = 'dinkes') {
    const desc = this.undoManager.undo(scopeKey);
    if (!desc) return null;

    this._logEvent(
      'undo',
      'info',
      null,
      `Aksi dibatalkan: ${desc}.`
    );
    return desc;
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
  }

  setSpeed(speed) {
    if ([1, 5, 10].includes(speed)) {
      this.speed = speed;
    }
  }

  // ==================== OPERASI PETUGAS RS & WARGA (FASE 6) ====================

  _markWargaTicketCalled(patient) {
    if (!patient?.wargaUid) return;
    const ticket = this.wargaTickets.get(patient.wargaUid);
    if (ticket && ticket.patientCode === patient.code) {
      ticket.status = 'dipanggil';
    }
  }

  _clearWargaTicketIfMatch(patient) {
    if (!patient?.wargaUid) return;
    const ticket = this.wargaTickets.get(patient.wargaUid);
    if (ticket && ticket.patientCode === patient.code) {
      this.wargaTickets.delete(patient.wargaUid);
    }
  }

  /**
   * Warga mendaftar antrean IGD atau Poli (maksimal 1 antrean aktif per warga).
   */
  registerWarga(uid, hospitalId, unit = 'poli') {
    if (this.wargaTickets.has(uid)) {
      return { error: 'Selesaikan atau batalkan antrean Anda lebih dulu.' };
    }
    const rs = this.hospitals.get(hospitalId);
    if (!rs) return { error: 'Rumah sakit tidak ditemukan.' };
    const cleanUnit = unit === 'igd' ? 'igd' : 'poli';
    const triage = cleanUnit === 'igd' ? 'sedang' : 'ringan';

    const patient = this._createPatient(triage, rs.id, cleanUnit);
    patient.wargaUid = uid;

    this.wargaTickets.set(uid, {
      patientCode: patient.code,
      hospitalId: rs.id,
      unit: cleanUnit,
      status: 'menunggu',
    });

    if (cleanUnit === 'poli') {
      rs.poliQueue.enqueue(patient);
    } else {
      rs.igdQueue.push(patient);
    }

    this._syncTreeAndStatuses(false);
    return { ticket: this.getWargaQueueStatus(uid) };
  }

  /**
   * Warga membatalkan antrean aktifnya (menghapus dari Queue Poli atau PriorityQueue IGD).
   */
  cancelWarga(uid) {
    const ticket = this.wargaTickets.get(uid);
    if (!ticket) return { error: 'Anda belum memiliki antrean aktif.' };

    const rs = this.hospitals.get(ticket.hospitalId);
    if (rs) {
      if (ticket.unit === 'poli') {
        rs.poliQueue.remove((p) => p.code === ticket.patientCode);
      } else {
        rs.igdQueue.remove((p) => p.code === ticket.patientCode);
      }
    }
    this.wargaTickets.delete(uid);
    this._syncTreeAndStatuses(false);
    return { ok: true };
  }

  /**
   * Mengembalikan status posisi & perkiraan waktu tunggu antrean warga.
   */
  getWargaQueueStatus(uid) {
    const ticket = this.wargaTickets.get(uid);
    if (!ticket) return null;
    const rs = this.hospitals.get(ticket.hospitalId);
    if (!rs) return null;

    if (ticket.status === 'dipanggil') {
      return {
        patientCode: ticket.patientCode,
        hospitalId: rs.id,
        hospitalName: rs.name,
        unit: ticket.unit,
        unitLabel: ticket.unit === 'igd' ? 'IGD' : 'Poli',
        position: 0,
        totalInQueue: 0,
        etaMin: 0,
        status: 'dipanggil',
      };
    }

    const list = ticket.unit === 'poli' ? rs.poliQueue.toArray() : rs.igdQueue.toArray();
    const idx = list.findIndex((p) => p.code === ticket.patientCode);
    if (idx === -1) {
      // Sudah masuk layanan atau selesai
      const inActive =
        rs.activeIgd.find((p) => p.code === ticket.patientCode) ||
        rs.activePoli.find((p) => p.code === ticket.patientCode);
      if (inActive) {
        ticket.status = 'dipanggil';
        return this.getWargaQueueStatus(uid);
      }
      this.wargaTickets.delete(uid);
      return null;
    }

    const position = idx + 1;
    const avgUnitMin = ticket.unit === 'poli' ? 15 : 30;
    const doctors = Math.max(1, ticket.unit === 'poli' ? rs.poliDoctors : rs.igdDoctors);
    const rawEta = (position * avgUnitMin) / doctors;
    const etaMin = Math.max(5, Math.round(rawEta / 5) * 5);

    return {
      patientCode: ticket.patientCode,
      hospitalId: rs.id,
      hospitalName: rs.name,
      unit: ticket.unit,
      unitLabel: ticket.unit === 'igd' ? 'IGD' : 'Poli',
      position,
      totalInQueue: list.length,
      etaMin,
      status: 'menunggu',
    };
  }

  /**
   * Petugas RS memanggil pasien berikutnya dari antrean IGD (PriorityQueue) atau Poli (Queue FIFO).
   */
  callNextPatient(hospitalId, unit = 'igd') {
    const rs = this.hospitals.get(hospitalId);
    if (!rs) return { error: 'Rumah sakit tidak ditemukan.' };

    if (unit === 'poli') {
      if (rs.activePoli.size() >= rs.poliDoctors) {
        return { error: 'Semua dokter sedang bertugas.' };
      }
      if (rs.poliQueue.isEmpty()) {
        return { error: 'Belum ada antrean di Poli.' };
      }
      const patient = rs.poliQueue.dequeue();
      const [minDur, maxDur] = SIM_CONFIG.poliDurationMin;
      const dur = this.rng.int(minDur, maxDur);
      patient.serviceStartedAt = this.simTime;
      patient.currentStage = 'layanan_poli';
      this._markWargaTicketCalled(patient);
      rs.activePoli.append(patient);
      this._schedule(this.simTime + dur, 'poli_finish', {
        hospitalId: rs.id,
        patientCode: patient.code,
      });
      this._syncTreeAndStatuses(false);
      return { patientCode: patient.code };
    }

    // IGD
    if (rs.activeIgd.size() >= rs.igdDoctors) {
      return { error: 'Semua dokter sedang bertugas.' };
    }
    if (rs.igdQueue.isEmpty()) {
      return { error: 'Belum ada antrean di IGD.' };
    }
    const patient = rs.igdQueue.pop();
    const waitMin = this.simTime - patient.arrivedAt;
    this.metrics.recordIgdWait(rs.id, patient.triage, waitMin);

    const [minDur, maxDur] = SIM_CONFIG.igdDurationMin[patient.triage] || [15, 30];
    const dur = this.rng.int(minDur, maxDur);
    patient.serviceStartedAt = this.simTime;
    patient.currentStage = 'layanan_igd';
    this._markWargaTicketCalled(patient);
    patient.journey.append({
      stage: 'layanan_igd',
      hospitalId: rs.id,
      enteredAt: this.simTime,
      exitedAt: this.simTime + dur,
    });
    rs.activeIgd.append(patient);
    this._schedule(this.simTime + dur, 'igd_finish', {
      hospitalId: rs.id,
      patientCode: patient.code,
    });
    this._syncTreeAndStatuses(false);
    return { patientCode: patient.code };
  }

  /**
   * Petugas RS memulangkan pasien yang sedang dilayani di IGD, Poli, Rawat Inap, atau ICU.
   */
  dischargePatient(hospitalId, patientCode) {
    const rs = this.hospitals.get(hospitalId);
    if (!rs) return { error: 'Rumah sakit tidak ditemukan.' };

    const patient =
      rs.activeIgd.removeWhere((p) => p.code === patientCode) ||
      rs.activePoli.removeWhere((p) => p.code === patientCode) ||
      rs.inpatientsInap.removeWhere((p) => p.code === patientCode) ||
      rs.inpatientsIcu.removeWhere((p) => p.code === patientCode);

    if (!patient) return { error: 'Pasien tidak ditemukan di daftar layanan RS ini.' };

    patient.currentStage = 'pulang';
    patient.journey.append({
      stage: 'pulang',
      hospitalId: rs.id,
      enteredAt: this.simTime,
      exitedAt: this.simTime,
    });
    this._clearWargaTicketIfMatch(patient);
    this._logEvent(
      'pulang',
      'info',
      rs.id,
      `Pasien ${patient.code} selesai dirawat dan pulang dari ${rs.name}.`
    );

    this._assignWaitingBeds(rs);
    this._syncTreeAndStatuses(false);
    return { ok: true, patientCode };
  }

  /**
   * Petugas RS mengubah kapasitas total tempat tidur (batas 0 sampai 2x kapasitas awal).
   * Masuk ke Stack Undo milik petugas.
   */
  setHospitalBeds(hospitalId, unit, total, { recordUndo = true, scopeKey } = {}) {
    const rs = this.hospitals.get(hospitalId);
    if (!rs) return { error: 'Rumah sakit tidak ditemukan.' };

    const isIcu = unit === 'icu';
    const baseCap = isIcu ? rs.bedsIcu : rs.bedsInap;
    const maxCap = baseCap * 2;
    const prevTotal = isIcu ? rs.bedsIcuTotal : rs.bedsInapTotal;
    const clamped = Math.max(0, Math.min(maxCap, Math.round(Number(total))));

    if (clamped === prevTotal) return { total: clamped };

    if (isIcu) rs.bedsIcuTotal = clamped;
    else rs.bedsInapTotal = clamped;

    if (recordUndo && scopeKey) {
      const unitLabel = isIcu ? 'ICU' : 'Rawat inap';
      const desc = `Ubah kapasitas ${unitLabel} ${rs.name} (${prevTotal} ke ${clamped})`;
      this.undoManager.record(scopeKey, desc, () => {
        this.setHospitalBeds(hospitalId, unit, prevTotal, { recordUndo: false });
      });
    }

    this._assignWaitingBeds(rs);
    this._syncTreeAndStatuses(false);
    return { total: clamped };
  }

  /**
   * Petugas RS mengalihkan pasien dari antrean IGD ke RS lain secara manual.
   * Masuk ke Stack Undo milik petugas (jika masih di antrean ambulans, dapat dibatalkan).
   */
  referPatientManual(hospitalId, patientCode, toHospitalId, { recordUndo = true, scopeKey } = {}) {
    const fromRs = this.hospitals.get(hospitalId);
    const toRs = this.hospitals.get(toHospitalId);
    if (!fromRs || !toRs || fromRs.id === toRs.id) {
      return { error: 'Rumah sakit tujuan tidak valid.' };
    }

    const route = this.graph.dijkstra(fromRs.id, toRs.id, (e) => this._edgeWeight(e));
    if (!route.found) {
      return { error: 'Tidak ada rute ke RS tujuan karena kedua jembatan ditutup.' };
    }

    const patient = fromRs.igdQueue.remove((p) => p.code === patientCode);
    if (!patient) {
      return { error: 'Pasien tidak ditemukan di antrean IGD.' };
    }

    patient.alreadyReferred = true;
    const travelMin = Math.max(2, Math.round(route.distance));
    const req = {
      patient,
      fromHospitalId: fromRs.id,
      toHospitalId: toRs.id,
      route,
      travelMin,
      neededUnit: null,
    };

    let dispatchedImmediately = false;
    if (!fromRs.freeAmbulances.isEmpty()) {
      this._dispatchAmbulance(fromRs, req);
      dispatchedImmediately = true;
    } else {
      fromRs.ambRequestQueue.enqueue(req);
      // Hanya masuk Stack Undo jika masih menunggu ambulans (ambulans yang sudah melaju tidak dibatalkan paksa)
      if (recordUndo && scopeKey) {
        const desc = `Alihkan ${patient.code} ke ${toRs.name}`;
        this.undoManager.record(scopeKey, desc, () => {
          const removedReq = fromRs.ambRequestQueue.remove(
            (r) => r.patient.code === patient.code
          );
          if (removedReq) {
            removedReq.patient.alreadyReferred = false;
            fromRs.igdQueue.push(removedReq.patient);
          }
        });
      }
    }

    this._syncTreeAndStatuses(false);
    return { ok: true, travelMin, dispatchedImmediately };
  }

  /**
   * Menambahkan pasien IGD sintetis secara manual (oleh Petugas RS atau Dinkes Super Admin).
   * Berguna untuk mendemokan langsung cara kerja PriorityQueue (Gawat langsung ke puncak).
   */
  addManualIgdPatient(hospitalId, triage = 'gawat') {
    const rs = this.hospitals.get(hospitalId);
    if (!rs) return { error: 'Rumah sakit tidak ditemukan.' };
    const cleanTriage = ['gawat', 'sedang', 'ringan'].includes(triage) ? triage : 'sedang';

    const patient = this._createPatient(cleanTriage, rs.id, 'igd');
    rs.igdQueue.push(patient);
    this._logEvent(
      'pasien_manual',
      cleanTriage === 'gawat' ? 'danger' : 'info',
      rs.id,
      `Pasien ${patient.code} (${TRIAGE_LABEL[cleanTriage]}) masuk antrean IGD ${rs.name}.`
    );
    this._syncTreeAndStatuses(true);
    return { ok: true, patientCode: patient.code };
  }

  // ==================== PAYLOAD SOCKET.IO ====================

  getBridgesState() {
    const out = [];
    for (const edge of this.graph.toArray().edges) {
      if (edge.meta?.bridge) {
        out.push({
          id: edge.id,
          name: edge.meta.name,
          closed: edge.closed,
        });
      }
    }
    return out;
  }

  getInitPayload() {
    return {
      cities: this.seedData.cities,
      nodes: this.seedData.nodes,
      edges: this.graph.toArray().edges.map((e) => ({
        ...e.meta,
        id: e.id,
        a: e.a,
        b: e.b,
        closed: e.closed,
      })),
      hospitals: this.getTickPayload().hospitals,
      regionTree: this.regionTree.toArray(),
      simTime: this.simTime,
      simTimeText: formatSimTime(this.simTime),
      speed: this.speed,
      paused: this.paused,
      policy: { autoReferral: this.autoReferral },
      bridges: this.getBridgesState(),
      activeOutbreaks: Array.from(this.outbreaks.keys()),
      activeReferrals: Array.from(this.activeReferrals.values()).slice(0, 5).map((r) => ({
        ...r,
        remainMin: Math.max(1, r.etaSimTime - this.simTime),
      })),
      undoInfo: this.undoManager.getInfo('dinkes'),
      kpi: this.getTickPayload().kpi,
    };
  }

  getTickPayload() {
    const totalAgg = this.getRegionAggregation('wilayah');
    const bedPct =
      totalAgg.bedsTotal > 0
        ? Math.round((totalAgg.bedsUsed / totalAgg.bedsTotal) * 100)
        : 0;

    const hospitals = [];
    for (const rs of this.hospitals.values()) {
      hospitals.push({
        id: rs.id,
        name: rs.name,
        city: rs.city,
        type: rs.type,
        x: rs.x,
        y: rs.y,
        status: rs.status,
        occupancyPct: rs.occupancyPct,
        inap: { used: rs.inpatientsInap.size(), total: rs.bedsInapTotal },
        icu: { used: rs.inpatientsIcu.size(), total: rs.bedsIcuTotal },
        igdQueue: rs.igdQueue.size(),
        igdBusy: rs.activeIgd.size(),
        igdDoctors: rs.igdDoctors,
        poliQueue: rs.poliQueue.size(),
        poliDoctors: rs.poliDoctors,
        ambFree: rs.freeAmbulances.size(),
        ambulances: rs.ambulances,
      });
    }

    const summary = this.metrics.getSummary(bedPct);

    return {
      simTime: this.simTime,
      simTimeText: formatSimTime(this.simTime),
      speed: this.speed,
      paused: this.paused,
      policy: { autoReferral: this.autoReferral },
      hospitals,
      bridges: this.getBridgesState(),
      activeOutbreaks: Array.from(this.outbreaks.keys()),
      activeReferrals: Array.from(this.activeReferrals.values()).slice(0, 5).map((r) => ({
        ...r,
        remainMin: Math.max(1, r.etaSimTime - this.simTime),
      })),
      undoInfo: this.undoManager.getInfo('dinkes'),
      kpi: {
        totalIgdQueue: totalAgg.igdQueue,
        waitAvg: summary.waitAvg,
        bedPct: summary.bedPct,
        referralsToday: summary.referralsToday,
        unreachableToday: summary.unreachableToday,
      },
    };
  }

  getHospitalDetail(hospitalId, { viewerUid = null, viewerScopeKey = null } = {}) {
    const rs = this.hospitals.get(hospitalId);
    if (!rs) return null;

    const queue = rs.igdQueue
      .toArray()
      .slice(0, 20)
      .map((p) => ({
        code: p.code,
        triage: p.triage,
        age: p.age,
        complaint: p.complaint,
        waitMin: Math.max(0, this.simTime - p.arrivedAt),
        isReferred: p.alreadyReferred,
        isMe: Boolean(viewerUid && p.wargaUid === viewerUid),
      }));

    const poliQueue = rs.poliQueue
      .toArray()
      .slice(0, 20)
      .map((p) => ({
        code: p.code,
        triage: p.triage,
        age: p.age,
        complaint: p.complaint,
        waitMin: Math.max(0, this.simTime - p.arrivedAt),
        isMe: Boolean(viewerUid && p.wargaUid === viewerUid),
      }));

    const activeIgd = rs.activeIgd.toArray().map((p) => ({
      code: p.code,
      unit: 'IGD',
      triage: p.triage,
      age: p.age,
      complaint: p.complaint,
      elapsedMin: Math.max(0, this.simTime - (p.serviceStartedAt || p.arrivedAt)),
    }));

    const activePoli = rs.activePoli.toArray().map((p) => ({
      code: p.code,
      unit: 'Poli',
      triage: p.triage,
      age: p.age,
      complaint: p.complaint,
      elapsedMin: Math.max(0, this.simTime - (p.serviceStartedAt || p.arrivedAt)),
    }));

    const inpatients = [
      ...rs.inpatientsIcu.toArray().slice(-8).map((p) => ({
        code: p.code,
        triage: p.triage,
        age: p.age,
        complaint: p.complaint,
        bedType: 'icu',
        stayMin: Math.max(0, this.simTime - (p.admittedAt || p.arrivedAt)),
      })),
      ...rs.inpatientsInap.toArray().slice(-12).map((p) => ({
        code: p.code,
        triage: p.triage,
        age: p.age,
        complaint: p.complaint,
        bedType: 'inap',
        stayMin: Math.max(0, this.simTime - (p.admittedAt || p.arrivedAt)),
      })),
    ];

    const referralCandidates = [];
    for (const cand of this.hospitals.values()) {
      if (cand.id === rs.id) continue;
      const route = this.graph.dijkstra(rs.id, cand.id, (e) => this._edgeWeight(e));
      referralCandidates.push({
        id: cand.id,
        name: cand.name,
        status: cand.status,
        occupancyPct: cand.occupancyPct,
        reachable: route.found,
        travelMin: route.found ? Math.max(2, Math.round(route.distance)) : null,
      });
    }

    const events = rs.eventLog.toArray().slice(-15).reverse();

    return {
      hospitalId: rs.id,
      baseCaps: { inap: rs.bedsInap, icu: rs.bedsIcu },
      queue,
      poliQueue,
      activeIgd,
      activePoli,
      inpatients,
      referralCandidates,
      undoInfo: viewerScopeKey ? this.undoManager.getInfo(viewerScopeKey) : null,
      events,
    };
  }

  /**
   * Mengembalikan profil sintetis lengkap + jejak perjalanan pasien (dari LinkedList PatientJourney).
   */
  getPatientDetail(patientCode) {
    const p = this.patientRegistry.get(patientCode);
    if (!p) return null;

    const currentRs = this.hospitals.get(p.currentHospitalId);
    const journey = p.journey.toArray().map((step, idx) => {
      const rs = this.hospitals.get(step.hospitalId);
      const toRs = step.toHospitalId ? this.hospitals.get(step.toHospitalId) : null;
      return {
        index: idx + 1,
        stage: step.stage,
        stageLabel: STAGE_LABEL[step.stage] || step.stage,
        hospitalName: rs ? rs.name : step.hospitalId,
        toHospitalName: toRs ? toRs.name : null,
        enteredAt: step.enteredAt,
        timeText: formatSimTime(step.enteredAt),
      };
    });

    return {
      code: p.code,
      triage: p.triage,
      age: p.age,
      complaint: p.complaint,
      unit: p.unit,
      currentStage: p.currentStage,
      currentStageLabel: STAGE_LABEL[p.currentStage] || 'Menunggu di antrean',
      currentHospitalId: p.currentHospitalId,
      currentHospitalName: currentRs ? currentRs.name : '-',
      waitMin: Math.max(0, this.simTime - p.arrivedAt),
      isReferred: p.alreadyReferred,
      journeyLength: p.journey.size(),
      journey,
    };
  }
}
