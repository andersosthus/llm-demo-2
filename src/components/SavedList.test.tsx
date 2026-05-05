import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SavedList } from "./SavedList";

describe("SavedList", () => {
  it("renders the empty helper card when there are no saved sequences", () => {
    render(<SavedList sequences={[]} />);

    expect(
      screen.getByText("No sequences yet. Press Record to create your first exercise."),
    ).toBeInTheDocument();
  });

  it("orders rows by newest first and shows step counts with relative dates", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-05-05T12:00:00.000Z").valueOf());

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
});
