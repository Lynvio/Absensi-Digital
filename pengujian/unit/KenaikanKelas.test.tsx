/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HalamanKenaikanKelas } from '@/halaman/KenaikanKelas';
import {
  ambilDaftarKelas,
  ambilSiswaPerKelas,
  arsipDanResetTahun,
  prosesKenaikanSiswaTerpilih,
} from '@/layanan/LayananSiswa';
import Swal from 'sweetalert2';

vi.mock('@/layanan/LayananSiswa', () => ({
  ambilDaftarKelas: vi.fn(),
  ambilSiswaPerKelas: vi.fn(),
  arsipDanResetTahun: vi.fn(),
  prosesKenaikanSiswaTerpilih: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn() },
}));

const SESI_ADMIN = {
  success: true,
  token: 'token-admin',
  role: 'admin' as const,
  username: 'admin',
  nama: 'Administrator',
};

const DATA_SISWA = [
  { nisn: '00123', nama: 'Ayu Lestari', jenisKelamin: 'L', kelas: 'X TJKT 1' },
  { nisn: '00456', nama: 'Bima Saputra', jenisKelamin: 'P', kelas: 'X TJKT 1' },
];

describe('Perilaku halaman Kenaikan Kelas', () => {
  const setMemuat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ambilDaftarKelas).mockResolvedValue(['X TJKT 1', 'XI DKV']);
    vi.mocked(ambilSiswaPerKelas).mockResolvedValue(DATA_SISWA);
    vi.mocked(prosesKenaikanSiswaTerpilih).mockResolvedValue({
      success: true,
      data: { movedCount: 1 },
    });
    vi.mocked(arsipDanResetTahun).mockResolvedValue({ success: true });
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('memuat kelas saat halaman dibuka', async () => {
    render(<HalamanKenaikanKelas sesi={SESI_ADMIN} setMemuat={setMemuat} />);

    expect(await screen.findAllByRole('option', { name: 'XI DKV' })).toHaveLength(2);
    expect(ambilDaftarKelas).toHaveBeenCalledTimes(1);
    expect(ambilSiswaPerKelas).not.toHaveBeenCalled();
  });

  it('memvalidasi kelas asal dan tujuan sebelum meminta data siswa', async () => {
    render(<HalamanKenaikanKelas sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findAllByRole('option', { name: 'XI DKV' });

    fireEvent.click(screen.getByRole('button', { name: 'Muat Daftar Siswa' }));

    expect(Swal.fire).toHaveBeenCalledWith(
      'Perhatian',
      'Pilih kelas asal dan kelas tujuan terlebih dahulu.',
      'warning',
    );
    expect(ambilSiswaPerKelas).not.toHaveBeenCalled();
  });

  it('mengirim status NAIK dan TINGGAL, lalu mengosongkan daftar setelah sukses', async () => {
    render(<HalamanKenaikanKelas sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findAllByRole('option', { name: 'XI DKV' });
    fireEvent.change(screen.getByLabelText('Rombel Asal'), { target: { value: 'X TJKT 1' } });
    fireEvent.change(screen.getByLabelText('Naik Ke Rombel Tujuan'), {
      target: { value: 'XI DKV' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Muat Daftar Siswa' }));
    expect(await screen.findByText('Ayu Lestari')).toBeTruthy();

    const kotakCentang = screen.getAllByRole('checkbox');
    expect(kotakCentang).toHaveLength(2);
    fireEvent.click(kotakCentang[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Simpan & Eksekusi Kenaikan Rombel' }));

    await waitFor(() => {
      expect(prosesKenaikanSiswaTerpilih).toHaveBeenCalledWith('X TJKT 1', 'XI DKV', [
        { nisn: '00123', status: 'NAIK' },
        { nisn: '00456', status: 'TINGGAL' },
      ]);
    });
    expect(Swal.fire).toHaveBeenCalledWith(
      'Berhasil!',
      'Kenaikan kelas selesai diproses. 1 siswa dipindahkan.',
      'success',
    );
    expect(screen.queryByText('Ayu Lestari')).toBeNull();
    expect(setMemuat).toHaveBeenLastCalledWith(false);
  });

  it('membuang daftar siswa jika kelas asal atau tujuan berubah setelah daftar dimuat', async () => {
    render(<HalamanKenaikanKelas sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findAllByRole('option', { name: 'XI DKV' });
    const kelasAsal = screen.getByLabelText('Rombel Asal');
    const kelasTujuan = screen.getByLabelText('Naik Ke Rombel Tujuan');
    fireEvent.change(kelasAsal, { target: { value: 'X TJKT 1' } });
    fireEvent.change(kelasTujuan, { target: { value: 'XI DKV' } });
    fireEvent.click(screen.getByRole('button', { name: 'Muat Daftar Siswa' }));
    expect(await screen.findByText('Ayu Lestari')).toBeTruthy();

    fireEvent.change(kelasAsal, { target: { value: 'XI DKV' } });

    await waitFor(() => {
      expect(screen.queryByText('Ayu Lestari')).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Simpan & Eksekusi Kenaikan Rombel' }),
      ).toBeNull();
    });
  });

  it('menolak label arsip kosong dan mengarsipkan setelah konfirmasi', async () => {
    render(<HalamanKenaikanKelas sesi={SESI_ADMIN} setMemuat={setMemuat} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Arsipkan & Reset Database Absensi Utama' }),
    );
    expect(Swal.fire).toHaveBeenCalledWith(
      'Perhatian',
      'Harap isi Nama/Label File Arsip terlebih dahulu.',
      'warning',
    );
    expect(arsipDanResetTahun).not.toHaveBeenCalled();

    fireEvent.input(screen.getByLabelText('Label / Nama File Spreadsheet Arsip Baru'), {
      target: { value: '  Arsip 2026  ' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Arsipkan & Reset Database Absensi Utama' }),
    );

    await waitFor(() => expect(arsipDanResetTahun).toHaveBeenCalledWith('Arsip 2026'));
    expect(Swal.fire).toHaveBeenCalledWith(
      'Selesai!',
      'Data berhasil diarsipkan dan database absensi telah direset untuk tahun baru.',
      'success',
    );
    expect(screen.getByLabelText('Label / Nama File Spreadsheet Arsip Baru')).toHaveProperty(
      'value',
      '',
    );
  });

  it('menampilkan label arsip sebagai teks biasa, bukan HTML', async () => {
    const label = 'Arsip <img src=x onerror=alert(1)>';
    render(<HalamanKenaikanKelas sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    fireEvent.input(screen.getByLabelText('Label / Nama File Spreadsheet Arsip Baru'), {
      target: { value: label },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Arsipkan & Reset Database Absensi Utama' }),
    );

    await waitFor(() => expect(arsipDanResetTahun).toHaveBeenCalledWith(label));
    const konfirmasi = vi.mocked(Swal.fire).mock.calls.find(
      ([opsi]) => typeof opsi === 'object' && opsi !== null && 'title' in opsi,
    )?.[0];
    expect(konfirmasi).toMatchObject({
      title: 'TUTUP TAHUN AJARAN?',
      text: expect.stringContaining(label),
    });
    expect(konfirmasi).not.toHaveProperty('html');
  });
});
