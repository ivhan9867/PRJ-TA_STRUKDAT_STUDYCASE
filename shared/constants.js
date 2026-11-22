// Konstanta bersama untuk client dan server
// Ubah APP_NAME di sini untuk mengganti nama aplikasi di seluruh sistem.

export const APP_NAME = 'Simpul Sehat';

export const HOSPITAL_STATUS = {
  OK: 'ok',
  WARN: 'warn',
  DANGER: 'danger',
};

export const HOSPITAL_STATUS_LABEL = {
  ok: 'Lega',
  warn: 'Hampir penuh',
  danger: 'Penuh',
};

export const TRIAGE_LEVEL = {
  RINGAN: 'ringan',
  SEDANG: 'sedang',
  GAWAT: 'gawat',
};

export const TRIAGE_LABEL = {
  ringan: 'Ringan',
  sedang: 'Sedang',
  gawat: 'Gawat',
};

export const UNIT_LABEL = {
  igd: 'IGD',
  poli: 'Poli',
  rawat_inap: 'Rawat inap',
  icu: 'ICU',
};

export const AMBULANCE_STATUS_LABEL = {
  siaga: 'Siaga',
  menjemput: 'Menjemput',
  mengantar: 'Mengantar',
  kembali: 'Kembali',
};

export const ROLE_LABEL = {
  warga: 'Warga',
  petugas: 'Petugas RS',
  dinkes: 'Dinkes',
};
