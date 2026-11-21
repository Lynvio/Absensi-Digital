/**
 * Layanan Data Guru dan Akun Pengajar/Admin
 */

import { panggilApi } from './KlienApi';
import type { DataGuru, InputAkunGuru } from '@/tipe/Guru';
import type { ResponApi } from '@/tipe/Konfigurasi';

export async function ambilDaftarGuru(token: string): Promise<ResponApi<DataGuru[]>> {
  return await panggilApi<ResponApi<DataGuru[]>>('getGuruList', [token]);
}

export async function simpanGuruBaru(token: string, guru: InputAkunGuru): Promise<ResponApi> {
  return await panggilApi<ResponApi>('addGuru', [token, guru]);
}

export async function perbaruiDataGuru(token: string, guru: InputAkunGuru): Promise<ResponApi> {
  return await panggilApi<ResponApi>('updateGuru', [token, guru]);
}

export async function hapusDataGuru(token: string, username: string): Promise<ResponApi> {
  return await panggilApi<ResponApi>('deleteGuru', [token, username]);
}

export async function imporGuruMassal(token: string, daftarGuru: InputAkunGuru[]): Promise<ResponApi> {
  return await panggilApi<ResponApi>('importGuruBulk', [token, daftarGuru]);
}
