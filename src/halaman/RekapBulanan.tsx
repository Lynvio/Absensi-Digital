import { createApp } from 'vue';
import { useEffect, useRef } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import HalamanRekapBulananVue from './RekapBulanan.vue';

interface PropertiRekapBulanan {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

export function HalamanRekapBulanan({ setMemuat }: PropertiRekapBulanan) {
  const elemenAkar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const akar = elemenAkar.current;
    if (!akar) return;

    const aplikasiVue = createApp(HalamanRekapBulananVue, { setMemuat });
    aplikasiVue.mount(akar);

    return () => aplikasiVue.unmount();
  }, [setMemuat]);

  return <div ref={elemenAkar} />;
}
