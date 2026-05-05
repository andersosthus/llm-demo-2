import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Fretboard } from "./Fretboard";

const { previewNote } = vi.hoisted(() => ({
  previewNote: vi.fn(),
}));

vi.mock("../audioEngine", () => ({
  previewNote,
}));

describe("Fretboard", () => {
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
    const naturalCell = container.querySelector(
      '[data-fretboard-cell="true"][data-string-index="0"][data-fret="0"]',
    );
    const sharpCell = container.querySelector(
      '[data-fretboard-cell="true"][data-string-index="0"][data-fret="2"]',
    );

    expect(naturalCell).not.toBeNull();
    expect(sharpCell).not.toBeNull();

    fireEvent.click(naturalCell!);
    fireEvent.click(sharpCell!);

    expect(previewNote).toHaveBeenCalledTimes(1);
    expect(previewNote).toHaveBeenCalledWith(0, 0);
  });
});
