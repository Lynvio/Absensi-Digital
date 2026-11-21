# 🛠️ Panduan Kustomisasi: Apa yang Harus, Boleh, dan Dilarang Diganti

Panduan referensi teknis yang memetakan secara tegas bagian mana saja dari kode sistem yang **harus diganti**, **boleh disesuaikan**, dan **wajib dipertahankan (dilarang diganti)** demi keamanan dan stabilitas sistem.

---

## 📑 Ringkasan Kategori Perubahan

```
Bagian Sistem
 ├── 🟢 Kategori 1: WAJIB & PERLU DIGANTI     (Saat migrasi ke sekolah baru)
 ├── 🟡 Kategori 2: BOLEH DIGANTI             (Opsional, selera tampilan / identitas)
 └── 🔴 Kategori 3: DILARANG KERAS DIGANTI   (Aturan keamanan mutlak & anti-rusak)
```

---

## 🟢 Kategori 1: Bagian yang WAJIB / PERLU Diganti

Bagian ini harus disesuaikan ketika sistem dipasang untuk pertama kali atau dipindahkan ke domain/database baru.

### 1.1. URL Apps Script untuk Proxy (`GAS_URL`)
- **Lokasi**: Environment Variable di **Vercel Dashboard** (`Settings` > `Environment Variables`).
- **Yang Diganti**: Nilai environment variable `GAS_URL` di Vercel. Nilai ini hanya dibaca oleh serverless proxy dan tidak boleh diteruskan ke frontend.
- **Nilai Baru**: Masukkan URL Web App terbaru Anda yang didapat setelah melakukan Deploy di Google Apps Script (`https://script.google.com/macros/s/.../exec`).
- **Kapan Diganti**: Setiap kali membuat deployment baru di Google Apps Script.
- **Catatan keamanan**: Jangan menaruh URL ini langsung di `public/config.js` atau frontend.

### 1.2. ID Spreadsheet Database (`SPREADSHEET_ID`)
- **Lokasi**: Di **Google Apps Script** > `Project Settings` > `Script Properties`.
- **Yang Diganti**: Nilai dari property `SPREADSHEET_ID`.
- **Nilai Baru**: ID Spreadsheet Google Sheets Anda (karakter acak panjang di antara `/d/` dan `/edit`).
- **Peringatan**: Jangan pernah menulis nilai ini di file kode frontend VS Code!

### 1.3. Whitelist Domain di Environment Variable
- **Lokasi**: Pengaturan Environment Variable di Hosting (Vercel / Cloudflare).
- **Variabel**: `ALLOWED_ORIGIN`
- **Contoh Nilai**:
  ```text
  ALLOWED_ORIGIN=https://absensi.sekolah-anda.sch.id
  ```
- **Tujuan**: Memastikan hanya website resmi sekolah Anda yang diizinkan meminta data ke backend proxy.

---

## 🟡 Kategori 2: Bagian yang BOLEH Diganti (Opsional)

Bagian ini bebas Anda ubah untuk menyesuaikan identitas sekolah, gaya visual, atau daftar rombongan belajar.

### 2.1. Logo dan Gambar Latar Belakang
- **Lokasi Folder**: [`public/assets/`](../public/assets/)
  - `public/assets/logo/logo-sekolah.svg` → Ganti dengan logo resmi sekolah Anda.
  - `public/assets/background/` → Tambahkan foto gedung / kegiatan sekolah Anda.
- **Konfigurasi Identitas**: Buka [`src/settings/IdentitasSekolah.ts`](../src/settings/IdentitasSekolah.ts) pada properti `logo` dan array `gambarBackground`.

### 2.2. Identitas Sekolah & Judul Dokumen
- **Lokasi**: [`src/settings/IdentitasSekolah.ts`](../src/settings/IdentitasSekolah.ts) dan [`src/layouts/LayoutUtama.astro`](../src/layouts/LayoutUtama.astro).
- **Bagian yang Diganti**:
  - `IDENTITAS_SEKOLAH.nama`: Nama ringkas instansi (contoh: `'SMK / SEKOLAH DIGITAL'`).
  - `IDENTITAS_SEKOLAH.namaLengkap`: Nama lengkap institusi sekolah.
  - `IDENTITAS_SEKOLAH.npsn`, `alamat`, `kepalaSekolah`, `telepon`, `email`, dll.
  - Tag `<title>` di shell layout Astro secara otomatis merender nama sekolah dari konfigurasi ini.

### 2.3. Kunci Google reCAPTCHA v3 & Google Client ID (OAuth)
- **Lokasi**:
  1. `public/config.js` (`RECAPTCHA_SITE_KEY` dan `GOOGLE_CLIENT_ID`)
  2. Environment Variable Vercel / Cloudflare (`RECAPTCHA_SITE_KEY` dan `RECAPTCHA_SECRET_KEY`)
  3. `src/settings/IdentitasSekolah.ts` (`googleClientId`)
- **Keterangan**:
  - **reCAPTCHA**: Daftarkan domain di [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin) (pilih tipe reCAPTCHA v3).
  - **Google GIS (Login Google)**: Daftarkan OAuth Client ID di [Google Cloud Console](https://console.cloud.google.com/apis/credentials) untuk mengaktifkan tombol login Google Siswa & Guru.

### 2.4. Jam Operasional & Hari Libur
- **Lokasi**: Langsung di dalam aplikasi web (Menu **Pengaturan**).
- **Keterangan**: Jam masuk mulai, jam batas terlambat, jam pulang, dan kalender libur dapat diatur sewaktu-waktu langsung dari antarmuka web oleh Administrator tanpa perlu menyentuh kode program.

---

## 🔴 Kategori 3: Bagian yang DILARANG KERAS & JANGAN Diganti!

> [!CAUTION]
> Mengubah bagian-bagian berikut dapat mengakibatkan kegagalan total sistem, celah kebocoran basis data, atau kerusakan otorisasi peran.

### 3.1. ❌ DILARANG Menulis Spreadsheet ID di Kode Frontend atau Repositori
- **Kenapa Dilarang?** Kode frontend (HTML/JS/TSX) dan repositori GitHub dapat diakses atau diunduh oleh publik. Jika ID Spreadsheet tertulis di sana, pihak luar dapat menemukan database sekolah Anda.
- **Aturan Baku**: ID Spreadsheet **hanya boleh** disimpan di *Script Properties* pada Google Apps Script.

### 3.2. ❌ JANGAN Mengubah `Content-Type: text/plain` di [`KlienApi.ts`](../src/layanan/KlienApi.ts)
- **Lokasi**: Baris `headers: { 'Content-Type': 'text/plain;charset=utf-8' }` pada file `KlienApi.ts`.
- **Kenapa Dilarang?** Google Apps Script **tidak mendukung request preflight `OPTIONS`**. Jika diganti menjadi `application/json`, peramban web modern akan otomatis mengirim request preflight dan Google Apps Script akan menolaknya. Akibatnya, seluruh panggilan API akan menghasilkan **CORS Error**.

### 3.3. ❌ JANGAN Menghapus Proteksi Anti-Clickjacking di [`protect.js`](../public/security/protect.js)
- **Lokasi**: Blok `if (window.self !== window.top)`.
- **Kenapa Dilarang?** Skrip pengaman memastikan halaman sistem presensi tidak dapat disematkan ke dalam `<iframe>` di situs web luar tanpa izin, melindungi kredensial siswa dan akun guru dari serangan clickjacking & UI redressing.

### 3.4. ❌ JANGAN Membuka Akses CORS Terbuka (`*`) di Lingkungan Produksi
- **Lokasi**: File [`api/gas.js`](../api/gas.js) dan [`functions/_shared/gas-proxy.js`](../functions/_shared/gas-proxy.js).
- **Kenapa Dilarang?** Mengizinkan `ALLOWED_ORIGIN=*` di server proxy akan membuka akses endpoint API sekolah Anda ke sembarang domain web pihak ketiga. Selalu daftarkan domain resmi sekolah secara eksplisit.

### 3.5. ❌ JANGAN Mengedit Format Transaksi Autentikasi di `Login.tsx` & `code.gs` Tanpa Sinkronisasi
- **Kenapa Dilarang?** Alur login menggabungkan proteksi token reCAPTCHA, verifikasi Google GIS OAuth (`loginGoogle`), hashing PIN/Password, dan pembuatan token sesi UUID dengan kontrol "Ingat Saya". Mengubah format request atau response tanpa sinkronisasi akan menyebabkan proses masuk gagal total.

---

## 📋 Tabel Ringkasan Cepat

| Nama Berkas / Pengaturan | Kategori | Boleh Diedit? | Risiko Jika Salah Ubah |
|---|:---:|:---:|---|
| **Environment `GAS_URL`** | 🟢 Wajib | Ya | Frontend tidak bisa terhubung jika URL Web App salah. |
| **Script Properties `SPREADSHEET_ID`** | 🟢 Wajib | Di Apps Script saja | Backend tidak menemukan file database. |
| **Whitelist di `api/gas.js`** | 🟢 Wajib | Ya | Domain baru akan terkena blokir CORS. |
| **Logo & Foto di `public/assets/`** | 🟡 Opsional | Ya | Gambar tidak muncul jika nama berkas tidak cocok. |
| **Identitas di `IdentitasSekolah.ts`** | 🟡 Opsional | Ya | Hanya memengaruhi kop surat, kartu pelajar, dan judul. |
| **`Content-Type` di `KlienApi.ts`** | 🔴 Dilarang | **TIDAK** | Komunikasi API mati total akibat CORS preflight error. |
| **Hardcode ID di Frontend** | 🔴 Dilarang | **TIDAK** | Database sekolah bocor ke publik. |
| **Proteksi Anti-Clickjacking** | 🔴 Dilarang | **TIDAK** | Rentan serangan clickjacking pada iframe tidak sah. |
| **Whitelist `ALLOWED_ORIGIN=*`** | 🔴 Dilarang | **TIDAK** | Backend terbuka untuk dieksploitasi dari domain luar. |

---

<div align="center">

**E-ABSENSI DIGITAL SEKOLAH**  
*Sistem Presensi Digital 2026*

</div>
