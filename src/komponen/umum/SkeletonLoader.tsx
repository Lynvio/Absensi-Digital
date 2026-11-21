import React from 'react';

/**
 * Komponen Skeleton Shimmer Loading modern, elegan, dan non-blocking.
 * Memberikan feedback visual yang halus tanpa mengunci layar pengguna dengan modal gelap.
 */

export const SkeletonBarisTabel: React.FC<{ kolom?: number }> = ({ kolom = 5 }) => (
  <tr className="animate-pulse border-b border-slate-100 ">
    {Array.from({ length: kolom }).map((_, idx) => (
      <td key={idx} className="p-4">
        <div
          className="h-4 bg-slate-200/80  rounded-md shimmer-skeleton"
          style={{ width: idx === 0 ? '24px' : idx === 1 ? '75%' : '60%' }}
        />
      </td>
    ))}
  </tr>
);

export const SkeletonTabel: React.FC<{ baris?: number; kolom?: number }> = ({ baris = 5, kolom = 5 }) => (
  <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80  bg-white  p-2">
    <table className="w-full">
      <tbody>
        {Array.from({ length: baris }).map((_, i) => (
          <SkeletonBarisTabel key={i} kolom={kolom} />
        ))}
      </tbody>
    </table>
  </div>
);

export const SkeletonKartu: React.FC = () => (
  <div className="p-5 rounded-2xl border border-slate-200/80  bg-white  space-y-3 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="w-24 h-4 bg-slate-200/80  rounded-md shimmer-skeleton" />
      <div className="w-8 h-8 bg-slate-200/80  rounded-xl shimmer-skeleton" />
    </div>
    <div className="w-16 h-7 bg-slate-200/80  rounded-lg shimmer-skeleton" />
    <div className="w-32 h-3 bg-slate-200/80  rounded-md shimmer-skeleton" />
  </div>
);

export const SkeletonHalaman: React.FC = () => (
  <div className="space-y-6 animate-fade-in max-w-7xl mx-auto p-2">
    {/* Header Skeleton */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl border border-slate-200/80  bg-white  animate-pulse">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100  shimmer-skeleton" />
          <div className="w-48 h-6 bg-slate-200  rounded-md shimmer-skeleton" />
        </div>
        <div className="w-64 h-3.5 bg-slate-100  rounded-md shimmer-skeleton" />
      </div>
      <div className="flex gap-2">
        <div className="w-28 h-9 bg-slate-200/80  rounded-xl shimmer-skeleton" />
        <div className="w-28 h-9 bg-indigo-200/80  rounded-xl shimmer-skeleton" />
      </div>
    </div>

    {/* Grid Kartu Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SkeletonKartu />
      <SkeletonKartu />
      <SkeletonKartu />
      <SkeletonKartu />
    </div>

    {/* Tabel Skeleton */}
    <SkeletonTabel baris={6} kolom={5} />
  </div>
);
