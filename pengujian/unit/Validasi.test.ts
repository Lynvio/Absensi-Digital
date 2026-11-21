/**
 * Pengujian Unit: Utilitas Validasi
 */

import { describe, it, expect } from 'vitest';
import { validasiNisn, validasiPassword, bersihkanTeks } from '../../src/utilitas/Validasi';

describe('Pengujian Utilitas Validasi', () => {
  it('harus memvalidasi NISN dengan panjang 8-12 angka', () => {
    expect(validasiNisn('12345678')).toBe(true);
    expect(validasiNisn('123456789012')).toBe(true);
    expect(validasiNisn('12345')).toBe(false);
    expect(validasiNisn('abcdefgh')).toBe(false);
  });

  it('harus memvalidasi panjang password minimal 3 karakter', () => {
    expect(validasiPassword('123')).toBe(true);
    expect(validasiPassword('admin')).toBe(true);
    expect(validasiPassword('12')).toBe(false);
  });

  it('harus membersihkan spasi berlebih pada teks', () => {
    expect(bersihkanTeks('  teks uji coba  ')).toBe('teks uji coba');
  });
});
