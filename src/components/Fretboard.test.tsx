import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Fretboard } from "./Fretboard";

const { previewNote } = vi.hoisted(() => ({
  previewNote: vi.fn(),
}));

vi.mock("../audioEngine", () => ({
  previewNote,
}));

function getFretboardCell(container: HTMLElement, stringIndex: number, fret: number) {
  const cell = container.querySelector(
    `[data-fretboard-cell="true"][data-string-index="${stringIndex}"][data-fret="${fret}"]`,
  );

  if (cell === null) {
    throw new Error(`Expected fretboard cell for string ${stringIndex}, fret ${fret}.`);
  }

  return cell;
}

describe("Fretboard", () => {
  beforeEach(() => {
    previewNote.mockClear();
  });

  it("renders the static fretboard with note labels and standard markers", () => {
    const { container } = render(<Fretboard />);

    const noteLabels = container.querySelectorAll('text[data-note-label="true"]');
    const singleMarkers = container.querySelectorAll('circle[data-marker-type="single"]');
    const doubleMarkers = container.querySelectorAll('circle[data-marker-type="double"]');

    expect(screen.getByRole("img", { name: /guitar fretboard/i })).toBeInTheDocument();
    expect(noteLabels).toHaveLength(90);
    expect(singleMarkers).toHaveLength(8);
    expect(doubleMarkers).toHaveLength(4);
    expect(screen.getAllByText("F").length).toBeGreaterThan(0);
    expect(container.querySelector('text[data-note-name="F#"]')).toBeNull();
  });

  it("previews natural notes on click and leaves sharp cells inert", () => {
    const { container } = render(<Fretboard />);
    const naturalCell = getFretboardCell(container, 0, 0);
    const sharpCell = getFretboardCell(container, 0, 2);

    fireEvent.click(naturalCell);
    fireEvent.click(sharpCell);

    expect(previewNote).toHaveBeenCalledTimes(1);
    expect(previewNote).toHaveBeenCalledWith(0, 0);
  });
});
