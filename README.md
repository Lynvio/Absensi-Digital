<div align="center">

# 🎓 E-ABSENSI DIGITAL SEKOLAH
### *Sistem Presensi Digital Modern dan Ramah Penglihatan*

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Apps Script](https://img.shields.io/badge/Backend-Google_Apps_Script-34A853?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Vercel](https://img.shields.io/badge/Hosting-Vercel_Edge-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

<br/>

<p align="center">
  Aplikasi absensi sekolah berbasis komponen modern dengan <b>antarmuka ramah penglihatan</b>, <b>konfirmasi nada harmonik (Web Audio API)</b>, dan integrasi database <b>Google Sheets tanpa biaya server bulanan</b>. Template open-source yang siap diadopsi oleh sekolah manapun — cukup edit satu file konfigurasi.
</p>

<br/>

### 📑 PANDUAN & PETUNJUK
*Petunjuk teknis, standar kode, dan panduan operasional tersedia di dalam repositori:*

| 📖 Tutorial Setup & Hosting | 🛠️ Panduan Kustomisasi |
|:---:|:---:|
| [![Tutorial](https://img.shields.io/badge/BUKA_TUTORIAL-panduan%2FTUTORIAL.md-059669?style=for-the-badge&logo=bookstack&logoColor=white)](panduan/TUTORIAL.md) | [![Aturan Kustomisasi](https://img.shields.io/badge/ATURAN_YANG_BOLEH_%26_DILARANG-panduan%2FPANDUAN__KUSTOMISASI.md-DC2626?style=for-the-badge&logo=shieldcheck&logoColor=white)](panduan/PANDUAN_KUSTOMISASI.md) |
| *Petunjuk setup Apps Script, pilihan hosting (Vercel, GitHub Pages, cPanel, Cloudflare).* | *Daftar apa yang wajib diganti, boleh dikustomisasi, dan dilarang diubah.* |

</div>

---

## ⚙️ Kustomisasi untuk Sekolah Anda

Cukup edit **satu file** untuk menyesuaikan identitas sekolah:

```
src/settings/IdentitasSekolah.ts
```

Ganti nama, NPSN, alamat, logo, dan gambar background sesuai sekolah Anda. Seluruh UI akan otomatis menyesuaikan.

---

## ✨ Sorotan Fitur Utama

<table>
  <tr>
    <td width="50%">
      <h3>👁️ Antarmuka Ramah Penglihatan</h3>
      <ul>
        <li><b>Skala Teks 1-Klik:</b> Tombol pembesar instan (<code>A</code>, <code>A+</code>, <code>A++</code>) di navbar atas dengan persistensi otomatis.</li>
        <li><b>Tabel Kontras Tinggi:</b> Garis pemisah tegas 2px, warna teks pekat (<code>text-slate-900</code>), dan zebra striping yang nyaman di mata.</li>
        <li><b>Tombol Sentuh Ekstra Lega:</b> Pilihan status presensi (<i>Hadir, Sakit, Izin, Alpa</i>) dirancang anti salah-tekan.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🔊 Scanner QR Audio, Getar & Multi-Kondisi</h3>
      <ul>
        <li><b>Synthesizer Web Audio API:</b> Memancarkan nada <i>chime</i> naik (880Hz → 1174Hz) saat sukses dan nada rendah (320Hz) saat gagal tanpa aset MP3 eksternal.</li>
        <li><b>Haptic Feedback:</b> Getaran perangkat seketika kode terbaca.</li>
        <li><b>Pemindai Adaptif Tingkat Tinggi:</b> Dilengkapi dukungan lampu senter (torch), mode kontras anti-silau/kotor, dan mesin ML <code>BarcodeDetector</code> asli untuk memindai kode kusam, rusak, atau di ruangan gelap.</li>
        <li><b>Layar Luar Ruangan:</b> Kartu hasil pindaian berukuran besar, tetap terbaca jelas di bawah terik sinar matahari.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>👥 Manajemen Multi-Peran & Keamanan Sesi</h3>
      <ul>
        <li><b>Autentikasi Modern & Fleksibel:</b> Login instan Google GIS (Siswa & Guru/Admin), login NISN/PIN, serta Username/Password.</li>
        <li><b>Perlindungan Perangkat Bersama:</b> Opsi "Ingat Saya" dengan isolasi sesi <code>sessionStorage</code> default agar sesi otomatis hangus saat browser ditutup.</li>
        <li><b>Administrator:</b> Akses master data, akun, role, kelas, kalender, audit, backup, dan arsip tahunan.</li>
        <li><b>Operator & Guru:</b> Operasional presensi, import/export, data siswa, pencetakan kartu, dan presensi sholat.</li>
        <li><b>Siswa:</b> Cek presensi pribadi, kartu QR ECC Level H, tautkan akun Google, jadwal, dan pengajuan izin.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🏛️ Arsitektur Alur Sistem

```
Pengguna (Browser)
       │
       ▼
 ┌─────────────┐
 │ Hosting UI  │ ───► Menyajikan shell Astro + aplikasi
 └─────────────┘
       │
       │ (Request API via /api/gas)
       ▼
 ┌─────────────┐
 │ API Proxy   │ ───► Vercel Function atau Cloudflare Pages Function
 └─────────────┘
       │
       │ (Payload POST text/plain)
       ▼
 ┌─────────────┐
 │ Apps Script │ ───► Eksekusi Fungsi (code.gs)
 └─────────────┘
       │
       ▼
 ┌─────────────┐
 │ Spreadsheet │ ───► Database Google Sheets
 └─────────────┘
```

---

## 🚀 Ringkasan Menjalankan Proyek di Komputer Lokal

### Environment production

Konfigurasikan secret berikut pada deployment hosting, bukan pada browser atau source code:

```text
GAS_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
ALLOWED_ORIGIN=https://domain-production.example
RECAPTCHA_SECRET_KEY=secret-recaptcha
```

Pada Apps Script, isi Script Properties `SPREADSHEET_ID` dan `PARENT_FOLDER_ID`.
Jangan gunakan `ALLOWED_ORIGIN=*` pada production. Deployment Apps Script harus
memakai versi yang sama dengan frontend dan akses Web App sesuai kebutuhan proxy.

```bash
# 1. Unduh dan pasang seluruh dependensi
npm install

# 2. Jalankan server pengembangan lokal (port 3000)
npm run dev

# 3. Jalankan pengujian unit (Vitest)
npm test

# 4. Validasi pemeriksaan tipe TypeScript & Astro
npm run check

# 5. Kompilasi aplikasi untuk rilis produksi (folder dist/)
npm run build
```

---

## 📂 Struktur Berkas Repositori

```
Absensi Projects/
├── api/
│   └── gas.js                 # Adapter API serverless Vercel
├── functions/
│   ├── api/gas.js             # Adapter endpoint Cloudflare Pages
│   └── _shared/gas-proxy.js   # Handler proxy API bersama
├── panduan/                   # 📁 FOLDER PANDUAN
│   ├── TUTORIAL.md            # 📖 Petunjuk instalasi, setup Apps Script, & pilihan hosting
│   └── PANDUAN_KUSTOMISASI.md # 🛠️ Aturan apa yang boleh dan dilarang diubah
├── public/
│   ├── assets/                # Logo & foto latar sekolah
│   ├── config.js              # Konfigurasi publik frontend
├── scripts/build.mjs          # Skrip pemeriksaan dan build Astro
├── src/                       # Sumber kode Astro, Vue, dan React yang dimigrasikan bertahap
│   ├── pages/                  # Route Astro
│   ├── layouts/                # Shell dokumen Astro
│   ├── aplikasi/App.tsx       # Root komponen, routing peran & font scaler
│   ├── gaya/utama.css         # Styling global, font scaler, tabel kontras tinggi
│   ├── halaman/               # Seluruh antarmuka modular sistem presensi
│   ├── komponen/              # Komponen terisolasi (Navbar, Sidebar, Card, Pemuat)
│   ├── layanan/               # Service layer API terpusat
│   ├── tipe/                  # Definisi TypeScript interface
│   └── utilitas/              # Helper tanggal dan validasi
├── LICENSE.md                 # Lisensi proyek
├── README.md                  # Halaman etalase / showcase repositori GitHub
├── astro.config.mjs           # Konfigurasi Astro dan integrasi UI
└── wrangler.toml              # Konfigurasi output Cloudflare Pages
```

---

<div align="center">

### 📌 PANDUAN TERSEDIA DI:
👉 **[Buka panduan/TUTORIAL.md](panduan/TUTORIAL.md)** untuk petunjuk instalasi dan pilihan hosting.  
👉 **[Buka panduan/PANDUAN_KUSTOMISASI.md](panduan/PANDUAN_KUSTOMISASI.md)** untuk aturan kustomisasi kode.

<br/>

**E-ABSENSI DIGITAL SEKOLAH**  
*Sistem Presensi Digital 2026 — Template Open-Source*

</div>
