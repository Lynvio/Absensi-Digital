import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tanganiPermintaanGas } from '../../functions/_shared/gas-proxy.js';
import { onRequest } from '../../functions/api/gas.js';
import handler from '../../api/gas.js';

const LINGKUNGAN = {
  GAS_URL: 'https://script.google.com/macros/s/test/exec',
  ALLOWED_ORIGIN: 'https://sekolah.example',
};

function buatPermintaan(
  method: string,
  isi?: string,
  origin = 'https://sekolah.example'
): Request {
  return new Request('https://sekolah.example/api/gas', {
    method,
    headers: origin ? { origin, 'content-type': 'text/plain;charset=utf-8' } : undefined,
    body: method === 'POST' ? isi : undefined,
  });
}

describe('Proxy GAS lintas hosting', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('GAS_URL', LINGKUNGAN.GAS_URL);
    vi.stubEnv('ALLOWED_ORIGIN', LINGKUNGAN.ALLOWED_ORIGIN);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function buatResponsVercel() {
    return {
      setHeader: vi.fn(),
      status: vi.fn(),
      end: vi.fn(),
      send: vi.fn(),
    };
  }

  it('menangani preflight tanpa menghubungi backend', async () => {
    const fetchMock = vi.mocked(fetch);

    const respons = await tanganiPermintaanGas(buatPermintaan('OPTIONS'), LINGKUNGAN);

    expect(respons.status).toBe(204);
    expect(respons.headers.get('access-control-allow-origin')).toBe('https://sekolah.example');
    expect(respons.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menyediakan kontrak /api/gas melalui binding runtime Cloudflare Pages', async () => {
    const respons = await onRequest({
      request: buatPermintaan('OPTIONS'),
      env: LINGKUNGAN,
    });

    expect(respons.status).toBe(204);
    expect(respons.headers.get('access-control-allow-origin')).toBe('https://sekolah.example');
  });

  it('menyediakan kontrak /api/gas melalui adapter Vercel', async () => {
    const respons = buatResponsVercel();

    await handler(
      {
        method: 'OPTIONS',
        headers: { origin: 'https://sekolah.example' },
      } as never,
      respons as never
    );

    expect(respons.status).toHaveBeenCalledWith(204);
    expect(respons.end).toHaveBeenCalledOnce();
    expect(respons.setHeader).toHaveBeenCalledWith(
      'access-control-allow-origin',
      'https://sekolah.example'
    );
  });

  it('meneruskan body POST dari adapter Vercel dan mengembalikan response upstream', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response('{"success":true}', { status: 200 }));
    const respons = buatResponsVercel();
    const body = JSON.stringify({ action: 'getAppConfig', args: [], authToken: 'token' });

    await handler(
      {
        method: 'POST',
        headers: {
          origin: 'https://sekolah.example',
          'content-type': 'text/plain;charset=utf-8',
        },
        body,
      } as never,
      respons as never
    );

    expect(fetchMock).toHaveBeenCalledWith(
      LINGKUNGAN.GAS_URL,
      expect.objectContaining({ method: 'POST', body })
    );
    expect(respons.status).toHaveBeenCalledWith(200);
    expect(respons.send).toHaveBeenCalledWith('{"success":true}');
  });

  it('menolak metode selain POST dan OPTIONS', async () => {
    const respons = await tanganiPermintaanGas(buatPermintaan('GET'), LINGKUNGAN);

    expect(respons.status).toBe(405);
    expect(await respons.json()).toMatchObject({ __gasError: true });
  });

  it('menolak origin di luar daftar yang diizinkan', async () => {
    const respons = await tanganiPermintaanGas(
      buatPermintaan('POST', JSON.stringify({ action: 'getData' }), 'https://asing.example'),
      LINGKUNGAN
    );

    expect(respons.status).toBe(403);
    expect(await respons.json()).toMatchObject({ __gasError: true });
  });

  it('menolak JSON yang rusak atau nama aksi yang tidak valid', async () => {
    const jsonRusak = await tanganiPermintaanGas(buatPermintaan('POST', '{'), LINGKUNGAN);
    const aksiTidakValid = await tanganiPermintaanGas(
      buatPermintaan('POST', JSON.stringify({ action: 'invalid action' })),
      LINGKUNGAN
    );

    expect(jsonRusak.status).toBe(400);
    expect(await jsonRusak.json()).toMatchObject({ message: 'Format body request tidak valid (wajib JSON).' });
    expect(aksiTidakValid.status).toBe(400);
    expect(await aksiTidakValid.json()).toMatchObject({ message: 'Aksi (action) tidak valid.' });
  });

  it('melaporkan konfigurasi GAS_URL yang belum tersedia', async () => {
    const respons = await tanganiPermintaanGas(
      buatPermintaan('POST', JSON.stringify({ action: 'getData' })),
      { ALLOWED_ORIGIN: LINGKUNGAN.ALLOWED_ORIGIN }
    );

    expect(respons.status).toBe(500);
    expect(await respons.json()).toMatchObject({ __gasError: true });
  });

  it('menolak GAS_URL yang bukan endpoint Apps Script HTTPS', async () => {
    const respons = await tanganiPermintaanGas(
      buatPermintaan('POST', JSON.stringify({ action: 'getData' })),
      { ALLOWED_ORIGIN: LINGKUNGAN.ALLOWED_ORIGIN, GAS_URL: 'http://example.com/gas' }
    );

    expect(respons.status).toBe(500);
    expect(await respons.json()).toMatchObject({
      message: 'GAS_URL tidak memenuhi kebijakan keamanan.',
    });
  });

  it('menolak payload yang melampaui batas ukuran', async () => {
    const isi = JSON.stringify({ action: 'getData', args: ['x'.repeat(1_000_001)] });
    const respons = await tanganiPermintaanGas(buatPermintaan('POST', isi), LINGKUNGAN);

    expect(respons.status).toBe(413);
    expect(await respons.json()).toMatchObject({ __gasError: true });
  });

  it('memverifikasi login, menghapus token reCAPTCHA, lalu meneruskan payload ke Apps Script', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(Response.json({ success: true, score: 0.9 }))
      .mockResolvedValueOnce(new Response('{"success":true}', { status: 200 }));
    const payload = {
      action: 'login',
      args: ['admin', 'password'],
      authToken: null,
      recaptchaToken: 'token-recaptcha',
    };

    const respons = await tanganiPermintaanGas(
      buatPermintaan('POST', JSON.stringify(payload)),
      { ...LINGKUNGAN, RECAPTCHA_SECRET_KEY: 'secret' }
    );

    expect(respons.status).toBe(200);
    expect(respons.headers.get('cache-control')).toBe('no-store');
    expect(await respons.json()).toEqual({ success: true });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      LINGKUNGAN.GAS_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'login', args: ['admin', 'password'], authToken: null }),
      })
    );
  });

  it('menolak login saat token reCAPTCHA tidak dapat diverifikasi', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(Response.json({ success: false }));

    const respons = await tanganiPermintaanGas(
      buatPermintaan(
        'POST',
        JSON.stringify({ action: 'login', args: [], recaptchaToken: 'token-recaptcha' })
      ),
      { ...LINGKUNGAN, RECAPTCHA_SECRET_KEY: 'secret' }
    );

    expect(respons.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await respons.json()).toMatchObject({ __gasError: true });
  });

  it('mengubah halaman HTML dari upstream menjadi kesalahan gateway', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('<html>Page Not Found</html>'));

    const respons = await tanganiPermintaanGas(
      buatPermintaan('POST', JSON.stringify({ action: 'getData' })),
      LINGKUNGAN
    );

    expect(respons.status).toBe(502);
    expect(await respons.json()).toMatchObject({ __gasError: true });
  });

  it('memblokir alat pemindai eksploitasi dan bot otomasi via User-Agent', async () => {
    const respons = await tanganiPermintaanGas(
      new Request('https://sekolah.example/api/gas', {
        method: 'POST',
        headers: {
          origin: 'https://sekolah.example',
          'content-type': 'text/plain;charset=utf-8',
          'user-agent': 'sqlmap/1.6.12#stable (https://sqlmap.org)',
        },
        body: JSON.stringify({ action: 'getData' }),
      }),
      LINGKUNGAN
    );

    expect(respons.status).toBe(403);
    const json = await respons.json();
    expect(json).toMatchObject({
      __gasError: true,
      message: expect.stringContaining('bot scraper'),
    });
  });

  it('memblokir permintaan yang memicu perangkap honeypot form', async () => {
    const respons = await tanganiPermintaanGas(
      buatPermintaan('POST', JSON.stringify({ action: 'login', bot_trap: 'spam_value' })),
      LINGKUNGAN
    );

    expect(respons.status).toBe(403);
    const json = await respons.json();
    expect(json).toMatchObject({
      __gasError: true,
      message: expect.stringContaining('Bot trap terpicu'),
    });
  });

  it('memblokir payload yang mengandung pola serangan siber WAF', async () => {
    const respons = await tanganiPermintaanGas(
      buatPermintaan(
        'POST',
        JSON.stringify({ action: 'getData', args: ["' UNION SELECT * FROM users--"] })
      ),
      LINGKUNGAN
    );

    expect(respons.status).toBe(400);
    const json = await respons.json();
    expect(json).toMatchObject({
      __gasError: true,
      message: expect.stringContaining('pola ancaman siber'),
    });
  });

  it('menerapkan perisai Anti-DDoS dan membatasi frekuensi aksi sensitif', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response('{"success":true}', { status: 200 }));

    const ipBanjir = '198.51.100.99';
    let responsTerakhir: Response | null = null;

    // Kirim lebih dari 60 request aksi sensitif 'login' secara beruntun dari IP yang sama
    for (let i = 0; i < 65; i++) {
      responsTerakhir = await tanganiPermintaanGas(
        new Request('https://sekolah.example/api/gas', {
          method: 'POST',
          headers: {
            origin: 'https://sekolah.example',
            'content-type': 'text/plain;charset=utf-8',
            'x-real-ip': ipBanjir,
          },
          body: JSON.stringify({ action: 'login', args: ['user_test', 'pass_test', 'siswa'] }),
        }),
        LINGKUNGAN
      );
    }

    expect(responsTerakhir?.status).toBe(429);
    expect(responsTerakhir?.headers.get('retry-after')).toBeTruthy();
    const json = await responsTerakhir?.json();
    expect(json).toMatchObject({
      __gasError: true,
      message: expect.stringContaining('Anti-DDoS Shield'),
    });
  });
});
