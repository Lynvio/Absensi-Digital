/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HalamanMonitoringLive } from '@/halaman/MonitoringLive';
import { ambilDataMonitoring } from '@/layanan/LayananAbsensi';

vi.mock('@/layanan/LayananAbsensi', () => ({
  ambilDataMonitoring: vi.fn(),
}));

const DATA_MONITORING = [
  {
    nama: 'Ayu Lestari',
    nisn: '00123',
    kelas: 'X TJKT 1',
    status: 'Hadir',
    jamDatang: '07:05',
    jamPulang: '15:00',
  },
  {
    nama: 'Bima Saputra',
    nisn: '00456',
    kelas: 'X TJKT 1',
    status: 'Sakit',
    jamDatang: '-',
    jamPulang: '-',
  },
  {
    nama: 'Citra Anggraini',
    nisn: '00789',
    kelas: 'XI DKV',
    status: 'Izin',
    jamDatang: '07:12',
    jamPulang: '-',
  },
  {
    nama: 'Deni Pratama',
    nisn: '00987',
    kelas: 'XI DKV',
    status: 'Alpa',
    jamDatang: '-',
    jamPulang: '-',
  },
];

describe('Perilaku halaman Pemantauan Kehadiran Langsung', () => {
  const setMemuat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ambilDataMonitoring).mockResolvedValue({
      success: true,
      data: DATA_MONITORING,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('memuat data awal, menghitung ringkasan status, dan menampilkan waktu presensi', async () => {
    render(<HalamanMonitoringLive setMemuat={setMemuat} />);

    expect(await screen.findByText('Ayu Lestari')).toBeTruthy();
    expect(ambilDataMonitoring).toHaveBeenCalledTimes(1);
    expect(setMemuat).toHaveBeenNthCalledWith(1, true);
    expect(setMemuat).toHaveBeenLastCalledWith(false);
    expect(screen.getByText('Total:').textContent).toContain('4');
    expect(screen.getByText('Hadir:').textContent).toContain('1');
    expect(screen.getByText('Sakit:').textContent).toContain('1');
    expect(screen.getByText('Izin:').textContent).toContain('1');
    expect(screen.getByText('Alpa:').textContent).toContain('1');
    expect(screen.getByText('07:05')).toBeTruthy();
    expect(screen.getByText('15:00')).toBeTruthy();
  });

  it('mencari nama atau NISN dan memfilter hasil berdasarkan kelas', async () => {
    render(<HalamanMonitoringLive setMemuat={setMemuat} />);
    await screen.findByText('Ayu Lestari');

    fireEvent.input(screen.getByRole('textbox', { name: 'Cari siswa atau NISN' }), {
      target: { value: '00789' },
    });

    await waitFor(() => {
      expect(screen.getByText('Citra Anggraini')).toBeTruthy();
      expect(screen.queryByText('Ayu Lestari')).toBeNull();
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter pemantauan berdasarkan kelas' }), {
      target: { value: 'X TJKT 1' },
    });

    await waitFor(() => {
      expect(screen.getByText('Tidak ada data presensi siswa yang cocok.')).toBeTruthy();
      expect(screen.queryByText('Citra Anggraini')).toBeNull();
    });
  });

  it('memuat ulang secara manual dan membungkus operasi dengan indikator global', async () => {
    vi.mocked(ambilDataMonitoring)
      .mockResolvedValueOnce({ success: true, data: DATA_MONITORING })
      .mockResolvedValueOnce({
        success: true,
        data: [{ ...DATA_MONITORING[0], nama: 'Ayu Lestari Terbaru' }],
      });
    render(<HalamanMonitoringLive setMemuat={setMemuat} />);
    await screen.findByText('Ayu Lestari');

    fireEvent.click(screen.getByTitle('Muat Ulang Data Sekarang'));

    expect(await screen.findByText('Ayu Lestari Terbaru')).toBeTruthy();
    expect(ambilDataMonitoring).toHaveBeenCalledTimes(2);
    expect(setMemuat).toHaveBeenCalledWith(true);
    expect(setMemuat).toHaveBeenLastCalledWith(false);
  });

  it('memperbarui data tiap 30 detik tanpa indikator global dan menghentikan polling saat unmount', async () => {
    vi.useFakeTimers();
    const tampilan = render(<HalamanMonitoringLive setMemuat={setMemuat} />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(ambilDataMonitoring).toHaveBeenCalledTimes(1);
    setMemuat.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(ambilDataMonitoring).toHaveBeenCalledTimes(2);
    expect(setMemuat).not.toHaveBeenCalled();

    tampilan.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(ambilDataMonitoring).toHaveBeenCalledTimes(2);
  });

  it('menampilkan kesalahan pemuatan dan tetap menutup indikator global', async () => {
    vi.mocked(ambilDataMonitoring).mockRejectedValueOnce(new Error('Layanan tidak tersedia'));
    render(<HalamanMonitoringLive setMemuat={setMemuat} />);

    expect((await screen.findByRole('alert')).textContent).toContain('Layanan tidak tersedia');
    expect(setMemuat).toHaveBeenLastCalledWith(false);
  });
});
