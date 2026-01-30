export type NoteHead = "filled" | "x";

export type Instrument = {
  id: string;
  label: string;
  gridRow: number;
  staffRow: number;
  noteHead: NoteHead;
};

export const staffLineRows = new Set([2, 4, 6, 8, 10]);

export const drumKit: Instrument[] = [
  { id: "crash", label: "Crash", gridRow: 0, staffRow: 0, noteHead: "x" },
  { id: "ride", label: "Ride", gridRow: 1, staffRow: 1, noteHead: "x" },
  { id: "open-hihat", label: "Open Hi-Hat", gridRow: 2, staffRow: 2, noteHead: "x" },
  { id: "hihat", label: "Hi-Hat", gridRow: 3, staffRow: 2, noteHead: "x" },
  { id: "tom1", label: "Tom 1", gridRow: 4, staffRow: 3, noteHead: "filled" },
  { id: "tom2", label: "Tom 2", gridRow: 5, staffRow: 4, noteHead: "filled" },
  { id: "tom3", label: "Tom 3", gridRow: 6, staffRow: 5, noteHead: "filled" },
  { id: "snare", label: "Snare", gridRow: 7, staffRow: 6, noteHead: "filled" },
  { id: "cross-stick", label: "Cross Stick", gridRow: 8, staffRow: 6, noteHead: "x" },
  { id: "kick", label: "Kick", gridRow: 9, staffRow: 8, noteHead: "filled" },
  { id: "kick2", label: "Kick 2", gridRow: 10, staffRow: 8, noteHead: "filled" },
  { id: "hh-pedal", label: "HH Pedal", gridRow: 11, staffRow: 7, noteHead: "x" },
];

export const staffRowCount =
  drumKit.reduce((max, instrument) => Math.max(max, instrument.gridRow), 0) + 1;

export const instrumentByRow = new Map(
  drumKit.map((instrument) => [instrument.gridRow, instrument])
);
