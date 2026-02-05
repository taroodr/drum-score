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
import { useLanguage } from "@/components/LanguageProvider";
import VerovioViewer from "@/components/VerovioViewer";

const STORAGE_KEY = "drum-score:v1";
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

type SavedGrid = {
  version: 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1;
  measures: number;
  beatsPerMeasure: number;
  subdivisions: number;
  notes: string[] | { row: number; tick: number; duration: number; type?: NoteType }[];
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
  const [cellSize, setCellSize] = useState(24);
  const [samplePreset, setSamplePreset] = useState<
    "rock" | "pop" | "shuffle" | ""
  >("rock");
  const [subdivisionsByBeat, setSubdivisionsByBeat] = useState<number[]>(
    () => Array.from({ length: 2 * beatsPerMeasure }, () => 4)
  );
  const [lastSavedAt, setLastSavedAt] = useState<
    { key: string; detail?: string } | null
  >(null);
  const [exportStatus, setExportStatus] = useState<
    { key: string; detail?: string } | null
  >(null);
  const osmdExportRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sampleBuffersRef = useRef<Map<string, AudioBuffer> | null>(null);
  const sampleLoadingRef = useRef<Promise<Map<string, AudioBuffer>> | null>(
    null
  );
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackTimeoutsRef = useRef<number[]>([]);
  const divisionGridRef = useRef<HTMLDivElement | null>(null);
  const staffGridRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafIdRef = useRef(0);
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

  const { locale, t } = useLanguage();

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultMeasures = 2;
      setMeasures(defaultMeasures);
      setSubdivisionsByBeat(
        Array.from({ length: defaultMeasures * beatsPerMeasure }, () => 4)
      );
      setNotes(createDefaultNotes(defaultMeasures));
      setLastSavedAt({ key: "status.loaded.default" });
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
        parsed.version !== 7 &&
        parsed.version !== 8
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
      const shouldSeedDefault =
        (Array.isArray(parsed.notes) && parsed.notes.length === 0) ||
        filtered.size === 0;
      setMeasures(safeMeasures);
      setSubdivisionsByBeat(safeSubdivisionsByBeat);
      setNotes(shouldSeedDefault ? createDefaultNotes(safeMeasures) : filtered);
      setLastSavedAt({
        key: shouldSeedDefault
          ? "status.loaded.default"
          : "status.loaded.local",
      });
    } catch (error) {
      console.warn("Failed to load saved drum score", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

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
            // Same type: remove the note
            next.delete(key);
          } else {
            // Different type: update the type
            next.set(key, { ...existingNote, type: currentNoteType });
          }
        } else {
          // Add new note with current type
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

  const handleSave = () => {
    const payload: SavedGrid = {
      version: 8,
      measures,
      beatsPerMeasure,
      subdivisions: 4,
      subdivisionsPerBeat: subdivisionsByBeat,
      notes: Array.from(notes.entries()).map(([key, noteData]) => {
        const parsedKey = parseKey(key);
        return {
          row: parsedKey?.row ?? 0,
          tick: parsedKey?.tick ?? 0,
          duration: noteData.duration,
          type: noteData.type,
        };
      }),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setLastSavedAt({
      key: "status.saved",
      detail: new Date().toLocaleString(locale),
    });
  };

  const handleLoad = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setLastSavedAt({ key: "status.noSave" });
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
        parsed.version !== 7 &&
        parsed.version !== 8
      ) {
        setLastSavedAt({ key: "status.unsupported" });
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
      setLastSavedAt({ key: "status.loaded.local" });
    } catch (error) {
      console.warn("Failed to load saved drum score", error);
      setLastSavedAt({ key: "status.failedLoad" });
    }
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
  };

  const exportPdf = async () => {
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
  };

  const exportMidi = () => {
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

  const stopCursorAnimation = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = 0;
    if (cursorRef.current) {
      cursorRef.current.style.display = "none";
    }
    setIsPlaying(false);
  }, []);

  const startCursorAnimation = useCallback(
    (
      context: AudioContext,
      startAt: number,
      totalTicks: number,
      secondsPerTick: number
    ) => {
      setIsPlaying(true);
      if (cursorRef.current) {
        cursorRef.current.style.display = "block";
        cursorRef.current.style.transform = "translateX(0px)";
      }
      const animate = () => {
        const elapsed = context.currentTime - startAt;
        const currentTick = elapsed / secondsPerTick;
        if (currentTick >= totalTicks) {
          stopCursorAnimation();
          return;
        }
        const pixelX = tickToPixelXRef.current(currentTick);
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translateX(${pixelX}px)`;
        }
        if (staffGridRef.current) {
          const scrollLeft = staffGridRef.current.scrollLeft;
          const viewWidth = staffGridRef.current.clientWidth;
          if (pixelX > scrollLeft + viewWidth - 20 || pixelX < scrollLeft) {
            staffGridRef.current.scrollLeft = pixelX - 20;
          }
        }
        rafIdRef.current = requestAnimationFrame(animate);
      };
      rafIdRef.current = requestAnimationFrame(animate);
    },
    [stopCursorAnimation]
  );

  const stopPlayback = useCallback(() => {
    stopCursorAnimation();
    playbackSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // ignore
      }
    });
    playbackSourcesRef.current = [];
    playbackTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
    playbackTimeoutsRef.current = [];
    setExportStatus(null);
  }, [stopCursorAnimation]);

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

  const playMidi = async () => {
    setExportStatus({ key: "status.playing" });
    try {
      stopPlayback();
      const { divisions, notes } = parseMidiNotesFromMusicXml(musicXml);
      if (!notes.length) {
        setExportStatus({ key: "status.playing.noNotes" });
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

      setExportStatus({ key: "status.playing.loading" });
      const buffers = await ensureSamplesLoaded(context);

      const startAt = context.currentTime + 0.05;
      const secondsPerQuarter = 60 / bpm;
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
        // Adjust gain based on velocity (ghost notes have lower velocity)
        const velocityGain = (note.velocity / 100) * 0.9;
        gain.gain.setValueAtTime(velocityGain, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime + 0.02);
        source.connect(gain).connect(context.destination);
        source.start(startTime);
        playbackSourcesRef.current.push(source);
      });

      const totalGridTicks = measures * beatsPerMeasure * ticksPerBeat;
      const secondsPerGridTick = secondsPerQuarter / ticksPerBeat;
      startCursorAnimation(context, startAt, totalGridTicks, secondsPerGridTick);

      const lastEnd = Math.max(
        ...notes.map(
          (note) => startAt + (note.startTick + note.duration) * secondsPerTick
        )
      );
      setExportStatus({ key: "status.playing" });
      const timer = window.setTimeout(() => {
        stopCursorAnimation();
        setExportStatus({ key: "status.playing.finished" });
        playbackSourcesRef.current = [];
        playbackTimeoutsRef.current = playbackTimeoutsRef.current.filter(
          (id) => id !== timer
        );
      }, Math.max(0, (lastEnd - context.currentTime) * 1000) + 50);
      playbackTimeoutsRef.current.push(timer);
    } catch (error) {
      console.error(error);
      setExportStatus({ key: "status.playing.failed" });
    }
  };

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
          <div className="headline-actions">
            <a className="cta" href="#editor">
              {t("hero.cta")}
            </a>
            <span className="cta-note">{t("hero.ctaNote")}</span>
          </div>
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
          <span className="helper">
            {lastSavedAt
              ? `${t("status.prefix")} ${t(lastSavedAt.key, lastSavedAt.detail ? { value: lastSavedAt.detail } : undefined)}`
              : ""}
          </span>
        </div>
      </div>

      <div className="toolbar">
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
        <div className="toolbar-group">
          <div className="button-row">
            <button type="button" className="ghost" onClick={playMidi}>
              {t("controls.playback.play")}
            </button>
            <button type="button" className="ghost" onClick={stopPlayback}>
              {t("controls.playback.stop")}
            </button>
          </div>
        </div>
        <div className="toolbar-group">
          <label htmlFor="bpm-input">{t("controls.bpm")}</label>
          <div className="measure-input">
            <input
              id="bpm-input"
              type="number"
              min={30}
              max={400}
              value={bpm}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isNaN(next)) return;
                setBpm(Math.min(400, Math.max(30, next)));
              }}
            />
          </div>
        </div>
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
          <label htmlFor="measure-input">{t("controls.measures")}</label>
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
            <span className="measure-caption">
              {t("controls.measures.range")}
            </span>
          </div>
        </div>
        <div className="toolbar-group">
          <label>{t("controls.export")}</label>
          <div className="button-row">
            <button type="button" className="ghost" onClick={exportPdf}>
              {t("controls.export.pdf")}
            </button>
            <button type="button" className="ghost" onClick={exportPng}>
              {t("controls.export.image")}
            </button>
            <button type="button" className="ghost" onClick={exportMidi}>
              {t("controls.export.midi")}
            </button>
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
    </div>
  );
}
