/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HalamanDataGuru } from '@/halaman/DataGuru';
import {
  ambilDaftarGuru,
  hapusDataGuru,
  imporGuruMassal,
  simpanGuruBaru,
} from '@/layanan/LayananGuru';
import { ambilMasterKelas } from '@/layanan/LayananKelas';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

vi.mock('@/layanan/LayananGuru', () => ({
  ambilDaftarGuru: vi.fn(),
  hapusDataGuru: vi.fn(),
  imporGuruMassal: vi.fn(),
  simpanGuruBaru: vi.fn(),
}));

vi.mock('@/layanan/LayananKelas', () => ({
  ambilMasterKelas: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn() },
}));

vi.mock('xlsx', () => ({
  read: vi.fn(() => ({ SheetNames: ['Akun'], Sheets: { Akun: {} } })),
  utils: {
    json_to_sheet: vi.fn((rows) => ({ rows })),
    book_new: vi.fn(() => ({ sheets: [] })),
    book_append_sheet: vi.fn((workbook, sheet, name) => workbook.sheets.push({ sheet, name })),
    sheet_to_json: vi.fn(() => []),
  },
  writeFile: vi.fn(),
}));

vi.mock('@/komponen/umum/SkeletonLoader', () => ({
  SkeletonBarisTabel: () => <tr data-testid="skeleton-guru" />,
}));

const SESI_ADMIN = {
  success: true,
  token: 'token-admin',
  role: 'admin' as const,
  username: 'admin',
  nama: 'Administrator',
};

const DATA_GURU = [
  { username: 'guru_matematika', role: 'guru', kelas: 'X TJKT 1, XI DKV' },
  { username: 'wakasek', role: 'wakel', kelas: '' },
];

describe('Perilaku halaman Data Guru', () => {
  const setMemuat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ambilDaftarGuru).mockResolvedValue({ success: true, data: DATA_GURU });
    vi.mocked(ambilMasterKelas).mockResolvedValue(['X TJKT 1', 'XI DKV']);
    vi.mocked(simpanGuruBaru).mockResolvedValue({ success: true });
    vi.mocked(hapusDataGuru).mockResolvedValue({ success: true });
    vi.mocked(imporGuruMassal).mockResolvedValue({ success: true, message: 'Akun diimpor.' });
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('memuat akun dan kelas menggunakan sesi admin', async () => {
    render(<HalamanDataGuru sesi={SESI_ADMIN} setMemuat={setMemuat} />);

    expect(await screen.findByText('guru_matematika')).toBeTruthy();
    expect(screen.getByText('wakasek')).toBeTruthy();
    expect(ambilDaftarGuru).toHaveBeenCalledWith('token-admin');
    expect(ambilMasterKelas).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Total Akun:/).textContent).toContain('2');
    expect(screen.getByText('X TJKT 1')).toBeTruthy();
    expect(screen.getByText('Semua / Bebas Akses')).toBeTruthy();
  });

  it('mencari username tanpa mengubah jumlah total akun', async () => {
    render(<HalamanDataGuru sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findByText('guru_matematika');

    fireEvent.input(screen.getByRole('textbox', { name: 'Cari username guru' }), {
      target: { value: 'WAKA' },
    });

    await waitFor(() => {
      expect(screen.getByText('wakasek')).toBeTruthy();
      expect(screen.queryByText('guru_matematika')).toBeNull();
      expect(screen.getByText(/Total Akun:/).textContent).toContain('2');
      expect(screen.getByText(/Hasil Saring:/).textContent).toContain('1');
    });
  });

  it('membuat akun dengan kelas pilihan dan menutup indikator global', async () => {
    render(<HalamanDataGuru sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findByText('guru_matematika');
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Akun' }));
    await screen.findByRole('dialog');
    fireEvent.input(screen.getByLabelText('Username Pengguna'), {
      target: { value: '  guru_baru  ' },
    });
    fireEvent.input(screen.getByLabelText('Kata Sandi (Password)'), {
      target: { value: 'sandi-kuat' },
    });
    fireEvent.change(screen.getByLabelText('Peran / Hak Akses Akun'), {
      target: { value: 'wakel' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'X TJKT 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'XI DKV' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Username Pengguna')).toHaveProperty('value', '  guru_baru  ');
      expect(screen.getByLabelText('Kata Sandi (Password)')).toHaveProperty(
        'value',
        'sandi-kuat',
      );
      expect(screen.getByRole('combobox', { name: 'Peran / Hak Akses Akun' })).toHaveProperty(
        'value',
        'wakel',
      );
      expect(screen.getByRole('button', { name: 'X TJKT 1' }).getAttribute('aria-pressed')).toBe(
        'true',
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Akun' }));

    await waitFor(() => {
      expect(simpanGuruBaru).toHaveBeenCalledWith('token-admin', {
        username: 'guru_baru',
        password: 'sandi-kuat',
        role: 'wakel',
        kelas: 'X TJKT 1,XI DKV',
      });
    });
    expect(Swal.fire).toHaveBeenCalledWith(
      'Berhasil',
      'Akun guru/admin baru berhasil dibuat.',
      'success',
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(setMemuat).toHaveBeenNthCalledWith(1, true);
    expect(setMemuat).toHaveBeenLastCalledWith(false);
  });

  it('mengelola fokus dialog dan menutupnya dengan tombol Escape', async () => {
    render(<HalamanDataGuru sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findByText('guru_matematika');
    const tombolTambah = screen.getByRole('button', { name: 'Tambah Akun' });
    tombolTambah.focus();
    fireEvent.click(tombolTambah);

    await screen.findByRole('dialog');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Username Pengguna')));
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(tombolTambah);
  });

  it('mengonfirmasi penghapusan akun sebelum memanggil layanan', async () => {
    render(<HalamanDataGuru sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findByText('guru_matematika');
    fireEvent.click(screen.getAllByTitle('Hapus Akun Pengajar')[0]);

    await waitFor(() => expect(hapusDataGuru).toHaveBeenCalledWith('token-admin', 'guru_matematika'));
    expect(Swal.fire).toHaveBeenCalledWith(
      'Berhasil',
      'Akun berhasil dihapus',
      'success',
    );
    expect(setMemuat).toHaveBeenLastCalledWith(false);
  });

  it('menetralkan formula spreadsheet pada ekspor username, role, dan kelas', async () => {
    vi.mocked(ambilDaftarGuru).mockResolvedValueOnce({
      success: true,
      data: [
        {
          username: '=HYPERLINK("https://asing.example","Buka")',
          role: '+SUM(1,1)',
          kelas: '-2+3',
        },
      ],
    });
    render(<HalamanDataGuru sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findByText('=HYPERLINK("https://asing.example","Buka")');
    fireEvent.click(screen.getByTitle('Download daftar akun guru sebagai file Excel'));

    await waitFor(() => expect(XLSX.writeFile).toHaveBeenCalled());
    const calls = vi.mocked(XLSX.utils.json_to_sheet).mock.calls;
    const rows = calls[calls.length - 1]?.[0] as Array<
      Record<string, unknown>
    >;
    expect(rows[0]).toEqual({
      No: 1,
      Username: `'=HYPERLINK("https://asing.example","Buka")`,
      Role: "'+SUM(1,1)",
      Kelas: "'-2+3",
    });
    const writeCalls = vi.mocked(XLSX.writeFile).mock.calls;
    expect(String(writeCalls[writeCalls.length - 1]?.[1])).toContain('Data_Akun_Guru');
  });

  it('mengubah data dari file Excel, menormalisasi role yang tidak dikenal, lalu impor setelah konfirmasi', async () => {
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      { Username: ' guru_baru ', Password: ' sandi ', Role: 'peran-asing', Kelas: 'XI DKV' },
      { User: 'guru_kedua', Sandi: ' rahasia ', Peran: 'WAKEL', Rombel: 'X TJKT 1' },
      { Username: '', Password: 'tanpa-user', Role: 'admin' },
    ]);
    render(<HalamanDataGuru sesi={SESI_ADMIN} setMemuat={setMemuat} />);
    await screen.findByText('guru_matematika');
    fireEvent.click(screen.getByTitle('Import akun guru secara massal dari file Excel'));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, {
      target: { files: [new File(['data'], 'akun.xlsx')] },
    });

    await waitFor(() => {
      expect(imporGuruMassal).toHaveBeenCalledWith('token-admin', [
        { username: 'guru_baru', password: 'sandi', role: 'guru', kelas: 'XI DKV' },
        { username: 'guru_kedua', password: 'rahasia', role: 'wakel', kelas: 'X TJKT 1' },
      ]);
    });
    expect(Swal.fire).toHaveBeenCalledWith(
      'Berhasil Import!',
      'Akun diimpor.',
      'success',
    );
    expect(setMemuat).toHaveBeenLastCalledWith(false);
  });
});
