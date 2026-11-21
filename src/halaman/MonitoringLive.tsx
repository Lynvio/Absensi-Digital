import { createApp } from 'vue';
import { useEffect, useRef } from 'react';
import HalamanMonitoringLiveVue from './MonitoringLive.vue';

interface PropertiMonitoringLive {
  setMemuat: (memuat: boolean) => void;
}

export function HalamanMonitoringLive({ setMemuat }: PropertiMonitoringLive) {
  const elemenAkar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const akar = elemenAkar.current;
    if (!akar) return;

    const aplikasiVue = createApp(HalamanMonitoringLiveVue, { setMemuat });
    aplikasiVue.mount(akar);

    return () => aplikasiVue.unmount();
  }, [setMemuat]);

  return <div ref={elemenAkar} />;
}
