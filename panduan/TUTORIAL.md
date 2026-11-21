# 📖 TUTORIAL: Lokasi Penyimpanan & Pilihan Tempat Hosting
### *Penjelasan: Di Mana Saja Tempat Menyimpannya & Pilihan Hosting*

---

## 🗺️ BAGIAN 1: Peta Lokasi Komponen (Tempatnya di Mana Saja?)

Banyak yang bertanya: *"File ini ditaruh di mana? Databasenya di mana? Website-nya jalan di mana?"*  
Berikut peta lokasi fisiknya agar jelas dan tidak tertukar:

| Komponen | Nama Berkas | Ditaruh di Mana? (Tempatnya) | Fungsi Komponen |
| :--- | :--- | :--- | :--- |
| **1. Database** | Spreadsheet Sekolah | **Google Drive Sekolah** | Menyimpan tabel siswa, catatan hadir, jam masuk, dan riwayat presensi. |
| **2. Otak Backend** | `code.gs` | **Google Apps Script** *(menu Ekstensi di Spreadsheet)* | Membaca & menulis ke Spreadsheet. **TIDAK ADA di frontend.** |
| **3. Kode Sumber** | Folder `src/`, `public/`, dll. | **GitHub Repositori** | Tempat menyimpan dan mengelola kode proyek frontend. |
| **4. Mesin Penyaji Web** | Folder `dist/` (hasil build) | **Pilihan Hosting:**<br>• Vercel<br>• GitHub Pages<br>• Cloudflare Pages<br>• cPanel Web Hosting<br>• Netlify | Menampilkan website di layar HP & laptop guru/siswa. |

---

## ❓ BAGIAN 2: Mengapa Vercel Direkomendasikan? Apakah BISA di Tempat Lain?

### Kenapa Vercel Direkomendasikan sebagai Pilihan Utama?
1. **Keamanan URL Apps Script**: Vercel memiliki fitur *Serverless Function* ([`api/gas.js`](../api/gas.js)) yang bertindak sebagai jembatan (*proxy*). Dengan cara ini, URL asli Google Apps Script sekolah Anda **tidak terlihat oleh siswa atau publik** di browser.
2. **Anti-Bot reCAPTCHA v3**: Vercel memverifikasi keaslian login langsung di server Edge sebelum diteruskan ke Google Sheets.
3. **Bebas Masalah CORS**: Browser modern tidak akan memblokir request karena dihandle oleh backend proxy Vercel.
4. **100% Gratis untuk Sekolah**: Vercel menyediakan kuota gratis yang mencukupi untuk ribuan siswa setiap hari.

### Apakah BISA Ditaruh di Tempat Lain Selain Vercel?
**BISA!** Anda bebas memilih tempat hosting mana pun sesuai kebutuhan sekolah:
- **Opsi A: Vercel** (Paling direkomendasikan & paling aman).
- **Opsi B: GitHub Pages** (Langsung dari GitHub, tanpa perlu akun Vercel).
- **Opsi C: Cloudflare Pages** (Sangat cepat & aman).
- **Opsi D: cPanel / Web Hosting Sekolah Biasa** (Tinggal upload file ke `public_html`).
- **Opsi E: Netlify**.

Konfigurasi Vercel dan Cloudflare Pages mencegah halaman utama serta `config.js`
tersimpan di cache, sehingga perubahan konfigurasi segera berlaku. Logo dan foto di
`/assets/` harus divalidasi ulang saat dipakai; hanya berkas build Astro di `/_astro/`
yang memakai cache immutable karena namanya memiliki fingerprint build. HSTS berlaku
untuk host deployment saja, tanpa `includeSubDomains`, agar tidak memaksa subdomain
lain memakai HTTPS. Host tetap harus menyediakan HTTPS.

---

## 🚀 BAGIAN 3: Tutorial Langkah Demi Langkah Sesuai Tempat Hosting

---

### TAHAP AWAL (WAJIB UNTUK SEMUA HOSTING): Setup Backend Google

Sebelum memilih hosting, siapkan backend Google-nya terlebih dahulu:

1. **Siapkan Google Spreadsheet**:
   - Buat spreadsheet baru di Google Drive sekolah.
   - Salin **ID Spreadsheet** dari URL di atas browser (karakter acak di antara `/d/` dan `/edit`).
2. **Buka Apps Script**:
   - Di Spreadsheet, klik menu **Ekstensi** > **Apps Script**.
   - Tempel (*paste*) kode `code.gs` Anda.
3. **Simpan ID Spreadsheet secara Rahasia**:
   - Klik ikon **Project Settings (Roda Gigi)** di bilah kiri Apps Script.
   - Gulir ke **Script Properties** > klik **Add script property**:
     - *Property*: `SPREADSHEET_ID`
     - *Value*: Tempel ID Spreadsheet dari langkah 1 tadi.
   - Klik **Save script properties**.
4. **Deploy Web App**:
   - Klik tombol biru **Deploy** (kanan atas) > **New deployment**.
   - Pilih tipe: **Web app**.
   - *Execute as*: **Me (email Anda)**.
   - *Who has access*: **Anyone**.
   - Klik **Deploy**, lalu salin **Web app URL** (`https://script.google.com/macros/s/.../exec`).
5. **Uji Coba**:
   - Buka tab baru di browser: `URL_WEB_APP?mode=ping`
   - Jika muncul `{"ok":true,"app":"E-Absensi",...}`, backend Anda sudah aktif!

---

### PILIHAN TEMPAT 1: Deploy ke Vercel (Rekomendasi Utama)

1. Upload seluruh file proyek ini ke akun **GitHub** Anda.
2. Buka [Vercel.com](https://vercel.com/) dan login dengan GitHub.
3. Klik **Add New...** > **Project** > pilih repositori GitHub Anda > klik **Import**.
4. Di bagian **Environment Variables**:
   - Name: `GAS_URL` | Value: *Masukkan Web app URL dari Google Apps Script tadi*.
   - Name: `RECAPTCHA_SECRET_KEY` | Value: *secret key reCAPTCHA server-side*.
   - Name: `ALLOWED_ORIGIN` | Value: `https://absensi.sekolah-anda.sch.id` *(atau kosongkan untuk otomatis)*.
5. Klik **Deploy**. Selesai! Website langsung aktif dengan alamat `.vercel.app`.

> Mode proxy menggunakan `GAS_URL` yang disimpan sebagai environment variable
> server-side. Proteksi bot login dilakukan oleh reCAPTCHA v3.

---

### PILIHAN TEMPAT 2: GitHub Pages sebagai frontend (proxy tetap diperlukan)

GitHub Pages hanya menyajikan frontend dan tidak menjalankan folder `api/`. Gunakan
Vercel atau serverless proxy lain untuk endpoint `/api/gas`.

1. Di komputer Anda, buka file [`public/config.js`](../public/config.js).
2. Biarkan `GAS_URL` menggunakan proxy:
   ```javascript
   window.APP_CONFIG = {
     GAS_URL: '/api/gas',
     RECAPTCHA_SITE_KEY: '',
     GOOGLE_CLIENT_ID: ''
   };
   ```
3. Buka terminal di komputer Anda, lalu jalankan:
   ```bash
   npm run build
   ```
4. Push (unggah) kode ke repositori GitHub Anda dan arahkan request API ke proxy Vercel.
5. Di GitHub, buka menu **Settings** repositori > **Pages**:
   - Source: pilih **GitHub Actions** atau pilih Branch `main` folder `/dist`.
6. Website absensi Anda akan otomatis aktif di alamat `https://USERNAME.github.io/NAMA-REPO/`.
   GitHub Pages tidak menjalankan endpoint `/api/gas`; gunakan proxy Vercel atau
   proxy server-side lain, lalu arahkan frontend ke URL proxy tersebut. Jangan
   mengarahkan browser langsung ke Apps Script.

---

### PILIHAN TEMPAT 3: cPanel dengan proxy server-side

Hosting cPanel harus menyediakan endpoint server-side proxy yang menyimpan `GAS_URL`.
Jangan mengarahkan browser langsung ke Apps Script.

1. Buka file [`public/config.js`](../public/config.js).
2. Biarkan frontend menggunakan endpoint proxy, bukan URL Apps Script langsung.
3. Di komputer lokal Anda, jalankan perintah build di terminal:
   ```bash
   npm run build
   ```
4. Setelah selesai, akan muncul folder bernama **`dist/`**.
5. Buka **cPanel** hosting sekolah Anda > masuk ke **File Manager** > buka folder **`public_html`** (atau subdomain misal `public_html/absensi`).
6. Unggah (*upload*) seluruh isi di dalam folder **`dist/`** ke sana.
7. Website langsung aktif di domain sekolah Anda tanpa bergantung pada Vercel!

---

### PILIHAN TEMPAT 4: Deploy ke Cloudflare Pages

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) > pilih **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Pilih repositori GitHub Anda.
3. Pengaturan build:
   - Framework preset: **Astro** atau **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Di **Settings > Variables and Secrets**, tambahkan binding runtime untuk
   **Production** dan **Preview**:
   - `GAS_URL` = URL Web App Apps Script Anda (simpan sebagai secret).
   - `RECAPTCHA_SECRET_KEY` = secret key reCAPTCHA server-side (simpan sebagai secret).
   - `ALLOWED_ORIGIN` = origin situs yang diizinkan, misalnya
     `https://absensi.sekolah-anda.sch.id`. Pisahkan beberapa origin dengan koma.
5. Di pengaturan build, tambahkan `RECAPTCHA_SITE_KEY` dengan site key publik reCAPTCHA
   jika perlindungan bot login digunakan. Site key ini masuk ke konfigurasi frontend;
   jangan gunakan secret key di sini.
6. Klik **Save and Deploy**. Berkas [`functions/api/gas.js`](../functions/api/gas.js)
   menyediakan endpoint same-origin `/api/gas` melalui Cloudflare Pages Functions;
   jangan arahkan browser langsung ke Apps Script.
7. Setelah deploy, pastikan `/` dan `/api/gas` dapat diakses. Permintaan API selain
   `POST` dan `OPTIONS` seharusnya dibalas `405`; gunakan alur login aplikasi untuk
   menguji koneksi Apps Script dan konfigurasi reCAPTCHA.

Konfigurasi [`wrangler.toml`](../wrangler.toml) memakai keluaran Astro statis di
`dist/`, sehingga shell dan aset frontend dapat di-host pada Cloudflare Pages tanpa
mengunci build Astro ke adapter server tertentu. Pages Functions menjalankan proxy
API pada platform yang sama.

---

## 📊 Perbandingan Kelebihan Setiap Tempat Hosting

| Tempat Hosting | Kelebihan | Kekurangan | Cocok Untuk Siapa? |
| :--- | :--- | :--- | :--- |
| **Vercel** ⭐ | URL Apps Script tersembunyi aman, ada proteksi bot, anti CORS error | Perlu akun Vercel | **Sangat direkomendasikan untuk semua sekolah** |
| **GitHub Pages** | Gratis, langsung jadi satu di GitHub | Tetap memerlukan proxy server-side terpisah | Sekolah yang sudah memiliki proxy |
| **cPanel Sekolah** | Menggunakan server milik sekolah sendiri | Harus build manual (`npm run build`) lalu upload file zip | Sekolah yang punya domain resmi & hosting cPanel |
| **Cloudflare Pages** | Aset statis dan proxy Pages Functions satu origin; header keamanan tersedia | Harus mengatur secret serta origin runtime Pages | Sekolah yang sudah memiliki infrastruktur Cloudflare |

---

## 🛑 PENGINGAT KEAMANAN: Aturan Baku di Semua Tempat

Di mana pun Anda menaruh website (Vercel, GitHub Pages, cPanel, dll):
1. **ID Spreadsheet HANYA boleh ada di Script Properties Google Apps Script.** Jangan pernah ditaruh di file HTML / JS / GitHub!
2. **Mode pengiriman API wajib `text/plain`** di [`KlienApi.ts`](../src/layanan/KlienApi.ts) agar Google Apps Script tidak menolak request (*CORS Error*).
3. **Fitur Skala Font (A / A+ / A++) & Suara Scanner** akan tetap berfungsi di semua tempat hosting tersebut.

---

<div align="center">

**E-ABSENSI DIGITAL SEKOLAH**  
*Sistem Presensi Digital 2026*

</div>
