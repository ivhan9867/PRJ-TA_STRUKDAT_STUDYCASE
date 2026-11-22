# 03 · ARSITEKTUR, SIMULASI, DAN STRUKTUR DATA

## 1. Arsitektur

```
 Browser (React)                    Server Node (satu-satunya pemilik simulasi)           Firebase
┌──────────────────┐   Socket.IO   ┌──────────────────────────────────────────┐   ┌──────────────┐
│ Peta, kartu,     │◄─────────────►│ Engine simulasi (tick)                    │   │ Auth         │
│ halaman peran    │  event + token│  ├ EventScheduler (priority queue)        │   │ Firestore:   │
│ animasi lokal    │               │  ├ Antrean IGD, Poli, Ambulans            │◄─►│  users       │
└──────────────────┘               │  ├ Graph jalan (Dijkstra/BFS)             │   │  hospitals   │
        ▲                          │  ├ Tree wilayah + rekursi                 │   │  events      │
        │ login (ID token)         │  ├ Stack undo, LinkedList perjalanan      │   │  runs        │
        └──────────────────────────┤  └ Pemeriksa peran (firebase-admin)       │   └──────────────┘
                                   └──────────────────────────────────────────┘
```

Prinsip:
- Server menyimpan keadaan langsung di memori (di sinilah struktur data bekerja). Browser tidak menjalankan simulasi.
- Server mengirim **ringkasan keadaan tiap 250 ms** dan **event** untuk kejadian penting. Posisi ambulans dan pasien tidak dikirim per tick: server mengirim jalur dan durasi sekali, browser menganimasikannya.
- Firebase menyimpan akun, peran, konfigurasi RS, kejadian penting, dan hasil eksperimen.

## 2. Dunia seed (`shared/world.seed.json`)

Gunakan **persis** data ini. Koordinat dalam piksel SVG (viewBox 1600x900). Konversi: 1 piksel = 0,0125 km. Kecepatan ambulans 60 km/jam = 80 piksel per menit simulasi.

```json
{
  "cities": [
    { "id": "surya", "name": "Surya", "labelAt": [350, 130], "bounds": [0, 0, 700, 900] },
    { "id": "tirta", "name": "Tirta", "labelAt": [1250, 130], "bounds": [900, 0, 1600, 900] }
  ],
  "nodes": [
    { "id": "rs_surya_utama",   "kind": "hospital", "city": "surya", "x": 230,  "y": 250 },
    { "id": "rs_surya_timur",   "kind": "hospital", "city": "surya", "x": 560,  "y": 190 },
    { "id": "rs_surya_barat",   "kind": "hospital", "city": "surya", "x": 230,  "y": 650 },
    { "id": "j_s1", "kind": "junction", "city": "surya", "x": 400, "y": 250 },
    { "id": "j_s2", "kind": "junction", "city": "surya", "x": 400, "y": 450 },
    { "id": "j_s3", "kind": "junction", "city": "surya", "x": 400, "y": 650 },
    { "id": "j_s4", "kind": "junction", "city": "surya", "x": 560, "y": 450 },
    { "id": "jb_s_utara",   "kind": "bridgeEnd", "city": "surya", "x": 700, "y": 300 },
    { "id": "jb_s_selatan", "kind": "bridgeEnd", "city": "surya", "x": 700, "y": 600 },

    { "id": "rs_tirta_raya",    "kind": "hospital", "city": "tirta", "x": 1370, "y": 300 },
    { "id": "rs_tirta_utara",   "kind": "hospital", "city": "tirta", "x": 1060, "y": 170 },
    { "id": "rs_tirta_selatan", "kind": "hospital", "city": "tirta", "x": 1050, "y": 660 },
    { "id": "j_t1", "kind": "junction", "city": "tirta", "x": 1200, "y": 300 },
    { "id": "j_t2", "kind": "junction", "city": "tirta", "x": 1200, "y": 480 },
    { "id": "j_t3", "kind": "junction", "city": "tirta", "x": 1200, "y": 650 },
    { "id": "jb_t_utara",   "kind": "bridgeEnd", "city": "tirta", "x": 900, "y": 300 },
    { "id": "jb_t_selatan", "kind": "bridgeEnd", "city": "tirta", "x": 900, "y": 600 }
  ],
  "edges": [
    { "id": "e_s1",  "a": "rs_surya_utama", "b": "j_s1" },
    { "id": "e_s2",  "a": "j_s1", "b": "j_s2" },
    { "id": "e_s3",  "a": "j_s2", "b": "j_s3" },
    { "id": "e_s4",  "a": "rs_surya_barat", "b": "j_s3" },
    { "id": "e_s5",  "a": "rs_surya_timur", "b": "j_s1" },
    { "id": "e_s6",  "a": "rs_surya_timur", "b": "jb_s_utara" },
    { "id": "e_s7",  "a": "j_s2", "b": "j_s4" },
    { "id": "e_s8",  "a": "j_s4", "b": "jb_s_utara" },
    { "id": "e_s9",  "a": "j_s4", "b": "jb_s_selatan" },
    { "id": "e_s10", "a": "j_s3", "b": "jb_s_selatan" },

    { "id": "e_t1", "a": "rs_tirta_raya", "b": "j_t1" },
    { "id": "e_t2", "a": "rs_tirta_utara", "b": "j_t1" },
    { "id": "e_t3", "a": "rs_tirta_utara", "b": "jb_t_utara" },
    { "id": "e_t4", "a": "j_t1", "b": "jb_t_utara" },
    { "id": "e_t5", "a": "j_t1", "b": "j_t2" },
    { "id": "e_t6", "a": "j_t2", "b": "j_t3" },
    { "id": "e_t7", "a": "rs_tirta_selatan", "b": "j_t3" },
    { "id": "e_t8", "a": "j_t2", "b": "jb_t_selatan" },
    { "id": "e_t9", "a": "j_t3", "b": "jb_t_selatan" },

    { "id": "e_jembatan_utara",   "a": "jb_s_utara",   "b": "jb_t_utara",   "bridge": true, "name": "Jembatan Utara" },
    { "id": "e_jembatan_selatan", "a": "jb_s_selatan", "b": "jb_t_selatan", "bridge": true, "name": "Jembatan Selatan" }
  ],
  "hospitals": [
    { "id": "rs_surya_utama",   "name": "RS Surya Utama",   "city": "surya", "type": "A", "igdDoctors": 6, "poliDoctors": 4, "bedsInap": 60, "bedsIcu": 12, "ambulances": 2 },
    { "id": "rs_surya_timur",   "name": "RS Surya Timur",   "city": "surya", "type": "B", "igdDoctors": 4, "poliDoctors": 3, "bedsInap": 30, "bedsIcu": 6,  "ambulances": 1 },
    { "id": "rs_surya_barat",   "name": "RS Surya Barat",   "city": "surya", "type": "C", "igdDoctors": 2, "poliDoctors": 2, "bedsInap": 12, "bedsIcu": 0,  "ambulances": 1 },
    { "id": "rs_tirta_raya",    "name": "RS Tirta Raya",    "city": "tirta", "type": "A", "igdDoctors": 6, "poliDoctors": 4, "bedsInap": 55, "bedsIcu": 10, "ambulances": 2 },
    { "id": "rs_tirta_utara",   "name": "RS Tirta Utara",   "city": "tirta", "type": "C", "igdDoctors": 2, "poliDoctors": 2, "bedsInap": 12, "bedsIcu": 0,  "ambulances": 1 },
    { "id": "rs_tirta_selatan", "name": "RS Tirta Selatan", "city": "tirta", "type": "B", "igdDoctors": 4, "poliDoctors": 3, "bedsInap": 28, "bedsIcu": 6,  "ambulances": 1 }
  ],
  "regionTree": {
    "id": "wilayah", "name": "Wilayah Simpul Sehat", "level": "wilayah",
    "children": ["(otomatis dibangun dari cities, hospitals; tiap RS punya anak: igd, poli, rawat_inap, icu)"]
  }
}
```

Catatan: `regionTree` dibangun oleh kode dari `cities` dan `hospitals`, tidak ditulis manual. Panjang edge dihitung dari jarak Euclid koordinat dua simpulnya.

## 3. Aturan simulasi

**Waktu:** 1 tick = 1 menit simulasi. Kecepatan 1x = 1 tick per detik nyata (1 jam simulasi = 1 menit nyata). Pilihan 1x, 5x, 10x. Simulasi mulai Hari 1, 06.00. Semua parameter ada di `server/src/sim/config.js`. Pakai generator acak berseed (mulberry32) supaya hasil bisa diulang.

**Kedatangan pasien (NPC):**
- Pasien darurat (IGD): proses Poisson per kota. Laju dasar: Surya 6 per jam, Tirta 5 per jam, dikali pengali jam: 00 sampai 05 = 0,4; 06 sampai 10 = 1,0; 11 sampai 15 = 1,3; 16 sampai 20 = 1,1; 21 sampai 23 = 0,7.
- Pasien poli (rawat jalan): 1,5 kali laju IGD per kota, selalu dengan triase Ringan.
- Asal pasien: simpul persimpangan acak di kotanya. Pasien berjalan ke RS terdekat (waktu tempuh Dijkstra) di kota yang sama; tiba, lalu masuk antrean pada waktu tiba.
- Triase pasien darurat: Ringan 55 persen, Sedang 33 persen, Gawat 12 persen.
- Kode pasien: `P-0001`, `P-0002`, dan seterusnya (sintetis).

**Layanan IGD:** antrean prioritas (Gawat dulu, lalu Sedang, lalu Ringan; sama tingkat: yang datang lebih dulu). Setiap dokter IGD melayani satu pasien. Durasi (menit, acak seragam): Ringan 15 sampai 30, Sedang 30 sampai 60, Gawat 45 sampai 90.

**Hasil setelah IGD:**

| Triase | Pulang | Rawat inap | ICU |
|---|---|---|---|
| Ringan | 95% | 5% | 0% |
| Sedang | 55% | 45% | 0% |
| Gawat | 0% | 40% | 60% |

Lama rawat (menit simulasi, seragam): rawat inap 720 sampai 4320 (12 sampai 72 jam); ICU 720 sampai 4320.
Jika pasien butuh ICU tetapi RS tidak punya ICU atau ICU penuh, pasien harus dirujuk. Jika butuh rawat inap tetapi penuh, pasien juga harus dirujuk.

**Layanan poli:** antrean biasa (FIFO). Durasi 10 sampai 25 menit. Setelah selesai pasien pulang.

**Keadaan awal:** tempat tidur terisi acak 40 sampai 55 persen (rawat inap dan ICU), pasien-pasien awal diberi sisa lama rawat acak.

**Status RS** (untuk warna): lihat file 01 bagian 2. Dihitung ulang tiap tick.

**Kebijakan rujukan otomatis (saklar Dinkes, awal: Aktif):**
Jika Aktif, rujukan dibuat bila salah satu terjadi:
1. **Saat triase:** pasien Sedang atau Gawat, dan antrean IGD RS itu sudah sebanyak atau lebih dari 2 kali jumlah dokter IGD, dan ada RS kandidat yang lebih longgar.
2. **Saat selesai IGD:** pasien butuh rawat inap atau ICU tetapi tidak tersedia (lihat atas).

Jika Nonaktif: pasien tetap menunggu di RS terdekat. Bila perlu tempat tidur yang penuh, ia menunggu sampai ada yang kosong (bila perlu ICU dan RS tidak punya ICU, pasien dirawat inap biasa jika ada tempat).

**Memilih RS tujuan:**
1. Kandidat: RS selain asal yang statusnya bukan Penuh, punya tempat untuk unit yang dibutuhkan (ICU harus punya ICU kosong), dan terjangkau di graph (jembatan tertutup dikeluarkan dari graph).
2. Pilih yang waktu tempuhnya (Dijkstra) paling kecil. Seri: pilih yang tingkat penuhnya lebih rendah.
3. Jika tidak ada kandidat atau tidak ada rute: pasien tetap menunggu, kejadian "Tidak ada rute" dicatat, hitung ke metrik "Pasien belum bisa dirujuk" (satu kali per pasien).

**Bobot edge:** `waktuTempuh (menit) = panjangPx / 80 x faktorLalin`. `faktorLalin = 1 + 0,2 x min(jumlah ambulans di edge, 5)`. Edge jembatan yang ditutup tidak ikut dihitung (dihapus dari pencarian, bukan bobot tak hingga).

**Ambulans:**
- Tiap RS punya ambulans sesuai seed, status Siaga.
- Rujukan membutuhkan satu ambulans dari RS asal. Jika tidak ada yang siaga: permintaan masuk **Queue FIFO permintaan ambulans** milik RS asal; saat ambulans kembali, permintaan teratas dilayani.
- Alur status: Siaga, Menjemput (hanya jika pasien bukan di RS; pada versi ini pasien sudah di RS asal sehingga langsung Mengantar), Mengantar, Kembali, Siaga.
- Di RS tujuan: pasien masuk antrean IGD tujuan sebagai pasien rujukan (prioritas sesuai triase, kode tetap). Setelah layanan, hasil mengikuti tabel hasil di atas. Pasien rujukan tidak dirujuk lagi.

**Skenario:**
- **Wabah di kota X:** laju kedatangan kota X dikali 4 selama 360 menit simulasi.
- **Kecelakaan massal di RS Y:** 12 pasien tiba pada tick berikutnya di RS Y (triase: Gawat 40 persen, Sedang 40 persen, Ringan 20 persen).
- **Tutup/buka jembatan:** mengubah `closed` pada edge jembatan. Ambulans yang sedang di jembatan menyelesaikan perjalanannya.
- **Rujukan otomatis Aktif/Nonaktif.**
- **Mulai ulang:** membangun ulang keadaan awal, mengosongkan stack undo dan log.

**Target kalibrasi (diuji otomatis di fase 3 dan 4):**
- Baseline 24 jam simulasi: tidak ada RS yang berstatus Penuh terus-menerus lebih dari 2 jam berturut-turut.
- Wabah di satu kota (Rujukan Aktif): minimal satu RS di kota itu Penuh dalam 4 jam simulasi, dan minimal 3 rujukan lintas jembatan terjadi.
- Wabah dengan Rujukan Nonaktif: waktu tunggu rata-rata IGD lebih besar daripada dengan Rujukan Aktif pada seed yang sama.
Jika target tidak tercapai, sesuaikan parameter di `config.js` dan catat di `docs/DECISIONS.md`.

**Metrik** (`server/src/sim/metrics.js`): waktu tunggu IGD (rata-rata, dan rata-rata pasien Gawat), keterisian tempat tidur per kota dan per RS (tiap 15 menit simulasi disimpan untuk grafik, simpan maksimal 96 titik terakhir), jumlah rujukan, jumlah pasien belum bisa dirujuk, waktu rujukan rata-rata.

## 4. Struktur data (`server/src/ds/`)

Semua ditulis sendiri sebagai class, dengan komentar singkat berbahasa Indonesia di atas class (fungsi, alasan, kelemahan). Setiap struktur punya `size()`, `isEmpty()`, `toArray()` (untuk visualisasi) kecuali dinyatakan lain.

| File | Class | Operasi wajib | Kompleksitas |
|---|---|---|---|
| `Stack.js` | `Stack` (array, dengan batas `maxSize`, default 100; jika penuh, elemen paling bawah dibuang) | `push`, `pop`, `peek`, `clear` | semua O(1) (kecuali pembuangan elemen bawah O(n), jarang terjadi) |
| `Queue.js` | `Queue` (linked/circular buffer; tanpa `shift`) | `enqueue`, `dequeue`, `peek`, `remove(predicate)` | enqueue/dequeue/peek O(1); remove O(n) |
| `PriorityQueue.js` | `PriorityQueue` (binary min-heap, `compare(a, b)` dari luar) | `push`, `pop`, `peek`, `remove(predicate)` | push/pop O(log n); peek O(1); remove O(n) |
| `LinkedList.js` | `LinkedList` (singly dengan pointer `tail`) | `append`, `prepend`, `removeFirst`, `removeWhere(predicate)`, `find(predicate)`, `forEach` | append/prepend/removeFirst O(1); find/removeWhere O(n) |
| `Tree.js` | `TreeNode`, `Tree` (n-ary) | `addChild`, `find` (rekursif), `preorder`, `postorder`, `levelOrder`, `height` | semua O(n) |
| `recursion.js` | fungsi rekursif | lihat bawah | lihat bawah |
| `Graph.js` | `Graph` (adjacency list dengan `Map`) | `addNode`, `addEdge`, `setEdgeClosed`, `neighbors`, `dijkstra`, `bfs` | Dijkstra O((V+E) log V); BFS O(V+E) |

**Fungsi rekursif (`recursion.js`):**
- `aggregate(node, leafFn, combineFn)`: menggabungkan nilai dari daun ke akar (postorder). Dipakai untuk total kapasitas, total terisi, dan total antrean per kota dan per wilayah.
- `findPath(tree, id)`: jalur dari akar ke simpul (misal `Wilayah, Tirta, RS Tirta Raya, ICU`) untuk teks "breadcrumb".
- `countNodes(node)`, `flatten(node)`.
- `allSimplePaths(graph, from, to, maxHops)`: semua jalur sederhana antar dua simpul dengan backtracking rekursif (tanpa mengulang simpul, batas `maxHops` = 12), mengabaikan edge tertutup. Dipakai untuk "Tampilkan semua rute" dan untuk menunjukkan rute alternatif saat jembatan ditutup. Kompleksitas eksponensial pada kasus terburuk, tetapi aman pada graph kecil ini.

**Di mana dipakai (harus benar-benar terhubung ke simulasi):**

| Struktur | Pemakaian nyata |
|---|---|
| Stack | `UndoManager`: tiap aksi manual (ubah kapasitas, alihkan pasien, tutup/buka jembatan, picu skenario manual) mendorong objek `{description, undo()}`. Undo = pop lalu jalankan `undo()`. Satu stack per petugas, satu stack global untuk Dinkes. Hanya aksi yang bisa dibalik yang masuk (wabah dan kecelakaan yang sudah terjadi tidak bisa dibatalkan; tombol Skenario menampilkan keterangan itu). |
| Queue | Antrean poli per RS (FIFO); antrean permintaan ambulans per RS (FIFO); antrean pendaftaran warga mengikuti antrean poli atau IGD. |
| PriorityQueue | Antrean IGD per RS (kunci: tingkat triase lalu waktu datang); `EventScheduler` global (kunci: waktu simulasi) untuk kedatangan pasien, akhir layanan, kedatangan ambulans, akhir lama rawat. |
| LinkedList | `PatientJourney` (satu per pasien: simpul `{tahap, rsId, masuk, keluar}` ditambah di ekor); log kejadian per RS (maksimal 200, hapus dari kepala); daftar ambulans siaga per RS (ambil dari kepala, kembalikan ke ekor); daftar pasien sedang dirawat inap (hapus di tengah saat pulang). |
| Rekursif | Agregasi pohon wilayah; breadcrumb; `allSimplePaths` untuk rute alternatif. |
| Tree | `RegionTree`: wilayah, kota, RS, unit (IGD, Poli, Rawat inap, ICU). Menyimpan kapasitas dan terisi di daun, hasil agregasi di simpul atas. Dipakai kartu ringkasan, Analitik, dan Mode Akademik. |
| Graph | Jalan dan jembatan; Dijkstra untuk waktu tempuh dan jalur rujukan dan jalan pasien NPC; BFS untuk jumlah lompatan RS terdekat (ditampilkan di Mode Akademik) dan untuk memeriksa keterjangkauan. |

**Tes (`server/test/`):** minimal 6 tes per struktur: kosong, satu elemen, urutan benar, batas (Stack penuh), operasi hapus di tengah, dan kasus khusus (Graph tanpa rute, edge tertutup). Tes simulasi: kalibrasi di bagian 3, determinisme dengan seed sama, ambulans tidak melewati jembatan tertutup.

## 5. Protokol Socket.IO

**Koneksi:** client mengirim `auth: { token: <Firebase ID token> }`. Server memverifikasi dengan `firebase-admin`, membaca `users/{uid}` (peran dan `rsId`, di-cache 60 detik), lalu menolak koneksi tanpa token valid.

**Server ke client:**

| Event | Isi |
|---|---|
| `world:init` | graph (node, edge, panjang), RS (config), pohon wilayah, pengaturan, `simTime`, `speed`, `paused`, `policy`, status jembatan, profil pengguna |
| `world:tick` (tiap 250 ms) | `simTime`, ringkasan tiap RS `{id, status, inap:{used,total}, icu:{used,total}, igdQueue, igdBusy, poliQueue, ambFree}`, KPI `{waitAvg, bedPct, referralsToday, unreachableToday}`, status jembatan |
| `walkin:spawn` | `{id, fromNode, path:[nodeId], durationMs, triage, toHospital}` |
| `ambulance:dispatch` | `{id, from, to, path:[nodeId], durationMs, triage, patientCode}` |
| `ambulance:arrive` | `{id, hospitalId}` |
| `log:event` | `{id, simTime, type, severity, hospitalId?, message}` |
| `queue:me` | untuk warga: `{hospitalId, unit, position, etaMin, status}` |
| `hospital:detail` | balasan permintaan: daftar antrean (maks 20), sedang dilayani, kejadian terakhir |
| `error:permission` | `{message}` |

**Client ke server** (server selalu memeriksa peran, dan petugas hanya untuk `rsId` miliknya):

| Event | Peran | Isi |
|---|---|---|
| `sim:control` | dinkes | `{action: 'play'|'pause'|'speed', value?}` |
| `sim:reset` | dinkes | |
| `policy:set` | dinkes | `{autoReferral: boolean}` |
| `scenario:trigger` | dinkes | `{type: 'wabah'|'kecelakaan', cityId?|hospitalId?}` |
| `bridge:set` | dinkes | `{edgeId, closed}` |
| `undo` | petugas, dinkes | |
| `hospital:request` | semua | `{hospitalId}` (membalas `hospital:detail`) |
| `hospital:callNext` | petugas | `{unit: 'igd'|'poli'}` |
| `hospital:discharge` | petugas | `{patientCode}` |
| `hospital:setBeds` | petugas | `{unit: 'inap'|'icu', total}` |
| `patient:referManual` | petugas | `{patientCode, toHospitalId}` |
| `warga:register` | warga | `{hospitalId, unit: 'igd'|'poli'}` |
| `warga:cancel` | warga | |
| `academic:run` | semua | `{kind: 'experiment'|'benchmark', params}` (dibatasi satu proses sekaligus) |

## 6. Skema Firebase

**Authentication:** email dan kata sandi, serta Google.

**Firestore:**

```
users/{uid}
  displayName: string
  email: string
  role: "warga" | "petugas" | "dinkes"      // default "warga"
  hospitalId: string | null                  // hanya untuk petugas
  createdAt: timestamp

hospitals/{hospitalId}                       // diisi dari seed saat server pertama jalan
  name, city, type, igdDoctors, poliDoctors, bedsInap, bedsIcu, ambulances

events/{autoId}                              // hanya kejadian penting, ditulis server
  simTime: number, type: string, hospitalId: string|null, message: string, createdAt: timestamp

runs/{autoId}                                // hasil eksperimen, ditulis server
  scenario, policy, seed, days, metrics: map, createdAt: timestamp
```

**`firestore.rules`:**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function role() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    match /users/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || role() == 'dinkes');
      allow create: if request.auth != null && request.auth.uid == uid
        && request.resource.data.role == 'warga'
        && request.resource.data.hospitalId == null;
      allow update: if request.auth != null && role() == 'dinkes' && request.auth.uid != uid;
    }
    match /hospitals/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /events/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /runs/{id} {
      allow read: if request.auth != null && role() == 'dinkes';
      allow write: if false;
    }
  }
}
```

(Server memakai Admin SDK sehingga melewati aturan; aturan melindungi akses langsung dari browser.)

**Akun dinkes pertama:** dibuat manual lewat Firebase Console (ubah `role` jadi `dinkes`). Sediakan skrip `server/scripts/seed-demo-users.js` untuk membuat akun demo: 1 dinkes, 3 petugas (Surya Utama, Tirta Raya, Tirta Selatan), 1 warga; kata sandi demo ditulis di README dan jelas ditandai hanya untuk demo.

## 7. Batas penulisan Firestore (kuota gratis)

- Jangan menulis keadaan simulasi per tick.
- `events`: tulis hanya tipe `rujukan`, `rs_penuh`, `wabah`, `kecelakaan`, `jembatan`, `tidak_ada_rute`, `undo`, dan batasi maksimal 1 tulisan per 2 detik nyata (sisanya dibuang dari Firestore, tetap ada di log memori).
- `runs`: satu tulisan per kombinasi eksperimen selesai.
- `users` dan `hospitals`: hanya saat daftar, ubah peran, dan seed awal.
- Cache profil pengguna di server selama 60 detik agar tidak membaca Firestore tiap perintah.

## 8. Privasi dan etika

- Semua pasien adalah data sintetis dengan kode `P-xxxx`. Tidak ada nama, NIK, atau data medis asli.
- Warga asli hanya tersimpan sebagai akun Firebase (nama tampilan, email). Tab antrean menampilkan kode pasien, bukan nama.
- Dokumentasikan di README bagian "Data dan etika": sumber data (sintetis), pustaka pihak ketiga yang dipakai dan lisensinya, serta bahwa parameter simulasi adalah asumsi, bukan data resmi.
