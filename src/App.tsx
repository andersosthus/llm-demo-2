import { useEffect, useRef, useState } from "react";

import {
  init,
  playSequence,
  previewNote,
  stop as stopAudio,
  type PlaybackHandle,
} from "./audioEngine";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
import { Fretboard } from "./components/Fretboard";
import { RenameDialog } from "./components/RenameDialog";
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
import { createPrefsStore, type Prefs } from "./prefsStore";

function modeTitle(state: RecordingState, isPlaying: boolean) {
  if (isPlaying) {
    return "Playback Running";
  }

  switch (state.mode) {
    case "idle":
      return "Ready to Record";
    case "recording.live":
      return "Recording Live";
    case "recording.draft":
      return "Draft Sequence";
  }
}

function modeDescription(state: RecordingState, isPlaying: boolean) {
  if (isPlaying) {
    return "Playback is active. Stop any time or adjust the selected sequence tempo live.";
  }

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

function normalizeSequenceName(name: string) {
  return name.trim().toLocaleLowerCase();
}

type PlaybackSource =
  | {
      kind: "draft";
    }
  | {
      kind: "saved";
      sequenceId: string;
    };

interface PlaybackState {
  currentStepIndex: number | null;
  source: PlaybackSource;
}

function SelectedSequenceControls({
  countInEnabled,
  isPlaying,
  loopEnabled,
  onCountInChange,
  onBpmChange,
  onLoopChange,
  onPlay,
  onStop,
  sequence,
}: {
  countInEnabled: boolean;
  isPlaying: boolean;
  loopEnabled: boolean;
  onCountInChange: (enabled: boolean) => void;
  onBpmChange: (bpm: number) => void;
  onLoopChange: (enabled: boolean) => void;
  onPlay: () => void;
  onStop: () => void;
  sequence: Sequence;
}) {
  return (
    <>
      <p className="rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100">
        {sequence.name}
      </p>
      {isPlaying ? (
        <Button type="button" onClick={onStop}>
          Stop
        </Button>
      ) : (
        <Button type="button" onClick={onPlay}>
          Play
        </Button>
      )}
      <label className="flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-300">
        <span>Tempo</span>
        <input
          aria-label="Tempo (BPM)"
          type="range"
          min={40}
          max={240}
          value={sequence.bpm}
          onChange={(event) => onBpmChange(Number(event.target.value))}
        />
      </label>
      <label className="flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-300">
        <input
          aria-label="Count-in"
          type="checkbox"
          checked={countInEnabled}
          onChange={(event) => onCountInChange(event.target.checked)}
        />
        <span>Count-in</span>
      </label>
      <label className="flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-300">
        <input
          aria-label="Loop"
          type="checkbox"
          checked={loopEnabled}
          onChange={(event) => onLoopChange(event.target.checked)}
        />
        <span>Loop</span>
      </label>
    </>
  );
}

export function App() {
  const [sequenceStore] = useState(() => createSequenceStore(window.localStorage));
  const [prefsStore] = useState(() => createPrefsStore(window.localStorage));
  const [recordingState, setRecordingState] = useState(initialRecordingState);
  const [savedSequences, setSavedSequences] = useState<Sequence[]>(() => sequenceStore.loadAll());
  const [prefs, setPrefs] = useState<Prefs>(() => prefsStore.load());
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Sequence | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sequence | null>(null);
  const recordingStateRef = useRef<RecordingState>(initialRecordingState);
  const playbackHandleRef = useRef<PlaybackHandle | null>(null);
  const playbackRequestIdRef = useRef(0);
  const selectedSequence =
    selectedSequenceId === null
      ? null
      : savedSequences.find((sequence) => sequence.id === selectedSequenceId) ?? null;
  const isSavedPlaybackActive =
    playbackState?.source.kind === "saved" &&
    playbackState.source.sequenceId === selectedSequenceId;
  const isDraftPlaybackActive = playbackState?.source.kind === "draft";
  const isPlaying = playbackState !== null;

  useEffect(() => {
    return () => {
      playbackRequestIdRef.current += 1;
      playbackHandleRef.current = null;
      stopAudio();
    };
  }, []);

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

    if (event.type === "CLEAR" || event.type === "SAVE") {
      stopPlayback();
    }

    recordingStateRef.current = result.state;
    setRecordingState(result.state);
    runIntents(result.intents);
  }

  function clearPlaybackState() {
    playbackRequestIdRef.current += 1;
    playbackHandleRef.current = null;
    setPlaybackState(null);
  }

  function stopPlayback() {
    clearPlaybackState();
    stopAudio();
  }

  function findSavedSequence(sequenceId: string) {
    return savedSequences.find((sequence) => sequence.id === sequenceId) ?? null;
  }

  function playSavedSequence(sequence: Sequence) {
    setSelectedSequenceId(sequence.id);
    void startPlayback(
      {
        kind: "saved",
        sequenceId: sequence.id,
      },
      sequence.steps,
      sequence.bpm,
    );
  }

  async function startPlayback(
    source: PlaybackSource,
    steps: Sequence["steps"],
    bpm: number,
  ) {
    stopAudio();
    clearPlaybackState();
    setPlaybackState({
      currentStepIndex: null,
      source,
    });

    const requestId = playbackRequestIdRef.current;
    const handle = await playSequence({
      steps,
      bpm,
      countInEnabled: prefs.countInEnabled,
      loopEnabled: prefs.loopEnabled,
      onStep: (index) => {
        if (playbackRequestIdRef.current !== requestId) {
          return;
        }

        setPlaybackState({
          currentStepIndex: index,
          source,
        });
      },
      onStop: () => {
        if (playbackRequestIdRef.current !== requestId) {
          return;
        }

        playbackHandleRef.current = null;
        setPlaybackState(null);
      },
    });

    if (playbackRequestIdRef.current !== requestId) {
      handle.stop();
      return;
    }

    playbackHandleRef.current = handle;
  }

  function handleRecordStart() {
    if (isPlaying) {
      return;
    }

    stopPlayback();
    setSelectedSequenceId(null);
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

  function handleDraftPlay() {
    if (recordingState.mode !== "recording.draft") {
      return;
    }

    void startPlayback({ kind: "draft" }, recordingState.steps, DEFAULT_SEQUENCE_BPM);
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

  function handleSequenceSelect(sequenceId: string) {
    if (recordingState.mode !== "idle") {
      return;
    }

    if (isPlaying) {
      if (selectedSequenceId !== sequenceId) {
        stopPlayback();
        setSelectedSequenceId(sequenceId);
      }

      return;
    }

    setSelectedSequenceId((currentSequenceId) =>
      currentSequenceId === sequenceId ? null : sequenceId,
    );
  }

  function handleSequencePlay(sequenceId: string) {
    if (recordingState.mode !== "idle") {
      return;
    }

    const sequence = findSavedSequence(sequenceId);

    if (sequence === null) {
      return;
    }

    playSavedSequence(sequence);
  }

  function handleSelectedSequencePlay() {
    if (selectedSequence === null) {
      return;
    }

    playSavedSequence(selectedSequence);
  }

  function handleSelectedSequenceBpmChange(bpm: number) {
    if (selectedSequence === null) {
      return;
    }

    if (!sequenceStore.updateBpm(selectedSequence.id, bpm)) {
      return;
    }

    setSavedSequences(sequenceStore.loadAll());

    if (isSavedPlaybackActive) {
      playbackHandleRef.current?.setBpm(bpm);
    }
  }

  function updatePrefs(nextPrefs: Prefs) {
    prefsStore.save(nextPrefs);
    setPrefs(nextPrefs);
  }

  function handleCountInChange(enabled: boolean) {
    updatePrefs({
      ...prefs,
      countInEnabled: enabled,
    });
  }

  function handleLoopChange(enabled: boolean) {
    if (isPlaying) {
      playbackHandleRef.current?.setLoopEnabled(enabled);
    }

    updatePrefs({
      ...prefs,
      loopEnabled: enabled,
    });
  }

  function hasOtherSequenceNamed(id: string, name: string) {
    const normalizedName = normalizeSequenceName(name);

    return savedSequences.some(
      (sequence) =>
        sequence.id !== id && normalizeSequenceName(sequence.name) === normalizedName,
    );
  }

  function handleRenameConfirm(name: string) {
    if (renameTarget === null) {
      return "Sequence not found.";
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return "Enter a sequence name.";
    }

    if (hasOtherSequenceNamed(renameTarget.id, trimmedName)) {
      return "A sequence with that name already exists.";
    }

    if (!sequenceStore.rename(renameTarget.id, trimmedName)) {
      return "Sequence not found.";
    }

    setSavedSequences(sequenceStore.loadAll());
    setRenameTarget(null);

    return null;
  }

  function handleDeleteConfirm() {
    if (deleteTarget === null) {
      return;
    }

    if (!sequenceStore.delete(deleteTarget.id)) {
      return;
    }

    setSavedSequences(sequenceStore.loadAll());
    setSelectedSequenceId((currentSequenceId) =>
      currentSequenceId === deleteTarget.id ? null : currentSequenceId,
    );
    setDeleteTarget(null);
  }

  function renderRecordingControls() {
    switch (recordingState.mode) {
      case "idle":
        return (
          <Button type="button" disabled={isPlaying} onClick={handleRecordStart}>
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
            {isDraftPlaybackActive ? (
              <Button type="button" onClick={stopPlayback}>
                Stop
              </Button>
            ) : (
              <Button type="button" onClick={handleDraftPlay}>
                Play
              </Button>
            )}
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

  const visibleSteps =
    recordingState.mode === "idle" ? selectedSequence?.steps ?? [] : recordingState.steps;
  const sequenceStripLabel =
    recordingState.mode === "idle" ? "Selected sequence" : "Draft sequence";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1c1917,_#0c0a09_55%)] px-6 py-8 text-stone-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-amber-400/20 bg-stone-950/60 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
                Mode
              </p>
              <h1 className="font-serif text-2xl text-stone-50">
                {modeTitle(recordingState, isPlaying)}
              </h1>
              <p className="mt-2 text-sm text-stone-300">
                {modeDescription(recordingState, isPlaying)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {renderRecordingControls()}
              {recordingState.mode === "idle" && selectedSequence !== null ? (
                <SelectedSequenceControls
                  countInEnabled={prefs.countInEnabled}
                  isPlaying={Boolean(isSavedPlaybackActive)}
                  loopEnabled={prefs.loopEnabled}
                  onCountInChange={handleCountInChange}
                  onBpmChange={handleSelectedSequenceBpmChange}
                  onLoopChange={handleLoopChange}
                  onPlay={handleSelectedSequencePlay}
                  onStop={stopPlayback}
                  sequence={selectedSequence}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-700/60 bg-stone-900/85 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <Fretboard
            activeStepIndex={playbackState?.currentStepIndex ?? null}
            onNaturalFretClick={handleFretClick}
            stepBadges={visibleSteps}
          />
        </section>

        {visibleSteps.length > 0 ? (
          <SequenceStrip ariaLabel={sequenceStripLabel} steps={visibleSteps} />
        ) : null}
        <SavedList
          onPlaySequence={handleSequencePlay}
          sequences={savedSequences}
          playEnabled={recordingState.mode === "idle"}
          selectedSequenceId={selectedSequenceId}
          selectionEnabled={recordingState.mode === "idle"}
          onSelectSequence={handleSequenceSelect}
          onRename={(sequence) => setRenameTarget(sequence)}
          onDelete={(sequence) => setDeleteTarget(sequence)}
        />
      </div>

      <SaveDialog
        open={isSaveDialogOpen}
        onCancel={() => setIsSaveDialogOpen(false)}
        onConfirm={handleSaveConfirm}
      />
      <RenameDialog
        open={renameTarget !== null}
        sequence={renameTarget}
        onCancel={() => setRenameTarget(null)}
        onConfirm={handleRenameConfirm}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        sequence={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  );
}
