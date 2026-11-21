/**
 * Tipe data Absensi Harian E-Absensi
 */

export type StatusKehadiran = 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa' | 'Alpha' | 'Belum Absen';

export interface DataAbsensi {
  tanggal: string;
  nisn: string;
  nama: string;
  kelas: string;
  jamMasuk: string;
  jamPulang: string;
  keterangan: string;
  status: StatusKehadiran;
}

export interface DataMonitoringRealtime {
  nama: string;
  nisn: string;
  kelas: string;
  jamDatang?: string | null;
  jamMasuk?: string | null;
  jamPulang?: string | null;
  status?: string | null;
  keterangan?: string;
}

export interface HasilScanAbsensi {
  success: boolean;
  message: string;
  siswa?: {
    nama: string;
    nisn: string;
    kelas: string;
    jam: string;
    status: string;
  };
}

export interface MonitoringRealtime {
  totalSiswa: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  belumAbsen: number;
  data: DataAbsensi[];
}

export interface ItemDaftarHadirGuru {
  nisn: string;
  nama: string;
  kelas: string;
  status: string;
}

export interface ItemPulangGuru {
  nisn: string;
  rowIndex: number;
}
