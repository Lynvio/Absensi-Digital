/**
 * Layanan Data Siswa dan Kelas
 */

import { panggilApi } from './KlienApi';
import { ambilMasterKelas } from './LayananKelas';
import { dapatkanTokenAktif } from './Autentikasi';
import type { DataSiswa, HasilKenaikanKelas } from '@/tipe/Siswa';
import type { ResponApi } from '@/tipe/Konfigurasi';

export async function ambilDaftarSiswa(
  token: string,
  filterKelas?: string
): Promise<ResponApi<DataSiswa[]>> {
  return await panggilApi<ResponApi<DataSiswa[]>>('getSiswaList', [token, filterKelas]);
}

export async function ambilSiswaPerKelas(kelas: string): Promise<DataSiswa[]> {
  const hasil = await panggilApi<any>('getSiswaByKelas', [kelas]);
  return Array.isArray(hasil) ? hasil : (hasil?.data || []);
}

/**
 * Mengambil master kelas terpusat (diteruskan dari LayananKelas untuk mencegah duplikasi)
 */
export async function ambilDaftarKelas(): Promise<string[]> {
  return await ambilMasterKelas();
}

export async function simpanSiswaBaru(
  token: string,
  siswa: DataSiswa
): Promise<ResponApi> {
  return await panggilApi<ResponApi>('addSiswa', [token, siswa]);
}

export async function perbaruiDataSiswa(
  token: string,
  siswa: DataSiswa
): Promise<ResponApi> {
  return await panggilApi<ResponApi>('updateSiswa', [token, siswa.nisn, siswa]);
}

export async function hapusDataSiswa(
  token: string,
  nisn: string
): Promise<ResponApi> {
  return await panggilApi<ResponApi>('deleteSiswa', [token, nisn]);
}

export async function imporSiswaMassal(
  token: string,
  daftarSiswa: DataSiswa[]
): Promise<ResponApi> {
  return await panggilApi<ResponApi>('importSiswaBulk', [token, daftarSiswa]);
}

export async function prosesKenaikanKelas(
  pemetaan: Array<{ asal: string; tujuan: string }>,
  token?: string
): Promise<HasilKenaikanKelas> {
  const t = token || dapatkanTokenAktif();
  return await panggilApi<HasilKenaikanKelas>('processGradePromotion', [pemetaan, t]);
}

export async function prosesKenaikanSiswaTerpilih(
  kelasAsal: string,
  kelasTujuan: string,
  dataPromosi: Array<{ nisn: string; status: 'NAIK' | 'TINGGAL' }>,
  token?: string
): Promise<ResponApi<{ movedCount?: number }>> {
  const t = token || dapatkanTokenAktif();
  return await panggilApi<ResponApi<{ movedCount?: number }>>('processIndividualPromotion', [
    kelasAsal,
    kelasTujuan,
    dataPromosi,
    t,
  ]);
}

export async function arsipDanResetTahun(namaArsip: string, token?: string): Promise<ResponApi> {
  const t = token || dapatkanTokenAktif();
  return await panggilApi<ResponApi>('archiveAndResetYear', [namaArsip, t]);
}

export async function gantiPinSiswa(
  token: string,
  pinLama: string,
  pinBaru: string
): Promise<ResponApi> {
  return await panggilApi<ResponApi>('updatePinSiswa', [token, pinLama, pinBaru]);
}

export async function resetPinSiswa(
  token: string,
  nisn: string,
  pinBaru?: string
): Promise<ResponApi<{ pinBaru?: string }>> {
  return await panggilApi<ResponApi<{ pinBaru?: string }>>('resetPinSiswa', [token, nisn, pinBaru]);
}

