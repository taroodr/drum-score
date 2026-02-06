"use client";

import { useCallback, useRef } from "react";
import { jsPDF } from "jspdf";
import { buildMidiFromMusicXml } from "@/lib/midi";

interface UseExportOptions {
  musicXml: string;
  bpm: number;
  setExportStatus: (status: { key: string; detail?: string } | null) => void;
}

interface UseExportReturn {
  osmdExportRef: React.RefObject<HTMLDivElement | null>;
  exportPdf: () => Promise<void>;
  exportPng: () => Promise<void>;
  exportMidi: () => void;
}

export function useExport({
  musicXml,
  bpm,
  setExportStatus,
}: UseExportOptions): UseExportReturn {
  const osmdExportRef = useRef<HTMLDivElement | null>(null);

  const exportSvgAsPng = useCallback(async () => {
    const svg = osmdExportRef.current?.querySelector("svg");
    if (!svg) throw new Error("OSMD SVG not found");
    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      img.decoding = "async";
      const svgWidth = svg.viewBox.baseVal.width || svg.clientWidth;
      const svgHeight = svg.viewBox.baseVal.height || svg.clientHeight;
      const width = Math.max(1, Math.ceil(svgWidth));
      const height = Math.max(1, Math.ceil(svgHeight));
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const exportPng = useCallback(async () => {
    if (!osmdExportRef.current) return;
    setExportStatus({ key: "status.export.png" });
    try {
      const dataUrl = await exportSvgAsPng();
      const link = document.createElement("a");
      link.download = `drum-score-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setExportStatus({ key: "status.export.png.done" });
    } catch (error) {
      console.error(error);
      setExportStatus({ key: "status.export.png.fail" });
    }
  }, [exportSvgAsPng, setExportStatus]);

  const exportPdf = useCallback(async () => {
    if (!osmdExportRef.current) return;
    setExportStatus({ key: "status.export.pdf" });
    try {
      const dataUrl = await exportSvgAsPng();
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const img = new Image();
      img.onload = () => {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
        const width = img.width * ratio;
        const height = img.height * ratio;
        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;
        pdf.addImage(img, "PNG", x, y, width, height);
        pdf.save(`drum-score-${Date.now()}.pdf`);
        setExportStatus({ key: "status.export.pdf.done" });
      };
      img.src = dataUrl;
    } catch (error) {
      console.error(error);
      setExportStatus({ key: "status.export.pdf.fail" });
    }
  }, [exportSvgAsPng, setExportStatus]);

  const exportMidi = useCallback(() => {
    setExportStatus({ key: "status.export.midi" });
    try {
      const midiBytes = buildMidiFromMusicXml(musicXml, bpm);
      const blob = new Blob([midiBytes], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `drum-score-${Date.now()}.mid`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus({ key: "status.export.midi.done" });
    } catch (error) {
      console.error(error);
      setExportStatus({ key: "status.export.midi.fail" });
    }
  }, [musicXml, bpm, setExportStatus]);

  return {
    osmdExportRef,
    exportPdf,
    exportPng,
    exportMidi,
  };
}
