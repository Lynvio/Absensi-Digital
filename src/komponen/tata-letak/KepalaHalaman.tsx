import React, { useState, useEffect, useRef } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import { Menu, Calendar, Camera, Lock, User, X, Trash2, KeyRound, Search } from 'lucide-react';
import { formatTanggalIndonesia } from '@/utilitas/Tanggal';
import { IDENTITAS_SEKOLAH } from '@/settings';
import {
  ambilFotoProfil,
  simpanFotoProfil,
  hapusFotoProfil,
  kompresFoto,
  gantiPasswordSendiri,
} from '@/layanan/LayananProfil';
import { useAksesibilitasDialog } from '@/utilitas/useAksesibilitasDialog';
import Swal from 'sweetalert2';

interface PropertiKepalaHalaman {
  sesi: SesiTersimpan;
  padaBukaMobile: () => void;
  menuMobileTerbuka: boolean;
  judulHalaman: string;
  padaNavigasi: (menu: string) => void;
}

import { MENU_PENCARIAN_CEPAT as MENU_PENCARIAN } from '@/settings';

export const KepalaHalaman: React.FC<PropertiKepalaHalaman> = ({
  sesi,
  padaBukaMobile,
  menuMobileTerbuka,
  judulHalaman,
  padaNavigasi,
}) => {
  const identifier = sesi.nisn || sesi.username || '';
  const inisial = (sesi.nama || sesi.username || 'U').charAt(0).toUpperCase();

  const [fotoProfil, setFotoProfil] = useState<string | null>(null);
  const [modalBuka, setModalBuka] = useState(false);
  const [tabModal, setTabModal] = useState<'foto' | 'password'>('foto');

  // Form Ganti Password
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [sedangSimpanPassword, setSedangSimpanPassword] = useState(false);
  const [pencarian, setPencarian] = useState('');
  const [cariMobileBuka, setCariMobileBuka] = useState(false);
  const kontainerCariRef = useRef<HTMLDivElement>(null);
  const kontainerProfilRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useAksesibilitasDialog(cariMobileBuka, kontainerCariRef, () => {
    setCariMobileBuka(false);
    setPencarian('');
  });
  useAksesibilitasDialog(modalBuka, kontainerProfilRef, () => setModalBuka(false));

  const labelPeran: Record<string, string> = {
    admin: 'ADMINISTRATOR',
    operator: 'OPERATOR SEKOLAH',
    guru: 'GURU PENGAJAR',
    wali_kelas: 'WALI KELAS',
    siswa: 'SISWA',
    waka: 'WAKIL KEPALA SEKOLAH',
    wakel: 'WAKIL KEPALA SEKOLAH',
  };

  useEffect(() => {
    muatFoto();
    // Sinkronisasi jika foto diubah dari komponen lain
    const handleStorage = () => muatFoto();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('fotoProfilDiubah', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('fotoProfilDiubah', handleStorage);
    };
  }, [identifier]);

  const muatFoto = () => {
    if (identifier) {
      const f = ambilFotoProfil(identifier);
      setFotoProfil(f);
    }
  };

  const tanganiPilihBerkas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const base64 = await kompresFoto(file, 400);
      simpanFotoProfil(identifier, base64);
      setFotoProfil(base64);
      window.dispatchEvent(new Event('fotoProfilDiubah'));
      Swal.fire({
        title: 'Foto Profil Diperbarui',
        text: 'Pas foto profil Anda berhasil disimpan dan diterapkan pada kartu tanda pelajar.',
        icon: 'success',
        timer: 2000,
      });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal memproses foto profil', 'error');
    }
  };

  const tanganiHapusFoto = () => {
    hapusFotoProfil(identifier);
    setFotoProfil(null);
    window.dispatchEvent(new Event('fotoProfilDiubah'));
    Swal.fire('Dihapus', 'Foto profil dikembalikan ke inisial standar.', 'info');
  };

  const tanganiGantiPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordLama || !passwordBaru) {
      Swal.fire('Perhatian', 'Password lama dan password baru wajib diisi.', 'warning');
      return;
    }
    if (passwordBaru.length < 3) {
      Swal.fire('Perhatian', 'Password baru minimal 3 karakter.', 'warning');
      return;
    }
    if (passwordBaru !== konfirmasiPassword) {
      Swal.fire('Perhatian', 'Konfirmasi password baru tidak cocok.', 'warning');
      return;
    }

    setSedangSimpanPassword(true);
    try {
      const res = await gantiPasswordSendiri(sesi.token, passwordLama, passwordBaru);
      setSedangSimpanPassword(false);
      if (res && res.success) {
        Swal.fire('Berhasil!', res.message || 'Password akun berhasil diubah.', 'success');
        setPasswordLama('');
        setPasswordBaru('');
        setKonfirmasiPassword('');
        setModalBuka(false);
      } else {
        Swal.fire('Gagal', res?.message || 'Password lama tidak cocok atau gagal disimpan.', 'error');
      }
    } catch (err: any) {
      setSedangSimpanPassword(false);
      Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
    }
  };

  return (
    <>
      <header className="pasca-login__header h-16 md:h-20 px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
          <button type="button"
            onClick={padaBukaMobile}
            className="md:hidden p-2 rounded-xl text-slate-800  hover:bg-slate-200/70  transition-colors taktil-klik shrink-0"
            title="Buka Menu Navigasi"
            aria-label="Buka menu navigasi"
            aria-controls="navigasi-samping"
            aria-expanded={menuMobileTerbuka}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="header-title truncate text-sm sm:text-base md:text-xl font-black tracking-tight">
              {judulHalaman}
            </h1>
            <p className="header-muted text-xs hidden sm:flex items-center gap-1.5 font-medium mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{formatTanggalIndonesia(new Date())}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0">
          {/* Kotak Pencarian: Hanya tampil penuh di layar lebar (>= 1280px / xl), di bawah itu gunakan tombol ikon agar hemat ruang */}
          <div className="relative hidden xl:block">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500 " />
            <input
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const tujuan = MENU_PENCARIAN.find(([, label]) =>
                    label.toLowerCase().includes(pencarian.toLowerCase().trim())
                  );
                  if (tujuan) {
                    padaNavigasi(tujuan[0]);
                    setPencarian('');
                  }
                }
              }}
              placeholder="Cari Menu..."
              aria-label="Cari Menu"
              className="w-40 xl:w-56 rounded-xl py-2 pl-10 pr-3 text-xs font-bold placeholder:text-slate-400 outline-none transition-all focus:w-64 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 bg-white border border-slate-200     shadow-2xs"
            />
            {pencarian && (
              <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl  ">
                {MENU_PENCARIAN.filter(([, label]) => label.toLowerCase().includes(pencarian.toLowerCase())).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      padaNavigasi(id);
                      setPencarian('');
                    }}
                    className="w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700  "
                  >
                    {label}
                  </button>
                ))}
                {!MENU_PENCARIAN.some(([, label]) => label.toLowerCase().includes(pencarian.toLowerCase())) && (
                  <p className="px-3.5 py-2.5 text-xs font-medium text-slate-500">Menu tidak ditemukan</p>
                )}
              </div>
            )}
          </div>

          {/* Tombol Pencarian Cepat Layar Tablet / HP / Desktop Mode di HP (< 1280px) */}
          <button
            type="button"
            onClick={() => setCariMobileBuka(true)}
            className="xl:hidden p-2 rounded-xl bg-white  border border-slate-200  text-slate-800  hover:bg-indigo-50  transition-all shadow-2xs taktil-klik flex items-center justify-center shrink-0"
            title="Cari Menu"
            aria-label="Buka Pencarian Menu"
            aria-controls="dialog-pencarian"
            aria-expanded={cariMobileBuka}
          >
            <Search className="w-4 h-4 text-indigo-600 " />
          </button>

          {/* Garis Pemisah Visual Layar Lebar */}
          <div className="hidden xl:block h-5 w-px bg-slate-200 " />

          {/* Profil Pengguna & Tombol Buka Modal */}
          <button type="button"
            onClick={() => {
              setModalBuka(true);
              setPasswordLama('');
              setPasswordBaru('');
              setKonfirmasiPassword('');
              setTabModal('foto');
            }}
            className="flex items-center gap-2 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white  hover:bg-slate-50  border border-slate-200/90  transition-all group text-left taktil-klik shadow-2xs shrink-0"
            title="Klik untuk Kelola Profil & Ganti Password"
            aria-label={`Kelola profil akun ${sesi.nama || sesi.username}`}
            aria-controls="dialog-profil"
            aria-expanded={modalBuka}
          >
            <div className="text-right hidden xl:block min-w-0 max-w-[130px]">
              <p className="text-xs font-black text-slate-900  leading-tight mb-0.5 group-hover:text-indigo-600  transition truncate">
                {sesi.nama || sesi.username}
              </p>
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50  text-indigo-700  ring-1 ring-indigo-500/20 truncate inline-block">
                {labelPeran[sesi.role] || sesi.role}
              </span>
            </div>

            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-xs ring-2 ring-indigo-500/30 group-hover:ring-indigo-600 transition shrink-0 bg-indigo-600 flex items-center justify-center text-white font-black text-xs sm:text-sm">
              {fotoProfil ? (
                <img
                  src={fotoProfil}
                  alt={sesi.nama || sesi.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{inisial}</span>
              )}
            </div>
          </button>
        </div>
      </header>

      {/* MODAL PENCARIAN MENU DI HP / SMARTPHONE */}
      {cariMobileBuka && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            id="dialog-pencarian"
            ref={kontainerCariRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-pencarian-title"
            tabIndex={-1}
            className="bg-white  rounded-3xl border-2 border-slate-300  shadow-2xl p-4 max-w-lg mx-auto w-full mt-2"
          >
            <h2 id="dialog-pencarian-title" className="sr-only">Pencarian menu</h2>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={pencarian}
                  onChange={(e) => setPencarian(e.target.value)}
                  placeholder="Ketik nama menu yang dicari..."
                  aria-label="Cari menu"
                  data-dialog-initial-focus
                  className="w-full pl-10 pr-4 py-3 bg-slate-100  border-2 border-slate-300  rounded-2xl text-sm font-black text-slate-900  outline-none focus:border-indigo-600"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setCariMobileBuka(false);
                  setPencarian('');
                }}
                className="p-3 rounded-2xl bg-slate-100  text-slate-700  border-2 border-slate-300  font-black text-xs taktil-klik"
                title="Tutup Pencarian"
                aria-label="Tutup pencarian menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400  px-2 py-1">
                Pilih Menu Cepat
              </p>
              {MENU_PENCARIAN.filter(([, label]) =>
                !pencarian.trim() || label.toLowerCase().includes(pencarian.toLowerCase().trim())
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    padaNavigasi(id);
                    setPencarian('');
                    setCariMobileBuka(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left text-xs font-black text-slate-900  hover:bg-indigo-50  hover:text-indigo-700 transition taktil-klik"
                >
                  <span>{label}</span>
                  <span className="text-[11px] text-indigo-600  font-bold">Buka &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGATURAN PROFIL & AKUN */}
      {modalBuka && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            id="dialog-profil"
            ref={kontainerProfilRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-profil-title"
            tabIndex={-1}
            className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header Modal */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-white/10 text-white">
                  <User className="w-5 h-5" />
                </span>
                <div>
                  <h3 id="dialog-profil-title" className="font-black text-base">Profil &amp; Keamanan Akun</h3>
                  <p className="text-xs text-indigo-200 font-medium">{IDENTITAS_SEKOLAH.nama}</p>
                </div>
              </div>
              <button type="button"
                onClick={() => setModalBuka(false)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
                aria-label="Tutup pengaturan profil"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigasi Modal */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
              <button type="button"
                onClick={() => setTabModal('foto')}
                aria-pressed={tabModal === 'foto'}
                className={`pb-2.5 px-3 text-xs font-black transition border-b-2 flex items-center gap-1.5 ${
                  tabModal === 'foto'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Foto Profil</span>
              </button>
              {sesi.role !== 'siswa' && (
                <button                 type="button"
                onClick={() => setTabModal('password')}
                aria-pressed={tabModal === 'password'}
                  className={`pb-2.5 px-3 text-xs font-black transition border-b-2 flex items-center gap-1.5 ${
                    tabModal === 'password'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Ganti Password</span>
                </button>
              )}
            </div>

            {/* Konten Tab Foto Profil */}
            {tabModal === 'foto' && (
              <div className="p-6 text-center space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={tanganiPilihBerkas}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                <div className="relative inline-block mx-auto">
                  <div className="w-28 h-36 rounded-2xl overflow-hidden border-2 border-indigo-600 shadow-md bg-slate-100 flex items-center justify-center">
                    {fotoProfil ? (
                      <img
                        src={fotoProfil}
                        alt="Preview Foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <User className="w-12 h-12 mb-1" />
                        <span className="text-[10px] font-bold">Belum Ada Foto</span>
                      </div>
                    )}
                  </div>
                  <button type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition tombol-taktil"
                    title="Upload Foto Baru"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h4 className="font-black text-slate-900 text-base">{sesi.nama || sesi.username}</h4>
                  <p className="text-xs text-indigo-700 font-bold uppercase tracking-wider mt-0.5">
                    {labelPeran[sesi.role] || sesi.role} {sesi.kelas ? `• ${sesi.kelas}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Foto profil ini otomatis tampil di kartu tanda pelajar resmi dan sistem presensi.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm tombol-taktil"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Unggah Pas Foto (3x4)</span>
                  </button>
                  {fotoProfil && (
                    <button
                      type="button"
                      onClick={tanganiHapusFoto}
                      className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition tombol-taktil"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Konten Tab Ganti Password */}
            {tabModal === 'password' && (
              <form onSubmit={tanganiGantiPassword} className="p-6 space-y-4">
                <div>
                  <label htmlFor="field-kepalahalaman-483" className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Password Lama
                  </label>
                  <input id="field-kepalahalaman-483"
                    type="password"
                    value={passwordLama}
                    onChange={(e) => setPasswordLama(e.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="Masukkan password akun saat ini"
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label htmlFor="field-kepalahalaman-498" className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Password Baru
                  </label>
                  <input id="field-kepalahalaman-498"
                    type="password"
                    value={passwordBaru}
                    onChange={(e) => setPasswordBaru(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={3}
                    placeholder="Minimal 3 karakter"
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label htmlFor="field-kepalahalaman-514" className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <input id="field-kepalahalaman-514"
                    type="password"
                    value={konfirmasiPassword}
                    onChange={(e) => setKonfirmasiPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    placeholder="Ulangi password baru"
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalBuka(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={sedangSimpanPassword}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 tombol-taktil"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{sedangSimpanPassword ? 'Menyimpan...' : 'Simpan Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
