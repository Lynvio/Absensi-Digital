/**
 * KEBIJAKAN & ATURAN LOGIKA PRESENSI
 * SEKOLAH ANDA - TAHUN 2026
 */

export type StatusKehadiran = 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpha';

export interface KebijakanStatusConfig {
  kode: StatusKehadiran;
  label: string;
  warnaBadge: string;
  warnaTeks: string;
  warnaLatar: string;
  dihitungHadir: boolean;
  butuhKeterangan: boolean;
}

export const DAFTAR_KEBIJAKAN_STATUS: Record<StatusKehadiran, KebijakanStatusConfig> = {
  Hadir: {
    kode: 'Hadir',
    label: 'Hadir Tepat Waktu',
    warnaBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    warnaTeks: 'text-emerald-700',
    warnaLatar: 'bg-emerald-50',
    dihitungHadir: true,
    butuhKeterangan: false,
  },
  Terlambat: {
    kode: 'Terlambat',
    label: 'Terlambat Masuk',
    warnaBadge: 'bg-amber-100 text-amber-800 border-amber-300',
    warnaTeks: 'text-amber-700',
    warnaLatar: 'bg-amber-50',
    dihitungHadir: true,
    butuhKeterangan: false,
  },
  Sakit: {
    kode: 'Sakit',
    label: 'Sakit (Surat Dokter/Ortu)',
    warnaBadge: 'bg-blue-100 text-blue-800 border-blue-300',
    warnaTeks: 'text-blue-700',
    warnaLatar: 'bg-blue-50',
    dihitungHadir: false,
    butuhKeterangan: true,
  },
  Izin: {
    kode: 'Izin',
    label: 'Izin Dispensasi',
    warnaBadge: 'bg-purple-100 text-purple-800 border-purple-300',
    warnaTeks: 'text-purple-700',
    warnaLatar: 'bg-purple-50',
    dihitungHadir: false,
    butuhKeterangan: true,
  },
  Alpha: {
    kode: 'Alpha',
    label: 'Tanpa Keterangan',
    warnaBadge: 'bg-rose-100 text-rose-800 border-rose-300',
    warnaTeks: 'text-rose-700',
    warnaLatar: 'bg-rose-50',
    dihitungHadir: false,
    butuhKeterangan: false,
  },
};

export const KEBIJAKAN_PRESENSI = {
  statusList: Object.keys(DAFTAR_KEBIJAKAN_STATUS) as StatusKehadiran[],
  persentaseMinimalLulus: 85, // 85% kehadiran minimal untuk syarat kenaikan kelas
  maksimalAlphaPerSemester: 3,
};
