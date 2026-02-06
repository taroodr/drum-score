"use client";

import { useRouter } from "next/navigation";
import { parseMidiNotesFromMusicXml } from "@/lib/midi";

const STORAGE_KEY = "drum-score:v1";
const BEATS_PER_MEASURE = 4;
const TICKS_PER_BEAT = 12;
const MEASURE_LIMIT = 32;

const midiToRow: Record<number, number> = {
  49: 0, // crash
  51: 1, // ride
  46: 2, // open-hihat
  42: 3, // hihat
  48: 4, // tom1
  45: 5, // tom2
  43: 6, // tom3
  38: 7, // snare
  37: 8, // cross-stick
  36: 9, // kick
  44: 10, // hh-pedal
};

type Props = {
  lang: string;
  musicXml: string;
};

type SavedNote = {
  row: number;
  tick: number;
  duration: number;
  type: "normal";
};

export default function CopyScoreToEditorButton({ lang, musicXml }: Props) {
  const router = useRouter();

  const handleClick = () => {
    try {
      const { divisions, notes } = parseMidiNotesFromMusicXml(musicXml);
      const scale = divisions > 0 ? TICKS_PER_BEAT / divisions : 1;
      const normalized = new Map<string, SavedNote>();

      notes.forEach((note) => {
        const row = midiToRow[note.midi];
        if (row === undefined) return;
        const tick = Math.max(0, Math.round(note.startTick * scale));
        const duration = Math.max(1, Math.round(note.duration * scale));
        const key = `${row}:${tick}`;
        const prev = normalized.get(key);
        if (!prev || duration > prev.duration) {
          normalized.set(key, { row, tick, duration, type: "normal" });
        }
      });

      const maxEndTick = Array.from(normalized.values()).reduce(
        (max, note) => Math.max(max, note.tick + note.duration),
        0
      );
      const ticksPerMeasure = BEATS_PER_MEASURE * TICKS_PER_BEAT;
      const measures = Math.min(
        MEASURE_LIMIT,
        Math.max(1, Math.ceil(maxEndTick / ticksPerMeasure))
      );
      const subdivisionsPerBeat = Array.from(
        { length: measures * BEATS_PER_MEASURE },
        () => 4
      );

      const payload = {
        version: 8 as const,
        measures,
        beatsPerMeasure: BEATS_PER_MEASURE,
        subdivisions: 4,
        subdivisionsPerBeat,
        notes: Array.from(normalized.values()),
      };

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      router.push(`/${lang}#editor`);
    } catch (error) {
      console.error("Failed to copy score to editor", error);
    }
  };

  return (
    <button type="button" className="score-edit-button" onClick={handleClick}>
      {lang === "ja" ? "この譜面を編集する" : "Edit This Score"}
    </button>
  );
}
