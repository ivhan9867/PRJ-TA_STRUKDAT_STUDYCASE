# 00 · BRIEF UTAMA: Simpul Sehat (simulator rujukan dua kota)

> Baca SEMUA file ini sebelum menulis kode: `00_BRIEF.md`, `01_DESIGN_SYSTEM.md`, `02_UI_SPEC.md`, `03_ARSITEKTUR_DAN_STRUKTUR_DATA.md`.
> Jika ada konflik, urutan prioritas: 00 > 03 > 02 > 01.
> Nama aplikasi "Simpul Sehat" adalah nama kerja. Simpan di satu konstanta `APP_NAME` agar mudah diganti.

## 1. Konsep dalam satu kalimat

**Saat rumah sakit di satu kota penuh, sistem otomatis merujuk pasien ke rumah sakit di kota lain yang masih punya tempat, lewat rute tercepat.**

Semua fitur harus mendukung kalimat ini. Fitur yang tidak mendukungnya: jangan dibuat.

## 2. Masalah, pengguna, SDG (untuk dokumentasi dan artikel)

- **Masalah:** pasien gawat sering menunggu lama di IGD yang penuh, sementara RS di wilayah lain masih punya tempat tidur kosong. Informasi kapasitas antar-RS tidak terlihat dalam satu tempat.
- **Pengguna:**
  - **Warga:** melihat RS yang lega dan mendaftar antrean.
  - **Petugas RS:** mengelola antrean dan tempat tidur RS-nya.
  - **Dinas Kesehatan (Dinkes):** memantau dua kota, memicu skenario, mengatur kebijakan rujukan.
- **SDG:** SDG 3 (Kehidupan Sehat dan Sejahtera), target 3.8 (akses layanan kesehatan) dan 3.d (kapasitas peringatan dini dan manajemen risiko kesehatan).
- **Kontribusi nyata:** mengurangi waktu tunggu pasien gawat dan meratakan beban antar-RS. Dibuktikan dengan eksperimen "dengan vs tanpa rujukan otomatis" (lihat fase 7).

## 3. Ruang lingkup

**Dikerjakan:**
- Simulasi 2 kota (Surya dan Tirta), 6 RS, 2 jembatan, ambulans, pasien NPC otomatis.
- 3 peran (warga, petugas, dinkes) dengan login Firebase.
- 7 struktur data wajib berjalan di mesin simulasi dan bisa diuji di Mode Akademik.
- Analitik sederhana dan eksperimen A/B untuk artikel.

**TIDAK dikerjakan (jangan ditambahkan):**
- Kota ketiga, level zoom bertingkat (LOD), peta dunia.
- Isometrik 3D (Three.js) sebelum Fase 8 selesai. Peta 2D dulu; isometrik hanya sebagai Fase 9 opsional.
- Data pasien asli. Semua pasien NPC bersifat sintetis dengan kode seperti `P-0231`.
- Notifikasi email/SMS, pembayaran, rekam medis detail.
- Mode gelap.

## 4. Teknologi dan struktur folder

| Lapisan | Pilihan |
|---|---|
| Frontend | React + Vite, JavaScript (ESM), Tailwind CSS, lucide-react (ikon), Recharts (grafik), peta digambar dengan SVG |
| Backend | Node.js (ESM), Express, Socket.IO |
| Auth dan data akun | Firebase Authentication + Firestore (`firebase-admin` di server) |
| Tes | `node:test` untuk struktur data dan simulasi |
| Kinerja | Tidak ada batas spesifikasi mesin. Gunakan sumber daya sepenuhnya demi tampilan kaya. Syarat utama: animasi 60 fps, tidak patah-patah, tidak ada jeda saat data masuk (lihat aturan kerja nomor 13 dan file 01 bagian 10) |

```
simpul-sehat/
├─ README.md                 # cara menjalankan, ringkasan struktur data (fase 8)
├─ docs/                     # salin 00-03 ke sini; DECISIONS.md untuk catatan keputusan agent
├─ shared/
│  └─ world.seed.json        # data dunia (ada di file 03)
├─ server/
│  ├─ src/
│  │  ├─ ds/                 # Stack, Queue, PriorityQueue, LinkedList, Tree, Graph, recursion
│  │  ├─ sim/                # engine, config, scenarios, rng, metrics
│  │  ├─ auth/               # verifikasi token Firebase, cek peran
│  │  ├─ socket/             # handler event
│  │  └─ index.js
│  └─ test/
├─ client/
│  └─ src/
│     ├─ design/             # tokens.css, komponen dasar
│     ├─ map/                # MapCanvas, HospitalMarker, Ambulance, Bridge
│     ├─ pages/              # Login, Peta, RsSaya, AntreanSaya, Analitik, AdminPengguna, akademik/*
│     ├─ state/              # store (zustand atau context), koneksi socket
│     └─ firebase.js
└─ firestore.rules
```

## 5. Aturan kerja untuk agent

1. **Kerjakan satu fase per giliran.** Setelah selesai: jalankan, uji, lalu laporkan apa yang sudah jalan dan apa yang belum. Jangan lompat ke fase berikutnya.
2. **Irisan vertikal:** setiap fitur harus jalan dari data sampai tampilan sebelum lanjut.
3. **Jangan mengubah token desain** (`01_DESIGN_SYSTEM.md`) tanpa diminta. Semua warna, ukuran, dan font diambil dari `tokens.css`.
4. **Gunakan data seed persis** dari file 03. Jangan membuat RS, kota, atau rute baru.
5. **Semua teks di antarmuka berbahasa Indonesia sehari-hari.** Dilarang istilah internal di UI (lihat glosarium di file 01). Judul tab browser: nama aplikasi, tidak boleh "undefined".
6. **Kode harus mudah dijelaskan** oleh mahasiswa saat presentasi: nama jelas, komentar singkat berbahasa Indonesia di setiap kelas struktur data, tanpa trik rumit.
7. **Struktur data ditulis sendiri** (tanpa library struktur data). Jangan memakai `Array.prototype.shift` sebagai implementasi Queue atau library priority queue.
8. **Simulasi dipegang satu server.** Browser hanya menampilkan dan mengirim perintah. Server memeriksa peran di setiap perintah.
9. **Jangan menulis ke Firestore tiap detik.** Aturannya ada di file 03 bagian 7.
10. **Rahasia** (service account, API key) lewat `.env`, masuk `.gitignore`. Sediakan `.env.example`.
11. Jika ada hal yang ambigu, pilih opsi paling sederhana dan catat di `docs/DECISIONS.md` (satu baris: keputusan dan alasan).
12. Jangan menambah fitur, halaman, atau menu yang tidak ada di brief.
13. **Kinerja adalah syarat, bukan tambahan.** Tidak ada batas spesifikasi mesin, jadi tampilkan detail visual sekaya mungkin (peta detail, banyak pasien dan ambulans, efek halus). Tetapi tiap fase harus lolos uji kelancaran: 60 fps saat peta digeser dan diperbesar, tidak ada render ulang seluruh peta tiap pembaruan data, tidak ada patah-patah saat kecepatan 10x. Jika fitur visual mengorbankan kelancaran, kurangi efeknya, jangan kelancarannya.

## 6. Rencana fase dan kriteria selesai

### Fase 0: Fondasi
- Scaffold client + server, Tailwind, font, `tokens.css`, komponen dasar (Card, StatChip, StatusBadge, ProgressBar, Button).
- Salin `world.seed.json`. Server menyajikan data seed lewat endpoint tes.
- **Selesai jika:** `npm run dev` menjalankan client dan server; halaman kosong memakai font dan warna yang benar.

### Fase 1: Peta dan layout (tanpa logika, data tiruan)
- Halaman Peta lengkap sesuai `02_UI_SPEC.md` bagian 3: topbar, sidebar ikon, kartu kiri (ringkasan dan detail RS), chip status, kontrol waktu, tombol zoom, legenda.
- Peta SVG 2 kota, sungai, jalan, jembatan, 6 marker RS berwarna dari data tiruan, pan dan zoom.
- **Selesai jika:** klik RS membuka detail di kartu kiri; seluruh teks sesuai glosarium; tampilan rapi di 1366x768 dan 1920x1080.

### Fase 2: Pustaka struktur data dan tes
- Implementasi semua struktur di `server/src/ds/` sesuai file 03 bagian 4.
- Tes: minimal 6 tes per struktur, termasuk kasus kosong dan batas.
- **Selesai jika:** `npm test` hijau.

### Fase 3: Mesin simulasi dan siaran langsung
- Engine, pasien NPC, antrean IGD dan poli, tempat tidur, ambulans, rujukan lewat graph.
- Socket.IO mengirim `world:init`, `world:tick`, dan event; client menggambar ambulans, pasien berjalan, dan memperbarui angka.
- Kontrol waktu (jalan, jeda, 1x/5x/10x).
- **Selesai jika:** simulasi 24 jam baseline tidak ada RS yang merah terus-menerus; ambulans terlihat melintasi jembatan saat ada rujukan; angka di UI berubah tanpa refresh.

### Fase 4: Skenario, kebijakan, undo, log
- Skenario: wabah, kecelakaan massal, tutup/buka jembatan. Saklar "Rujukan otomatis". Reset.
- Stack undo untuk aksi manual. Log kejadian berbahasa manusia.
- **Selesai jika:** memicu wabah di satu kota membuat minimal satu RS di sana menjadi merah dalam 4 jam simulasi (pada 5x), lalu terlihat rujukan ke kota lain; tutup satu jembatan mengubah rute; tutup keduanya memunculkan pesan "tidak ada rute".

### Fase 5: Login dan peran
- Firebase Auth, dokumen `users`, menu per peran, `firestore.rules`, verifikasi token di socket, pemeriksaan peran di server.
- Halaman Admin Pengguna (Dinkes mengubah peran dan RS petugas).
- **Selesai jika:** warga tidak bisa memicu skenario (diuji lewat client dan lewat perintah socket langsung); petugas hanya bisa mengelola RS-nya.

### Fase 6: Halaman Petugas dan Warga
- RS Saya (antrean, panggil berikutnya, pulangkan, ubah kapasitas, alihkan manual, undo).
- Antrean Saya untuk warga (daftar antrean poli atau IGD, lihat posisi dan estimasi).
- **Selesai jika:** warga mendaftar, petugas memanggil, posisi antrean warga berkurang secara langsung.

### Fase 7: Analitik, Mode Akademik, Eksperimen
- Halaman Analitik untuk Dinkes.
- Mode Akademik: visualisasi 7 struktur data dengan operasi uji.
- Eksperimen A/B (dengan/tanpa rujukan otomatis) dan benchmark; ekspor CSV.
- **Selesai jika:** tabel hasil eksperimen bisa dibuat ulang dengan seed yang sama dan hasilnya identik.

### Fase 8: Poles dan dokumentasi
- README: masalah, tujuan, solusi, cara menjalankan, penjelasan struktur data (fungsi, operasi, alasan, kelebihan, keterbatasan).
- Checklist uji manual (tabel: skenario, langkah, hasil yang diharapkan, status) untuk bukti pengujian.
- Skrip demo video (bagian 7 di bawah) berjalan mulus.
- **Selesai jika:** orang yang belum pernah melihat aplikasi bisa menjalankan demo hanya dari README, dan uji kelancaran lolos: peta digeser dan diperbesar tetap 60 fps (ukur dengan panel Performance di Chrome DevTools), simulasi 10x dengan wabah tetap mulus, tidak ada kebocoran memori setelah 30 menit berjalan.

### Fase 9 (opsional, hanya setelah Fase 8 selesai dan atas permintaan)
- Ganti tampilan peta menjadi isometrik 3D dengan Three.js seperti gambar referensi pertama (bangunan bervolume, RS sebagai gedung berwarna status, jalan dan jembatan 3D, ambulans bergerak). Logika, data, dan antarmuka kartu tidak berubah, hanya lapisan peta.
- Pertahankan peta 2D sebagai alternatif lewat satu tombol "Tampilan 2D / 3D".
- **Selesai jika:** semua fitur Fase 1 sampai 8 berfungsi sama di mode 3D dan tetap 60 fps.

## 7. Skenario demo (3 menit, harus bisa dijalankan)

1. Login sebagai Dinkes. Peta: semua RS hijau, ambulans sesekali lewat, pasien berjalan menuju RS.
2. Klik RS Tirta Raya: tunjukkan keterisian dan antrean.
3. Skenario, "Wabah di kota Tirta". Percepat 5x. Antrean IGD menumpuk, RS Tirta berubah kuning lalu merah.
4. Rujukan otomatis berjalan: ambulans melintasi jembatan ke kota Surya. Toast: "Pasien gawat dirujuk dari RS Tirta Raya ke RS Surya Utama (±14 menit)".
5. Tutup Jembatan Utara: rute berubah lewat Jembatan Selatan. Tutup keduanya: muncul peringatan "Tidak ada rute", pasien tetap menunggu.
6. Matikan "Rujukan otomatis" lalu bandingkan di Analitik.
7. Batalkan aksi terakhir (undo). Buka Mode Akademik untuk menunjukkan stack dan graph.

## 8. Pemetaan ke rubrik penilaian

| Komponen | Di mana terlihat |
|---|---|
| Stack | Undo aksi manual (petugas, dinkes); Mode Akademik |
| Queue | Antrean poli (FIFO), permintaan ambulans (FIFO) |
| Priority queue (pendukung Queue) | Antrean IGD berdasar triase, penjadwal kejadian simulasi |
| Linked list | Perjalanan pasien, log kejadian per RS, daftar ambulans bebas |
| Rekursif | Agregasi kapasitas pohon wilayah, pencarian jalur di pohon, semua rute alternatif antar-RS |
| Tree | Pohon wilayah: wilayah, kota, RS, unit |
| Graph | Jalan dan jembatan; Dijkstra untuk rujukan; BFS untuk jumlah lompatan |
| Koneksi database multi-user | Firebase Auth + Firestore, peran, aturan keamanan |
| Efisiensi (CPMK-1) | Tabel kompleksitas, benchmark di Mode Akademik |
| Etika data (CPL-9) | Pasien sintetis, tanpa data pribadi; dicatat di README |
