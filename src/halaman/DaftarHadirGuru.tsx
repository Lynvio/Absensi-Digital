import React, { useState, useEffect } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import type { DataSiswa } from '@/tipe/Siswa';
import type { ItemDaftarHadirGuru, ItemPulangGuru } from '@/tipe/Absensi';
import {
  ambilSiswaPerKelas,
  ambilDaftarKelas,
} from '@/layanan/LayananSiswa';
import {
  ambilStatusDaftarHadir,
  ambilDetailDaftarHadir,
  simpanDaftarHadirGuru,
  simpanPulangGuru,
} from '@/layanan/LayananAbsensi';
import { dapatkanTanggalHariIni } from '@/utilitas/Tanggal';
import { CalendarCheck, CheckSquare, Send, Lock } from 'lucide-react';
import Swal from 'sweetalert2';
import { SkeletonBarisTabel } from '@/komponen/umum/SkeletonLoader';
import { IDENTITAS_SEKOLAH } from '@/settings';

interface PropertiHalamanDaftarHadir {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

export const HalamanDaftarHadirGuru: React.FC<PropertiHalamanDaftarHadir> = ({
  sesi,
  setMemuat,
}) => {
  const [mode, setMode] = useState<'masuk' | 'pulang'>('masuk');
  const [tanggal, setTanggal] = useState<string>(dapatkanTanggalHariIni());
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [kelasTerpilih, setKelasTerpilih] = useState<string>('');
  const [daftarSiswa, setDaftarSiswa] = useState<DataSiswa[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [lockedMap, setLockedMap] = useState<Record<string, any>>({});
  const [pulangMap, setPulangMap] = useState<Record<string, any>>({});
  const [sedangMuatData, setSedangMuatData] = useState<boolean>(false);

  useEffect(() => {
    muatKelas();
  }, []);

  useEffect(() => {
    if (kelasTerpilih) {
      muatDataPresensi();
    }
  }, [kelasTerpilih, tanggal, mode]);

  const muatKelas = async () => {
    try {
      if (sesi.role === 'admin') {
        const k = await ambilDaftarKelas();
        setDaftarKelas(k);
        if (k.length > 0) setKelasTerpilih(k[0]);
      } else if (sesi.kelas) {
        const k = sesi.kelas.split(',').map((x) => x.trim()).filter(Boolean);
        setDaftarKelas(k);
        if (k.length > 0) setKelasTerpilih(k[0]);
      }
    } catch (error) {
      console.error('Gagal memuat kelas presensi:', error);
      Swal.fire('Gagal', 'Daftar kelas tidak dapat dimuat.', 'error');
    }
  };

  const muatDataPresensi = async () => {
    if (!kelasTerpilih) return;
    setSedangMuatData(true);
    setMemuat(true);
    try {
      const siswa = await ambilSiswaPerKelas(kelasTerpilih);
      setDaftarSiswa(siswa);

      if (mode === 'masuk') {
        const statusRes = await ambilStatusDaftarHadir(kelasTerpilih, tanggal);
        if (statusRes && statusRes.success && statusRes.data) {
          setLockedMap(statusRes.data);
        } else {
          setLockedMap({});
        }
        setStatusMap({});
      } else {
        const detailRes = await ambilDetailDaftarHadir(kelasTerpilih, tanggal);
        if (detailRes && detailRes.success && detailRes.data) {
          const pMap: Record<string, any> = {};
          Object.entries(detailRes.data).forEach(([nisn, d]: [string, any]) => {
            pMap[nisn] = { ...d, checked: false };
          });
          setPulangMap(pMap);
        } else {
          setPulangMap({});
        }
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal memuat daftar siswa', 'error');
    } finally {
      setSedangMuatData(false);
      setMemuat(false);
    }
  };

  const setStatus = (nisn: string, st: string) => {
    setStatusMap((prev) => {
      const copy = { ...prev };
      if (copy[nisn] === st) {
        delete copy[nisn];
      } else {
        copy[nisn] = st;
      }
      return copy;
    });
  };

  const tandaiSemuaHadir = () => {
    if (mode === 'masuk') {
      const baru: Record<string, string> = { ...statusMap };
      daftarSiswa.forEach((s) => {
        if (!lockedMap[s.nisn]) {
          baru[s.nisn] = 'hadir';
        }
      });
      setStatusMap(baru);
    } else {
      const copy = { ...pulangMap };
      Object.keys(copy).forEach((k) => {
        if (copy[k].status === 'hadir' && !copy[k].jamPulang) {
          copy[k].checked = true;
        }
      });
      setPulangMap(copy);
    }
  };

  const tanganiSubmit = async () => {
    if (mode === 'masuk') {
      const dataList: ItemDaftarHadirGuru[] = daftarSiswa
        .filter((s) => statusMap[s.nisn] && !lockedMap[s.nisn])
        .map((s) => ({
          nisn: s.nisn,
          nama: s.nama,
          kelas: s.kelas,
          status: statusMap[s.nisn],
        }));

      if (dataList.length === 0) {
        Swal.fire('Perhatian', 'Belum ada siswa baru yang dipilih statusnya.', 'warning');
        return;
      }

      const tanya = await Swal.fire({
        title: 'Kirim Presensi Masuk?',
        text: `${dataList.length} siswa akan disimpan ke database absensi.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Ya, Kirim',
        cancelButtonText: 'Batal',
      });

      if (tanya.isConfirmed) {
        setMemuat(true);
        try {
          const res = await simpanDaftarHadirGuru(dataList, tanggal, sesi.nama || sesi.username);
          setMemuat(false);
          if (res && res.success) {
            Swal.fire('Berhasil', 'Presensi masuk berhasil disimpan.', 'success');
            muatDataPresensi();
          } else {
            Swal.fire('Gagal', res?.message || 'Gagal menyimpan', 'error');
          }
        } catch (e: any) {
          setMemuat(false);
          Swal.fire('Error', e.message || 'Kesalahan server', 'error');
        }
      }
    } else {
      const pulangList: ItemPulangGuru[] = Object.entries(pulangMap)
        .filter(([, d]) => d.checked && d.rowIndex)
        .map(([nisn, d]) => ({ nisn, rowIndex: d.rowIndex }));

      if (pulangList.length === 0) {
        Swal.fire('Perhatian', 'Belum ada siswa yang dicentang pulang.', 'warning');
        return;
      }

      const tanya = await Swal.fire({
        title: 'Catat Jam Pulang?',
        text: `${pulangList.length} siswa akan dicatat jam kepulangannya.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f97316',
        confirmButtonText: 'Ya, Catat',
        cancelButtonText: 'Batal',
      });

      if (tanya.isConfirmed) {
        setMemuat(true);
        try {
          const res = await simpanPulangGuru(pulangList, tanggal, sesi.nama || sesi.username);
          setMemuat(false);
          if (res && res.success) {
            Swal.fire('Berhasil', 'Jam pulang siswa berhasil disimpan.', 'success');
            muatDataPresensi();
          } else {
            Swal.fire('Gagal', res?.message || 'Gagal menyimpan', 'error');
          }
        } catch (e: any) {
          setMemuat(false);
          Swal.fire('Error', e.message || 'Kesalahan server', 'error');
        }
      }
    }
  };

  // Ringkasan status kehadiran untuk kemudahan guru & lansia
  const hitungStatus = () => {
    let hadir = 0, sakit = 0, izin = 0, alpa = 0, belum = 0;
    daftarSiswa.forEach((s) => {
      const terkunci = lockedMap[s.nisn];
      const st = terkunci
        ? (typeof terkunci === 'object' ? terkunci.status : terkunci)
        : statusMap[s.nisn];
      const stLower = String(st || '').toLowerCase();
      if (stLower === 'hadir') hadir++;
      else if (stLower === 'sakit') sakit++;
      else if (stLower === 'izin') izin++;
      else if (stLower === 'alpa') alpa++;
      else belum++;
    });
    return { hadir, sakit, izin, alpa, belum, total: daftarSiswa.length };
  };
  const ringkasan = hitungStatus();

  return (
    <div className="bg-white  rounded-3xl border border-slate-200/90  shadow-sm overflow-hidden animate-fade-in-up">
      {/* Mode Toggle Header */}
      <div className="p-5 md:p-6 border-b border-slate-100  flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 ">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900  flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50  border border-indigo-200/80  text-indigo-600  inline-flex shadow-2xs">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <span>Presensi Daftar Hadir Kelas</span>
          </h2>
          <p className="text-xs md:text-sm font-medium text-slate-600  mt-1">
            Pencatatan presensi siswa harian ramah tablet &amp; layar sentuh {IDENTITAS_SEKOLAH.nama}.
          </p>
        </div>

        {/* Switch Masuk / Pulang */}
        <div className="flex items-center gap-1 bg-slate-100  p-1 rounded-2xl border border-slate-200/80 ">
          <button
            type="button"
            onClick={() => setMode('masuk')}
            className={`px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all tombol-taktil ${
              mode === 'masuk'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600  hover:text-slate-950 hover:bg-white/70 '
            }`}
          >
            Presensi Masuk
          </button>
          <button
            type="button"
            onClick={() => setMode('pulang')}
            className={`px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all tombol-taktil ${
              mode === 'pulang'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600  hover:text-slate-950 hover:bg-white/70 '
            }`}
          >
            Presensi Pulang
          </button>
        </div>
      </div>

      {/* Filter Bar Kontras Tinggi */}
      <div className="p-4 md:p-5 bg-slate-50/70  border-b border-slate-100  flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label htmlFor="field-daftarhadirguru-281" className="text-xs font-bold text-slate-700  uppercase tracking-wider block mb-1">
              Tanggal Presensi
            </label>
            <input id="field-daftarhadirguru-281"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="px-4 py-2.5 bg-white  border border-slate-200  rounded-xl text-sm font-bold text-slate-900  outline-none shadow-2xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label htmlFor="field-daftarhadirguru-293" className="text-xs font-bold text-slate-700  uppercase tracking-wider block mb-1">
              Pilih Rombel / Kelas
            </label>
            <select id="field-daftarhadirguru-293"
              value={kelasTerpilih}
              onChange={(e) => setKelasTerpilih(e.target.value)}
              className="px-4 py-2.5 bg-white  border border-slate-200  rounded-xl text-sm font-bold text-slate-900  outline-none shadow-2xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
            >
              {daftarKelas.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={tandaiSemuaHadir}
            className="px-4 md:px-5 py-2.5 bg-white  hover:bg-slate-50  text-slate-800  text-xs md:text-sm font-bold rounded-xl transition-all flex items-center gap-2 border border-slate-200  shadow-2xs tombol-taktil"
          >
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>Semua Hadir</span>
          </button>
          <button
            type="button"
            onClick={tanganiSubmit}
            className={`px-5 md:px-6 py-2.5 text-white text-xs md:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm tombol-taktil ${
              mode === 'masuk' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{mode === 'masuk' ? 'Simpan Presensi Masuk' : 'Simpan Presensi Pulang'}</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Status Pills (Mudah dibaca segala usia) */}
      <div className="px-5 py-3 bg-white border-b-2 border-slate-100 flex flex-wrap items-center gap-2 text-xs font-extrabold">
        <span className="text-slate-500 font-bold mr-1">Ringkasan Cepat:</span>
        <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
          Total: <strong>{ringkasan.total}</strong>
        </span>
        <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300">
          Hadir: <strong>{ringkasan.hadir}</strong>
        </span>
        <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300">
          Sakit: <strong>{ringkasan.sakit}</strong>
        </span>
        <span className="px-3 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-300">
          Izin: <strong>{ringkasan.izin}</strong>
        </span>
        <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-300">
          Alpa: <strong>{ringkasan.alpa}</strong>
        </span>
        {ringkasan.belum > 0 && (
          <span className="px-3 py-1 rounded-lg bg-slate-200/80 text-slate-700 border border-slate-300">
            Belum Dipilih: <strong>{ringkasan.belum}</strong>
          </span>
        )}
      </div>

      {/* Indikator Geser Horizontal Khusus Layar Ponsel / Mobile */}
      <div className="sm:hidden px-4 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-700">
        <span className="flex items-center gap-1.5">
          <span>👈</span>
          <span>Geser horizontal untuk status presensi</span>
          <span>👉</span>
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100/90 text-indigo-800 font-extrabold">{daftarSiswa.length} Siswa</span>
      </div>

      {/* Tabel Siswa Kontras Tinggi & Ramah Lansia */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-800 tabel-kontras-tinggi">
          <thead className="bg-slate-50  border-b border-slate-200  font-extrabold text-slate-700  uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 text-center w-14">No</th>
              <th className="p-4">Identitas Siswa</th>
              <th className="p-4 text-center">
                {mode === 'masuk' ? 'Pilih Status Kehadiran' : 'Jam Datang / Pulang'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 ">
            {sedangMuatData ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBarisTabel key={i} kolom={3} />
              ))
            ) : daftarSiswa.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-16 text-slate-400 font-bold text-base">
                  Tidak ada data siswa di kelas ini.
                </td>
              </tr>
            ) : (
              daftarSiswa.map((s, idx) => {
                const terkunci = lockedMap[s.nisn];
                const statusAktif = terkunci ? (typeof terkunci === 'object' ? terkunci.status : terkunci) : statusMap[s.nisn];
                const inisialNama = (s.nama || 'S').charAt(0).toUpperCase();

                return (
                  <tr key={s.nisn} className="hover:bg-slate-50/70  transition-colors">
                    <td className="p-4 text-center text-slate-500 font-bold text-base font-mono">
                      {idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50  border border-indigo-200/80  text-indigo-700  font-black flex items-center justify-center text-base shrink-0 shadow-2xs">
                          {inisialNama}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900  text-base md:text-lg leading-tight">
                            {s.nama}
                          </div>
                          <div className="text-xs font-bold text-slate-500  font-mono mt-1">
                            NISN: {s.nisn}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {mode === 'masuk' ? (
                        terkunci ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-slate-100  text-slate-700  border border-slate-200  shadow-2xs">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{String(statusAktif).toUpperCase()} (Sudah Tercatat)</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
                            {(['hadir', 'sakit', 'izin', 'alpa'] as const).map((st) => {
                              const aktif = statusAktif === st;
                              const styleBtn: Record<string, string> = {
                                hadir: aktif
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20 font-extrabold'
                                  : 'bg-white  text-emerald-800  border-slate-200  hover:border-emerald-300 hover:bg-emerald-50/50',
                                sakit: aktif
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/20 font-extrabold'
                                  : 'bg-white  text-amber-800  border-slate-200  hover:border-amber-300 hover:bg-amber-50/50',
                                izin: aktif
                                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-500/20 font-extrabold'
                                  : 'bg-white  text-sky-800  border-slate-200  hover:border-sky-300 hover:bg-sky-50/50',
                                alpa: aktif
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/20 font-extrabold'
                                  : 'bg-white  text-rose-800  border-slate-200  hover:border-rose-300 hover:bg-rose-50/50',
                              };
                              return (
                                <button
                                  type="button"
                                  key={st}
                                  onClick={() => setStatus(s.nisn, st)}
                                  className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all tombol-taktil border shadow-2xs min-w-[76px] sm:min-w-[88px] ${styleBtn[st]}`}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        /* Mode Pulang */
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <span className="text-xs font-bold font-mono text-slate-700  bg-slate-50  px-3.5 py-2 rounded-xl border border-slate-200 ">
                            Masuk: {pulangMap[s.nisn]?.jamDatang || '-'}
                          </span>
                          {pulangMap[s.nisn]?.jamPulang ? (
                            <span className="text-xs font-mono font-bold text-emerald-800  bg-emerald-50  px-3.5 py-2 rounded-xl border border-emerald-200 ">
                              Pulang: {pulangMap[s.nisn]?.jamPulang}
                            </span>
                          ) : (
                            <label className="flex items-center gap-2.5 cursor-pointer bg-white  px-4 py-2.5 rounded-xl border border-slate-200  hover:border-orange-400 shadow-2xs tombol-taktil">
                              <input
                                type="checkbox"
                                checked={!!pulangMap[s.nisn]?.checked}
                                onChange={(e) => {
                                  const c = { ...pulangMap };
                                  if (c[s.nisn]) c[s.nisn].checked = e.target.checked;
                                  setPulangMap(c);
                                }}
                                className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                              />
                              <span className="text-xs md:text-sm font-black text-slate-900">
                                Tandai Pulang
                              </span>
                            </label>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
