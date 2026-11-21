import React, { useEffect, useState, useRef } from 'react';
import { lakukanScanQr } from '@/layanan/LayananAbsensi';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCode,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Radio,
  History,
  Clock,
  UserCheck,
  Zap,
  ZapOff,
  Sun,
} from 'lucide-react';

interface PropertiHalamanScanner {
  setMemuat: (memuat: boolean) => void;
}

interface ItemRiwayatScan {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  waktu: string;
  status: string;
  sukses: boolean;
  pesan: string;
}

// Ekstrak NISN bersih dari QR Code atau Barcode 1D (misal *24251001-0078129381*)
function ekstrakNisn(raw: string): string {
  let teks = String(raw || '').trim();
  // Hapus tanda bintang di awal dan akhir jika ada (format Code 39 / Barcode visual)
  teks = teks.replace(/^\*+|\*+$/g, '');
  // Jika format NIS-NISN, ambil bagian NISN (bagian terakhir)
  if (teks.includes('-')) {
    const bagian = teks.split('-');
    teks = bagian[bagian.length - 1].trim();
  }
  // Ambil karakter alfanumerik murni
  return teks.replace(/[^a-zA-Z0-9]/g, '');
}

export const HalamanScannerPresensi: React.FC<PropertiHalamanScanner> = () => {
  const [hasilScan, setHasilScan] = useState<any>(null);
  const [kameraFacing, setKameraFacing] = useState<'environment' | 'user'>('environment');
  const [pesanStatus, setPesanStatus] = useState<string>('Arahkan kamera ke QR Code atau Barcode Siswa');
  const [efekFlash, setEfekFlash] = useState<'sukses' | 'gagal' | null>(null);
  const [riwayatScan, setRiwayatScan] = useState<ItemRiwayatScan[]>([]);
  const [nfcAktif, setNfcAktif] = useState(false);
  const [senterDidukung, setSenterDidukung] = useState(false);
  const [senterAktif, setSenterAktif] = useState(false);
  const [modeKontrasTinggi, setModeKontrasTinggi] = useState(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef<number | null>(null);
  const sedangMemprosesRef = useRef(false);
  const terakhirScanRef = useRef<{ kode: string; waktu: number }>({ kode: '', waktu: 0 });
  const nfcAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mulaiKamera(kameraFacing);

    // Tangani input dari Barcode Scanner USB / Wireless fisik
    const tanganiScannerUsb = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.key === 'Enter') {
        const nilai = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';
        if (nilai.length >= 4) {
          tanganiKodeTerbaca(nilai);
        }
        return;
      }

      if (event.key.length !== 1) return;
      barcodeBufferRef.current += event.key;

      if (barcodeTimerRef.current) window.clearTimeout(barcodeTimerRef.current);
      barcodeTimerRef.current = window.setTimeout(() => {
        barcodeBufferRef.current = '';
      }, 120);
    };

    window.addEventListener('keydown', tanganiScannerUsb);
    return () => {
      hentikanKamera();
      window.removeEventListener('keydown', tanganiScannerUsb);
      if (barcodeTimerRef.current) window.clearTimeout(barcodeTimerRef.current);
      // Batalkan sesi NFC agar tidak ada zombie listener setelah unmount
      if (nfcAbortControllerRef.current) {
        nfcAbortControllerRef.current.abort();
        nfcAbortControllerRef.current = null;
      }
    };
  }, [kameraFacing]);

  // Audio Synthesizer Notifikasi
  const bunyikanNotifikasi = async (tipe: 'sukses' | 'gagal') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (tipe === 'sukses') {
        // Dua nada naik jernih dan tegas: 880Hz -> 1174Hz
        [0, 0.12].forEach((delay, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(idx === 0 ? 880 : 1174, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.16);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.16);
        });
      } else {
        // Nada peringatan rendah: 320Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (error) {
      console.warn('Notifikasi audio tidak dapat dimainkan:', error);
    }

    // Getar ponsel
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(tipe === 'sukses' ? [80, 40, 80] : [200, 80, 200]);
    }
  };

  const mulaiKamera = async (facing: 'environment' | 'user') => {
    try {
      await hentikanKamera();

      // Inisialisasi dengan BarcodeDetector API bawaan peramban jika didukung (jauh lebih kuat terhadap kartu rusak/kotor/silau)
      const html5QrCode = new Html5Qrcode('reader-qr', {
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      // Konfigurasi pemindaian adaptif kecepatan tinggi & toleransi noda/silau
      const config = {
        fps: 24, // Tingkatkan fps agar menangkap frame jernih lebih cepat saat kartu bergerak
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.floor(minEdge * 0.78);
          return { width: Math.max(edge, 220), height: Math.max(edge, 220) };
        },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        videoConstraints: {
          facingMode: facing,
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          advanced: [{ focusMode: 'continuous' }] as any,
        },
      };

      await html5QrCode.start(
        { facingMode: facing },
        config,
        (decodedText: string) => {
          tanganiKodeTerbaca(decodedText);
        },
        () => {
          // Frame pencarian normal
        }
      );

      // Cek apakah kamera mendukung lampu senter (torch) untuk kondisi gelap
      try {
        const caps = html5QrCode.getRunningTrackCameraCapabilities();
        const torch = caps?.torchFeature && caps.torchFeature();
        if (torch && torch.isSupported()) {
          setSenterDidukung(true);
        } else {
          setSenterDidukung(false);
        }
      } catch {
        setSenterDidukung(false);
      }

      setPesanStatus('Kamera aktif. Silakan arahkan kartu siswa ke pemindai.');
    } catch (err: any) {
      const pesanError = String(err?.message || err);
      if (pesanError.includes('NotAllowedError') || pesanError.includes('Permission')) {
        setPesanStatus('Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser.');
      } else if (pesanError.includes('NotFoundError') || pesanError.includes('device')) {
        setPesanStatus('Kamera tidak terdeteksi pada perangkat ini.');
      } else {
        setPesanStatus('Gagal mengakses kamera: ' + pesanError);
      }
    }
  };

  const hentikanKamera = async () => {
    setSenterAktif(false);
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (error) {
        console.warn('Kamera pemindai tidak dapat dihentikan:', error);
      }
    }
  };

  const toggleSenter = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const statusBaru = !senterAktif;
      const caps = scannerRef.current.getRunningTrackCameraCapabilities();
      const torch = caps?.torchFeature && caps.torchFeature();
      if (torch && torch.isSupported()) {
        await torch.apply(statusBaru);
        setSenterAktif(statusBaru);
      } else {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: statusBaru }] as any,
        });
        setSenterAktif(statusBaru);
      }
    } catch (e) {
      console.warn('Gagal mengubah status senter kamera:', e);
    }
  };

  const tanganiKodeTerbaca = async (rawCode: string) => {
    const nisnBersih = ekstrakNisn(rawCode);
    if (!nisnBersih) return;

    // Mutex Lock: cegah eksekusi paralel ganda
    if (sedangMemprosesRef.current) return;

    // Debounce: cegah pemindaian kode yang sama dalam selang 3 detik
    const sekarang = Date.now();
    if (
      terakhirScanRef.current.kode === nisnBersih &&
      sekarang - terakhirScanRef.current.waktu < 3000
    ) {
      setPesanStatus(`Kode ${nisnBersih} baru saja dipindai. Harap tunggu sebentar.`);
      return;
    }

    sedangMemprosesRef.current = true;
    terakhirScanRef.current = { kode: nisnBersih, waktu: sekarang };

    await hentikanKamera();
    setPesanStatus(`Memverifikasi NISN ${nisnBersih} ke server...`);

    try {
      const res = await lakukanScanQr(nisnBersih);
      setHasilScan(res);

      const waktuFormat = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (res && res.success) {
        bunyikanNotifikasi('sukses');
        setEfekFlash('sukses');
        setPesanStatus(`Presensi ${res.siswa?.nama || nisnBersih} berhasil dicatat!`);

        // Tambah ke riwayat sesi aktif
        setRiwayatScan((prev) => [
          {
            id: `${nisnBersih}-${sekarang}`,
            nama: res.siswa?.nama || 'Siswa',
            nisn: nisnBersih,
            kelas: res.siswa?.kelas || '-',
            waktu: res.siswa?.jam || waktuFormat,
            status: res.siswa?.status || 'Hadir',
            sukses: true,
            pesan: res.message,
          },
          ...prev.slice(0, 9), // Simpan 10 riwayat terbaru
        ]);
      } else {
        bunyikanNotifikasi('gagal');
        setEfekFlash('gagal');
        setPesanStatus(res?.message || 'Gagal memproses presensi.');

        setRiwayatScan((prev) => [
          {
            id: `${nisnBersih}-${sekarang}`,
            nama: res.siswa?.nama || 'Tidak Dikenal',
            nisn: nisnBersih,
            kelas: '-',
            waktu: waktuFormat,
            status: 'Gagal',
            sukses: false,
            pesan: res?.message || 'NISN tidak terdaftar.',
          },
          ...prev.slice(0, 9),
        ]);
      }

      setTimeout(() => setEfekFlash(null), 1200);

      // Mulai ulang kamera setelah jeda respons
      setTimeout(async () => {
        sedangMemprosesRef.current = false;
        await mulaiKamera(kameraFacing);
      }, 2000);
    } catch (e: any) {
      bunyikanNotifikasi('gagal');
      setEfekFlash('gagal');
      setHasilScan({
        success: false,
        message: e.message || 'Gagal terhubung ke server.',
      });
      setTimeout(() => setEfekFlash(null), 1200);
      setTimeout(async () => {
        sedangMemprosesRef.current = false;
        await mulaiKamera(kameraFacing);
      }, 2000);
    }
  };

  const mulaiNfc = async () => {
    if (!window.NDEFReader) {
      setPesanStatus('RFID/NFC tidak didukung oleh browser atau perangkat ini.');
      return;
    }
    try {
      // Batalkan sesi NFC sebelumnya jika ada (hindari listener ganda)
      if (nfcAbortControllerRef.current) {
        nfcAbortControllerRef.current.abort();
      }
      const nfcAbort = new AbortController();
      nfcAbortControllerRef.current = nfcAbort;

      const reader = new window.NDEFReader();
      reader.addEventListener('reading', (event) => {
        const record = event.message.records[0];
        const data = record?.data;
        let nilai = '';
        if (typeof data === 'string') {
          nilai = data;
        } else if (data instanceof ArrayBuffer) {
          nilai = new TextDecoder().decode(data);
        } else if (data instanceof DataView) {
          nilai = new TextDecoder().decode(
            data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
          );
        }
        if (nilai.trim()) tanganiKodeTerbaca(nilai.trim());
      }, { signal: nfcAbort.signal });
      await reader.scan({ signal: nfcAbort.signal });
      setNfcAktif(true);
      setPesanStatus('RFID/NFC aktif. Tempelkan kartu NFC siswa pada perangkat.');
    } catch (err: any) {
      if ((err as any)?.name === 'AbortError') return; // Dibatalkan sengaja saat unmount
      setPesanStatus('RFID/NFC gagal diaktifkan: ' + (err?.message || err));
    }
  };

  const aktifkanModeTerpadu = async () => {
    if (kameraFacing !== 'environment') {
      setKameraFacing('environment');
    }
    setModeKontrasTinggi(true);
    if (!nfcAktif) {
      await mulaiNfc();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Kartu Utama Pemindai */}
      <div className="kartu-modern rounded-3xl shadow-md overflow-hidden p-5 sm:p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50  border border-indigo-200  text-indigo-700  mb-3 shadow-2xs">
            <QrCode className="w-8 h-8" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 ">
            Pemindai Presensi Siswa Terpadu
          </h2>
          <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100  border border-slate-200  text-xs sm:text-sm font-bold text-slate-700 ">
            <Volume2 className="w-4 h-4 text-emerald-600  shrink-0" />
            <span className="truncate max-w-xs sm:max-w-md">{pesanStatus}</span>
          </div>
        </div>

        {/* Frame Kamera dengan Efek Visual Flash Dinamis & Filter Adaptif */}
        <div
          className={`relative rounded-3xl overflow-hidden bg-slate-950 aspect-square max-w-sm mx-auto shadow-2xl transition-all duration-300 flex items-center justify-center border-4 ${
            efekFlash === 'sukses'
              ? 'border-emerald-500 ring-8 ring-emerald-400/40 shadow-emerald-500/50'
              : efekFlash === 'gagal'
              ? 'border-rose-500 ring-8 ring-rose-400/40 shadow-rose-500/50'
              : 'border-slate-800 ring-1 ring-slate-700/50'
          }`}
        >
          {/* HUD Corner Brackets (High-Tech Viewfinder) */}
          <div className="scanner-hud-corner tl" aria-hidden="true" />
          <div className="scanner-hud-corner tr" aria-hidden="true" />
          <div className="scanner-hud-corner bl" aria-hidden="true" />
          <div className="scanner-hud-corner br" aria-hidden="true" />

          {/* Sinar Laser Pemindai Bergerak Halus (High-Tech Laser Beam) */}
          <div
            className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-laser-sweep pointer-events-none z-10"
            aria-hidden="true"
          />

          <div
            id="reader-qr"
            className="w-full h-full"
            style={
              modeKontrasTinggi
                ? { filter: 'contrast(1.35) brightness(1.1) saturate(0.8)' }
                : undefined
            }
          />
        </div>

        <p className="mt-4 text-center text-xs font-semibold text-slate-500  leading-relaxed">
          Mendukung <strong>QR Code (Sisi Depan)</strong>, <strong>Barcode 1D (Sisi Belakang)</strong>, dan pemindai USB/Wireless scanner.
        </p>

        {/* Panel Kontrol Pemindai Terpadu: Kamera Belakang • Anti-Silau / Kotor • Aktifkan NFC */}
        <div className="mt-5 max-w-xl mx-auto space-y-2.5">
          {/* Tombol Cepat: Mode Terpadu Lengkap (Jadikan Satu) */}
          <button
            type="button"
            onClick={aktifkanModeTerpadu}
            className={`w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm border ${
              kameraFacing === 'environment' && modeKontrasTinggi && nfcAktif
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/20'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${kameraFacing === 'environment' && modeKontrasTinggi && nfcAktif ? 'text-white' : 'text-indigo-600'}`} />
            <span>
              {kameraFacing === 'environment' && modeKontrasTinggi && nfcAktif
                ? 'Mode Terpadu Aktif: Kamera (Belakang) • Anti-Silau • NFC'
                : 'Jadikan Satu: Kamera (Belakang) • Anti-Silau / Kotor • Aktifkan NFC'}
            </span>
          </button>

          {/* Bar Segmented Kontrol Terpadu yang Menyatukan Ketiga Tombol */}
          <div className="p-1.5 bg-slate-100 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5">
            {/* 1. Kamera (Belakang) */}
            <button
              type="button"
              onClick={() =>
                setKameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))
              }
              className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border ${
                kameraFacing === 'environment'
                  ? 'bg-white text-indigo-900 shadow-xs border-indigo-200'
                  : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200'
              }`}
              title="Arahkan kamera (Belakang / Depan)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kamera ({kameraFacing === 'environment' ? 'Belakang' : 'Depan'})</span>
            </button>

            {/* 2. Anti-Silau / Kotor */}
            <button
              type="button"
              onClick={() => setModeKontrasTinggi((prev) => !prev)}
              aria-pressed={modeKontrasTinggi}
              className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border ${
                modeKontrasTinggi
                  ? 'bg-indigo-600 text-white shadow-xs border-indigo-700'
                  : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200'
              }`}
              title="Filter kontras adaptif untuk kartu silau, tergores, atau kotor"
            >
              <Sun className={`w-3.5 h-3.5 ${modeKontrasTinggi ? 'text-amber-300' : 'text-slate-400'}`} />
              <span>{modeKontrasTinggi ? 'Anti-Silau Aktif' : 'Anti-Silau / Kotor'}</span>
            </button>

            {/* 3. Aktifkan NFC */}
            <button
              type="button"
              onClick={mulaiNfc}
              disabled={nfcAktif}
              className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border ${
                nfcAktif
                  ? 'bg-emerald-600 text-white shadow-xs border-emerald-700'
                  : 'bg-white/80 hover:bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
              title="Aktifkan pemindaian kartu RFID/NFC"
            >
              <Radio className={`w-3.5 h-3.5 ${nfcAktif ? 'text-white animate-pulse' : 'text-emerald-600'}`} />
              <span>{nfcAktif ? 'NFC Aktif' : 'Aktifkan NFC'}</span>
            </button>

            {/* Tombol Lampu Senter (jika didukung perangkat) */}
            {senterDidukung && (
              <button
                type="button"
                onClick={toggleSenter}
                aria-pressed={senterAktif}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 border ${
                  senterAktif
                    ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-xs'
                    : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200'
                }`}
                title="Lampu senter kamera"
              >
                {senterAktif ? <Zap className="w-3.5 h-3.5 text-amber-900 fill-current" /> : <ZapOff className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            )}
          </div>
        </div>

        {/* Kartu Feedback Hasil Scan Terakhir */}
        {hasilScan && (
          <div
            className={`mt-6 p-5 rounded-2xl border flex items-start gap-4 animate-fade-in ${
              hasilScan.success
                ? 'bg-emerald-50  border-emerald-200  text-emerald-950  shadow-sm ring-1 ring-emerald-500/20'
                : 'bg-rose-50  border-rose-200  text-rose-950  shadow-sm ring-1 ring-rose-500/20'
            }`}
          >
            {hasilScan.success ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600  shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-8 h-8 text-rose-600  shrink-0 mt-0.5" />
            )}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-base font-black tracking-wide">
                  {hasilScan.success ? 'PRESENSI BERHASIL DICATAT!' : 'PRESENSI DITOLAK'}
                </h4>
                {hasilScan.success && (
                  <span className="px-2.5 py-0.5 bg-emerald-200  text-emerald-950  text-xs font-black rounded-full">
                    {hasilScan.siswa?.status || 'Hadir'}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold">{hasilScan.message}</p>

              {hasilScan.siswa && (
                <div className="mt-3 p-3 bg-white/90  rounded-xl border border-emerald-200  shadow-2xs space-y-1">
                  <p className="text-indigo-900  text-base font-black uppercase">
                    {hasilScan.siswa.nama}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-600 ">
                    <span>NISN: <span className="font-mono text-slate-900 ">{hasilScan.siswa.nisn}</span></span>
                    <span>Kelas: <span className="text-slate-900 ">{hasilScan.siswa.kelas}</span></span>
                    {hasilScan.siswa.jam && (
                      <span>Waktu: <span className="text-slate-900 ">{hasilScan.siswa.jam}</span></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Riwayat Pemindaian Sesi Aktif */}
      {riwayatScan.length > 0 && (
        <div className="kartu-modern rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100  pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600 " />
              <h3 className="font-black text-sm text-slate-800 ">
                Riwayat Pemindaian Sesi Ini
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 ">
              {riwayatScan.length} Siswa Terpindai
            </span>
          </div>

          <div className="divide-y divide-slate-100  max-h-60 overflow-y-auto">
            {riwayatScan.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.sukses ? (
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-black text-slate-900  truncate">
                      {item.nama}
                    </p>
                    <p className="text-[11px] text-slate-500 ">
                      {item.kelas !== '-' ? `${item.kelas} • ` : ''}NISN: {item.nisn}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[11px] font-bold text-slate-700  flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {item.waktu}
                  </span>
                  <span
                    className={`text-[10px] font-black ${
                      item.sukses ? 'text-emerald-700 ' : 'text-rose-600 '
                    }`}
                  >
                    {item.sukses ? item.status : 'Gagal'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
