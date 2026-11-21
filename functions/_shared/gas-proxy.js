function jsonResponse(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
      ...headers,
    },
  });
}

// In-Memory Sliding-Window Anti-DDoS Shield dengan Progressive Auto-Jail Lockout
// Dikalibrasi untuk mendukung absensi skala besar (hingga 50.000 transaksi/hari) di jaringan sekolah
const PENYIMPAN_RATE_LIMIT = new Map();
const MAKS_PERMINTAAN_GLOBAL = 500; // 500 req / 10 detik per IP (50 req/detik untuk gerbang scanner & multi-klien)
const JENDELA_WAKTU_GLOBAL_MS = 10000;
const MAKS_PERMINTAAN_SENSITIF = 60; // 60 req / 30 detik untuk login serentak dari 1 IP Wi-Fi sekolah
const JENDELA_WAKTU_SENSITIF_MS = 30000;

function cekAntiDDoS(ipKlien, aksi) {
  if (!ipKlien || ipKlien === 'unknown') return { diizinkan: true };

  const sekarang = Date.now();
  // Pembersihan berkala jika memory cache melebihi 2000 entri
  if (PENYIMPAN_RATE_LIMIT.size > 2000) {
    const batasKadaluarsa = sekarang - 180000;
    for (const [k, d] of PENYIMPAN_RATE_LIMIT.entries()) {
      if (d.terakhir < batasKadaluarsa && (!d.terkunciSampai || d.terkunciSampai < sekarang)) {
        PENYIMPAN_RATE_LIMIT.delete(k);
      }
    }
  }

  // 1. Cek Global Threshold
  const kunciGlobal = 'g:' + ipKlien;
  let rekamGlobal = PENYIMPAN_RATE_LIMIT.get(kunciGlobal);
  if (!rekamGlobal) {
    rekamGlobal = { hit: 1, mulai: sekarang, terakhir: sekarang, terkunciSampai: 0 };
  } else if (rekamGlobal.terkunciSampai && rekamGlobal.terkunciSampai > sekarang) {
    // Sedang dalam masa hukuman Auto-Jail
    rekamGlobal.hit += 1;
    rekamGlobal.terakhir = sekarang;
    // Jika masih membombardir saat terkunci, perpanjang waktu hukuman hingga 3 menit
    if (rekamGlobal.hit > MAKS_PERMINTAAN_GLOBAL * 1.5) {
      rekamGlobal.terkunciSampai = Math.max(rekamGlobal.terkunciSampai, sekarang + 180000);
    }
    PENYIMPAN_RATE_LIMIT.set(kunciGlobal, rekamGlobal);
    const sisaDetik = Math.max(1, Math.ceil((rekamGlobal.terkunciSampai - sekarang) / 1000));
    return { diizinkan: false, sisaDetik };
  } else if (sekarang - rekamGlobal.mulai > JENDELA_WAKTU_GLOBAL_MS) {
    rekamGlobal = { hit: 1, mulai: sekarang, terakhir: sekarang, terkunciSampai: 0 };
  } else {
    rekamGlobal.hit += 1;
    rekamGlobal.terakhir = sekarang;
  }

  if (rekamGlobal.hit > MAKS_PERMINTAAN_GLOBAL) {
    rekamGlobal.terkunciSampai = sekarang + 60000; // Auto-jail 60 detik
    PENYIMPAN_RATE_LIMIT.set(kunciGlobal, rekamGlobal);
    return { diizinkan: false, sisaDetik: 60 };
  }
  PENYIMPAN_RATE_LIMIT.set(kunciGlobal, rekamGlobal);

  // 2. Cek Sensitive Action Threshold (Login & Registrasi Akun)
  const isSensitif = ['login', 'daftarAkunGuru'].includes(aksi);
  if (isSensitif) {
    const kunciSensitif = 's:' + ipKlien;
    let rekamSensitif = PENYIMPAN_RATE_LIMIT.get(kunciSensitif);
    if (!rekamSensitif) {
      rekamSensitif = { hit: 1, mulai: sekarang, terakhir: sekarang, terkunciSampai: 0 };
    } else if (rekamSensitif.terkunciSampai && rekamSensitif.terkunciSampai > sekarang) {
      rekamSensitif.hit += 1;
      rekamSensitif.terakhir = sekarang;
      const sisaDetik = Math.max(1, Math.ceil((rekamSensitif.terkunciSampai - sekarang) / 1000));
      return { diizinkan: false, sisaDetik };
    } else if (sekarang - rekamSensitif.mulai > JENDELA_WAKTU_SENSITIF_MS) {
      rekamSensitif = { hit: 1, mulai: sekarang, terakhir: sekarang, terkunciSampai: 0 };
    } else {
      rekamSensitif.hit += 1;
      rekamSensitif.terakhir = sekarang;
    }

    if (rekamSensitif.hit > MAKS_PERMINTAAN_SENSITIF) {
      rekamSensitif.terkunciSampai = sekarang + 60000; // Auto-jail 60 detik
      PENYIMPAN_RATE_LIMIT.set(kunciSensitif, rekamSensitif);
      return { diizinkan: false, sisaDetik: 60 };
    }
    PENYIMPAN_RATE_LIMIT.set(kunciSensitif, rekamSensitif);
  }

  return { diizinkan: true };
}

// Bot & Scraper User-Agent Filter (Alat Eksploitasi, Scraper Otomatis & Headless Driver)
const BOT_SCRAPER_REGEX = /\b(sqlmap|nikto|dirbuster|nmap|masscan|zgrab|gobuster|censys|shodan|acunetix|burpcollaborator|openvas|nessus|wpscan|nuclei|httpx|ffuf|hydra|medusa|havij|arachni|scrapy|python-requests|aiohttp|urllib|httpclient|libwww-perl|headlesschrome|phantomjs|puppeteer|playwright|selenium|webdriver)\b/i;

// Deep Payload WAF Threat Patterns (SQLi, Code Execution, XSS, Path Traversal, Command Injection, SSTI, XXE)
const POLA_ANCAMAN_WAF = [
  /\b(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table|exec\s+xp_|;\s*--)\b/i,
  /(<\s*script\b|javascript\s*:|onload\s*=|onerror\s*=|onclick\s*=|eval\s*\(|__proto__|constructor\s*\[\s*['"]prototype['"]\])/i,
  /(\.\.[\/\\])/,
  /(;\s*(cat|rm|ls|id|whoami|sh|bash|powershell|cmd)\b)/i,
  /(\{\{\s*7\s*\*\s*7\s*\}\}|\$\{7\*7\})/i,
  /<!entity\b/i
];

function periksaPayloadWaf(argumen) {
  if (!argumen) return true;
  const teks = typeof argumen === 'string' ? argumen : JSON.stringify(argumen);
  for (const pola of POLA_ANCAMAN_WAF) {
    if (pola.test(teks)) return false;
  }
  return true;
}

async function verifikasiRecaptcha(token, secret) {
  if (!secret || !token) return false;

  try {
    const respons = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });
    if (!respons.ok) return false;

    const data = await respons.json();
    return data.success === true && (data.score === undefined || data.score >= 0.5);
  } catch (error) {
    console.error('Verifikasi reCAPTCHA gagal:', error);
    return false;
  }
}

export async function tanganiPermintaanGas(request, env) {
  const originRaw = String(env.ALLOWED_ORIGIN || '').trim();
  const domainDiizinkan = originRaw
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean);
  const originRequest = request.headers.get('origin') || '';
  const wildcardDiizinkan = originRaw === '*' || domainDiizinkan.includes('*');

  let originDisetujui = '';
  if (wildcardDiizinkan) {
    originDisetujui = originRequest || '*';
  } else if (domainDiizinkan.length > 0) {
    if (originRequest && !domainDiizinkan.includes(originRequest)) {
      return jsonResponse(403, {
        __gasError: true,
        message: 'Akses ditolak: Origin tidak diizinkan.',
      });
    }
    originDisetujui = originRequest || domainDiizinkan[0];
  } else {
    return jsonResponse(500, {
      __gasError: true,
      message: 'ALLOWED_ORIGIN belum dikonfigurasi pada hosting.',
    });
  }

  const headersCors = {
    'Access-Control-Allow-Origin': originDisetujui,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: headersCors });
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { __gasError: true, message: 'Method not allowed' }, headersCors);
  }

  // Filter Bot & Exploit Scanner Tools
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent && BOT_SCRAPER_REGEX.test(userAgent)) {
    return jsonResponse(403, { __gasError: true, message: 'Akses ditolak: Alat otomasi / bot scraper tidak diizinkan.' }, headersCors);
  }

  const target = env.GAS_URL;
  if (!target) {
    return jsonResponse(
      500,
      {
        __gasError: true,
        message: 'Environment variable GAS_URL belum diatur pada hosting.',
      },
      headersCors
    );
  }
  let targetUrl;
  try {
    targetUrl = new URL(target);
    if (targetUrl.protocol !== 'https:' || targetUrl.hostname !== 'script.google.com') {
      return jsonResponse(500, { __gasError: true, message: 'GAS_URL tidak memenuhi kebijakan keamanan.' }, headersCors);
    }
  } catch {
    return jsonResponse(500, { __gasError: true, message: 'GAS_URL tidak valid.' }, headersCors);
  }

  try {
    const body = await request.text();
    if (body.length > 1000000) {
      return jsonResponse(413, { __gasError: true, message: 'Request terlalu besar.' }, headersCors);
    }
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return jsonResponse(
        400,
        { __gasError: true, message: 'Format body request tidak valid (wajib JSON).' },
        headersCors
      );
    }

    if (!parsed || typeof parsed.action !== 'string' || !/^[A-Za-z0-9_]{2,60}$/.test(parsed.action)) {
      return jsonResponse(400, { __gasError: true, message: 'Aksi (action) tidak valid.' }, headersCors);
    }
    if (parsed.args !== undefined && (!Array.isArray(parsed.args) || parsed.args.length > 20)) {
      return jsonResponse(400, { __gasError: true, message: 'Parameter request tidak valid.' }, headersCors);
    }

    // WAF Inspection: Verifikasi argumen dari pola serangan injeksi & XSS
    // Catatan: Pada aksi autentikasi/kredensial, password di-hash secara aman
    // sehingga password kompleks dengan simbol unik tidak memicu false-positive.
    let argsWaf = parsed.args;
    if (parsed.action === 'login' && Array.isArray(parsed.args) && parsed.args.length >= 2) {
      argsWaf = [parsed.args[0], parsed.args[2]]; // Periksa identifier (username/NISN) & role
    } else if (parsed.action === 'daftarAkunGuru' && Array.isArray(parsed.args) && parsed.args.length >= 4) {
      argsWaf = [parsed.args[0], parsed.args[1], parsed.args[2], parsed.args[4]]; // Lewati password
    } else if (parsed.action === 'gantiPasswordMandiri' && Array.isArray(parsed.args) && parsed.args.length >= 1) {
      argsWaf = [parsed.args[0]]; // Periksa token autentikasi saja
    }
    if (argsWaf && !periksaPayloadWaf(argsWaf)) {
      return jsonResponse(400, { __gasError: true, message: 'Permintaan diblokir: Terdeteksi pola ancaman siber.' }, headersCors);
    }

    // Anti-Bot: Deteksi jebakan honeypot
    if (parsed && (parsed.bot_trap || parsed._hp || parsed.hp_field || parsed.honeypot)) {
      return jsonResponse(403, { __gasError: true, message: 'Akses ditolak: Bot trap terpicu.' }, headersCors);
    }

    // Anti-DDoS & Rate Limiting per IP dengan Progressive Auto-Jail Lockout
    const ipKlien = request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('true-client-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '';
    if (ipKlien) {
      const hasilDDoS = cekAntiDDoS(ipKlien, parsed.action);
      if (!hasilDDoS.diizinkan) {
        const sisaDetik = hasilDDoS.sisaDetik || 30;
        return jsonResponse(
          429,
          { __gasError: true, message: `Terlalu banyak permintaan (Anti-DDoS Shield aktif). Silakan tunggu ${sisaDetik} detik.` },
          { ...headersCors, 'Retry-After': String(sisaDetik) }
        );
      }
    }

    if (parsed.action === 'login' && env.RECAPTCHA_SECRET_KEY) {
      const isHuman = await verifikasiRecaptcha(parsed.recaptchaToken, env.RECAPTCHA_SECRET_KEY);
      if (!isHuman) {
        return jsonResponse(
          403,
          { __gasError: true, message: 'Verifikasi bot gagal. Coba lagi.' },
          headersCors
        );
      }
    }

    if (parsed.recaptchaToken) delete parsed.recaptchaToken;

    const upstream = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(parsed),
      redirect: 'follow',
    });
    const text = await upstream.text();

    if (text.trim().startsWith('<')) {
      let message = 'Google Apps Script mengembalikan halaman web bukan data JSON.';
      if (text.includes('Page Not Found') || text.includes('unable to open the file')) {
        message =
          'URL Web App Apps Script tidak ditemukan (Page Not Found). Periksa kembali env var GAS_URL pada hosting.';
      } else if (text.includes('accounts.google.com') || text.includes('ServiceLogin')) {
        message =
          'Apps Script meminta login. Pastikan deployment Apps Script: "Who has access" diatur ke "Anyone".';
      }
      return jsonResponse(502, { __gasError: true, message }, headersCors);
    }

    return new Response(text, {
      status: 200,
      headers: {
        ...headersCors,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      502,
      { __gasError: true, message: `Gagal menghubungi Apps Script: ${message}` },
      headersCors
    );
  }
}
