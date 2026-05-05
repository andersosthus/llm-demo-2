import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

const { init, previewNote } = vi.hoisted(() => ({
  init: vi.fn().mockResolvedValue(undefined),
  previewNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./audioEngine", () => ({
  init,
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

describe("App recording flow", () => {
  beforeEach(() => {
    init.mockClear();
    previewNote.mockClear();
  });

  it("returns to idle when stop is pressed without notes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Record" }));

    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(screen.getByRole("button", { name: "Record" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Draft sequence")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("step-badge")).toHaveLength(0);
    expect(init).toHaveBeenCalledTimes(1);
    expect(previewNote).not.toHaveBeenCalled();
  });

  it("records repeated notes, shows draft controls, and clears the draft", () => {
    const { container } = render(<App />);
    const repeatedCell = getFretboardCell(container, 0, 0);
    const secondCell = getFretboardCell(container, 0, 3);

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    fireEvent.click(repeatedCell);
    fireEvent.click(secondCell);
    fireEvent.click(repeatedCell);

    expect(previewNote).toHaveBeenCalledTimes(3);
    expect(previewNote).toHaveBeenNthCalledWith(1, 0, 0);
    expect(previewNote).toHaveBeenNthCalledWith(2, 0, 3);
    expect(previewNote).toHaveBeenNthCalledWith(3, 0, 0);

    const liveBadges = screen.getAllByTestId("step-badge");

    expect(liveBadges).toHaveLength(3);
    expect(liveBadges.map((badge) => badge.textContent)).toEqual(["1", "2", "3"]);
    expect(
      container.querySelectorAll('[data-step-badge="true"][data-string-index="0"][data-fret="0"]'),
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    const strip = screen.getByLabelText("Draft sequence");
    const items = within(strip).getAllByRole("listitem");

    expect(items.map((item) => item.textContent)).toEqual([
      "1. E string 6, fret 0",
      "2. G string 6, fret 3",
      "3. E string 6, fret 0",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("button", { name: "Record" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Draft sequence")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("step-badge")).toHaveLength(0);
  });
});
