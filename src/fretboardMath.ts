export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64] as const;

const CHROMATIC_SCALE = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const STANDARD_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24] as const;
const DOUBLE_MARKERS = new Set([12, 24]);

export type NoteName = (typeof CHROMATIC_SCALE)[number];
export type Tuning = readonly number[];

export interface NotePosition {
  fret: number;
  note: ReturnType<typeof noteAt>;
}

export function isNatural(name: NoteName): boolean {
  return !name.includes("#");
}

export function noteAt(
  stringIndex: number,
  fret: number,
  tuning: Tuning = STANDARD_TUNING,
) {
  const openMidi = tuning[stringIndex];

  if (openMidi === undefined) {
    throw new RangeError(`String index ${stringIndex} is out of range.`);
  }

  if (fret < 0) {
    throw new RangeError(`Fret ${fret} must be zero or greater.`);
  }

  const midi = openMidi + fret;
  const name = CHROMATIC_SCALE[midi % CHROMATIC_SCALE.length] as NoteName;

  return {
    midi,
    name,
    isNatural: isNatural(name),
  };
}

export function naturalsForString(
  stringIndex: number,
  frets: number,
  tuning: Tuning = STANDARD_TUNING,
): NotePosition[] {
  const positions: NotePosition[] = [];

  for (let fret = 0; fret <= frets; fret += 1) {
    const note = noteAt(stringIndex, fret, tuning);

    if (note.isNatural) {
      positions.push({ fret, note });
    }
  }

  return positions;
}

export function fretMarkerPositions(maxFrets: number): number[] {
  return STANDARD_MARKERS.filter((marker) => marker <= maxFrets);
}

export function isDoubleMarker(fret: number): boolean {
  return DOUBLE_MARKERS.has(fret);
}
