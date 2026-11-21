/**
 * PUSAT PENGATURAN TERPADU SISTEM E-ABSENSI
 * 
 * Modul terpusat yang mengekspor seluruh konfigurasi aplikasi:
 * - Identitas resmi sekolah (NPSN, alamat, kepala sekolah)
 * - Jam operasional & ambang batas terlambat
 * - Konfigurasi tema, hak cipta & UI
 * - Driver perangkat scanner eksternal (Kamera & USB RFID)
 * - Kebijakan status kehadiran & absensi
 */

export * from './IdentitasSekolah';
export * from './JamOperasional';
export * from './TampilanTema';
export * from './PerangkatEksternal';
export * from './KebijakanPresensi';
export * from './Navigasi';
