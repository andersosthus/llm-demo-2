import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SavedList } from "./SavedList";

describe("SavedList", () => {
  it("renders the empty helper card when there are no saved sequences", () => {
    render(<SavedList sequences={[]} onRename={vi.fn()} onDelete={vi.fn()} />);

    expect(
      screen.getByText("No sequences yet. Press Record to create your first exercise."),
    ).toBeInTheDocument();
  });

  it("orders rows by newest first and shows step counts with relative dates", () => {
    const nowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-05-05T12:00:00.000Z").valueOf());

    render(
      <SavedList
        sequences={[
          {
            id: "older",
            name: "Older",
            steps: [{ string: 0, fret: 0 }],
            bpm: 80,
            createdAt: new Date("2026-05-03T12:00:00.000Z").valueOf(),
          },
          {
            id: "newer",
            name: "Newest",
            steps: [
              { string: 0, fret: 0 },
              { string: 0, fret: 3 },
            ],
            bpm: 100,
            createdAt: new Date("2026-05-05T11:59:30.000Z").valueOf(),
          },
        ]}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const list = screen.getByLabelText("Saved sequences");
    const rows = within(list).getAllByRole("listitem");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Newest");
    expect(rows[0]).toHaveTextContent("2 steps");
    expect(rows[0]).toHaveTextContent("just now");
    expect(rows[1]).toHaveTextContent("Older");
    expect(rows[1]).toHaveTextContent("1 step");
    expect(rows[1]).toHaveTextContent("2 days ago");

    nowSpy.mockRestore();
  });

  it("renders selectable rows and marks the active sequence", () => {
    const onSelectSequence = vi.fn();

    render(
      <SavedList
        sequences={[
          {
            id: "warmup",
            name: "Warmup",
            steps: [{ string: 0, fret: 0 }],
            bpm: 80,
            createdAt: new Date("2026-05-05T11:59:30.000Z").valueOf(),
          },
          {
            id: "arpeggio",
            name: "Arpeggio",
            steps: [{ string: 1, fret: 0 }],
            bpm: 90,
            createdAt: new Date("2026-05-05T11:58:30.000Z").valueOf(),
          },
        ]}
        selectedSequenceId="warmup"
        onSelectSequence={onSelectSequence}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const warmupRow = screen.getByRole("button", { name: "Select Warmup" });
    const arpeggioRow = screen.getByRole("button", { name: "Select Arpeggio" });

    expect(warmupRow).toHaveAttribute("aria-pressed", "true");
    expect(arpeggioRow).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(arpeggioRow);

    expect(onSelectSequence).toHaveBeenCalledWith("arpeggio");
  });

  it("opens row actions and forwards rename and delete requests", () => {
    const onRename = vi.fn();
    const onDelete = vi.fn();
    const sequence = {
      id: "newer",
      name: "Newest",
      steps: [
        { string: 0, fret: 0 },
        { string: 0, fret: 3 },
      ],
      bpm: 100,
      createdAt: new Date("2026-05-05T11:59:30.000Z").valueOf(),
    };

    render(<SavedList sequences={[sequence]} onRename={onRename} onDelete={onDelete} />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open actions for Newest" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    expect(onRename).toHaveBeenCalledWith(sequence);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open actions for Newest" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith(sequence);
  });

  it("forwards row play requests and can disable the play buttons", () => {
    const onPlaySequence = vi.fn();
    const sequence = {
      id: "warmup",
      name: "Warmup",
      steps: [{ string: 0, fret: 0 }],
      bpm: 80,
      createdAt: new Date("2026-05-05T11:59:30.000Z").valueOf(),
    };

    const { rerender } = render(
      <SavedList
        sequences={[sequence]}
        playEnabled={false}
        onPlaySequence={onPlaySequence}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const playButton = screen.getByRole("button", { name: "Play Warmup" });

    expect(playButton).toBeDisabled();

    rerender(
      <SavedList
        sequences={[sequence]}
        onPlaySequence={onPlaySequence}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Play Warmup" }));

    expect(onPlaySequence).toHaveBeenCalledWith("warmup");
  });
});
