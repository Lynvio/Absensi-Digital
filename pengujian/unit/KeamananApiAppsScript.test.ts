import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SUMBER = readFileSync(`${ROOT}/code.gs`, 'utf8');

function buatLingkunganAppsScript(spreadsheetId = 'spreadsheet-test', role = 'guru') {
  let kontenRespons = '';
  const utilities = {
    getUuid: () => 'salt-test',
    computeHmacSha256Signature: (value: string, key: string) =>
      Array.from({ length: 32 }, (_, indeks) =>
        (`${key}:${value}`.charCodeAt(indeks) || 0) % 256
      ),
    base64Encode: (value: number[]) => Buffer.from(value).toString('base64'),
    base64EncodeWebSafe: (value: number[]) => Buffer.from(value).toString('base64url'),
  };
  const panggilDataSiswa = vi.fn(() => ({ success: true, data: ['data pribadi'] }));
  const bukaSpreadsheet = vi.fn(() => ({
    getSheetByName: () => ({
      getDataRange: () => ({
        getValues: () => [
          ['Token', 'Identifier', 'Role', 'Expiry'],
          ['token-guru-valid', 'guru1', role, new Date(Date.now() + 60_000)],
        ],
      }),
    }),
  }));
  const lingkungan = {
    Date,
    Utilities: utilities,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (nama: string) => (nama === 'SPREADSHEET_ID' ? spreadsheetId : ''),
      }),
    },
    SpreadsheetApp: { openById: bukaSpreadsheet },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (konten: string) => {
        kontenRespons = konten;
        return {
          setMimeType: () => ({
            getContent: () => kontenRespons,
          }),
        };
      },
    },
  };

  runInNewContext(SUMBER, lingkungan);
  const skrip = lingkungan as typeof lingkungan & {
    doPost: (event: { postData: { contents: string } }) => { getContent: () => string };
    getSiswaList: typeof panggilDataSiswa;
    addKelas: (...args: unknown[]) => unknown;
    hashSecret_: (secret: string, salt?: string) => string;
    getSpreadsheet: () => unknown;
  };
  skrip.getSiswaList = panggilDataSiswa;

  return { skrip, panggilDataSiswa, bukaSpreadsheet };
}

function panggilAksi(
  skrip: ReturnType<typeof buatLingkunganAppsScript>['skrip'],
  payload: Record<string, unknown>
) {
  const respons = skrip.doPost({
    postData: { contents: JSON.stringify(payload) },
  });
  return JSON.parse(respons.getContent()) as Record<string, unknown>;
}

describe('Keamanan API data siswa Apps Script', () => {
  it.each([
    'getSiswaList',
    'getSiswaByKelas',
    'getSiswaByNisn',
    'getSiswaForScanCache',
    'lookupSiswaForScan',
  ])('menolak aksi %s tanpa token sebelum membaca data', (aksi) => {
    const { skrip, panggilDataSiswa } = buatLingkunganAppsScript();
    (skrip as unknown as Record<string, unknown>)[aksi] = panggilDataSiswa;

    const hasil = panggilAksi(skrip, { action: aksi, args: [] });

    expect(hasil.__gasError).toBe(true);
    expect(panggilDataSiswa).not.toHaveBeenCalled();
  });

  it('mengizinkan guru dengan token sesi valid mengambil daftar siswa', () => {
    const { skrip, panggilDataSiswa } = buatLingkunganAppsScript();

    const hasil = panggilAksi(skrip, {
      action: 'getSiswaList',
      args: ['token-guru-valid', null],
      authToken: 'token-guru-valid',
    });

    expect(hasil.success).toBe(true);
    expect(panggilDataSiswa).toHaveBeenCalledOnce();
  });

  it('menolak token siswa untuk membaca daftar data pribadi seluruh siswa', () => {
    const { skrip, panggilDataSiswa } = buatLingkunganAppsScript('spreadsheet-test', 'siswa');

    const hasil = panggilAksi(skrip, {
      action: 'getSiswaList',
      args: ['token-guru-valid', null],
      authToken: 'token-guru-valid',
    });

    expect(hasil.__gasError).toBe(true);
    expect(panggilDataSiswa).not.toHaveBeenCalled();
  });

  it.each(['addKelas', 'updateKelas', 'deleteKelas'])(
    'menolak aksi admin %s tanpa token sebelum fungsi dijalankan',
    (aksi) => {
      const { skrip } = buatLingkunganAppsScript();
      const aksiAdmin = vi.fn(() => ({ success: true }));
      (skrip as unknown as Record<string, unknown>)[aksi] = aksiAdmin;

      const hasil = panggilAksi(skrip, { action: aksi, args: [] });

      expect(hasil.__gasError).toBe(true);
      expect(aksiAdmin).not.toHaveBeenCalled();
    }
  );

  it.each(['addKelas', 'updateKelas', 'deleteKelas'])(
    'menolak aksi admin %s untuk token guru',
    (aksi) => {
      const { skrip } = buatLingkunganAppsScript('spreadsheet-test', 'guru');
      const aksiAdmin = vi.fn(() => ({ success: true }));
      (skrip as unknown as Record<string, unknown>)[aksi] = aksiAdmin;

      const hasil = panggilAksi(skrip, {
        action: aksi,
        args: [],
        authToken: 'token-guru-valid',
      });

      expect(hasil.__gasError).toBe(true);
      expect(aksiAdmin).not.toHaveBeenCalled();
    }
  );

  it('mengizinkan aksi admin untuk token admin valid', () => {
    const { skrip } = buatLingkunganAppsScript('spreadsheet-test', 'admin');
    const aksiAdmin = vi.fn(() => ({ success: true }));
    skrip.addKelas = aksiAdmin;

    const hasil = panggilAksi(skrip, {
      action: 'addKelas',
      args: [],
      authToken: 'token-guru-valid',
    });

    expect(hasil.success).toBe(true);
    expect(aksiAdmin).toHaveBeenCalledOnce();
  });

  it.each([
    ['addKelas', [null, 'Kelas Baru']],
    ['updateKelas', [null, 'Kelas Lama', 'Kelas Baru']],
    ['deleteKelas', [null, 'Kelas Lama']],
  ])('memastikan pemanggilan langsung %s tetap memverifikasi admin', (aksi, args) => {
    const { skrip } = buatLingkunganAppsScript();
    const verifikasi = vi.fn(() => {
      throw new Error('Akses Ditolak');
    });
    (skrip as unknown as Record<string, unknown>).verifyUser = verifikasi;
    const fungsiAksi = (skrip as unknown as Record<
      string,
      (...parameter: unknown[]) => unknown
    >)[aksi];

    expect(() => fungsiAksi(...args)).not.toThrow();
    expect(verifikasi).toHaveBeenCalledWith(null, 'admin');
  });

  it('membuka spreadsheet sesuai konfigurasi SPREADSHEET_ID', () => {
    const { skrip, bukaSpreadsheet } = buatLingkunganAppsScript('spreadsheet-test');

    expect(() => skrip.getSpreadsheet()).not.toThrow();
    expect(bukaSpreadsheet).toHaveBeenCalledWith('spreadsheet-test');
  });

  it('menghasilkan hash password tanpa mengirim number[] ke HMAC setelah iterasi pertama', () => {
    const { skrip } = buatLingkunganAppsScript();

    const hash = skrip.hashSecret_('admin123', 'salt-test');

    expect(hash).toMatch(/^hmacsha256\$12000\$salt-test\$/);
  });
});
