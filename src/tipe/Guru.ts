/**
 * Tipe data Guru dan Pengguna Sistem
 */

export interface DataGuru {
  username: string;
  password?: string;
  role: string;
  kelas: string;
}

export type InputAkunGuru = DataGuru;
