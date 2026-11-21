import React, { useState, useEffect, useRef } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import type { DataSiswa } from '@/tipe/Siswa';
import {
  ambilDaftarSiswa,
  ambilDaftarKelas,
  simpanSiswaBaru,
  perbaruiDataSiswa,
  hapusDataSiswa,
  imporSiswaMassal,
  resetPinSiswa,
} from '@/layanan/LayananSiswa';
import { Search, Plus, Trash2, Edit2, Users, X, Upload, Download, FileSpreadsheet, QrCode, Printer, Camera, KeyRound } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { ambilFotoProfil, simpanFotoProfil, kompresFoto } from '@/layanan/LayananProfil';
import { sanitasiFormulaExcel } from '@/utilitas/Validasi';
import { SkeletonBarisTabel } from '@/komponen/umum/SkeletonLoader';
import { useAksesibilitasDialog } from '@/utilitas/useAksesibilitasDialog';
import { IDENTITAS_SEKOLAH } from '@/settings';

interface PropertiHalamanDataSiswa {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

export const HalamanDataSiswa: React.FC<PropertiHalamanDataSiswa> = ({
  sesi,
  setMemuat,
}) => {
  const [daftarSiswa, setDaftarSiswa] = useState<DataSiswa[]>([]);
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [filterKelas, setFilterKelas] = useState<string>('');
  const [kataKunci, setKataKunci] = useState<string>('');
  const [halaman, setHalaman] = useState<number>(1);
  const [sedangMuatTabel, setSedangMuatTabel] = useState<boolean>(false);
  const [siswaEdit, setSiswaEdit] = useState<DataSiswa | null>(null);
  const [modalBuka, setModalBuka] = useState<boolean>(false);

  // State Modal Pratinjau QR & Barcode Siswa
  const [siswaTerpilihKartu, setSiswaTerpilihKartu] = useState<DataSiswa | null>(null);
  const [qrModalUrl, setQrModalUrl] = useState<string>('');
  const [targetFotoNisn, setTargetFotoNisn] = useState('');
  const dialogSiswaRef = useRef<HTMLDivElement>(null);
  const dialogKartuRef = useRef<HTMLDivElement>(null);

  useAksesibilitasDialog(modalBuka, dialogSiswaRef, () => setModalBuka(false));
  useAksesibilitasDialog(Boolean(siswaTerpilihKartu), dialogKartuRef, () => setSiswaTerpilihKartu(null));

  // Form input state
  const [formNisn, setFormNisn] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formJenisKelamin, setFormJenisKelamin] = useState<'L' | 'P'>('L');
  const [formNoHp, setFormNoHp] = useState('');
  const [formPin, setFormPin] = useState('');

  const itemPerHalaman = 15;
  const inputBerkasRef = useRef<HTMLInputElement>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const inputFotoMassalRef = useRef<HTMLInputElement>(null);

  const bukaKartuSiswa = async (siswa: DataSiswa) => {
    setSiswaTerpilihKartu(siswa);
    const cleanNisn = String(siswa.nisn || '').replace(/[^a-zA-Z0-9]/g, '').trim();
    if (cleanNisn) {
      try {
        const url = await QRCode.toDataURL(cleanNisn, {
          width: 320,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });
        setQrModalUrl(url);
      } catch (e) {
        console.error('Gagal generate QR Modal:', e);
      }
    }
  };

  const tanganiFotoSiswa = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !targetFotoNisn) return;
    try {
      const dataUrl = await kompresFoto(file, 500);
      simpanFotoProfil(targetFotoNisn, dataUrl);
      window.dispatchEvent(new Event('fotoProfilDiubah'));
      Swal.fire({ title: 'Foto siswa tersimpan', text: 'Foto profil siswa/siswi berhasil diperbarui.', icon: 'success', timer: 1600, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Gagal', err.message || 'Foto tidak dapat diproses.', 'error');
    }
  };

  const tanganiFotoMassal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const nisnTersedia = new Set(daftarSiswa.map((siswa) => String(siswa.nisn).trim()));
    let berhasil = 0;
    const gagal: string[] = [];
    for (const file of files) {
      const nisn = file.name.replace(/\.[^/.]+$/, '').trim();
      if (!nisnTersedia.has(nisn)) {
        gagal.push(`${file.name}: NISN tidak ditemukan`);
        continue;
      }
      try {
        simpanFotoProfil(nisn, await kompresFoto(file, 500));
        berhasil += 1;
      } catch (err: any) {
        gagal.push(`${file.name}: ${err?.message || 'gagal diproses'}`);
      }
    }
    window.dispatchEvent(new Event('fotoProfilDiubah'));
    Swal.fire({
      title: 'Import foto selesai',
      html: `<b>${berhasil}</b> foto tersimpan.${gagal.length ? `<br><span class="text-red-600">${gagal.length} file dilewati. Nama file harus sama dengan NISN.</span>` : ''}`,
      icon: gagal.length ? 'warning' : 'success',
    });
  };

  const unduhTemplateExcel = () => {
    try {
      const dataContoh = [
        {
          NISN: '0071234567',
          Nama: 'Ahmad Fauzi',
          Kelas: daftarKelas[0] || 'X TJKT 1',
          'Jenis Kelamin': 'L',
          'No HP': '081234567890',
          'Tanggal Lahir': '2008-05-14',
          Agama: 'Islam',
          'Nama Ayah': 'Bambang',
          'Nama Ibu': 'Siti',
          Alamat: 'Baturaja',
          PIN: '1234',
        },
        {
          NISN: '0079876543',
          Nama: 'Aisyah Putri',
          Kelas: daftarKelas[0] || 'X TJKT 1',
          'Jenis Kelamin': 'P',
          'No HP': '089876543210',
          'Tanggal Lahir': '2008-08-20',
          Agama: 'Islam',
          'Nama Ayah': 'Rudi',
          'Nama Ibu': 'Nur',
          Alamat: 'Baturaja Timur',
          PIN: '5678',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(dataContoh);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
      XLSX.writeFile(wb, 'Template_Import_Siswa.xlsx');
      Swal.fire('Sukses', 'File template Excel berhasil diunduh.', 'success');
    } catch (e: any) {
      Swal.fire('Error', 'Gagal membuat file template: ' + e.message, 'error');
    }
  };

  const eksporSiswaExcel = () => {
    if (daftarSiswa.length === 0) {
      Swal.fire('Perhatian', 'Tidak ada data siswa untuk diekspor.', 'warning');
      return;
    }
    try {
      const dataEkspor = siswaTersaring.map((s, idx) => ({
        No: idx + 1,
        NISN: sanitasiFormulaExcel(s.nisn || ''),
        Nama: sanitasiFormulaExcel(s.nama || ''),
        Kelas: sanitasiFormulaExcel(s.kelas || ''),
        'Jenis Kelamin': s.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki',
        'No HP': sanitasiFormulaExcel(s.noHp || '-'),
        'Tanggal Lahir': sanitasiFormulaExcel(s.tanggalLahir || '-'),
        Agama: sanitasiFormulaExcel(s.agama || '-'),
        'Nama Ayah': sanitasiFormulaExcel(s.namaAyah || '-'),
        'Nama Ibu': sanitasiFormulaExcel(s.namaIbu || '-'),
        Alamat: sanitasiFormulaExcel(s.alamat || '-'),
      }));

      const ws = XLSX.utils.json_to_sheet(dataEkspor);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
      const namaFile = filterKelas
        ? `Data_Siswa_${filterKelas}_2026.xlsx`
        : `Data_Siswa_Seluruh_2026.xlsx`;
      XLSX.writeFile(wb, namaFile);
      Swal.fire('Sukses', `Data siswa berhasil diekspor (${siswaTersaring.length} siswa).`, 'success');
    } catch (e: any) {
      Swal.fire('Error', 'Gagal mengekspor data siswa: ' + e.message, 'error');
    }
  };

  const tanganiUnggahExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const barisMentah: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!barisMentah || barisMentah.length === 0) {
          Swal.fire('Perhatian', 'File Excel kosong atau format tidak sesuai.', 'warning');
          return;
        }

        const dataSiswaBaru: DataSiswa[] = [];

        barisMentah.forEach((row: any) => {
          const nisn = String(
            row['NISN'] || row['nisn'] || row['Nisn'] || row['No Induk'] || ''
          ).trim();
          const nama = String(
            row['Nama'] || row['nama'] || row['Nama Lengkap'] || row['NAMA'] || ''
          ).trim();
          const kelas = String(
            row['Kelas'] || row['kelas'] || row['Rombel'] || row['rombel'] || row['KELAS'] || filterKelas || ''
          ).trim();

          const jkMentah = String(
            row['Jenis Kelamin'] || row['jenisKelamin'] || row['JK'] || row['jk'] || row['Gender'] || 'L'
          ).toUpperCase().trim();
          const jenisKelamin = jkMentah.startsWith('P') ? 'P' : 'L';

          const noHp = String(row['No HP'] || row['noHp'] || row['Telepon'] || row['HP'] || '').trim();
          const tanggalLahir = String(row['Tanggal Lahir'] || row['tanggalLahir'] || row['Tgl Lahir'] || '').trim();
          const agama = String(row['Agama'] || row['agama'] || '').trim();
          const namaAyah = String(row['Nama Ayah'] || row['namaAyah'] || '').trim();
          const namaIbu = String(row['Nama Ibu'] || row['namaIbu'] || '').trim();
          const alamat = String(row['Alamat'] || row['alamat'] || '').trim();
          const pin = String(row['PIN'] || row['Pin'] || row['pin'] || '').replace(/\D/g, '').trim();

          if (nisn && nama) {
            dataSiswaBaru.push({
              nisn,
              nama,
              kelas: kelas || (daftarKelas[0] || 'Umum'),
              jenisKelamin,
              noHp,
              tanggalLahir,
              agama,
              namaAyah,
              namaIbu,
              alamat,
              pin,
            });
          }
        });

        if (dataSiswaBaru.length === 0) {
          Swal.fire(
            'Format Tidak Cocok',
            'Tidak ditemukan kolom "NISN" dan "Nama" yang valid dalam file Excel.',
            'warning'
          );
          return;
        }

        const konfirmasi = await Swal.fire({
          title: 'Import Siswa dari Excel?',
          html: `<p class="font-bold text-slate-700">Ditemukan <b>${dataSiswaBaru.length}</b> siswa yang siap diimpor ke sistem.</p><p class="text-xs text-slate-500 mt-2">Data NISN yang sudah terdaftar akan dilewati otomatis.</p>`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#059669',
          confirmButtonText: 'Ya, Import Sekarang',
          cancelButtonText: 'Batal',
        });

        if (konfirmasi.isConfirmed) {
          setMemuat(true);
          const res = await imporSiswaMassal(sesi.token, dataSiswaBaru);
          setMemuat(false);

          if (res && res.success) {
            Swal.fire(
              'Berhasil Import!',
              res.message || `Berhasil mengimpor data siswa ke sistem.`,
              'success'
            );
            muatSiswa();
          } else {
            Swal.fire('Gagal Import', res?.message || 'Terjadi kesalahan saat menyimpan data.', 'error');
          }
        }
      } catch (err: any) {
        setMemuat(false);
        Swal.fire('Error', 'Gagal membaca file Excel: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    muatKelas();
    muatSiswa();
  }, [filterKelas]);

  const muatKelas = async () => {
    try {
      const k = await ambilDaftarKelas();
      setDaftarKelas(k);
      if (k.length > 0 && !formKelas) {
        setFormKelas(k[0]);
      }
    } catch (error) {
      console.error('Gagal memuat daftar kelas siswa:', error);
      Swal.fire('Gagal', 'Daftar kelas tidak dapat dimuat.', 'error');
    }
  };

  const muatSiswa = async () => {
    setSedangMuatTabel(true);
    try {
      const res = await ambilDaftarSiswa(sesi.token, filterKelas || undefined);
      if (res && res.success && Array.isArray(res.data)) {
        setDaftarSiswa(res.data);
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal memuat data siswa', 'error');
    } finally {
      setSedangMuatTabel(false);
    }
  };

  const bukaModalTambah = () => {
    setSiswaEdit(null);
    setFormNisn('');
    setFormNama('');
    setFormKelas(daftarKelas[0] || '');
    setFormJenisKelamin('L');
    setFormNoHp('');
    setFormPin('');
    setModalBuka(true);
  };

  const bukaModalEdit = (s: DataSiswa) => {
    setSiswaEdit(s);
    setFormNisn(s.nisn);
    setFormNama(s.nama);
    setFormKelas(s.kelas);
    setFormJenisKelamin(s.jenisKelamin === 'P' ? 'P' : 'L');
    setFormNoHp(s.noHp || '');
    setFormPin('');
    setModalBuka(true);
  };

  const tanganiSimpanSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNisn.trim() || !formNama.trim() || !formKelas.trim() || (!siswaEdit && formPin.trim().length < 4)) {
      Swal.fire('Perhatian', siswaEdit ? 'NISN, Nama, dan Kelas wajib diisi.' : 'NISN, Nama, Kelas, dan PIN minimal 4 angka wajib diisi.', 'warning');
      return;
    }

    const payload: DataSiswa = {
      nisn: formNisn.trim(),
      nama: formNama.trim(),
      kelas: formKelas.trim(),
      jenisKelamin: formJenisKelamin,
      noHp: formNoHp.trim(),
      pin: formPin.trim(),
    };

    setMemuat(true);
    try {
      const res = siswaEdit
        ? await perbaruiDataSiswa(sesi.token, payload)
        : await simpanSiswaBaru(sesi.token, payload);

      setMemuat(false);
      if (res && res.success) {
        Swal.fire(
          'Berhasil',
          siswaEdit ? 'Data siswa berhasil diperbarui.' : 'Siswa baru berhasil ditambahkan.',
          'success'
        );
        setModalBuka(false);
        muatSiswa();
      } else {
        Swal.fire('Gagal', res?.message || 'Gagal menyimpan data siswa', 'error');
      }
    } catch (e: any) {
      setMemuat(false);
      Swal.fire('Error', e.message || 'Terjadi kesalahan sistem', 'error');
    }
  };

  const tanganiHapus = async (nisn: string, nama: string) => {
    const res = await Swal.fire({
      title: 'Hapus Siswa?',
      text: `Apakah Anda yakin ingin menghapus siswa ${nama} (${nisn})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });

    if (res.isConfirmed) {
      setMemuat(true);
      try {
        const h = await hapusDataSiswa(sesi.token, nisn);
        setMemuat(false);
        if (h && h.success) {
          Swal.fire('Berhasil', 'Data siswa berhasil dihapus', 'success');
          muatSiswa();
        } else {
          Swal.fire('Gagal', h?.message || 'Gagal menghapus siswa', 'error');
        }
      } catch (e: any) {
        setMemuat(false);
        Swal.fire('Error', e.message || 'Terjadi kesalahan sistem', 'error');
      }
    }
  };

  const tanganiResetPin = async (nisn: string, nama: string) => {
    const defaultPin = String(nisn).replace(/\D/g, '').slice(-4) || '1234';
    const konfirmasi = await Swal.fire({
      title: 'Reset PIN Siswa?',
      html: `Apakah Anda ingin mereset PIN login untuk <b>${nama}</b> ke PIN default: <b class="text-indigo-700 bg-slate-100 px-2 py-0.5 rounded font-mono">${defaultPin}</b>?<br><small class="text-slate-500">Siswa dapat langsung menggunakan PIN ini untuk login.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset PIN',
      cancelButtonText: 'Batal',
    });

    if (konfirmasi.isConfirmed) {
      setMemuat(true);
      try {
        const res = await resetPinSiswa(sesi.token, nisn, defaultPin);
        setMemuat(false);
        if (res && res.success) {
          Swal.fire({
            title: 'PIN Berhasil Direset!',
            html: `PIN login untuk <b>${nama}</b> berhasil direset menjadi: <b class="text-xl text-emerald-700 font-mono">${res.data?.pinBaru || defaultPin}</b>`,
            icon: 'success',
          });
        } else {
          Swal.fire('Gagal', res?.message || 'Gagal mereset PIN siswa.', 'error');
        }
      } catch (e: any) {
        setMemuat(false);
        Swal.fire('Error', e.message || 'Kesalahan sistem saat mereset PIN.', 'error');
      }
    }
  };

  const siswaTersaring = daftarSiswa.filter((s) => {
    const cocokNama = s.nama.toLowerCase().includes(kataKunci.toLowerCase());
    const cocokNisn = String(s.nisn).includes(kataKunci);
    return cocokNama || cocokNisn;
  });

  const totalHalaman = Math.ceil(siswaTersaring.length / itemPerHalaman) || 1;
  const siswaTampil = siswaTersaring.slice(
    (halaman - 1) * itemPerHalaman,
    halaman * itemPerHalaman
  );

  return (
    <div className="bg-white  rounded-3xl border border-slate-200/90  shadow-sm overflow-hidden animate-fade-in-up">
      <input
        ref={inputFotoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={tanganiFotoSiswa}
        className="hidden"
      />
      <input
        ref={inputFotoMassalRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={tanganiFotoMassal}
        className="hidden"
      />
      {/* Header bar Kontras Tinggi */}
      <div className="p-5 md:p-6 border-b border-slate-100  flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 ">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-50  border border-indigo-200/80  text-indigo-600  inline-flex shadow-2xs">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-black text-slate-900 ">
              Manajemen Data Siswa
            </h2>
          </div>
          <p className="text-xs md:text-sm font-bold text-slate-600 ">
            Total <span className="text-indigo-600  font-extrabold">{siswaTersaring.length}</span> siswa terdaftar di {IDENTITAS_SEKOLAH.nama}
          </p>
        </div>

        {/* Filter, Search, & Tambah Siswa */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama / NISN..."
              aria-label="Cari nama atau NISN siswa"
              value={kataKunci}
              onChange={(e) => {
                setKataKunci(e.target.value);
                setHalaman(1);
              }}
              className="w-full pl-10 pr-3.5 py-2.5 bg-white  border border-slate-200  rounded-xl text-xs md:text-sm font-bold text-slate-900  outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
            />
          </div>

          <select
            aria-label="Filter siswa berdasarkan kelas"
            value={filterKelas}
            onChange={(e) => {
              setFilterKelas(e.target.value);
              setHalaman(1);
            }}
            className="py-2.5 px-3.5 bg-white  border border-slate-200  rounded-xl text-xs md:text-sm font-bold text-slate-900  outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
          >
            <option value="">Semua Rombel/Kelas</option>
            {daftarKelas.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          {/* Hidden File Input for Excel Import */}
          <input
            type="file"
            ref={inputBerkasRef}
            onChange={tanganiUnggahExcel}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          {/* Tombol Ekspor Data Siswa */}
          <button type="button"
            onClick={eksporSiswaExcel}
            title="Download data siswa saat ini sebagai file Excel"
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50   border border-slate-200  text-slate-700  rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 shadow-2xs tombol-taktil"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {sesi.role === 'admin' && (
            <>
              {/* Unduh Template */}
              <button type="button"
                onClick={unduhTemplateExcel}
                title="Unduh format template Excel untuk import data siswa"
                className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100/80   border border-indigo-200/80  text-indigo-700  rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 shadow-2xs tombol-taktil"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600 " />
                <span className="hidden sm:inline">Template</span>
              </button>

              {/* Import Excel */}
              <button type="button"
                onClick={() => inputBerkasRef.current?.click()}
                title="Import data siswa secara massal dari file Excel"
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm tombol-taktil"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
              </button>
              <button type="button"
                onClick={() => inputFotoMassalRef.current?.click()}
                title="Import banyak foto sekaligus. Nama file harus sama dengan NISN."
                className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100/80   border border-amber-200/80  text-amber-800  rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 shadow-2xs tombol-taktil"
              >
                <Camera className="w-4 h-4 text-amber-600 " />
                <span>Import Foto</span>
              </button>

              {/* Tambah Siswa Manual */}
              <button type="button"
                onClick={bukaModalTambah}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm tombol-taktil"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Siswa</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Indikator Geser Horizontal Khusus Layar Ponsel / Mobile */}
      <div className="sm:hidden px-4 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-700">
        <span className="flex items-center gap-1.5">
          <span>👈</span>
          <span>Geser horizontal untuk melihat data lengkap</span>
          <span>👉</span>
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100/90 text-indigo-800 font-extrabold">{siswaTersaring.length} Siswa</span>
      </div>

      {/* Tabel Siswa Kontras Tinggi */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-800 tabel-kontras-tinggi">
          <thead className="bg-slate-50  border-b border-slate-200  font-extrabold text-slate-700  uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 text-center w-14">No</th>
              <th className="p-4">Identitas Siswa</th>
              <th className="p-4">NISN</th>
              <th className="p-4">Rombel</th>
              <th className="p-4">L/P</th>
              <th className="p-4">No. HP</th>
              <th className="p-4 text-center w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 ">
            {sedangMuatTabel ? (
              <>
                <SkeletonBarisTabel kolom={7} />
                <SkeletonBarisTabel kolom={7} />
                <SkeletonBarisTabel kolom={7} />
                <SkeletonBarisTabel kolom={7} />
                <SkeletonBarisTabel kolom={7} />
              </>
            ) : siswaTampil.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-400 font-bold text-base">
                  Tidak ada data siswa ditemukan.
                </td>
              </tr>
            ) : (
              siswaTampil.map((s, idx) => (
                <tr key={s.nisn} className="hover:bg-slate-50/70  transition-colors baris-stagger">
                  <td className="p-4 text-center font-mono text-slate-500 font-bold text-sm">
                    {(halaman - 1) * itemPerHalaman + idx + 1}
                  </td>
                  <td className="p-4 font-black text-slate-900  text-sm md:text-base">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200  bg-slate-100 ">
                        {ambilFotoProfil(s.nisn) ? (
                          <img src={ambilFotoProfil(s.nisn) || ''} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-black text-slate-400">
                            {s.nama.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span>{s.nama}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-600  text-xs md:text-sm">
                    {s.nisn}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50  text-indigo-700  font-bold text-xs border border-indigo-200/80 ">
                      {s.kelas}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-700 ">{s.jenisKelamin}</td>
                  <td className="p-4 text-slate-600  font-mono font-bold text-xs">{s.noHp || '-'}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button"
                        onClick={() => bukaKartuSiswa(s)}
                        className="p-2 rounded-xl text-indigo-700  bg-indigo-50/80 hover:bg-indigo-100   border border-indigo-200/80  transition-all shadow-2xs tombol-taktil"
                        title="Lihat Kartu Tanda Pelajar & QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button type="button"
                        onClick={() => {
                          setTargetFotoNisn(s.nisn);
                          inputFotoRef.current?.click();
                        }}
                        className="p-2 rounded-xl text-cyan-700  bg-cyan-50/80 hover:bg-cyan-100   border border-cyan-200/80  transition-all shadow-2xs tombol-taktil"
                        title="Ganti foto siswa/siswi"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <button type="button"
                        onClick={() => tanganiResetPin(s.nisn, s.nama)}
                        className="p-2 rounded-xl text-emerald-700  bg-emerald-50/80 hover:bg-emerald-100   border border-emerald-200/80  transition-all shadow-2xs tombol-taktil"
                        title="Reset PIN Siswa ke Default"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button type="button"
                        onClick={() => bukaModalEdit(s)}
                        className="p-2 rounded-xl text-amber-700  bg-amber-50/80 hover:bg-amber-100   border border-amber-200/80  transition-all shadow-2xs tombol-taktil"
                        title="Edit Data Siswa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button type="button"
                        onClick={() => tanganiHapus(s.nisn, s.nama)}
                        className="p-2 rounded-xl text-rose-700  bg-rose-50/80 hover:bg-rose-100   border border-rose-200/80  transition-all shadow-2xs tombol-taktil"
                        title="Hapus Siswa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginasi Bar */}
      <div className="p-4 md:p-5 border-t-2 border-slate-200 flex items-center justify-between text-sm font-black text-slate-800 bg-slate-50/50">
        <span>
          Halaman {halaman} dari {totalHalaman}
        </span>
        <div className="flex gap-2">
          <button type="button"
            onClick={() => setHalaman((p) => Math.max(1, p - 1))}
            disabled={halaman <= 1}
            className="px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-black text-xs shadow-xs tombol-taktil"
          >
            Sebelumnya
          </button>
          <button type="button"
            onClick={() => setHalaman((p) => Math.min(totalHalaman, p + 1))}
            disabled={halaman >= totalHalaman}
            className="px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-black text-xs shadow-xs tombol-taktil"
          >
            Berikutnya
          </button>
        </div>
      </div>

      {/* Modal Tambah / Edit Siswa */}
      {modalBuka && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div
            ref={dialogSiswaRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-form-siswa-title"
            tabIndex={-1}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-slate-300"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 id="dialog-form-siswa-title" className="font-bold text-sm text-slate-800">
                {siswaEdit ? 'Perbarui Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button type="button"
                onClick={() => setModalBuka(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Tutup formulir data siswa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={tanganiSimpanSiswa} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="field-datasiswa-744" className="font-bold text-slate-700 block mb-1">NISN Siswa</label>
                <input id="field-datasiswa-744"
                  type="text"
                  required
                  disabled={!!siswaEdit}
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  placeholder="Contoh: 0071234567"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label htmlFor="field-datasiswa-757" className="font-bold text-slate-700 block mb-1">Nama Lengkap Siswa</label>
                <input id="field-datasiswa-757"
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Nama lengkap siswa"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="field-datasiswa-770" className="font-bold text-slate-700 block mb-1">Kelas</label>
                  <select id="field-datasiswa-770"
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none"
                  >
                    {daftarKelas.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="field-datasiswa-785" className="font-bold text-slate-700 block mb-1">Jenis Kelamin</label>
                  <select id="field-datasiswa-785"
                    value={formJenisKelamin}
                    onChange={(e) => setFormJenisKelamin(e.target.value as 'L' | 'P')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="field-datasiswa-798" className="font-bold text-slate-700 block mb-1">Nomor WhatsApp / HP</label>
                <input id="field-datasiswa-798"
                  type="text"
                  value={formNoHp}
                  onChange={(e) => setFormNoHp(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label htmlFor="field-datasiswa-809" className="font-bold text-slate-700 block mb-1">PIN Login Siswa</label>
                <input id="field-datasiswa-809"
                  type="password"
                  inputMode="numeric"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder={siswaEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 4 angka'}
                  minLength={siswaEdit ? undefined : 4}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  PIN disimpan sebagai hash dan tidak dapat dilihat kembali.
                </p>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalBuka(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  {siswaEdit ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Barcode & QR Code Presensi Siswa */}
      {siswaTerpilihKartu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div
            ref={dialogKartuRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-kartu-siswa-title"
            tabIndex={-1}
            className="area-cetak-presensi bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-center"
          >
            
            {/* Header Dialog */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg">
                  <QrCode className="w-5 h-5" />
                </span>
                <h3 id="dialog-kartu-siswa-title" className="font-black text-base text-slate-800 text-left">
                  Kode Presensi Siswa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSiswaTerpilihKartu(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Tutup kartu kode presensi siswa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identitas Siswa */}
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                {siswaTerpilihKartu.nama}
              </h4>
              <p className="text-xs font-bold text-slate-500">
                NISN: <span className="font-mono text-indigo-700 font-black">{siswaTerpilihKartu.nisn}</span> • Kelas: <span className="text-slate-800 font-black">{siswaTerpilihKartu.kelas}</span>
              </p>
            </div>

            {/* QR Code Presensi */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs inline-block">
                {qrModalUrl ? (
                  <img
                    src={qrModalUrl}
                    alt={`QR Presensi ${siswaTerpilihKartu.nisn}`}
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs font-bold text-slate-400">
                    Memuat QR...
                  </div>
                )}
                <p className="font-mono text-xs font-black text-indigo-950 tracking-wider mt-2">
                  {siswaTerpilihKartu.nisn}
                </p>
              </div>
            </div>

            {/* Barcode 1D Siswa */}
            <div className="inline-block bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-center gap-0.5 h-8 px-2">
                {Array.from({ length: 36 }).map((_, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-900 inline-block h-full"
                    style={{
                      width: idx % 3 === 0 ? '3px' : idx % 2 === 0 ? '1.5px' : '2px',
                      opacity: idx % 5 === 0 ? 0.8 : 1,
                    }}
                  />
                ))}
              </div>
              <p className="font-mono text-[10px] font-bold text-slate-700 tracking-wider mt-1">
                *{siswaTerpilihKartu.nisn}*
              </p>
            </div>

            {/* Tombol Aksi */}
            <div className="flex gap-2.5 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => {
                  if (qrModalUrl) {
                    const a = document.createElement('a');
                    a.href = qrModalUrl;
                    const namaBersih = String(siswaTerpilihKartu.nama || siswaTerpilihKartu.nisn).replace(/[^a-zA-Z0-9]/g, '_');
                    a.download = `QR_Presensi_${siswaTerpilihKartu.nisn}_${namaBersih}.png`;
                    a.click();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm tombol-taktil"
                title="Unduh berkas gambar QR Code"
              >
                <Download className="w-4 h-4" />
                <span>Simpan QR</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border-2 border-slate-300 text-slate-800 hover:bg-slate-50 font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs tombol-taktil"
                title="Cetak kode presensi"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
