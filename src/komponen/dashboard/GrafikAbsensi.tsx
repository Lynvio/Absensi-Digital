import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface PropertiGrafikAbsensi {
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  belum: number;
  total?: number;
}

export const GrafikAbsensi: React.FC<PropertiGrafikAbsensi> = ({
  hadir,
  sakit,
  izin,
  alpa,
  belum,
  total,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const nilai = [hadir, sakit, izin, alpa, belum].map((item) =>
    Number.isFinite(Number(item)) ? Math.max(0, Number(item)) : 0
  );
  const adaData = (total ?? nilai.reduce((jumlah, item) => jumlah + item, 0)) > 0;

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const gridColor = '#e2e8f0';
    const tickYColor = '#0f172a';
    const tickXColor = '#0f172a';

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Absen'],
        datasets: [
          {
            label: 'Jumlah Siswa',
            data: nilai,
            backgroundColor: [
              '#10b981',
              '#f59e0b',
              '#3b82f6',
              '#ef4444',
              '#64748b',
            ],
            borderColor: [
              '#059669',
              '#d97706',
              '#2563eb',
              '#dc2626',
              '#475569',
            ],
            borderWidth: 2,
            borderRadius: 10,
            barPercentage: 0.55,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: tickYColor,
              font: { size: 13, weight: 'bold' },
            },
            grid: { color: gridColor },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: tickXColor,
              font: { size: 13, weight: 'bold' },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [hadir, sakit, izin, alpa, belum]);

  return (
    <div className="kartu-modern animasi-masuk p-5 md:p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div>
          <h3 className="text-base md:text-lg font-black text-slate-900  flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block shadow-xs animasi-denyut-halus"></span>
            <span>Grafik Ringkasan Kehadiran Hari Ini</span>
          </h3>
          <p className="text-xs text-slate-500  font-medium mt-0.5">
            Visualisasi perbandingan status presensi terkini seluruh siswa
          </p>
        </div>

        {/* Legend Chips */}
        <div className="flex flex-wrap gap-1.5 text-xs font-black">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50  text-emerald-800  border border-emerald-300  shadow-xs">
            Hadir: {hadir}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50  text-amber-800  border border-amber-300  shadow-xs">
            Sakit: {sakit}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50  text-blue-800  border border-blue-300  shadow-xs">
            Izin: {izin}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-50  text-rose-800  border border-rose-300  shadow-xs">
            Alpa: {alpa}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100  text-slate-700  border border-slate-300  shadow-xs">
            Belum: {belum}
          </span>
        </div>
      </div>

      {adaData ? (
        <div className="h-64 sm:h-72 w-full min-h-[16rem]">
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
      ) : (
        <div className="min-h-[16rem] flex items-center justify-center rounded-2xl border border-dashed border-slate-300  bg-slate-50/60  px-6 text-center">
          <div>
            <p className="text-sm font-black text-slate-700 ">Belum ada data presensi</p>
            <p className="text-xs text-slate-500  mt-1">Grafik akan tampil setelah data siswa dan presensi tersedia.</p>
          </div>
        </div>
      )}
    </div>
  );
};
