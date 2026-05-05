import { describe, expect, it } from "vitest";

import {
  STANDARD_TUNING,
  fretMarkerPositions,
  isNatural,
  naturalsForString,
  noteAt,
} from "./fretboardMath";

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

describe("fretboardMath", () => {
  it("looks up the note name, midi value, and natural-flag for every standard-tuning position", () => {
    STANDARD_TUNING.forEach((openMidi, stringIndex) => {
      for (let fret = 0; fret <= 24; fret += 1) {
        const midi = openMidi + fret;
        const expectedName = CHROMATIC_SCALE[midi % CHROMATIC_SCALE.length]!;
        const note = noteAt(stringIndex, fret);

        expect(note).toEqual({
          midi,
          name: expectedName,
          isNatural: !expectedName.includes("#"),
        });
      }
    });
  });

  it("returns only natural-note positions for a string", () => {
    expect(
      naturalsForString(0, 12).map((position) => ({
        fret: position.fret,
        name: position.note.name,
      })),
    ).toEqual([
      { fret: 0, name: "E" },
      { fret: 1, name: "F" },
      { fret: 3, name: "G" },
      { fret: 5, name: "A" },
      { fret: 7, name: "B" },
      { fret: 8, name: "C" },
      { fret: 10, name: "D" },
      { fret: 12, name: "E" },
    ]);
  });

  it("identifies natural notes correctly", () => {
    expect(isNatural("A")).toBe(true);
    expect(isNatural("C#")).toBe(false);
    expect(isNatural("F")).toBe(true);
    expect(isNatural("G#")).toBe(false);
  });

  it("returns standard fret marker positions for supported neck lengths", () => {
    expect(fretMarkerPositions(12)).toEqual([3, 5, 7, 9, 12]);
    expect(fretMarkerPositions(22)).toEqual([3, 5, 7, 9, 12, 15, 17, 19, 21]);
    expect(fretMarkerPositions(24)).toEqual([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
  });
});
