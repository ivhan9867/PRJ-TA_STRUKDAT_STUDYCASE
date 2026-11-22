# Simpul Sehat

Aplikasi web simulasi sistem rujukan rumah sakit antar-kota yang dibangun untuk Proyek Akhir Mata Kuliah Struktur Data, Program Studi S1 Pendidikan Teknologi Informasi, Universitas Negeri Surabaya.

**Demo daring (GitHub Pages):** https://ivhan9867.github.io/PRJ-TA_STRUKDAT_STUDYCASE/

---

## Ringkasan Proyek

Simpul Sehat memodelkan layanan kesehatan pada dua kota yang dipisahkan oleh sungai (**Kota Surya** dan **Kota Tirta**) dengan **7 rumah sakit** (termasuk **RS Pusat Nusantara Tipe A+**), **19 simpul jaringan jalan**, dan **24 ruas jalan** yang dihubungkan oleh dua jembatan (**Jembatan Utara** dan **Jembatan Selatan**).

Permasalahan yang diselesaikan adalah ketimpangan beban layanan darurat: pasien kerap menunggu lama di IGD rumah sakit yang sedang penuh, sementara rumah sakit di kota tetangga masih memiliki kapasitas tempat tidur dan tenaga medis. Sistem ini mendeteksi kepadatan secara langsung dan merujuk pasien secara otomatis ke rumah sakit terdekat yang masih tersedia melalui rute tercepat.

Kontribusi terhadap **SDG 3 (Kehidupan Sehat dan Sejahtera)**—khususnya **Target 3.8** (akses layanan kesehatan merata) dan **Target 3.d** (peringatan dini serta manajemen risiko krisis kesehatan)—dievaluasi secara kuantitatif melalui fitur **Eksperimen A/B** yang membandingkan rata-rata waktu tunggu pasien dengan dan tanpa mekanisme rujukan otomatis.

---

## Arsitektur Sistem

```text
├── client/          Frontend React 19, Vite, Tailwind CSS, Canvas 60 fps, Recharts
├── server/
│   └── src/
│       ├── ds/      7 implementasi struktur data mandiri (tanpa pustaka eksternal)
│       ├── sim/     Mesin simulasi berbasis kejadian, kalibrasi, eksperimen A/B
│       ├── auth/    Autentikasi multi-peran dan pengaman hak akses
│       └── socket/  Sinkronisasi real-time Socket.IO & REST API
├── shared/          Data peta (world.seed.json), konstanta, generator pemukiman
├── docs/            Catatan keputusan teknis (DECISIONS.md)
└── firestore.rules  Aturan keamanan Firestore berbasis peran
```

Aplikasi mendukung dua mode operasi:
1. **Mode Server Lokal / Produksi:** Backend Express + Socket.IO berjalan di Node.js (`port 3001`), frontend dilayani via Vite (`port 5173`) atau langsung dari `client/dist`.
2. **Mode Statis (GitHub Pages):** Mesin simulasi (`SimulationEngine`) dijalankan langsung di peramban menggunakan adapter lokal sehingga seluruh fitur simulasi, analitik, dan Mode Akademik tetap berfungsi tanpa server eksternal.

---

## Implementasi Struktur Data

Seluruh struktur data inti ditulis mandiri di `server/src/ds/` tanpa memanfaatkan pustaka struktur data eksternal maupun `Array.prototype.shift` untuk antrean.

| Struktur Data | Berkas | Penerapan pada Sistem | Kompleksitas Operasi Utama |
|---|---|---|---|
| **Stack** | `server/src/ds/Stack.js` | Riwayat pembatalan aksi (*Undo*) per Dinkes dan per Petugas RS (`UndoManager`, kapasitas maks. 100 aksi). | `push`, `pop`, `peek`: **O(1)** |
| **Queue** | `server/src/ds/Queue.js` | Antrean Poli rawat jalan (FIFO) dan antrean permintaan ambulans per RS, dibangun dengan simpul berantai (`head`, `tail`). | `enqueue`, `dequeue`, `peek`: **O(1)**; `remove`: **O(n)** |
| **Priority Queue** | `server/src/ds/PriorityQueue.js` | Antrean IGD berbasis tingkat kegawatan (Gawat, Sedang, Ringan), `EventScheduler` simulasi, dan antrean pencarian Dijkstra (Binary Min-Heap). | `push`, `pop`: **O(log n)**; `peek`: **O(1)** |
| **Linked List** | `server/src/ds/LinkedList.js` | Riwayat tahapan pasien (`PatientJourney`), log kejadian RS (maks. 200), daftar ambulans siaga, dan daftar pasien rawat inap aktif. | `append`, `prepend`, `removeFirst`: **O(1)**; `find`, `removeWhere`: **O(n)** |
| **Tree** | `server/src/ds/Tree.js` | Hierarki wilayah kesehatan 4 tingkat (`RegionTree`: Wilayah → Kota → Rumah Sakit → Unit). | `find`, `preorder`, `postorder`, `levelOrder`, `height`: **O(n)** |
| **Rekursif** | `server/src/ds/recursion.js` | Agregasi kapasitas *postorder* (`aggregate`), jalur *breadcrumb* (`findPath`), dan pencarian rute alternatif (`allSimplePaths`, batas `maxHops = 12`). | Traversal pohon: **O(n)**; backtracking rute dibatasi kedalaman |
| **Graph** | `server/src/ds/Graph.js` | Jaringan jalan dua kota berbasis *adjacency list* (`Map`), pencarian rute tercepat berbobot lalu lintas dinamis (**Dijkstra**), keterjangkauan (**BFS**), dan penutupan jembatan dinamis. | `dijkstra`: **O((V + E) log V)**; `bfs`: **O(V + E)**; `setEdgeClosed`: **O(1)** |

---

## Hak Akses Pengguna

Sistem membagi pengguna ke dalam tiga peran dengan verifikasi token pada setiap permintaan API maupun event Socket.IO:

| Peran | Akun Uji (`sandi: demo1234`) | Kewenangan |
|---|---|---|
| **Dinas Kesehatan (Super Admin)** | `dinkes@simpulsehat.demo` | Mengendalikan waktu simulasi (`1x/5x/10x`, jeda), memicu skenario (wabah satu kota, wabah kedua kota, kecelakaan massal), membuka/menutup jembatan, mengatur rujukan otomatis, mengelola seluruh 7 rumah sakit, melihat analitik, mengelola peran pengguna, dan membuka Mode Akademik. |
| **Petugas RS** | `petugas.surya@simpulsehat.demo`<br>`petugas.tirta@simpulsehat.demo`<br>`petugas.selatan@simpulsehat.demo` | Memantau peta, memanggil pasien IGD/Poli, menambah pasien IGD manual, memulangkan pasien, mengalihkan pasien ke RS lain, serta mengubah kapasitas tempat tidur dan jumlah armada ambulans (dengan fitur Undo) pada rumah sakit penugasannya. |
| **Warga** | `warga@simpulsehat.demo` | Melihat ketersediaan RS pada peta, mendaftar antrean IGD/Poli, memantau posisi antrean serta estimasi waktu tunggu secara langsung, membatalkan antrean, dan mengakses Mode Akademik. |

---

## Instalasi dan Penggunaan Lokal

### Prasyarat
- Node.js versi 20 atau lebih baru.

### Menjalankan Aplikasi
```bash
# Memasang dependensi root, server, dan client
npm run install:all

# Menjalankan server (port 3001) dan client (port 5173)
npm run dev
```
Akses aplikasi melalui peramban pada alamat `http://localhost:5173`.

### Menjalankan Pengujian Otomatis
```bash
npm test
```
Rangkaian pengujian (`node:test`) mencakup **65 kasus uji** yang memverifikasi seluruh struktur data, algoritma graf, kalibrasi simulasi 24 jam, otorisasi peran, penyesuaian armada ambulans, dan eksperimen A/B.

### Konfigurasi Firebase (Opsional untuk Produksi)
1. Aktifkan **Authentication** (Email/Password) dan **Cloud Firestore** pada Firebase Console.
2. Terapkan aturan keamanan dari berkas [firestore.rules](firestore.rules).
3. Salin `.env.example` menjadi `server/.env` dan `client/.env`, lengkapi kredensial Firebase, lalu atur `AUTH_MODE=firebase`.

---

## Etika Data dan Privasi (CPL-9)

- Seluruh data pasien yang ditampilkan merupakan data sintetis dengan kode identifikasi (`P-0001`, dst.), keluhan sintetis, dan ilustrasi vektor SVG deterministik. Aplikasi tidak menyimpan nama asli, NIK, maupun rekam medis nyata.
- Parameter laju kedatangan (distribusi Poisson), lama perawatan, dan kapasitas tempat tidur di `server/src/sim/config.js` merupakan nilai asumsi simulasi untuk keperluan akademik.
- Pustaka pihak ketiga yang digunakan berlisensi sumber terbuka: React (MIT), Vite (MIT), Tailwind CSS (MIT), Express (MIT), Socket.IO (MIT), Recharts (MIT), dan Lucide React (ISC).
