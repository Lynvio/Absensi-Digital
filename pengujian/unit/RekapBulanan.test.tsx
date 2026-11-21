/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HalamanRekapBulanan } from '@/halaman/RekapBulanan';
import { ambilLaporanBulanan, unduhLaporanExcel } from '@/layanan/LayananAbsensi';
import { ambilDaftarKelas } from '@/layanan/LayananSiswa';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

vi.mock('@/layanan/LayananSiswa', () => ({
  ambilDaftarKelas: vi.fn(),
}));

vi.mock('@/layanan/LayananAbsensi', () => ({
  ambilLaporanBulanan: vi.fn(),
  unduhLaporanExcel: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn() },
}));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn((rows) => ({ rows })),
    book_new: vi.fn(() => ({ sheets: [] })),
    book_append_sheet: vi.fn((workbook, sheet, name) => workbook.sheets.push({ sheet, name })),
  },
  writeFile: vi.fn(),
}));

vi.mock('@/komponen/umum/SkeletonLoader', () => ({
  SkeletonBarisTabel: () => <tr data-testid="skeleton-rekap" />,
}));

const SESI_ADMIN = {
  success: true,
  token: 'token-admin',
  role: 'admin' as const,
  username: 'admin',
  nama: 'Administrator',
};

const DATA_REKAP = [
  {
    nama: '=HYPERLINK("https://asing.example","Buka")',
    kelas: 'X TJKT 1',
    stats: { h: 18, s: 1, i: 2, a: 0, effectiveDays: 21, percent: 86 },
  },
];

describe('Perilaku halaman Rekap Bulanan', () => {
  const setMemuat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ambilDaftarKelas).mockResolvedValue(['X TJKT 1', 'XI DKV']);
    vi.mocked(ambilLaporanBulanan).mockResolvedValue({ success: true, data: DATA_REKAP });
    vi.mocked(unduhLaporanExcel).mockResolvedValue({
      success: true,
      data: { url: 'https://drive.google.com/rekap.xlsx' },
    });
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('memuat daftar kelas tanpa mengambil rekap sampai diminta', async () => {
    render(<HalamanRekapBulanan sesi={SESI_ADMIN} setMemuat={setMemuat} />);

    expect(await screen.findByRole('option', { name: 'X TJKT 1' })).toBeTruthy();
    expect(ambilDaftarKelas).toHaveBeenCalledTimes(1);
    expect(ambilLaporanBulanan).not.toHaveBeenCalled();
    expect(screen.getByText(/Pilih bulan dan klik/)).toBeTruthy();
  });

  it('mengirim filter terpilih dan menormalisasi statistik bulanan', async () => {
    render(<HalamanRekapBulanan sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findByRole('option', { name: 'X TJKT 1' });

    fireEvent.change(screen.getByLabelText('Pilih Bulan'), { target: { value: '2' } });
    fireEvent.input(screen.getByLabelText('Tahun'), { target: { value: '2025' } });
    fireEvent.change(screen.getByLabelText('Filter Rombel / Kelas'), {
      target: { value: 'X TJKT 1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan Rekap' }));

    expect(await screen.findByText('86%')).toBeTruthy();
    expect(ambilLaporanBulanan).toHaveBeenCalledWith(2, 2025, 'X TJKT 1');
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent?.trim())).toEqual([
      '1',
      '=HYPERLINK("https://asing.example","Buka")',
      'X TJKT 1',
      '18',
      '1',
      '2',
      '0',
      '21',
      '86%',
    ]);
  });

  it('menormalisasi format respons students dengan persentase dari stats', async () => {
    vi.mocked(ambilLaporanBulanan).mockResolvedValueOnce({
      success: true,
      data: {
        students: [
          {
            nama: 'Ayu Lestari',
            kelas: 'X TJKT 1',
            persen: null,
            stats: { h: 20, s: 0, i: 1, a: 0, effectiveDays: 21, percent: 95 },
          },
        ],
      },
    });
    render(<HalamanRekapBulanan sesi={SESI_ADMIN} setMemuat={setMemuat} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan Rekap' }));

    expect(await screen.findByText('95%')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
  });

  it('mengunduh ekspor server dan menutup indikator global', async () => {
    const bukaJendela = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<HalamanRekapBulanan sesi={SESI_ADMIN} setMemuat={setMemuat} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export File Excel' }));

    await waitFor(() => {
      expect(unduhLaporanExcel).toHaveBeenCalledWith('laporan_bulanan', {
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear(),
        kelas: '',
      });
    });
    expect(bukaJendela).toHaveBeenCalledWith('https://drive.google.com/rekap.xlsx', '_blank');
    expect(setMemuat).toHaveBeenNthCalledWith(1, true);
    expect(setMemuat).toHaveBeenLastCalledWith(false);
  });

  it('menggunakan ekspor lokal yang menetralkan formula ketika ekspor server gagal', async () => {
    vi.mocked(unduhLaporanExcel).mockRejectedValueOnce(new Error('Server ekspor tidak tersedia'));
    render(<HalamanRekapBulanan sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan Rekap' }));
    await screen.findByText('86%');

    fireEvent.click(screen.getByRole('button', { name: 'Export File Excel' }));

    await waitFor(() => expect(XLSX.writeFile).toHaveBeenCalled());
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({
      'Nama Siswa': `'=HYPERLINK("https://asing.example","Buka")`,
      Kelas: 'X TJKT 1',
      Hadir: 18,
      Sakit: 1,
      Izin: 2,
      Alpa: 0,
      'Hari Efektif': 21,
      Persentase: '86%',
    });
    expect(vi.mocked(XLSX.writeFile).mock.calls[0][1]).toMatch(/^Rekap_Absensi_/);
  });

  it('menampilkan kesalahan saat rekap gagal dimuat', async () => {
    vi.mocked(ambilLaporanBulanan).mockRejectedValueOnce(new Error('Layanan rekap tidak tersedia'));
    render(<HalamanRekapBulanan sesi={SESI_ADMIN} setMemuat={setMemuat} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan Rekap' }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        'Error',
        'Layanan rekap tidak tersedia',
        'error',
      );
    });
    expect(screen.getByText(/Pilih bulan dan klik/)).toBeTruthy();
  });
});
