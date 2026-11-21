import React, { useState, useEffect, useRef } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import type { DataHariLibur } from '@/tipe/Konfigurasi';
import {
  ambilKonfigurasiSistem,
  simpanKonfigurasiSistem,
  ambilDaftarHariLibur,
  tambahRentangHariLibur,
  hapusHariLibur,
  imporHariLiburMassal,
} from '@/layanan/LayananJadwal';
import { formatTanggalIndonesia, dapatkanTanggalHariIni } from '@/utilitas/Tanggal';
import { IDENTITAS_SEKOLAH } from '@/settings';
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  Save,
  Settings,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Upload,
  CalendarCheck,
  Download,
  DatabaseBackup,
} from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { pulihkanCadanganLokal, unduhCadanganLokal } from '@/layanan/LayananCadangan';

interface PropertiHalamanPengaturan {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

const NAMA_HARI: Record<string, string> = {
  '1': 'Senin',
  '2': 'Selasa',
  '3': 'Rabu',
  '4': 'Kamis',
  '5': 'Jumat',
  '6': 'Sabtu',
  '7': 'Minggu',
};

const DEFAULT_JADWAL: Record<string, any> = {
  '1': { libur: false, libur_rutinan: true, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '15:00', pulang_akhir: '17:00', ket_libur: '' },
  '2': { libur: false, libur_rutinan: true, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '15:00', pulang_akhir: '17:00', ket_libur: '' },
  '3': { libur: false, libur_rutinan: true, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '15:00', pulang_akhir: '17:00', ket_libur: '' },
  '4': { libur: false, libur_rutinan: true, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '15:00', pulang_akhir: '17:00', ket_libur: '' },
  '5': { libur: false, libur_rutinan: true, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '11:45', pulang_akhir: '14:00', ket_libur: '' },
  '6': { libur: false, libur_rutinan: true, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '12:00', pulang_akhir: '14:00', ket_libur: '' },
  '7': { libur: true, libur_rutinan: true, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '15:00', pulang_akhir: '17:00', ket_libur: '' },
};

export const HalamanPengaturan: React.FC<PropertiHalamanPengaturan> = ({
  sesi,
  setMemuat,
}) => {
  const [tabAktif, setTabAktif] = useState<'jam' | 'libur' | 'identitas'>('jam');
  const [identitasKartu, setIdentitasKartu] = useState({
    namaSekolah: IDENTITAS_SEKOLAH.nama,
    judul: 'KARTU TANDA PELAJAR',
    deskripsi: 'Sistem Absensi Digital Sekolah',
    alamat: `${IDENTITAS_SEKOLAH.alamat}, ${IDENTITAS_SEKOLAH.kabupaten}, ${IDENTITAS_SEKOLAH.provinsi}`,
    namaKepalaSekolah: `${IDENTITAS_SEKOLAH.kepalaSekolah.nama}, ${IDENTITAS_SEKOLAH.kepalaSekolah.gelar}`,
    jabatanKepalaSekolah: IDENTITAS_SEKOLAH.kepalaSekolah.jabatan,
    tahun: String(IDENTITAS_SEKOLAH.tahunKalender),
    catatanBawah: 'Kartu identitas resmi siswa',
  });

  // State Jam Operasional & Mode Presensi
  const [modeAbsen, setModeAbsen] = useState<string>('masuk_pulang');
  const [jamMasukMulai, setJamMasukMulai] = useState('06:00');
  const [jamMasukAkhir, setJamMasukAkhir] = useState('07:15');
  const [jamPulangMulai, setJamPulangMulai] = useState('15:00');
  const [jamPulangAkhir, setJamPulangAkhir] = useState('17:00');
  const [jadwalHarian, setJadwalHarian] = useState<Record<string, any>>(DEFAULT_JADWAL);

  // Accordion buka/tutup kartu hari
  const [hariTerbuka, setHariTerbuka] = useState<Record<string, boolean>>({
    '1': true,
    '2': false,
    '3': false,
    '4': false,
    '5': false,
    '6': false,
    '7': false,
  });

  // State Hari Libur
  const [daftarLibur, setDaftarLibur] = useState<DataHariLibur[]>([]);
  const [tglLiburMulai, setTglLiburMulai] = useState(dapatkanTanggalHariIni());
  const [tglLiburAkhir, setTglLiburAkhir] = useState(dapatkanTanggalHariIni());
  const [ketLibur, setKetLibur] = useState('');
  const berkasLiburRef = useRef<HTMLInputElement>(null);
  const berkasCadanganRef = useRef<HTMLInputElement>(null);

  const pulihkanCadangan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const jumlah = await pulihkanCadanganLokal(file);
      await Swal.fire('Backup dipulihkan', `${jumlah} pengaturan lokal berhasil dipulihkan. Muat ulang halaman untuk menerapkan semuanya.`, 'success');
      window.location.reload();
    } catch (err: any) {
      Swal.fire('Backup gagal', err?.message || 'File backup tidak valid.', 'error');
    }
  };

  useEffect(() => {
    muatPengaturan();
    muatHariLibur();
    try {
      const tersimpan = JSON.parse(localStorage.getItem('konfigurasiKartuSiswa') || '{}');
      setIdentitasKartu((sebelumnya) => ({ ...sebelumnya, ...tersimpan }));
    } catch (error) {
      console.warn('Konfigurasi identitas kartu tidak dapat dibaca:', error);
    }
  }, []);

  const simpanIdentitasKartu = () => {
    try {
      localStorage.setItem('konfigurasiKartuSiswa', JSON.stringify(identitasKartu));
      localStorage.setItem('konfigurasiKartuAbsensi', JSON.stringify({
        nama: identitasKartu.namaSekolah,
        subjudul: identitasKartu.judul,
        deskripsi: identitasKartu.deskripsi,
        alamat: identitasKartu.alamat,
        namaKepala: identitasKartu.namaKepalaSekolah,
        jabatanKepala: identitasKartu.jabatanKepalaSekolah,
        tahun: identitasKartu.tahun,
        catatan: identitasKartu.catatanBawah,
      }));
      window.dispatchEvent(new Event('konfigurasiKartuDiubah'));
      Swal.fire('Tersimpan', 'Identitas sekolah dan kartu berhasil disimpan di perangkat ini.', 'success');
    } catch (error: any) {
      Swal.fire('Gagal', error?.message || 'Identitas tidak dapat disimpan.', 'error');
    }
  };

  const muatPengaturan = async () => {
    try {
      const res = await ambilKonfigurasiSistem();
      if (res && res.success && res.data) {
        const d = res.data;
        if (d.mode_absen) setModeAbsen(d.mode_absen);
        if (d.jam_masuk_mulai) setJamMasukMulai(d.jam_masuk_mulai);
        if (d.jam_masuk_akhir) setJamMasukAkhir(d.jam_masuk_akhir);
        if (d.jam_pulang_mulai) setJamPulangMulai(d.jam_pulang_mulai);
        if (d.jam_pulang_akhir) setJamPulangAkhir(d.jam_pulang_akhir);
        if (d.jadwal_harian) {
          setJadwalHarian({ ...DEFAULT_JADWAL, ...d.jadwal_harian });
        }
      }
    } catch (e) {
      console.error('Gagal memuat konfigurasi:', e);
    }
  };

  const muatHariLibur = async () => {
    try {
      const res = await ambilDaftarHariLibur();
      if (res && res.success && Array.isArray(res.data)) {
        setDaftarLibur(res.data);
      }
    } catch (e) {
      console.error('Gagal memuat hari libur:', e);
    }
  };

  const toggleHari = (key: string) => {
    setHariTerbuka((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const perbaruiHari = (key: string, field: string, val: any) => {
    setJadwalHarian((prev) => {
      const cur = prev[key] || DEFAULT_JADWAL[key] || {};
      return {
        ...prev,
        [key]: {
          ...cur,
          [field]: val,
        },
      };
    });
  };

  const tanganiSimpanJam = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemuat(true);
    try {
      const payload = {
        mode_absen: modeAbsen,
        jam_masuk_mulai: jamMasukMulai,
        jam_masuk_akhir: jamMasukAkhir,
        jam_pulang_mulai: jamPulangMulai,
        jam_pulang_akhir: jamPulangAkhir,
        jadwal_harian: jadwalHarian,
      };

      const res = await simpanKonfigurasiSistem(payload);
      setMemuat(false);
      if (res && res.success) {
        Swal.fire({
          title: 'Berhasil Disimpan!',
          text: 'Konfigurasi jadwal 7 hari dan jam operasional sekolah berhasil diperbarui.',
          icon: 'success',
          confirmButtonColor: '#4f46e5',
        });
        muatHariLibur(); // Hari libur khusus otomatis tersinkron
      } else {
        Swal.fire('Gagal', res?.message || 'Gagal menyimpan pengaturan.', 'error');
      }
    } catch (err: any) {
      setMemuat(false);
      Swal.fire('Error', err.message || 'Kesalahan server', 'error');
    }
  };

  const tanganiTambahLibur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ketLibur.trim()) {
      Swal.fire('Perhatian', 'Harap isi keterangan hari libur.', 'warning');
      return;
    }

    setMemuat(true);
    try {
      const res = await tambahRentangHariLibur(tglLiburMulai, tglLiburAkhir, ketLibur.trim());
      setMemuat(false);
      if (res && res.success) {
        Swal.fire('Berhasil', res.message || 'Hari libur berhasil ditambahkan.', 'success');
        setKetLibur('');
        muatHariLibur();
      } else {
        Swal.fire('Gagal', res?.message || 'Gagal menambah hari libur.', 'error');
      }
    } catch (err: any) {
      setMemuat(false);
      Swal.fire('Error', err.message || 'Kesalahan server', 'error');
    }
  };

  const tanganiHapusLibur = async (tanggal: string) => {
    const konfirm = await Swal.fire({
      title: 'Hapus Hari Libur?',
      text: `Hapus tanggal libur ${formatTanggalIndonesia(tanggal)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });

    if (konfirm.isConfirmed) {
      setMemuat(true);
      try {
        const res = await hapusHariLibur(tanggal);
        setMemuat(false);
        if (res && res.success) {
          Swal.fire('Berhasil', 'Hari libur berhasil dihapus.', 'success');
          muatHariLibur();
        } else {
          Swal.fire('Gagal', res?.message || 'Gagal menghapus.', 'error');
        }
      } catch (err: any) {
        setMemuat(false);
        Swal.fire('Error', err.message || 'Kesalahan server', 'error');
      }
    }
  };

  const tanganiImporLiburExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

        const dataToImport: Array<{ tanggal: string; keterangan: string }> = [];
        rawRows.forEach((row) => {
          const tgl = row.Tanggal || row.tanggal || row['TANGGAL'];
          const ket =
            row.Keterangan ||
            row.keterangan ||
            row['KETERANGAN'] ||
            row['Nama Libur'] ||
            'Hari Libur Resmi';
          if (tgl && ket) {
            dataToImport.push({
              tanggal: String(tgl).trim(),
              keterangan: String(ket).trim(),
            });
          }
        });

        if (dataToImport.length === 0) {
          Swal.fire(
            'Format Tidak Sesuai',
            'File Excel harus memiliki kolom "Tanggal" (format YYYY-MM-DD) dan "Keterangan".',
            'warning'
          );
          return;
        }

        const konfirm = await Swal.fire({
          title: 'Import Hari Libur?',
          text: `Ditemukan ${dataToImport.length} baris hari libur dari file Excel. Lanjutkan import?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#059669',
          confirmButtonText: 'Ya, Import',
          cancelButtonText: 'Batal',
        });

        if (konfirm.isConfirmed) {
          setMemuat(true);
          const res = await imporHariLiburMassal(dataToImport);
          setMemuat(false);
          if (res && res.success) {
            Swal.fire('Berhasil Import', res.message || 'Data hari libur berhasil diimpor.', 'success');
            muatHariLibur();
          } else {
            Swal.fire('Gagal Import', res?.message || 'Gagal menyimpan data.', 'error');
          }
        }
      } catch (err: any) {
        setMemuat(false);
        Swal.fire('Error', 'Gagal membaca file: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-white  rounded-3xl border border-slate-200/90  shadow-sm overflow-hidden animate-fade-in-up max-w-4xl mx-auto">
      {/* Header Halaman Pengaturan */}
      <div className="p-5 md:p-6 border-b border-slate-100  flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 ">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-50  border border-indigo-200/80  text-indigo-600  inline-flex shadow-2xs">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-black text-slate-900 ">
              Pengaturan Jadwal &amp; Jam Presensi
            </h2>
          </div>
          <p className="text-xs md:text-sm font-medium text-slate-600 ">
            Konfigurasi jadwal 7 hari (Senin–Minggu) dan kalender libur resmi {IDENTITAS_SEKOLAH.nama} tahun 2026.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100  p-1 rounded-2xl border border-slate-200/80 ">
          <button
            type="button"
            onClick={() => setTabAktif('jam')}
            aria-pressed={tabAktif === 'jam'}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 tombol-taktil ${
              tabAktif === 'jam'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'text-slate-600  hover:text-slate-900 '
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Jadwal Harian</span>
          </button>
          <button
            type="button"
            onClick={() => setTabAktif('libur')}
            aria-pressed={tabAktif === 'libur'}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 tombol-taktil ${
              tabAktif === 'libur'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'text-slate-600  hover:text-slate-900 '
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Kalender Libur</span>
          </button>
          <button
            type="button"
            onClick={() => setTabAktif('identitas')}
            aria-pressed={tabAktif === 'identitas'}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 tombol-taktil ${
              tabAktif === 'identitas'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'text-slate-600  hover:text-slate-900 '
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Identitas &amp; Kartu</span>
          </button>
        </div>
      </div>

      {sesi.role === 'admin' && (
        <div className="px-5 md:px-7 py-3.5 bg-amber-50/70  border-b border-amber-200/80  flex flex-wrap items-center gap-3">
          <DatabaseBackup className="w-5 h-5 text-amber-700 " />
          <div className="mr-auto">
            <p className="font-bold text-slate-900  text-xs md:text-sm">Cadangan Data Lokal</p>
            <p className="text-xs text-slate-600 ">Mencadangkan pengaturan, foto, dan konfigurasi kartu di browser ini.</p>
          </div>
          <input ref={berkasCadanganRef} type="file" accept="application/json,.json" onChange={pulihkanCadangan} className="hidden" />
          <button type="button" onClick={unduhCadanganLokal} className="px-3 py-1.5 bg-white  border border-amber-300  rounded-xl text-xs font-bold text-slate-800  flex items-center gap-1.5 shadow-2xs hover:bg-amber-50  transition">
            <Download className="w-4 h-4 text-amber-600 " /> Export Backup
          </button>
          <button type="button" onClick={() => berkasCadanganRef.current?.click()} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition">
            <Upload className="w-4 h-4" /> Import Backup
          </button>
        </div>
      )}

      {/* Konten Tab 1: Jam Operasional & Jadwal Harian */}
      {tabAktif === 'jam' && (
        <form onSubmit={tanganiSimpanJam} className="p-5 md:p-7 space-y-6 text-xs md:text-sm">
          {/* Mode Absensi */}
          <div className="p-4 bg-slate-50/70  rounded-2xl border border-slate-200/80  flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <label htmlFor="mode-presensi" className="font-bold text-slate-900  block text-sm">
                Mode Presensi Sekolah
              </label>
              <p className="text-xs text-slate-500  font-medium">
                Pilih skema pencatatan absensi yang berlaku di gerbang sekolah
              </p>
            </div>
            <select
              id="mode-presensi"
              value={modeAbsen}
              onChange={(e) => setModeAbsen(e.target.value)}
              className="p-3 bg-white  border border-slate-200  rounded-xl font-bold text-slate-900  outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
            >
              <option value="masuk_pulang">Presensi Masuk &amp; Pulang</option>
              <option value="masuk_saja">Presensi Masuk Saja</option>
              <option value="masuk_sholat_pulang">Masuk + Sholat Berjamaah + Pulang</option>
            </select>
          </div>

          {/* Pengaturan Jadwal Per Hari 1 - 7 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-black text-slate-900  text-sm md:text-base flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600 " />
                <span>Rincian Jadwal Hari Sekolah (Senin s/d Minggu)</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500 ">
                Klik baris hari untuk menyesuaikan jam
              </span>
            </div>

            {['1', '2', '3', '4', '5', '6', '7'].map((key) => {
              const hari = jadwalHarian[key] || DEFAULT_JADWAL[key];
              const isLibur = !!hari.libur;
              const isRutinan = hari.libur_rutinan !== false;
              const terbuka = !!hariTerbuka[key];

              const badgeClass = isLibur
                ? isRutinan
                  ? 'bg-purple-50 text-purple-700   border-purple-200 '
                  : 'bg-rose-50 text-rose-700   border-rose-200 '
                : 'bg-emerald-50 text-emerald-700   border-emerald-200 ';

              const badgeText = isLibur
                ? isRutinan
                  ? 'Libur Rutin'
                  : 'Libur Khusus'
                : 'Masuk';

              return (
                <div
                  key={key}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isLibur
                      ? 'bg-rose-50/20  border-rose-200/80 '
                      : 'bg-white  border-slate-200/80 '
                  }`}
                >
                  {/* Baris Header Hari */}
                  <div
                    onClick={() => toggleHari(key)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80  transition select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-100  border border-slate-200  font-mono font-bold text-slate-800  flex items-center justify-center text-xs">
                        {key}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900  text-sm">{NAMA_HARI[key]}</h4>
                        <p className="text-xs text-slate-500  font-medium">
                          {isLibur
                            ? isRutinan
                              ? 'Hari libur rutin sekolah'
                              : `Libur khusus: ${hari.ket_libur || 'Tanpa keterangan'}`
                            : `Masuk: ${hari.masuk_mulai || '06:00'} - ${hari.masuk_akhir || '07:15'} | Pulang: ${hari.pulang_mulai || '15:00'} - ${hari.pulang_akhir || '17:00'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {/* Badge Status */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                        {badgeText}
                      </span>

                      {/* Switch Masuk / Libur */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label={`Presensi aktif pada hari ${NAMA_HARI[key]}`}
                          checked={!isLibur}
                          onChange={(e) => perbaruiHari(key, 'libur', !e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-rose-200  peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>

                      {/* Tombol Panah Buka / Tutup */}
                      <button
                        type="button"
                        onClick={() => toggleHari(key)}
                        className="p-1 text-slate-400 hover:text-slate-700 "
                        aria-label={`${terbuka ? 'Tutup' : 'Buka'} jadwal ${NAMA_HARI[key]}`}
                        aria-expanded={terbuka}
                      >
                        {terbuka ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Panel Detail Input Hari (Expandable) */}
                  {terbuka && (
                    <div className="p-4 border-t border-slate-100  bg-slate-50/50  space-y-3">
                      {isLibur ? (
                        /* Pilihan Jenis Libur */
                        <div className="space-y-3">
                          <p className="text-xs uppercase font-bold text-rose-600 ">Jenis Libur</p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200  bg-white  hover:border-purple-400 transition flex-1">
                              <input
                                type="radio"
                                name={`jenis_libur_${key}`}
                                checked={isRutinan}
                                onChange={() => perbaruiHari(key, 'libur_rutinan', true)}
                                className="accent-purple-600 w-4 h-4"
                              />
                              <div>
                                <span className="font-bold text-slate-900  block text-xs">Libur Rutinan</span>
                                <span className="text-[11px] text-slate-500 ">Tidak dicatat ke daftar kalender libur</span>
                              </div>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200  bg-white  hover:border-rose-400 transition flex-1">
                              <input
                                type="radio"
                                name={`jenis_libur_${key}`}
                                checked={!isRutinan}
                                onChange={() => perbaruiHari(key, 'libur_rutinan', false)}
                                className="accent-rose-600 w-4 h-4"
                              />
                              <div>
                                <span className="font-bold text-slate-900  block text-xs">Libur Khusus</span>
                                <span className="text-[11px] text-slate-500 ">Otomatis dicatat ke daftar hari libur</span>
                              </div>
                            </label>
                          </div>

                          {!isRutinan && (
                            <div>
                              <label htmlFor={`catatan-libur-${key}`} className="text-xs font-bold text-slate-800  block mb-1">
                                Keterangan Libur Khusus
                              </label>
                              <input id={`catatan-libur-${key}`}
                                type="text"
                                value={hari.ket_libur || ''}
                                onChange={(e) => perbaruiHari(key, 'ket_libur', e.target.value)}
                                placeholder="Contoh: Rapat Kerja Dewan Guru / Libur Semester"
                                className="w-full p-2.5 bg-white  border border-slate-200  rounded-xl font-bold text-slate-900  text-xs focus:border-indigo-600 outline-none"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Input Jam Masuk & Jam Pulang */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-3 bg-white  rounded-xl border border-slate-200/80  space-y-2">
                            <span className="font-bold text-emerald-700  text-xs flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              Jam Masuk (Datang)
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label htmlFor={`jam-masuk-mulai-${key}`} className="text-[11px] font-semibold text-slate-600  block">Mulai Buka</label>
                                <input id={`jam-masuk-mulai-${key}`}
                                  type="time"
                                  value={hari.masuk_mulai || '06:00'}
                                  onChange={(e) => perbaruiHari(key, 'masuk_mulai', e.target.value)}
                                  className="w-full p-2 bg-slate-50  border border-slate-200  rounded-lg font-mono font-bold text-xs text-slate-900 "
                                />
                              </div>
                              <div>
                                <label htmlFor={`jam-masuk-akhir-${key}`} className="text-[11px] font-semibold text-rose-600  block">Batas Terlambat</label>
                                <input id={`jam-masuk-akhir-${key}`}
                                  type="time"
                                  value={hari.masuk_akhir || '07:15'}
                                  onChange={(e) => perbaruiHari(key, 'masuk_akhir', e.target.value)}
                                  className="w-full p-2 bg-slate-50  border border-slate-200  rounded-lg font-mono font-bold text-xs text-slate-900 "
                                />
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-white  rounded-xl border border-slate-200/80  space-y-2">
                            <span className="font-bold text-amber-700  text-xs flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              Jam Pulang
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label htmlFor={`jam-pulang-mulai-${key}`} className="text-[11px] font-semibold text-slate-600  block">Mulai Pulang</label>
                                <input id={`jam-pulang-mulai-${key}`}
                                  type="time"
                                  value={hari.pulang_mulai || '15:00'}
                                  onChange={(e) => perbaruiHari(key, 'pulang_mulai', e.target.value)}
                                  className="w-full p-2 bg-slate-50  border border-slate-200  rounded-lg font-mono font-bold text-xs text-slate-900 "
                                />
                              </div>
                              <div>
                                <label htmlFor={`jam-pulang-akhir-${key}`} className="text-[11px] font-semibold text-slate-600  block">Batas Akhir</label>
                                <input id={`jam-pulang-akhir-${key}`}
                                  type="time"
                                  value={hari.pulang_akhir || '17:00'}
                                  onChange={(e) => perbaruiHari(key, 'pulang_akhir', e.target.value)}
                                  className="w-full p-2 bg-slate-50  border border-slate-200  rounded-lg font-mono font-bold text-xs text-slate-900 "
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs md:text-sm transition-all shadow-sm shadow-indigo-500/20 flex items-center justify-center gap-2 tombol-taktil"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Seluruh Pengaturan Jam Operasional</span>
          </button>
        </form>
      )}

      {tabAktif === 'identitas' && (
        <section className="p-5 md:p-7 space-y-5 text-xs md:text-sm">
          <div className="rounded-2xl border border-indigo-200/80  bg-indigo-50/50  p-4">
            <h3 className="font-bold text-slate-900  text-base">Identitas sekolah dan kartu siswa</h3>
            <p className="mt-1 text-slate-600  text-xs">
              Pengaturan ini dipakai oleh preview kartu dan cetak kartu pada perangkat admin ini.
              Jangan memasukkan secret, password, atau ID spreadsheet di sini.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['namaSekolah', 'Nama sekolah'],
              ['judul', 'Judul kartu'],
              ['deskripsi', 'Deskripsi kartu'],
              ['alamat', 'Alamat sekolah'],
              ['namaKepalaSekolah', 'Nama kepala sekolah'],
              ['jabatanKepalaSekolah', 'Jabatan kepala sekolah'],
              ['tahun', 'Tahun kartu'],
              ['catatanBawah', 'Catatan bawah kartu'],
            ] as Array<[keyof typeof identitasKartu, string]>).map(([field, label]) => (
              <label key={field} className="font-bold text-slate-700 ">
                {label}
                <input
                  value={identitasKartu[field]}
                  onChange={(event) => setIdentitasKartu((sebelumnya) => ({
                    ...sebelumnya,
                    [field]: event.target.value,
                  }))}
                  className="mt-1 w-full rounded-xl border border-slate-200  bg-white  px-3 py-2.5 font-bold text-slate-900  outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80  bg-slate-50  p-4">
            <p className="text-xs font-medium text-slate-600 ">
              Identitas resmi saat ini: {IDENTITAS_SEKOLAH.nama} · NPSN {IDENTITAS_SEKOLAH.npsn}
            </p>
            <button
              type="button"
              onClick={simpanIdentitasKartu}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 transition"
            >
              <Save className="h-4 w-4" /> Simpan Identitas
            </button>
          </div>
        </section>
      )}

      {/* Konten Tab 2: Kalender Libur */}
      {tabAktif === 'libur' && (
        <div className="p-5 md:p-7 space-y-6 text-xs md:text-sm">
          {/* File Input Tersembunyi untuk Excel */}
          <input
            type="file"
            ref={berkasLiburRef}
            onChange={tanganiImporLiburExcel}
            accept=".xlsx,.xls"
            className="hidden"
          />

          {/* Form Tambah Hari Libur & Import Excel */}
          <div className="p-5 bg-slate-50/70  rounded-2xl border border-slate-200/80  space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <h4 className="font-bold text-slate-900  text-sm md:text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600 " />
                <span>Tambah Rentang Hari Libur</span>
              </h4>
              <button
                type="button"
                onClick={() => berkasLiburRef.current?.click()}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100   border border-emerald-200  text-emerald-800  rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-2xs tombol-taktil"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 " />
                <span>Import Hari Libur dari Excel</span>
              </button>
            </div>

            <form onSubmit={tanganiTambahLibur} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
              <div>
                <label htmlFor="field-pengaturan-740" className="text-xs font-bold text-slate-700  uppercase block mb-1.5">
                  Tanggal Mulai
                </label>
                <input id="field-pengaturan-740"
                  type="date"
                  required
                  value={tglLiburMulai}
                  onChange={(e) => setTglLiburMulai(e.target.value)}
                  className="w-full p-2.5 bg-white  border border-slate-200  rounded-xl outline-none font-bold text-slate-900  focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                />
              </div>

              <div>
                <label htmlFor="field-pengaturan-753" className="text-xs font-bold text-slate-700  uppercase block mb-1.5">
                  Tanggal Selesai
                </label>
                <input id="field-pengaturan-753"
                  type="date"
                  required
                  value={tglLiburAkhir}
                  onChange={(e) => setTglLiburAkhir(e.target.value)}
                  className="w-full p-2.5 bg-white  border border-slate-200  rounded-xl outline-none font-bold text-slate-900  focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                />
              </div>

              <div>
                <label htmlFor="field-pengaturan-766" className="text-xs font-bold text-slate-700  uppercase block mb-1.5">
                  Keterangan Hari Libur
                </label>
                <input id="field-pengaturan-766"
                  type="text"
                  required
                  placeholder="Contoh: Libur Semester / Cuti Bersama"
                  value={ketLibur}
                  onChange={(e) => setKetLibur(e.target.value)}
                  className="w-full p-2.5 bg-white  border border-slate-200  rounded-xl outline-none font-bold text-slate-900  focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm shadow-emerald-500/20 text-xs md:text-sm tombol-taktil"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan ke Kalender</span>
                </button>
              </div>
            </form>
          </div>

          {/* Tabel Hari Libur */}
          <div className="border border-slate-200/90  rounded-2xl overflow-hidden">
            <div className="p-3.5 bg-slate-50  border-b border-slate-200/90  font-bold text-slate-900  flex justify-between items-center text-xs md:text-sm">
              <span>Daftar Hari Libur Terdaftar ({daftarLibur.length} Hari)</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-50  border-b border-slate-200/90  font-bold text-slate-700  uppercase text-xs">
                  <tr>
                    <th className="p-3.5 text-center w-14">No</th>
                    <th className="p-3.5">Tanggal</th>
                    <th className="p-3.5">Keterangan Hari Libur</th>
                    <th className="p-3.5 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 ">
                  {daftarLibur.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500  font-medium text-sm">
                        Belum ada hari libur yang terdaftar.
                      </td>
                    </tr>
                  ) : (
                    daftarLibur.map((l, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80  transition-colors">
                        <td className="p-3.5 text-center font-mono font-bold text-slate-600 ">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-slate-900 ">
                          {formatTanggalIndonesia(l.tanggal)}
                        </td>
                        <td className="p-3.5 text-slate-700  font-medium">{l.keterangan}</td>
                        <td className="p-3.5 text-center">
                          <button type="button"
                            onClick={() => tanganiHapusLibur(l.tanggal)}
                            className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100   border border-rose-200  rounded-xl transition shadow-2xs tombol-taktil"
                            title="Hapus Hari Libur"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
