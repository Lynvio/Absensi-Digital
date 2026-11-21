/**
 * KONFIGURASI TEMA, TAMPILAN, DAN HAK CIPTA
 * E-Absensi Digital Sekolah - Tahun 2026
 */

export interface KonfigurasiTema {
  namaAplikasi: string;
  subJudul: string;
  hakCipta: string;
  tahun: number;
  warna: {
    primer: string;
    primerHover: string;
    aksen: string;
    latarSamping: string;
    latarKonten: string;
    sukses: string;
    peringatan: string;
    bahaya: string;
    info: string;
  };
  tipografi: {
    fontKeluarga: string;
    skalaTersedia: Array<'normal' | 'besar' | 'ekstra'>;
  };
}

export const TAMPILAN_TEMA: KonfigurasiTema = {
  namaAplikasi: 'E-ABSENSI DIGITAL',
  subJudul: 'Sistem Presensi & Manajemen Siswa Terpadu',
  hakCipta: '© 2026 E-Absensi Digital Sekolah',
  tahun: 2026,
  warna: {
    primer: '#4056a1',
    primerHover: '#344887',
    aksen: '#18794e',
    latarSamping: '#ffffff',
    latarKonten: '#f2f4f7',
    sukses: '#18794e',
    peringatan: '#a16207',
    bahaya: '#b4233c',
    info: '#2563a8',
  },
  tipografi: {
    fontKeluarga: 'Inter, system-ui, -apple-system, sans-serif',
    skalaTersedia: ['normal', 'besar', 'ekstra'],
  },
};
