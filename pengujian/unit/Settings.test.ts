/**
 * Pengujian Unit: Modul Konfigurasi Terpusat Settings
 */

import { describe, it, expect } from 'vitest';
import {
  IDENTITAS_SEKOLAH,
  TAMPILAN_TEMA,
  PERANGKAT_EKSTERNAL,
  DAFTAR_KEBIJAKAN_STATUS,
  tentukanStatusWaktu,
} from '../../src/settings';

describe('Pengujian Konfigurasi Terpusat (Settings)', () => {
  it('identitas sekolah harus valid dan bertahun 2026', () => {
    expect(IDENTITAS_SEKOLAH.nama).toBeTruthy();
    expect(IDENTITAS_SEKOLAH.npsn).toBeTruthy();
    expect(IDENTITAS_SEKOLAH.tahunKalender).toBe(2026);
    expect(IDENTITAS_SEKOLAH.logo).toBeTruthy();
  });

  it('tampilan tema harus memiliki hak cipta tahun 2026 tanpa teks berlebih', () => {
    expect(TAMPILAN_TEMA.tahun).toBe(2026);
    expect(TAMPILAN_TEMA.hakCipta).toContain('2026');
    expect(TAMPILAN_TEMA.hakCipta).not.toContain('dilindungi');
    expect(TAMPILAN_TEMA.hakCipta).not.toContain('Hak Cipta');
  });

  it('logika tentukanStatusWaktu harus bekerja secara akurat', () => {
    expect(tentukanStatusWaktu('05:30')).toBe('Terlalu Pagi');
    expect(tentukanStatusWaktu('06:45')).toBe('Hadir');
    expect(tentukanStatusWaktu('07:15')).toBe('Hadir');
    expect(tentukanStatusWaktu('07:20')).toBe('Terlambat');
    expect(tentukanStatusWaktu('08:00')).toBe('Terlambat');
  });

  it('kebijakan status kehadiran harus mencakup Hadir, Terlambat, Sakit, Izin, Alpha', () => {
    expect(DAFTAR_KEBIJAKAN_STATUS.Hadir.dihitungHadir).toBe(true);
    expect(DAFTAR_KEBIJAKAN_STATUS.Terlambat.dihitungHadir).toBe(true);
    expect(DAFTAR_KEBIJAKAN_STATUS.Sakit.dihitungHadir).toBe(false);
    expect(DAFTAR_KEBIJAKAN_STATUS.Izin.dihitungHadir).toBe(false);
    expect(DAFTAR_KEBIJAKAN_STATUS.Alpha.dihitungHadir).toBe(false);
  });

  it('konfigurasi perangkat eksternal harus memiliki parameter yang aman', () => {
    expect(PERANGKAT_EKSTERNAL.kamera.delayScanUlangMs).toBeGreaterThanOrEqual(1500);
    expect(PERANGKAT_EKSTERNAL.scannerUsbHid.aktifkanListenerKeystroke).toBe(true);
  });
});
