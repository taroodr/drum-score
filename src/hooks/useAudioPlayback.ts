"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { loadDrumSamples, midiToSampleKey } from "@/lib/drumSamples";
import { parseMidiNotesFromMusicXml } from "@/lib/midi";

type TickToPixelFn = (tick: number) => number;

interface UseAudioPlaybackOptions {
  bpm: number;
  measures: number;
  beatsPerMeasure: number;
  ticksPerBeat: number;
  musicXml: string;
  tickToPixelXRef: React.RefObject<TickToPixelFn>;
  staffGridRef: React.RefObject<HTMLDivElement | null>;
  cursorRef: React.RefObject<HTMLDivElement | null>;
}

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  playMidi: () => Promise<void>;
  stopPlayback: () => void;
  exportStatus: { key: string; detail?: string } | null;
  setExportStatus: React.Dispatch<React.SetStateAction<{ key: string; detail?: string } | null>>;
}

export function useAudioPlayback({
  bpm,
  measures,
  beatsPerMeasure,
  ticksPerBeat,
  musicXml,
  tickToPixelXRef,
  staffGridRef,
  cursorRef,
}: UseAudioPlaybackOptions): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ key: string; detail?: string } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sampleBuffersRef = useRef<Map<string, AudioBuffer> | null>(null);
  const sampleLoadingRef = useRef<Promise<Map<string, AudioBuffer>> | null>(null);
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackTimeoutsRef = useRef<number[]>([]);
  const rafIdRef = useRef(0);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

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
  }, [cursorRef]);

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
    [cursorRef, staffGridRef, tickToPixelXRef, stopCursorAnimation]
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

  const playMidi = useCallback(async () => {
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
  }, [
    bpm,
    measures,
    beatsPerMeasure,
    ticksPerBeat,
    musicXml,
    stopPlayback,
    startCursorAnimation,
    stopCursorAnimation,
  ]);

  return {
    isPlaying,
    playMidi,
    stopPlayback,
    exportStatus,
    setExportStatus,
  };
}
