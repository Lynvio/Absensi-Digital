import React from 'react';
import { Users, UserCheck, AlertCircle, Clock, UserX } from 'lucide-react';

interface PropertiKartuStatistik {
  total: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  belum?: number;
}

export const KartuStatistik: React.FC<PropertiKartuStatistik> = ({
  total,
  hadir,
  sakit,
  izin,
  alpa,
}) => {
  const hitungPersen = (val: number): string => {
    if (!total || total <= 0) return '0%';
    return `${Math.round((val / total) * 100)}%`;
  };

  const kartu = [
    {
      label: 'Total Siswa',
      nilai: total,
      persen: null,
      icon: Users,
      warnaBg: 'bg-white ',
      warnaTeks: 'text-indigo-950 ',
      warnaLabel: 'text-slate-700 ',
      barColor: 'bg-indigo-600',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      border: 'border border-indigo-200/90  ring-1 ring-indigo-500/10',
      iconWarna: 'text-indigo-600 bg-indigo-50   ring-1 ring-indigo-200/60 ',
    },
    {
      label: 'Siswa Hadir',
      nilai: hadir,
      persen: hitungPersen(hadir),
      icon: UserCheck,
      warnaBg: 'bg-white ',
      warnaTeks: 'text-emerald-950 ',
      warnaLabel: 'text-slate-700 ',
      barColor: 'bg-emerald-500',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      border: 'border border-emerald-200/90  ring-1 ring-emerald-500/10',
      iconWarna: 'text-emerald-600 bg-emerald-50   ring-1 ring-emerald-200/60 ',
    },
    {
      label: 'Sakit',
      nilai: sakit,
      persen: hitungPersen(sakit),
      icon: AlertCircle,
      warnaBg: 'bg-white ',
      warnaTeks: 'text-amber-950 ',
      warnaLabel: 'text-slate-700 ',
      barColor: 'bg-amber-500',
      badgeColor: 'bg-amber-100 text-amber-800',
      border: 'border border-amber-200/90  ring-1 ring-amber-500/10',
      iconWarna: 'text-amber-600 bg-amber-50   ring-1 ring-amber-200/60 ',
    },
    {
      label: 'Izin',
      nilai: izin,
      persen: hitungPersen(izin),
      icon: Clock,
      warnaBg: 'bg-white ',
      warnaTeks: 'text-sky-950 ',
      warnaLabel: 'text-slate-700 ',
      barColor: 'bg-sky-500',
      badgeColor: 'bg-sky-100 text-sky-800',
      border: 'border border-sky-200/90  ring-1 ring-sky-500/10',
      iconWarna: 'text-sky-600 bg-sky-50   ring-1 ring-sky-200/60 ',
    },
    {
      label: 'Alpa (Tanpa Ket)',
      nilai: alpa,
      persen: hitungPersen(alpa),
      icon: UserX,
      warnaBg: 'bg-white ',
      warnaTeks: 'text-rose-950 ',
      warnaLabel: 'text-slate-700 ',
      barColor: 'bg-rose-500',
      badgeColor: 'bg-rose-100 text-rose-800',
      border: 'border border-rose-200/90  ring-1 ring-rose-500/10',
      iconWarna: 'text-rose-600 bg-rose-50   ring-1 ring-rose-200/60 ',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {kartu.map((item, indeks) => {
        const Icon = item.icon;
        const rasio = total > 0 ? Math.min(100, Math.round((item.nilai / total) * 100)) : 0;
        return (
          <div
            key={item.label}
            className={`animasi-naik hover-lift taktil-klik p-4 md:p-5 rounded-2xl ${item.border} ${item.warnaBg} shadow-sm transition-all duration-200 flex flex-col justify-between`}
            style={{ animationDelay: `${indeks * 50}ms` }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs md:text-sm font-black tracking-tight ${item.warnaLabel}`}>{item.label}</span>
                <div className={`p-2.5 rounded-xl shadow-xs shrink-0 ${item.iconWarna}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight ${item.warnaTeks}`}>
                  {item.nilai}
                </p>
                {item.persen && (
                  <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${item.badgeColor}`}>
                    {item.persen}
                  </span>
                )}
              </div>
            </div>

            {/* Mini Progress Indicator Bar */}
            {item.persen && (
              <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${item.barColor}`}
                  style={{ width: `${rasio}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
