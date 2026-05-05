import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Fretboard } from "./Fretboard";

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
  const onNaturalFretClick = vi.fn();

  beforeEach(() => {
    onNaturalFretClick.mockClear();
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

  it("only calls the fret click handler for natural notes", () => {
    const { container } = render(<Fretboard onNaturalFretClick={onNaturalFretClick} />);
    const naturalCell = getFretboardCell(container, 0, 0);
    const sharpCell = getFretboardCell(container, 0, 2);

    fireEvent.click(naturalCell);
    fireEvent.click(sharpCell);

    expect(onNaturalFretClick).toHaveBeenCalledTimes(1);
    expect(onNaturalFretClick).toHaveBeenCalledWith(0, 0);
  });

  it("renders ordered badges for repeated draft notes", () => {
    render(
      <Fretboard
        stepBadges={[
          { string: 0, fret: 0 },
          { string: 0, fret: 3 },
          { string: 0, fret: 0 },
        ]}
      />,
    );

    expect(screen.getAllByTestId("step-badge")).toHaveLength(3);
  });

  it("renders a glowing overlay for the active playback step", () => {
    render(
      <Fretboard
        activeStepIndex={1}
        stepBadges={[
          { string: 0, fret: 0 },
          { string: 0, fret: 3 },
        ]}
      />,
    );

    expect(screen.getByTestId("active-step-badge")).toHaveAttribute("data-step-index", "1");
  });
});
