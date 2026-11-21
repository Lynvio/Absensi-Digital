<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
  ambilDaftarGuru,
  hapusDataGuru,
  imporGuruMassal,
  simpanGuruBaru,
} from '@/layanan/LayananGuru';
import { ambilMasterKelas } from '@/layanan/LayananKelas';
import type { DataGuru, InputAkunGuru } from '@/tipe/Guru';
import { sanitasiFormulaExcel } from '@/utilitas/Validasi';
import { IDENTITAS_SEKOLAH } from '@/settings';

const props = defineProps<{
  token: string;
  setMemuat: (memuat: boolean) => void;
}>();

type PeranAkun = 'guru' | 'admin' | 'wakel';

const daftarGuru = ref<DataGuru[]>([]);
const daftarKelas = ref<string[]>([]);
const kataKunci = ref('');
const sedangMuatTabel = ref(false);
const modalBuka = ref(false);
const formUsername = ref('');
const formPassword = ref('');
const formRole = ref<PeranAkun>('guru');
const kelasTerpilih = ref<string[]>([]);
const inputBerkasRef = ref<HTMLInputElement | null>(null);
const dialogGuruRef = ref<HTMLElement | null>(null);
const tersaring = computed(() => {
  const kueri = kataKunci.value.toLowerCase();
  return daftarGuru.value.filter((guru) => guru.username.toLowerCase().includes(kueri));
});

const PEMILIH_FOKUS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');
let fokusSebelumnya: HTMLElement | null = null;

function pesanError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function teksNilai(nilai: unknown): string {
  return nilai === undefined || nilai === null ? '' : String(nilai).trim();
}

function kelasPeran(peran: string): string {
  if (peran === 'admin') return 'border-purple-200 bg-purple-50 text-purple-700';
  if (peran === 'wakel') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function labelPeran(peran: string): string {
  if (peran === 'admin') return 'Administrator';
  if (peran === 'wakel') return 'Waka Kesiswaan';
  return 'Guru Pengajar';
}

function warnaTitikPeran(peran: string): string {
  if (peran === 'admin') return 'bg-purple-500';
  if (peran === 'wakel') return 'bg-sky-500';
  return 'bg-emerald-500';
}

async function muatGuru(): Promise<void> {
  sedangMuatTabel.value = true;
  try {
    const hasil = await ambilDaftarGuru(props.token);
    if (hasil?.success && Array.isArray(hasil.data)) {
      daftarGuru.value = hasil.data;
    }
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Gagal memuat akun guru', 'error');
  } finally {
    sedangMuatTabel.value = false;
  }
}

async function muatKelas(): Promise<void> {
  try {
    daftarKelas.value = await ambilMasterKelas();
  } catch (error) {
    console.error('Gagal memuat kelas akun guru:', error);
    await Swal.fire('Gagal', 'Daftar kelas tidak dapat dimuat.', 'error');
  }
}

function unduhTemplateExcel(): void {
  try {
    const dataContoh = [
      {
        Username: 'guru_matematika',
        Password: 'password123',
        Role: 'guru',
        Kelas: daftarKelas.value.slice(0, 2).join(', ') || 'X TJKT 1, X TJKT 2',
      },
      {
        Username: 'admin_piket',
        Password: 'password123',
        Role: 'admin',
        Kelas: 'all',
      },
    ];
    const lembarKerja = XLSX.utils.json_to_sheet(dataContoh);
    const bukuKerja = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(bukuKerja, lembarKerja, 'Template Guru');
    XLSX.writeFile(bukuKerja, 'Template_Import_Guru.xlsx');
    void Swal.fire('Sukses', 'File template Excel akun guru berhasil diunduh.', 'success');
  } catch (error) {
    void Swal.fire('Error', `Gagal membuat file template: ${pesanError(error)}`, 'error');
  }
}

function eksporGuruExcel(): void {
  if (daftarGuru.value.length === 0) {
    void Swal.fire('Perhatian', 'Tidak ada data akun guru untuk diekspor.', 'warning');
    return;
  }
  try {
    const dataEkspor = tersaring.value.map((guru, indeks) => ({
      No: indeks + 1,
      Username: sanitasiFormulaExcel(guru.username || ''),
      Role: sanitasiFormulaExcel(guru.role || ''),
      Kelas: sanitasiFormulaExcel(guru.kelas || '-'),
    }));
    const lembarKerja = XLSX.utils.json_to_sheet(dataEkspor);
    const bukuKerja = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(bukuKerja, lembarKerja, 'Data Akun Guru');
    XLSX.writeFile(bukuKerja, 'Data_Akun_Guru_2026.xlsx');
    void Swal.fire(
      'Sukses',
      `Data akun guru berhasil diekspor (${tersaring.value.length} akun).`,
      'success',
    );
  } catch (error) {
    void Swal.fire('Error', `Gagal mengekspor data guru: ${pesanError(error)}`, 'error');
  }
}

function bacaArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Berkas tidak dapat dibaca sebagai data Excel.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Berkas gagal dibaca.'));
    reader.readAsArrayBuffer(file);
  });
}

async function tanganiUnggahExcel(event: Event): Promise<void> {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';

  try {
    const workbook = XLSX.read(await bacaArrayBuffer(file), { type: 'array' });
    const namaLembar = workbook.SheetNames[0];
    const lembar = namaLembar ? workbook.Sheets[namaLembar] : undefined;
    if (!lembar) {
      await Swal.fire('Perhatian', 'File Excel kosong atau format tidak sesuai.', 'warning');
      return;
    }
    const barisMentah = XLSX.utils.sheet_to_json<Record<string, unknown>>(lembar);
    if (barisMentah.length === 0) {
      await Swal.fire('Perhatian', 'File Excel kosong atau format tidak sesuai.', 'warning');
      return;
    }

    const dataGuruBaru: InputAkunGuru[] = [];
    for (const baris of barisMentah) {
      const username = teksNilai(
        baris.Username || baris.username || baris.User || baris['Nama Akun'],
      );
      const password = teksNilai(baris.Password || baris.password || baris.Sandi);
      const peranMentah = teksNilai(baris.Role || baris.role || baris.Peran || 'guru').toLowerCase();
      const role: PeranAkun = ['guru', 'admin', 'wakel'].includes(peranMentah)
        ? (peranMentah as PeranAkun)
        : 'guru';
      const kelas = teksNilai(baris.Kelas || baris.kelas || baris.Rombel);

      if (username && password) {
        dataGuruBaru.push({ username, password, role, kelas });
      }
    }

    if (dataGuruBaru.length === 0) {
      await Swal.fire(
        'Format Tidak Cocok',
        'Tidak ditemukan kolom "Username" dan "Password" yang valid dalam file Excel.',
        'warning',
      );
      return;
    }

    const konfirmasi = await Swal.fire({
      title: 'Import Akun Guru dari Excel?',
      text: `Ditemukan ${dataGuruBaru.length} akun yang siap diimpor ke sistem. Username yang sudah terdaftar akan dilewati otomatis.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      confirmButtonText: 'Ya, Import Sekarang',
      cancelButtonText: 'Batal',
    });
    if (!konfirmasi.isConfirmed) return;

    props.setMemuat(true);
    try {
      const hasil = await imporGuruMassal(props.token, dataGuruBaru);
      if (hasil?.success) {
        await Swal.fire(
          'Berhasil Import!',
          hasil.message || 'Berhasil mengimpor akun guru ke sistem.',
          'success',
        );
        await muatGuru();
      } else {
        await Swal.fire(
          'Gagal Import',
          hasil?.message || 'Terjadi kesalahan saat menyimpan data akun.',
          'error',
        );
      }
    } finally {
      props.setMemuat(false);
    }
  } catch (error) {
    props.setMemuat(false);
    await Swal.fire('Error', `Gagal membaca file Excel: ${pesanError(error)}`, 'error');
  }
}

async function tanganiHapus(username: string): Promise<void> {
  const konfirmasi = await Swal.fire({
    title: 'Hapus Akun?',
    text: `Hapus akses akun untuk: ${username}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
  });
  if (!konfirmasi.isConfirmed) return;

  props.setMemuat(true);
  try {
    const hasil = await hapusDataGuru(props.token, username);
    if (hasil?.success) {
      await Swal.fire('Berhasil', 'Akun berhasil dihapus', 'success');
      await muatGuru();
    } else {
      await Swal.fire('Gagal', hasil?.message || 'Gagal menghapus akun', 'error');
    }
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Kesalahan server', 'error');
  } finally {
    props.setMemuat(false);
  }
}

async function tanganiSimpanBaru(event: Event): Promise<void> {
  event.preventDefault();
  const username = formUsername.value.trim();
  if (!username || !formPassword.value) {
    await Swal.fire('Perhatian', 'Username dan password wajib diisi.', 'warning');
    return;
  }

  const payload: InputAkunGuru = {
    username,
    password: formPassword.value,
    role: formRole.value,
    kelas: kelasTerpilih.value.join(','),
  };
  props.setMemuat(true);
  try {
    const hasil = await simpanGuruBaru(props.token, payload);
    if (hasil?.success) {
      await Swal.fire('Berhasil', 'Akun guru/admin baru berhasil dibuat.', 'success');
      modalBuka.value = false;
      formUsername.value = '';
      formPassword.value = '';
      kelasTerpilih.value = [];
      await muatGuru();
    } else {
      await Swal.fire('Gagal', hasil?.message || 'Gagal menambahkan akun', 'error');
    }
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Kesalahan server', 'error');
  } finally {
    props.setMemuat(false);
  }
}

function togglePilihKelas(kelas: string): void {
  kelasTerpilih.value = kelasTerpilih.value.includes(kelas)
    ? kelasTerpilih.value.filter((item) => item !== kelas)
    : [...kelasTerpilih.value, kelas];
}

function tanganiTombolDialog(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    modalBuka.value = false;
    return;
  }
  if (event.key !== 'Tab' || !dialogGuruRef.value) return;

  const elemenFokus = Array.from(
    dialogGuruRef.value.querySelectorAll<HTMLElement>(PEMILIH_FOKUS),
  );
  if (elemenFokus.length === 0) {
    event.preventDefault();
    dialogGuruRef.value.focus();
    return;
  }
  const pertama = elemenFokus[0];
  const terakhir = elemenFokus[elemenFokus.length - 1];
  if (event.shiftKey && (document.activeElement === pertama || !dialogGuruRef.value.contains(document.activeElement))) {
    event.preventDefault();
    terakhir.focus();
  } else if (!event.shiftKey && (document.activeElement === terakhir || !dialogGuruRef.value.contains(document.activeElement))) {
    event.preventDefault();
    pertama.focus();
  }
}

watch(modalBuka, async (terbuka) => {
  if (terbuka) {
    fokusSebelumnya = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    const fokusAwal = dialogGuruRef.value?.querySelector<HTMLElement>(
      '[data-dialog-initial-focus]',
    );
    (fokusAwal || dialogGuruRef.value)?.focus();
    document.addEventListener('keydown', tanganiTombolDialog);
  } else {
    document.removeEventListener('keydown', tanganiTombolDialog);
    if (fokusSebelumnya?.isConnected) fokusSebelumnya.focus();
    fokusSebelumnya = null;
  }
});

onMounted(() => {
  void muatGuru();
  void muatKelas();
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', tanganiTombolDialog);
});
</script>

<template>
  <section
    class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm animate-fade-in-up"
    aria-labelledby="judul-manajemen-guru"
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
              <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5Zm6 3.5v5c3 2 5 2 8 0v-5" />
            </svg>
          </span>
          <h2 id="judul-manajemen-guru" class="text-lg font-black text-slate-900 md:text-xl">
            Manajemen Akun Guru &amp; Pengajar
          </h2>
        </div>
        <p class="text-xs font-medium text-slate-600 md:text-sm">
          Kelola hak akses pengguna sistem dan rombel kelas binaan guru {{ IDENTITAS_SEKOLAH.nama }}.
        </p>
      </div>

      <div class="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
        <div class="relative min-w-48 flex-1 sm:w-60">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="absolute left-3.5 top-3 h-4 w-4 text-slate-400"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            v-model="kataKunci"
            type="text"
            placeholder="Cari username guru..."
            aria-label="Cari username guru"
            class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
          />
        </div>

        <input
          ref="inputBerkasRef"
          type="file"
          accept=".xlsx, .xls, .csv"
          aria-label="Pilih file Excel akun guru"
          class="hidden"
          @change="tanganiUnggahExcel"
        />
        <button
          type="button"
          title="Download daftar akun guru sebagai file Excel"
          class="tombol-taktil flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 md:text-sm"
          @click="eksporGuruExcel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 text-slate-500" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3" />
          </svg>
          <span class="hidden sm:inline">Export</span>
        </button>
        <button
          type="button"
          title="Unduh format template Excel untuk import akun guru"
          class="tombol-taktil flex items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 shadow-2xs transition-all hover:bg-indigo-100/80 md:text-sm"
          @click="unduhTemplateExcel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 text-indigo-600" aria-hidden="true">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h8" />
          </svg>
          <span class="hidden sm:inline">Template</span>
        </button>
        <button
          type="button"
          title="Import akun guru secara massal dari file Excel"
          class="tombol-taktil flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 md:text-sm"
          @click="inputBerkasRef?.click()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m7-8 2-2 2 2m-2-2v12" />
          </svg>
          <span>Import Excel</span>
        </button>
        <button
          type="button"
          class="tombol-taktil flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 md:px-5 md:text-sm"
          @click="modalBuka = true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          <span>Tambah Akun</span>
        </button>
      </div>
    </header>

    <div
      class="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-2.5 text-xs font-bold"
      aria-live="polite"
    >
      <div class="flex items-center gap-2">
        <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
          Total Akun: <strong class="font-extrabold">{{ daftarGuru.length }}</strong>
        </span>
        <span
          v-if="kataKunci"
          class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800"
        >
          Hasil Saring: <strong class="font-extrabold">{{ tersaring.length }}</strong>
        </span>
      </div>
    </div>

    <!-- Indikator Geser Horizontal Khusus Layar Ponsel / Mobile -->
    <div class="flex sm:hidden items-center justify-between border-b border-indigo-100 bg-indigo-50/70 px-4 py-2 text-xs font-bold text-indigo-700">
      <span class="flex items-center gap-1.5">
        <span>👈</span>
        <span>Geser horizontal untuk kolom lengkap</span>
        <span>👉</span>
      </span>
      <span class="rounded-full bg-indigo-100/90 px-2 py-0.5 text-[11px] font-extrabold text-indigo-800">
        {{ tersaring.length }} Akun
      </span>
    </div>

    <div class="overflow-x-auto">
      <table class="tabel-kontras-tinggi w-full text-left text-xs text-slate-800 md:text-sm">
        <caption class="sr-only">Daftar akun guru, peran, kelas binaan, dan tindakan</caption>
        <thead class="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-700">
          <tr>
            <th scope="col" class="w-16 p-4 text-center">No</th>
            <th scope="col" class="p-4">Username Akun</th>
            <th scope="col" class="p-4">Peran / Hak Akses</th>
            <th scope="col" class="p-4">Kelas Binaan yang Diampu</th>
            <th scope="col" class="w-28 p-4 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <template v-if="sedangMuatTabel">
            <tr v-for="baris in 4" :key="baris" aria-hidden="true">
              <td v-for="kolom in 5" :key="kolom" class="p-4">
                <span class="block h-4 animate-pulse rounded bg-slate-200" />
              </td>
            </tr>
          </template>
          <tr v-else-if="tersaring.length === 0">
            <td colspan="5" class="py-16 text-center text-base font-bold text-slate-500">
              Tidak ada akun guru ditemukan dengan kata kunci tersebut.
            </td>
          </tr>
          <tr
            v-for="(guru, indeks) in tersaring"
            v-else
            :key="guru.username"
            class="baris-stagger transition-colors hover:bg-slate-50/70"
          >
            <td class="p-4 text-center font-mono text-sm font-bold text-slate-500 md:text-base">
              {{ indeks + 1 }}
            </td>
            <td class="p-4">
              <span class="text-sm font-black tracking-wide text-slate-900 md:text-base">
                {{ guru.username }}
              </span>
            </td>
            <td class="p-4">
              <span
                class="pill-status border"
                :class="kelasPeran(guru.role)"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="warnaTitikPeran(guru.role)" />
                {{ labelPeran(guru.role) }}
              </span>
            </td>
            <td class="p-4">
              <div v-if="guru.kelas" class="flex flex-wrap gap-1.5">
                <span
                  v-for="(kelas, indeksKelas) in guru.kelas.split(',')"
                  :key="`${kelas}-${indeksKelas}`"
                  class="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-700"
                >
                  {{ kelas.trim() }}
                </span>
              </div>
              <span v-else class="font-medium italic text-slate-500">
                Semua / Bebas Akses
              </span>
            </td>
            <td class="p-4 text-center">
              <button
                type="button"
                :aria-label="`Hapus akun ${guru.username}`"
                title="Hapus Akun Pengajar"
                class="tombol-taktil rounded-xl border border-rose-200/80 bg-rose-50/80 p-2 text-rose-700 shadow-2xs transition-all hover:bg-rose-100"
                @click="tanganiHapus(guru.username)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
                  <path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div
        v-if="modalBuka"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in"
        @click.self="modalBuka = false"
      >
        <section
          ref="dialogGuruRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-tambah-guru-title"
          tabindex="-1"
          class="w-full max-w-lg rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-2xl animate-fade-in-up sm:p-7"
        >
          <header class="mb-5 flex items-center justify-between border-b-2 border-slate-100 pb-3">
            <h3 id="dialog-tambah-guru-title" class="text-lg font-black text-slate-900">
              Tambah Akun Pengajar Baru
            </h3>
            <button
              type="button"
              class="tombol-taktil rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Tutup formulir tambah akun"
              @click="modalBuka = false"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5" aria-hidden="true">
                <path d="m18 6-12 12M6 6l12 12" />
              </svg>
            </button>
          </header>

          <form class="space-y-4 text-xs md:text-sm" @submit="tanganiSimpanBaru">
            <div>
              <label for="field-dataguru-480" class="mb-1.5 block font-black text-slate-800">
                Username Pengguna
              </label>
              <input
                id="field-dataguru-480"
                v-model="formUsername"
                data-dialog-initial-focus
                type="text"
                required
                placeholder="Contoh: guru_tkj"
                class="w-full rounded-xl border-2 border-slate-300 bg-white p-3 font-bold text-slate-900 outline-none shadow-xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label for="field-dataguru-492" class="mb-1.5 block font-black text-slate-800">
                Kata Sandi (Password)
              </label>
              <input
                id="field-dataguru-492"
                v-model="formPassword"
                type="password"
                required
                placeholder="Password untuk login"
                class="w-full rounded-xl border-2 border-slate-300 bg-white p-3 font-bold text-slate-900 outline-none shadow-xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label for="field-dataguru-504" class="mb-1.5 block font-black text-slate-800">
                Peran / Hak Akses Akun
              </label>
              <select
                id="field-dataguru-504"
                v-model="formRole"
                class="w-full rounded-xl border-2 border-slate-300 bg-white p-3 font-black text-slate-900 outline-none shadow-xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="guru">Guru Pengajar (Hanya Kelas Binaan)</option>
                <option value="wakel">Wakil Kepala Sekolah (Monitoring &amp; Rekap)</option>
                <option value="admin">Administrator Penuh (Seluruh Hak Akses)</option>
              </select>
            </div>

            <fieldset>
              <legend class="mb-1.5 font-black text-slate-800">
                Pilih Kelas yang Diampu (Multi-pilihan):
              </legend>
              <div
                class="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border-2 border-slate-300 bg-slate-50 p-3.5"
              >
                <button
                  v-for="kelas in daftarKelas"
                  :key="kelas"
                  type="button"
                  :aria-pressed="kelasTerpilih.includes(kelas)"
                  class="tombol-taktil flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-black transition-all"
                  :class="kelasTerpilih.includes(kelas)
                    ? 'border-indigo-700 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'"
                  @click="togglePilihKelas(kelas)"
                >
                  <svg
                    v-if="kelasTerpilih.includes(kelas)"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    class="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                  <span>{{ kelas }}</span>
                </button>
              </div>
            </fieldset>

            <div class="flex gap-3 pt-3">
              <button
                type="button"
                class="tombol-taktil flex-1 rounded-xl border-2 border-slate-300 py-3.5 font-black text-slate-700 transition hover:bg-slate-100"
                @click="modalBuka = false"
              >
                Batal
              </button>
              <button
                type="submit"
                class="tombol-taktil flex-1 rounded-xl bg-indigo-600 py-3.5 font-black text-white shadow-md transition hover:bg-indigo-700"
              >
                Simpan Akun
              </button>
            </div>
          </form>
        </section>
      </div>
    </Teleport>
  </section>
</template>
