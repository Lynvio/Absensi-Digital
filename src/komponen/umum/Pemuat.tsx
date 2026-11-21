import React from 'react';

interface PropertiPemuat {
  terbuka: boolean;
  pesan?: string;
}

/**
 * Top Slim Progress Bar modern kelas dunia (setara YouTube / GitHub / Vercel).
 * Memberikan indikasi pemrosesan server di puncak halaman secara halus,
 * tanpa menutupi konten ataupun mengunci layar pengguna dengan modal/balok skeleton mengambang.
 */
export const Pemuat: React.FC<PropertiPemuat> = ({ terbuka }) => {
  if (!terbuka) return null;

  return (
    <div
      role="progressbar"
      aria-label="Sedang memuat data..."
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent overflow-hidden pointer-events-none"
    >
      <div className="h-full w-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-600 animate-geser-progress shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
    </div>
  );
};
