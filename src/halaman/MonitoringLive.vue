<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ambilDataMonitoring } from '@/layanan/LayananAbsensi';
import type { DataMonitoringRealtime } from '@/tipe/Absensi';

const props = defineProps<{
  setMemuat: (memuat: boolean) => void;
}>();

const dataMonitoring = ref<DataMonitoringRealtime[]>([]);
const kataKunci = ref('');
const filterKelas = ref('');
const pesanKesalahan = ref('');

const tersaring = computed(() => {
  const kueri = kataKunci.value.toLowerCase();
  return dataMonitoring.value.filter((data) => {
    const cocokNama = data.nama?.toLowerCase().includes(kueri) ?? false;
    const cocokNisn = String(data.nisn ?? '').includes(kueri);
    const cocokKelas = !filterKelas.value || data.kelas === filterKelas.value;
    return (cocokNama || cocokNisn) && cocokKelas;
  });
});

const daftarKelasUnik = computed(() => [
  ...new Set(dataMonitoring.value.map((data) => data.kelas).filter(Boolean)),
]);

const ringkasan = computed(() => {
  const status = dataMonitoring.value.map((data) => String(data.status ?? '').toLowerCase());
  return {
    total: dataMonitoring.value.length,
    hadir: status.filter((nilai) => nilai === 'hadir').length,
    sakit: status.filter((nilai) => nilai === 'sakit').length,
    izin: status.filter((nilai) => nilai === 'izin').length,
    alpa: status.filter((nilai) => nilai === 'alpa').length,
  };
});

function waktuPresensi(waktu: string | null | undefined): string {
  return waktu && waktu !== '-' ? waktu : '';
}

function pesanError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function muatData(tampilkanLoading = false): Promise<void> {
  if (tampilkanLoading) props.setMemuat(true);
  try {
    const hasil = await ambilDataMonitoring();
    if (!hasil?.success || !Array.isArray(hasil.data)) {
      throw new Error(hasil?.message || 'Data pemantauan tidak dapat dimuat.');
    }

    dataMonitoring.value = hasil.data;
    pesanKesalahan.value = '';
  } catch (error) {
    pesanKesalahan.value = pesanError(error) || 'Data pemantauan tidak dapat dimuat.';
  } finally {
    if (tampilkanLoading) props.setMemuat(false);
  }
}

let intervalPembaruan: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  void muatData(true);
  intervalPembaruan = setInterval(() => {
    void muatData();
  }, 30_000);
});

onUnmounted(() => {
  if (intervalPembaruan !== undefined) clearInterval(intervalPembaruan);
});
</script>

<template>
  <section class="kartu-modern animate-fade-in-up overflow-hidden rounded-2xl shadow-sm">
    <header
      class="flex flex-col items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center md:p-6"
    >
      <div>
        <div class="mb-1 flex items-center gap-2.5">
          <span
            class="inline-flex rounded-xl border border-indigo-200/80 bg-indigo-50 p-2 text-indigo-600 shadow-2xs"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
              <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
            </svg>
          </span>
          <h2 class="flex items-center gap-2 text-lg font-black text-slate-900 md:text-xl">
            <span>Pemantauan Kehadiran Terkini</span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700"
            >
              <span class="relative flex h-2 w-2" aria-hidden="true">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              LANGSUNG
            </span>
          </h2>
        </div>
        <p class="text-xs font-medium text-slate-600 md:text-sm">
          Daftar absensi siswa hari ini diperbarui otomatis tiap 30 detik.
        </p>
      </div>

      <div class="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
        <div class="relative flex-1 sm:w-52">
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
            placeholder="Cari siswa atau NISN..."
            aria-label="Cari siswa atau NISN"
            class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
          />
        </div>

        <select
          v-model="filterKelas"
          aria-label="Filter pemantauan berdasarkan kelas"
          class="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
        >
          <option value="">Semua Rombel/Kelas</option>
          <option v-for="kelas in daftarKelasUnik" :key="kelas" :value="kelas">
            {{ kelas }}
          </option>
        </select>

        <button
          type="button"
          title="Muat Ulang Data Sekarang"
          aria-label="Muat ulang data pemantauan"
          class="tombol-taktil rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover-lift"
          @click="muatData(true)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </button>
      </div>
    </header>

    <p
      v-if="pesanKesalahan"
      role="alert"
      class="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-800"
    >
      {{ pesanKesalahan }}
    </p>

    <div
      class="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-5 py-3 text-xs font-bold"
      aria-live="polite"
    >
      <span class="mr-1 font-semibold text-slate-500">Terekam Hari Ini:</span>
      <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 shadow-2xs">
        Total: <strong class="font-extrabold">{{ ringkasan.total }}</strong>
      </span>
      <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800 shadow-2xs">
        Hadir: <strong class="font-extrabold">{{ ringkasan.hadir }}</strong>
      </span>
      <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800 shadow-2xs">
        Sakit: <strong class="font-extrabold">{{ ringkasan.sakit }}</strong>
      </span>
      <span class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-800 shadow-2xs">
        Izin: <strong class="font-extrabold">{{ ringkasan.izin }}</strong>
      </span>
      <span class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-800 shadow-2xs">
        Alpa: <strong class="font-extrabold">{{ ringkasan.alpa }}</strong>
      </span>
    </div>

    <!-- Indikator Geser Horizontal Khusus Layar Ponsel / Mobile -->
    <div class="flex sm:hidden items-center justify-between border-b border-indigo-100 bg-indigo-50/70 px-4 py-2 text-xs font-bold text-indigo-700">
      <span class="flex items-center gap-1.5">
        <span>👈</span>
        <span>Geser horizontal untuk kolom lengkap</span>
        <span>👉</span>
      </span>
      <span class="rounded-full bg-indigo-100/90 px-2 py-0.5 text-[11px] font-extrabold text-indigo-800">
        {{ tersaring.length }} Siswa
      </span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm text-slate-800 tabel-kontras-tinggi">
        <thead class="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-700">
          <tr>
            <th scope="col" class="w-14 p-4 text-center">No</th>
            <th scope="col" class="p-4">Identitas Siswa</th>
            <th scope="col" class="p-4">Rombel</th>
            <th scope="col" class="p-4">Jam Masuk</th>
            <th scope="col" class="p-4">Jam Pulang</th>
            <th scope="col" class="p-4 text-center">Status Kehadiran</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="tersaring.length === 0">
            <td colspan="6" class="py-16 text-center text-base font-bold text-slate-500">
              Tidak ada data presensi siswa yang cocok.
            </td>
          </tr>
          <tr
            v-for="(data, index) in tersaring"
            :key="`${data.nisn}-${data.kelas}`"
            class="baris-stagger transition-colors hover:bg-slate-50/70"
          >
            <td class="p-4 text-center font-mono text-sm font-bold text-slate-500">{{ index + 1 }}</td>
            <td class="p-4">
              <div class="text-sm font-extrabold text-slate-900 md:text-base">{{ data.nama }}</div>
              <div class="mt-0.5 font-mono text-xs font-bold text-slate-500">
                NISN: {{ data.nisn }}
              </div>
            </td>
            <td class="p-4 text-sm font-bold text-slate-700">{{ data.kelas }}</td>
            <td class="p-4 font-mono text-sm font-bold text-slate-900 md:text-base">
              <span
                v-if="waktuPresensi(data.jamDatang ?? data.jamMasuk)"
                class="rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-emerald-700"
              >
                {{ waktuPresensi(data.jamDatang ?? data.jamMasuk) }}
              </span>
              <span v-else class="text-slate-400">-</span>
            </td>
            <td class="p-4 font-mono text-sm font-bold text-slate-900 md:text-base">
              <span
                v-if="waktuPresensi(data.jamPulang)"
                class="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-amber-700"
              >
                {{ waktuPresensi(data.jamPulang) }}
              </span>
              <span v-else class="text-slate-400">-</span>
            </td>
            <td class="p-4 text-center">
              <span
                class="pill-status"
                :class="{
                  'pill-hadir': String(data.status ?? '').toLowerCase() === 'hadir',
                  'pill-sakit': String(data.status ?? '').toLowerCase() === 'sakit',
                  'pill-izin': String(data.status ?? '').toLowerCase() === 'izin',
                  'pill-alpa': String(data.status ?? '').toLowerCase() === 'alpa',
                  'border border-slate-200 bg-slate-100 text-slate-700': !['hadir', 'sakit', 'izin', 'alpa'].includes(String(data.status ?? '').toLowerCase()),
                }"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="{
                    'bg-emerald-500': String(data.status ?? '').toLowerCase() === 'hadir',
                    'bg-amber-500': String(data.status ?? '').toLowerCase() === 'sakit',
                    'bg-sky-500': String(data.status ?? '').toLowerCase() === 'izin',
                    'bg-rose-500': String(data.status ?? '').toLowerCase() === 'alpa',
                    'bg-slate-400': !['hadir', 'sakit', 'izin', 'alpa'].includes(String(data.status ?? '').toLowerCase()),
                  }"
                  aria-hidden="true"
                />
                {{ data.status || 'Belum Absen' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
