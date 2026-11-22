# Simpul Sehat — Simulator Rujukan Rumah Sakit Dua Kota

> **Konsep inti:** Saat rumah sakit di satu kota penuh, sistem otomatis merujuk pasien ke rumah sakit di kota lain yang masih punya tempat, lewat rute tercepat.

Aplikasi web simulasi real-time untuk **Proyek Akhir Mata Kuliah Struktur Data** (S1 Pendidikan Teknologi Informasi, Universitas Negeri Surabaya).

---

## 1. Masalah, Tujuan, dan Kaitan SDGs

- **Masalah nyata:** Pasien gawat sering menunggu lama di IGD rumah sakit yang sedang penuh, sementara rumah sakit di wilayah atau kota tetangga masih memiliki tempat tidur dan dokter kosong. Informasi kapasitas antar-RS tidak terlihat dalam satu tampilan terpadu.
- **Pengguna aplikasi:**
  - **Warga:** Melihat rumah sakit yang masih lega di peta, mendaftar antrean Poli/IGD, serta memantau posisi dan perkiraan waktu tunggu secara langsung.
  - **Petugas RS:** Mengelola antrean IGD & Poli, memanggil pasien berikutnya, memulangkan pasien, mengatur kapasitas tempat tidur (dengan Undo), dan mengalihkan pasien ke RS lain.
  - **Dinas Kesehatan (Dinkes):** Memantau kondisi dua kota secara langsung, memicu skenario (wabah, kecelakaan massal, buka/tutup jembatan), mengatur kebijakan rujukan otomatis, mengelola peran pengguna, dan menganalisis eksperimen A/B.
- **Kaitan SDGs:** **SDG 3 (Kehidupan Sehat dan Sejahtera)** — Target **3.8** (akses layanan kesehatan yang merata) dan Target **3.d** (kapasitas peringatan dini dan manajemen risiko kesehatan).
- **Kontribusi nyata:** Mengurangi waktu tunggu rata-rata pasien gawat dan meratakan beban keterisian antar-RS lintas kota, dibuktikan secara kuantitatif melalui fitur **Eksperimen A/B (dengan vs tanpa rujukan otomatis)** di Mode Akademik.

---

## 2. Cara Menjalankan Aplikasi

### Prasyarat
- **Node.js** versi 20 atau lebih baru (`node -v`).

### Langkah Instalasi & Menjalankan Lokal (Mode Pengujian)
```bash
# 1. Pasang dependensi root, server, dan client
npm run install:all

# 2. Jalankan server (port 3001) dan client (port 5173) bersamaan
npm run dev
```
Buka browser di **`http://localhost:5173`**.

### Akun Demo Bawaan (Hanya untuk Pengujian Lokal)
Seluruh akun demo menggunakan kata sandi **`demo1234`** (atau klik pintasan **Masuk cepat** di halaman Login):

| Peran | Email | Penugasan RS |
|---|---|---|
| **Dinkes** | `dinkes@simpulsehat.demo` | Semua wilayah |
| **Petugas RS** | `petugas.surya@simpulsehat.demo` | RS Surya Utama |
| **Petugas RS** | `petugas.tirta@simpulsehat.demo` | RS Tirta Raya |
| **Petugas RS** | `petugas.selatan@simpulsehat.demo` | RS Tirta Selatan |
| **Warga** | `warga@simpulsehat.demo` | — |

### Menjalankan Pengujian Otomatis (`node:test`)
```bash
npm test
```

### Menyambungkan Firebase (Tahap Produksi / Publikasi)
1. Buat proyek di [Firebase Console](https://console.firebase.google.com/), aktifkan **Authentication** (Email/Password & Google) dan **Cloud Firestore**.
2. Deploy aturan keamanan dari berkas [firestore.rules](firestore.rules).
3. Salin `.env.example` ke `server/.env` dan `client/.env`, lalu isi kredensial proyek Firebase dan ubah `AUTH_MODE=firebase`.

---

## 3. Penjelasan 7 Struktur Data Wajib

Seluruh struktur data di `server/src/ds/` ditulis sendiri tanpa pustaka struktur data eksternal (tanpa `Array.prototype.shift` untuk Queue) dan terhubung langsung ke mesin simulasi serta dapat diuji di **Mode Akademik**:

| Struktur Data | Berkas | Fungsi di Aplikasi | Operasi Utama & Kompleksitas | Alasan Dipilih, Kelebihan & Keterbatasan |
|---|---|---|---|---|
| **Stack** | `server/src/ds/Stack.js` | `UndoManager` aksi manual Dinkes & Petugas RS | `push`, `pop`, `peek`, `clear` — **O(1)** | Pembatalan aksi selalu bersifat LIFO. Cepat O(1); terbatas pada puncak stack (tidak akses acak). |
| **Queue** | `server/src/ds/Queue.js` | Antrean Poli (FIFO) & antrean permintaan ambulans per RS | `enqueue`, `dequeue`, `peek` **O(1)**; `remove` **O(n)** | Berbasis simpul berantai (`head` & `tail`) sehingga adil FIFO tanpa pergeseran array. Penghapusan di tengah O(n). |
| **Priority Queue** | `server/src/ds/PriorityQueue.js` | Antrean IGD berbasis triase (Gawat→Sedang→Ringan) & `EventScheduler` | `push`, `pop` **O(log n)**; `peek` **O(1)**; `remove` **O(n)** | Binary min-heap menjamin pasien paling gawat selalu diproses dulu. Pencarian elemen tertentu di tengah O(n). |
| **Linked List** | `server/src/ds/LinkedList.js` | `PatientJourney`, log kejadian per RS (maks 200), ambulans siaga, pasien rawat inap | `append`, `prepend`, `removeFirst` **O(1)**; `find`, `removeWhere` **O(n)** | Dinamis tanpa realokasi; buang log terlama dari kepala O(1). Tidak mendukung akses indeks langsung. |
| **Tree** | `server/src/ds/Tree.js` | `RegionTree` (Wilayah → Kota → RS → Unit) | `find`, `preorder`, `postorder`, `levelOrder`, `height` — **O(n)** | Memodelkan hierarki wilayah kesehatan secara alami untuk agregasi per kota/wilayah. |
| **Rekursif** | `server/src/ds/recursion.js` | `aggregate()` kapasitas daun→akar, `findPath()` breadcrumb, `allSimplePaths()` rute alternatif | Tree: **O(n)**; `allSimplePaths`: eksponensial dibatasi `maxHops=12` | Kode penelusuran pohon & backtracking rute sangat ringkas; batas `maxHops` menjaga keamanan performa. |
| **Graph** | `server/src/ds/Graph.js` | Jaringan 17 simpul jalan & 2 jembatan (Utara & Selatan) | `dijkstra` **O((V+E) log V)**; `bfs` **O(V+E)**; `setEdgeClosed` **O(1)** | Adjacency list berbasis `Map` hemat memori untuk jaringan jalan jarang dan mendukung tutup/buka jembatan dinamis. |

---

## 4. Data, Privasi, dan Etika (CPL-9)

- **100% Data Pasien Sintetis:** Seluruh pasien simulasi menggunakan kode sintetis (`P-0001`, dst.), profil keluhan sintetis, dan avatar wajah vektor SVG deterministik. Tidak ada nama asli, NIK, atau data medis pribadi yang disimpan.
- **Asumsi Parameter:** Laju kedatangan Poisson, durasi layanan, dan kapasitas tempat tidur di `server/src/sim/config.js` merupakan parameter asumsi simulasi untuk studi kasus, bukan data resmi rumah sakit.
- **Pustaka Pihak Ketiga:** React (MIT), Vite (MIT), Tailwind CSS (MIT), Express (MIT), Socket.IO (MIT), Lucide React (ISC), Recharts (MIT).

---

## 5. Checklist Uji Manual (Bukti Pengujian)

| No | Skenario Uji | Langkah | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| 1 | Login & kontrol peran | Login sebagai Warga, buka Peta; coba kirim event `scenario:trigger` | Tombol Skenario tidak muncul; jika dikirim langsung lewat socket, server membalas `"Peran Anda tidak dapat melakukan ini."` | Lulus |
| 2 | Visualisasi peta & detail pasien | Login Dinkes, klik gedung `RS Tirta Raya` → tab `Antrean` → klik pasien | Kartu info ringkas muncul di atas gedung, Detail RS terbuka, klik pasien menampilkan avatar wajah SVG & timeline `LinkedList` | Lulus |
| 3 | Wabah & rujukan lintas jembatan | Skenario → `Wabah di Kota Tirta`, ubah kecepatan `5x` | RS Tirta menjadi kuning lalu merah (< 4 jam), ambulans bersirine melintasi jembatan dengan label estimasi Dijkstra & toast rujukan | Lulus |
| 4 | Tutup 1 & 2 jembatan | Klik langsung `Jembatan Utara` (tutup), lalu tutup `Jembatan Selatan` | Tutup 1 jembatan mengalihkan rute ke jembatan lain; tutup keduanya memunculkan pesan `"tidak ada rute"` | Lulus |
| 5 | Stack Undo | Klik `Batalkan aksi terakhir` di panel Skenario | Jembatan terbuka kembali dan muncul toast `"Aksi dibatalkan: ..."` | Lulus |
| 6 | Alur Warga ↔ Petugas RS | Tab 1 login Warga → daftar Poli RS Surya Utama; Tab 2 login Petugas Surya → klik `Panggil berikutnya` | Posisi antrean Warga berkurang secara langsung dan berubah menjadi `"Giliran Anda..."` | Lulus |
| 7 | Mode Akademik & Eksperimen CSV | Buka profil → `Mode Akademik` → uji 7 struktur, jalankan Eksperimen A/B & Benchmark → `Unduh CSV` | Tabel perbandingan & benchmark tampil, file CSV terunduh, dan muncul di halaman `Analitik` | Lulus |
| 8 | Kinerja 60 fps | Geser & perbesar peta terus-menerus pada kecepatan `10x` saat wabah aktif | Animasi tetap mulus 60 fps tanpa render ulang lapisan peta statis | Lulus |

---

## 6. Skrip Demo Video (3 Menit)

1. **(0:00–0:25)** Login sebagai **Dinkes**. Tunjukkan peta dua kota (Surya & Tirta), rumah warga, pasien berjalan, dan seluruh RS berstatus hijau/lega.
2. **(0:25–0:50)** Klik gedung **RS Tirta Raya**: tunjukkan keterisian, tab Antrean, lalu klik satu pasien untuk memperlihatkan avatar vektor sintetis dan riwayat perjalanan (`LinkedList`).
3. **(0:50–1:25)** Buka **Skenario** → pilih **Wabah di Kota Tirta**, percepat **5x**. Tunjukkan RS Tirta berubah kuning lalu merah dan ambulans bersirine melintasi jembatan ke Kota Surya dengan toast rujukan.
4. **(1:25–1:55)** Klik langsung **Jembatan Utara** untuk menutupnya → rute ambulans beralih lewat **Jembatan Selatan**. Tutup keduanya → muncul peringatan `"tidak ada rute"`.
5. **(1:55–2:20)** Klik **Batalkan aksi terakhir** (Stack Undo). Pindah ke **Analitik** untuk menunjukkan grafik keterisian 24 jam dan perbandingan kebijakan.
6. **(2:20–3:00)** Buka **Mode Akademik** dari menu profil: tunjukkan operasi uji **Stack**, **Priority Queue** (heap live), **Graph** (Dijkstra/BFS/semua rute rekursif), dan **Eksperimen A/B + Benchmark CSV**.
