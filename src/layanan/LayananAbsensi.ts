/**
 * Layanan Presensi Harian, Scan QR, dan Sholat
 */

import { panggilApi } from './KlienApi';
import type {
  DataMonitoringRealtime,
  HasilScanAbsensi,
  ItemDaftarHadirGuru,
  ItemPulangGuru,
} from '@/tipe/Absensi';
import type { DataAbsensiSholat } from '@/tipe/Sholat';
import type { ResponApi } from '@/tipe/Konfigurasi';

export async function lakukanScanQr(
  nisn: string,
  namaPengirim = 'Petugas Pemindai'
): Promise<HasilScanAbsensi> {
  const raw = await panggilApi<any>('scanAbsensi', [nisn, namaPengirim]);
  if (!raw) {
    return { success: false, message: 'Tidak ada respon dari server presensi.' };
  }

  const nama = raw.nama || raw.siswa?.nama;
  const kelas = raw.kelas || raw.siswa?.kelas;
  const jam = raw.jamDatang || raw.jamPulang || raw.jamSholat || raw.jam || raw.siswa?.jam || '';
  const status = raw.status || raw.siswa?.status || 'Hadir';

  return {
    success: Boolean(raw.success),
    message: raw.message || (raw.success ? 'Presensi berhasil dicatat.' : 'Gagal memproses presensi.'),
    siswa: (nama || raw.siswa) ? {
      nama: nama || 'Siswa',
      nisn: raw.nisn || raw.siswa?.nisn || nisn,
      kelas: kelas || '-',
      jam: jam,
      status: status,
    } : undefined,
  };
}

export async function ambilDataMonitoring(): Promise<ResponApi<DataMonitoringRealtime[]>> {
  return await panggilApi<ResponApi<DataMonitoringRealtime[]>>('getMonitoringRealtime', []);
}

export async function ambilAbsensiHariIni(nisn: string): Promise<any> {
  return await panggilApi<any>('getAbsensiToday', [nisn]);
}

export async function ambilStatusDaftarHadir(
  kelas: string,
  tanggal: string
): Promise<ResponApi<Record<string, any>>> {
  return await panggilApi<ResponApi<Record<string, any>>>('getDaftarHadirByKelasAndTanggal', [kelas, tanggal]);
}

export async function ambilDetailDaftarHadir(
  kelas: string,
  tanggal: string
): Promise<ResponApi<Record<string, any>>> {
  return await panggilApi<ResponApi<Record<string, any>>>('getDaftarHadirDetailByKelasAndTanggal', [kelas, tanggal]);
}

export async function simpanDaftarHadirGuru(
  dataSiswa: ItemDaftarHadirGuru[],
  tanggal: string,
  namaGuru: string
): Promise<ResponApi> {
  return await panggilApi<ResponApi>('submitDaftarHadirGuru', [dataSiswa, tanggal, namaGuru]);
}

export async function simpanPulangGuru(
  pulangList: ItemPulangGuru[],
  tanggal: string,
  namaGuru: string
): Promise<ResponApi> {
  return await panggilApi<ResponApi>('submitPulangGuru', [pulangList, tanggal, namaGuru]);
}

export async function ambilLaporanBulanan(
  bulan: number,
  tahun: number,
  kelas: string
): Promise<any> {
  return await panggilApi<any>('getMonthlyReportData', [bulan, tahun, kelas]);
}

export async function unduhLaporanExcel(
  tipeLaporan: string,
  filter: Record<string, any>
): Promise<ResponApi<{ url: string }>> {
  return await panggilApi<ResponApi<{ url: string }>>('generateExcel', [tipeLaporan, filter]);
}

export async function simpanPresensiSholat(
  daftarSholat: DataAbsensiSholat[],
  buktiFoto?: string
): Promise<ResponApi> {
  const tgl = daftarSholat[0]?.tanggal;
  const waktu = daftarSholat[0]?.waktuSholat;
  const pengirim = daftarSholat[0]?.inputOleh;
  return await panggilApi<ResponApi>('submitAbsensiSholat', [daftarSholat, tgl, waktu, pengirim, buktiFoto]);
}

export async function scanPresensiSholat(
  token: string,
  nisn: string,
  waktuSholat: string,
  tanggal?: string,
  namaPengirim?: string
): Promise<ResponApi<{ nisn: string; nama: string; kelas: string; waktuSholat: string; jam: string }>> {
  return await panggilApi<any>('scanPresensiSholat', [token, nisn, waktuSholat, tanggal, namaPengirim]);
}

export async function ambilRekapSholat(
  bulan: string,
  kelas: string
): Promise<ResponApi<DataAbsensiSholat[]>> {
  return await panggilApi<ResponApi<DataAbsensiSholat[]>>('getRekapSholat', [bulan, kelas]);
}
