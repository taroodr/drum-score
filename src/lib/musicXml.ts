import { drumKit } from "@/lib/drumKit";

type Pitch = { step: string; octave: number };

export type NoteType = "normal" | "ghost" | "accent" | "flam";

export type NoteData = {
  duration: number;
  type: NoteType;
};

type MusicXmlInput = {
  measures: number;
  beatsPerMeasure: number;
  ticksPerBeat: number;
  notes: Map<string, NoteData>;
  subdivisionsByBeat?: number[];
};

const rowPitchMap: Pitch[] = [
  { step: "G", octave: 5 }, // above line 5
  { step: "F", octave: 5 }, // line 5
  { step: "E", octave: 5 }, // space 4
  { step: "D", octave: 5 }, // line 4
  { step: "C", octave: 5 }, // space 3
  { step: "B", octave: 4 }, // line 3
  { step: "A", octave: 4 }, // space 2
  { step: "G", octave: 4 }, // line 2
  { step: "F", octave: 4 }, // space 1
  { step: "E", octave: 4 }, // line 1
  { step: "D", octave: 4 }, // below line 1
];

const midiUnpitched: Record<string, number> = {
  crash: 49,
  ride: 51,
  hihat: 42,
  "open-hihat": 46,
  "hh-pedal": 44,
  tom1: 48,
  tom2: 45,
  tom3: 43,
  snare: 38,
  "cross-stick": 37,
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

const splitGapByBeat = (duration: number, isTriplet: boolean) => {
  if (!isTriplet) return splitGap(duration);
  const chunks: number[] = [];
  let remaining = duration;
  while (remaining >= 4) {
    chunks.push(4);
    remaining -= 4;
  }
  if (remaining > 0) {
    chunks.push(remaining);
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
  subdivisionsByBeat,
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

    if (subdivisionsByBeat && subdivisionsByBeat.length >= beatsPerMeasure) {
      const baseIndex = measureIndex * beatsPerMeasure;
      beatInfo.forEach((info, index) => {
        if (subdivisionsByBeat[baseIndex + index] === 3) {
          info.isTriplet = true;
        }
      });
    }

    beatInfo.forEach((info) => {
      info.indices.sort((a, b) => noteMeta[a].onset - noteMeta[b].onset);
    });

    const beam1States = new Array(globalOnsetTicks.length).fill("");
    const beam2States = new Array(globalOnsetTicks.length).fill("");
    const beatIsTriplet = beatInfo.map((info) => info.isTriplet);

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

    const buildTupletNotation = (absoluteTick: number, duration: number) => {
      const beatIndex = Math.floor(
        (absoluteTick - measureOffsetTicks) / ticksPerBeat
      );
      if (beatIndex < 0 || beatIndex >= beatsPerMeasure) return "";
      if (!beatIsTriplet[beatIndex]) return "";
      const onsetInBeat =
        (absoluteTick - measureOffsetTicks) % ticksPerBeat;
      const endInBeat = Math.min(onsetInBeat + duration, ticksPerBeat);
      const parts: string[] = [];
      if (onsetInBeat === 0) {
        parts.push(`<tuplet type="start" bracket="yes" number="1"/>`);
      }
      if (endInBeat >= ticksPerBeat) {
        parts.push(`<tuplet type="stop" bracket="yes" number="1"/>`);
      }
      if (parts.length === 0) return "";
      return `<notations>${parts.join("")}</notations>`;
    };

    const notesXml: string[] = [];
    if (globalOnsetTicks.length === 0) {
      let restCursor = measureOffsetTicks;
      while (restCursor < measureEndTick) {
        const beatIndex = Math.floor(
          (restCursor - measureOffsetTicks) / ticksPerBeat
        );
        const beatEndTick = Math.min(
          measureEndTick,
          measureOffsetTicks + (beatIndex + 1) * ticksPerBeat
        );
        const gap = beatEndTick - restCursor;
        splitGapByBeat(gap, beatIsTriplet[beatIndex]).forEach((chunk) => {
          const tupletTag = buildTupletNotation(restCursor, chunk);
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
          ${tupletTag}
        </note>`);
          restCursor += chunk;
        });
      }
    } else {
      let cursor = measureOffsetTicks;
      globalOnsetTicks.forEach((absoluteTick, index) => {
        if (absoluteTick > cursor) {
          let gapCursor = cursor;
          while (gapCursor < absoluteTick) {
            const beatIndex = Math.floor(
              (gapCursor - measureOffsetTicks) / ticksPerBeat
            );
            const beatEndTick = Math.min(
              measureEndTick,
              measureOffsetTicks + (beatIndex + 1) * ticksPerBeat
            );
            const gap = Math.min(beatEndTick, absoluteTick) - gapCursor;
            splitGapByBeat(gap, beatIsTriplet[beatIndex]).forEach((chunk) => {
              const tupletTag = buildTupletNotation(gapCursor, chunk);
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
          ${tupletTag}
        </note>`);
              gapCursor += chunk;
            });
          }
        }

        const beatIndex = Math.floor(
          (absoluteTick - measureOffsetTicks) / ticksPerBeat
        );
        const beatEndTick = Math.min(
          measureEndTick,
          measureOffsetTicks + (beatIndex + 1) * ticksPerBeat
        );
        const nextTick = globalNextTick.get(absoluteTick) ?? measureEndTick;
        let rawDuration = Math.max(
          1,
          Math.min(nextTick, beatEndTick) - absoluteTick
        );
        if (beatIsTriplet[beatIndex]) {
          rawDuration = Math.min(rawDuration, 4);
        }
        const activeInstruments = drumKit.filter((instrument) =>
          notes.has(makeKey(instrument.gridRow, absoluteTick))
        );
        if (activeInstruments.length === 0) {
          let restCursor = absoluteTick;
          splitGapByBeat(rawDuration, beatIsTriplet[beatIndex]).forEach(
            (chunk) => {
            const tupletTag = buildTupletNotation(restCursor, chunk);
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
              ${tupletTag}
        </note>`);
            restCursor += chunk;
          }
          );
        } else {
          // Separate flam and non-flam instruments
          const flamInstruments = activeInstruments.filter((instrument) => {
            const noteKey = makeKey(instrument.gridRow, absoluteTick);
            return notes.get(noteKey)?.type === "flam";
          });
          const nonFlamInstruments = activeInstruments.filter((instrument) => {
            const noteKey = makeKey(instrument.gridRow, absoluteTick);
            return notes.get(noteKey)?.type !== "flam";
          });

          // Generate grace notes for flams first
          flamInstruments.forEach((instrument, flamIndex) => {
            const pitch = rowPitchMap[instrument.staffRow] ?? rowPitchMap[4];
            const instrumentId = `P1-${instrument.id}`;
            let noteHead = "";
            if (instrument.noteHead === "x") {
              noteHead = "<notehead>x</notehead>";
            }
            const chordTag = flamIndex > 0 ? "<chord/>" : "";
            notesXml.push(`
        <note>
          ${chordTag}
          <grace slash="yes"/>
          <unpitched>
            <display-step>${pitch.step}</display-step>
            <display-octave>${pitch.octave}</display-octave>
          </unpitched>
          <instrument id="${instrumentId}" />
          <voice>1</voice>
          <type>eighth</type>
          <stem>up</stem>
          ${noteHead}
          <staff>1</staff>
        </note>`);
          });

          // Generate main notes (flam main notes + non-flam notes)
          const mainNoteInstruments = [...flamInstruments, ...nonFlamInstruments];
          mainNoteInstruments.forEach((instrument, chordIndex) => {
            const noteKey = makeKey(instrument.gridRow, absoluteTick);
            const noteData = notes.get(noteKey);
            const pitch = rowPitchMap[instrument.staffRow] ?? rowPitchMap[4];
            const instrumentId = `P1-${instrument.id}`;
            const isGhost = noteData?.type === "ghost";

            // Notehead with parentheses for ghost notes
            let noteHead = "";
            if (instrument.noteHead === "x") {
              noteHead = isGhost
                ? '<notehead parentheses="yes">x</notehead>'
                : "<notehead>x</notehead>";
            } else if (isGhost) {
              noteHead = '<notehead parentheses="yes">normal</notehead>';
            }

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

            // Build notations tag with tuplet and articulations
            const tupletNotation = buildTupletNotation(absoluteTick, rawDuration);
            const notationParts: string[] = [];

            // Extract tuplet content if exists
            if (tupletNotation) {
              const tupletMatch = tupletNotation.match(/<notations>(.*?)<\/notations>/);
              if (tupletMatch) {
                notationParts.push(tupletMatch[1]);
              }
            }

            // Add accent articulation
            if (noteData?.type === "accent") {
              notationParts.push("<articulations><accent/></articulations>");
            }

            const notationTag = notationParts.length > 0
              ? `<notations>${notationParts.join("")}</notations>`
              : "";

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
          ${notationTag}
        </note>`);
          });
        }
        cursor = absoluteTick + rawDuration;
      });

      if (cursor < measureEndTick) {
        let restCursor = cursor;
        while (restCursor < measureEndTick) {
          const beatIndex = Math.floor(
            (restCursor - measureOffsetTicks) / ticksPerBeat
          );
          const beatEndTick = Math.min(
            measureEndTick,
            measureOffsetTicks + (beatIndex + 1) * ticksPerBeat
          );
          const gap = beatEndTick - restCursor;
          splitGapByBeat(gap, beatIsTriplet[beatIndex]).forEach((chunk) => {
            const tupletTag = buildTupletNotation(restCursor, chunk);
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
          ${tupletTag}
        </note>`);
            restCursor += chunk;
          });
        }
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
