import React, { useEffect, useState } from 'react';
import { lakukanLogin, cekRateLimitLogin } from '@/layanan/Autentikasi';
import type { HasilLogin } from '@/tipe/Pengguna';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  QrCode,
  User,
  Lock,
  CreditCard,
  Clock,
} from 'lucide-react';
import { IDENTITAS_SEKOLAH, TAMPILAN_TEMA } from '@/settings';

interface PropertiHalamanLogin {
  padaLoginSukses: (hasil: HasilLogin) => void;
  setMemuat: (memuat: boolean) => void;
  padaNavigasiDaftar?: () => void;
}



export const HalamanLogin: React.FC<PropertiHalamanLogin> = ({
  padaLoginSukses,
  padaNavigasiDaftar,
}) => {
  const [tabAktif, setTabAktif] = useState<'siswa' | 'admin'>(() => {
    try {
      const tersimpan = localStorage.getItem('loginTabAktif');
      if (tersimpan === 'admin' || tersimpan === 'siswa') return tersimpan;
    } catch (_) {}
    return 'siswa';
  });
  const [nisn, setNisn] = useState('');
  const [pinSiswa, setPinSiswa] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [lihatPassword, setLihatPassword] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [sedangSubmit, setSedangSubmit] = useState(false);
  const [slideAktif, setSlideAktif] = useState(0);
  const [tayangOtomatis, setTayangOtomatis] = useState(true);

  // Rate Limiting & Cooldown State
  const [sisaDetikKunci, setSisaDetikKunci] = useState(0);

  // Opsi Ingat Saya (Default: true agar sesi tetap bertahan saat web direfresh)
  const [ingatSaya, setIngatSaya] = useState<boolean>(() => {
    try {
      const tersimpan = localStorage.getItem('absensiIngatSaya');
      return tersimpan !== 'false';
    } catch (_) {
      return true;
    }
  });

  const gantiTab = (tab: 'siswa' | 'admin') => {
    setTabAktif(tab);
    setPesanError(null);
    try {
      localStorage.setItem('loginTabAktif', tab);
    } catch (_) {}
  };

  const daftarGambar = IDENTITAS_SEKOLAH.gambarBackground || [];


  // Pengecekan Rate Limit saat komponen dimuat
  useEffect(() => {
    const status = cekRateLimitLogin();
    if (status.terkunci) {
      setSisaDetikKunci(status.sisaDetik);
    }
  }, []);

  // Timer hitung mundur jika terkunci
  useEffect(() => {
    if (sisaDetikKunci <= 0) return;
    const interval = setInterval(() => {
      setSisaDetikKunci((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sisaDetikKunci]);

  // Slideshow latar belakang jika gambar tersedia
  useEffect(() => {
    if (daftarGambar.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTayangOtomatis(false);
      return;
    }
    if (!tayangOtomatis) return;
    const timer = window.setInterval(() => {
      setSlideAktif((sebelumnya) => (sebelumnya + 1) % daftarGambar.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [tayangOtomatis, daftarGambar.length]);

  const tanganiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesanError(null);

    // Cek cooldown rate limit
    if (sisaDetikKunci > 0) {
      const menit = Math.ceil(sisaDetikKunci / 60);
      setPesanError(`Akses terkunci sementara karena terlalu banyak percobaan. Coba lagi dalam ${menit} menit.`);
      return;
    }

    setSedangSubmit(true);

    try {
      const u = tabAktif === 'siswa' ? '' : username.trim();
      const p = tabAktif === 'siswa' ? pinSiswa : password;
      const n = tabAktif === 'siswa' ? nisn.trim() : '';

      const hasil = await lakukanLogin(u, p, n, ingatSaya);
      if (hasil.success) {
        padaLoginSukses(hasil);
      } else {
        setPesanError(hasil.message || 'Username/NISN atau kata sandi tidak sesuai.');
        const cekLimit = cekRateLimitLogin();
        if (cekLimit.terkunci) {
          setSisaDetikKunci(cekLimit.sisaDetik);
        }
      }
    } catch (err: any) {
      setPesanError(err.message || 'Koneksi bermasalah. Periksa jaringan Anda.');
      const cekLimit = cekRateLimitLogin();
      if (cekLimit.terkunci) {
        setSisaDetikKunci(cekLimit.sisaDetik);
      }
    } finally {
      setSedangSubmit(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-6 pb-20 overflow-x-hidden overflow-y-auto background font-sans">
      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-5xl shrink-0 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col lg:flex-row">
        {/* Left Panel: Branding */}
        <div className="w-full lg:w-5/12 relative p-8 lg:p-10 flex flex-col justify-between text-white overflow-hidden min-h-[340px] lg:min-h-[520px] bg-[#0B1222]">
          <div className="absolute inset-0 z-0 bg-slate-900" aria-hidden="true">
            {daftarGambar.length > 0 ? (
              daftarGambar.map((gambar, indeks) => (
                <div
                  key={gambar}
                  className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                    slideAktif === indeks ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ backgroundImage: `url('${gambar}')` }}
                />
              ))
            ) : (
              <div className="absolute inset-0 bg-[#0B1222]" />
            )}
            <div className="absolute inset-0 bg-[#0B1222]/80" />
          </div>

          {/* Top Logo Section */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white/10 p-1 backdrop-blur-sm border border-white/10">
                <img
                  src={IDENTITAS_SEKOLAH.logo}
                  alt={`Logo ${IDENTITAS_SEKOLAH.nama}`}
                  width="40"
                  height="40"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <span className="font-bold tracking-wider text-sm text-blue-100 drop-shadow-md">
                {IDENTITAS_SEKOLAH.nama}
              </span>
            </div>

            <h1 className="text-3xl lg:text-5xl font-bold leading-tight mb-4 text-white drop-shadow-sm">
              Sistem Absensi <br />
              <span className="text-blue-200">Digital</span>
            </h1>
            <p className="text-slate-300 text-xs lg:text-sm leading-relaxed max-w-xs font-light">
              Platform manajemen kehadiran terintegrasi, aman, cepat, dan presisi.
            </p>
          </div>

          {/* Bottom Indicators & Badges */}
          <div className="relative z-10 mt-8">
            {daftarGambar.length > 1 && (
              <div className="mb-4 flex items-center gap-2">
                {daftarGambar.map((gambar, indeks) => (
                  <button
                    key={gambar}
                    type="button"
                    onClick={() => setSlideAktif(indeks)}
                    aria-label={`Tampilkan gambar latar ${indeks + 1}`}
                    aria-pressed={slideAktif === indeks}
                    className="flex h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span
                      className={`h-2.5 rounded-full transition-all ${
                        slideAktif === indeks ? 'w-8 bg-blue-300' : 'w-3 bg-white/70'
                      }`}
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTayangOtomatis((aktif) => !aktif)}
                  className="min-h-11 rounded px-3 text-xs font-semibold text-white underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  aria-label={tayangOtomatis ? 'Jeda pergantian gambar' : 'Putar pergantian gambar'}
                >
                  {tayangOtomatis ? 'Jeda' : 'Putar'}
                </button>
              </div>
            )}
            <div className="flex gap-3 text-xs font-medium text-slate-300">
              <div className="px-3 py-1.5 rounded-lg bg-black/30 backdrop-blur-md border border-white/5 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" /> Terenkripsi
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-black/30 backdrop-blur-md border border-white/5 flex items-center gap-1.5 shadow-sm">
                <QrCode className="w-3.5 h-3.5 text-cyan-300" /> Pindai Cepat
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="w-full lg:w-7/12 bg-slate-50 p-6 sm:p-8 lg:p-12 flex flex-col justify-center relative">
          <div className="max-w-md mx-auto w-full">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">Selamat Datang</h2>
              <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
                Silakan masuk menggunakan akun atau NISN Anda
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="bg-slate-200/60 p-1.5 rounded-2xl flex mb-6 border border-slate-300/60 shadow-inner">
              <button
                type="button"
                onClick={() => gantiTab('siswa')}
                aria-pressed={tabAktif === 'siswa'}
                className={`flex-1 py-3 text-xs md:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 tombol-taktil ${
                  tabAktif === 'siswa'
                    ? 'bg-white text-blue-700 shadow-md border border-slate-200/80'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/50'
                }`}
              >
                <span>Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => gantiTab('admin')}
                aria-pressed={tabAktif === 'admin'}
                className={`flex-1 py-3 text-xs md:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 tombol-taktil ${
                  tabAktif === 'admin'
                    ? 'bg-white text-blue-700 shadow-md border border-slate-200/80'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/50'
                }`}
              >
                <span>Guru / Admin</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={tanganiSubmit} className="space-y-4">
              {tabAktif === 'siswa' ? (
                <div>
                  <label htmlFor="nisn-siswa" className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2 ml-1">
                    NISN / EMAIL SISWA
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <input
                      id="nisn-siswa"
                      type="text"
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      required
                      placeholder="Nomor Induk Siswa Nasional / Email"
                      className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 text-sm md:text-base font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder-slate-400 shadow-xs"
                    />
                  </div>
                  <label htmlFor="pin-siswa" className="block text-xs font-black text-slate-800 uppercase tracking-wider mt-4 mb-2 ml-1">
                    PIN SISWA
                  </label>
                  <input
                    id="pin-siswa"
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    value={pinSiswa}
                    onChange={(e) => setPinSiswa(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    required
                    minLength={4}
                    placeholder="Masukkan PIN pribadi"
                    className="block w-full px-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 text-sm md:text-base font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder-slate-400 shadow-xs"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="username-pengajar" className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2 ml-1">
                      USERNAME / EMAIL
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-600">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        id="username-pengajar"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        placeholder="Username atau alamat email"
                        className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 text-sm md:text-base font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder-slate-400 shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password-pengajar" className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2 ml-1">
                      KATA SANDI (PASSWORD)
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-600">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        id="password-pengajar"
                        type={lihatPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        placeholder="••••••••"
                        className="block w-full pl-12 pr-12 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 text-sm md:text-base font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder-slate-400 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setLihatPassword(!lihatPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-blue-600 transition"
                        aria-label={lihatPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                        aria-pressed={lihatPassword}
                      >
                        {lihatPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Opsi Ingat Saya (Keamanan perangkat bersama) */}
              <div className="flex items-center justify-between pt-1 pb-1">
                <label htmlFor="ingat-saya-checkbox" className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="ingat-saya-checkbox"
                    type="checkbox"
                    checked={ingatSaya}
                    onChange={(e) => setIngatSaya(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                    Ingat saya di perangkat ini
                  </span>
                </label>
              </div>

              {/* Tombol Masuk */}
              <button
                type="submit"
                disabled={sedangSubmit || sisaDetikKunci > 0}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-2xl shadow-lg shadow-blue-600/25 transition-all text-sm md:text-base flex justify-center items-center gap-2 group mt-4 tombol-taktil"
              >
                {sedangSubmit ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : sisaDetikKunci > 0 ? (
                  <>
                    <Clock className="w-5 h-5 animate-pulse" />
                    <span>Terkunci ({sisaDetikKunci}s)</span>
                  </>
                ) : (
                  <>
                    <span>MASUK SEKARANG</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Daftar akun baru (hanya tab admin) */}
            {tabAktif === 'admin' && padaNavigasiDaftar && (
              <div className="pt-3 text-center text-xs text-slate-500 font-medium">
                Belum memiliki akun pengajar?{' '}
                <button
                  type="button"
                  onClick={padaNavigasiDaftar}
                  className="text-blue-600 font-bold hover:underline ml-1"
                >
                  Daftar Akun Baru
                </button>
              </div>
            )}

            {/* Error Alert Box */}
            {pesanError && (
              <div
                role="alert"
                className="mt-5 w-full min-w-0 p-4 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-start gap-3 animate-fade-in shadow-xs"
              >
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs md:text-sm font-black text-rose-950">Akses Ditolak</h4>
                  <p className="break-words whitespace-normal text-xs md:text-sm font-semibold leading-relaxed text-rose-700 mt-0.5">
                    {pesanError}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Hak Cipta Dinamis */}
      <p className="relative z-20 shrink-0 text-center text-slate-400 text-xs font-medium opacity-90">
        {TAMPILAN_TEMA.hakCipta}
      </p>

    </div>
  );
};
