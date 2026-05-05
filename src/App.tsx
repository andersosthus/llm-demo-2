import { useEffect, useRef, useState } from "react";

import { init, previewNote } from "./audioEngine";
import { Fretboard } from "./components/Fretboard";
import { SaveDialog } from "./components/SaveDialog";
import { SavedList } from "./components/SavedList";
import { SequenceStrip } from "./components/SequenceStrip";
import { Button } from "./components/ui/button";
import {
  initialRecordingState,
  reduceRecordingState,
  type RecordingEvent,
  type RecordingIntent,
  type RecordingState,
} from "./recordingMachine";
import {
  createSequenceStore,
  DEFAULT_SEQUENCE_BPM,
  type Sequence,
} from "./sequenceStore";

const DRAFT_PREVIEW_INTERVAL_MS = 425;

function shouldClearDraftPreviewQueue(event: RecordingEvent) {
  return event.type === "CLEAR" || event.type === "SAVE";
}

function modeTitle(state: RecordingState) {
  switch (state.mode) {
    case "idle":
      return "Ready to Record";
    case "recording.live":
      return "Recording Live";
    case "recording.draft":
      return "Draft Sequence";
  }
}

function modeDescription(state: RecordingState) {
  switch (state.mode) {
    case "idle":
      return "Click Record to start drafting a sequence in memory.";
    case "recording.live":
      return "Every natural-note click previews the pitch and appends a numbered step.";
    case "recording.draft":
      return "Review the draft on the neck, preview it, or save it to the library.";
  }
}

function createSequenceId() {
  return globalThis.crypto?.randomUUID?.() ?? `sequence-${Date.now()}-${Math.random()}`;
}

export function App() {
  const sequenceStoreRef = useRef<ReturnType<typeof createSequenceStore> | null>(null);

  if (sequenceStoreRef.current === null) {
    sequenceStoreRef.current = createSequenceStore(window.localStorage);
  }
  const sequenceStore = sequenceStoreRef.current;

  const [recordingState, setRecordingState] = useState(initialRecordingState);
  const [savedSequences, setSavedSequences] = useState<Sequence[]>(() => sequenceStore.loadAll());
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const recordingStateRef = useRef<RecordingState>(initialRecordingState);
  const previewTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      previewTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  function clearDraftPreviewQueue() {
    previewTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    previewTimeoutsRef.current = [];
  }

  function runIntents(intents: RecordingIntent[]) {
    intents.forEach((intent) => {
      switch (intent.type) {
        case "playNote":
          void previewNote(intent.step.string, intent.step.fret);
          break;
        case "persist": {
          const didSave = sequenceStore.save({
            id: createSequenceId(),
            name: intent.name,
            steps: intent.steps,
            bpm: DEFAULT_SEQUENCE_BPM,
            createdAt: Date.now(),
          });

          if (didSave) {
            setSavedSequences(sequenceStore.loadAll());
          }
          break;
        }
      }
    });
  }

  function dispatch(event: RecordingEvent) {
    const result = reduceRecordingState(recordingStateRef.current, event);

    if (shouldClearDraftPreviewQueue(event)) {
      clearDraftPreviewQueue();
    }

    recordingStateRef.current = result.state;
    setRecordingState(result.state);
    runIntents(result.intents);
  }

  function handleRecordStart() {
    clearDraftPreviewQueue();
    void init();
    dispatch({ type: "START_RECORD" });
  }

  function handleFretClick(stringIndex: number, fret: number) {
    if (recordingState.mode === "recording.live") {
      dispatch({
        type: "APPEND_NOTE",
        step: { string: stringIndex, fret },
      });
      return;
    }

    void previewNote(stringIndex, fret);
  }

  function handleDraftPreview() {
    if (recordingState.mode !== "recording.draft") {
      return;
    }

    clearDraftPreviewQueue();

    recordingState.steps.forEach((step, index) => {
      const timeoutId = window.setTimeout(() => {
        void previewNote(step.string, step.fret);
      }, index * DRAFT_PREVIEW_INTERVAL_MS);

      previewTimeoutsRef.current.push(timeoutId);
    });
  }

  function handleSaveConfirm(name: string) {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return "Enter a sequence name.";
    }

    if (sequenceStore.nameExists(trimmedName)) {
      return "A sequence with that name already exists.";
    }

    setIsSaveDialogOpen(false);
    dispatch({ type: "SAVE", name: trimmedName });

    return null;
  }

  function renderRecordingControls() {
    switch (recordingState.mode) {
      case "idle":
        return (
          <Button type="button" onClick={handleRecordStart}>
            Record
          </Button>
        );
      case "recording.live":
        return (
          <>
            <Button type="button" onClick={() => dispatch({ type: "STOP" })}>
              Stop
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => dispatch({ type: "CLEAR" })}
            >
              Clear
            </Button>
          </>
        );
      case "recording.draft":
        return (
          <>
            <Button type="button" onClick={handleDraftPreview}>
              Play
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => dispatch({ type: "CLEAR" })}
            >
              Clear
            </Button>
            <Button type="button" onClick={() => setIsSaveDialogOpen(true)}>
              Save
            </Button>
          </>
        );
    }
  }

  const draftSteps = recordingState.mode === "idle" ? [] : recordingState.steps;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1c1917,_#0c0a09_55%)] px-6 py-8 text-stone-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-amber-400/20 bg-stone-950/60 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
                Mode
              </p>
              <h1 className="font-serif text-2xl text-stone-50">{modeTitle(recordingState)}</h1>
              <p className="mt-2 text-sm text-stone-300">{modeDescription(recordingState)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {renderRecordingControls()}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-700/60 bg-stone-900/85 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <Fretboard onNaturalFretClick={handleFretClick} stepBadges={draftSteps} />
        </section>

        {draftSteps.length > 0 ? <SequenceStrip steps={draftSteps} /> : null}
        <SavedList sequences={savedSequences} />
      </div>

      <SaveDialog
        open={isSaveDialogOpen}
        onCancel={() => setIsSaveDialogOpen(false)}
        onConfirm={handleSaveConfirm}
      />
    </main>
  );
}
