type MidiEvent = {
  time: number;
  sort: number;
  data: number[];
};

const textToBytes = (text: string) =>
  Array.from(text).map((char) => char.charCodeAt(0));

const writeUint16BE = (value: number) => [
  (value >> 8) & 0xff,
  value & 0xff,
];

const writeUint32BE = (value: number) => [
  (value >> 24) & 0xff,
  (value >> 16) & 0xff,
  (value >> 8) & 0xff,
  value & 0xff,
];

const writeVarLen = (value: number) => {
  let buffer = value & 0x7f;
  const bytes: number[] = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
};

const parseInteger = (node: Element | null, fallback = 0) => {
  if (!node) return fallback;
  const value = Number(node.textContent);
  return Number.isFinite(value) ? value : fallback;
};

const buildInstrumentMidiMap = (doc: Document) => {
  const midiMap = new Map<string, number>();
  doc.querySelectorAll("midi-instrument").forEach((node) => {
    const id = node.getAttribute("id");
    const midi = parseInteger(node.querySelector("midi-unpitched"), -1);
    if (id && midi > 0) midiMap.set(id, midi);
  });
  return midiMap;
};

export type ParsedMidiNote = {
  startTick: number;
  duration: number;
  midi: number;
  velocity: number;
};

export const parseMidiNotesFromMusicXml = (
  musicXml: string
): { divisions: number; notes: ParsedMidiNote[] } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(musicXml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid MusicXML");
  }

  const divisions = parseInteger(doc.querySelector("divisions"), 12);
  const midiMap = buildInstrumentMidiMap(doc);
  const notes: ParsedMidiNote[] = [];

  let currentTick = 0;
  let pendingAdvance = 0;

  const measures = Array.from(doc.querySelectorAll("part > measure"));
  measures.forEach((measure) => {
    const measureNotes = Array.from(measure.querySelectorAll(":scope > note"));
    measureNotes.forEach((note) => {
      const duration = parseInteger(note.querySelector("duration"), 0);
      const isRest = Boolean(note.querySelector("rest"));
      const isChord = Boolean(note.querySelector("chord"));

      if (!isChord) {
        currentTick += pendingAdvance;
        pendingAdvance = duration;
      }

      if (isRest) return;

      const instrumentId = note
        .querySelector("instrument")
        ?.getAttribute("id");
      const midi = instrumentId ? midiMap.get(instrumentId) : undefined;
      if (!midi) return;

      notes.push({
        startTick: currentTick,
        duration,
        midi,
        velocity: 100,
      });
    });

    currentTick += pendingAdvance;
    pendingAdvance = 0;
  });

  return { divisions, notes };
};

export const buildMidiFromMusicXml = (musicXml: string, bpm = 120) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(musicXml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid MusicXML");
  }

  const divisions = parseInteger(doc.querySelector("divisions"), 12);
  const midiMap = buildInstrumentMidiMap(doc);
  const events: MidiEvent[] = [];

  const microsecondsPerQuarter = Math.round(60000000 / bpm);
  events.push({
    time: 0,
    sort: 0,
    data: [
      0xff,
      0x51,
      0x03,
      (microsecondsPerQuarter >> 16) & 0xff,
      (microsecondsPerQuarter >> 8) & 0xff,
      microsecondsPerQuarter & 0xff,
    ],
  });

  let currentTick = 0;
  let pendingAdvance = 0;

  const measures = Array.from(doc.querySelectorAll("part > measure"));
  measures.forEach((measure) => {
    const notes = Array.from(measure.querySelectorAll(":scope > note"));
    notes.forEach((note) => {
      const duration = parseInteger(note.querySelector("duration"), 0);
      const isRest = Boolean(note.querySelector("rest"));
      const isChord = Boolean(note.querySelector("chord"));

      if (!isChord) {
        currentTick += pendingAdvance;
        pendingAdvance = duration;
      }

      if (isRest) return;

      const instrumentId = note
        .querySelector("instrument")
        ?.getAttribute("id");
      const midi = instrumentId ? midiMap.get(instrumentId) : undefined;
      if (!midi) return;

      const startTick = currentTick;
      const endTick = currentTick + duration;
      events.push({
        time: startTick,
        sort: 1,
        data: [0x99, midi, 100],
      });
      events.push({
        time: endTick,
        sort: 0,
        data: [0x89, midi, 64],
      });
    });

    currentTick += pendingAdvance;
    pendingAdvance = 0;
  });

  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.sort - b.sort;
  });

  const trackBytes: number[] = [];
  let lastTime = 0;
  events.forEach((event) => {
    const delta = Math.max(0, event.time - lastTime);
    trackBytes.push(...writeVarLen(delta), ...event.data);
    lastTime = event.time;
  });
  trackBytes.push(...writeVarLen(0), 0xff, 0x2f, 0x00);

  const bytes: number[] = [];
  bytes.push(...textToBytes("MThd"));
  bytes.push(...writeUint32BE(6));
  bytes.push(...writeUint16BE(0));
  bytes.push(...writeUint16BE(1));
  bytes.push(...writeUint16BE(divisions));
  bytes.push(...textToBytes("MTrk"));
  bytes.push(...writeUint32BE(trackBytes.length));
  bytes.push(...trackBytes);

  return new Uint8Array(bytes);
};
