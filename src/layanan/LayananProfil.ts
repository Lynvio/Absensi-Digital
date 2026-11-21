/**
 * Layanan Profil Pengguna, Foto Profil Siswa/Guru, dan Keamanan Akun
 */

import { panggilApi } from './KlienApi';
import type { ResponApi } from '@/tipe/Konfigurasi';

const AWALAN_KUNCI_FOTO = 'foto_profil_siswa_';

/**
 * Mengambil foto profil tersimpan (Base64) berdasarkan username atau NISN
 */
export function ambilFotoProfil(identifier: string): string | null {
  if (!identifier) return null;
  try {
    return localStorage.getItem(`${AWALAN_KUNCI_FOTO}${identifier.trim()}`) || null;
  } catch {
    return null;
  }
}

/**
 * Menyimpan foto profil ke penyimpanan lokal
 */
export function simpanFotoProfil(identifier: string, dataUrl: string): void {
  if (!identifier || !dataUrl) return;
  try {
    localStorage.setItem(`${AWALAN_KUNCI_FOTO}${identifier.trim()}`, dataUrl);
  } catch (err) {
    console.warn('Gagal menyimpan foto profil ke localStorage:', err);
  }
}

/**
 * Menghapus foto profil
 */
export function hapusFotoProfil(identifier: string): void {
  if (!identifier) return;
  try {
    localStorage.removeItem(`${AWALAN_KUNCI_FOTO}${identifier.trim()}`);
  } catch (error) {
    console.warn('Foto profil tidak dapat dihapus dari penyimpanan lokal:', error);
  }
}

/**
 * Membaca, memvalidasi keamanan berkas, dan mengompres foto ke piksel murni JPEG.
 * Proteksi Keamanan:
 * - Menolak berkas berformat selain raster (memblokir mutlak SVG/XML XSS).
 * - Membatasi ukuran awal berkas maksimal 5 MB untuk mencegah Decompression Bomb / Client DoS.
 * - Re-encoding via Canvas HTML5 secara otomatis menghancurkan payload EXIF/metadata tersembunyi.
 */
export function kompresFoto(file: File, ukuranMaks = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Validasi MIME Type Aman (Hanya Bitmap Murni, Blokir SVG)
    const TIPE_GAMBAR_AMAN = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!file || !TIPE_GAMBAR_AMAN.includes(file.type.toLowerCase())) {
      reject(new Error('Format berkas tidak aman atau tidak didukung. Harap unggah foto berekstensi JPG, PNG, atau WebP murni.'));
      return;
    }

    // 2. Proteksi Ukuran Berkas Maksimal 5 MB
    const UKURAN_MAKS_BYTES = 5 * 1024 * 1024;
    if (file.size > UKURAN_MAKS_BYTES) {
      reject(new Error('Ukuran foto terlalu besar (maksimal 5 MB). Harap pilih foto yang lebih kecil.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > ukuranMaks) {
            height = Math.round((height * ukuranMaks) / width);
            width = ukuranMaks;
          }
        } else {
          if (height > ukuranMaks) {
            width = Math.round((width * ukuranMaks) / height);
            height = ukuranMaks;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses kanvas gambar.'));
          return;
        }

        // Gambar ulang piksel ke kanvas (menghancurkan seluruh artefak/payload EXIF)
        ctx.drawImage(img, 0, 0, width, height);
        // Konversi ke JPEG dengan kualitas 0.85
        const hasilBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(hasilBase64);
      };
      img.onerror = () => reject(new Error('Gambar tidak dapat dimuat atau berkas rusak.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Mengubah password akun sendiri
 */
export async function gantiPasswordSendiri(
  token: string,
  passwordLama: string,
  passwordBaru: string
): Promise<ResponApi> {
  return await panggilApi<ResponApi>('gantiPasswordMandiri', [
    token,
    passwordLama,
    passwordBaru,
  ]);
}
