import { createApp } from 'vue';
import { useEffect, useRef } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import HalamanDataGuruVue from './DataGuru.vue';

interface PropertiDataGuru {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

export function HalamanDataGuru({ sesi, setMemuat }: PropertiDataGuru) {
  const elemenAkar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const akar = elemenAkar.current;
    if (!akar) return;

    const aplikasiVue = createApp(HalamanDataGuruVue, {
      token: sesi.token,
      setMemuat,
    });
    aplikasiVue.mount(akar);

    return () => aplikasiVue.unmount();
  }, [sesi.token, setMemuat]);

  return <div ref={elemenAkar} />;
}
