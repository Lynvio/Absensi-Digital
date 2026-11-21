import React from 'react';
import type { PeranPengguna } from '@/tipe/Pengguna';
import {
  LayoutDashboard,
  CalendarCheck,
  QrCode,
  Activity,
  Users,
  GraduationCap,
  School,
  ClipboardCheck,
  FileSpreadsheet,
  TrendingUp,
  Moon,
  Settings,
  ClipboardList,
} from 'lucide-react';

export interface ItemMenuNavigasi {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: PeranPengguna[];
}

/**
 * Sumber kebenaran tunggal (Single Source of Truth) untuk seluruh navigasi sistem E-Absensi.
 * Menghilangkan duplikasi deklarasi menu di NavigasiSamping dan KepalaHalaman.
 */
export const DAFTAR_MENU_SISTEM: ItemMenuNavigasi[] = [
  { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard, roles: ['admin', 'operator', 'guru', 'wali_kelas', 'siswa', 'waka', 'wakel'] },
  { id: 'daftar-hadir', label: 'Presensi Rombel', icon: CalendarCheck, roles: ['guru', 'wali_kelas', 'operator', 'admin'] },
  { id: 'scanner', label: 'Pindai QR Presensi', icon: QrCode, roles: ['admin', 'operator', 'guru', 'wali_kelas'] },
  { id: 'monitoring', label: 'Pantau Langsung', icon: Activity, roles: ['admin', 'waka', 'wakel'] },
  { id: 'siswa', label: 'Data Induk Siswa', icon: Users, roles: ['admin', 'operator'] },
  { id: 'guru', label: 'Data Pengajar & Admin', icon: GraduationCap, roles: ['admin'] },
  { id: 'kelas', label: 'Manajemen Kelas', icon: School, roles: ['admin'] },
  { id: 'kelola-absen', label: 'Kelola Presensi & Barcode', icon: ClipboardCheck, roles: ['admin', 'operator', 'guru', 'wali_kelas'] },
  { id: 'rekap', label: 'Rekap Bulanan', icon: FileSpreadsheet, roles: ['admin', 'operator', 'guru', 'wali_kelas', 'waka', 'wakel'] },
  { id: 'kenaikan-kelas', label: 'Kenaikan Kelas & Arsip', icon: TrendingUp, roles: ['admin'] },
  { id: 'sholat', label: 'Presensi Sholat', icon: Moon, roles: ['admin', 'guru', 'wali_kelas', 'waka', 'wakel'] },
  { id: 'pengaturan', label: 'Pengaturan Jam & Libur', icon: Settings, roles: ['admin'] },
  { id: 'pengajuan', label: 'Pengajuan & Persetujuan', icon: ClipboardList, roles: ['admin', 'operator', 'guru', 'wali_kelas', 'siswa', 'waka', 'wakel'] },
];

/**
 * Daftar menu pencarian cepat (Quick Search) untuk navbar atas
 */
export const MENU_PENCARIAN_CEPAT = DAFTAR_MENU_SISTEM.map((m) => [m.id, m.label] as const);

/**
 * Pemetaan perizinan menu berdasarkan peran (Role-Based Access Control)
 * Dihasilkan secara otomatis dari DAFTAR_MENU_SISTEM untuk menghindari duplikasi kode.
 */
export const AKSES_MENU: Record<string, PeranPengguna[]> = Object.fromEntries(
  DAFTAR_MENU_SISTEM.map((item) => [item.id, item.roles])
);

/**
 * Pemetaan judul halaman berdasarkan menu aktif
 */
export const JUDUL_MENU: Record<string, string> = Object.fromEntries(
  DAFTAR_MENU_SISTEM.map((item) => [item.id, item.label])
);
