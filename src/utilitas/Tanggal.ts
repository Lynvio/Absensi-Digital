/**
 * Utilitas format tanggal dan waktu lokal Indonesia
 */

export function formatTanggalIndonesia(tanggal: Date | string): string {
  const d = typeof tanggal === 'string' ? new Date(tanggal) : tanggal;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function dapatkanTanggalHariIni(): string {
  const d = new Date();
  const thn = d.getFullYear();
  const bln = String(d.getMonth() + 1).padStart(2, '0');
  const tgl = String(d.getDate()).padStart(2, '0');
  return `${thn}-${bln}-${tgl}`;
}

export function formatJamMenit(tanggal: Date = new Date()): string {
  const jam = String(tanggal.getHours()).padStart(2, '0');
  const mnt = String(tanggal.getMinutes()).padStart(2, '0');
  return `${jam}:${mnt}`;
}
