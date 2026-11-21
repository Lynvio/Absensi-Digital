# Panduan Penyesuaian Logo dan Gambar Latar Sekolah

Direktori ini digunakan untuk menyimpan aset visual resmi sekolah Anda.

---

## 1. Logo Sekolah
- **Lokasi berkas:** `public/assets/logo/logo-sekolah.svg` (atau ganti dengan `.png` / `.jpg` sesuai kebutuhan)
- **Format yang disarankan:** SVG, PNG transparan, atau JPG berkualitas tinggi dengan rasio 1:1 (resolusi minimal `256 x 256` piksel).
- **Pengaturan:** Dapat disesuaikan melalui berkas `src/settings/IdentitasSekolah.ts` pada properti:
  ```typescript
  logo: '/assets/logo/logo-sekolah.svg',
  ```

---

## 2. Gambar Latar Halaman Masuk (Background Hero)
Jika sekolah Anda ingin menampilkan gambar gedung sekolah, upacara, atau aktivitas belajar pada halaman Login:
1. Salin berkas gambar (format `.jpg` atau `.png`, disarankan resolusi `1920 x 1080` terkompresi < 300KB) ke dalam direktori:
   ```
   public/assets/background/
   ```
   *Contoh:* `public/assets/background/gedung-sekolah.jpg`, `public/assets/background/kegiatan.jpg`

2. Buka berkas `src/settings/IdentitasSekolah.ts` dan daftarkan path berkas tersebut pada array `gambarBackground`:
   ```typescript
   gambarBackground: [
     '/assets/background/gedung-sekolah.jpg',
     '/assets/background/kegiatan.jpg',
   ],
   ```

3. Jika array `gambarBackground` dibiarkan kosong (`[]`), sistem secara otomatis menggunakan tampilan latar solid elegan gelap (`#0B1222`) dengan perlindungan performa tinggi.
