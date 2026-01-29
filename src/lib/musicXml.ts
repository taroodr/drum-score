import { drumKit } from "@/lib/drumKit";

type Pitch = { step: string; octave: number };

type MusicXmlInput = {
  measures: number;
  beatsPerMeasure: number;
  ticksPerBeat: number;
  notes: Map<string, number>;
};

const rowPitchMap: Pitch[] = [
  { step: "F", octave: 5 },
  { step: "E", octave: 5 },
  { step: "D", octave: 5 },
  { step: "C", octave: 5 },
  { step: "B", octave: 4 },
  { step: "A", octave: 4 },
  { step: "G", octave: 4 },
  { step: "F", octave: 4 },
  { step: "E", octave: 4 },
];

const midiUnpitched: Record<string, number> = {
  crash: 49,
  ride: 51,
  hihat: 42,
  tom1: 48,
  tom2: 45,
  tom3: 43,
  snare: 38,
  kick: 36,
};

const durationToType = (duration: number) => {
  if (duration >= 12) return "quarter";
  if (duration === 9) return "eighth";
  if (duration === 6) return "eighth";
  if (duration === 4) return "eighth";
  return "16th";
};

const durationToDot = (duration: number) => (duration === 9 ? "<dot/>" : "");

const durationToTimeModification = (duration: number) => {
  if (duration === 4) {
    return "<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>";
  }
  return "";
};

const splitGap = (duration: number) => {
  const chunks: number[] = [];
  let remaining = duration;
  const options = [12, 9, 6, 4, 3];
  options.forEach((value) => {
    while (remaining >= value) {
      chunks.push(value);
      remaining -= value;
    }
  });
  if (remaining > 0) {
    chunks.push(3);
  }
  return chunks;
};

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const makeKey = (row: number, col: number) => `${row}:${col}`;

const parseKey = (key: string) => {
  const [rowStr, tickStr] = key.split(":");
  const row = Number(rowStr);
  const tick = Number(tickStr);
  if (Number.isNaN(row) || Number.isNaN(tick)) return null;
  return { row, tick };
};

export const buildMusicXml = ({
  measures,
  beatsPerMeasure,
  ticksPerBeat,
  notes,
}: MusicXmlInput) => {
  const divisions = ticksPerBeat;
  const measureTicks = beatsPerMeasure * ticksPerBeat;

  const scoreInstruments = drumKit
    .map((instrument) => {
      const instrumentId = `P1-${instrument.id}`;
      const midi = midiUnpitched[instrument.id] ?? 35;
      return `
      <score-instrument id="${instrumentId}">
        <instrument-name>${escapeXml(instrument.label)}</instrument-name>
      </score-instrument>
      <midi-instrument id="${instrumentId}">
        <midi-channel>10</midi-channel>
        <midi-unpitched>${midi}</midi-unpitched>
        <midi-program>1</midi-program>
      </midi-instrument>`;
    })
    .join("");

  const measuresXml: string[] = [];

  for (let measureIndex = 0; measureIndex < measures; measureIndex += 1) {
    const measureOffsetTicks = measureIndex * measureTicks;
    const measureEndTick = measureOffsetTicks + measureTicks;
    const voicesXml: string[] = [];
    const globalOnsetSet = new Set<number>();
    Array.from(notes.keys())
      .map((key) => parseKey(key))
      .filter(
        (parsedKey) =>
          parsedKey &&
          parsedKey.tick >= measureOffsetTicks &&
          parsedKey.tick < measureEndTick
      )
      .forEach((parsedKey) => {
        globalOnsetSet.add(parsedKey!.tick);
      });
    const globalOnsetTicks = Array.from(globalOnsetSet).sort((a, b) => a - b);
    const globalNextTick = new Map<number, number>();
    globalOnsetTicks.forEach((tick, index) => {
      const next = globalOnsetTicks[index + 1] ?? measureEndTick;
      globalNextTick.set(tick, next);
    });

    const noteMeta = globalOnsetTicks.map((absoluteTick, index) => {
      const onset = absoluteTick - measureOffsetTicks;
      const beatIndex = Math.floor(onset / ticksPerBeat);
      const duration =
        (globalNextTick.get(absoluteTick) ?? measureEndTick) - absoluteTick;
      return {
        index,
        onset,
        beatIndex,
        duration,
      };
    });

    const beatInfo = Array.from({ length: beatsPerMeasure }, () => ({
      indices: [] as number[],
      isTriplet: false,
    }));

    noteMeta.forEach((meta) => {
      const subTick = meta.onset % ticksPerBeat;
      if (meta.beatIndex >= 0 && meta.beatIndex < beatsPerMeasure) {
        beatInfo[meta.beatIndex].indices.push(meta.index);
        if (subTick % 4 === 0 && subTick % 3 !== 0) {
          beatInfo[meta.beatIndex].isTriplet = true;
        }
      }
    });

    beatInfo.forEach((info) => {
      info.indices.sort((a, b) => noteMeta[a].onset - noteMeta[b].onset);
    });

    const beam1States = new Array(globalOnsetTicks.length).fill("");
    const beam2States = new Array(globalOnsetTicks.length).fill("");

    const applyBeamsByGap = (
      indices: number[],
      maxGap: number,
      target: string[]
    ) => {
      if (indices.length < 2) return;
      let runStart = 0;
      for (let i = 1; i < indices.length; i += 1) {
        const prevIndex = indices[i - 1];
        const currentIndex = indices[i];
        const gap = noteMeta[currentIndex].onset - noteMeta[prevIndex].onset;
        if (gap > maxGap) {
          const runEnd = i - 1;
          if (runEnd > runStart) {
            target[indices[runStart]] = "begin";
            for (let j = runStart + 1; j < runEnd; j += 1) {
              target[indices[j]] = "continue";
            }
            target[indices[runEnd]] = "end";
          }
          runStart = i;
        }
      }
      const finalEnd = indices.length - 1;
      if (finalEnd > runStart) {
        target[indices[runStart]] = "begin";
        for (let j = runStart + 1; j < finalEnd; j += 1) {
          target[indices[j]] = "continue";
        }
        target[indices[finalEnd]] = "end";
      }
    };

    beatInfo.forEach((info) => {
      const beam1Gap = info.isTriplet ? 4 : 6;
      applyBeamsByGap(info.indices, beam1Gap, beam1States);
      if (!info.isTriplet) {
        applyBeamsByGap(info.indices, 3, beam2States);
      }
    });

    const notesXml: string[] = [];
    if (globalOnsetTicks.length === 0) {
      splitGap(measureTicks).forEach((chunk) => {
        const restType = durationToType(chunk);
        const restTimeModification = durationToTimeModification(chunk);
        const restDot = durationToDot(chunk);
        notesXml.push(`
        <note>
          <rest />
          <duration>${chunk}</duration>
          <voice>1</voice>
          <type>${restType}</type>
          ${restDot}
          ${restTimeModification}
        </note>`);
      });
    } else {
      let cursor = measureOffsetTicks;
      globalOnsetTicks.forEach((absoluteTick, index) => {
        if (absoluteTick > cursor) {
          const gap = absoluteTick - cursor;
          splitGap(gap).forEach((chunk) => {
            const restType = durationToType(chunk);
            const restTimeModification = durationToTimeModification(chunk);
            const restDot = durationToDot(chunk);
            notesXml.push(`
        <note>
          <rest />
          <duration>${chunk}</duration>
          <voice>1</voice>
          <type>${restType}</type>
          ${restDot}
          ${restTimeModification}
        </note>`);
          });
        }

        const rawDuration =
          (globalNextTick.get(absoluteTick) ?? measureEndTick) - absoluteTick;
        const activeInstruments = drumKit.filter((instrument) =>
          notes.has(makeKey(instrument.row, absoluteTick))
        );
        if (activeInstruments.length === 0) {
          splitGap(rawDuration).forEach((chunk) => {
            const restType = durationToType(chunk);
            const restTimeModification = durationToTimeModification(chunk);
            const restDot = durationToDot(chunk);
            notesXml.push(`
        <note>
          <rest />
          <duration>${chunk}</duration>
          <voice>1</voice>
          <type>${restType}</type>
          ${restDot}
          ${restTimeModification}
        </note>`);
          });
        } else {
          activeInstruments.forEach((instrument, chordIndex) => {
            const pitch = rowPitchMap[instrument.row] ?? rowPitchMap[4];
            const instrumentId = `P1-${instrument.id}`;
            const noteHead =
              instrument.noteHead === "x" ? "<notehead>x</notehead>" : "";
            const noteType = durationToType(rawDuration);
            const timeModification = durationToTimeModification(rawDuration);
            const dot = durationToDot(rawDuration);
            const beamParts: string[] = [];
            if (chordIndex === 0) {
              if (beam1States[index] !== "") {
                beamParts.push(
                  `<beam number="1">${beam1States[index]}</beam>`
                );
              }
              if (beam2States[index] !== "") {
                beamParts.push(
                  `<beam number="2">${beam2States[index]}</beam>`
                );
              }
            }
            const beamTag = beamParts.join("");
            const chordTag = chordIndex > 0 ? "<chord/>" : "";
            notesXml.push(`
        <note>
          ${chordTag}
          <unpitched>
            <display-step>${pitch.step}</display-step>
            <display-octave>${pitch.octave}</display-octave>
          </unpitched>
          <duration>${rawDuration}</duration>
          <instrument id="${instrumentId}" />
          <voice>1</voice>
          <type>${noteType}</type>
          ${dot}
          ${timeModification}
          <stem>up</stem>
          ${noteHead}
          <staff>1</staff>
          ${beamTag}
        </note>`);
          });
        }
        cursor = globalNextTick.get(absoluteTick) ?? measureEndTick;
      });

      if (cursor < measureEndTick) {
        splitGap(measureEndTick - cursor).forEach((chunk) => {
          const restType = durationToType(chunk);
          const restTimeModification = durationToTimeModification(chunk);
          const restDot = durationToDot(chunk);
          notesXml.push(`
        <note>
          <rest />
          <duration>${chunk}</duration>
          <voice>1</voice>
          <type>${restType}</type>
          ${restDot}
          ${restTimeModification}
        </note>`);
        });
      }
    }

    if (notesXml.length > 0) {
      voicesXml.push(notesXml.join(""));
    }

    const attributes =
      measureIndex === 0
        ? `
      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>0</fifths></key>
        <time>
          <beats>${beatsPerMeasure}</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>percussion</sign>
          <line>2</line>
        </clef>
        <staff-details>
          <staff-lines>5</staff-lines>
        </staff-details>
      </attributes>`
        : "";

    measuresXml.push(`
    <measure number="${measureIndex + 1}">
      ${attributes}
      ${voicesXml.join("")}
    </measure>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Drumset</part-name>
      ${scoreInstruments}
    </score-part>
  </part-list>
  <part id="P1">
    ${measuresXml.join("")}
  </part>
</score-partwise>`;
};
