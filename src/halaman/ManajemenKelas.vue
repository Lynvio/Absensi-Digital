<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Swal from 'sweetalert2';
import { ambilMasterKelas, hapusKelas, tambahKelasBaru } from '@/layanan/LayananKelas';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import { IDENTITAS_SEKOLAH } from '@/settings';

const props = defineProps<{
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}>();

const daftarKelas = ref<string[]>([]);
const namaKelasBaru = ref('');
const kataKunci = ref('');
const sedangMuat = ref(true);

const kelasTersaring = computed(() => {
  const kueri = kataKunci.value.toLowerCase();
  return daftarKelas.value.filter((kelas) => kelas.toLowerCase().includes(kueri));
});

function pesanError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function muatKelas(): Promise<void> {
  sedangMuat.value = true;
  try {
    daftarKelas.value = await ambilMasterKelas();
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Gagal memuat master kelas', 'error');
  } finally {
    sedangMuat.value = false;
  }
}

async function tanganiTambahKelas(): Promise<void> {
  const namaKelas = namaKelasBaru.value.trim();
  if (!namaKelas) return;

  props.setMemuat(true);
  try {
    const hasil = await tambahKelasBaru(props.sesi.token, namaKelas);
    if (hasil?.success) {
      await Swal.fire('Berhasil', `Kelas ${namaKelas} berhasil ditambahkan.`, 'success');
      namaKelasBaru.value = '';
      await muatKelas();
    } else {
      await Swal.fire('Gagal', hasil?.message || 'Gagal menambah kelas', 'error');
    }
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Kesalahan server', 'error');
  } finally {
    props.setMemuat(false);
  }
}

async function tanganiHapusKelas(kelas: string): Promise<void> {
  const konfirmasi = await Swal.fire({
    title: 'Hapus Kelas?',
    text: `Hapus master kelas "${kelas}"? Kelas yang masih digunakan siswa tidak dapat dihapus. Data siswa tidak dihapus.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
  });

  if (!konfirmasi.isConfirmed) return;

  props.setMemuat(true);
  try {
    const hasil = await hapusKelas(props.sesi.token, kelas);
    if (hasil?.success) {
      await Swal.fire('Berhasil', 'Kelas berhasil dihapus.', 'success');
      await muatKelas();
    } else {
      await Swal.fire('Gagal', hasil?.message || 'Gagal menghapus kelas', 'error');
    }
  } catch (error) {
    await Swal.fire('Error', pesanError(error) || 'Kesalahan server', 'error');
  } finally {
    props.setMemuat(false);
  }
}

onMounted(muatKelas);
</script>

<template>
  <section
    class="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm animate-fade-in-up"
    aria-labelledby="judul-manajemen-kelas"
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
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01" />
            </svg>
          </span>
          <h2 id="judul-manajemen-kelas" class="text-lg font-black text-slate-900 md:text-xl">
            Manajemen Master Rombel Kelas
          </h2>
        </div>
        <p class="text-xs font-medium text-slate-600 md:text-sm">
          Daftar seluruh rombongan belajar (rombel) aktif {{ IDENTITAS_SEKOLAH.nama }}.
        </p>
      </div>

      <div class="relative w-full sm:w-60">
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
          type="search"
          aria-label="Cari nama rombel"
          placeholder="Cari nama rombel..."
          class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
        />
      </div>
    </header>

    <div
      class="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-2.5 text-xs font-bold"
      aria-live="polite"
    >
      <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
        Total Rombel Aktif: <strong class="font-extrabold">{{ daftarKelas.length }}</strong>
      </span>
      <span
        v-if="kataKunci"
        class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800"
      >
        Hasil Saring: <strong class="font-extrabold">{{ kelasTersaring.length }}</strong>
      </span>
    </div>

    <div class="border-b border-slate-100 bg-slate-50/70 p-5">
      <form
        class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
        @submit.prevent="tanganiTambahKelas"
      >
        <input
          v-model="namaKelasBaru"
          type="text"
          required
          aria-label="Nama rombel baru"
          placeholder="Ketik nama rombel baru (misal: X TJKT 1, XI DKV)..."
          class="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 md:text-sm"
        />
        <button
          type="submit"
          class="tombol-taktil flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 md:text-sm"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Tambah Rombel</span>
        </button>
      </form>
    </div>

    <div class="p-5 md:p-6" :aria-busy="sedangMuat">
      <div v-if="sedangMuat" class="grid grid-cols-1 gap-3.5 sm:grid-cols-2" aria-label="Memuat daftar kelas">
        <div
          v-for="item in 4"
          :key="item"
          class="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
          aria-hidden="true"
        />
      </div>
      <div v-else-if="kelasTersaring.length === 0" class="py-12 text-center text-base font-bold text-slate-500">
        Belum ada rombel kelas yang terdaftar atau cocok dengan pencarian.
      </div>
      <ul v-else class="grid list-none grid-cols-1 gap-3.5 p-0 sm:grid-cols-2">
        <li
          v-for="kelas in kelasTersaring"
          :key="kelas"
          class="tombol-taktil flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-indigo-400 hover:shadow-md"
        >
          <div class="flex items-center gap-3">
            <span class="h-3 w-3 shrink-0 rounded-full bg-indigo-600" aria-hidden="true" />
            <span class="text-sm font-extrabold text-slate-900 md:text-base">{{ kelas }}</span>
          </div>
          <button
            type="button"
            :aria-label="`Hapus kelas ${kelas}`"
            class="tombol-taktil rounded-xl border border-rose-200/80 bg-rose-50/80 p-2 text-rose-700 shadow-2xs transition hover:bg-rose-100"
            @click="tanganiHapusKelas(kelas)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
