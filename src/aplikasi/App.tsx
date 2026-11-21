import React, { useState, useEffect, Suspense, lazy } from 'react';
import type { SesiTersimpan, HasilLogin, PeranPengguna } from '@/tipe/Pengguna';
import { ambilSesiAktif, lakukanLogout, simpanSesi } from '@/layanan/Autentikasi';
import { HalamanLogin } from '@/halaman/Login';
import { NavigasiSamping } from '@/komponen/tata-letak/NavigasiSamping';
import { KepalaHalaman } from '@/komponen/tata-letak/KepalaHalaman';
import { Pemuat } from '@/komponen/umum/Pemuat';
import { SkeletonHalaman } from '@/komponen/umum/SkeletonLoader';
import { AKSES_MENU, JUDUL_MENU } from '@/settings';

// Dynamic Code Splitting untuk optimalisasi performa dan waktu render awal
const HalamanDashboard = lazy(() => import('@/halaman/Dashboard').then(m => ({ default: m.HalamanDashboard })));
const HalamanDataSiswa = lazy(() => import('@/halaman/DataSiswa').then(m => ({ default: m.HalamanDataSiswa })));
const HalamanDaftarHadirGuru = lazy(() => import('@/halaman/DaftarHadirGuru').then(m => ({ default: m.HalamanDaftarHadirGuru })));
const HalamanScannerPresensi = lazy(() => import('@/halaman/ScannerPresensi').then(m => ({ default: m.HalamanScannerPresensi })));
const HalamanMonitoringLive = lazy(() => import('@/halaman/MonitoringLive').then(m => ({ default: m.HalamanMonitoringLive })));
const HalamanRekapBulanan = lazy(() => import('@/halaman/RekapBulanan').then(m => ({ default: m.HalamanRekapBulanan })));
const HalamanKenaikanKelas = lazy(() => import('@/halaman/KenaikanKelas').then(m => ({ default: m.HalamanKenaikanKelas })));
const HalamanAbsensiSholat = lazy(() => import('@/halaman/AbsensiSholat').then(m => ({ default: m.HalamanAbsensiSholat })));
const HalamanDataGuru = lazy(() => import('@/halaman/DataGuru').then(m => ({ default: m.HalamanDataGuru })));
const HalamanManajemenKelas = lazy(() => import('@/halaman/ManajemenKelas').then(m => ({ default: m.HalamanManajemenKelas })));
const HalamanKelolaAbsen = lazy(() => import('@/halaman/KelolaAbsen').then(m => ({ default: m.HalamanKelolaAbsen })));
const HalamanPengaturan = lazy(() => import('@/halaman/Pengaturan').then(m => ({ default: m.HalamanPengaturan })));
const HalamanPengajuanKehadiran = lazy(() => import('@/halaman/PengajuanKehadiran').then(m => ({ default: m.HalamanPengajuanKehadiran })));
const HalamanDaftarAkun = lazy(() => import('@/halaman/DaftarAkun').then(m => ({ default: m.HalamanDaftarAkun })));

const PemuatHalaman: React.FC = () => <SkeletonHalaman />;

export const App: React.FC = () => {
  const [sesi, setSesi] = useState<SesiTersimpan | null>(null);
  const [tampilDaftar, setTampilDaftar] = useState<boolean>(false);
  const [menuAktif, setMenuAktif] = useState<string>('dashboard');
  const [terbukaMobile, setTerbukaMobile] = useState<boolean>(false);
  const [sedangMemuat, setSedangMemuat] = useState<boolean>(false);
  const [sudahInisialisasi, setSudahInisialisasi] = useState<boolean>(false);
  const [skalaFont, setSkalaFont] = useState<'normal' | 'besar' | 'ekstra'>('normal');

  useEffect(() => {
    try {
      localStorage.removeItem('absensiCookieConsent');
    } catch (error) {
      console.warn('Pilihan persetujuan lama tidak dapat dibersihkan:', error);
    }

    try {
      const tersimpanFont = localStorage.getItem('skalaFontApp') as 'normal' | 'besar' | 'ekstra';
      if (tersimpanFont && ['normal', 'besar', 'ekstra'].includes(tersimpanFont)) {
        setSkalaFont(tersimpanFont);
      }
    } catch (error) {
      console.warn('Preferensi tidak dapat dibaca:', error);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('skala-normal', 'skala-besar', 'skala-ekstra');
    document.documentElement.classList.add(`skala-${skalaFont}`);
  }, [skalaFont]);

  const ubahSkalaFont = (baru: 'normal' | 'besar' | 'ekstra') => {
    setSkalaFont(baru);
    try {
      localStorage.setItem('skalaFontApp', baru);
      document.documentElement.classList.remove('skala-normal', 'skala-besar', 'skala-ekstra');
      document.documentElement.classList.add(`skala-${baru}`);
    } catch (error) {
      console.warn('Preferensi ukuran font tidak dapat disimpan:', error);
    }
  };

  const ambilMenuAwal = (peran?: string): string => {
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#\/?/, '').trim() : '';
      if (hash && peran && AKSES_MENU[hash]?.includes(peran as PeranPengguna)) {
        return hash;
      }
      const tersimpan = typeof localStorage !== 'undefined'
        ? (localStorage.getItem('menuAktifApp') || sessionStorage.getItem('menuAktifApp'))
        : null;
      if (tersimpan && peran && AKSES_MENU[tersimpan]?.includes(peran as PeranPengguna)) {
        return tersimpan;
      }
    } catch (_) {}
    return 'dashboard';
  };

  useEffect(() => {
    const s = ambilSesiAktif();
    if (s) {
      setSesi(s);
      const menuAwal = ambilMenuAwal(s.role);
      setMenuAktif(menuAwal);
      try {
        if (window.location.hash !== `#/${menuAwal}`) {
          window.history.replaceState(null, '', `#/${menuAwal}`);
        }
      } catch (_) {}
    }
    setSudahInisialisasi(true);
  }, []);

  useEffect(() => {
    const sinkronSesiAntarTab = (e: StorageEvent) => {
      if (e.key === 'absensiAppSession') {
        const s = ambilSesiAktif();
        setSesi(s);
        if (!s) {
          setMenuAktif('dashboard');
        } else {
          const menuAwal = ambilMenuAwal(s.role);
          setMenuAktif(menuAwal);
        }
      }
    };
    window.addEventListener('storage', sinkronSesiAntarTab);
    return () => window.removeEventListener('storage', sinkronSesiAntarTab);
  }, []);

  useEffect(() => {
    const tanganiHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (sesi && hash && AKSES_MENU[hash]?.includes(sesi.role)) {
        setMenuAktif(hash);
        try {
          localStorage.setItem('menuAktifApp', hash);
        } catch (_) {}
      }
    };
    window.addEventListener('hashchange', tanganiHash);
    return () => window.removeEventListener('hashchange', tanganiHash);
  }, [sesi]);

  const tanganiLoginSukses = (hasil: HasilLogin) => {
    if (hasil.token && hasil.role) {
      const sBaru: SesiTersimpan = {
        success: true,
        token: hasil.token,
        role: hasil.role,
        username: hasil.username || '',
        nama: hasil.nama || hasil.username || '',
        kelas: hasil.kelas || '',
        nisn: hasil.nisn || null,
        loginAt: Date.now(),
      };
      simpanSesi(sBaru, true);
      setSesi(sBaru);
      const menuAwal = ambilMenuAwal(hasil.role);
      setMenuAktif(menuAwal);
      try {
        window.history.replaceState(null, '', `#/${menuAwal}`);
      } catch (_) {}
    }
  };

  const tanganiLogout = () => {
    lakukanLogout();
    setSesi(null);
    setTampilDaftar(false);
    setMenuAktif('dashboard');
    try {
      localStorage.removeItem('menuAktifApp');
      sessionStorage.removeItem('menuAktifApp');
      window.history.replaceState(null, '', window.location.pathname);
    } catch (_) {}
  };

  const ubahMenuAman = (menu: string) => {
    if (!sesi || !AKSES_MENU[menu]?.includes(sesi.role)) {
      setMenuAktif('dashboard');
      try {
        localStorage.setItem('menuAktifApp', 'dashboard');
        window.history.replaceState(null, '', '#/dashboard');
      } catch (_) {}
      return;
    }
    setMenuAktif(menu);
    try {
      localStorage.setItem('menuAktifApp', menu);
      sessionStorage.setItem('menuAktifApp', menu);
      window.history.replaceState(null, '', `#/${menu}`);
    } catch (_) {}
  };

  if (!sudahInisialisasi) {
    return null;
  }

  // Jika belum login, tampilkan halaman Login atau Daftar
  if (!sesi) {
    if (tampilDaftar) {
      return (
        <Suspense fallback={<Pemuat terbuka={true} />}>
          <HalamanDaftarAkun
            padaDaftarSukses={() => setTampilDaftar(false)}
            padaBatal={() => setTampilDaftar(false)}
          />
        </Suspense>
      );
    }
    return (
      <HalamanLogin
        padaLoginSukses={tanganiLoginSukses}
        setMemuat={setSedangMemuat}
        padaNavigasiDaftar={() => setTampilDaftar(true)}
      />
    );
  }

  return (
    <div className={`pasca-login flex h-[100dvh] min-h-screen overflow-hidden font-sans skala-${skalaFont}`}>
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-indigo-700 focus:shadow-lg"
      >
        Lewati ke konten utama
      </a>
      {/* Sidebar */}
      <NavigasiSamping
        menuAktif={menuAktif}
        setMenuAktif={ubahMenuAman}
        peran={sesi.role}
        terbukaMobile={terbukaMobile}
        setTerbukaMobile={setTerbukaMobile}
        padaLogout={tanganiLogout}
        skalaFont={skalaFont}
        setSkalaFont={ubahSkalaFont}
      />

      {/* Main Content Area */}
      <div className="pasca-login__main flex-1 flex flex-col min-w-0 md:pl-64 overflow-hidden">
        {/* Top Navbar */}
        <KepalaHalaman
          sesi={sesi}
          padaBukaMobile={() => setTerbukaMobile(true)}
          menuMobileTerbuka={terbukaMobile}
          judulHalaman={JUDUL_MENU[menuAktif] || 'Dashboard'}
          padaNavigasi={ubahMenuAman}
        />

        {/* Scrollable View Container */}
        <main
          id="konten-utama"
          tabIndex={-1}
          className="pasca-login__content flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 md:p-8 pb-12 sm:pb-14 md:pb-16"
        >
          <Suspense fallback={<PemuatHalaman />}>
            {menuAktif === 'dashboard' && (
              <HalamanDashboard
                sesi={sesi}
                setMenuAktif={ubahMenuAman}
                setMemuat={setSedangMemuat}
              />
            )}

            {menuAktif === 'siswa' && (
              <HalamanDataSiswa sesi={sesi} setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'guru' && (
              <HalamanDataGuru sesi={sesi} setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'kelas' && (
              <HalamanManajemenKelas sesi={sesi} setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'kelola-absen' && (
              <HalamanKelolaAbsen sesi={sesi} setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'daftar-hadir' && (
              <HalamanDaftarHadirGuru sesi={sesi} setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'scanner' && (
              <HalamanScannerPresensi setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'monitoring' && (
              <HalamanMonitoringLive setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'rekap' && (
              <HalamanRekapBulanan sesi={sesi} setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'kenaikan-kelas' && (
              <HalamanKenaikanKelas sesi={sesi} setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'sholat' && (
              <HalamanAbsensiSholat sesi={sesi} setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'pengaturan' && (
              <HalamanPengaturan sesi={sesi} setMemuat={setSedangMemuat} />
            )}

            {menuAktif === 'pengajuan' && (
              <HalamanPengajuanKehadiran sesi={sesi} setMemuat={setSedangMemuat} />
            )}
          </Suspense>
        </main>
      </div>

      {/* Loading Overlay */}
      <Pemuat terbuka={sedangMemuat} />
    </div>
  );
};

export default App;
