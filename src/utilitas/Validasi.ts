/**
 * Utilitas validasi input pengguna
 */

export function bersihkanTeks(input: string): string {
  return input ? input.trim() : '';
}

export function validasiNisn(nisn: string): boolean {
  return /^[0-9]{8,12}$/.test(nisn.trim());
}

export function validasiPassword(password: string, minLength: number = 3): boolean {
  return typeof password === 'string' && password.length >= minLength;
}

/**
 * Sanitasi nilai string sebelum diekspor ke Microsoft Excel / CSV.
 * Mencegah serangan CSV / Formula Injection (CWE-1236):
 * Jika nilai diawali dengan =, +, -, @, tambahkan petik tunggal (') di depannya
 * agar dievaluasi murni sebagai teks dan tidak mengeksekusi macro/formula berbahaya.
 */
export function sanitasiFormulaExcel<T = any>(nilai: T): T {
  if (typeof nilai !== 'string') return nilai;
  const teks = nilai.trim();
  const karakterBahaya = ['=', '+', '-', '@', '\t', '\r'];
  if (karakterBahaya.some((char) => teks.startsWith(char))) {
    return `'${nilai}` as unknown as T;
  }
  return nilai;
}
