/**
 * KONFIGURASI JAM OPERASIONAL & ATURAN WAKTU PRESENSI
 * SEKOLAH ANDA - TAHUN 2026
 */

export interface JadwalHariConfig {
  masukMulai: string;
  masukAkhir: string;
  pulangMulai: string;
  pulangAkhir: string;
  aktif: boolean;
}

export interface KonfigurasiJamOperasional {
  modeDefault: 'masuk_pulang' | 'hanya_masuk';
  toleransiTerlambatMenit: number;
  jadwalSeninKamis: JadwalHariConfig;
  jadwalJumat: JadwalHariConfig;
  jadwalSabtu: JadwalHariConfig;
}

export const JAM_OPERASIONAL_DEFAULT: KonfigurasiJamOperasional = {
  modeDefault: 'masuk_pulang',
  toleransiTerlambatMenit: 15, // Setelah 07:15 hingga 07:30 dihitung terlambat wajar
  jadwalSeninKamis: {
    masukMulai: '06:00',
    masukAkhir: '07:15',
    pulangMulai: '15:00',
    pulangAkhir: '17:00',
    aktif: true,
  },
  jadwalJumat: {
    masukMulai: '06:00',
    masukAkhir: '07:15',
    pulangMulai: '11:45',
    pulangAkhir: '14:00',
    aktif: true,
  },
  jadwalSabtu: {
    masukMulai: '06:30',
    masukAkhir: '07:30',
    pulangMulai: '12:00',
    pulangAkhir: '14:00',
    aktif: false, // Libur akhir pekan / kegiatan ekstrakurikuler
  },
};

/**
 * Menentukan status kehadiran berdasarkan waktu scan dan batas jam
 */
export function tentukanStatusWaktu(
  jamScan: string,
  jamMulai: string = '06:00',
  jamBatasHadir: string = '07:15'
): 'Hadir' | 'Terlambat' | 'Terlalu Pagi' {
  if (jamScan < jamMulai) return 'Terlalu Pagi';
  if (jamScan <= jamBatasHadir) return 'Hadir';
  return 'Terlambat';
}
