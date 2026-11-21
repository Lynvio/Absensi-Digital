/**
 * Layanan Manajemen Master Kelas
 */

import { panggilApi } from './KlienApi';
import type { ResponApi } from '@/tipe/Konfigurasi';

export async function ambilMasterKelas(): Promise<string[]> {
  const hasil = await panggilApi<any>('getKelasList', []);
  return (hasil?.success && Array.isArray(hasil.data)) ? hasil.data : (Array.isArray(hasil) ? hasil : []);
}

export async function tambahKelasBaru(token: string, namaKelas: string): Promise<ResponApi> {
  return await panggilApi<ResponApi>('addKelas', [token, namaKelas]);
}

export async function perbaruiNamaKelas(token: string, kelasLama: string, kelasBaru: string): Promise<ResponApi> {
  return await panggilApi<ResponApi>('updateKelas', [token, kelasLama, kelasBaru]);
}

export async function hapusKelas(token: string, namaKelas: string): Promise<ResponApi> {
  return await panggilApi<ResponApi>('deleteKelas', [token, namaKelas]);
}
