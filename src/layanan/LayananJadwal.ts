/**
 * Layanan Kalender Libur, Pengaturan Jam Sekolah, & Edit Absen Manual
 */

import { panggilApi } from './KlienApi';
import { dapatkanTokenAktif } from './Autentikasi';
import type { DataHariLibur, ResponApi } from '@/tipe/Konfigurasi';

export async function ambilDaftarHariLibur(): Promise<ResponApi<DataHariLibur[]>> {
  return await panggilApi<ResponApi<DataHariLibur[]>>('getHariLibur', []);
}

export async function tambahRentangHariLibur(
  tanggalMulai: string,
  tanggalSelesai: string,
  keterangan: string,
  token?: string
): Promise<ResponApi> {
  const t = token || dapatkanTokenAktif();
  return await panggilApi<ResponApi>('addHariLiburRange', [tanggalMulai, tanggalSelesai, keterangan, t]);
}

export async function hapusHariLibur(tanggal: string, token?: string): Promise<ResponApi> {
  const t = token || dapatkanTokenAktif();
  return await panggilApi<ResponApi>('deleteHariLibur', [tanggal, t]);
}

export async function ambilKonfigurasiSistem(): Promise<ResponApi<any>> {
  return await panggilApi<ResponApi<any>>('getAppConfig', []);
}

export async function simpanKonfigurasiSistem(
  config: Record<string, any>,
  token?: string
): Promise<ResponApi> {
  const t = token || dapatkanTokenAktif();
  return await panggilApi<ResponApi>('saveAppConfig', [config, t]);
}

export async function imporHariLiburMassal(
  dataArray: Array<{ tanggal: string; keterangan: string }>,
  token?: string
): Promise<ResponApi> {
  const t = token || dapatkanTokenAktif();
  return await panggilApi<ResponApi>('importHariLiburBulk', [dataArray, t]);
}

export async function perbaruiStatusAbsenManual(
  token: string,
  nisn: string,
  nama: string,
  kelas: string,
  status: string,
  tanggal?: string
): Promise<ResponApi> {
  return await panggilApi<ResponApi>('updateAbsensiStatus', [token, nisn, nama, kelas, status, tanggal]);
}
