/**
 * Tipe data Presensi Sholat Berjamaah
 */

export type WaktuSholat = 'Subuh' | 'Dhuha' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya';

export interface DataAbsensiSholat {
  tanggal: string;
  nisn: string;
  nama: string;
  kelas: string;
  waktuSholat: WaktuSholat;
  status: 'Hadir' | 'Tidak Hadir';
  keterangan: string;
  inputOleh: string;
  buktiFoto?: string;
}
