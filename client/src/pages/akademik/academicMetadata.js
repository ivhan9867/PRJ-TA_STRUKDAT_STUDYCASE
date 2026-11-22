/**
 * Metadata penjelasan & tabel kompleksitas 7 struktur data wajib untuk Mode Akademik
 * (sesuai 02_UI_SPEC.md bagian 8.1 dan 03_ARSITEKTUR_DAN_STRUKTUR_DATA.md bagian 4).
 */
export const ACADEMIC_STRUCTURES = [
  {
    id: 'stack',
    name: 'Stack',
    role: 'Menyimpan riwayat aksi manual (UndoManager) milik petugas RS dan Dinkes.',
    reason: 'Pembatalan aksi selalu memproses aksi paling baru (LIFO), cocok dengan puncak stack.',
    tradeoff: 'Kelebihan: push/pop/peek O(1). Keterbatasan: tidak mendukung akses acak di tengah.',
    ops: [
      { op: 'push(item)', time: 'O(1)', note: 'O(n) hanya jika melebihi maxSize (100)' },
      { op: 'pop()', time: 'O(1)', note: 'Ambil aksi paling baru untuk dibatalkan' },
      { op: 'peek()', time: 'O(1)', note: 'Tampilkan pratinjau aksi teratas di tombol Undo' },
      { op: 'clear()', time: 'O(1)', note: 'Kosongkan stack saat simulasi diulang' },
    ],
  },
  {
    id: 'queue',
    name: 'Queue',
    role: 'Antrean layanan Poli per RS (FIFO) dan antrean permintaan ambulans per RS (FIFO).',
    reason: 'Menjaga keadilan urutan kedatangan tanpa pergeseran array (berbasis simpul berantai head & tail, tanpa Array.shift).',
    tradeoff: 'Kelebihan: enqueue & dequeue O(1). Keterbatasan: pembatalan di tengah (remove) O(n).',
    ops: [
      { op: 'enqueue(item)', time: 'O(1)', note: 'Tambah pasien poli atau permintaan ambulans' },
      { op: 'dequeue()', time: 'O(1)', note: 'Panggil pasien terdepan (tanpa Array.shift)' },
      { op: 'peek()', time: 'O(1)', note: 'Lihat pasien paling depan' },
      { op: 'remove(predicate)', time: 'O(n)', note: 'Batalkan antrean warga di tengah' },
    ],
  },
  {
    id: 'pq',
    name: 'Priority queue',
    role: 'Antrean IGD berbasis tingkat triase (Gawat → Sedang → Ringan) dan EventScheduler simulasi global.',
    reason: 'Binary min-heap menjaga pasien paling gawat atau kejadian paling dekat selalu di puncak (indeks 0).',
    tradeoff: 'Kelebihan: push & pop O(log n), peek O(1). Keterbatasan: hapus elemen tertentu di tengah O(n).',
    ops: [
      { op: 'push(item)', time: 'O(log n)', note: 'Sift-up menjaga properti min-heap' },
      { op: 'pop()', time: 'O(log n)', note: 'Ambil pasien paling gawat / event terdekat' },
      { op: 'peek()', time: 'O(1)', note: 'Cek elemen prioritas tertinggi' },
      { op: 'remove(predicate)', time: 'O(n)', note: 'Alihkan pasien IGD atau batalkan antrean' },
    ],
  },
  {
    id: 'linkedlist',
    name: 'Linked list',
    role: 'PatientJourney (tahapan pasien), log kejadian per RS (maks 200), daftar ambulans siaga, dan pasien rawat inap.',
    reason: 'Tambah di kepala/ekor dan hapus dari kepala O(1) tanpa realokasi array, ukuran dinamis.',
    tradeoff: 'Kelebihan: append/prepend/removeFirst O(1). Keterbatasan: tidak ada akses langsung indeks (find O(n)).',
    ops: [
      { op: 'append(value)', time: 'O(1)', note: 'Catat tahap perjalanan pasien / log baru di ekor' },
      { op: 'prepend(value)', time: 'O(1)', note: 'Sisip cepat di kepala (diuji di Benchmark)' },
      { op: 'removeFirst()', time: 'O(1)', note: 'Ambil ambulans siaga / buang log terlama' },
      { op: 'removeWhere(pred)', time: 'O(n)', note: 'Pulangkan pasien rawat inap di tengah daftar' },
    ],
  },
  {
    id: 'tree',
    name: 'Tree dan rekursif',
    role: 'RegionTree (Wilayah → Kota → RS → Unit) dan agregasi rekursif postorder kapasitas serta breadcrumb.',
    reason: 'Struktur wilayah kesehatan bersifat hierarkis alami sehingga total per kota/wilayah dihitung otomatis dari daun ke akar.',
    tradeoff: 'Kelebihan: agregasi & traversal sangat bersih. Keterbatasan: pencarian tanpa indeks O(n).',
    ops: [
      { op: 'find(id) / findPath()', time: 'O(n)', note: 'DFS rekursif untuk pencarian & breadcrumb' },
      { op: 'preorder / postorder', time: 'O(n)', note: 'Penelusuran pohon secara rekursif' },
      { op: 'levelOrder()', time: 'O(n)', note: 'BFS per tingkat memakai Queue buatan sendiri' },
      { op: 'aggregate()', time: 'O(n)', note: 'Hitung total tempat tidur & antrean dari daun ke akar' },
    ],
  },
  {
    id: 'graph',
    name: 'Graph',
    role: 'Jaringan 17 simpul jalan dan 2 jembatan (Utara & Selatan) antar Kota Surya dan Kota Tirta.',
    reason: 'Adjacency list berbasis Map hemat memori O(V+E) untuk jaringan jalan jarang, mendukung buka/tutup jembatan dinamis.',
    tradeoff: 'Kelebihan: Dijkstra O((V+E) log V), BFS O(V+E). Keterbatasan: bobot edge harus non-negatif.',
    ops: [
      { op: 'addNode / addEdge', time: 'O(1)', note: 'Bangun simpul & ruas jalan dari seed' },
      { op: 'setEdgeClosed()', time: 'O(1)', note: 'Tutup/buka jembatan secara dinamis' },
      { op: 'dijkstra()', time: 'O((V+E) log V)', note: 'Rute tercepat ambulans & pasien memakai Binary Heap' },
      { op: 'bfs()', time: 'O(V+E)', note: 'Hitung jumlah lompatan minimum & keterjangkauan' },
      { op: 'allSimplePaths()', time: 'Eksponensial (dibatasi maxHops)', note: 'Backtracking rekursif untuk semua rute alternatif' },
    ],
  },
  {
    id: 'database',
    name: 'Database',
    role: 'Menyimpan akun multi-user (Warga, Petugas RS, Dinkes), konfigurasi RS, kejadian penting, dan hasil eksperimen.',
    reason: 'Firebase Authentication + Firestore (dengan adapter lokal sementara) memisahkan peran secara aman dengan aturan keamanan.',
    tradeoff: 'Kelebihan: sinkronisasi multi-user & aturan per peran. Keterbatasan: penulisan dibatasi agar hemat kuota gratis.',
    ops: [
      { op: 'Verifikasi token + cache', time: 'O(1) saat cache hit', note: 'Cache profil 60 detik di server' },
      { op: 'Pembacaan users / hospitals', time: 'O(1) per dokumen', note: 'Dilindungi firestore.rules' },
      { op: 'Tulis events penting', time: 'Dibatasi ≤ 1 / 2 detik', note: 'Tidak menulis state per tick' },
    ],
  },
];
