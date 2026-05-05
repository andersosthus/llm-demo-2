import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Fretboard } from "./Fretboard";

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
});
