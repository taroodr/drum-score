"use client";

import { useEffect, useRef, useState } from "react";
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';

type VerovioViewerProps = {
  musicXml: string;
};

export default function VerovioViewer({ musicXml }: VerovioViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const toolkitRef = useRef<VerovioToolkit | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Verovio初期化（1回のみ）
  useEffect(() => {
    const initVerovio = async () => {
      try {
        const VerovioModule = await createVerovioModule();
        const toolkit = new VerovioToolkit(VerovioModule);

        toolkit.setOptions({
          scale: 100,
          adjustPageHeight: true,
          pageHeight: 2970,
          pageWidth: 2100,
          footer: 'none',
          header: 'none',
          breaks: 'none',
          justifyVertically: false
        });

        toolkitRef.current = toolkit;
        setIsReady(true);
      } catch (error) {
        console.error("Verovio initialization failed", error);
      }
    };

    if (!toolkitRef.current) {
      initVerovio();
    }
  }, []);

  // MusicXMLレンダリング
  useEffect(() => {
    if (!containerRef.current || !toolkitRef.current || !isReady) return;

    try {
      console.log("MusicXML output:", musicXml);
      const toolkit = toolkitRef.current;
      toolkit.loadData(musicXml);
      const svg = toolkit.renderToSVG(1);

      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    } catch (error) {
      console.error("Verovio render failed", error);
    }
  }, [musicXml, isReady]);

  return <div className="osmd-view" ref={containerRef} />;
}
