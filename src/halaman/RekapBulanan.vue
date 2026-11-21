<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { ambilDaftarKelas } from '@/layanan/LayananSiswa';
import { ambilLaporanBulanan, unduhLaporanExcel } from '@/layanan/LayananAbsensi';
import { sanitasiFormulaExcel } from '@/utilitas/Validasi';
import { IDENTITAS_SEKOLAH } from '@/settings';

const props = defineProps<{
  setMemuat: (memuat: boolean) => void;
}>();

interface StatistikRekap {
  h?: number | string;
  s?: number | string;
  i?: number | string;
  a?: number | string;
  effectiveDays?: number | string;
  percent?: number | string;
}

interface DataRekap {
  nama?: string;
  kelas?: string;
  hadir?: number | string;
  sakit?: number | string;
  izin?: number | string;
  alpa?: number | string;
  hariEfektif?: number | string;
  persen?: number | string;
  stats?: StatistikRekap;
}

const daftarBulan = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const sekarang = new Date();
const bulan = ref(sekarang.getMonth() + 1);
const tahun = ref(sekarang.getFullYear());
const daftarKelas = ref<string[]>([]);
const kelasTerpilih = ref('');
const dataRekap = ref<DataRekap[]>([]);
const sedangMuatTabel = ref(false);

function pesanError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function adalahObjek(nilai: unknown): nilai is Record<string, unknown> {
  return typeof nilai === 'object' && nilai !== null && !Array.isArray(nilai);
}

function nilaiRekap(nilai: unknown, cadangan: unknown): number | string {
  const hasil = nilai ?? cadangan ?? 0;
  return typeof hasil === 'number' || typeof hasil === 'string' ? hasil : 0;
}

function normalisasiRekap(nilai: unknown): DataRekap {
  const item = adalahObjek(nilai) ? nilai : {};
  const stats = adalahObjek(item.stats) ? item.stats : {};
  const nama = typeof item.nama === 'string' ? item.nama : undefined;
  const kelas = typeof item.kelas === 'string' ? item.kelas : undefined;
  const persen = item.persen ?? `${stats.percent ?? 0}%`;

  return {
    nama,
    kelas,
    hadir: nilaiRekap(item.hadir, stats.h),
    sakit: nilaiRekap(item.sakit, stats.s),
    izin: nilaiRekap(item.izin, stats.i),
    alpa: nilaiRekap(item.alpa, stats.a),
    hariEfektif: nilaiRekap(item.hariEfektif, stats.effectiveDays),
    persen: typeof persen === 'number' || typeof persen === 'string' ? persen : '0%',
  };
}

async function muatKelas(): Promise<void> {
  try {
    daftarKelas.value = await ambilDaftarKelas();
  } catch (error) {
    console.error('Gagal memuat daftar kelas untuk rekap:', error);
    await Swal.fire('Gagal', 'Daftar kelas tidak dapat dimuat.', 'error');
  }
}

async function muatRekap(): Promise<void> {
  sedangMuatTabel.value = true;
  try {
    const hasil: unknown = await ambilLaporanBulanan(
      bulan.value,
      tahun.value,
      kelasTerpilih.value,
    );
    if (adalahObjek(hasil) && hasil.success) {
      const data = Array.isArray(hasil.data)
        ? hasil.data
        : adalahObjek(hasil.data) && Array.isArray(hasil.data.students)
          ? hasil.data.students
          : [];
      dataRekap.value = data.map(normalisasiRekap);
    } else {
      dataRekap.value = [];
    }
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Gagal memuat rekap bulanan', 'error');
  } finally {
    sedangMuatTabel.value = false;
  }
}

function eksporExcelLangsung(): void {
  if (dataRekap.value.length === 0) {
    void Swal.fire(
      'Perhatian',
      'Silakan klik "Tampilkan Rekap" terlebih dahulu untuk memuat data.',
      'warning',
    );
    return;
  }

  try {
    const namaBulan = daftarBulan[bulan.value - 1] || String(bulan.value);
    const dataEkspor = dataRekap.value.map((baris, indeks) => ({
      No: indeks + 1,
      'Nama Siswa': sanitasiFormulaExcel(baris.nama || ''),
      Kelas: sanitasiFormulaExcel(baris.kelas || ''),
      Hadir: baris.hadir || 0,
      Sakit: baris.sakit || 0,
      Izin: baris.izin || 0,
      Alpa: baris.alpa || 0,
      'Hari Efektif': baris.hariEfektif || 0,
      Persentase: baris.persen || '0%',
    }));
    const lembarKerja = XLSX.utils.json_to_sheet(dataEkspor);
    const bukuKerja = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(bukuKerja, lembarKerja, `Rekap ${namaBulan}`);
    const namaFile = `Rekap_Absensi_${namaBulan}_${tahun.value}_${kelasTerpilih.value || 'Semua_Kelas'}.xlsx`;
    XLSX.writeFile(bukuKerja, namaFile);
    void Swal.fire(
      'Sukses',
      `File Excel rekap ${namaBulan} ${tahun.value} berhasil diunduh.`,
      'success',
    );
  } catch (error) {
    void Swal.fire('Error', `Gagal membuat file Excel: ${pesanError(error)}`, 'error');
  }
}

async function tanganiUnduhExcel(): Promise<void> {
  props.setMemuat(true);
  try {
    const hasil = await unduhLaporanExcel('laporan_bulanan', {
      bulan: bulan.value,
      tahun: tahun.value,
      kelas: kelasTerpilih.value,
    });
    if (hasil?.success && hasil.data?.url) {
      window.open(hasil.data.url, '_blank');
    } else if (dataRekap.value.length > 0) {
      eksporExcelLangsung();
    } else {
      await Swal.fire('Gagal', hasil?.message || 'Gagal membuat file Excel', 'error');
    }
  } catch (error) {
    if (dataRekap.value.length > 0) {
      eksporExcelLangsung();
    } else {
      await Swal.fire('Error', pesanError(error) || 'Terjadi kesalahan sistem', 'error');
    }
  } finally {
    props.setMemuat(false);
  }
}

onMounted(() => {
  void muatKelas();
});
</script>

<template>
  <section
    class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm animate-fade-in-up"
    aria-labelledby="judul-rekap-bulanan"
    :aria-busy="sedangMuatTabel"
  >
    <header
      class="flex flex-col items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center md:p-6"
    >
      <div>
        <div class="mb-1 flex items-center gap-2">
          <span
            class="inline-flex rounded-xl border border-indigo-200/80 bg-indigo-50 p-2 text-indigo-600 shadow-2xs"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h2M14 13h2M8 17h2M14 17h2" />
            </svg>
          </span>
          <h2 id="judul-rekap-bulanan" class="text-lg font-black text-slate-900 md:text-xl">
            Laporan Rekap Bulanan Absensi
          </h2>
        </div>
        <p class="text-xs font-medium text-slate-600 md:text-sm">
          Akumulasi persentase kehadiran siswa per bulan {{ IDENTITAS_SEKOLAH.nama }}.
        </p>
      </div>

      <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <button
          v-if="dataRekap.length > 0"
          type="button"
          class="tombol-taktil flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 md:text-sm"
          @click="eksporExcelLangsung"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 text-slate-500" aria-hidden="true">
            <path d="M12 2v8m4-4-4 4-4-4M2 14h20v6H2zM6 17h.01M10 17h.01" />
          </svg>
          <span>Unduh .xlsx Langsung</span>
        </button>
        <button
          type="button"
          class="tombol-taktil flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 md:px-5 md:text-sm"
          @click="tanganiUnduhExcel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3" />
          </svg>
          <span>Export File Excel</span>
        </button>
      </div>
    </header>

    <div class="flex flex-wrap items-end gap-4 border-b border-slate-100 bg-slate-50/70 p-4 md:p-5">
      <div>
        <label
          for="field-rekapbulanan-179"
          class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          Pilih Bulan
        </label>
        <select
          id="field-rekapbulanan-179"
          v-model.number="bulan"
          class="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
        >
          <option v-for="(namaBulan, indeks) in daftarBulan" :key="namaBulan" :value="indeks + 1">
            {{ namaBulan }}
          </option>
        </select>
      </div>

      <div>
        <label
          for="field-rekapbulanan-196"
          class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          Tahun
        </label>
        <input
          id="field-rekapbulanan-196"
          v-model.number="tahun"
          type="number"
          class="w-28 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
        />
      </div>

      <div>
        <label
          for="field-rekapbulanan-208"
          class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          Filter Rombel / Kelas
        </label>
        <select
          id="field-rekapbulanan-208"
          v-model="kelasTerpilih"
          class="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
        >
          <option value="">Semua Rombel/Kelas</option>
          <option v-for="kelas in daftarKelas" :key="kelas" :value="kelas">
            {{ kelas }}
          </option>
        </select>
      </div>

      <button
        type="button"
        class="tombol-taktil flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 md:text-sm"
        :disabled="sedangMuatTabel"
        @click="muatRekap"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span>{{ sedangMuatTabel ? 'Memuat Rekap...' : 'Tampilkan Rekap' }}</span>
      </button>
    </div>

    <!-- Indikator Geser Horizontal Khusus Layar Ponsel / Mobile -->
    <div class="flex sm:hidden items-center justify-between border-b border-indigo-100 bg-indigo-50/70 px-4 py-2 text-xs font-bold text-indigo-700">
      <span class="flex items-center gap-1.5">
        <span>👈</span>
        <span>Geser horizontal untuk kolom statistik lengkap</span>
        <span>👉</span>
      </span>
      <span class="rounded-full bg-indigo-100/90 px-2 py-0.5 text-[11px] font-extrabold text-indigo-800">
        {{ dataRekap.length }} Siswa
      </span>
    </div>

    <div class="overflow-x-auto">
      <table class="tabel-kontras-tinggi w-full text-left text-sm text-slate-800">
        <thead class="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-700">
          <tr>
            <th scope="col" class="w-14 p-4 text-center">No</th>
            <th scope="col" class="p-4">Identitas Siswa</th>
            <th scope="col" class="p-4">Rombel</th>
            <th scope="col" class="p-4 text-center text-emerald-900">Hadir</th>
            <th scope="col" class="p-4 text-center text-amber-900">Sakit</th>
            <th scope="col" class="p-4 text-center text-sky-900">Izin</th>
            <th scope="col" class="p-4 text-center text-rose-900">Alpa</th>
            <th scope="col" class="p-4 text-center text-slate-900">Hari Efektif</th>
            <th scope="col" class="p-4 text-center text-indigo-950">Persentase</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <template v-if="sedangMuatTabel">
            <tr v-for="baris in 5" :key="baris" aria-hidden="true">
              <td v-for="kolom in 9" :key="kolom" class="p-4">
                <span class="block h-4 animate-pulse rounded bg-slate-200" />
              </td>
            </tr>
          </template>
          <tr v-else-if="dataRekap.length === 0">
            <td colspan="9" class="py-16 text-center text-base font-bold text-slate-500">
              Pilih bulan dan klik "Tampilkan Rekap" untuk memuat rekapitulasi kehadiran.
            </td>
          </tr>
          <tr
            v-for="(baris, indeks) in dataRekap"
            v-else
            :key="`${baris.nama || 'siswa'}-${baris.kelas || 'kelas'}-${indeks}`"
            class="baris-stagger transition-colors hover:bg-slate-50/70"
          >
            <td class="p-4 text-center font-mono text-sm font-black text-slate-700">{{ indeks + 1 }}</td>
            <td class="p-4 text-sm font-black text-slate-900 md:text-base">{{ baris.nama }}</td>
            <td class="p-4 text-sm font-black text-slate-800">{{ baris.kelas }}</td>
            <td class="p-4 text-center text-base font-black text-emerald-800">{{ baris.hadir || 0 }}</td>
            <td class="p-4 text-center text-base font-black text-amber-800">{{ baris.sakit || 0 }}</td>
            <td class="p-4 text-center text-base font-black text-sky-800">{{ baris.izin || 0 }}</td>
            <td class="p-4 text-center text-base font-black text-rose-800">{{ baris.alpa || 0 }}</td>
            <td class="p-4 text-center text-base font-black text-slate-800">{{ baris.hariEfektif || 0 }}</td>
            <td class="bg-indigo-50/40 p-4 text-center text-base font-black">
              <span class="inline-block rounded-xl border border-indigo-300 bg-indigo-100 px-3 py-1 font-black text-indigo-950">
                {{ baris.persen || '0%' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
