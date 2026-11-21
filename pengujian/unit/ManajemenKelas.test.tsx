/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import { HalamanManajemenKelas } from '@/halaman/ManajemenKelas';
import {
  ambilMasterKelas,
  hapusKelas,
  tambahKelasBaru,
} from '@/layanan/LayananKelas';
import Swal from 'sweetalert2';

vi.mock('@/layanan/LayananKelas', () => ({
  ambilMasterKelas: vi.fn(),
  hapusKelas: vi.fn(),
  tambahKelasBaru: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn() },
}));

vi.mock('@/komponen/umum/SkeletonLoader', () => ({
  SkeletonKartu: () => <div data-testid="skeleton-kelas" />,
}));

const SESI_ADMIN: SesiTersimpan = {
  success: true,
  token: 'token-admin',
  role: 'admin',
  username: 'admin',
  nama: 'Administrator',
};

describe('Perilaku halaman Manajemen Kelas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ambilMasterKelas).mockResolvedValue(['X TJKT 1', 'XI DKV']);
    vi.mocked(tambahKelasBaru).mockResolvedValue({ success: true });
    vi.mocked(hapusKelas).mockResolvedValue({ success: true });
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
  });

  afterEach(() => {
    cleanup();
  });

  it('memuat kelas dan mencari tanpa membedakan huruf besar-kecil', async () => {
    render(<HalamanManajemenKelas sesi={SESI_ADMIN} setMemuat={vi.fn()} />);

    expect(await screen.findByText('X TJKT 1')).toBeTruthy();
    expect(screen.getByText('XI DKV')).toBeTruthy();
    expect(screen.getByText(/Total Rombel Aktif:/).textContent).toContain('2');

    fireEvent.input(screen.getByRole('searchbox', { name: 'Cari nama rombel' }), {
      target: { value: 'dkv' },
    });

    await waitFor(() => {
      expect(screen.getByText('XI DKV')).toBeTruthy();
      expect(screen.queryByText('X TJKT 1')).toBeNull();
      expect(screen.getByText(/Hasil Saring:/).textContent).toContain('1');
    });
  });

  it('menolak nama kelas kosong setelah trim tanpa memanggil API', async () => {
    render(<HalamanManajemenKelas sesi={SESI_ADMIN} setMemuat={vi.fn()} />);
    await screen.findByText('X TJKT 1');
    fireEvent.input(screen.getByRole('textbox', { name: 'Nama rombel baru' }), {
      target: { value: '   ' },
    });

    const form = screen.getByRole('textbox', { name: 'Nama rombel baru' }).closest('form');
    fireEvent.submit(form!);

    expect(tambahKelasBaru).not.toHaveBeenCalled();
  });

  it('mengirim nama kelas yang sudah di-trim dan membersihkan formulir setelah berhasil', async () => {
    vi.mocked(ambilMasterKelas)
      .mockResolvedValueOnce(['X TJKT 1'])
      .mockResolvedValueOnce(['X TJKT 1', 'XI DKV']);
    render(<HalamanManajemenKelas sesi={SESI_ADMIN} setMemuat={vi.fn()} />);
    await screen.findByText('X TJKT 1');

    const input = screen.getByRole('textbox', { name: 'Nama rombel baru' });
    fireEvent.input(input, { target: { value: '  XI DKV  ' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(tambahKelasBaru).toHaveBeenCalledWith('token-admin', 'XI DKV');
    });
    expect(Swal.fire).toHaveBeenCalledWith(
      'Berhasil',
      'Kelas XI DKV berhasil ditambahkan.',
      'success'
    );
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''));
    expect(ambilMasterKelas).toHaveBeenCalledTimes(2);
  });

  it('menampilkan pesan backend saat penambahan kelas gagal', async () => {
    vi.mocked(tambahKelasBaru).mockResolvedValue({
      success: false,
      message: 'Nama kelas sudah digunakan.',
    });
    render(<HalamanManajemenKelas sesi={SESI_ADMIN} setMemuat={vi.fn()} />);
    await screen.findByText('X TJKT 1');

    const input = screen.getByRole('textbox', { name: 'Nama rombel baru' });
    fireEvent.input(input, { target: { value: 'XI DKV' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith('Gagal', 'Nama kelas sudah digunakan.', 'error');
    });
  });

  it('menjelaskan batas penghapusan dan tidak menghapus saat konfirmasi dibatalkan', async () => {
    vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false } as never);
    render(<HalamanManajemenKelas sesi={SESI_ADMIN} setMemuat={vi.fn()} />);
    await screen.findByText('X TJKT 1');

    fireEvent.click(screen.getByRole('button', { name: 'Hapus kelas X TJKT 1' }));

    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    expect(vi.mocked(Swal.fire).mock.calls[0][0]).toMatchObject({
      text: expect.stringContaining('Kelas yang masih digunakan siswa tidak dapat dihapus.'),
    });
    expect(hapusKelas).not.toHaveBeenCalled();
  });

  it('menghapus hanya setelah dikonfirmasi dan memuat ulang daftar kelas', async () => {
    vi.mocked(ambilMasterKelas)
      .mockResolvedValueOnce(['X TJKT 1', 'XI DKV'])
      .mockResolvedValueOnce(['XI DKV']);
    render(<HalamanManajemenKelas sesi={SESI_ADMIN} setMemuat={vi.fn()} />);
    await screen.findByText('X TJKT 1');

    fireEvent.click(screen.getByRole('button', { name: 'Hapus kelas X TJKT 1' }));

    await waitFor(() => expect(hapusKelas).toHaveBeenCalledWith('token-admin', 'X TJKT 1'));
    await waitFor(() => expect(ambilMasterKelas).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('XI DKV')).toBeTruthy();
    expect(screen.queryByText('X TJKT 1')).toBeNull();
  });

  it('menampilkan kegagalan pemuatan daftar kelas', async () => {
    vi.mocked(ambilMasterKelas).mockRejectedValueOnce(new Error('Layanan tidak tersedia'));

    render(<HalamanManajemenKelas sesi={SESI_ADMIN} setMemuat={vi.fn()} />);

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith('Error', 'Layanan tidak tersedia', 'error');
    });
  });
});
