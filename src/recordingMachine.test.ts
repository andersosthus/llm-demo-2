import { describe, expect, it } from "vitest";

import {
  initialRecordingState,
  reduceRecordingState,
  type RecordingEvent,
  type RecordingState,
  type Step,
} from "./recordingMachine";

function recordToDraft(steps: Step[]): RecordingState {
  let currentState = reduceRecordingState(initialRecordingState, {
    type: "START_RECORD",
  }).state;

  for (const step of steps) {
    currentState = reduceRecordingState(currentState, {
      type: "APPEND_NOTE",
      step,
    }).state;
  }

  return reduceRecordingState(currentState, { type: "STOP" }).state;
}

function expectNoop(state: RecordingState, event: RecordingEvent) {
  const result = reduceRecordingState(state, event);

  expect(result.state).toEqual(state);
  expect(result.intents).toEqual([]);
}

describe("recordingMachine", () => {
  it("returns to idle when stopping an empty recording", () => {
    const started = reduceRecordingState(initialRecordingState, {
      type: "START_RECORD",
    });
    const stopped = reduceRecordingState(started.state, { type: "STOP" });

    expect(started.state).toEqual({ mode: "recording.live", steps: [] });
    expect(stopped.state).toEqual(initialRecordingState);
    expect(stopped.intents).toEqual([]);
  });

  it("appends repeated notes in order and emits preview intents", () => {
    const firstStep = { string: 0, fret: 0 } satisfies Step;
    const secondStep = { string: 0, fret: 3 } satisfies Step;
    let state = reduceRecordingState(initialRecordingState, {
      type: "START_RECORD",
    }).state;

    const firstAppend = reduceRecordingState(state, {
      type: "APPEND_NOTE",
      step: firstStep,
    });
    state = firstAppend.state;

    const secondAppend = reduceRecordingState(state, {
      type: "APPEND_NOTE",
      step: secondStep,
    });
    state = secondAppend.state;

    const thirdAppend = reduceRecordingState(state, {
      type: "APPEND_NOTE",
      step: firstStep,
    });

    expect(thirdAppend.state).toEqual({
      mode: "recording.live",
      steps: [firstStep, secondStep, firstStep],
    });
    expect(firstAppend.intents).toEqual([{ type: "playNote", step: firstStep }]);
    expect(secondAppend.intents).toEqual([{ type: "playNote", step: secondStep }]);
    expect(thirdAppend.intents).toEqual([{ type: "playNote", step: firstStep }]);
  });

  it("clears a draft back to idle", () => {
    const draftState = recordToDraft([{ string: 2, fret: 2 }]);
    const cleared = reduceRecordingState(draftState, { type: "CLEAR" });

    expect(draftState).toEqual({
      mode: "recording.draft",
      steps: [{ string: 2, fret: 2 }],
    });
    expect(cleared.state).toEqual(initialRecordingState);
    expect(cleared.intents).toEqual([]);
  });

  it("emits a persist intent when saving a draft", () => {
    const steps = [
      { string: 1, fret: 0 },
      { string: 1, fret: 1 },
    ] satisfies Step[];
    const draftState = recordToDraft(steps);
    const saved = reduceRecordingState(draftState, {
      type: "SAVE",
      name: "Warmup",
    });

    expect(saved.state).toEqual(initialRecordingState);
    expect(saved.intents).toEqual([
      {
        type: "persist",
        name: "Warmup",
        steps,
      },
    ]);
  });

  it("treats illegal events as no-ops", () => {
    expectNoop(initialRecordingState, {
      type: "APPEND_NOTE",
      step: { string: 0, fret: 0 },
    });
    expectNoop(initialRecordingState, { type: "STOP" });
    expectNoop({ mode: "recording.live", steps: [] }, { type: "START_RECORD" });
    expectNoop(
      { mode: "recording.draft", steps: [{ string: 3, fret: 2 }] },
      { type: "APPEND_NOTE", step: { string: 3, fret: 2 } },
    );
  });
});
