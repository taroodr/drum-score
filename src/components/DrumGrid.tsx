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
import { buildMidiFromMusicXml, parseMidiNotesFromMusicXml } from "@/lib/midi";
import { loadDrumSamples, midiToSampleKey } from "@/lib/drumSamples";
import OsmdViewer from "@/components/OsmdViewer";

const STORAGE_KEY = "drum-score:v1";
const beatsPerMeasure = 4;
const ticksPerBeat = 12;
const playbackBpm = 100;
const divisionOptions = [
  { value: 4, label: "16th" },
  { value: 2, label: "8th" },
  { value: 3, label: "16th triplet" },
] as const;

type SavedGrid = {
  version: 7 | 6 | 5 | 4 | 3 | 2 | 1;
  measures: number;
  beatsPerMeasure: number;
  subdivisions: number;
  notes: string[] | { row: number; tick: number; duration: number }[];
  subdivisionsPerMeasure?: number[];
  subdivisionsPerBeat?: number[];
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


const deserializeNotes = (
  parsed: SavedGrid,
  safeMeasures: number,
  safeSubdivisions: number
) => {
  const maxTick = safeMeasures * beatsPerMeasure * ticksPerBeat;
  const next = new Map<string, number>();

  if (
    (parsed.version === 3 ||
      parsed.version === 4 ||
      parsed.version === 5 ||
      parsed.version === 6) &&
    Array.isArray(parsed.notes)
  ) {
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
  const [subdivisionsByBeat, setSubdivisionsByBeat] = useState<number[]>(
    () => Array.from({ length: 2 * beatsPerMeasure }, () => 4)
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const osmdExportRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sampleBuffersRef = useRef<Map<string, AudioBuffer> | null>(null);
  const sampleLoadingRef = useRef<Promise<Map<string, AudioBuffer>> | null>(
    null
  );

  const getSubdivisionsForBeat = useCallback(
    (globalBeatIndex: number) => subdivisionsByBeat[globalBeatIndex] ?? 4,
    [subdivisionsByBeat]
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
        parsed.version !== 4 &&
        parsed.version !== 5 &&
        parsed.version !== 6 &&
        parsed.version !== 7
      )
        return;
      const safeMeasures = clampMeasures(parsed.measures ?? 2);
      const totalBeats = safeMeasures * beatsPerMeasure;
      const fallbackSubdivisions =
        typeof parsed.subdivisions === "number" ? parsed.subdivisions : 4;
      const safeSubdivisionsByBeat =
        parsed.subdivisionsPerBeat?.length === totalBeats
          ? parsed.subdivisionsPerBeat
          : parsed.subdivisionsPerMeasure?.length === safeMeasures
            ? Array.from({ length: totalBeats }, (_, index) => {
                const measureIndex = Math.floor(index / beatsPerMeasure);
                return parsed.subdivisionsPerMeasure?.[measureIndex] ?? 4;
              })
            : Array.from({ length: totalBeats }, () => fallbackSubdivisions);
      const filtered = deserializeNotes(
        parsed,
        safeMeasures,
        fallbackSubdivisions
      );
      setMeasures(safeMeasures);
      setSubdivisionsByBeat(safeSubdivisionsByBeat);
      setNotes(filtered);
      setLastSavedAt("Loaded local score");
    } catch (error) {
      console.warn("Failed to load saved drum score", error);
    }
  }, []);

  const toggleNote = useCallback(
    (
      row: number,
      measureIndex: number,
      beatIndex: number,
      colInBeat: number,
      subdivisions: number
    ) => {
      setNotes((prev) => {
        const next = new Map(prev);
        const globalBeatIndex = measureIndex * beatsPerMeasure + beatIndex;
        const beatStartTick = globalBeatIndex * ticksPerBeat;
        const tick =
          beatStartTick + colInBeat * ticksPerSubdivision(subdivisions);
        const key = makeKey(row, tick);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.set(key, ticksPerSubdivision(subdivisions));
        }
        return next;
      });
    },
    []
  );

  const handleMeasureChange = (value: number) => {
    const nextMeasures = clampMeasures(value);
    setMeasures(nextMeasures);
    setSubdivisionsByBeat((prev) =>
      Array.from(
        { length: nextMeasures * beatsPerMeasure },
        (_, index) => prev[index] ?? 4
      )
    );
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
  };

  const handleClear = () => {
    setNotes(new Map());
  };

  const handleBeatDivisionToggle = (globalBeatIndex: number) => {
    setSubdivisionsByBeat((prev) => {
      const current = prev[globalBeatIndex] ?? 4;
      const optionIndex = divisionOptions.findIndex(
        (option) => option.value === current
      );
      const nextOption =
        divisionOptions[(optionIndex + 1) % divisionOptions.length];
      const next = [...prev];
      next[globalBeatIndex] = nextOption.value;
      return next;
    });
  };

  const handleSave = () => {
    const payload: SavedGrid = {
      version: 7,
      measures,
      beatsPerMeasure,
      subdivisions: 4,
      subdivisionsPerBeat: subdivisionsByBeat,
      notes: Array.from(notes.entries()).map(([key, duration]) => {
        const parsedKey = parseKey(key);
        return {
          row: parsedKey?.row ?? 0,
          tick: parsedKey?.tick ?? 0,
          duration,
        };
      }),
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
        parsed.version !== 4 &&
        parsed.version !== 5 &&
        parsed.version !== 6 &&
        parsed.version !== 7
      ) {
        setLastSavedAt("Unsupported save format");
        return;
      }
      const safeMeasures = clampMeasures(parsed.measures ?? 2);
      const totalBeats = safeMeasures * beatsPerMeasure;
      const fallbackSubdivisions =
        typeof parsed.subdivisions === "number" ? parsed.subdivisions : 4;
      const safeSubdivisionsByBeat =
        parsed.subdivisionsPerBeat?.length === totalBeats
          ? parsed.subdivisionsPerBeat
          : parsed.subdivisionsPerMeasure?.length === safeMeasures
            ? Array.from({ length: totalBeats }, (_, index) => {
                const measureIndex = Math.floor(index / beatsPerMeasure);
                return parsed.subdivisionsPerMeasure?.[measureIndex] ?? 4;
              })
            : Array.from({ length: totalBeats }, () => fallbackSubdivisions);
      const filtered = deserializeNotes(
        parsed,
        safeMeasures,
        fallbackSubdivisions
      );
      setMeasures(safeMeasures);
      setSubdivisionsByBeat(safeSubdivisionsByBeat);
      setNotes(filtered);
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
  const getDivisionLabel = useCallback((value: number) => {
    if (value === 2) return "8th";
    if (value === 3) return "16th triplet";
    return "16th";
  }, []);
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

  const exportMidi = () => {
    setExportStatus("Exporting MIDI...");
    try {
      const midiBytes = buildMidiFromMusicXml(musicXml);
      const blob = new Blob([midiBytes], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `drum-score-${Date.now()}.mid`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus("MIDI exported");
    } catch (error) {
      console.error(error);
      setExportStatus("MIDI export failed");
    }
  };

  const ensureSamplesLoaded = async (context: AudioContext) => {
    if (sampleBuffersRef.current) return sampleBuffersRef.current;
    if (!sampleLoadingRef.current) {
      sampleLoadingRef.current = loadDrumSamples(context);
    }
    try {
      const buffers = await sampleLoadingRef.current;
      sampleBuffersRef.current = buffers;
      return buffers;
    } catch (error) {
      sampleLoadingRef.current = null;
      throw error;
    }
  };

  const playMidi = async () => {
    setExportStatus("Playing...");
    try {
      const { divisions, notes } = parseMidiNotesFromMusicXml(musicXml);
      if (!notes.length) {
        setExportStatus("No notes to play");
        return;
      }

      const context =
        audioContextRef.current ??
        new AudioContext({
          latencyHint: "interactive",
        });
      audioContextRef.current = context;
      if (context.state === "suspended") {
        await context.resume();
      }

      setExportStatus("Loading samples...");
      const buffers = await ensureSamplesLoaded(context);

      const startAt = context.currentTime + 0.05;
      const secondsPerQuarter = 60 / playbackBpm;
      const secondsPerTick = secondsPerQuarter / divisions;

      notes.forEach((note) => {
        const startTime = startAt + note.startTick * secondsPerTick;
        const endTime =
          startAt + (note.startTick + note.duration) * secondsPerTick;
        const sampleKey = midiToSampleKey(note.midi);
        const buffer = sampleKey ? buffers.get(sampleKey) : undefined;
        if (!buffer) return;
        const source = context.createBufferSource();
        source.buffer = buffer;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.9, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime + 0.02);
        source.connect(gain).connect(context.destination);
        source.start(startTime);
      });

      const lastEnd = Math.max(
        ...notes.map(
          (note) => startAt + (note.startTick + note.duration) * secondsPerTick
        )
      );
      setExportStatus("Playing...");
      window.setTimeout(() => {
        setExportStatus("Playback finished");
      }, Math.max(0, (lastEnd - context.currentTime) * 1000) + 50);
    } catch (error) {
      console.error(error);
      setExportStatus("Playback failed");
    }
  };

  return (
    <section className="grid-shell" aria-label="Drum staff editor">
      <header className="grid-header">
        <div>
          <p className="eyebrow">Drum Score Builder</p>
          <h1>クリックで叩けるドラム譜</h1>
          <p className="subtle">
            クリック入力で譜面作成。Divisionで分割を変更できます。
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
            <button type="button" className="ghost" onClick={exportMidi}>
              MIDI
            </button>
          </div>
          <span className="helper">
            {exportStatus ? exportStatus : "OSMDプレビューを書き出します"}
          </span>
        </div>
        <div className="control-block">
          <label>Playback</label>
          <div className="button-row">
            <button type="button" className="ghost" onClick={playMidi}>
              Play
            </button>
          </div>
          <span className="helper">
            Drum samples: @teropa/drumkit (Freesound CC BY/CC0)
          </span>
        </div>
      </div>

      <div className="grid-division" aria-label="Division grid header">
        <div className="division-label">
          <span>Division</span>
        </div>
        <div className="division-grid">
          {Array.from({ length: measures }, (_, measureIndex) => {
            return (
              <div
                key={`division-measure-${measureIndex}`}
                className="division-measure"
              >
                {Array.from({ length: beatsPerMeasure }, (_, beatIndex) => {
                  const globalBeatIndex =
                    measureIndex * beatsPerMeasure + beatIndex;
                  const subdivisions =
                    getSubdivisionsForBeat(globalBeatIndex);
                  const divisionLabel = getDivisionLabel(subdivisions);
                  return (
                    <button
                      key={`division-beat-${measureIndex}-${beatIndex}`}
                      type="button"
                      className={`division-beat ${
                        beatIndex === 0 ? "measure-start" : ""
                      }`}
                      style={{
                        gridTemplateColumns: `repeat(${subdivisions}, 24px)`,
                      }}
                      onClick={() => handleBeatDivisionToggle(globalBeatIndex)}
                    >
                      {Array.from(
                        { length: subdivisions },
                        (_, colInBeat) => {
                          const isBeatStart = colInBeat === 0;
                          const label = `${colInBeat + 1} ${divisionLabel}`;
                          return (
                            <span
                              key={`division-${measureIndex}-${beatIndex}-${colInBeat}`}
                              className={`division-cell ${
                                isBeatStart ? "beat-start" : ""
                              }`}
                            >
                              {label}
                            </span>
                          );
                        }
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="staff-wrap" role="grid" aria-label="Drum staff grid">
        <div
          className="staff-labels"
          aria-hidden
          style={{ gridTemplateRows: `repeat(${rows.length}, 24px)` }}
        >
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
        <div
          className="staff-grid"
          style={{ gridTemplateRows: `repeat(${rows.length}, 24px)` }}
        >
          {rows.map((row) => {
            const instrument = instrumentByRow.get(row);
            const isLine = staffLineRows.has(row);
            return (
              <div
                key={`row-${row}`}
                className={`staff-row ${isLine ? "line-row" : ""}`}
              >
                {Array.from({ length: measures }, (_, measureIndex) => {
                  return (
                    <div
                      key={`row-${row}-measure-${measureIndex}`}
                      className="staff-measure"
                    >
                      {Array.from({ length: beatsPerMeasure }, (_, beatIndex) => {
                        const globalBeatIndex =
                          measureIndex * beatsPerMeasure + beatIndex;
                        const subdivisions =
                          getSubdivisionsForBeat(globalBeatIndex);
                        return (
                          <div
                            key={`row-${row}-measure-${measureIndex}-beat-${beatIndex}`}
                            className={`staff-beat ${
                              beatIndex === 0 ? "measure-start" : ""
                            }`}
                            style={{
                              gridTemplateColumns: `repeat(${subdivisions}, 24px)`,
                            }}
                          >
                            {Array.from(
                              { length: subdivisions },
                              (_, colInBeat) => {
                                const beatStartTick =
                                  globalBeatIndex * ticksPerBeat;
                                const tick =
                                  beatStartTick +
                                  colInBeat *
                                    ticksPerSubdivision(subdivisions);
                                const cellKey = makeKey(row, tick);
                                const active = notes.has(cellKey);
                                const isBeatStart = colInBeat === 0;
                                return (
                                  <button
                                    key={cellKey}
                                    type="button"
                                    className={`cell ${
                                      active ? "active" : ""
                                    } ${isBeatStart ? "beat-start" : ""}`}
                                    onClick={() =>
                                      instrument &&
                                      toggleNote(
                                        row,
                                        measureIndex,
                                        beatIndex,
                                        colInBeat,
                                        subdivisions
                                      )
                                    }
                                    disabled={!instrument}
                                    aria-label={
                                      instrument
                                        ? `${instrument.label} ${colInBeat + 1}`
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
                              }
                            )}
                          </div>
                        );
                      })}
                    </div>
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
