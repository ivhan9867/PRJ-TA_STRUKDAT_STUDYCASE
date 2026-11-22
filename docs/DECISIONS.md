# Catatan Keputusan Teknis (DECISIONS)

Catatan singkat setiap keputusan arsitektur atau klarifikasi selama pengembangan proyek **Simpul Sehat**.

| Tanggal | Fase | Keputusan | Alasan |
|---|---|---|---|
| 2026-11-22 | Fase 0 | Struktur proyek (`client/`, `server/`, `shared/`, `docs/`) diletakkan langsung di root workspace | Mempermudah struktur repositori GitHub dan menjalankan satu perintah `npm run dev` dari root. |
| 2026-11-22 | Fase 0 | Nama aplikasi disimpan dalam satu konstanta `APP_NAME = "Simpul Sehat"` di `shared/constants.js` | Memudahkan penggantian nama aplikasi di seluruh tampilan dan server tanpa mencari satu per satu. |
| 2026-11-22 | Fase 0 | Integrasi Firebase Auth & Firestore disiapkan lewat pola adapter (`demo` dulu, `firebase` di tahap akhir) | Memungkinkan seluruh fitur peran dan pengujian selesai secara lokal sebelum kredensial Firebase dipasang saat publikasi ke GitHub. |
| 2026-11-22 | Fase 0 | Frontend menggunakan Tailwind CSS v4 (`@tailwindcss/vite`) dengan token CSS persis dari `01_DESIGN_SYSTEM.md` | Setup lebih ringan, build lebih cepat, dan variabel warna/radius/bayangan tetap bersumber tunggal dari `tokens.css`. |
| 2026-11-22 | Fase 3 | Parameter `stayDurationMin` dikalibrasi ke `[480, 1800]` menit (8–30 jam) dan `initialOccupancyRange` ke `[0.35, 0.48]` di `server/src/sim/config.js` | Pada rentang awal 12–72 jam, `RS Tirta Selatan` (Tipe B, 28 tempat tidur) menumpuk penuh > 2 jam pada baseline 24 jam; penyesuaian menjaga baseline stabil namun tetap cepat merah saat wabah 4x. |
| 2026-11-22 | Fase 4 | Kalibrasi `outbreakMultiplier = 6`, pemicu rujukan IGD di `>= igdDoctors` atau `status === 'danger'`, dan rujukan pasca-IGD langsung masuk unit rawat inap/ICU tujuan | Memastikan wabah di satu kota membuat RS merah dalam 4 jam, memicu minimal 3 rujukan lintas jembatan ke kota seberang, dan secara konsisten menurunkan waktu tunggu IGD dibanding tanpa rujukan otomatis. |
