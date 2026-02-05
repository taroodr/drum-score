declare module 'verovio/wasm' {
  export default function createVerovioModule(): Promise<any>;
}

declare module 'verovio/esm' {
  export class VerovioToolkit {
    constructor(module: any);
    setOptions(options: {
      scale?: number;
      adjustPageHeight?: boolean;
      pageHeight?: number;
      pageWidth?: number;
      footer?: string;
      header?: string;
      breaks?: string;
      justifyVertically?: boolean;
    }): void;
    loadData(data: string): boolean;
    renderToSVG(page: number): string;
    getPageCount(): number;
  }
}
