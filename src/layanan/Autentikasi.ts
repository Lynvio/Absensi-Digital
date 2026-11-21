/**
 * Layanan Autentikasi dan Manajemen Sesi
 */

import { panggilApi, ambilTokenRecaptcha } from './KlienApi';
import type { HasilLogin, SesiTersimpan } from '@/tipe/Pengguna';

const KUNCI_SESI_LOCAL_STORAGE = 'absensiAppSession';
// Batas kedaluwarsa sesi lokal: 24 jam (dalam milidetik)
const MASA_BERLAKU_SESI_MS = 24 * 60 * 60 * 1000;

// Rate limiting konfigurasi
const KUNCI_RATE_LIMIT = 'loginRateLimitState';
const MAKS_PERCOBAAN_GAGAL = 5;
const DURASI_KUNCI_MS = 15 * 60 * 1000; // 15 menit

interface StatusRateLimit {
  count: number;
  lockedUntil?: number;
}

export function cekRateLimitLogin(): { terkunci: boolean; sisaDetik: number } {
  try {
    const raw = sessionStorage.getItem(KUNCI_RATE_LIMIT);
    if (!raw) return { terkunci: false, sisaDetik: 0 };
    const data: StatusRateLimit = JSON.parse(raw);
    const sekarang = Date.now();
    if (data.lockedUntil && data.lockedUntil > sekarang) {
      return {
        terkunci: true,
        sisaDetik: Math.ceil((data.lockedUntil - sekarang) / 1000),
      };
    }
    // Jika waktu kunci sudah lewat, reset counter
    if (data.lockedUntil && data.lockedUntil <= sekarang) {
      sessionStorage.removeItem(KUNCI_RATE_LIMIT);
    }
  } catch {
    // Ignore error
  }
  return { terkunci: false, sisaDetik: 0 };
}

function catatPercobaanGagal(): { terkunci: boolean; sisaDetik: number } {
  try {
    const raw = sessionStorage.getItem(KUNCI_RATE_LIMIT);
    let data: StatusRateLimit = raw ? JSON.parse(raw) : { count: 0 };
    data.count = (data.count || 0) + 1;
    if (data.count >= MAKS_PERCOBAAN_GAGAL) {
      data.lockedUntil = Date.now() + DURASI_KUNCI_MS;
      sessionStorage.setItem(KUNCI_RATE_LIMIT, JSON.stringify(data));
      return { terkunci: true, sisaDetik: Math.ceil(DURASI_KUNCI_MS / 1000) };
    }
    sessionStorage.setItem(KUNCI_RATE_LIMIT, JSON.stringify(data));
  } catch {
    // Ignore error
  }
  return { terkunci: false, sisaDetik: 0 };
}

function resetRateLimit(): void {
  try {
    sessionStorage.removeItem(KUNCI_RATE_LIMIT);
  } catch {
    // Ignore error
  }
}

export async function lakukanLogin(
  username: string,
  password: string,
  nisn: string,
  ingatSaya: boolean = false
): Promise<HasilLogin> {
  // Cek rate limiting sebelum request
  const statusLimit = cekRateLimitLogin();
  if (statusLimit.terkunci) {
    const menit = Math.ceil(statusLimit.sisaDetik / 60);
    return {
      success: false,
      message: `Terlalu banyak percobaan gagal. Akses dibatasi selama ${menit} menit demi keamanan.`,
    };
  }

  const tokenRecaptcha = await ambilTokenRecaptcha('login');
  let hasil: HasilLogin;
  try {
    hasil = await panggilApi<HasilLogin>(
      'login',
      [username, password, nisn],
      tokenRecaptcha
    );
  } catch (err: any) {
    catatPercobaanGagal();
    throw err;
  }

  if (hasil.success && hasil.token) {
    resetRateLimit();
    const dataSesi: SesiTersimpan = {
      success: true,
      token: hasil.token,
      role: hasil.role || 'siswa',
      username: hasil.username || username,
      nama: hasil.nama || username,
      kelas: hasil.kelas || '',
      nisn: hasil.nisn || null,
      loginAt: Date.now(),
    };
    simpanSesi(dataSesi, ingatSaya);
  } else {
    catatPercobaanGagal();
  }

  return hasil;
}

export function simpanSesi(sesi: SesiTersimpan, ingatSaya: boolean = true): void {
  try {
    if (!sesi.loginAt) sesi.loginAt = Date.now();
    const dataStr = JSON.stringify(sesi);
    // Selalu simpan di localStorage dan sessionStorage agar tahan refresh browser
    // dan langsung menimpa data sesi akun sebelumnya (mencegah akun lama tertinggal)
    localStorage.setItem(KUNCI_SESI_LOCAL_STORAGE, dataStr);
    sessionStorage.setItem(KUNCI_SESI_LOCAL_STORAGE, dataStr);
    if (ingatSaya) {
      localStorage.setItem('absensiIngatSaya', 'true');
    } else {
      localStorage.removeItem('absensiIngatSaya');
    }
  } catch (e) {
    console.error('Gagal menyimpan sesi:', e);
  }
}

export function ambilSesiAktif(): SesiTersimpan | null {
  try {
    // Periksa sessionStorage dulu, lalu fallback ke localStorage
    const raw = sessionStorage.getItem(KUNCI_SESI_LOCAL_STORAGE) || localStorage.getItem(KUNCI_SESI_LOCAL_STORAGE);
    if (!raw) return null;
    const sesi = JSON.parse(raw);
    if (sesi && sesi.token && sesi.success) {
      // Periksa masa berlaku sesi (24 jam)
      if (sesi.loginAt && (Date.now() - sesi.loginAt > MASA_BERLAKU_SESI_MS)) {
        console.warn('Sesi telah kedaluwarsa (lewat 24 jam). Mengeluarkan pengguna...');
        localStorage.removeItem(KUNCI_SESI_LOCAL_STORAGE);
        sessionStorage.removeItem(KUNCI_SESI_LOCAL_STORAGE);
        return null;
      }
      // Sinkronkan kembali ke kedua storage agar selalu selaras saat refresh
      try {
        sessionStorage.setItem(KUNCI_SESI_LOCAL_STORAGE, raw);
        localStorage.setItem(KUNCI_SESI_LOCAL_STORAGE, raw);
      } catch (_) {}
      return sesi as SesiTersimpan;
    }
  } catch (e) {
    localStorage.removeItem(KUNCI_SESI_LOCAL_STORAGE);
    sessionStorage.removeItem(KUNCI_SESI_LOCAL_STORAGE);
  }
  return null;
}

export function dapatkanTokenAktif(): string {
  return ambilSesiAktif()?.token || '';
}

export async function lakukanLogout(): Promise<void> {
  try {
    const raw = sessionStorage.getItem(KUNCI_SESI_LOCAL_STORAGE) || localStorage.getItem(KUNCI_SESI_LOCAL_STORAGE);
    if (raw) {
      const sesi = JSON.parse(raw);
      if (sesi?.token) {
        panggilApi('logout', [sesi.token]).catch(() => {});
      }
    }
  } catch {
    // Ignore error
  } finally {
    try {
      localStorage.removeItem(KUNCI_SESI_LOCAL_STORAGE);
      sessionStorage.removeItem(KUNCI_SESI_LOCAL_STORAGE);
      localStorage.removeItem('absensiIngatSaya');
      localStorage.removeItem('menuAktifApp');
      sessionStorage.removeItem('menuAktifApp');
      if (typeof window !== 'undefined') {
        window.location.hash = '';
      }
    } catch (e) {
      console.error('Gagal membersihkan sesi:', e);
    }
  }
}
