export type NoteHead = "filled" | "x";

export type Instrument = {
  id: string;
  label: string;
  row: number;
  noteHead: NoteHead;
};

export const staffRowCount = 9;
export const staffLineRows = new Set([0, 2, 4, 6, 8]);

export const drumKit: Instrument[] = [
  { id: "crash", label: "Crash", row: 0, noteHead: "x" },
  { id: "ride", label: "Ride", row: 1, noteHead: "x" },
  { id: "hihat", label: "Hi-Hat", row: 2, noteHead: "x" },
  { id: "tom1", label: "Tom 1", row: 3, noteHead: "filled" },
  { id: "tom2", label: "Tom 2", row: 4, noteHead: "filled" },
  { id: "tom3", label: "Tom 3", row: 5, noteHead: "filled" },
  { id: "snare", label: "Snare", row: 6, noteHead: "filled" },
  { id: "kick", label: "Kick", row: 8, noteHead: "filled" },
];

export const instrumentByRow = new Map(
  drumKit.map((instrument) => [instrument.row, instrument])
);
