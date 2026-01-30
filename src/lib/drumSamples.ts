import {
  kick,
  snare,
  hatClosed,
  hatOpen,
  tomLow,
  tomMid,
  tomHigh,
  ride,
  crash,
} from "@teropa/drumkit";

export type DrumSampleKey =
  | "kick"
  | "snare"
  | "hatClosed"
  | "hatOpen"
  | "tomLow"
  | "tomMid"
  | "tomHigh"
  | "ride"
  | "crash";

export const drumSampleUrls: Record<DrumSampleKey, string> = {
  kick,
  snare,
  hatClosed,
  hatOpen,
  tomLow,
  tomMid,
  tomHigh,
  ride,
  crash,
};

export const midiToSampleKey = (midi: number): DrumSampleKey | null => {
  switch (midi) {
    case 49:
      return "crash";
    case 51:
      return "ride";
    case 42:
      return "hatClosed";
    case 46:
      return "hatOpen";
    case 44:
      return "hatClosed";
    case 48:
      return "tomHigh";
    case 45:
      return "tomMid";
    case 43:
      return "tomLow";
    case 38:
      return "snare";
    case 37:
      return "snare";
    case 36:
      return "kick";
    case 35:
      return "kick";
    default:
      return null;
  }
};

export const loadDrumSamples = async (context: AudioContext) => {
  const entries = await Promise.all(
    Object.entries(drumSampleUrls).map(async ([key, url]) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sample: ${key}`);
      }
      const buffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(buffer.slice(0));
      return [key, audioBuffer] as const;
    })
  );
  return new Map(entries);
};
