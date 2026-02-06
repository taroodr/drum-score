"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  drumKit,
  instrumentByRow,
  staffLineRows,
  staffRowCount,
} from "@/lib/drumKit";
import { buildMusicXml } from "@/lib/musicXml";
import { useLanguage } from "@/components/LanguageProvider";
import VerovioViewer from "@/components/VerovioViewer";
import { useAuth } from "@/components/AuthProvider";
import ScoreList from "@/components/ScoreList";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useScoreSave, type SavedGrid } from "@/hooks/useScoreSave";
import { useExport } from "@/hooks/useExport";

const beatsPerMeasure = 4;
const ticksPerBeat = 12;
const defaultBpm = 100;
const divisionOptions = [
  { value: 4, label: "16th" },
  { value: 2, label: "8th" },
  { value: 3, label: "16th triplet" },
] as const;

export type NoteType = "normal" | "ghost" | "accent" | "flam";

type NoteData = {
  duration: number;
  type: NoteType;
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

const getRowByInstrumentId = (id: string) =>
  drumKit.find((instrument) => instrument.id === id)?.gridRow ?? 0;

const createDefaultNotes = (measures: number) => {
  const totalBeats = measures * beatsPerMeasure;
  const map = new Map<string, NoteData>();
  const hihatRow = getRowByInstrumentId("hihat");
  const snareRow = getRowByInstrumentId("snare");
  const kickRow = getRowByInstrumentId("kick");
  const eighth = ticksPerBeat / 2;

  for (let beatIndex = 0; beatIndex < totalBeats; beatIndex += 1) {
    const beatStartTick = beatIndex * ticksPerBeat;
    map.set(makeKey(hihatRow, beatStartTick), { duration: eighth, type: "normal" });
    map.set(makeKey(hihatRow, beatStartTick + eighth), { duration: eighth, type: "normal" });
    const beatInMeasure = beatIndex % beatsPerMeasure;
    if (beatInMeasure === 1 || beatInMeasure === 3) {
      map.set(makeKey(snareRow, beatStartTick), { duration: ticksPerBeat, type: "normal" });
    }
    if (beatInMeasure === 0 || beatInMeasure === 2) {
      map.set(makeKey(kickRow, beatStartTick), { duration: ticksPerBeat, type: "normal" });
    }
  }

  return map;
};

const createRockNotes = (measures: number) => createDefaultNotes(measures);

const createPopNotes = (measures: number) => {
  const totalBeats = measures * beatsPerMeasure;
  const map = new Map<string, NoteData>();
  const hihatRow = getRowByInstrumentId("hihat");
  const snareRow = getRowByInstrumentId("snare");
  const kickRow = getRowByInstrumentId("kick");
  const eighth = ticksPerBeat / 2;

  for (let beatIndex = 0; beatIndex < totalBeats; beatIndex += 1) {
    const beatStartTick = beatIndex * ticksPerBeat;
    map.set(makeKey(hihatRow, beatStartTick), { duration: eighth, type: "normal" });
    map.set(makeKey(hihatRow, beatStartTick + eighth), { duration: eighth, type: "normal" });
    const beatInMeasure = beatIndex % beatsPerMeasure;
    if (beatInMeasure === 1 || beatInMeasure === 3) {
      map.set(makeKey(snareRow, beatStartTick), { duration: ticksPerBeat, type: "normal" });
    }
    if (beatInMeasure === 0) {
      map.set(makeKey(kickRow, beatStartTick), { duration: ticksPerBeat, type: "normal" });
    }
    if (beatInMeasure === 2) {
      map.set(makeKey(kickRow, beatStartTick + eighth), { duration: eighth, type: "normal" });
    }
  }

  return map;
};

const createShuffleNotes = (measures: number) => {
  const totalBeats = measures * beatsPerMeasure;
  const map = new Map<string, NoteData>();
  const hihatRow = getRowByInstrumentId("hihat");
  const snareRow = getRowByInstrumentId("snare");
  const kickRow = getRowByInstrumentId("kick");

  for (let beatIndex = 0; beatIndex < totalBeats; beatIndex += 1) {
    const beatStartTick = beatIndex * ticksPerBeat;
    map.set(makeKey(hihatRow, beatStartTick), { duration: 4, type: "normal" });
    map.set(makeKey(hihatRow, beatStartTick + 8), { duration: 4, type: "normal" });
    const beatInMeasure = beatIndex % beatsPerMeasure;
    if (beatInMeasure === 1 || beatInMeasure === 3) {
      map.set(makeKey(snareRow, beatStartTick), { duration: 4, type: "normal" });
    }
    if (beatInMeasure === 0 || beatInMeasure === 2) {
      map.set(makeKey(kickRow, beatStartTick), { duration: 4, type: "normal" });
    }
  }

  return map;
};


const deserializeNotes = (
  parsed: SavedGrid,
  safeMeasures: number,
  safeSubdivisions: number
) => {
  const maxTick = safeMeasures * beatsPerMeasure * ticksPerBeat;
  const next = new Map<string, NoteData>();

  if (
    (parsed.version === 3 ||
      parsed.version === 4 ||
      parsed.version === 5 ||
      parsed.version === 6 ||
      parsed.version === 7 ||
      parsed.version === 8) &&
    Array.isArray(parsed.notes)
  ) {
    parsed.notes.forEach((note) => {
      if (typeof note !== "object" || note === null) return;
      const { row, tick, duration, type } = note as {
        row: number;
        tick: number;
        duration: number;
        type?: NoteType;
      };
      if (Number.isNaN(row) || Number.isNaN(tick)) return;
      if (row < 0 || row >= staffRowCount) return;
      if (tick < 0 || tick >= maxTick) return;
      if (Number.isNaN(duration) || duration <= 0) return;
      next.set(makeKey(row, tick), { duration, type: type || "normal" });
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
        next.set(makeKey(parsedKey.row, tick), {
          duration: ticksPerSubdivision(safeSubdivisions),
          type: "normal"
        });
      }
      return;
    }
    if (parsedKey.tick >= 0 && parsedKey.tick < maxTick) {
      next.set(makeKey(parsedKey.row, parsedKey.tick), {
        duration: ticksPerSubdivision(safeSubdivisions),
        type: "normal"
      });
    }
  });
  return next;
};

export default function DrumGrid() {
  const [measures, setMeasures] = useState(2);
  const [notes, setNotes] = useState<Map<string, NoteData>>(() => new Map());
  const [noteType, setNoteType] = useState<NoteType>("normal");
  const [bpm, setBpm] = useState(defaultBpm);
  const [bpmInput, setBpmInput] = useState(String(defaultBpm));
  const [cellSize, setCellSize] = useState(24);
  const [samplePreset, setSamplePreset] = useState<
    "rock" | "pop" | "shuffle" | ""
  >("rock");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [subdivisionsByBeat, setSubdivisionsByBeat] = useState<number[]>(
    () => Array.from({ length: 2 * beatsPerMeasure }, () => 4)
  );
  const divisionGridRef = useRef<HTMLDivElement | null>(null);
  const staffGridRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = useRef(false);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const tickToPixelXRef = useRef<(tick: number) => number>(() => 0);

  const getSubdivisionsForBeat = useCallback(
    (globalBeatIndex: number) => subdivisionsByBeat[globalBeatIndex] ?? 4,
    [subdivisionsByBeat]
  );

  useEffect(() => {
    tickToPixelXRef.current = (tick: number) => {
      const totalBeats = subdivisionsByBeat.length;
      const beatIndex = Math.floor(tick / ticksPerBeat);
      const tickInBeat = tick - beatIndex * ticksPerBeat;
      let pixelX = 0;
      for (let i = 0; i < Math.min(beatIndex, totalBeats); i++) {
        pixelX += (subdivisionsByBeat[i] ?? 4) * cellSize;
      }
      if (beatIndex < totalBeats) {
        const subs = subdivisionsByBeat[beatIndex] ?? 4;
        pixelX += (tickInBeat / ticksPerBeat) * subs * cellSize;
      }
      return pixelX;
    };
  }, [cellSize, subdivisionsByBeat]);

  const { t } = useLanguage();
  const { user } = useAuth();

  const musicXml = useMemo(
    () =>
      buildMusicXml({
        measures,
        beatsPerMeasure,
        ticksPerBeat,
        notes,
        subdivisionsByBeat,
      }),
    [measures, notes, subdivisionsByBeat]
  );

  // Audio playback hook
  const {
    isPlaying,
    playMidi,
    stopPlayback,
    exportStatus,
    setExportStatus,
  } = useAudioPlayback({
    bpm,
    measures,
    beatsPerMeasure,
    ticksPerBeat,
    musicXml,
    tickToPixelXRef,
    staffGridRef,
    cursorRef,
  });

  // Export hook
  const { osmdExportRef, exportPdf, exportPng, exportMidi } = useExport({
    musicXml,
    bpm,
    setExportStatus,
  });

  // Score save hook
  const {
    lastSavedAt,
    scoreTitle,
    setScoreTitle,
    showScoreList,
    setShowScoreList,
    showSaveDialog,
    setShowSaveDialog,
    isSaving,
    handleSave,
    handleLoad,
    handleCloudSave,
    handleCloudLoad,
    loadFromLocalStorage,
  } = useScoreSave({
    measures,
    beatsPerMeasure,
    subdivisionsByBeat,
    notes,
    setMeasures,
    setSubdivisionsByBeat,
    setNotes,
    createDefaultNotes,
    deserializeNotes,
    clampMeasures,
  });

  // Load from local storage on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  const toggleNote = useCallback(
    (
      row: number,
      measureIndex: number,
      beatIndex: number,
      colInBeat: number,
      subdivisions: number,
      currentNoteType: NoteType
    ) => {
      setNotes((prev) => {
        const next = new Map(prev);
        const globalBeatIndex = measureIndex * beatsPerMeasure + beatIndex;
        const beatStartTick = globalBeatIndex * ticksPerBeat;
        const tick =
          beatStartTick + colInBeat * ticksPerSubdivision(subdivisions);
        const key = makeKey(row, tick);
        const existingNote = next.get(key);

        if (existingNote) {
          if (existingNote.type === currentNoteType) {
            next.delete(key);
          } else {
            next.set(key, { ...existingNote, type: currentNoteType });
          }
        } else {
          next.set(key, {
            duration: ticksPerSubdivision(subdivisions),
            type: currentNoteType
          });
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
      const next = new Map<string, NoteData>();
      const maxTick = nextMeasures * beatsPerMeasure * ticksPerBeat;
      prev.forEach((noteData, key) => {
        const parsedKey = parseKey(key);
        if (!parsedKey) return;
        if (parsedKey.tick < maxTick) {
          next.set(key, noteData);
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

  const rows = useMemo(
    () => Array.from({ length: staffRowCount }, (_, row) => row),
    []
  );
  const getDivisionLabel = useCallback(
    (value: number) => {
      if (value === 2) return t("division.8th");
      if (value === 3) return t("division.triplet");
      return t("division.16th");
    },
    [t]
  );

  const handleDivisionScroll = useCallback(() => {
    if (!divisionGridRef.current || !staffGridRef.current) return;
    if (isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    staffGridRef.current.scrollLeft = divisionGridRef.current.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }, []);

  const handleStaffScroll = useCallback(() => {
    if (!divisionGridRef.current || !staffGridRef.current) return;
    if (isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    divisionGridRef.current.scrollLeft = staffGridRef.current.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }, []);

  const applySample = useCallback(
    (mode: "rock" | "pop" | "shuffle") => {
      const totalBeats = measures * beatsPerMeasure;
      if (mode === "shuffle") {
        setSubdivisionsByBeat(
          Array.from({ length: totalBeats }, () => 3)
        );
        setNotes(createShuffleNotes(measures));
        return;
      }
      setSubdivisionsByBeat(Array.from({ length: totalBeats }, () => 4));
      if (mode === "pop") {
        setNotes(createPopNotes(measures));
      } else {
        setNotes(createRockNotes(measures));
      }
    },
    [measures]
  );

  return (
    <div className="page">
      <section
        id="editor"
        className="grid-shell"
        aria-label="Drum staff editor"
      >
      <header className="grid-header">
        <div>
          <p className="eyebrow">{t("hero.eyebrow")}</p>
          <h1>{t("hero.title")}</h1>
          <p className="subtle">{t("hero.subtitle")}</p>
        </div>
      </header>
      <div className="ad-zone" aria-label="Advertisement">
        <span>{t("ad.label")}</span>
      </div>

      <div className="controls">
        <div className="control-block">
          <label>{t("controls.storage")}</label>
          <div className="button-row">
            <button type="button" onClick={handleSave}>
              {t("controls.storage.save")}
            </button>
            <button type="button" onClick={handleLoad} className="ghost">
              {t("controls.storage.load")}
            </button>
            <button type="button" onClick={handleClear} className="ghost">
              {t("controls.storage.clear")}
            </button>
          </div>
          {user && (
            <div className="button-row" style={{ marginTop: 8 }}>
              <button type="button" onClick={() => setShowSaveDialog(true)}>
                {t("cloud.save")}
              </button>
              <button type="button" onClick={() => setShowScoreList(true)} className="ghost">
                {t("cloud.load")}
              </button>
            </div>
          )}
          <span className="helper">
            {lastSavedAt
              ? `${t("status.prefix")} ${t(lastSavedAt.key, lastSavedAt.detail ? { value: lastSavedAt.detail } : undefined)}`
              : ""}
          </span>
        </div>
      </div>

      {/* Playback Controls - Primary Actions */}
      <div className="playback-bar">
        <div className="playback-controls">
          <button
            type="button"
            className={`play-btn ${isPlaying ? "playing" : ""}`}
            onClick={isPlaying ? stopPlayback : playMidi}
            title={isPlaying ? t("controls.playback.stop") : t("controls.playback.play")}
          >
            {isPlaying ? "⏹" : "▶"}
          </button>
          <div className="bpm-control">
            <label htmlFor="bpm-input">{t("controls.bpm")}</label>
            <input
              id="bpm-input"
              type="number"
              min={30}
              max={400}
              value={bpmInput}
              onChange={(event) => {
                setBpmInput(event.target.value);
              }}
              onBlur={() => {
                const next = Number(bpmInput);
                if (Number.isNaN(next) || bpmInput === "") {
                  setBpmInput(String(bpm));
                  return;
                }
                const clamped = Math.min(400, Math.max(30, next));
                setBpm(clamped);
                setBpmInput(String(clamped));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
          </div>
        </div>
        <div className="playback-status">
          {exportStatus && (
            <span className="status-text">{t(exportStatus.key)}</span>
          )}
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="toolbar">
        <div className="toolbar-section">
          <div className="toolbar-group">
            <label>{t("controls.noteType")}</label>
            <div className="note-type-selector">
              <button
                type="button"
                className={noteType === "normal" ? "active" : ""}
                onClick={() => setNoteType("normal")}
                title={t("controls.noteType.normal")}
              >
                {t("controls.noteType.normal")}
              </button>
              <button
                type="button"
                className={noteType === "ghost" ? "active" : ""}
                onClick={() => setNoteType("ghost")}
                title={t("controls.noteType.ghost")}
              >
                {t("controls.noteType.ghost")}
              </button>
              <button
                type="button"
                className={noteType === "accent" ? "active" : ""}
                onClick={() => setNoteType("accent")}
                title={t("controls.noteType.accent")}
              >
                {t("controls.noteType.accent")}
              </button>
              <button
                type="button"
                className={noteType === "flam" ? "active" : ""}
                onClick={() => setNoteType("flam")}
                title={t("controls.noteType.flam")}
              >
                {t("controls.noteType.flam")}
              </button>
            </div>
          </div>
          <div className="toolbar-group">
            <label htmlFor="samples-select">{t("controls.samples")}</label>
            <div className="measure-input">
              <select
                id="samples-select"
                value={samplePreset}
                onChange={(event) => {
                  const value = event.target.value as
                    | "rock"
                    | "pop"
                    | "shuffle"
                    | "";
                  if (!value) return;
                  applySample(value);
                  setSamplePreset(value);
                }}
              >
                <option value="">{t("controls.samples.helper")}</option>
                <option value="rock">{t("controls.samples.rock")}</option>
                <option value="pop">{t("controls.samples.pop")}</option>
                <option value="shuffle">{t("controls.samples.shuffle")}</option>
              </select>
            </div>
          </div>
        </div>
        <div className="toolbar-section">
          <div className="toolbar-group">
            <label htmlFor="zoom-input">Zoom</label>
            <div className="measure-input">
              <select
                id="zoom-input"
                value={cellSize}
                onChange={(event) => setCellSize(Number(event.target.value))}
              >
                <option value={18}>80%</option>
                <option value={22}>90%</option>
                <option value={24}>100%</option>
                <option value={28}>115%</option>
                <option value={32}>130%</option>
              </select>
            </div>
          </div>
          <div className="toolbar-group">
            <label>{t("controls.measures")}</label>
            <div className="measure-buttons">
              <button
                type="button"
                className="measure-btn"
                onClick={() => handleMeasureChange(measures - 1)}
                disabled={measures <= 1}
                title={t("controls.measures.remove")}
              >
                −
              </button>
              <span className="measure-count">{measures}</span>
              <button
                type="button"
                className="measure-btn"
                onClick={() => handleMeasureChange(measures + 1)}
                disabled={measures >= 32}
                title={t("controls.measures.add")}
              >
                +
              </button>
            </div>
          </div>
          <div className="toolbar-group export-group">
            <button
              type="button"
              className="export-toggle"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              {t("controls.export")} ▾
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button type="button" onClick={() => { exportPdf(); setShowExportMenu(false); }}>
                  {t("controls.export.pdf")}
                </button>
                <button type="button" onClick={() => { exportPng(); setShowExportMenu(false); }}>
                  {t("controls.export.image")}
                </button>
                <button type="button" onClick={() => { exportMidi(); setShowExportMenu(false); }}>
                  {t("controls.export.midi")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="staff-wrap"
        role="grid"
        aria-label="Drum staff grid"
        style={{ ["--cell-size" as string]: `${cellSize}px` }}
      >
        <div className="grid-division" aria-label="Division grid header">
          <div className="division-label">
            <span>{t("division.label")}</span>
          </div>
          <div
            className="division-grid"
            ref={divisionGridRef}
            onScroll={handleDivisionScroll}
          >
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
                        } ${beatIndex % 2 === 0 ? "beat-even" : "beat-odd"}`}
                        style={{
                        gridTemplateColumns: `repeat(${subdivisions}, var(--cell-size))`,
                        }}
                        onClick={() =>
                          handleBeatDivisionToggle(globalBeatIndex)
                        }
                      >
                        <span className="division-label-single">
                          {divisionLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="staff-body">
        <div
          className="staff-labels"
          aria-hidden
          style={{ gridTemplateRows: `repeat(${rows.length}, var(--cell-size))` }}
        >
          {rows.map((row) => {
            const instrument = instrumentByRow.get(row);
            const isLine = staffLineRows.has(row);
            return (
              <div
                key={`label-${row}`}
                className={`label-row ${isLine ? "line-row" : ""}`}
              >
                {instrument ? (
                  <>
                    <span className="label-full">{instrument.label}</span>
                    <span className="label-short">{instrument.shortLabel}</span>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
        <div
          className="staff-grid"
          ref={staffGridRef}
          onScroll={handleStaffScroll}
          style={{ gridTemplateRows: `repeat(${rows.length}, var(--cell-size))` }}
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
                              gridTemplateColumns: `repeat(${subdivisions}, var(--cell-size))`,
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
                                const noteData = notes.get(cellKey);
                                const active = !!noteData;
                                const isBeatStart = colInBeat === 0;
                                return (
                                  <button
                                    key={cellKey}
                                    type="button"
                                    className={`cell ${
                                      active ? "active" : ""
                                    } ${active && noteData ? `note-${noteData.type}` : ""} ${isBeatStart ? "beat-start" : ""} ${beatIndex % 2 === 0 ? "beat-even" : "beat-odd"}`}
                                    onClick={() =>
                                      instrument &&
                                      toggleNote(
                                        row,
                                        measureIndex,
                                        beatIndex,
                                        colInBeat,
                                        subdivisions,
                                        noteType
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
          <div ref={cursorRef} className="playback-cursor" style={{ display: "none" }} />
        </div>
        </div>
      </div>
      <div className="ad-zone" aria-label="Advertisement">
        <span>{t("ad.label")}</span>
      </div>

      <div className="osmd-panel" ref={osmdExportRef}>
        <div className="osmd-header">
          <h2>Notation Preview</h2>
        </div>
        <VerovioViewer musicXml={musicXml} />
      </div>
      </section>

      {showSaveDialog && (
        <div className="modal-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("cloud.saveTitle")}</h3>
              <button type="button" className="modal-close" onClick={() => setShowSaveDialog(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <label className="save-dialog-label">
                {t("cloud.scoreName")}
                <input
                  type="text"
                  className="save-dialog-input"
                  value={scoreTitle}
                  onChange={(e) => setScoreTitle(e.target.value)}
                  placeholder={t("cloud.untitled")}
                  autoFocus
                />
              </label>
              <div className="save-dialog-actions">
                <button
                  type="button"
                  onClick={handleCloudSave}
                  disabled={isSaving}
                >
                  {isSaving ? t("cloud.saving") : t("cloud.save")}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowSaveDialog(false)}
                >
                  {t("cloud.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ScoreList
        isOpen={showScoreList}
        onClose={() => setShowScoreList(false)}
        onSelect={handleCloudLoad}
      />
    </div>
  );
}
