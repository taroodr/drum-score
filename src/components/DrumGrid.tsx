"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { jsPDF } from "jspdf";
import {
  drumKit,
  instrumentByRow,
  staffLineRows,
  staffRowCount,
} from "@/lib/drumKit";
import { buildMusicXml } from "@/lib/musicXml";
import OsmdViewer from "@/components/OsmdViewer";

const STORAGE_KEY = "drum-score:v1";
const beatsPerMeasure = 4;
const ticksPerBeat = 12;
const columnsPerBeat = 4;

type SavedGrid = {
  version: 4 | 3 | 2 | 1;
  measures: number;
  beatsPerMeasure: number;
  subdivisions: number;
  notes:
    | string[]
    | { row: number; tick: number; duration: number }[];
  tripletBeats?: string[];
};

const clampMeasures = (value: number) => {
  if (Number.isNaN(value)) return 1;
  return Math.min(32, Math.max(1, value));
};

const makeKey = (row: number, tick: number) => `${row}:${tick}`;

const parseKey = (key: string) => {
  const [rowStr, tickStr] = key.split(":");
  const row = Number(rowStr);
  const tick = Number(tickStr);
  if (Number.isNaN(row) || Number.isNaN(tick)) return null;
  return { row, tick };
};

const ticksPerSubdivision = (subdivisions: number) =>
  Math.round(ticksPerBeat / subdivisions);

const colToTick = (col: number, subdivisions: number) =>
  Math.round((col * ticksPerBeat) / subdivisions);

const makeBeatKey = (measureIndex: number, beatIndex: number) =>
  `${measureIndex}:${beatIndex}`;

const deserializeNotes = (
  parsed: SavedGrid,
  safeMeasures: number,
  safeSubdivisions: number
) => {
  const maxTick = safeMeasures * beatsPerMeasure * ticksPerBeat;
  const next = new Map<string, number>();

  if ((parsed.version === 3 || parsed.version === 4) && Array.isArray(parsed.notes)) {
    parsed.notes.forEach((note) => {
      if (typeof note !== "object" || note === null) return;
      const { row, tick, duration } = note as {
        row: number;
        tick: number;
        duration: number;
      };
      if (Number.isNaN(row) || Number.isNaN(tick)) return;
      if (row < 0 || row >= staffRowCount) return;
      if (tick < 0 || tick >= maxTick) return;
      if (Number.isNaN(duration) || duration <= 0) return;
      next.set(makeKey(row, tick), duration);
    });
    return next;
  }

  const legacyNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
  legacyNotes.forEach((key) => {
    if (typeof key !== "string") return;
    const parsedKey = parseKey(key);
    if (!parsedKey) return;
    if (parsedKey.row < 0 || parsedKey.row >= staffRowCount) return;
    if (parsed.version === 1) {
      const tick = colToTick(parsedKey.tick, safeSubdivisions);
      if (tick >= 0 && tick < maxTick) {
        next.set(makeKey(parsedKey.row, tick), ticksPerSubdivision(safeSubdivisions));
      }
      return;
    }
    if (parsedKey.tick >= 0 && parsedKey.tick < maxTick) {
      next.set(makeKey(parsedKey.row, parsedKey.tick), ticksPerSubdivision(safeSubdivisions));
    }
  });
  return next;
};

export default function DrumGrid() {
  const [measures, setMeasures] = useState(2);
  const [notes, setNotes] = useState<Map<string, number>>(() => new Map());
  const [tripletBeats, setTripletBeats] = useState<Set<string>>(
    () => new Set()
  );
  const [tripletMeasure, setTripletMeasure] = useState<number>(1);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const osmdExportRef = useRef<HTMLDivElement | null>(null);

  const columns = useMemo(
    () => measures * beatsPerMeasure * columnsPerBeat,
    [measures]
  );

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SavedGrid;
      if (
        parsed.version !== 1 &&
        parsed.version !== 2 &&
        parsed.version !== 3 &&
        parsed.version !== 4
      )
        return;
      const safeMeasures = clampMeasures(parsed.measures ?? 2);
      const safeSubdivisions =
        typeof parsed.subdivisions === "number"
          ? parsed.subdivisions
          : columnsPerBeat;
      const filtered = deserializeNotes(
        parsed,
        safeMeasures,
        safeSubdivisions
      );
      const loadedTriplets = new Set(
        Array.isArray(parsed.tripletBeats) ? parsed.tripletBeats : []
      );
      setMeasures(safeMeasures);
      setNotes(filtered);
      setTripletBeats(loadedTriplets);
      setTripletMeasure((prev) =>
        Math.min(Math.max(prev, 1), safeMeasures)
      );
      setLastSavedAt("Loaded local score");
    } catch (error) {
      console.warn("Failed to load saved drum score", error);
    }
  }, []);

  const toggleNote = useCallback(
    (row: number, col: number) => {
      setNotes((prev) => {
        const next = new Map(prev);
        const columnsPerMeasure = beatsPerMeasure * columnsPerBeat;
        const measureIndex = Math.floor(col / columnsPerMeasure);
        const colWithinMeasure = col % columnsPerMeasure;
        const beatIndex = Math.floor(colWithinMeasure / columnsPerBeat);
        const colInBeat = colWithinMeasure % columnsPerBeat;
        const isTriplet = tripletBeats.has(
          makeBeatKey(measureIndex, beatIndex)
        );
        const tripletIndex = Math.floor(
          (colInBeat * 3) / columnsPerBeat
        );
        const beatStartTick =
          (measureIndex * beatsPerMeasure + beatIndex) * ticksPerBeat;
        const tick = isTriplet
          ? beatStartTick + tripletIndex * 4
          : beatStartTick + colInBeat * 3;
        const key = makeKey(row, tick);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.set(key, isTriplet ? 4 : 3);
        }
        return next;
      });
    },
    [tripletBeats]
  );

  const handleMeasureChange = (value: number) => {
    const nextMeasures = clampMeasures(value);
    setMeasures(nextMeasures);
    setTripletMeasure((prev) => Math.min(Math.max(prev, 1), nextMeasures));
    setNotes((prev) => {
      const next = new Map<string, number>();
      const maxTick = nextMeasures * beatsPerMeasure * ticksPerBeat;
      prev.forEach((duration, key) => {
        const parsedKey = parseKey(key);
        if (!parsedKey) return;
        if (parsedKey.tick < maxTick) {
          next.set(key, duration);
        }
      });
      return next;
    });
    setTripletBeats((prev) => {
      const next = new Set<string>();
      prev.forEach((key) => {
        const parsedKey = key.split(":").map(Number);
        if (parsedKey.length !== 2) return;
        const [measureIndex] = parsedKey;
        if (Number.isNaN(measureIndex)) return;
        if (measureIndex < nextMeasures) {
          next.add(key);
        }
      });
      return next;
    });
  };

  const handleClear = () => {
    setNotes(new Map());
  };

  const handleTripletToggle = (measureIndex: number, beatIndex: number) => {
    setTripletBeats((prev) => {
      const next = new Set(prev);
      const key = makeBeatKey(measureIndex, beatIndex);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = () => {
    const payload: SavedGrid = {
      version: 4,
      measures,
      beatsPerMeasure,
      subdivisions: columnsPerBeat,
      notes: Array.from(notes.entries()).map(([key, duration]) => {
        const parsedKey = parseKey(key);
        return {
          row: parsedKey?.row ?? 0,
          tick: parsedKey?.tick ?? 0,
          duration,
        };
      }),
      tripletBeats: Array.from(tripletBeats),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setLastSavedAt(new Date().toLocaleString());
  };

  const handleLoad = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setLastSavedAt("No saved score found");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as SavedGrid;
      if (
        parsed.version !== 1 &&
        parsed.version !== 2 &&
        parsed.version !== 3 &&
        parsed.version !== 4
      ) {
        setLastSavedAt("Unsupported save format");
        return;
      }
      const safeMeasures = clampMeasures(parsed.measures ?? 2);
      const safeSubdivisions =
        typeof parsed.subdivisions === "number"
          ? parsed.subdivisions
          : columnsPerBeat;
      const filtered = deserializeNotes(
        parsed,
        safeMeasures,
        safeSubdivisions
      );
      const loadedTriplets = new Set(
        Array.isArray(parsed.tripletBeats) ? parsed.tripletBeats : []
      );
      setMeasures(safeMeasures);
      setNotes(filtered);
      setTripletBeats(loadedTriplets);
      setTripletMeasure((prev) =>
        Math.min(Math.max(prev, 1), safeMeasures)
      );
      setLastSavedAt("Loaded local score");
    } catch (error) {
      console.warn("Failed to load saved drum score", error);
      setLastSavedAt("Failed to load save data");
    }
  };

  const rows = useMemo(
    () => Array.from({ length: staffRowCount }, (_, row) => row),
    []
  );
  const cols = useMemo(() => Array.from({ length: columns }, (_, i) => i), [
    columns,
  ]);
  const musicXml = useMemo(
    () =>
      buildMusicXml({
        measures,
        beatsPerMeasure,
        ticksPerBeat,
        notes,
      }),
    [measures, notes]
  );

  const exportSvgAsPng = async () => {
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
  };

  const exportPng = async () => {
    if (!osmdExportRef.current) return;
    setExportStatus("Exporting PNG...");
    try {
      const dataUrl = await exportSvgAsPng();
      const link = document.createElement("a");
      link.download = `drum-score-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setExportStatus("PNG exported");
    } catch (error) {
      console.error(error);
      setExportStatus("PNG export failed");
    }
  };

  const exportPdf = async () => {
    if (!osmdExportRef.current) return;
    setExportStatus("Exporting PDF...");
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
        setExportStatus("PDF exported");
      };
      img.src = dataUrl;
    } catch (error) {
      console.error(error);
      setExportStatus("PDF export failed");
    }
  };

  return (
    <section className="grid-shell" aria-label="Drum staff editor">
      <header className="grid-header">
        <div>
          <p className="eyebrow">Drum Score Builder</p>
          <h1>クリックで叩けるドラム譜</h1>
          <p className="subtle">
            1小節は常に16分グリッド。拍ごとに三連符へ切り替え可能。
          </p>
        </div>
        <div className="legend">
          {drumKit.map((instrument) => (
            <div key={instrument.id} className="legend-item">
              <span
                className={`legend-head ${instrument.noteHead === "x" ? "legend-x" : "legend-dot"}`}
                aria-hidden
              />
              <span>{instrument.label}</span>
            </div>
          ))}
        </div>
      </header>
      <div className="ad-zone" aria-label="Advertisement">
        <span>Ad Space (Auto ads)</span>
      </div>

      <div className="controls">
        <div className="control-block">
          <label htmlFor="measure-input">Measures</label>
          <div className="measure-input">
            <input
              id="measure-input"
              type="number"
              min={1}
              max={32}
              value={measures}
              onChange={(event) =>
                handleMeasureChange(Number(event.target.value))
              }
            />
            <span className="measure-caption">1-32</span>
          </div>
        </div>
        <div className="control-block">
          <label htmlFor="triplet-measure">Triplet Beat</label>
          <div className="measure-input">
            <input
              id="triplet-measure"
              type="number"
              min={1}
              max={measures}
              value={tripletMeasure}
              onChange={(event) =>
                setTripletMeasure(
                  Math.min(
                    Math.max(1, Number(event.target.value)),
                    measures
                  )
                )
              }
            />
            <span className="measure-caption">Measure</span>
          </div>
          <div className="button-row beat-row">
            {Array.from({ length: beatsPerMeasure }, (_, beatIndex) => {
              const key = makeBeatKey(tripletMeasure - 1, beatIndex);
              const active = tripletBeats.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`ghost ${active ? "active" : ""}`}
                  onClick={() =>
                    handleTripletToggle(tripletMeasure - 1, beatIndex)
                  }
                >
                  Beat {beatIndex + 1}
                </button>
              );
            })}
          </div>
          <span className="helper">選択した拍を三連符グリッドにする</span>
        </div>
        <div className="control-block">
          <label>Storage</label>
          <div className="button-row">
            <button type="button" onClick={handleSave}>
              Save
            </button>
            <button type="button" onClick={handleLoad} className="ghost">
              Load
            </button>
            <button type="button" onClick={handleClear} className="ghost">
              Clear
            </button>
          </div>
          <span className="helper">
            {lastSavedAt ? `Status: ${lastSavedAt}` : ""}
          </span>
        </div>
        <div className="control-block">
          <label>Export</label>
          <div className="button-row">
            <button type="button" className="ghost" onClick={exportPdf}>
              PDF
            </button>
            <button type="button" className="ghost" onClick={exportPng}>
              Image
            </button>
          </div>
          <span className="helper">
            {exportStatus ? exportStatus : "OSMDプレビューを書き出します"}
          </span>
        </div>
      </div>

      <div className="staff-wrap" role="grid" aria-label="Drum staff grid">
        <div className="staff-labels" aria-hidden>
          {rows.map((row) => {
            const instrument = instrumentByRow.get(row);
            const isLine = staffLineRows.has(row);
            return (
              <div
                key={`label-${row}`}
                className={`label-row ${isLine ? "line-row" : ""}`}
              >
                <span>{instrument ? instrument.label : ""}</span>
              </div>
            );
          })}
        </div>
        <div className="staff-grid">
          {rows.map((row) => {
            const instrument = instrumentByRow.get(row);
            const isLine = staffLineRows.has(row);
            return (
              <div
                key={`row-${row}`}
                className={`staff-row ${isLine ? "line-row" : ""}`}
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(24px, 1fr))` }}
              >
                {cols.map((col) => {
                  const columnsPerMeasure = beatsPerMeasure * columnsPerBeat;
                  const measureIndex = Math.floor(col / columnsPerMeasure);
                  const colWithinMeasure = col % columnsPerMeasure;
                  const beatIndex = Math.floor(
                    colWithinMeasure / columnsPerBeat
                  );
                  const colInBeat = colWithinMeasure % columnsPerBeat;
                  const isTriplet = tripletBeats.has(
                    makeBeatKey(measureIndex, beatIndex)
                  );
                  const tripletIndex = Math.floor(
                    (colInBeat * 3) / columnsPerBeat
                  );
                  const beatStartTick =
                    (measureIndex * beatsPerMeasure + beatIndex) * ticksPerBeat;
                  const tick = isTriplet
                    ? beatStartTick + tripletIndex * 4
                    : beatStartTick + colInBeat * 3;
                  const cellKey = makeKey(row, tick);
                  const active = notes.has(cellKey);
                  const isMeasureStart =
                    col % (beatsPerMeasure * columnsPerBeat) === 0;
                  const isBeatStart = colInBeat === 0;
                  return (
                    <button
                      key={cellKey}
                      type="button"
                      className={`cell ${active ? "active" : ""} ${isMeasureStart ? "measure-start" : ""} ${isBeatStart ? "beat-start" : ""} ${isTriplet ? "triplet-beat" : ""}`}
                      onClick={() =>
                        instrument && toggleNote(row, col)
                      }
                      disabled={!instrument}
                      aria-label={
                        instrument
                          ? `${instrument.label} ${col + 1}`
                          : `Empty row ${row + 1}`
                      }
                    >
                      {active && instrument ? (
                        instrument.noteHead === "x" ? (
                          <span className="note-x">x</span>
                        ) : (
                          <span className="note-dot" />
                        )
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="ad-zone" aria-label="Advertisement">
        <span>Ad Space (Auto ads)</span>
      </div>

      <div className="osmd-panel" ref={osmdExportRef}>
        <div className="osmd-header">
          <h2>Notation Preview (OpenSheetMusicDisplay)</h2>
          <p className="subtle">
            OSMD で MusicXML をレンダリングした譜面プレビュー。
          </p>
        </div>
        <OsmdViewer musicXml={musicXml} />
      </div>
    </section>
  );
}
