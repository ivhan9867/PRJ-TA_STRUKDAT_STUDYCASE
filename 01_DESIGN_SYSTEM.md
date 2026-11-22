# 01 · DESIGN SYSTEM

Arah visual mengikuti dua gambar referensi dari pemilik proyek: **peta terang memenuhi layar, UI hanya berupa beberapa kartu putih mengambang**, sidebar ikon tipis, chip angka mengambang di atas peta.

## 1. Prinsip

1. **Peta adalah panggungnya.** UI hanya mendukung. Kalau ragu, kurangi elemen UI.
2. **Satu momen yang berkesan:** ambulans bergerak melewati jembatan dan RS yang tadinya merah perlahan kembali hijau. Animasi mewah hanya di sini. Elemen lain tenang.
3. **Warna berarti status.** Hijau, kuning, merah hanya untuk keterisian atau tingkat gawat. Jangan dipakai sebagai dekorasi. Status juga selalu ditulis dengan kata (bukan hanya warna).
4. **Bahasa awam.** Pengguna adalah warga dan petugas, bukan developer.
5. **Hindari kesan templat generik:**
   - Tidak ada label huruf kapital semua di atas judul.
   - Tidak ada string meta bertitik tengah ("A · B · C") di UI.
   - Tidak ada tanda panah "→" di akhir tombol atau tautan.
   - Tidak ada gradien dekoratif. Tidak semua kartu seragam: radius dan bayangan mengikuti hierarki (lihat bagian 4).
   - Judul tidak diberi aksen satu kata berwarna.

## 2. Token warna (`client/src/design/tokens.css`)

```css
:root {
  /* Peta */
  --map-land-surya: #E8EFF8;
  --map-land-tirta: #E6F2EF;
  --map-block: #DCE4EE;
  --map-park: #CFE5D4;
  --map-water: #BFD9F0;
  --map-road: #FFFFFF;
  --map-road-edge: #D0D8E3;

  /* Permukaan */
  --surface: #FFFFFF;
  --surface-2: #F5F7FA;
  --border: #E2E8F0;

  /* Teks */
  --text: #0F172A;
  --text-muted: #64748B;
  --text-faint: #94A3B8;

  /* Aksen (aksi utama, rute rujukan, fokus) */
  --accent: #2563EB;
  --accent-soft: #DBEAFE;
  --accent-ink: #1E3A8A;

  /* Status (keterisian dan triase) */
  --ok: #16A34A;     --ok-soft: #DCFCE7;
  --warn: #D97706;   --warn-soft: #FEF3C7;
  --danger: #DC2626; --danger-soft: #FEE2E2;
  --neutral: #94A3B8; --neutral-soft: #F1F5F9;

  /* Bentuk */
  --radius-card: 24px;   /* kartu besar mengambang */
  --radius-inner: 16px;  /* kartu di dalam kartu, input */
  --radius-btn: 12px;
  --radius-pill: 999px;

  --shadow-float: 0 10px 32px rgba(15, 23, 42, .10), 0 2px 6px rgba(15, 23, 42, .05);
  --shadow-chip: 0 4px 14px rgba(15, 23, 42, .10);

  /* Gerak */
  --ease: cubic-bezier(.2, .8, .2, 1);
  --t-fast: 150ms; --t-base: 250ms; --t-slow: 400ms;
}
```

Aturan pakai warna status:
- Triase: **Ringan** = `--ok`, **Sedang** = `--warn`, **Gawat** = `--danger`.
- Status RS dihitung `max(rasio tempat tidur gabungan, rasio antrean IGD)`:
  - **Lega**: di bawah 60 persen (hijau)
  - **Hampir penuh**: 60 sampai 85 persen (kuning)
  - **Penuh**: di atas 85 persen (merah)
  - Rasio antrean IGD = panjang antrean dibagi (2 x jumlah dokter IGD).
- Teks di atas `--*-soft` memakai warna status versi gelap (gunakan `--accent-ink` untuk biru; untuk status pakai warna status itu sendiri dengan bobot 600).

## 3. Tipografi

| Peran | Font | Pemakaian |
|---|---|---|
| Judul dan angka besar | **Bricolage Grotesque** (600) | judul kartu, angka KPI, nama kota di peta |
| Isi dan kontrol | **Figtree** (400, 500, 600) | semua teks lain |

Muat dari Google Fonts, sediakan fallback `system-ui, sans-serif`. Angka memakai `font-variant-numeric: tabular-nums`.

| Gaya | Ukuran / tinggi baris | Font |
|---|---|---|
| Angka besar | 36 / 40 | Bricolage 600 |
| Judul 1 | 24 / 32 | Bricolage 600 |
| Judul 2 | 18 / 26 | Bricolage 600 |
| Judul 3 | 15 / 22 | Figtree 600 |
| Isi | 14 / 22 | Figtree 400, 500 |
| Keterangan | 12 / 16 | Figtree 500, `--text-muted` |

Teks memakai **sentence case** (huruf besar hanya di awal kalimat dan nama diri). Panjang baris di kartu maksimal sekitar 60 karakter.

## 4. Bentuk dan hierarki permukaan

| Elemen | Radius | Bayangan | Catatan |
|---|---|---|---|
| Kartu kiri (mengambang) | 24 | float | satu-satunya kartu besar di halaman Peta |
| Kartu di dalam kartu | 16 | tidak ada, pakai latar `--surface-2` | blok angka, item daftar |
| Chip status di atas peta | pill | chip | putih, titik berwarna + teks |
| Tombol | 12 | tidak ada | utama: `--accent` solid; sekunder: `--surface-2` dengan border |
| Bar bawah (kontrol waktu) | pill | chip | |
| Modal skenario | 24 | float | |

Grid spasi kelipatan 4 px. Margin kartu mengambang dari tepi layar: 16 px.

## 5. Komponen

Semua dibuat di `client/src/design/`. Props sederhana, tanpa variasi berlebihan.

- **Card**: permukaan putih, radius 24, bayangan float, padding 20.
- **StatChip**: titik status 8 px + angka (Bricolage 600) + label. Tinggi 40 px.
- **StatusBadge**: pill kecil, latar `*-soft`, ikon + kata ("Lega", "Hampir penuh", "Penuh").
- **ProgressBar**: tinggi 8, radius pill, latar `--neutral-soft`, isi berwarna status. Teks "12 dari 60" di kanan.
- **HospitalListItem**: nama RS, tipe (kecil, muted), StatusBadge, persen keterisian. Tinggi sekitar 56. Hover: latar `--surface-2`. Terpilih: border `--accent`.
- **SidebarButton**: kotak 48 px, ikon lucide 22 px, tooltip di kanan. Aktif: latar `--accent-soft`, ikon `--accent`.
- **TimeControl**: pill di tengah bawah: tombol jalan/jeda, pilihan 1x/5x/10x (segmented), teks "Hari 3, 14.20".
- **Toast**: kartu kecil radius 16, ikon kejadian, teks satu kalimat, hilang otomatis setelah 6 detik, maksimal 3 tumpuk.
- **Tabs (di dalam kartu)**: garis bawah 2 px `--accent` untuk tab aktif, tanpa kotak.
- **Table**: baris 44 px, garis pemisah `--border`, tanpa zebra.
- **EmptyState**: ikon abu 32 px, satu kalimat penjelasan, satu tombol aksi bila relevan.
- **Skeleton**: blok `--neutral-soft` berdenyut pelan saat data belum tiba.

Ikon: `lucide-react`, ketebalan garis 1.75. Contoh: `Map`, `Building2`, `Activity`, `Ambulance`, `Users`, `Siren`, `Bridge` (atau `Waypoints`), `Undo2`, `Search`, `FlaskConical` (Mode Akademik).

## 6. Gaya peta (SVG, viewBox `0 0 1600 900`)

**Lapisan (bawah ke atas):**
1. Daratan: dua area, Surya (`--map-land-surya`) dan Tirta (`--map-land-tirta`), dipisah sungai.
2. Sungai: bentuk lengkung di tengah (`--map-water`), x kira-kira 700 sampai 900.
3. Blok kota dan taman dekoratif: persegi membulat `--map-block` dan lingkaran `--map-park`. Dibuat sekali secara deterministik (seed tetap) dan menghindari jalan. **Tidak ada batas jumlah elemen:** perbanyak detail (blok dengan bayangan tipis, pohon, taman, lapangan, jalan kecil) agar kota terasa hidup, selama kinerja tetap 60 fps (lihat bagian 10).
4. Nama kota: teks besar Bricolage 64, warna `--text` dengan opasitas 6 persen, di belakang marker.
5. Jalan: setiap edge digambar dua kali, garis tepi `--map-road-edge` lebar 18, lalu garis `--map-road` lebar 14, ujung membulat.
6. Jembatan: lebar 16, dengan dua garis pagar tipis di sisi. **Tertutup:** warna abu miring-miring, lencana merah bulat berisi tanda silang di tengah, tooltip "Jembatan ditutup".
7. Rute rujukan aktif: garis `--accent` lebar 3, putus-putus, bergerak (animasi `stroke-dashoffset`).
8. Pasien NPC berjalan: titik 6 px warna triase (opasitas 70 persen), maksimal 150 terlihat sekaligus (digambar di lapisan Canvas, lihat bagian 10).
9. Ambulans: persegi membulat 28x16, putih, border `--accent` 2 px, tanda plus merah kecil. Titik kecil di pojok menunjukkan triase pasien. Mengikuti jalur Dijkstra.
10. Marker RS (di atas semuanya).

**Marker RS:**
- Persegi membulat putih, cincin 3 px berwarna status, ikon salib rumah sakit berwarna status di tengah.
- Ukuran menurut tipe: A = 44, B = 38, C = 32.
- Di bawah marker: pill kecil berisi persen keterisian, mis. "63%".
- Nama RS tampil saat zoom di atas 1.2x, saat hover, atau saat dipilih.
- Status Penuh: cincin berdenyut (skala 1 ke 1.8, opasitas .5 ke 0, 1.6 detik, berulang).
- Dipilih: cincin luar `--accent` 3 px + sedikit membesar (1.08).

**Interaksi peta:** seret untuk geser, roda mouse atau tombol +/- untuk zoom (rentang 0.8x sampai 2.5x), klik nama kota di kartu atau daftar untuk terbang ke kota itu (animasi 400 ms), tombol "Lihat semua" mengembalikan tampilan awal.

## 7. Gerak

- Durasi: 150 ms (hover), 250 ms (panel, kartu), 400 ms (terbang ke kota, angka berubah).
- Angka KPI berubah dengan transisi hitung 400 ms.
- Kartu kiri berganti isi (ringkasan ke detail) dengan geser halus 250 ms.
- Ambulans dan pasien bergerak lewat `requestAnimationFrame`, posisi dihitung dari waktu mulai dan durasi (bukan dikirim server tiap tick).
- Tidak ada animasi masuk bertahap per bagian halaman, tidak ada efek hover ekstra di semua kartu.
- Hormati `prefers-reduced-motion`: matikan denyut dan garis rute bergerak; ambulans tetap bergerak.

## 8. Aksesibilitas

- Kontras teks minimal 4.5:1.
- Fokus keyboard terlihat: cincin 2 px `--accent` + 3 px `--accent-soft`.
- Target sentuh minimal 40 px.
- Status selalu punya kata dan ikon, tidak hanya warna.
- Layar 1280 px ke atas adalah target utama. Di bawah 1024 px, kartu kiri menjadi panel bawah (bottom sheet) setinggi 45 persen layar.

## 9. Bahasa antarmuka

### Glosarium (wajib dipakai)

| Jangan tulis | Tulis |
|---|---|
| Bed, Okupansi Bed | Tempat tidur terisi |
| Antre, Q, Queue | Antrean |
| p90, p50 | Waktu tunggu (mayoritas pasien) / Waktu tunggu rata-rata |
| Rujukan sukses | Pasien berhasil dirujuk |
| LOD, L0, L1, L2 | (tidak ditampilkan) |
| Rsv, Reserved | Dipesan |
| Server (poli) | Dokter bertugas |
| EventScheduler, Heap | (hanya di Mode Akademik) |
| Policy, Baseline | Rujukan otomatis: Aktif / Nonaktif |
| Triage, RED/YELLOW/GREEN | Gawat / Sedang / Ringan |
| Dispatch | Ambulans berangkat |
| Undefined, null, NaN | (tidak boleh tampil; gunakan "-" atau EmptyState) |

Nama status: **Lega, Hampir penuh, Penuh.** Unit: **IGD, Poli, Rawat inap, ICU.** Status ambulans: **Siaga, Menjemput, Mengantar, Kembali.**

### Gaya tulisan
- Kalimat aktif, singkat, sentence case. Tombol memakai kata kerja yang jelas: "Panggil berikutnya", "Pulangkan pasien", "Daftar antrean", "Batalkan aksi terakhir".
- Nama aksi konsisten dari tombol sampai toast: tombol "Tutup jembatan" menghasilkan toast "Jembatan Utara ditutup".
- Error tidak minta maaf dan tidak samar: sebut apa yang salah dan cara memperbaikinya. Contoh: "Tidak ada rute ke RS lain karena kedua jembatan ditutup. Buka salah satu jembatan."
- Keadaan kosong mengajak bertindak. Contoh: "Belum ada antrean di IGD. Pasien yang datang akan muncul di sini."

### Pola kalimat log dan toast

| Kejadian | Kalimat |
|---|---|
| Rujukan dibuat | Pasien {triase} dirujuk dari {RS asal} ke {RS tujuan} (±{n} menit). |
| Ambulans tiba | Ambulans tiba di {RS tujuan}. Pasien masuk antrean IGD. |
| Pasien pulang | Pasien {kode} selesai dirawat dan pulang dari {RS}. |
| Dirawat inap | Pasien {kode} dirawat inap di {RS}. |
| Masuk ICU | Pasien {kode} masuk ICU {RS}. |
| RS penuh | {RS} penuh. Pasien baru akan dirujuk ke RS lain. |
| Tidak ada rute | Pasien {kode} belum bisa dirujuk: tidak ada rute ke RS lain. |
| Wabah | Lonjakan pasien di kota {kota}. |
| Kecelakaan massal | Kecelakaan massal: {n} pasien tiba di {RS}. |
| Jembatan | Jembatan {Utara/Selatan} ditutup / dibuka. |
| Undo | Aksi dibatalkan: {deskripsi aksi}. |

## 10. Kinerja dan rendering (tanpa batas spesifikasi mesin)

Tujuannya: tampilan sekaya mungkin, tetap **60 fps dan tidak patah-patah**.

**Pembagian lapisan peta:**
- **SVG statis** (daratan, sungai, blok kota, pohon, jalan, nama kota): digambar sekali, tidak dirender ulang saat data berubah. Pisahkan sebagai komponen yang di-memo.
- **Canvas overlay** (pasien berjalan, ambulans, garis rute bergerak, riak sungai): digambar tiap frame lewat `requestAnimationFrame`. Boleh memakai `OffscreenCanvas` atau Web Worker bila perlu.
- **Marker RS dan label**: elemen SVG atau HTML terpisah, hanya marker yang statusnya berubah yang diperbarui.

**Efek visual yang diizinkan (karena tidak ada batas mesin):**
- Kartu kaca: latar putih 90 persen dengan `backdrop-filter: blur(12px)` untuk kartu kiri, chip, dan bar waktu.
- Riak halus pada sungai, bayangan lembut di bawah blok dan bangunan, jejak singkat di belakang ambulans, cahaya lembut di sekitar RS berstatus Penuh.
- Transisi warna dan angka yang halus, easing dari token.
- Pasien NPC hingga 150 titik, ambulans semua yang aktif.

**Aturan agar tetap lancar:**
1. Data langsung masuk ke store dengan selector per bagian. Komponen hanya render ulang jika bagian datanya berubah. Peta tidak boleh render ulang seluruhnya tiap `world:tick`.
2. Posisi ambulans dan pasien dihitung di dalam loop animasi dari waktu mulai, durasi, dan jalur. Tidak disimpan di state React per frame.
3. Pan dan zoom memakai `transform` (CSS atau Canvas), bukan mengubah atribut ratusan elemen satu per satu.
4. Event socket berfrekuensi tinggi digabung (batch) per frame animasi.
5. Hentikan loop animasi saat tab tidak terlihat (`document.hidden`) dan lanjutkan saat kembali.
6. Bersihkan listener, timer, dan objek animasi saat komponen dilepas agar tidak ada kebocoran memori.

**Uji kelancaran (wajib di akhir tiap fase yang menyentuh peta):**
- Geser dan zoom peta terus-menerus 10 detik: rata-rata 60 fps tanpa frame yang lebih dari 33 ms (ukur di Chrome DevTools, panel Performance).
- Simulasi 10x dengan wabah aktif selama 5 menit: tetap mulus, memori stabil.
- Jika ada efek yang menurunkan kelancaran, kurangi efek itu terlebih dahulu.
