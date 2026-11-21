import React, { useState } from 'react';
import { panggilApi } from '@/layanan/KlienApi';
import {
  UserPlus,
  User,
  Lock,
  Mail,
  Key,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { IDENTITAS_SEKOLAH, TAMPILAN_TEMA } from '@/settings';

interface PropertiDaftarAkun {
  padaDaftarSukses: () => void;
  padaBatal: () => void;
}

export const HalamanDaftarAkun: React.FC<PropertiDaftarAkun> = ({
  padaDaftarSukses,
  padaBatal,
}) => {
  const [namaLengkap, setNamaLengkap] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [kodeUndangan, setKodeUndangan] = useState('');

  const [sedangSubmit, setSedangSubmit] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  const tanganiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesanError(null);

    const userBersih = username.trim().toLowerCase();
    const namaBersih = namaLengkap.trim();
    const emailBersih = email.trim().toLowerCase();

    // Validasi Sanitasi Sisi Klien
    if (!/^[a-z0-9_]{3,30}$/.test(userBersih)) {
      setPesanError('Username hanya boleh 3-30 karakter (huruf kecil, angka, dan underscore).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailBersih)) {
      setPesanError('Format email tidak valid.');
      return;
    }

    if (password.length < 8) {
      setPesanError('Kata sandi minimal 8 karakter demi keamanan.');
      return;
    }

    if (password !== konfirmasiPassword) {
      setPesanError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSedangSubmit(true);

    try {
      const hasil = await panggilApi<{ success: boolean; message?: string }>(
        'daftarAkunGuru',
        [namaBersih, userBersih, emailBersih, password, kodeUndangan.trim()]
      );

      if (hasil.success) {
        setSukses(true);
        setTimeout(() => {
          padaDaftarSukses();
        }, 2000);
      } else {
        setPesanError(hasil.message || 'Pendaftaran gagal. Silakan hubungi admin sekolah.');
      }
    } catch (err: any) {
      setPesanError(err.message || 'Gagal menghubungi server pendaftaran.');
    } finally {
      setSedangSubmit(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-8 overflow-y-auto bg-slate-900 font-sans">
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-slate-200">
        {/* Tombol Kembali */}
        <button
          type="button"
          onClick={padaBatal}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Masuk</span>
        </button>

        {/* Header Identitas */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Daftar Akun Pengajar
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Registrasi akun portal presensi {IDENTITAS_SEKOLAH.nama}
          </p>
        </div>

        {sukses ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-emerald-950">Pendaftaran Berhasil!</h3>
            <p className="text-xs text-emerald-700">
              Akun Anda telah tercatat. Mengalihkan kembali ke halaman login...
            </p>
          </div>
        ) : (
          <form onSubmit={tanganiSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="daftar-nama-lengkap"
                className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 ml-1"
              >
                Nama Lengkap & Gelar
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="daftar-nama-lengkap"
                  type="text"
                  required
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Pd"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="daftar-username"
                className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 ml-1"
              >
                Username Akun
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400">@</span>
                <input
                  id="daftar-username"
                  type="text"
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="budi_santoso"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="daftar-email"
                className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 ml-1"
              >
                Email Sekolah / Resmi
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="daftar-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@sekolah.sch.id"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="daftar-password"
                  className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 ml-1"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    id="daftar-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 karakter"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="daftar-konfirmasi-password"
                  className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 ml-1"
                >
                  Ulangi Sandi
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    id="daftar-konfirmasi-password"
                    type="password"
                    required
                    minLength={8}
                    value={konfirmasiPassword}
                    onChange={(e) => setKonfirmasiPassword(e.target.value)}
                    placeholder="Konfirmasi sandi"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="daftar-kode-undangan"
                className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 ml-1"
              >
                Kode Undangan Sekolah (Opsional)
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="daftar-kode-undangan"
                  type="text"
                  value={kodeUndangan}
                  onChange={(e) => setKodeUndangan(e.target.value)}
                  placeholder="Kode dari Administrator Sekolah jika ada"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sedangSubmit}
              className="w-full mt-4 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-xl shadow-lg shadow-blue-600/25 transition-all text-sm flex items-center justify-center gap-2"
            >
              {sedangSubmit ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mendaftarkan Akun...</span>
                </>
              ) : (
                <span>DAFTAR SEKARANG</span>
              )}
            </button>
          </form>
        )}

        {/* Error Alert */}
        {pesanError && (
          <div className="mt-5 p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 font-medium">
              <span className="font-bold">Gagal Mendaftar:</span> {pesanError}
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verifikasi Enkripsi
          </span>
          <span>{TAMPILAN_TEMA.hakCipta}</span>
        </div>
      </div>
    </div>
  );
};
