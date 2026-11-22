# 02 · SPESIFIKASI UI

Semua gaya (warna, font, radius, bayangan, gerak) diambil dari `01_DESIGN_SYSTEM.md`. File ini mengatur **apa ada di mana** dan **apa yang terjadi saat diklik**.

## 1. Kerangka umum (semua halaman setelah login)

```
┌──────────────────────────────────────────────────────────────┐
│ [logo] Simpul Sehat        [ 🔍 Cari rumah sakit ]   [peran ▾]│  topbar 56 px
├────┬─────────────────────────────────────────────────────────┤
│ ikon│                                                         │
│ ikon│                  isi halaman                            │
│ ikon│                                                         │
│    │                                                         │
└────┴─────────────────────────────────────────────────────────┘
 sidebar 72 px (hanya ikon + tooltip)
```

- **Topbar (maksimal 3 hal):** logo dan nama; kolom cari RS (hanya di halaman Peta); menu profil.
- **Menu profil** (klik avatar): nama dan peran, "Mode Akademik", "Keluar". Tidak ada pengaturan lain.
- **Sidebar** hanya menampilkan menu sesuai peran:

| Peran | Menu (urutan atas ke bawah) |
|---|---|
| Warga | Peta, Antrean saya |
| Petugas RS | Peta, RS saya |
| Dinkes | Peta, Analitik, Pengguna |

- Judul tab browser: `Simpul Sehat`. Favicon: salib rumah sakit biru.
- Tidak ada baris tab horizontal, tidak ada lebih dari satu baris navigasi.

## 2. Login dan daftar

```
┌───────────────────────────────┬──────────────────────────────┐
│  Simpul Sehat                 │  Masuk                        │
│  Pantau kapasitas rumah sakit │  [ Email           ]          │
│  dua kota dan rujuk pasien    │  [ Kata sandi      ]          │
│  ke tempat yang masih lega.   │  [ Masuk ]                    │
│                               │  [ Masuk dengan Google ]      │
│  (ilustrasi peta kecil)       │  Belum punya akun? Daftar     │
└───────────────────────────────┴──────────────────────────────┘
```

- Daftar membuat akun dengan peran **Warga**. Peran lain hanya bisa diubah oleh Dinkes.
- Error: "Email atau kata sandi salah. Periksa lagi atau pilih Daftar."
- Setelah masuk, arahkan ke Peta.

## 3. Halaman Peta (halaman utama semua peran)

```
┌──────────────────────────────────────────────────────────────┐
│ topbar                                                        │
├────┬─────────────────────────────────────────────────────────┤
│    │ ┌─────────────┐   (●3 Lega)(●1 Hampir penuh)(●2 Penuh)  │
│ 🗺 │ │ KARTU KIRI  │                          [ Skenario ▾ ]  │
│ 📊 │ │ 360 px      │                                          │
│ 👥 │ │             │      PETA 2 KOTA (SVG, penuh layar)      │
│    │ │             │                                          │
│    │ └─────────────┘                                  [+][−]   │
│    │ [Keterangan]     ( ▶ Jalan │ 1x 5x 10x │ Hari 3, 14.20 ) │
└────┴─────────────────────────────────────────────────────────┘
```

Posisi (margin 16 px dari tepi area peta):
- **Kartu kiri:** kiri atas, lebar 360, tinggi mengikuti isi (maksimal tinggi layar dikurangi 32, isi bisa digulir).
- **Chip status:** tengah atas, tiga chip: jumlah RS Lega, Hampir penuh, Penuh. Klik chip menyorot RS dengan status itu di peta (redupkan yang lain 2 detik).
- **Tombol Skenario:** kanan atas, hanya untuk Dinkes. Membuka panel kecil (bagian 3.3).
- **Zoom:** kanan bawah, tombol +, −, dan "Lihat semua".
- **Keterangan:** kiri bawah, tombol kecil. Klik membuka popover legenda (Lega, Hampir penuh, Penuh, Ambulans, Pasien menuju RS, Jembatan, Jembatan ditutup).
- **Kontrol waktu:** tengah bawah. Dinkes: tombol aktif. Peran lain: hanya membaca (jam tampil, tombol dinonaktifkan dengan tooltip "Hanya Dinkes yang dapat mengatur waktu").

### 3.1 Kartu kiri, keadaan "Ringkasan" (default)

```
┌─────────────────────────────┐
│ Halo, {nama}                │  Judul 1
│ Berikut kondisi dua kota.   │  keterangan
│                             │
│ ┌───────┐┌───────┐┌───────┐ │  3 blok angka (kartu dalam)
│ │  4    ││  12   ││  3    │ │
│ │antrean││tempat ││dirujuk│ │
│ │ IGD   ││tidur  ││hari   │ │
│ │       ││terisi ││ini    │ │
│ └───────┘└───────┘└───────┘ │
│                             │
│ Rumah sakit                 │  Judul 3
│ (Semua | Surya | Tirta)     │  segmented
│ ┌─────────────────────────┐ │
│ │ RS Surya Utama  Lega 41%│ │  HospitalListItem x6
│ │ RS Surya Timur  Lega 38%│ │
│ │ ...                     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- Blok angka: "Antrean IGD" (total di dua kota), "Tempat tidur terisi" (persen gabungan), "Pasien dirujuk hari ini". Angka berubah dengan transisi.
- Memilih segmented "Surya" atau "Tirta" juga menerbangkan peta ke kota itu.
- Klik item RS: kartu berganti ke "Detail RS" dan peta menerbangkan pandangan ke RS itu (marker terpilih).
- Kolom cari di topbar menyaring daftar RS dan menyorot marker. Hasil kosong: "Tidak ada rumah sakit dengan nama itu."

### 3.2 Kartu kiri, keadaan "Detail RS"

```
┌─────────────────────────────┐
│ ← Kembali                   │
│ RS Tirta Raya               │  Judul 1
│ Tipe A, Kota Tirta  [Penuh] │
│                             │
│ Ringkasan | Antrean | Kejadian │  tabs
│                             │
│ Tempat tidur rawat inap     │
│ ████████░░  48 dari 55      │  ProgressBar
│ ICU                         │
│ █████████░  9 dari 10       │
│ Antrean IGD                 │
│ ██████░░░░  7 pasien        │
│                             │
│ Ambulans siaga: 1 dari 2    │
│ Dokter IGD bertugas: 6 dari 6│
│                             │
│ [tombol sesuai peran]       │
└─────────────────────────────┘
```

- **Tab Ringkasan:** isi seperti di atas.
- **Tab Antrean:** tabel kecil: kode pasien, tingkat (Gawat/Sedang/Ringan), menunggu (menit). Maksimal 20 baris, urut menurut prioritas. Kosong: "Belum ada antrean di IGD. Pasien yang datang akan muncul di sini." Pasien warga asli ditandai "(Anda)" untuk warga yang bersangkutan.
- **Tab Kejadian:** 15 kejadian terakhir RS itu, kalimat dari pola log di file 01, dengan waktu simulasi ("Hari 3, 14.05").
- **Tombol sesuai peran:**
  - Warga: "Daftar antrean" (membuka mini-form: pilih IGD atau Poli, lalu "Daftar").
  - Petugas (RS sendiri): "Kelola di RS saya" (ke halaman RS saya). Untuk RS lain: tidak ada tombol.
  - Dinkes: tidak ada tombol di sini.
- Tombol Kembali mengembalikan ke Ringkasan, peta kembali ke tampilan semula.

### 3.3 Panel Skenario (Dinkes)

Dibuka dari tombol "Skenario" (popover lebar 340, radius 24). Isi, urut atas ke bawah:

1. **Rujukan otomatis**: saklar, label "Aktif/Nonaktif". Keterangan: "Saat Aktif, pasien dirujuk ke RS lain yang masih lega."
2. **Wabah di kota**: pilih kota (Surya/Tirta), tombol "Mulai wabah". Keterangan: "Jumlah pasien naik sekitar 4 kali lipat selama 6 jam simulasi."
3. **Kecelakaan massal**: pilih RS, tombol "Picu kecelakaan". Keterangan: "12 pasien tiba bersamaan, banyak yang gawat."
4. **Jembatan**: dua saklar, "Jembatan Utara" dan "Jembatan Selatan" (Buka/Tutup).
5. **Mulai ulang simulasi**: tombol sekunder berwarna bahaya, minta konfirmasi: "Simulasi diulang dari awal dan semua kejadian dihapus. Lanjutkan?"
6. **Batalkan aksi terakhir** (tombol dengan ikon `Undo2`): menampilkan deskripsi aksi yang akan dibatalkan di bawah tombol. Nonaktif bila stack kosong ("Belum ada aksi yang bisa dibatalkan").

Setiap aksi memunculkan toast dengan kalimat dari pola log.

### 3.4 Perilaku peta langsung

- Pasien NPC muncul sebagai titik di rumah acak, berjalan lewat jalan ke RS terdekat (beberapa detik), lalu hilang saat tiba dan masuk antrean.
- Ambulans berangkat saat rujukan dibuat: garis rute `--accent` putus-putus bergerak menampilkan jalur; ambulans bergerak mengikuti jalur; setelah tiba, garis hilang dan ambulans kembali ke RS asal tanpa garis.
- Persen di pill marker dan warna cincin berubah dengan transisi 250 ms.
- Toast muncul di bawah tombol Skenario (kanan atas) untuk kejadian penting: rujukan dibuat, RS penuh, wabah, kecelakaan, jembatan. Maksimal 3 sekaligus.

## 4. Halaman RS saya (Petugas)

Layout dua kolom di atas latar `--surface-2` (bukan peta):

```
┌──────────────────────────────────────────────────────────────┐
│ RS Surya Utama   [Lega]            [ Batalkan aksi terakhir ] │
├──────────────────────────────┬───────────────────────────────┤
│ Antrean IGD (7)              │ Tempat tidur                  │
│ ┌──────────────────────────┐ │ Rawat inap  [−] 31/60 [+]     │
│ │ P-0231 Gawat    12 menit │ │ ICU         [−]  7/12 [+]     │
│ │ P-0228 Sedang   25 menit │ │                               │
│ │ ...                      │ │ Sedang dilayani (4 dari 6)    │
│ └──────────────────────────┘ │ ┌───────────────────────────┐ │
│ [ Panggil berikutnya ]       │ │ P-0219 IGD, 18 menit      │ │
│                              │ │      [Pulangkan pasien]   │ │
│ Antrean poli (3)             │ └───────────────────────────┘ │
│ [ Panggil berikutnya ]       │                               │
│                              │ Kejadian terbaru (10)         │
└──────────────────────────────┴───────────────────────────────┘
```

- **Panggil berikutnya:** mengambil pasien teratas dari antrean (prioritas untuk IGD, urutan datang untuk poli). Dinonaktifkan jika tidak ada dokter bebas, dengan keterangan "Semua dokter sedang bertugas."
- **Pulangkan pasien:** mengakhiri layanan pasien yang sedang dilayani.
- **− / + kapasitas tempat tidur:** mengubah total kapasitas satu per satu (batas 0 sampai 2x kapasitas awal). Masuk ke stack undo.
- **Alihkan pasien:** setiap baris antrean IGD punya menu "Alihkan ke RS lain": daftar RS tujuan dengan status dan perkiraan menit. Setelah memilih, pasien dirujuk manual (masuk stack undo).
- **Batalkan aksi terakhir:** hanya membatalkan aksi petugas ini. Nonaktif jika kosong.
- Petugas hanya melihat RS miliknya (`rsId` di profil). Jika `rsId` kosong: EmptyState "Akun Anda belum ditugaskan ke rumah sakit. Hubungi Dinkes."

## 5. Halaman Antrean saya (Warga)

```
┌──────────────────────────────────────────────────────────────┐
│ Antrean saya                                                  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ RS Tirta Selatan, Poli                                   │ │
│ │ Posisi antrean: 3        Perkiraan: 20 menit             │ │
│ │ ████░░░░░░  [ Batalkan antrean ]                         │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ Rumah sakit yang masih lega                                   │
│  RS Surya Timur  Lega  Antrean IGD 1                          │
│  RS Tirta Utara  Lega  Antrean IGD 0     [ Daftar antrean ]   │
└──────────────────────────────────────────────────────────────┘
```

- Satu antrean aktif per warga. Jika sudah ada: tombol "Daftar antrean" nonaktif dengan keterangan "Selesaikan atau batalkan antrean Anda lebih dulu."
- Tidak ada antrean: EmptyState "Anda belum punya antrean. Pilih rumah sakit yang masih lega di bawah."
- Perkiraan waktu = posisi x rata-rata durasi layanan unit itu, dibulatkan ke 5 menit.
- Saat dipanggil: kartu berubah "Giliran Anda. Silakan menuju {unit} {RS}."

## 6. Halaman Analitik (Dinkes)

```
┌──────────────────────────────────────────────────────────────┐
│ Analitik                                         Hari 3, 14.20│
├───────────┬───────────┬───────────┬──────────────────────────┤
│ Waktu     │ Tempat    │ Pasien    │ Pasien belum bisa        │
│ tunggu    │ tidur     │ dirujuk   │ dirujuk                  │
│ rata-rata │ terisi    │ hari ini  │                          │
│ 18 menit  │ 42%       │ 7         │ 0                        │
├───────────┴───────────┴───────────┴──────────────────────────┤
│ Keterisian tempat tidur per kota (garis, 24 jam terakhir)    │
│  [grafik garis: Surya, Tirta]                                │
├──────────────────────────────┬───────────────────────────────┤
│ Waktu tunggu per RS (batang) │ Dengan vs tanpa rujukan       │
│                              │ otomatis                      │
│                              │ [tabel ringkas dari eksperimen]│
├──────────────────────────────┴───────────────────────────────┤
│ Kejadian (semua RS)  [Semua | Rujukan | Peringatan]          │
│  daftar 30 kejadian terbaru                                  │
└──────────────────────────────────────────────────────────────┘
```

- Grafik memakai Recharts, warna: Surya `--accent`, Tirta `--ok`. Sumbu bahasa Indonesia.
- Kartu "Dengan vs tanpa rujukan otomatis" menampilkan hasil eksperimen terbaru. Jika belum ada: EmptyState "Belum ada eksperimen. Jalankan di Mode Akademik." dengan tombol "Buka Mode Akademik".

## 7. Halaman Pengguna (Dinkes)

Tabel: Nama, Email, Peran (dropdown: Warga, Petugas RS, Dinkes), Rumah sakit (dropdown 6 RS, aktif hanya jika Petugas RS), tombol "Simpan" per baris.
- Dinkes tidak bisa menurunkan perannya sendiri (dropdown nonaktif di baris sendiri dengan tooltip "Anda tidak bisa mengubah peran sendiri").
- Toast sukses: "Peran {nama} diubah menjadi {peran}."

## 8. Mode Akademik (dari menu profil, semua peran bisa membuka)

Halaman terpisah, dengan latar `--surface-2` dan tab di atas: **Struktur data** dan **Eksperimen**. Tampilkan banner kecil: "Halaman ini untuk penilaian proyek. Data di sini dibuat dari contoh uji, bukan dari simulasi langsung" (kecuali bagian yang jelas bertanda "langsung").

### 8.1 Tab Struktur data

Dua kolom. Kiri: daftar 7 struktur (Stack, Queue, Priority queue, Linked list, Tree dan rekursif, Graph, Database). Kanan, untuk struktur yang dipilih:

1. **Penjelasan** (3 baris): fungsi di aplikasi, alasan dipilih, kelebihan dan keterbatasan.
2. **Tabel kompleksitas** operasi (dari file 03 bagian 4).
3. **Visualisasi** instance contoh:
   - Stack: kotak bertumpuk vertikal, puncak di atas.
   - Queue dan Priority queue: kotak berjajar horizontal (priority queue juga menampilkan bentuk pohon heap).
   - Linked list: simpul berpanah.
   - Tree: pohon yang bisa dilipat, dengan tombol traversal (preorder, postorder, level order) yang menyorot urutan kunjungan dan menampilkan hasil agregasi rekursif.
   - Graph: peta mini dua kota; pilih RS asal dan tujuan, tombol "Cari rute tercepat" (Dijkstra, jalur disorot, biaya menit) dan "Hitung lompatan" (BFS); tombol "Tampilkan semua rute" (rekursif) menampilkan rute alternatif.
   - Database: status koneksi Firebase, daftar koleksi, contoh dokumen `users` (tanpa data pribadi: email disamarkan) dan aturan keamanan ringkas.
4. **Tombol operasi uji:** misalnya Push, Pop, Peek untuk Stack; Enqueue, Dequeue untuk Queue. Setiap klik menambah baris ke **log operasi** di bawah visualisasi (mis. "push('Tutup Jembatan Utara') ukuran: 3").
5. **Bagian "Langsung dari simulasi"** (opsional per struktur): menampilkan isi antrean IGD RS terpilih, stack undo saat ini, dan seterusnya, dibaca dari server.

### 8.2 Tab Eksperimen

```
Pengaturan                                  Hasil
Skenario: ( Normal | Wabah | Jembatan tutup )   tabel: metrik x kebijakan
Lama: 3 hari simulasi                            (rata-rata dan simpangan dari N seed)
Jumlah ulangan: 5 (seed 1 sampai 5)             [ Unduh CSV ]
[ Jalankan eksperimen ]                         grafik batang perbandingan
────────────────────────────────────────────
Benchmark struktur data
[ Jalankan benchmark ]  tabel: operasi, ukuran n, waktu (ms)
```

- Eksperimen berjalan tanpa animasi (mode cepat di server), menampilkan progres "Ulangan 3 dari 10 selesai".
- Metrik: waktu tunggu rata-rata IGD (semua pasien dan pasien gawat), keterisian puncak, jumlah rujukan, jumlah pasien tanpa rute, rata-rata waktu rujukan.
- Dua kebijakan dibandingkan di seed yang sama: Rujukan otomatis Aktif vs Nonaktif.
- Benchmark: (1) tambah di depan: linked list vs array untuk n = 1.000, 10.000, 100.000; (2) Dijkstra dengan heap vs pencarian linear pada graph sintetis berukuran n = 100, 1.000, 5.000 simpul.
- Hasil eksperimen disimpan ke Firestore (`runs`) agar muncul di Analitik.

## 9. Keadaan global

| Keadaan | Tampilan |
|---|---|
| Memuat | Skeleton di kartu dan chip; peta tampil dulu dengan marker abu |
| Server tidak terhubung | Banner tipis di bawah topbar: "Tidak terhubung ke simulasi. Mencoba menyambung kembali..." Data terakhir tetap tampil, kontrol dinonaktifkan |
| Tidak punya izin | Toast: "Peran Anda tidak dapat melakukan ini." |
| Halaman tidak ditemukan | EmptyState dengan tombol "Kembali ke Peta" |
| Data kosong | EmptyState dengan penjelasan satu kalimat (lihat contoh per halaman) |
