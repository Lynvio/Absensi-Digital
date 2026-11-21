/**
 * Tipe data Konfigurasi Aplikasi dan Hari Libur
 */

export interface KonfigurasiAplikasi {
  namaSekolah: string;
  jamMasuk: string;
  batasTerlambat: string;
  jamPulang: string;
  modeAbsensi: 'normal' | 'bebas' | 'ketat';
}

export interface DataHariLibur {
  tanggal: string;
  keterangan: string;
}

export interface ResponApi<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  __gasError?: boolean;
}
