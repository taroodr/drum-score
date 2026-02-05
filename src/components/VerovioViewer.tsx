"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';

type VerovioViewerProps = {
  musicXml: string;
};

export default function VerovioViewer({ musicXml }: VerovioViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const toolkitRef = useRef<VerovioToolkit | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const musicXmlRef = useRef(musicXml);
  musicXmlRef.current = musicXml;

  // Verovio初期化（1回のみ）
  useEffect(() => {
    const initVerovio = async () => {
      try {
        const VerovioModule = await createVerovioModule();
        const toolkit = new VerovioToolkit(VerovioModule);
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

  // コンテナ幅の監視
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // レンダリング関数
  const render = useCallback(() => {
    if (!containerRef.current || !toolkitRef.current || !isReady || containerWidth === 0) return;

    try {
      const toolkit = toolkitRef.current;
      // Verovioはスケール100で約10px/mmなので、ピクセル幅をmm単位に変換
      const pageWidthMm = Math.floor(containerWidth / 10 * 25.4);

      toolkit.setOptions({
        scale: 40,
        adjustPageHeight: true,
        pageHeight: 60000,
        pageWidth: pageWidthMm,
        footer: 'none',
        header: 'none',
        breaks: 'auto',
        justifyVertically: false
      });

      toolkit.loadData(musicXmlRef.current);
      const pageCount = toolkit.getPageCount();
      const svgParts: string[] = [];
      for (let i = 1; i <= pageCount; i++) {
        svgParts.push(toolkit.renderToSVG(i));
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = svgParts.join('');
      }
    } catch (error) {
      console.error("Verovio render failed", error);
    }
  }, [isReady, containerWidth]);

  // MusicXMLまたは幅が変わったら再レンダリング
  useEffect(() => {
    render();
  }, [musicXml, render]);

  return <div className="osmd-view" ref={containerRef} />;
}
