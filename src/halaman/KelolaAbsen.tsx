import React, { useState, useEffect } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import { ambilMasterKelas } from '@/layanan/LayananKelas';
import { ambilSiswaPerKelas } from '@/layanan/LayananSiswa';
import { perbaruiStatusAbsenManual } from '@/layanan/LayananJadwal';
import { dapatkanTanggalHariIni } from '@/utilitas/Tanggal';
import { IDENTITAS_SEKOLAH } from '@/settings';
import {
  Edit3,
  Printer,
} from 'lucide-react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface PropertiKelolaAbsen {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

interface KonfigurasiKartu {
  namaSekolah: string;
  judul: string;
  deskripsi: string;
  alamat: string;
  namaKepalaSekolah: string;
  jabatanKepalaSekolah: string;
  tahun: string;
  catatanBawah: string;
  warna: string;
  logo: string;
  judulBelakang: string;
  deskripsiBelakang: string;
}

const KONFIGURASI_KARTU_DEFAULT: KonfigurasiKartu = {
  namaSekolah: IDENTITAS_SEKOLAH.nama,
  judul: 'KARTU BARCODE',
  deskripsi: 'Sistem Absensi Digital Sekolah',
  alamat: `${IDENTITAS_SEKOLAH.alamat}, ${IDENTITAS_SEKOLAH.kabupaten}, ${IDENTITAS_SEKOLAH.provinsi}`,
  namaKepalaSekolah: `${IDENTITAS_SEKOLAH.kepalaSekolah.nama}, ${IDENTITAS_SEKOLAH.kepalaSekolah.gelar}`,
  jabatanKepalaSekolah: IDENTITAS_SEKOLAH.kepalaSekolah.jabatan,
  tahun: String(IDENTITAS_SEKOLAH.tahunKalender),
  catatanBawah: 'Kartu identitas resmi siswa',
  warna: '#12304a',
  logo: IDENTITAS_SEKOLAH.logo,
  judulBelakang: 'TATA TERTIB & KETENTUAN KARTU BARCODE',
  deskripsiBelakang:
    `Kartu barcode ini adalah kartu pengenal resmi siswa ${IDENTITAS_SEKOLAH.nama}.\nDigunakan untuk keperluan administrasi, perpustakaan, dan presensi.\nTidak boleh dipindahtangankan atau disalahgunakan oleh pihak lain.\nJika hilang atau rusak, wajib segera melapor kepada pihak sekolah.\nPenemu kartu ini harap mengembalikannya ke ${IDENTITAS_SEKOLAH.nama}.`,
};

export const HalamanKelolaAbsen: React.FC<PropertiKelolaAbsen> = ({ sesi, setMemuat }) => {
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [kelasTerpilih, setKelasTerpilih] = useState('');
  const [tanggal, setTanggal] = useState(dapatkanTanggalHariIni());
  const [daftarSiswa, setDaftarSiswa] = useState<any[]>([]);
  const [konfigurasiKartu] = useState<KonfigurasiKartu>(
    KONFIGURASI_KARTU_DEFAULT
  );

  useEffect(() => {
    muatKelas();
  }, []);

  useEffect(() => {
    if (kelasTerpilih) {
      muatSiswa();
    }
  }, [kelasTerpilih]);

  const muatKelas = async () => {
    try {
      const k = await ambilMasterKelas();
      setDaftarKelas(k);
      if (k.length > 0) setKelasTerpilih(k[0]);
    } catch (error) {
      console.error('Gagal memuat kelas kartu/presensi:', error);
      Swal.fire('Gagal', 'Daftar kelas tidak dapat dimuat.', 'error');
    }
  };

  const muatSiswa = async () => {
    setMemuat(true);
    try {
      const list = await ambilSiswaPerKelas(kelasTerpilih);
      setDaftarSiswa(list);
      setMemuat(false);
    } catch (error) {
      console.error('Gagal memuat siswa kartu/presensi:', error);
      setMemuat(false);
      Swal.fire('Gagal', 'Data siswa tidak dapat dimuat.', 'error');
    }
  };

  const ubahStatusSiswa = async (nisn: string, nama: string, statusBaru: string) => {
    const konfirmasi = await Swal.fire({
      title: 'Ubah Presensi Siswa?',
      text: `Ubah kehadiran ${nama} pada tanggal ${tanggal} menjadi "${statusBaru}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Ya, Ubah',
      cancelButtonText: 'Batal',
    });

    if (konfirmasi.isConfirmed) {
      setMemuat(true);
      try {
        const res = await perbaruiStatusAbsenManual(
          sesi.token,
          nisn,
          nama,
          kelasTerpilih,
          statusBaru,
          tanggal
        );
        setMemuat(false);
        if (res && res.success) {
          Swal.fire('Berhasil', 'Status kehadiran siswa berhasil diubah.', 'success');
        } else {
          Swal.fire('Gagal', res?.message || 'Gagal mengubah status', 'error');
        }
      } catch (e: any) {
        setMemuat(false);
        Swal.fire('Error', e.message || 'Kesalahan server', 'error');
      }
    }
  };

  const cetakKartuPdf = async () => {
    if (daftarSiswa.length === 0) {
      Swal.fire('Perhatian', 'Pilih kelas dengan data siswa terlebih dahulu.', 'warning');
      return;
    }

    setMemuat(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const cardWidth = 85;
      const cardHeight = 52;
      const marginX = 15;
      const marginY = 22;
      const gapX = 10;
      const gapY = 8;
      const cols = 2;
      const rows = 4;
      const cardsPerPage = cols * rows;

      // Draw header on first page
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`KARTU TANDA PELAJAR - KELAS ${kelasTerpilih}`, 15, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${konfigurasiKartu.namaSekolah} • ${konfigurasiKartu.alamat} • Tahun ${konfigurasiKartu.tahun}`, 15, 17);
      doc.setFontSize(7);
      doc.text(`${konfigurasiKartu.deskripsi} • ${konfigurasiKartu.jabatanKepalaSekolah}: ${konfigurasiKartu.namaKepalaSekolah} • Total: ${daftarSiswa.length} Siswa`, 15, 21);

      for (let i = 0; i < daftarSiswa.length; i++) {
        const s = daftarSiswa[i];
        const pageIndex = Math.floor(i / cardsPerPage);
        const cardIndexOnPage = i % cardsPerPage;

        if (i > 0 && cardIndexOnPage === 0) {
          doc.addPage();
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(`KARTU BARCODE - KELAS ${kelasTerpilih} (Hal. ${pageIndex + 1})`, 15, 12);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(`${konfigurasiKartu.namaSekolah} • ${konfigurasiKartu.alamat} • Tahun ${konfigurasiKartu.tahun}`, 15, 17);
          doc.setFontSize(7);
          doc.text(`${konfigurasiKartu.deskripsi} • ${konfigurasiKartu.jabatanKepalaSekolah}: ${konfigurasiKartu.namaKepalaSekolah}`, 15, 21);
        }

        const col = cardIndexOnPage % cols;
        const row = Math.floor(cardIndexOnPage / cols);
        const x = marginX + col * (cardWidth + gapX);
        const y = marginY + row * (cardHeight + gapY);

        // Card border & background
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

        // Card top header bar
        doc.setFillColor(30, 27, 75); // indigo-950
        doc.roundedRect(x, y, cardWidth, 11, 3, 3, 'F');
        doc.rect(x, y + 6, cardWidth, 5, 'F');

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(konfigurasiKartu.namaSekolah.substring(0, 28), x + 5, y + 5.5);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(251, 191, 36); // amber-400
        doc.text(konfigurasiKartu.judul.substring(0, 28), x + 5, y + 9);

        // Student Info on Left
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        const namaTampil = s.nama.length > 20 ? s.nama.substring(0, 18) + '...' : s.nama;
        doc.text(namaTampil, x + 5, y + 18);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('NISN:', x + 5, y + 24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(s.nisn || '-'), x + 16, y + 24);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Kelas:', x + 5, y + 30);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(s.kelas || kelasTerpilih), x + 16, y + 30);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Gender:', x + 5, y + 36);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(s.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki', x + 18, y + 36);

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(konfigurasiKartu.deskripsi.substring(0, 32), x + 5, y + 42);

        // Footer note on card
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(konfigurasiKartu.catatanBawah.substring(0, 35), x + 5, y + 47);

        // Generate QR Code image
        try {
          const qrDataUrl = await QRCode.toDataURL(String(s.nisn || ''), {
            margin: 1,
            width: 200,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'H',
          });
          const qrX = x + cardWidth - 28;
          const qrY = y + 14;
          const qrSize = 23;
          doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

          doc.setFontSize(5.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(79, 70, 229);
          doc.text(String(s.nisn || ''), qrX + 3, qrY + qrSize + 4);
        } catch (error) {
          console.warn('QR siswa tidak dapat ditambahkan ke PDF:', error);
        }
      }

      doc.save(`Kartu_Barcode_${kelasTerpilih}_2026.pdf`);
      setMemuat(false);
      Swal.fire({
        title: 'Sukses Cetak PDF!',
        text: `Berhasil membuat file PDF Kartu Barcode untuk ${daftarSiswa.length} siswa kelas ${kelasTerpilih}.`,
        icon: 'success',
      });
    } catch (e: any) {
      setMemuat(false);
      Swal.fire('Error', 'Gagal membuat file PDF kartu: ' + e.message, 'error');
    }
  };

  return (
    <div className="bg-white  rounded-3xl border border-slate-200/90  shadow-sm overflow-hidden animate-fade-in-up">
      <div className="p-5 md:p-6 border-b border-slate-100  flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 ">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-50  border border-indigo-200/80  text-indigo-600  inline-flex shadow-2xs">
              <Edit3 className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-black text-slate-900 ">
              Kelola Presensi &amp; Kode Absensi Siswa
            </h2>
          </div>
          <p className="text-xs md:text-sm font-medium text-slate-600 ">
            Perbaikan status presensi tanggal lampau dan cetak kode QR &amp; barcode presensi siswa per kelas.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={cetakKartuPdf}
            className="px-4 md:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 shadow-sm tombol-taktil"
            title="Cetak lembar kode QR &amp; Barcode presensi untuk seluruh siswa di kelas terpilih"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak QR &amp; Barcode Kelas (PDF)</span>
          </button>
        </div>
      </div>

      {/* Filter Kontras Tinggi */}
      <div className="p-4 md:p-5 bg-slate-50/70  border-b border-slate-100  flex flex-wrap gap-4 items-center">
        <div>
          <label htmlFor="field-kelolaabsen-315" className="text-xs font-bold text-slate-700  uppercase tracking-wider block mb-1">
            Pilih Tanggal Presensi
          </label>
          <input id="field-kelolaabsen-315"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="px-4 py-2.5 bg-white  border border-slate-200  rounded-xl text-sm font-bold text-slate-900  outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
          />
        </div>

        <div>
          <label htmlFor="field-kelolaabsen-327" className="text-xs font-bold text-slate-700  uppercase tracking-wider block mb-1">
            Pilih Rombel / Kelas
          </label>
          <select id="field-kelolaabsen-327"
            value={kelasTerpilih}
            onChange={(e) => setKelasTerpilih(e.target.value)}
            className="px-4 py-2.5 bg-white  border border-slate-200  rounded-xl text-sm font-bold text-slate-900  outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
          >
            {daftarKelas.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Indikator Geser Horizontal Khusus Layar Ponsel / Mobile */}
      <div className="sm:hidden px-4 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-700">
        <span className="flex items-center gap-1.5">
          <span>👈</span>
          <span>Geser horizontal untuk melihat status kehadiran</span>
          <span>👉</span>
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100/90 text-indigo-800 font-extrabold">{daftarSiswa.length} Siswa</span>
      </div>

      {/* Tabel Kelola Presensi Kontras Tinggi */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-800 tabel-kontras-tinggi">
          <thead className="bg-slate-50  border-b border-slate-200  font-extrabold text-slate-700  uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 text-center w-14">No</th>
              <th className="p-4">Identitas Siswa</th>
              <th className="p-4">NISN Siswa</th>
              <th className="p-4 text-center">Koreksi Status Kehadiran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 ">
            {daftarSiswa.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-16 text-slate-400 font-bold text-base">
                  Tidak ada data siswa ditemukan di rombel ini.
                </td>
              </tr>
            ) : (
              daftarSiswa.map((s, idx) => (
                <tr key={s.nisn} className="hover:bg-slate-50/70  transition-colors">
                  <td className="p-4 text-center text-slate-500 font-bold text-sm font-mono">{idx + 1}</td>
                  <td className="p-4 font-black text-slate-900  text-sm md:text-base">{s.nama}</td>
                  <td className="p-4 font-mono font-bold text-slate-600  text-xs md:text-sm">{s.nisn}</td>
                  <td className="p-4 text-center">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button type="button"
                        onClick={() => ubahStatusSiswa(s.nisn, s.nama, 'Hadir')}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800   font-bold rounded-xl text-xs sm:text-sm border border-emerald-200/80  hover:border-emerald-600 transition-all shadow-2xs tombol-taktil"
                      >
                        Hadir
                      </button>
                      <button type="button"
                        onClick={() => ubahStatusSiswa(s.nisn, s.nama, 'Sakit')}
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800   font-bold rounded-xl text-xs sm:text-sm border border-amber-200/80  hover:border-amber-600 transition-all shadow-2xs tombol-taktil"
                      >
                        Sakit
                      </button>
                      <button type="button"
                        onClick={() => ubahStatusSiswa(s.nisn, s.nama, 'Izin')}
                        className="px-3.5 py-2 bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-800   font-bold rounded-xl text-xs sm:text-sm border border-sky-200/80  hover:border-sky-600 transition-all shadow-2xs tombol-taktil"
                      >
                        Izin
                      </button>
                      <button type="button"
                        onClick={() => ubahStatusSiswa(s.nisn, s.nama, 'Alpa')}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-800   font-bold rounded-xl text-xs sm:text-sm border border-rose-200/80  hover:border-rose-600 transition-all shadow-2xs tombol-taktil"
                      >
                        Alpa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
