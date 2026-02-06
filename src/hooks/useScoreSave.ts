"use client";

import { useCallback, useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { saveScore, type CloudScore, type SavedGrid as CloudSavedGrid } from "@/lib/firestore";
import type { NoteType } from "@/components/DrumGrid";

const STORAGE_KEY = "drum-score:v1";

type NoteData = {
  duration: number;
  type: NoteType;
};

export type SavedGrid = {
  version: 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1;
  measures: number;
  beatsPerMeasure: number;
  subdivisions: number;
  notes: string[] | { row: number; tick: number; duration: number; type?: NoteType }[];
  subdivisionsPerMeasure?: number[];
  subdivisionsPerBeat?: number[];
  tripletBeats?: string[];
};

const makeKey = (row: number, tick: number) => `${row}:${tick}`;

const parseKey = (key: string) => {
  const [rowStr, tickStr] = key.split(":");
  const row = Number(rowStr);
  const tick = Number(tickStr);
  if (Number.isNaN(row) || Number.isNaN(tick)) return null;
  return { row, tick };
};

interface UseScoreSaveOptions {
  measures: number;
  beatsPerMeasure: number;
  subdivisionsByBeat: number[];
  notes: Map<string, NoteData>;
  setMeasures: (measures: number) => void;
  setSubdivisionsByBeat: (subdivisions: number[]) => void;
  setNotes: (notes: Map<string, NoteData>) => void;
  createDefaultNotes: (measures: number) => Map<string, NoteData>;
  deserializeNotes: (
    parsed: SavedGrid,
    safeMeasures: number,
    safeSubdivisions: number
  ) => Map<string, NoteData>;
  clampMeasures: (value: number) => number;
}

interface UseScoreSaveReturn {
  lastSavedAt: { key: string; detail?: string } | null;
  scoreTitle: string;
  setScoreTitle: (title: string) => void;
  currentScoreId: string | null;
  showScoreList: boolean;
  setShowScoreList: (show: boolean) => void;
  showSaveDialog: boolean;
  setShowSaveDialog: (show: boolean) => void;
  isSaving: boolean;
  handleSave: () => void;
  handleLoad: () => void;
  handleCloudSave: () => Promise<void>;
  handleCloudLoad: (score: CloudScore) => void;
  buildSavePayload: () => SavedGrid;
  loadFromLocalStorage: () => void;
}

export function useScoreSave({
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
}: UseScoreSaveOptions): UseScoreSaveReturn {
  const { locale, t } = useLanguage();
  const { user } = useAuth();

  const [lastSavedAt, setLastSavedAt] = useState<{ key: string; detail?: string } | null>(null);
  const [scoreTitle, setScoreTitle] = useState("");
  const [currentScoreId, setCurrentScoreId] = useState<string | null>(null);
  const [showScoreList, setShowScoreList] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const buildSavePayload = useCallback((): SavedGrid => {
    return {
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
  }, [measures, beatsPerMeasure, subdivisionsByBeat, notes]);

  const handleSave = useCallback(() => {
    const payload = buildSavePayload();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setLastSavedAt({
      key: "status.saved",
      detail: new Date().toLocaleString(locale),
    });
  }, [buildSavePayload, locale]);

  const handleCloudSave = useCallback(async () => {
    if (!user) return;
    const title = scoreTitle.trim() || t("cloud.untitled");
    setIsSaving(true);
    try {
      const payload = buildSavePayload();
      const id = await saveScore(user.uid, title, payload as CloudSavedGrid, currentScoreId || undefined);
      if (id) {
        setCurrentScoreId(id);
        setScoreTitle(title);
        setLastSavedAt({
          key: "status.cloud.saved",
          detail: title,
        });
      } else {
        setLastSavedAt({ key: "status.cloud.saveFailed" });
      }
    } finally {
      setIsSaving(false);
      setShowSaveDialog(false);
    }
  }, [user, scoreTitle, t, buildSavePayload, currentScoreId]);

  const handleCloudLoad = useCallback((score: CloudScore) => {
    const parsed = score.data;
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
      parsed as SavedGrid,
      safeMeasures,
      fallbackSubdivisions
    );
    setMeasures(safeMeasures);
    setSubdivisionsByBeat(safeSubdivisionsByBeat);
    setNotes(filtered);
    setCurrentScoreId(score.id);
    setScoreTitle(score.title);
    setLastSavedAt({
      key: "status.cloud.loaded",
      detail: score.title,
    });
  }, [beatsPerMeasure, clampMeasures, deserializeNotes, setMeasures, setSubdivisionsByBeat, setNotes]);

  const handleLoad = useCallback(() => {
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
  }, [beatsPerMeasure, clampMeasures, deserializeNotes, setMeasures, setSubdivisionsByBeat, setNotes]);

  const loadFromLocalStorage = useCallback(() => {
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
  }, [beatsPerMeasure, clampMeasures, createDefaultNotes, deserializeNotes, setMeasures, setSubdivisionsByBeat, setNotes]);

  return {
    lastSavedAt,
    scoreTitle,
    setScoreTitle,
    currentScoreId,
    showScoreList,
    setShowScoreList,
    showSaveDialog,
    setShowSaveDialog,
    isSaving,
    handleSave,
    handleLoad,
    handleCloudSave,
    handleCloudLoad,
    buildSavePayload,
    loadFromLocalStorage,
  };
}
