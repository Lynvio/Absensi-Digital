import React from 'react';
import type { PeranPengguna } from '@/tipe/Pengguna';
import {
  LogOut,
  X,
  Type,
} from 'lucide-react';
import { IDENTITAS_SEKOLAH, TAMPILAN_TEMA, DAFTAR_MENU_SISTEM } from '@/settings';
import { useAksesibilitasDialog } from '@/utilitas/useAksesibilitasDialog';

interface PropertiNavigasiSamping {
  menuAktif: string;
  setMenuAktif: (menu: string) => void;
  peran: PeranPengguna;
  terbukaMobile: boolean;
  setTerbukaMobile: (terbuka: boolean) => void;
  padaLogout: () => void;
  skalaFont?: 'normal' | 'besar' | 'ekstra';
  setSkalaFont?: (skala: 'normal' | 'besar' | 'ekstra') => void;
}

export const NavigasiSamping: React.FC<PropertiNavigasiSamping> = ({
  menuAktif,
  setMenuAktif,
  peran,
  terbukaMobile,
  setTerbukaMobile,
  padaLogout,
  skalaFont,
  setSkalaFont,
}) => {
  const menuTersedia = DAFTAR_MENU_SISTEM.filter((m) => m.roles.includes(peran));
  const navigasiRef = React.useRef<HTMLElement>(null);

  useAksesibilitasDialog(terbukaMobile, navigasiRef, () => setTerbukaMobile(false));

  return (
    <>
      {/* Overlay Backdrop untuk Mobile */}
      {terbukaMobile && (
        <div
          onClick={() => setTerbukaMobile(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="navigasi-samping"
        ref={navigasiRef}
        role={terbukaMobile ? 'dialog' : undefined}
        aria-modal={terbukaMobile || undefined}
        aria-label="Navigasi utama"
        tabIndex={terbukaMobile ? -1 : undefined}
        className={`pasca-login__sidebar fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] flex flex-col h-full transition-transform duration-300 ease-in-out md:translate-x-0 ${
          terbukaMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Logo */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center p-1 shadow-xs ring-1 ring-slate-200/80">
              <img
                src={IDENTITAS_SEKOLAH.logo}
                alt={IDENTITAS_SEKOLAH.nama}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-[0.14em] text-slate-900">E-ABSENSI</h2>
              <p className="text-xs text-indigo-600 font-bold">{IDENTITAS_SEKOLAH.nama}</p>
            </div>
          </div>
          <button type="button"
            onClick={() => setTerbukaMobile(false)}
            className="md:hidden text-slate-500 hover:text-slate-800 p-2 rounded-lg"
            aria-label="Tutup menu navigasi"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu List */}
        <nav aria-label="Menu utama" className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1.5">
          <p className="sidebar-section-title text-xs font-bold uppercase tracking-wider px-3 mb-2 text-slate-500">
            Menu Utama
          </p>
          {menuTersedia.map((item) => {
              const Icon = item.icon;
              const aktif = menuAktif === item.id;
              return (
                <button type="button"
                  key={item.id}
                  onClick={() => {
                    setMenuAktif(item.id);
                    setTerbukaMobile(false);
                  }}
                  aria-current={aktif ? 'page' : undefined}
                  className={`w-full min-w-0 flex items-center gap-3.5 px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-black transition-all hover-lift taktil-klik group ${
                    aktif
                      ? 'sidebar-item-active bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'sidebar-item-idle text-slate-700 hover:bg-[#f2f4f7] hover:text-indigo-600'
                  }`}
                >
                  <Icon className={`sidebar-icon w-5 h-5 shrink-0 transition-colors ${aktif ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'}`} />
                  <span className="min-w-0 truncate">{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* Footer: Font Scaler (Terutama untuk HP) & Tombol Logout */}
        <div className="p-3.5 border-t border-slate-100 space-y-2.5 shrink-0">
          {setSkalaFont && skalaFont && (
            <div className="flex items-center justify-between bg-[#f2f4f7] p-1.5 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pl-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ukuran Teks:</span>
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSkalaFont('normal')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    skalaFont === 'normal'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-indigo-600'
                  }`}
                  title="Ukuran Font Standar"
                  aria-label="Gunakan ukuran teks standar"
                  aria-pressed={skalaFont === 'normal'}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setSkalaFont('besar')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    skalaFont === 'besar'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-indigo-600'
                  }`}
                  title="Ukuran Font Besar"
                  aria-label="Gunakan ukuran teks besar"
                  aria-pressed={skalaFont === 'besar'}
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => setSkalaFont('ekstra')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    skalaFont === 'ekstra'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-indigo-600'
                  }`}
                  title="Ukuran Font Ekstra Besar"
                  aria-label="Gunakan ukuran teks ekstra besar"
                  aria-pressed={skalaFont === 'ekstra'}
                >
                  A++
                </button>
              </div>
            </div>
          )}

          <button type="button"
            onClick={padaLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold text-rose-700 hover:text-white bg-rose-50/70 hover:bg-rose-600 transition-all border border-rose-200/80 shadow-2xs taktil-klik"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
          <p className="text-xs text-center text-slate-400 font-medium">
            {TAMPILAN_TEMA.hakCipta}
          </p>
        </div>
      </aside>
    </>
  );
};
