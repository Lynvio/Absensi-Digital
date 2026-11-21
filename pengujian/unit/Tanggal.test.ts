/**
 * Pengujian Unit: Utilitas Tanggal
 */

import { describe, it, expect } from 'vitest';
import { formatTanggalIndonesia, dapatkanTanggalHariIni } from '../../src/utilitas/Tanggal';

describe('Pengujian Utilitas Tanggal', () => {
  it('harus memformat tanggal ke bahasa Indonesia', () => {
    const tgl = new Date(2026, 9, 12); // 12 Oktober 2026
    const hasil = formatTanggalIndonesia(tgl);
    expect(hasil).toContain('Oktober');
    expect(hasil).toContain('2026');
  });

  it('harus mengembalikan tanggal hari ini dengan format YYYY-MM-DD', () => {
    const hariIni = dapatkanTanggalHariIni();
    expect(hariIni).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
