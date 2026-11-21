const VERSI_CADANGAN = 1;
const KUNCI_DIKECUALIKAN = new Set(['sesi_tersimpan', 'absensiAppSession', 'token', 'auth_token']);

export interface CadanganAplikasi {
  versi: number;
  dibuatPada: string;
  localStorage: Record<string, string>;
}

export function buatCadanganLokal(): CadanganAplikasi {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const kunci = localStorage.key(i);
    if (kunci && !KUNCI_DIKECUALIKAN.has(kunci)) {
      const nilai = localStorage.getItem(kunci);
      if (nilai !== null) data[kunci] = nilai;
    }
  }
  return { versi: VERSI_CADANGAN, dibuatPada: new Date().toISOString(), localStorage: data };
}

export function unduhCadanganLokal(): void {
  const blob = new Blob([JSON.stringify(buatCadanganLokal(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `backup-absensi-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function pulihkanCadanganLokal(file: File): Promise<number> {
  const isi = JSON.parse(await file.text()) as Partial<CadanganAplikasi>;
  if (isi.versi !== VERSI_CADANGAN || !isi.localStorage || typeof isi.localStorage !== 'object') {
    throw new Error('Format backup tidak dikenal atau sudah tidak kompatibel.');
  }
  let jumlah = 0;
  Object.entries(isi.localStorage).forEach(([kunci, nilai]) => {
    if (!KUNCI_DIKECUALIKAN.has(kunci) && typeof nilai === 'string') {
      localStorage.setItem(kunci, nilai);
      jumlah += 1;
    }
  });
  return jumlah;
}
