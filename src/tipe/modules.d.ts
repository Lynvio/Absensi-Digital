/**
 * Deklarasi tipe untuk pustaka pihak ketiga yang distribusinya
 * tidak menyertakan berkas definisi TypeScript (.d.ts) lengkap.
 *
 * Catatan teknis:
 * - jspdf v2.5.x menyertakan path "types/index.d.ts" di package.json
 *   namun folder tersebut tidak selalu tersedia setelah npm install.
 *   Kita tulis tipe minimal yang aman untuk menjaga kompatibilitas build.
 * - html5-qrcode mempunyai types bawaan; deklarasi di sini hanya sebagai fallback.
 * - chartjs-plugin-datalabels belum memiliki @types di registry.
 */

declare module 'jspdf' {
  interface JsPDFOptions {
    orientation?: 'p' | 'portrait' | 'l' | 'landscape';
    unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc';
    format?: string | number[];
    compress?: boolean;
    precision?: number;
    userUnit?: number;
    encryption?: object;
    putOnlyUsedFonts?: boolean;
    hotfixes?: string[];
    floatPrecision?: number | 'smart';
  }

  class jsPDF {
    constructor(options?: JsPDFOptions);
    constructor(
      orientation?: JsPDFOptions['orientation'],
      unit?: JsPDFOptions['unit'],
      format?: JsPDFOptions['format'],
      compress?: boolean
    );
    internal: {
      pageSize: { getWidth(): number; getHeight(): number };
    };
    setFontSize(size: number): jsPDF;
    setFont(fontName: string, fontStyle?: string): jsPDF;
    setTextColor(r: number, g?: number, b?: number): jsPDF;
    setFillColor(r: number, g?: number, b?: number): jsPDF;
    setDrawColor(r: number, g?: number, b?: number): jsPDF;
    setLineWidth(width: number): jsPDF;
    text(
      text: string | string[],
      x: number,
      y: number,
      options?: { align?: string; maxWidth?: number; angle?: number; baseline?: string }
    ): jsPDF;
    addImage(
      imageData: string | HTMLImageElement | HTMLCanvasElement | Uint8Array,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number,
      alias?: string,
      compression?: string,
      rotation?: number
    ): jsPDF;
    rect(x: number, y: number, w: number, h: number, style?: string): jsPDF;
    roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): jsPDF;
    line(x1: number, y1: number, x2: number, y2: number, style?: string): jsPDF;
    addPage(format?: string | number[], orientation?: string): jsPDF;
    save(filename?: string): jsPDF;
    output(type: 'blob'): Blob;
    output(type: 'datauristring' | 'datauri'): string;
    output(type: 'arraybuffer'): ArrayBuffer;
    output(type?: string, options?: object): unknown;
    getNumberOfPages(): number;
    setPage(pageNumber: number): jsPDF;
    deletePage(targetPage: number): jsPDF;
    splitTextToSize(text: string, maxlen: number, options?: object): string[];
  }

  export = jsPDF;
}

declare module 'chartjs-plugin-datalabels' {
  const plugin: unknown;
  export default plugin;
}

interface NDEFRecordLike {
  data?: unknown;
}

interface NDEFReadingEventLike extends Event {
  message: { records: NDEFRecordLike[] };
}

interface NDEFReaderLike {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(
    type: string,
    listener: (event: NDEFReadingEventLike) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
}

interface Window {
  NDEFReader?: new () => NDEFReaderLike;
}
