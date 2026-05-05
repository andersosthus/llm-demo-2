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

      return { state, intents: [] };
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
          return {
            state: initialRecordingState,
            intents: [],
          };
        case "STOP":
          return {
            state:
              state.steps.length === 0
                ? initialRecordingState
                : {
                    mode: "recording.draft",
                    steps: state.steps,
                  },
            intents: [],
          };
        default:
          return { state, intents: [] };
      }
    }

    case "recording.draft": {
      switch (event.type) {
        case "CLEAR":
          return {
            state: initialRecordingState,
            intents: [],
          };
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
          return { state, intents: [] };
      }
    }
  }
}
