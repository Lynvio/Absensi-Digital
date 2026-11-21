<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Swal from 'sweetalert2';
import {
  ambilDaftarKelas,
  ambilSiswaPerKelas,
  arsipDanResetTahun,
  prosesKenaikanSiswaTerpilih,
} from '@/layanan/LayananSiswa';
import type { DataSiswa } from '@/tipe/Siswa';
import { IDENTITAS_SEKOLAH } from '@/settings';

const props = defineProps<{
  setMemuat: (memuat: boolean) => void;
}>();

interface SiswaPromosi extends DataSiswa {
  statusNaik: boolean;
}

const daftarKelas = ref<string[]>([]);
const kelasAsal = ref('');
const kelasTujuan = ref('');
const siswaPromosi = ref<SiswaPromosi[]>([]);
const namaArsip = ref('');
const jumlahTerpilih = computed(
  () => siswaPromosi.value.filter((siswa) => siswa.statusNaik).length,
);
let generasiFilter = 0;

function pesanError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function muatKelas(): Promise<void> {
  try {
    daftarKelas.value = await ambilDaftarKelas();
  } catch (error) {
    console.error('Gagal memuat kelas kenaikan:', error);
    await Swal.fire('Gagal', 'Daftar kelas tidak dapat dimuat.', 'error');
  }
}

watch([kelasAsal, kelasTujuan], () => {
  generasiFilter += 1;
  siswaPromosi.value = [];
}, { flush: 'sync' });

async function muatSiswaPromosi(): Promise<void> {
  const asal = kelasAsal.value;
  const tujuan = kelasTujuan.value;
  if (!asal || !tujuan) {
    await Swal.fire(
      'Perhatian',
      'Pilih kelas asal dan kelas tujuan terlebih dahulu.',
      'warning',
    );
    return;
  }

  const generasiSaatIni = generasiFilter;
  props.setMemuat(true);
  try {
    const siswa = await ambilSiswaPerKelas(asal);
    if (generasiSaatIni === generasiFilter) {
      siswaPromosi.value = siswa.map((item) => ({ ...item, statusNaik: true }));
    }
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Gagal memuat siswa', 'error');
  } finally {
    props.setMemuat(false);
  }
}

async function eksekusiPromosiIndividu(): Promise<void> {
  if (jumlahTerpilih.value === 0) {
    await Swal.fire(
      'Perhatian',
      'Centang minimal satu siswa yang akan dinaikkan.',
      'warning',
    );
    return;
  }

  const konfirmasi = await Swal.fire({
    title: 'Proses Kenaikan Kelas?',
    text: `${jumlahTerpilih.value} siswa yang ditandai naik akan dipindahkan dari ${kelasAsal.value} ke ${kelasTujuan.value}. Tindakan ini permanen.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#059669',
    confirmButtonText: 'Ya, Proses Kenaikan',
    cancelButtonText: 'Batal',
  });
  if (!konfirmasi.isConfirmed) return;

  const kelasAsalSaatIni = kelasAsal.value;
  const kelasTujuanSaatIni = kelasTujuan.value;
  const daftarSaatIni = siswaPromosi.value;
  props.setMemuat(true);
  try {
    const dataPromosi = daftarSaatIni.map((siswa) => ({
      nisn: String(siswa.nisn),
      status: siswa.statusNaik ? ('NAIK' as const) : ('TINGGAL' as const),
    }));
    const hasil = await prosesKenaikanSiswaTerpilih(
      kelasAsalSaatIni,
      kelasTujuanSaatIni,
      dataPromosi,
    );
    if (hasil?.success) {
      await Swal.fire(
        'Berhasil!',
        `Kenaikan kelas selesai diproses. ${hasil.data?.movedCount || jumlahTerpilih.value} siswa dipindahkan.`,
        'success',
      );
      siswaPromosi.value = [];
    } else {
      await Swal.fire(
        'Gagal',
        hasil?.message || 'Gagal memproses kenaikan kelas',
        'error',
      );
    }
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Kesalahan server', 'error');
  } finally {
    props.setMemuat(false);
  }
}

async function eksekusiTutupTahun(): Promise<void> {
  const labelArsip = namaArsip.value.trim();
  if (!labelArsip) {
    await Swal.fire(
      'Perhatian',
      'Harap isi Nama/Label File Arsip terlebih dahulu.',
      'warning',
    );
    return;
  }

  const konfirmasi = await Swal.fire({
    title: 'TUTUP TAHUN AJARAN?',
    text: `Anda akan mencadangkan seluruh data ke spreadsheet baru "${labelArsip}" dan mereset absensi utama untuk tahun ajaran baru. Tindakan ini tidak dapat dibatalkan!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    confirmButtonText: 'Ya, Tutup Tahun & Reset',
    cancelButtonText: 'Batal',
  });
  if (!konfirmasi.isConfirmed) return;

  props.setMemuat(true);
  try {
    const hasil = await arsipDanResetTahun(labelArsip);
    if (hasil?.success) {
      await Swal.fire(
        'Selesai!',
        'Data berhasil diarsipkan dan database absensi telah direset untuk tahun baru.',
        'success',
      );
      namaArsip.value = '';
    } else {
      await Swal.fire('Gagal', hasil?.message || 'Gagal mengarsipkan data', 'error');
    }
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Kesalahan server', 'error');
  } finally {
    props.setMemuat(false);
  }
}

onMounted(() => {
  void muatKelas();
});
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 animate-fade-in-up">
    <section
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm md:p-7"
      aria-labelledby="judul-kenaikan-kelas"
    >
      <header class="mb-6 border-b border-slate-100 pb-4">
        <div class="mb-1 flex items-center gap-2">
          <span
            class="inline-flex rounded-xl border border-indigo-200/80 bg-indigo-50 p-2 text-indigo-600 shadow-2xs"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
              <path d="M3 17 9 11l4 4 8-8M15 7h6v6" />
            </svg>
          </span>
          <h2 id="judul-kenaikan-kelas" class="text-lg font-black text-slate-900 md:text-xl">
            Kenaikan Kelas &amp; Kelulusan Siswa
          </h2>
        </div>
        <p class="text-xs font-medium text-slate-600 md:text-sm">
          Pilih rombel asal dan rombel tujuan untuk memproses siswa naik tingkat atau alumni {{ IDENTITAS_SEKOLAH.nama }}.
        </p>
      </header>

      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <label
            for="field-kenaikankelas-178"
            class="mb-1.5 block text-xs font-bold text-slate-700 md:text-sm"
          >
            Rombel Asal
          </label>
          <select
            id="field-kenaikankelas-178"
            v-model="kelasAsal"
            class="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
          >
            <option value="">-- Pilih Rombel Asal --</option>
            <option v-for="kelas in daftarKelas" :key="`asal-${kelas}`" :value="kelas">
              {{ kelas }}
            </option>
          </select>
        </div>

        <div>
          <label
            for="field-kenaikankelas-196"
            class="mb-1.5 block text-xs font-bold text-slate-700 md:text-sm"
          >
            Naik Ke Rombel Tujuan
          </label>
          <select
            id="field-kenaikankelas-196"
            v-model="kelasTujuan"
            class="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-indigo-700 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
          >
            <option value="">-- Pilih Rombel Tujuan --</option>
            <option value="LULUS" class="font-black text-emerald-700">
              LULUS (Tamat / Alumni)
            </option>
            <option v-for="kelas in daftarKelas" :key="`tujuan-${kelas}`" :value="kelas">
              {{ kelas }}
            </option>
          </select>
        </div>

        <div class="flex items-end">
          <button
            type="button"
            class="tombol-taktil flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-xs font-black text-white shadow-md transition-all hover:bg-indigo-700 md:text-sm"
            @click="muatSiswaPromosi"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Muat Daftar Siswa</span>
          </button>
        </div>
      </div>

      <div v-if="siswaPromosi.length > 0" class="mt-6 space-y-4 border-t border-slate-100 pt-5">
        <p class="text-xs font-black text-slate-900 md:text-sm" aria-live="polite">
          Daftar Siswa Kelas {{ kelasAsal }} ({{ jumlahTerpilih }} Siswa Terpilih):
        </p>
        <div class="max-h-72 overflow-x-auto rounded-2xl border border-slate-200/90">
          <table class="w-full text-left text-xs md:text-sm">
            <thead class="border-b border-slate-200/90 bg-slate-50 text-xs font-bold uppercase text-slate-700">
              <tr>
                <th scope="col" class="w-14 p-3.5 text-center">No</th>
                <th scope="col" class="p-3.5">Nama Lengkap Siswa</th>
                <th scope="col" class="p-3.5">NISN</th>
                <th scope="col" class="p-3.5 text-center">Status Pemindahan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(siswa, indeks) in siswaPromosi"
                :key="siswa.nisn"
                class="transition-colors hover:bg-slate-50/80"
              >
                <td class="p-3.5 text-center font-mono font-bold text-slate-600">{{ indeks + 1 }}</td>
                <td class="p-3.5 text-sm font-bold text-slate-900">{{ siswa.nama }}</td>
                <td class="p-3.5 font-mono font-bold text-slate-600">{{ siswa.nisn }}</td>
                <td class="p-3.5 text-center">
                  <label class="inline-flex cursor-pointer select-none items-center justify-center gap-2">
                    <input
                      v-model="siswa.statusNaik"
                      type="checkbox"
                      :aria-label="`Naikkan ${siswa.nama} ke ${kelasTujuan}`"
                      class="h-4 w-4 cursor-pointer rounded accent-indigo-600"
                    />
                    <span
                      class="rounded-full border px-3 py-1 text-xs font-bold transition-colors"
                      :class="siswa.statusNaik
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-100 text-slate-600'"
                    >
                      {{ siswa.statusNaik ? `Naik Ke ${kelasTujuan}` : 'Tetap' }}
                    </span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button
          type="button"
          class="tombol-taktil flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-xs font-black text-white shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-700 md:text-sm"
          @click="eksekusiPromosiIndividu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5" aria-hidden="true">
            <path d="m5 12 4 4L19 6" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span>Simpan &amp; Eksekusi Kenaikan Rombel</span>
        </button>
      </div>
    </section>

    <section
      class="overflow-hidden rounded-3xl border border-rose-200/90 bg-white p-6 shadow-sm ring-1 ring-rose-500/10 md:p-7"
      aria-labelledby="judul-arsip-tahun"
    >
      <header class="mb-5 border-b border-rose-100 pb-4">
        <div class="mb-1 flex items-center gap-2">
          <span
            class="inline-flex rounded-xl border border-rose-200/80 bg-rose-50 p-2 text-rose-600 shadow-2xs"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
              <path d="M3 4h18v4H3zm2 4v12h14V8m-9 4h4m-4 4h4" />
            </svg>
          </span>
          <h2 id="judul-arsip-tahun" class="text-lg font-black text-rose-950 md:text-xl">
            Tutup Tahun Ajaran &amp; Pengarsipan Database
          </h2>
        </div>
        <p class="text-xs font-medium text-slate-600 md:text-sm">
          Mencadangkan seluruh rekaman absensi ke file arsip spreadsheet baru dan membersihkan rekaman aktif untuk tahun ajaran baru.
        </p>
      </header>

      <div class="space-y-4">
        <div>
          <label
            for="field-kenaikankelas-313"
            class="mb-1.5 block text-xs font-bold text-slate-700 md:text-sm"
          >
            Label / Nama File Spreadsheet Arsip Baru
          </label>
          <input
            id="field-kenaikankelas-313"
            v-model="namaArsip"
            type="text"
            placeholder="Contoh: Arsip Absensi 2025-2026"
            class="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 md:text-sm"
          />
        </div>

        <button
          type="button"
          class="tombol-taktil flex w-full items-center justify-center gap-2.5 rounded-xl bg-rose-600 py-3.5 text-xs font-black text-white shadow-sm shadow-rose-500/20 transition-all hover:bg-rose-700 md:text-sm"
          @click="eksekusiTutupTahun"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5" aria-hidden="true">
            <path d="M3 4h18v4H3zm2 4v12h14V8m-9 4h4m-4 4h4" />
          </svg>
          <span>Arsipkan &amp; Reset Database Absensi Utama</span>
        </button>
      </div>
    </section>
  </div>
</template>
