/**
 * Tipe data Siswa E-Absensi
 */

export interface DataSiswa {
  nama: string;
  nisn: string;
  nis?: string;
  jenisKelamin: string;
  kelas: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  agama?: string;
  namaAyah?: string;
  namaIbu?: string;
  noHp?: string;
  alamat?: string;
  pin?: string;
}

export interface SiswaUntukScan {
  nama: string;
  nisn: string;
  kelas: string;
}

export interface HasilKenaikanKelas {
  success: boolean;
  message?: string;
  movedCount?: number;
}
