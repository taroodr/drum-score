"use client";

import { useEffect, useRef } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

const osmdOptions = {
  autoResize: true,
  backend: "svg",
  drawTitle: false,
  drawingParameters: "compacttight",
  renderSingleHorizontalStaffline: false,
};

type OsmdViewerProps = {
  musicXml: string;
};

export default function OsmdViewer({ musicXml }: OsmdViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(
        containerRef.current,
        osmdOptions
      );
    }

    const osmd = osmdRef.current;
    console.log("MusicXML output:", musicXml);
    osmd
      .load(musicXml)
      .then(() => osmd.render())
      .catch((error) => {
        console.error("OSMD render failed", error);
      });
  }, [musicXml]);

  return <div className="osmd-view" ref={containerRef} />;
}
