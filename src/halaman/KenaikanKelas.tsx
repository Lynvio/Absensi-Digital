import { createApp } from 'vue';
import { useEffect, useRef } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import HalamanKenaikanKelasVue from './KenaikanKelas.vue';

interface PropertiKenaikanKelas {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

export function HalamanKenaikanKelas({ setMemuat }: PropertiKenaikanKelas) {
  const elemenAkar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const akar = elemenAkar.current;
    if (!akar) return;

    const aplikasiVue = createApp(HalamanKenaikanKelasVue, { setMemuat });
    aplikasiVue.mount(akar);

    return () => aplikasiVue.unmount();
  }, [setMemuat]);

  return <div ref={elemenAkar} />;
}
