import { createApp } from 'vue';
import { useEffect, useRef } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import HalamanManajemenKelasVue from './ManajemenKelas.vue';

interface PropertiManajemenKelas {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

export function HalamanManajemenKelas({ sesi, setMemuat }: PropertiManajemenKelas) {
  const elemenAkar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const akar = elemenAkar.current;
    if (!akar) return;

    const aplikasiVue = createApp(HalamanManajemenKelasVue, { sesi, setMemuat });
    aplikasiVue.mount(akar);

    return () => aplikasiVue.unmount();
  }, [sesi, setMemuat]);

  return <div ref={elemenAkar} />;
}
