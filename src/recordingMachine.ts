export interface Step {
  string: number;
  fret: number;
}

export type RecordingState =
  | {
      mode: "idle";
    }
  | {
      mode: "recording.live";
      steps: Step[];
    }
  | {
      mode: "recording.draft";
      steps: Step[];
    };

export type RecordingEvent =
  | {
      type: "START_RECORD";
    }
  | {
      type: "APPEND_NOTE";
      step: Step;
    }
  | {
      type: "CLEAR";
    }
  | {
      type: "STOP";
    }
  | {
      type: "SAVE";
      name: string;
    };

export type RecordingIntent =
  | {
      type: "playNote";
      step: Step;
    }
  | {
      type: "persist";
      name: string;
      steps: Step[];
    };

export interface RecordingResult {
  state: RecordingState;
  intents: RecordingIntent[];
}

export const initialRecordingState: RecordingState = { mode: "idle" };

function noChange(state: RecordingState): RecordingResult {
  return { state, intents: [] };
}

function resetToIdle(): RecordingResult {
  return { state: initialRecordingState, intents: [] };
}

export function reduceRecordingState(
  state: RecordingState,
  event: RecordingEvent,
): RecordingResult {
  switch (state.mode) {
    case "idle": {
      if (event.type === "START_RECORD") {
        return {
          state: { mode: "recording.live", steps: [] },
          intents: [],
        };
      }

      return noChange(state);
    }

    case "recording.live": {
      switch (event.type) {
        case "APPEND_NOTE":
          return {
            state: {
              mode: "recording.live",
              steps: [...state.steps, event.step],
            },
            intents: [{ type: "playNote", step: event.step }],
          };
        case "CLEAR":
          return resetToIdle();
        case "STOP": {
          if (state.steps.length === 0) {
            return resetToIdle();
          }

          return {
            state: {
              mode: "recording.draft",
              steps: state.steps,
            },
            intents: [],
          };
        }
        default:
          return noChange(state);
      }
    }

    case "recording.draft": {
      switch (event.type) {
        case "CLEAR":
          return resetToIdle();
        case "SAVE":
          return {
            state: initialRecordingState,
            intents: [
              {
                type: "persist",
                name: event.name,
                steps: state.steps,
              },
            ],
          };
        default:
          return noChange(state);
      }
    }
  }
}
