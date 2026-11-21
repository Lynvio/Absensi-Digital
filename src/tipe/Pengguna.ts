/**
 * Tipe data Pengguna dan Sesi E-Absensi
 */

export type PeranPengguna =
  | 'admin'
  | 'operator'
  | 'waka'
  | 'wakel'
  | 'guru'
  | 'wali_kelas'
  | 'siswa';

export interface DataPengguna {
  identifier: string;
  username: string;
  nama: string;
  role: PeranPengguna;
  kelas?: string;
  nisn?: string | null;
  token?: string;
}

export interface HasilLogin {
  success: boolean;
  message?: string;
  token?: string;
  role?: PeranPengguna;
  username?: string;
  nama?: string;
  kelas?: string;
  nisn?: string | null;
}

export interface SesiTersimpan {
  success: boolean;
  token: string;
  role: PeranPengguna;
  username: string;
  nama: string;
  kelas?: string;
  nisn?: string | null;
  nis?: string;
  jenisKelamin?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  loginAt?: number;
}
