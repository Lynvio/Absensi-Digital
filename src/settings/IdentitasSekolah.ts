/**
 * KONFIGURASI IDENTITAS RESMI SEKOLAH
 * Template Terbuka (Open Source Template) - Tahun 2026
 * 
 * Pengaturan terpusat untuk identitas sekolah, kop surat resmi, kartu tanda pelajar, dan laporan.
 * Pengguna atau pihak sekolah dapat menyesuaikan nilai di bawah ini sesuai identitas sekolah masing-masing.
 */

export interface IdentitasSekolahConfig {
  nama: string;
  namaLengkap: string;
  npsn: string;
  status: string;
  akreditasi: string;
  pemerintahProvinsi: string;
  dinasPendidikan: string;
  alamat: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
  telepon: string;
  email: string;
  website: string;
  logo: string;
  gambarBackground: string[];
  kepalaSekolah: {
    nama: string;
    gelar: string;
    nip: string;
    jabatan: string;
  };
  tahunAjaranAktif: string;
  tahunKalender: number;
}

export const IDENTITAS_SEKOLAH: IdentitasSekolahConfig = {
  nama: 'SMK / SEKOLAH DIGITAL',
  namaLengkap: 'Sekolah Menengah Kejuruan / Sekolah Digital Indonesia',
  npsn: '12345678',
  status: 'Negeri / Swasta',
  akreditasi: 'A (Unggul)',
  pemerintahProvinsi: 'PEMERINTAH PROVINSI / YAYASAN PENDIDIKAN',
  dinasPendidikan: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  alamat: 'Jl. Pendidikan Nasional No. 123',
  kecamatan: 'Kecamatan Sekolah',
  kabupaten: 'Kota / Kabupaten',
  provinsi: 'Provinsi',
  kodePos: '12345',
  telepon: '(021) 1234567',
  email: 'admin@sekolah.sch.id',
  website: 'https://absensi.sekolah.sch.id',
  logo: '/assets/logo/logo-sekolah.svg',
  gambarBackground: [],
  kepalaSekolah: {
    nama: 'Nama Kepala Sekolah',
    gelar: 'M.Pd',
    nip: '19800101 200501 1 001',
    jabatan: 'Kepala Sekolah',
  },
  tahunAjaranAktif: '2025/2026',
  tahunKalender: 2026,
};
