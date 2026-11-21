import React, { useEffect, useRef, useState } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import type { WaktuSholat } from '@/tipe/Sholat';
import { ambilDataMonitoring, ambilAbsensiHariIni, simpanPresensiSholat } from '@/layanan/LayananAbsensi';
import { KartuStatistik } from '@/komponen/dashboard/KartuStatistik';
import { GrafikAbsensi } from '@/komponen/dashboard/GrafikAbsensi';
import { QrCode, Users, CheckCircle2, Download, Printer, Camera, KeyRound, Lock, Eye, EyeOff, Moon, Send, RefreshCw, AlertCircle, CalendarClock } from 'lucide-react';
import QRCode from 'qrcode';
import { gantiPinSiswa } from '@/layanan/LayananSiswa';
import { kompresFoto } from '@/layanan/LayananProfil';
import { dapatkanTanggalHariIni } from '@/utilitas/Tanggal';
import Swal from 'sweetalert2';
import { SkeletonKartu } from '@/komponen/umum/SkeletonLoader';
import { useAksesibilitasDialog } from '@/utilitas/useAksesibilitasDialog';
import { IDENTITAS_SEKOLAH } from '@/settings';

interface PropertiHalamanDashboard {
  sesi: SesiTersimpan;
  setMenuAktif: (menu: string) => void;
  setMemuat: (memuat: boolean) => void;
}

export const HalamanDashboard: React.FC<PropertiHalamanDashboard> = ({
  sesi,
  setMenuAktif,
}) => {
  const [statistik, setStatistik] = useState({
    total: 0,
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpa: 0,
    belum: 0,
  });

  const [pesanPeringatanDashboard, setPesanPeringatanDashboard] = useState<string | null>(null);
  const [terakhirDiperbarui, setTerakhirDiperbarui] = useState<Date | null>(null);
  const [sedangSegarkan, setSedangSegarkan] = useState(false);
  const [sedangMuatData, setSedangMuatData] = useState(true);

  const [dataSiswaSaja, setDataSiswaSaja] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // State Ganti PIN Mandiri Siswa
  const [modalGantiPinBuka, setModalGantiPinBuka] = useState(false);
  const [pinLama, setPinLama] = useState('');
  const [pinBaru, setPinBaru] = useState('');
  const [pinKonfirmasi, setPinKonfirmasi] = useState('');
  const [tampilPin, setTampilPin] = useState(false);
  const [sedangSimpanPin, setSedangSimpanPin] = useState(false);
  const dialogPinRef = useRef<HTMLDivElement>(null);

  useAksesibilitasDialog(modalGantiPinBuka, dialogPinRef, () => setModalGantiPinBuka(false));

  const tanganiGantiPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinLama.trim()) {
      Swal.fire('Perhatian', 'PIN lama wajib diisi.', 'warning');
      return;
    }
    if (pinBaru.trim().length < 4) {
      Swal.fire('Perhatian', 'PIN baru minimal harus 4 digit angka.', 'warning');
      return;
    }
    if (pinBaru.trim() !== pinKonfirmasi.trim()) {
      Swal.fire('Perhatian', 'Konfirmasi PIN baru tidak sesuai.', 'warning');
      return;
    }

    setSedangSimpanPin(true);
    try {
      const res = await gantiPinSiswa(sesi.token, pinLama.trim(), pinBaru.trim());
      setSedangSimpanPin(false);
      if (res && res.success) {
        setModalGantiPinBuka(false);
        setPinLama('');
        setPinBaru('');
        setPinKonfirmasi('');
        Swal.fire('Berhasil!', 'PIN akun siswa Anda berhasil diperbarui. Gunakan PIN baru ini untuk login berikutnya.', 'success');
      } else {
        Swal.fire('Gagal', res?.message || 'Gagal mengubah PIN.', 'error');
      }
    } catch (err: any) {
      setSedangSimpanPin(false);
      Swal.fire('Error', err.message || 'Kesalahan sistem saat mengubah PIN.', 'error');
    }
  };

  // State Presensi Sholat Mandiri (Foto Bukti) Siswa (Mendukung 5 Waktu & Dhuha)
  const [waktuSholatSiswa, setWaktuSholatSiswa] = useState<WaktuSholat>(() => {
    const jam = new Date().getHours();
    if (jam >= 18 && jam < 24) return 'Isya';
    if (jam >= 17 && jam < 18) return 'Maghrib';
    if (jam >= 14 && jam < 17) return 'Ashar';
    if (jam >= 11 && jam < 14) return 'Dzuhur';
    if (jam >= 6 && jam < 11) return 'Dhuha';
    return 'Subuh';
  });
  const [fotoBuktiSholat, setFotoBuktiSholat] = useState<string | null>(null);
  const [sedangKirimSholat, setSedangKirimSholat] = useState(false);
  const inputFotoRef = React.useRef<HTMLInputElement>(null);

  const sholatTerpilihSudahHadir = React.useMemo(() => {
    const list = dataSiswaSaja?.sholatHariIni || [];
    return list.find(
      (s: any) =>
        String(s.waktuSholat).toLowerCase() === waktuSholatSiswa.toLowerCase() &&
        s.status === 'Hadir'
    );
  }, [dataSiswaSaja, waktuSholatSiswa]);

  const tanganiAmbilFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const base64 = await kompresFoto(file, 500);
      setFotoBuktiSholat(base64);
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal mengambil foto dokumentasi.', 'error');
    }
  };

  const tanganiKirimFotoSholat = async () => {
    if (!fotoBuktiSholat) {
      Swal.fire('Foto Belum Diambil', 'Silakan ambil foto dokumentasi di mushola terlebih dahulu sebagai bukti kehadiran.', 'warning');
      return;
    }

    setSedangKirimSholat(true);
    try {
      const tgl = dapatkanTanggalHariIni();
      const payload: any[] = [
        {
          tanggal: tgl,
          nisn: sesi.nisn || sesi.username,
          nama: sesi.nama || sesi.username,
          kelas: sesi.kelas || '',
          waktuSholat: waktuSholatSiswa,
          status: 'Hadir',
          keterangan: 'Dokumentasi Mandiri Siswa',
          inputOleh: sesi.nama || sesi.username,
          buktiFoto: fotoBuktiSholat,
        },
      ];

      const res = await simpanPresensiSholat(payload, fotoBuktiSholat);
      setSedangKirimSholat(false);
      if (res && res.success) {
        Swal.fire({
          title: 'Alhamdulillah!',
          text: `Presensi Sholat ${waktuSholatSiswa} berhasil tercatat dengan bukti foto dokumentasi.`,
          icon: 'success',
        });
        setFotoBuktiSholat(null);
        muatDataDashboard();
      } else {
        Swal.fire('Gagal', res?.message || 'Gagal mengirim presensi sholat.', 'error');
      }
    } catch (err: any) {
      setSedangKirimSholat(false);
      Swal.fire('Error', err.message || 'Kesalahan sistem saat mengirim presensi sholat.', 'error');
    }
  };

  const identifier = sesi.nisn || sesi.username || '';

  useEffect(() => {
    muatDataDashboard();
    if (sesi.role === 'siswa') {
      const nisnTarget = String(identifier).trim();
      if (nisnTarget) {
        QRCode.toDataURL(nisnTarget, {
          width: 360,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        })
          .then((url) => setQrCodeUrl(url))
          .catch((err) => console.error('Gagal membuat QR Code:', err));
      }
    }
  }, [sesi]);

  const muatDataDashboard = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setSedangSegarkan(true);
      } else {
        setSedangMuatData(true);
      }
      setPesanPeringatanDashboard(null);

      if (sesi.role === 'siswa') {
        const res = await ambilAbsensiHariIni(sesi.nisn || sesi.username);
        setDataSiswaSaja(res);
        setTerakhirDiperbarui(new Date());
      } else {
        const res = await ambilDataMonitoring();
        if (res && res.success && Array.isArray(res.data)) {
          const d = res.data;
          const status = (item: any) => String(item?.status || '').trim().toLowerCase();
          const h = d.filter((x: any) => status(x) === 'hadir' || status(x) === 'terlambat').length;
          const s = d.filter((x: any) => status(x) === 'sakit').length;
          const i = d.filter((x: any) => status(x) === 'izin').length;
          const a = d.filter((x: any) => status(x) === 'alpa' || status(x) === 'alpha').length;
          const b = d.filter((x: any) => status(x) === 'belum absen' || !status(x)).length;
          setStatistik({
            total: d.length,
            hadir: h,
            sakit: s,
            izin: i,
            alpa: a,
            belum: b,
          });
          setTerakhirDiperbarui(new Date());

          if (d.length === 0) {
            setPesanPeringatanDashboard(
              res.message || 'Database siswa di Google Spreadsheet masih kosong. Silakan import atau tambahkan data siswa di menu Data Siswa.'
            );
          }
        } else if (res && !res.success) {
          setPesanPeringatanDashboard(
            res.message || 'Gagal memuat data pemantauan kehadiran terkini dari Google Spreadsheet.'
          );
        }
      }
    } catch (e: any) {
      setPesanPeringatanDashboard(
        e.message || 'Gagal terhubung ke backend Google Apps Script. Pastikan URL Web App di Vercel valid dan Web App Apps Script sudah di-deploy dengan versi terbaru.'
      );
    } finally {
      setSedangMuatData(false);
      setSedangSegarkan(false);
    }
  };

  const unduhQrCode = () => {
    if (!qrCodeUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `QR_Absensi_${sesi.nisn || sesi.username}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Khusus Siswa: Barcode & QR Code Presensi Harian */}
      {sesi.role === 'siswa' ? (
        <div className="max-w-xl mx-auto space-y-5">
          {/* Header Panel Kode Presensi Siswa */}
          <div className="kartu-modern flex items-center justify-between p-3.5 print:hidden">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs animate-pulse"></span>
              <span className="text-xs font-black text-slate-800  uppercase tracking-wider">
                Kode Presensi Siswa (QR &amp; Barcode)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setModalGantiPinBuka(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100  text-amber-900  border border-amber-200  text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs tombol-taktil"
              title="Ganti PIN Akun Siswa"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Ganti PIN</span>
            </button>
          </div>

          {/* Kontainer Utama Barcode & QR Code Presensi */}
          <div className="kartu-modern area-cetak-presensi bg-white  rounded-3xl overflow-hidden border border-slate-200  shadow-md">
            {/* Header Biru Gelap */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 text-center border-b-4 border-indigo-500">
              <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-white leading-tight">
                KODE PRESENSI SISWA
              </h2>
              <p className="text-xs text-indigo-300 font-bold uppercase mt-1 tracking-widest">
                {IDENTITAS_SEKOLAH.nama}
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                Arahkan kode ini ke kamera pemindai presensi di sekolah
              </p>
            </div>

            {/* Badan: Identitas Siswa + QR Code + Barcode */}
            <div className="p-6 text-center space-y-5 bg-gradient-to-b from-slate-50/50 to-white  ">
              {/* Identitas Siswa */}
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900  uppercase tracking-wide">
                  {sesi.nama || sesi.username}
                </h3>
                <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-600 ">
                  <span>NISN: <strong className="font-mono text-indigo-700  text-sm">{sesi.nisn || sesi.username || '-'}</strong></span>
                  <span>•</span>
                  <span>Kelas: <strong className="text-slate-900 ">{sesi.kelas || '-'}</strong></span>
                </div>
              </div>

              {/* QR Code Presensi */}
              <div className="flex justify-center">
                <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-300  shadow-sm inline-block">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt={`QR Presensi ${sesi.nisn}`}
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-sm font-bold">
                      Memuat QR...
                    </div>
                  )}
                  <p className="font-mono text-xs font-black text-indigo-900 tracking-wider mt-2">
                    {sesi.nisn || '-'}
                  </p>
                </div>
              </div>

              {/* Barcode 1D Siswa */}
              <div className="inline-block bg-white  p-3 rounded-2xl border border-slate-200  shadow-2xs">
                <div className="flex items-center justify-center gap-0.5 h-10 px-4">
                  {Array.from({ length: 42 }).map((_, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-900  inline-block h-full"
                      style={{
                        width: idx % 3 === 0 ? '3px' : idx % 2 === 0 ? '1.5px' : '2px',
                        opacity: idx % 5 === 0 ? 0.8 : 1,
                      }}
                    />
                  ))}
                </div>
                <p className="font-mono text-[11px] font-bold text-slate-700  tracking-widest mt-1">
                  *{sesi.nis || '24251001'}-{sesi.nisn || sesi.username || '000000'}*
                </p>
              </div>
            </div>

            {/* Tombol Aksi Praktis */}
            <div className="p-4 bg-slate-50  border-t border-slate-200  flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={unduhQrCode}
                className="flex-1 min-w-[140px] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm hover-lift taktil-klik"
                title="Unduh berkas QR Code untuk disimpan di galeri ponsel"
              >
                <Download className="w-4 h-4" />
                <span>Simpan QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 min-w-[140px] py-3 px-4 bg-white hover:bg-slate-100   border-2 border-slate-300  text-slate-800  rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 hover-lift taktil-klik"
                title="Cetak Kode Presensi"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kode Presensi</span>
              </button>
            </div>
          </div>

          {/* Kotak Status Absensi Hari Ini */}
          <div className="bg-white  p-5 rounded-2xl border border-slate-200/90  shadow-sm space-y-3">
            <h4 className="font-extrabold text-slate-900  text-sm flex items-center gap-2 border-b border-slate-100  pb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 " />
              <span>Status Kehadiran Hari Ini</span>
            </h4>
            <div className="space-y-2 text-xs md:text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600  font-bold">Status:</span>
                <span className="font-extrabold text-emerald-700  px-3 py-1 rounded-full bg-emerald-50  border border-emerald-200  shadow-2xs">
                  {dataSiswaSaja?.status || 'Belum Tercatat'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600  font-bold">Jam Masuk:</span>
                <span className="font-mono text-slate-900  font-black">
                  {dataSiswaSaja?.jamMasuk || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600  font-bold">Jam Pulang:</span>
                <span className="font-mono text-slate-900  font-black">
                  {dataSiswaSaja?.jamPulang || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Kotak Presensi Sholat Mandiri Siswa (Foto Dokumentasi di Mushola Sekolah) */}
          <div className="bg-white  p-5 rounded-2xl border border-emerald-200/90  shadow-sm space-y-4">
            <input
              type="file"
              ref={inputFotoRef}
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={tanganiAmbilFoto}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100  pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-100  text-emerald-700  rounded-xl border border-emerald-300">
                  <Moon className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-black text-slate-900  text-sm leading-tight">
                    Presensi Sholat Mandiri (Foto Bukti)
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500 ">
                    Dokumentasi Sholat Berjamaah di Mushola Sekolah
                  </p>
                </div>
              </div>

              {/* Selector Waktu Sholat (5 Waktu & Dhuha) */}
              <div className="flex flex-wrap bg-slate-100  p-1 rounded-xl border border-slate-200  gap-1 self-start sm:self-auto">
                {(['Subuh', 'Dhuha', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setWaktuSholatSiswa(w);
                      setFotoBuktiSholat(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all taktil-klik ${
                      waktuSholatSiswa === w
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600  hover:text-slate-900 '
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Sholat Terpilih */}
            {sholatTerpilihSudahHadir ? (
              <div className="p-4 rounded-xl bg-emerald-50  border-2 border-emerald-300  flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-950 ">
                      Alhamdulillah, Hadir Sholat {waktuSholatSiswa}!
                    </p>
                    <p className="text-[11px] font-bold text-emerald-700 ">
                      Presensi sholat Anda hari ini telah tercatat dan terverifikasi di sistem.
                    </p>
                  </div>
                </div>
                {sholatTerpilihSudahHadir.buktiFoto && (
                  <img
                    src={sholatTerpilihSudahHadir.buktiFoto}
                    alt="Foto Bukti Sholat"
                    className="w-10 h-10 rounded-lg object-cover border border-emerald-400"
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50  border border-slate-200  text-xs text-slate-700  flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-bold">
                      Status Sholat {waktuSholatSiswa}: <span className="text-amber-700  font-black">Belum Presensi</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Hari ini</span>
                </div>

                {/* Foto Preview atau Tombol Buka Kamera */}
                {fotoBuktiSholat ? (
                  <div className="p-3 bg-emerald-50  rounded-2xl border-2 border-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={fotoBuktiSholat}
                        alt="Pratinjau Foto"
                        className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400 shadow-xs"
                      />
                      <div>
                        <p className="text-xs font-black text-emerald-950 ">
                          Foto Dokumentasi Berhasil Diambil
                        </p>
                        <p className="text-[11px] text-emerald-700  font-medium">
                          Siap dikirim sebagai bukti Sholat {waktuSholatSiswa}.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFotoBuktiSholat(null)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-[11px] font-black transition"
                    >
                      Ambil Ulang
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputFotoRef.current?.click()}
                    className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 transition-all flex flex-col items-center justify-center gap-1.5 shadow-2xs tombol-taktil"
                  >
                    <Camera className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-black">Ambil Foto Dokumentasi di Mushola (Kamera HP)</span>
                    <span className="text-[10px] text-slate-500">Gunakan kamera depan berbusana rapi / mukena / peci</span>
                  </button>
                )}

                {/* Tombol Kirim */}
                {fotoBuktiSholat && (
                  <button
                    type="button"
                    disabled={sedangKirimSholat}
                    onClick={tanganiKirimFotoSholat}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md tombol-taktil"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sedangKirimSholat ? 'Mengirim Bukti...' : `Kirim Bukti Sholat ${waktuSholatSiswa}`}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Admin, Wakel, dan Guru */
        <>
          {/* Quick Access Panel (Sembunyikan jika wakel sesuai aturan eksisting) */}
          {sesi.role !== 'wakel' && sesi.role !== 'waka' && (
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-slate-950/15 md:p-7">
              <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[22px] border-emerald-400/20" />
              <div className="pointer-events-none absolute -bottom-24 right-24 h-40 w-40 rounded-full border-[18px] border-indigo-400/15" />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Presensi hari ini
                  </div>
                  <h2 className="text-lg md:text-2xl font-black tracking-tight">
                    {sesi.role === 'guru' ? 'Akses Presensi Cepat Guru' : 'Akses Operasional Cepat'}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-300 mt-1 font-medium">
                    Silakan pilih aksi utama presensi hari ini.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button"
                    onClick={() => setMenuAktif(sesi.role === 'guru' ? 'daftar-hadir' : 'scanner')}
                    className="px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs md:text-sm font-bold transition shadow-sm flex items-center gap-2 border border-indigo-400/30"
                  >
                    <QrCode className="w-5 h-5 text-white" />
                    <span>{sesi.role === 'guru' ? 'Buka Absensi Rombel' : 'Buka Pemindai Kamera'}</span>
                  </button>
                  {sesi.role === 'admin' && (
                    <button type="button"
                      onClick={() => setMenuAktif('siswa')}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 text-white rounded-xl text-xs md:text-sm font-bold transition shadow-sm flex items-center gap-2"
                    >
                      <Users className="w-5 h-5" />
                      <span>Data Induk Siswa</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Banner Rombel Binaan Khusus Guru */}
          {sesi.role === 'guru' && sesi.kelas && (
            <div className="p-4 bg-indigo-50/80 border border-indigo-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                    Rombel Kelas Binaan Anda
                  </h4>
                  <p className="text-xs text-indigo-800 font-bold mt-0.5">
                    {sesi.kelas.split(',').map((k: string) => k.trim()).join(' • ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuAktif('daftar-hadir')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm tombol-taktil"
              >
                <span>Mulai Absensi Rombel</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* Bar Kontrol Pemantauan Terkini & Status Sinkronisasi */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white  border border-slate-200/90  rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900  uppercase tracking-wider">
                  Pemantauan Kehadiran Terkini
                </h3>
                <p className="text-[11px] text-slate-500 font-bold">
                  {terakhirDiperbarui ? (
                    <>Terakhir diperbarui: <span className="text-slate-900  font-black">{terakhirDiperbarui.toLocaleTimeString('id-ID')} WIB</span></>
                  ) : (
                    'Menunggu sinkronisasi...'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={sedangSegarkan}
              onClick={() => muatDataDashboard(true)}
              className="px-4 py-2 bg-slate-100  hover:bg-slate-200  text-slate-900  border-2 border-slate-300  rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xs tombol-taktil disabled:opacity-50"
              title="Segarkan data dari spreadsheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sedangSegarkan ? 'animate-spin text-indigo-600' : 'text-slate-700 '}`} />
              <span>{sedangSegarkan ? 'Menyinkronkan...' : 'Muat Ulang Data'}</span>
            </button>
          </div>

          {/* Banner Peringatan Diagnostik Backend / Spreadsheet */}
          {pesanPeringatanDashboard && (
            <div className="p-4 bg-amber-50  border-2 border-amber-400  rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700  shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-amber-950 ">
                    Status Database & Server Presensi
                  </h4>
                  <p className="text-xs text-amber-900  font-bold mt-0.5 leading-relaxed">
                    {pesanPeringatanDashboard}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                {sesi.role === 'admin' && (
                  <button type="button"
                    onClick={() => setMenuAktif('siswa')}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-xs tombol-taktil"
                  >
                    Buka Data Siswa
                  </button>
                )}
                <button type="button"
                  onClick={() => muatDataDashboard(true)}
                  className="px-3.5 py-1.5 bg-white  border border-amber-400 text-amber-950  text-xs font-black rounded-xl hover:bg-amber-100 transition-all shadow-xs tombol-taktil"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {/* Banner Hari Libur (Minggu) */}
          {new Date().getDay() === 0 && (
            <div className="p-3.5 bg-sky-50  border-2 border-sky-300  rounded-2xl flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-sky-700  shrink-0" />
              <div className="text-xs text-sky-950  font-bold">
                <span className="font-black">Hari Ini Hari Minggu (Libur Sekolah):</span> Jam KBM dan presensi harian otomatis tidak berjalan.
                {statistik.total > 0 && ` Sistem membaca ${statistik.total} data siswa aktif terdaftar.`}
              </div>
            </div>
          )}

          {/* Tampilan Konten: Skeleton Loading vs Data Asli */}
          {sedangMuatData ? (
            <div className="space-y-6 animate-fade-in">
              {/* Skeleton Grid Kartu Statistik */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <SkeletonKartu key={idx} />
                ))}
              </div>
              {/* Skeleton Grafik Kehadiran */}
              <div className="p-6 bg-white  border border-slate-200/80  rounded-3xl space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="w-48 h-5 bg-slate-200  rounded-md shimmer-skeleton" />
                  <div className="w-32 h-6 bg-slate-100  rounded-md shimmer-skeleton" />
                </div>
                <div className="h-64 bg-slate-100/70  rounded-2xl shimmer-skeleton" />
              </div>
            </div>
          ) : (
            <>
              {/* Kartu Statistik */}
              <KartuStatistik
                total={statistik.total}
                hadir={statistik.hadir}
                sakit={statistik.sakit}
                izin={statistik.izin}
                alpa={statistik.alpa}
                belum={statistik.belum}
              />

              {/* Grafik Chart.js */}
              <GrafikAbsensi
                total={statistik.total}
                hadir={statistik.hadir}
                sakit={statistik.sakit}
                izin={statistik.izin}
                alpa={statistik.alpa}
                belum={statistik.belum}
              />
            </>
          )}
        </>
      )}

      {/* Modal Ganti PIN Mandiri Siswa */}
      {modalGantiPinBuka && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div
            ref={dialogPinRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-ganti-pin-title"
            tabIndex={-1}
            className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up"
          >
            <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-white/20 rounded-xl">
                  <KeyRound className="w-5 h-5 text-slate-950" />
                </span>
                <div>
                  <h3 id="dialog-ganti-pin-title" className="font-black text-base leading-tight">Ganti PIN Login Siswa</h3>
                  <p className="text-xs font-bold text-slate-900/80">{IDENTITAS_SEKOLAH.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalGantiPinBuka(false)}
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 font-black flex items-center justify-center text-slate-950 transition"
                aria-label="Tutup formulir ganti PIN"
              >
                ✕
              </button>
            </div>

            <form onSubmit={tanganiGantiPin} className="p-6 space-y-4">
              <div>
                <label htmlFor="field-dashboard-728" className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  PIN Lama
                </label>
                <div className="relative">
                  <input id="field-dashboard-728"
                    type={tampilPin ? 'text' : 'password'}
                    inputMode="numeric"
                    required
                    value={pinLama}
                    onChange={(e) => setPinLama(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Masukkan PIN saat ini"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-sm font-mono font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label htmlFor="field-dashboard-746" className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  PIN Baru (Minimal 4 Angka)
                </label>
                <div className="relative">
                  <input id="field-dashboard-746"
                    type={tampilPin ? 'text' : 'password'}
                    inputMode="numeric"
                    required
                    minLength={4}
                    value={pinBaru}
                    onChange={(e) => setPinBaru(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Contoh: 1234 atau 4 angka rahasia"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-sm font-mono font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label htmlFor="field-dashboard-765" className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Konfirmasi PIN Baru
                </label>
                <div className="relative">
                  <input id="field-dashboard-765"
                    type={tampilPin ? 'text' : 'password'}
                    inputMode="numeric"
                    required
                    minLength={4}
                    value={pinKonfirmasi}
                    onChange={(e) => setPinKonfirmasi(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Ulangi PIN baru"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-sm font-mono font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setTampilPin(!tampilPin)}
                  className="text-xs font-black text-amber-700 hover:text-amber-800 flex items-center gap-1.5"
                  aria-pressed={tampilPin}
                >
                  {tampilPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{tampilPin ? 'Sembunyikan Karakter' : 'Lihat Karakter PIN'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalGantiPinBuka(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs md:text-sm font-black transition border-2 border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sedangSimpanPin}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs md:text-sm font-black transition shadow-md disabled:opacity-50"
                >
                  {sedangSimpanPin ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
