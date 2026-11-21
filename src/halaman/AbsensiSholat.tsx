import React, { useState, useEffect, useRef } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import type { WaktuSholat, DataAbsensiSholat } from '@/tipe/Sholat';
import { ambilDaftarKelas, ambilSiswaPerKelas } from '@/layanan/LayananSiswa';
import { simpanPresensiSholat, scanPresensiSholat } from '@/layanan/LayananAbsensi';
import { dapatkanTanggalHariIni } from '@/utilitas/Tanggal';
import { IDENTITAS_SEKOLAH } from '@/settings';
import { kompresFoto } from '@/layanan/LayananProfil';
import {
  Moon,
  CheckCircle2,
  XCircle,
  Send,
  CheckSquare,
  QrCode,
  Camera,
  Trash2,
  RefreshCw,
  Clock,
  UserCheck,
  Zap,
  ZapOff,
  Sun,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Swal from 'sweetalert2';

interface PropertiAbsensiSholat {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

export const HalamanAbsensiSholat: React.FC<PropertiAbsensiSholat> = ({
  sesi,
  setMemuat,
}) => {
  const [tabMode, setTabMode] = useState<'checklist' | 'scanner'>('checklist');
  const [tanggal, setTanggal] = useState<string>(dapatkanTanggalHariIni());
  const [waktuSholat, setWaktuSholat] = useState<WaktuSholat>('Dzuhur');

  // Mode Checklist State
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [kelasTerpilih, setKelasTerpilih] = useState<string>('');
  const [daftarSiswa, setDaftarSiswa] = useState<any[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, 'Hadir' | 'Tidak Hadir'>>({});
  const [buktiFoto, setBuktiFoto] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  // Mode Scanner State
  const [kameraFacing, setKameraFacing] = useState<'environment' | 'user'>('environment');
  const [pesanScanner, setPesanScanner] = useState<string>('Siap memindai kartu presensi sholat siswa');
  const [efekFlash, setEfekFlash] = useState<'sukses' | 'peringatan' | 'gagal' | null>(null);
  const [daftarLogScan, setDaftarLogScan] = useState<
    Array<{ nisn: string; nama: string; kelas: string; waktuSholat: string; jam: string; sudahAda: boolean }>
  >([]);
  const [senterDidukungSholat, setSenterDidukungSholat] = useState(false);
  const [senterAktifSholat, setSenterAktifSholat] = useState(false);
  const [modeKontrasSholat, setModeKontrasSholat] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerSedangMemproses = useRef(false);

  useEffect(() => {
    muatKelas();
  }, []);

  useEffect(() => {
    if (kelasTerpilih && tabMode === 'checklist') {
      muatSiswa();
    }
  }, [kelasTerpilih, tabMode]);

  // Efek kamera saat beralih tab
  useEffect(() => {
    if (tabMode === 'scanner') {
      mulaiKameraSholat(kameraFacing);
    } else {
      hentikanKameraSholat();
    }
    return () => {
      hentikanKameraSholat();
    };
  }, [tabMode, kameraFacing]);

  const muatKelas = async () => {
    try {
      const k = await ambilDaftarKelas();
      let list = k;
      // Pemisahan Hak Akun: Wali Kelas dan Guru Kelas khusus hanya mengelola kelas binaannya
      if ((sesi.role === 'wakel' || sesi.role === 'waka') && sesi.kelas) {
        list = [sesi.kelas];
      } else if ((sesi.role === 'guru' || sesi.role === 'wali_kelas') && sesi.kelas && sesi.kelas !== 'Semua') {
        list = [sesi.kelas];
      }
      setDaftarKelas(list);
      if (list.length > 0) setKelasTerpilih(list[0]);
    } catch (error) {
      console.error('Gagal memuat kelas absensi sholat:', error);
      Swal.fire('Gagal', 'Daftar kelas tidak dapat dimuat.', 'error');
    }
  };

  const muatSiswa = async () => {
    setMemuat(true);
    try {
      const list = await ambilSiswaPerKelas(kelasTerpilih);
      setDaftarSiswa(list);
      const awal: Record<string, 'Hadir' | 'Tidak Hadir'> = {};
      list.forEach((s) => {
        awal[s.nisn] = 'Tidak Hadir';
      });
      setStatusMap(awal);
      setMemuat(false);
    } catch (error) {
      console.error('Gagal memuat siswa absensi sholat:', error);
      setMemuat(false);
      Swal.fire('Gagal', 'Data siswa tidak dapat dimuat.', 'error');
    }
  };

  const toggleStatus = (nisn: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [nisn]: prev[nisn] === 'Hadir' ? 'Tidak Hadir' : 'Hadir',
    }));
  };

  const tandaiSemuaHadir = () => {
    const baru: Record<string, 'Hadir' | 'Tidak Hadir'> = {};
    daftarSiswa.forEach((s) => {
      baru[s.nisn] = 'Hadir';
    });
    setStatusMap(baru);
  };

  const tanganiPilihFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      setMemuat(true);
      const base64 = await kompresFoto(file, 600);
      setBuktiFoto(base64);
      setMemuat(false);
      Swal.fire({
        title: 'Foto Berhasil Terpasang',
        text: 'Foto bukti jamaah sholat telah disiapkan dan akan dikirim saat Anda menekan tombol Simpan.',
        icon: 'success',
        timer: 1800,
      });
    } catch (err: any) {
      setMemuat(false);
      Swal.fire('Error', err?.message || 'Gagal memproses foto dokumentasi.', 'error');
    }
  };

  const tanganiSimpan = async () => {
    const listPayload: DataAbsensiSholat[] = daftarSiswa.map((s) => ({
      tanggal,
      nisn: s.nisn,
      nama: s.nama,
      kelas: s.kelas || kelasTerpilih,
      waktuSholat,
      status: statusMap[s.nisn] || 'Tidak Hadir',
      keterangan: '',
      inputOleh: sesi.nama || sesi.username,
      buktiFoto: buktiFoto || '',
    }));

    setMemuat(true);
    try {
      const res = await simpanPresensiSholat(listPayload, buktiFoto || undefined);
      setMemuat(false);
      if (res && res.success) {
        Swal.fire('Berhasil!', `Presensi Sholat ${waktuSholat} berhasil disimpan ke sistem.`, 'success');
      } else {
        Swal.fire('Gagal', res?.message || 'Gagal menyimpan presensi sholat', 'error');
      }
    } catch (e: any) {
      setMemuat(false);
      Swal.fire('Error', e.message || 'Kesalahan server', 'error');
    }
  };

  // Synthesizer Audio untuk Scanner Sholat
  const bunyikanAudioScanner = (tipe: 'sukses' | 'peringatan' | 'gagal') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (tipe === 'sukses') {
        [0, 0.12].forEach((delay, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(idx === 0 ? 880 : 1318, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.16);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.16);
        });
      } else if (tipe === 'peringatan') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch (err) {
      console.warn('Audio sholat scanner error:', err);
    }
  };

  // Kamera Scanner Sholat Adaptif Tingkat Tinggi
  const mulaiKameraSholat = async (facing: 'environment' | 'user') => {
    try {
      await hentikanKameraSholat();
      const html5QrCode = new Html5Qrcode('reader-qr-sholat', {
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 24,
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
        async (decodedText: string) => {
          tanganiQrSholat(decodedText);
        },
        () => {}
      );

      // Cek dukungan senter kamera
      try {
        const caps = html5QrCode.getRunningTrackCameraCapabilities();
        const torch = caps?.torchFeature && caps.torchFeature();
        if (torch && torch.isSupported()) {
          setSenterDidukungSholat(true);
        } else {
          setSenterDidukungSholat(false);
        }
      } catch {
        setSenterDidukungSholat(false);
      }

      setPesanScanner('Kamera aktif. Arahkan Kartu Barcode siswa.');
    } catch (err: any) {
      setPesanScanner('Kamera belum aktif: ' + (err?.message || err));
    }
  };

  const hentikanKameraSholat = async () => {
    setSenterAktifSholat(false);
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Hentikan kamera scanner sholat:', e);
      }
    }
  };

  const toggleSenterSholat = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const statusBaru = !senterAktifSholat;
      const caps = scannerRef.current.getRunningTrackCameraCapabilities();
      const torch = caps?.torchFeature && caps.torchFeature();
      if (torch && torch.isSupported()) {
        await torch.apply(statusBaru);
        setSenterAktifSholat(statusBaru);
      } else {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: statusBaru }] as any,
        });
        setSenterAktifSholat(statusBaru);
      }
    } catch (e) {
      console.warn('Gagal mengubah senter kamera sholat:', e);
    }
  };

  const tanganiQrSholat = async (rawNisn: string) => {
    if (scannerSedangMemproses.current) return;
    const cleanNisn = String(rawNisn || '').replace(/^'/, '').trim();
    if (!cleanNisn) return;

    scannerSedangMemproses.current = true;
    setPesanScanner(`Memvalidasi presensi sholat (${cleanNisn})...`);

    try {
      const res = await scanPresensiSholat(
        sesi.token,
        cleanNisn,
        waktuSholat,
        tanggal,
        sesi.nama || sesi.username
      );

      if (res && res.success) {
        const d = (res as any).data || {
          nisn: cleanNisn,
          nama: (res as any).nama || cleanNisn,
          kelas: (res as any).kelas || '-',
          waktuSholat,
          jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };

        const sudahAda = Boolean((res as any).sudahAda);
        bunyikanAudioScanner(sudahAda ? 'peringatan' : 'sukses');
        setEfekFlash(sudahAda ? 'peringatan' : 'sukses');
        setTimeout(() => setEfekFlash(null), 1200);

        setPesanScanner(
          sudahAda
            ? `⚠️ ${d.nama} (${d.kelas}) sudah absen sholat ${waktuSholat} sebelumnya.`
            : `✅ HADIR SHOLAT: ${d.nama} (${d.kelas})`
        );

        setDaftarLogScan((sebelumnya) => [
          {
            nisn: d.nisn,
            nama: d.nama,
            kelas: d.kelas,
            waktuSholat: d.waktuSholat || waktuSholat,
            jam: d.jam || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            sudahAda,
          },
          ...sebelumnya.slice(0, 19),
        ]);
      } else {
        bunyikanAudioScanner('gagal');
        setEfekFlash('gagal');
        setTimeout(() => setEfekFlash(null), 1200);
        setPesanScanner(`❌ ${res?.message || 'NISN siswa tidak valid.'}`);
      }
    } catch (e: any) {
      bunyikanAudioScanner('gagal');
      setPesanScanner(`❌ Gagal: ${e.message || 'Kesalahan koneksi'}`);
    } finally {
      setTimeout(() => {
        scannerSedangMemproses.current = false;
      }, 1400);
    }
  };

  const totalHadir = Object.values(statusMap).filter((st) => st === 'Hadir').length;

  return (
    <div className="bg-white  rounded-3xl border border-slate-200/90  shadow-sm overflow-hidden animate-fade-in-up">
      {/* Header Utama Presensi Sholat */}
      <div className="p-5 md:p-6 border-b border-slate-100  flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 ">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2.5 rounded-2xl bg-emerald-50  border border-emerald-200/80  text-emerald-700  inline-flex shadow-2xs">
              <Moon className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-black text-slate-900 ">
              Presensi Ibadah Sholat Berjamaah
            </h2>
          </div>
          <p className="text-xs md:text-sm font-medium text-slate-600 ">
            Sistem presensi ibadah sholat digital {IDENTITAS_SEKOLAH.nama} (Tahun 2026).
          </p>
        </div>

        {/* Tab Switcher: Checklist Rombel vs Scanner Kamera */}
        <div className="flex items-center bg-slate-100  p-1 rounded-2xl border border-slate-200/80 ">
          <button
            type="button"
            onClick={() => setTabMode('checklist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 tombol-taktil ${
              tabMode === 'checklist'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600  hover:text-slate-900  hover:bg-white/60 '
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Checklist Rombel</span>
          </button>
          <button
            type="button"
            onClick={() => setTabMode('scanner')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 tombol-taktil ${
              tabMode === 'scanner'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600  hover:text-slate-900  hover:bg-white/60 '
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Pindai QR Sholat</span>
          </button>
        </div>
      </div>

      {/* FILTER UNIVERSAL (TANGGAL & WAKTU SHOLAT) */}
      <div className="p-4 md:p-5 bg-slate-50/70  border-b border-slate-100  flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="field-absensisholat-385" className="text-xs font-bold text-slate-700  uppercase tracking-wider block mb-1">
              Tanggal Presensi
            </label>
            <input id="field-absensisholat-385"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="px-4 py-2.5 bg-white  border border-slate-200  rounded-xl text-sm font-bold text-slate-900  outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs"
            />
          </div>

          <div>
            <label htmlFor="field-absensisholat-397" className="text-xs font-bold text-slate-700  uppercase tracking-wider block mb-1">
              Waktu Sholat
            </label>
            <select id="field-absensisholat-397"
              value={waktuSholat}
              onChange={(e) => setWaktuSholat(e.target.value as WaktuSholat)}
              className="px-4 py-2.5 bg-white  border border-slate-200  rounded-xl text-sm font-bold text-slate-900  outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs"
            >
              <option value="Dzuhur">Dzuhur (Wajib Sekolah)</option>
              <option value="Ashar">Ashar (Wajib Sekolah)</option>
              <option value="Dhuha">Dhuha (Sunnah Pagi)</option>
              <option value="Subuh">Subuh</option>
              <option value="Maghrib">Maghrib</option>
              <option value="Isya">Isya</option>
            </select>
          </div>

          {tabMode === 'checklist' && (
            <div>
              <label htmlFor="field-absensisholat-416" className="text-xs font-bold text-slate-700  uppercase tracking-wider block mb-1">
                Pilih Rombel / Kelas
              </label>
              <select id="field-absensisholat-416"
                value={kelasTerpilih}
                onChange={(e) => setKelasTerpilih(e.target.value)}
                className="px-4 py-2.5 bg-white  border border-slate-200  rounded-xl text-sm font-bold text-slate-900  outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs"
              >
                {daftarKelas.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Button Checklist */}
        {tabMode === 'checklist' && (
          <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
            <span className="px-3.5 py-2 rounded-full bg-emerald-50  text-emerald-800  text-xs md:text-sm font-bold border border-emerald-200  shadow-2xs">
              {totalHadir} / {daftarSiswa.length} Siswa Hadir
            </span>
            <button type="button"
              onClick={tandaiSemuaHadir}
              className="px-4 py-2.5 bg-white  hover:bg-slate-50  text-slate-800  rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 border border-slate-200  shadow-2xs tombol-taktil"
            >
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Semua Hadir</span>
            </button>

            {/* Tombol Bukti Foto Dokumentasi */}
            <input
              type="file"
              ref={inputFotoRef}
              accept="image/*"
              className="hidden"
              onChange={tanganiPilihFoto}
            />
            <button type="button"
              onClick={() => inputFotoRef.current?.click()}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 border shadow-2xs tombol-taktil ${
                buktiFoto
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-200'
                  : 'bg-white  border-slate-200  text-slate-800  hover:bg-slate-50'
              }`}
              title="Ambil foto atau unggah dokumentasi sholat berjamaah rombel"
            >
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>{buktiFoto ? 'Foto Terpasang' : 'Foto Bukti'}</span>
            </button>

            <button type="button"
              onClick={tanganiSimpan}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-black transition-all flex items-center gap-2 shadow-md tombol-taktil"
            >
              <Send className="w-4 h-4" />
              <span>Simpan</span>
            </button>
          </div>
        )}
      </div>

      {/* Pratinjau Foto Dokumentasi Jika Ada */}
      {tabMode === 'checklist' && buktiFoto && (
        <div className="px-5 py-3 bg-indigo-50/70 border-b-2 border-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={buktiFoto}
              alt="Bukti Foto Sholat"
              className="w-12 h-12 rounded-xl object-cover border-2 border-indigo-300 shadow-xs"
            />
            <div>
              <p className="text-xs font-black text-indigo-950">Foto Dokumentasi Jamaah Siap Disimpan</p>
              <p className="text-[11px] font-medium text-indigo-700">
                Akan tersimpan sebagai bukti autentik kehadiran sholat {waktuSholat} kelas {kelasTerpilih}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBuktiFoto(null)}
            className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-xs transition flex items-center gap-1.5 border border-rose-300"
            title="Hapus foto ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hapus Foto</span>
          </button>
        </div>
      )}

      {/* TAMPILAN 1: CHECKLIST ROMBEL / TABEL SISWA */}
      {tabMode === 'checklist' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-800 tabel-kontras-tinggi">
            <thead className="bg-slate-100/90 border-b-2 border-slate-300 font-black text-slate-800 uppercase text-xs tracking-wider">
              <tr>
                <th className="p-4 text-center w-14">No</th>
                <th className="p-4">Identitas Siswa</th>
                <th className="p-4">NISN Siswa</th>
                <th className="p-4 text-center w-56">Status Presensi Sholat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {daftarSiswa.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-500 font-bold text-base">
                    Tidak ada data siswa di rombel kelas ini.
                  </td>
                </tr>
              ) : (
                daftarSiswa.map((s, idx) => {
                  const hadir = statusMap[s.nisn] === 'Hadir';
                  return (
                    <tr key={s.nisn} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-4 text-center text-slate-700 font-black text-sm font-mono">{idx + 1}</td>
                      <td className="p-4 font-black text-slate-900 text-sm md:text-base">{s.nama}</td>
                      <td className="p-4 text-slate-700 font-mono font-black text-xs md:text-sm">{s.nisn}</td>
                      <td className="p-4 text-center">
                        <button type="button"
                          onClick={() => toggleStatus(s.nisn)}
                          className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 mx-auto border-2 shadow-xs tombol-taktil min-w-[150px] ${
                            hadir
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                              : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {hadir ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-white" />
                              <span>Hadir Sholat</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-slate-400" />
                              <span>Tidak Hadir</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAMPILAN 2: SCANNER KAMERA QR SHOLAT LANGSUNG */}
      {tabMode === 'scanner' && (
        <div className="p-5 md:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Box Kamera Scanner */}
            <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-5 md:p-6 text-white shadow-xl relative overflow-hidden border-2 border-slate-800">
              {/* Flash Efek Visual */}
              {efekFlash && (
                <div
                  className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${
                    efekFlash === 'sukses'
                      ? 'bg-emerald-500/40'
                      : efekFlash === 'peringatan'
                      ? 'bg-amber-500/40'
                      : 'bg-rose-500/40'
                  }`}
                />
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block animate-ping" />
                  <span className="text-xs md:text-sm font-black uppercase tracking-wider text-emerald-400">
                    Pemindai Aktif • Sholat {waktuSholat}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {senterDidukungSholat && (
                    <button
                      type="button"
                      onClick={toggleSenterSholat}
                      aria-pressed={senterAktifSholat}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 border ${
                        senterAktifSholat
                          ? 'bg-amber-400 text-amber-950 border-amber-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                      }`}
                    >
                      {senterAktifSholat ? <Zap className="w-3.5 h-3.5 text-amber-950 fill-current" /> : <ZapOff className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{senterAktifSholat ? 'Senter' : 'Lampu'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setModeKontrasSholat((prev) => !prev)}
                    aria-pressed={modeKontrasSholat}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 border ${
                      modeKontrasSholat
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-300" />
                    <span>{modeKontrasSholat ? 'Anti-Silau' : 'Kontras'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKameraFacing(kameraFacing === 'environment' ? 'user' : 'environment')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Putar</span>
                  </button>
                </div>
              </div>

              {/* Area Kamera HTML5-QRCode */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-[360px] mx-auto border-2 border-slate-700 flex items-center justify-center shadow-xl">
                {/* HUD Corner Brackets */}
                <div className="scanner-hud-corner tl" aria-hidden="true" />
                <div className="scanner-hud-corner tr" aria-hidden="true" />
                <div className="scanner-hud-corner bl" aria-hidden="true" />
                <div className="scanner-hud-corner br" aria-hidden="true" />

                {/* Sinar Laser Pemindai Bergerak Halus */}
                <div
                  className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-laser-sweep pointer-events-none z-10"
                  aria-hidden="true"
                />

                <div
                  id="reader-qr-sholat"
                  className="w-full h-full"
                  style={
                    modeKontrasSholat
                      ? { filter: 'contrast(1.35) brightness(1.1) saturate(0.8)' }
                      : undefined
                  }
                />
              </div>

              {/* Status Pemindaian */}
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-center">
                <p className="text-xs md:text-sm font-bold text-slate-200">{pesanScanner}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Siswa cukup menunjukkan Kartu Barcode (fisik atau dari HP) ke kamera pemindai.
                </p>
              </div>
            </div>

            {/* Riwayat Scan Sesi Ini */}
            <div className="lg:col-span-5 bg-slate-50 rounded-3xl p-5 border-2 border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm md:text-base font-black text-slate-900">
                    Log Pemindaian ({daftarLogScan.length})
                  </h3>
                </div>
                {daftarLogScan.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDaftarLogScan([])}
                    className="text-xs font-bold text-slate-500 hover:text-rose-600"
                  >
                    Bersihkan
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {daftarLogScan.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-1">
                    <QrCode className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                    <p className="text-xs font-bold">Belum ada siswa yang dipindai.</p>
                    <p className="text-[11px] text-slate-400">Hasil tap kartu akan langsung muncul di sini.</p>
                  </div>
                ) : (
                  daftarLogScan.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all shadow-xs ${
                        log.sudahAda
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                          : 'bg-white border-emerald-300 text-slate-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs md:text-sm font-black truncate">{log.nama}</p>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-black">
                            {log.kelas}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">
                          NISN: {log.nisn} • {log.waktuSholat}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            log.sudahAda ? 'bg-amber-200 text-amber-900' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {log.sudahAda ? 'Sudah Ada' : 'Hadir'}
                        </span>
                        <p className="text-[10px] font-mono font-bold text-slate-500 mt-0.5 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{log.jam}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
