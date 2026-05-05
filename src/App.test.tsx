import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { SEQUENCE_STORAGE_KEY, SEQUENCE_STORAGE_VERSION } from "./sequenceStore";

const { init, playSequence, playbackHandles, previewNote, stop } = vi.hoisted(() => ({
  init: vi.fn().mockResolvedValue(undefined),
  playSequence: vi.fn().mockImplementation(async (options) => {
    const handle = {
      setBpm: vi.fn(),
      stop: vi.fn(),
    };

    playbackHandles.push({
      handle,
      options,
    });

    return handle;
  }),
  playbackHandles: [] as Array<{
    handle: {
      setBpm: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    };
    options: {
      bpm: number;
      onStep?: (index: number) => void;
      onStop?: () => void;
      steps: Array<{ string: number; fret: number }>;
    };
  }>,
  previewNote: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
}));

vi.mock("./audioEngine", () => ({
  init,
  playSequence,
  previewNote,
  stop,
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
    vi.useRealTimers();
    window.localStorage.clear();
    init.mockClear();
    playSequence.mockClear();
    playbackHandles.length = 0;
    previewNote.mockClear();
    stop.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();

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

  it("plays draft playback through the audio engine at 80 BPM and stops it when cleared", async () => {
    const { container } = render(<App />);
    const firstCell = getFretboardCell(container, 0, 0);
    const secondCell = getFretboardCell(container, 0, 3);

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    fireEvent.click(firstCell);
    fireEvent.click(secondCell);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    playSequence.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => expect(playSequence).toHaveBeenCalledTimes(1));

    expect(playbackHandles[0]?.options.bpm).toBe(80);
    expect(playbackHandles[0]?.options.steps).toEqual([
      { string: 0, fret: 0 },
      { string: 0, fret: 3 },
    ]);

    act(() => {
      playbackHandles[0]?.options.onStep?.(0);
    });

    expect(screen.getByTestId("active-step-badge")).toHaveAttribute("data-step-index", "0");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Record" })).toBeInTheDocument();
  });

  it("saves a draft to localStorage, lists it, and reloads it on a fresh render", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_762_345_600_000);
    const { container, unmount } = render(<App />);
    const firstCell = getFretboardCell(container, 0, 0);
    const secondCell = getFretboardCell(container, 0, 3);

    expect(
      screen.getByText("No sequences yet. Press Record to create your first exercise."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    fireEvent.click(firstCell);
    fireEvent.click(secondCell);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const dialog = screen.getByRole("dialog", { name: "Save sequence" });
    const nameInput = within(dialog).getByLabelText("Sequence name") as HTMLInputElement;

    expect(nameInput.value).toBe("");

    fireEvent.change(nameInput, { target: { value: "Warmup" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save sequence" }));

    expect(screen.getByRole("button", { name: "Record" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Save sequence" })).not.toBeInTheDocument();

    const savedList = screen.getByLabelText("Saved sequences");
    const rows = within(savedList).getAllByRole("listitem");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Warmup");
    expect(rows[0]).toHaveTextContent("2 steps");
    expect(rows[0]).toHaveTextContent("just now");

    unmount();
    render(<App />);

    const reloadedList = screen.getByLabelText("Saved sequences");

    expect(within(reloadedList).getByText("Warmup")).toBeInTheDocument();
    expect(screen.queryByText("No sequences yet. Press Record to create your first exercise.")).not
      .toBeInTheDocument();

    nowSpy.mockRestore();
  });

  it("shows an inline error for duplicate names and cancel keeps the draft intact", () => {
    window.localStorage.setItem(
      SEQUENCE_STORAGE_KEY,
      JSON.stringify({
        version: SEQUENCE_STORAGE_VERSION,
        sequences: [
          {
            id: "saved-1",
            name: "Warmup",
            steps: [{ string: 0, fret: 0 }],
            bpm: 80,
            createdAt: 1_762_345_500_000,
          },
        ],
      }),
    );

    const { container } = render(<App />);
    const firstCell = getFretboardCell(container, 0, 0);

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    fireEvent.click(firstCell);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const dialog = screen.getByRole("dialog", { name: "Save sequence" });
    const nameInput = within(dialog).getByLabelText("Sequence name");

    fireEvent.change(nameInput, { target: { value: " warmup " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save sequence" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "A sequence with that name already exists.",
    );
    expect(screen.getByRole("dialog", { name: "Save sequence" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Save sequence" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByLabelText("Draft sequence")).toBeInTheDocument();
  });

  it("selects a saved sequence, mirrors it on the fretboard and strip, and clears selection on record", () => {
    window.localStorage.setItem(
      SEQUENCE_STORAGE_KEY,
      JSON.stringify({
        version: SEQUENCE_STORAGE_VERSION,
        sequences: [
          {
            id: "saved-1",
            name: "Warmup",
            steps: [
              { string: 0, fret: 0 },
              { string: 0, fret: 3 },
            ],
            bpm: 80,
            createdAt: 1_762_345_500_000,
          },
          {
            id: "saved-2",
            name: "Arpeggio",
            steps: [
              { string: 1, fret: 0 },
              { string: 2, fret: 2 },
              { string: 1, fret: 0 },
            ],
            bpm: 100,
            createdAt: 1_762_345_600_000,
          },
        ],
      }),
    );

    const { container } = render(<App />);
    const openECell = getFretboardCell(container, 0, 0);

    const arpeggioRow = screen.getByRole("button", { name: "Select Arpeggio" });

    fireEvent.click(arpeggioRow);

    expect(arpeggioRow).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("step-badge")).toHaveLength(3);
    expect(
      container.querySelectorAll('[data-step-badge="true"][data-string-index="1"][data-fret="0"]'),
    ).toHaveLength(2);

    const selectedStrip = screen.getByLabelText("Selected sequence");
    const selectedItems = within(selectedStrip).getAllByRole("listitem");

    expect(selectedItems.map((item) => item.textContent)).toEqual([
      "1. A string 5, fret 0",
      "2. E string 4, fret 2",
      "3. A string 5, fret 0",
    ]);

    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
    expect(screen.getByRole("slider", { name: "Tempo (BPM)" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Count-in" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Loop" })).toBeDisabled();

    fireEvent.click(openECell);

    expect(previewNote).toHaveBeenCalledTimes(1);
    expect(previewNote).toHaveBeenLastCalledWith(0, 0);
    expect(screen.getAllByTestId("step-badge")).toHaveLength(3);

    fireEvent.click(arpeggioRow);

    expect(arpeggioRow).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByLabelText("Selected sequence")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("step-badge")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Select Warmup" }));

    expect(screen.getAllByTestId("step-badge")).toHaveLength(2);
    expect(screen.getByLabelText("Selected sequence")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Record" }));

    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Selected sequence")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("step-badge")).toHaveLength(0);
  });

  it("renames a saved sequence with duplicate validation and persists the new name", () => {
    window.localStorage.setItem(
      SEQUENCE_STORAGE_KEY,
      JSON.stringify({
        version: SEQUENCE_STORAGE_VERSION,
        sequences: [
          {
            id: "saved-1",
            name: "Warmup",
            steps: [{ string: 0, fret: 0 }],
            bpm: 80,
            createdAt: 1_762_345_500_000,
          },
          {
            id: "saved-2",
            name: "Arpeggio",
            steps: [
              { string: 0, fret: 0 },
              { string: 0, fret: 3 },
            ],
            bpm: 90,
            createdAt: 1_762_345_600_000,
          },
        ],
      }),
    );

    const { unmount } = render(<App />);
    const savedList = screen.getByLabelText("Saved sequences");

    fireEvent.click(screen.getByRole("button", { name: "Open actions for Arpeggio" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    const dialog = screen.getByRole("dialog", { name: "Rename sequence" });
    const nameInput = within(dialog).getByLabelText("Sequence name") as HTMLInputElement;

    expect(nameInput.value).toBe("Arpeggio");

    fireEvent.change(nameInput, { target: { value: " warmup " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rename sequence" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "A sequence with that name already exists.",
    );

    fireEvent.change(nameInput, { target: { value: "Etude" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rename sequence" }));

    expect(screen.queryByRole("dialog", { name: "Rename sequence" })).not.toBeInTheDocument();
    expect(within(savedList).getByText("Etude")).toBeInTheDocument();
    expect(within(savedList).queryByText("Arpeggio")).not.toBeInTheDocument();

    unmount();
    render(<App />);

    const reloadedList = screen.getByLabelText("Saved sequences");

    expect(within(reloadedList).getByText("Etude")).toBeInTheDocument();
    expect(within(reloadedList).queryByText("Arpeggio")).not.toBeInTheDocument();
  });

  it("confirms deletes, preserves the sequence on cancel, and persists confirmed deletes", () => {
    window.localStorage.setItem(
      SEQUENCE_STORAGE_KEY,
      JSON.stringify({
        version: SEQUENCE_STORAGE_VERSION,
        sequences: [
          {
            id: "saved-1",
            name: "Warmup",
            steps: [{ string: 0, fret: 0 }],
            bpm: 80,
            createdAt: 1_762_345_500_000,
          },
          {
            id: "saved-2",
            name: "Arpeggio",
            steps: [
              { string: 0, fret: 0 },
              { string: 0, fret: 3 },
            ],
            bpm: 90,
            createdAt: 1_762_345_600_000,
          },
        ],
      }),
    );

    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Open actions for Arpeggio" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    const dialog = screen.getByRole("alertdialog", { name: "Delete sequence" });

    expect(dialog).toHaveTextContent("Delete Arpeggio?");
    expect(dialog).toHaveTextContent("2 steps");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog", { name: "Delete sequence" })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Saved sequences")).getByText("Arpeggio"))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open actions for Arpeggio" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete sequence" }));

    expect(within(screen.getByLabelText("Saved sequences")).queryByText("Arpeggio")).not
      .toBeInTheDocument();
    expect(within(screen.getByLabelText("Saved sequences")).getByText("Warmup")).toBeInTheDocument();

    unmount();
    render(<App />);

    const reloadedList = screen.getByLabelText("Saved sequences");

    expect(within(reloadedList).getByText("Warmup")).toBeInTheDocument();
    expect(within(reloadedList).queryByText("Arpeggio")).not.toBeInTheDocument();
  });

  it("plays the selected sequence with live highlighting and persists bpm changes", async () => {
    window.localStorage.setItem(
      SEQUENCE_STORAGE_KEY,
      JSON.stringify({
        version: SEQUENCE_STORAGE_VERSION,
        sequences: [
          {
            id: "saved-1",
            name: "Warmup",
            steps: [
              { string: 0, fret: 0 },
              { string: 0, fret: 3 },
            ],
            bpm: 100,
            createdAt: 1_762_345_500_000,
          },
        ],
      }),
    );

    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Select Warmup" }));

    const tempoSlider = screen.getByRole("slider", { name: "Tempo (BPM)" }) as HTMLInputElement;

    expect(tempoSlider.value).toBe("100");

    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => expect(playSequence).toHaveBeenCalledTimes(1));

    const playback = playbackHandles[0];

    expect(playback?.options.bpm).toBe(100);
    expect(playback?.options.steps).toEqual([
      { string: 0, fret: 0 },
      { string: 0, fret: 3 },
    ]);
    expect(screen.getByRole("button", { name: "Record" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();

    act(() => {
      playback?.options.onStep?.(1);
    });

    const activeBadge = screen.getByTestId("active-step-badge");

    expect(activeBadge).toHaveAttribute("data-step-index", "1");
    expect(screen.getAllByTestId("step-badge")).toHaveLength(2);

    fireEvent.change(tempoSlider, { target: { value: "132" } });

    expect(playback?.handle.setBpm).toHaveBeenCalledWith(132);
    expect((screen.getByRole("slider", { name: "Tempo (BPM)" }) as HTMLInputElement).value).toBe(
      "132",
    );
    act(() => {
      playback?.options.onStop?.();
    });

    expect(screen.queryByTestId("active-step-badge")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();

    unmount();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Select Warmup" }));

    expect((screen.getByRole("slider", { name: "Tempo (BPM)" }) as HTMLInputElement).value).toBe(
      "132",
    );
  });

  it("starts playback from a saved row play button, stops on row switch, and disables row play during recording", async () => {
    window.localStorage.setItem(
      SEQUENCE_STORAGE_KEY,
      JSON.stringify({
        version: SEQUENCE_STORAGE_VERSION,
        sequences: [
          {
            id: "saved-1",
            name: "Warmup",
            steps: [{ string: 0, fret: 0 }],
            bpm: 80,
            createdAt: 1_762_345_500_000,
          },
          {
            id: "saved-2",
            name: "Arpeggio",
            steps: [
              { string: 1, fret: 0 },
              { string: 2, fret: 2 },
            ],
            bpm: 90,
            createdAt: 1_762_345_600_000,
          },
        ],
      }),
    );

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Play Arpeggio" }));

    await waitFor(() => expect(playSequence).toHaveBeenCalledTimes(1));

    expect(screen.getByRole("button", { name: "Select Arpeggio" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(playbackHandles[0]?.options.steps).toEqual([
      { string: 1, fret: 0 },
      { string: 2, fret: 2 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Select Warmup" }));

    expect(stop).toHaveBeenCalled();
    expect(playSequence).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Select Warmup" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Select Arpeggio" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "Record" }));

    expect(screen.getByRole("button", { name: "Play Warmup" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Play Arpeggio" })).toBeDisabled();
  });
});
