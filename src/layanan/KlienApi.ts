/**
 * Klien API terpusat untuk komunikasi dengan Google Apps Script via proxy Vercel
 */

declare global {
  interface Window {
    APP_CONFIG?: {
      GAS_URL?: string;
      RECAPTCHA_SITE_KEY?: string;
    };
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export const DAPATKAN_GAS_URL = (): string => {
  return ((window.APP_CONFIG && window.APP_CONFIG.GAS_URL) || '/api/gas').trim();
};

export const DAPATKAN_RECAPTCHA_KEY = (): string => {
  return ((window.APP_CONFIG && window.APP_CONFIG.RECAPTCHA_SITE_KEY) || '').trim();
};

/**
 * Eksekusi token reCAPTCHA v3 jika key tersedia
 */
export async function ambilTokenRecaptcha(aksi = 'login'): Promise<string | null> {
  const siteKey = DAPATKAN_RECAPTCHA_KEY();
  if (!siteKey || typeof window.grecaptcha === 'undefined') return null;

  try {
    const eksekusi = new Promise<string>((resolve, reject) => {
      window.grecaptcha!.ready(() => {
        window.grecaptcha!.execute(siteKey, { action: aksi }).then(resolve).catch(reject);
      });
    });
    // Batas waktu 1.5 detik agar antrean login tidak hang jika koneksi lambat
    const batasWaktu = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    return await Promise.race([eksekusi, batasWaktu]);
  } catch (err) {
    console.warn('Gagal memperoleh token reCAPTCHA:', err);
    return null;
  }
}

/**
 * Satu pintu untuk semua pemanggilan fungsi backend di code.gs
 * Dilengkapi dengan timeout 30 detik dan retry 1x untuk ketahanan jaringan skala besar
 */

// Client-side Anti-Burst Throttling (Anti-Spam)
let jumlahRequestDetikIni = 0;
let detikTerakhir = Math.floor(Date.now() / 1000);
const MAKS_REQUEST_PER_DETIK = 10;

function periksaAntiSpamKlien(): boolean {
  const sekarangDetik = Math.floor(Date.now() / 1000);
  if (sekarangDetik !== detikTerakhir) {
    detikTerakhir = sekarangDetik;
    jumlahRequestDetikIni = 1;
    return true;
  }
  jumlahRequestDetikIni++;
  return jumlahRequestDetikIni <= MAKS_REQUEST_PER_DETIK;
}

function sanitasiInputKlien(nilai: any): any {
  if (typeof nilai === 'string') {
    // Netralkan karakter pemantik formula dan script tag berbahaya
    return nilai.replace(/<script[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }
  if (Array.isArray(nilai)) {
    return nilai.map(sanitasiInputKlien);
  }
  if (nilai && typeof nilai === 'object') {
    const bersih: Record<string, any> = {};
    for (const [k, v] of Object.entries(nilai)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      bersih[k] = sanitasiInputKlien(v);
    }
    return bersih;
  }
  return nilai;
}

export async function panggilApi<T = any>(
  action: string,
  args: any[] = [],
  recaptchaToken: string | null = null,
  percobaanUlang = 1
): Promise<T> {
  if (!periksaAntiSpamKlien()) {
    throw new Error('Terlalu banyak permintaan dalam waktu bersamaan. Harap tunggu sesaat.');
  }

  const targetUrl = DAPATKAN_GAS_URL();
  let authToken: string | null = null;
  try {
    const sesiRaw = sessionStorage.getItem('absensiAppSession') || localStorage.getItem('absensiAppSession') || 'null';
    const sesi = JSON.parse(sesiRaw);
    // Verifikasi integritas token (mencegah token injection atau memory tampering)
    if (sesi && typeof sesi.token === 'string' && /^[a-zA-Z0-9_\-]{8,128}$/.test(sesi.token)) {
      authToken = sesi.token;
    }
  } catch {
    authToken = null;
  }
  const argsBersih = sanitasiInputKlien(args);
  const payload: Record<string, any> = { action, args: argsBersih, authToken };
  if (recaptchaToken) payload.recaptchaToken = recaptchaToken;

  const controller = new AbortController();
  const idTimer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(idTimer);

    if (!response.ok) {
      let pesanGalat = `Kesalahan HTTP ${response.status}`;
      try {
        const bodyError = await response.json();
        if (bodyError && bodyError.message) {
          pesanGalat = bodyError.message;
        }
      } catch {
        // Abaikan jika respons bukan JSON
      }
      if (response.status === 404 && targetUrl === '/api/gas') {
        pesanGalat = 'Proxy backend (/api/gas) belum aktif. Pastikan backend di-deploy di Vercel/Cloudflare Pages, atau atur URL Google Apps Script langsung di public/config.js.';
      }
      throw new Error(pesanGalat);
    }

    const result = await response.json();

    if (result && result.__gasError) {
      throw new Error(result.message || 'Terjadi kesalahan pada server backend');
    }

    return result as T;
  } catch (err: any) {
    clearTimeout(idTimer);

    if (err.name === 'AbortError') {
      throw new Error('Koneksi timeout. Server terlalu lama merespons (30 detik).');
    }

    // Coba ulang 1x jika terjadi kesalahan jaringan non-abort
    if (percobaanUlang > 0 && !(err.message && err.message.startsWith('Kesalahan HTTP 4'))) {
      console.warn(`[KlienApi] Percobaan ulang aksi "${action}" karena galat jaringan:`, err.message);
      await new Promise((res) => setTimeout(res, 1000));
      return panggilApi<T>(action, args, recaptchaToken, percobaanUlang - 1);
    }

    throw err;
  }
}
