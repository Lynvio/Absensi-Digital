import { useEffect, useRef, type RefObject } from 'react';

const PEMILIH_FOKUS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useAksesibilitasDialog(
  terbuka: boolean,
  kontainerRef: RefObject<HTMLElement | null>,
  padaTutup: () => void
) {
  const tutupRef = useRef(padaTutup);

  useEffect(() => {
    tutupRef.current = padaTutup;
  }, [padaTutup]);

  useEffect(() => {
    if (!terbuka) return;

    const kontainer = kontainerRef.current;
    if (!kontainer) return;

    const fokusSebelumnya = document.activeElement;
    const bingkaiFokus = window.requestAnimationFrame(() => {
      const fokusAwal =
        kontainer.querySelector<HTMLElement>('[data-dialog-initial-focus]') ||
        kontainer.querySelector<HTMLElement>(PEMILIH_FOKUS) ||
        kontainer;
      fokusAwal.focus();
    });

    const tanganiTombol = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        tutupRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const elemenFokus = Array.from(kontainer.querySelectorAll<HTMLElement>(PEMILIH_FOKUS));
      if (!elemenFokus.length) {
        event.preventDefault();
        kontainer.focus();
        return;
      }

      const pertama = elemenFokus[0];
      const terakhir = elemenFokus[elemenFokus.length - 1];
      if (event.shiftKey && (document.activeElement === pertama || !kontainer.contains(document.activeElement))) {
        event.preventDefault();
        terakhir.focus();
      } else if (!event.shiftKey && (document.activeElement === terakhir || !kontainer.contains(document.activeElement))) {
        event.preventDefault();
        pertama.focus();
      }
    };

    document.addEventListener('keydown', tanganiTombol);
    return () => {
      window.cancelAnimationFrame(bingkaiFokus);
      document.removeEventListener('keydown', tanganiTombol);
      if (fokusSebelumnya instanceof HTMLElement && fokusSebelumnya.isConnected) {
        fokusSebelumnya.focus();
      }
    };
  }, [terbuka, kontainerRef]);
}
