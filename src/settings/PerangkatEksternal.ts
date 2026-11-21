/**
 * KONFIGURASI PERANGKAT EKSTERNAL & SCANNER
 * SEKOLAH ANDA - TAHUN 2026
 * 
 * Mengatur pemindai QR kamera webcam, barcode scanner USB (keyboard wedge / HID),
 * dan pembaca RFID/NFC untuk presensi gerbang sekolah.
 */

export interface KonfigurasiPerangkat {
  kamera: {
    kameraDefault: 'environment' | 'user';
    resolusiTarget: { lebar: number; tinggi: number };
    fpsTarget: number;
    delayScanUlangMs: number;
  };
  scannerUsbHid: {
    aktifkanListenerKeystroke: boolean;
    panjangMinKarakter: number;
    timeoutKarakterMs: number;
    karakterAkhir: 'Enter' | 'Tab';
  };
  umpanBalik: {
    bunyiSukses: boolean;
    bunyiGagal: boolean;
    getarMobile: boolean;
  };
}

export const PERANGKAT_EKSTERNAL: KonfigurasiPerangkat = {
  kamera: {
    kameraDefault: 'environment', // Kamera belakang pada HP/Tablet
    resolusiTarget: { lebar: 1280, tinggi: 720 },
    fpsTarget: 30,
    delayScanUlangMs: 2000, // Menghindari scanning ganda dalam waktu singkat
  },
  scannerUsbHid: {
    aktifkanListenerKeystroke: true,
    panjangMinKarakter: 5,
    timeoutKarakterMs: 60, // Keystroke scanner hardware sangat cepat (<50ms per key)
    karakterAkhir: 'Enter',
  },
  umpanBalik: {
    bunyiSukses: true,
    bunyiGagal: true,
    getarMobile: true,
  },
};
