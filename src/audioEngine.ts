import * as Tone from "tone";

import { noteAt } from "./fretboardMath";
import type { Step } from "./recordingMachine";

const PREVIEW_DURATION_SECONDS = 0.35;
const PLAYBACK_SUSTAIN_RATIO = 0.85;
const COUNT_IN_BEAT_TOTAL = 4;
const COUNT_IN_CLICK_DURATION_SECONDS = 0.12;
const COUNT_IN_DOWNBEAT_MIDI = 76;
const COUNT_IN_BEAT_MIDI = 72;

interface FrequencyLike {
  toNote(): string;
}

interface PluckSynthLike {
  toDestination(): PluckSynthLike;
  triggerAttackRelease(note: string, duration: number, time?: number): void;
}

interface TransportLike {
  bpm: {
    value: number;
  };
  scheduleRepeat(callback: (time: number) => void, interval: number): number;
  clear(eventId: number): TransportLike;
  cancel(after?: number): TransportLike;
  start(time?: number): TransportLike;
  stop(time?: number): TransportLike;
}

interface ToneLike {
  Frequency(value: number, units: "midi"): FrequencyLike;
  PluckSynth: new () => PluckSynthLike;
  Transport: TransportLike;
  start(): Promise<void>;
}

interface PlaySequenceOptions {
  steps: Step[];
  bpm: number;
  countInEnabled?: boolean;
  loopEnabled?: boolean;
  onStep?: (index: number) => void;
  onStop?: () => void;
}

export interface PlaybackHandle {
  stop: () => void;
  setBpm: (bpm: number) => void;
  setLoopEnabled: (enabled: boolean) => void;
}

interface ActivePlayback {
  bpm: number;
  countInBeatsRemaining: number;
  eventId: number | null;
  loopEnabled: boolean;
  onStep: ((index: number) => void) | undefined;
  onStop: (() => void) | undefined;
  stepIndex: number;
  steps: Step[];
  stopped: boolean;
}

function stepIntervalSeconds(bpm: number) {
  return 60 / bpm;
}

const noopPlaybackHandle: PlaybackHandle = {
  stop() {},
  setBpm() {},
  setLoopEnabled() {},
};

export function createAudioEngine(tone: ToneLike) {
  let startPromise: Promise<void> | null = null;
  let synth: PluckSynthLike | null = null;
  let activePlayback: ActivePlayback | null = null;

  function getOrCreateSynth() {
    if (!synth) {
      synth = new tone.PluckSynth().toDestination();
    }

    return synth;
  }

  async function init() {
    if (!startPromise) {
      startPromise = tone.start().then(() => {
        getOrCreateSynth();
      });
    }

    await startPromise;
  }

  async function previewNote(stringIndex: number, fret: number) {
    await init();

    const note = noteAt(stringIndex, fret);
    const pitch = tone.Frequency(note.midi, "midi").toNote();

    getOrCreateSynth().triggerAttackRelease(pitch, PREVIEW_DURATION_SECONDS);
  }

  function stopPlayback(playback: ActivePlayback | null, notifyStop: boolean) {
    if (playback === null || playback.stopped) {
      return;
    }

    playback.stopped = true;

    if (activePlayback === playback) {
      activePlayback = null;
    }

    clearScheduledPlayback(playback);
    tone.Transport.stop();
    tone.Transport.cancel(0);

    if (notifyStop) {
      playback.onStop?.();
    }
  }

  function clearScheduledPlayback(playback: ActivePlayback) {
    if (playback.eventId !== null) {
      tone.Transport.clear(playback.eventId);
      playback.eventId = null;
    }
  }

  function playCountInClick(time: number, beatIndex: number) {
    const midi = beatIndex === 0 ? COUNT_IN_DOWNBEAT_MIDI : COUNT_IN_BEAT_MIDI;
    const pitch = tone.Frequency(midi, "midi").toNote();

    getOrCreateSynth().triggerAttackRelease(pitch, COUNT_IN_CLICK_DURATION_SECONDS, time);
  }

  function schedulePlayback(playback: ActivePlayback) {
    const intervalSeconds = stepIntervalSeconds(playback.bpm);

    tone.Transport.cancel(0);
    tone.Transport.bpm.value = playback.bpm;
    playback.eventId = tone.Transport.scheduleRepeat((time) => {
      if (activePlayback !== playback || playback.stopped) {
        return;
      }

      if (playback.countInBeatsRemaining > 0) {
        const beatIndex = COUNT_IN_BEAT_TOTAL - playback.countInBeatsRemaining;

        playCountInClick(time, beatIndex);
        playback.countInBeatsRemaining -= 1;
        return;
      }

      if (playback.stepIndex >= playback.steps.length) {
        if (playback.loopEnabled) {
          playback.stepIndex = 0;
          return;
        }

        stopPlayback(playback, true);
        return;
      }

      const step = playback.steps[playback.stepIndex];

      if (step === undefined) {
        stopPlayback(playback, true);
        return;
      }

      const note = noteAt(step.string, step.fret);
      const pitch = tone.Frequency(note.midi, "midi").toNote();

      playback.onStep?.(playback.stepIndex);
      getOrCreateSynth().triggerAttackRelease(
        pitch,
        intervalSeconds * PLAYBACK_SUSTAIN_RATIO,
        time,
      );
      playback.stepIndex += 1;
    }, intervalSeconds);
    tone.Transport.start();
  }

  async function playSequence({
    steps,
    bpm,
    countInEnabled = false,
    loopEnabled = false,
    onStep,
    onStop,
  }: PlaySequenceOptions): Promise<PlaybackHandle> {
    await init();
    stopPlayback(activePlayback, false);

    if (steps.length === 0) {
      onStop?.();

      return noopPlaybackHandle;
    }

    const playback: ActivePlayback = {
      bpm,
      countInBeatsRemaining: countInEnabled ? COUNT_IN_BEAT_TOTAL : 0,
      eventId: null,
      loopEnabled,
      onStep,
      onStop,
      stepIndex: 0,
      steps: steps.map((step) => ({ ...step })),
      stopped: false,
    };

    activePlayback = playback;
    schedulePlayback(playback);

    return {
      stop() {
        stopPlayback(playback, true);
      },
      setBpm(nextBpm) {
        if (activePlayback !== playback || playback.stopped) {
          return;
        }

        playback.bpm = nextBpm;
        clearScheduledPlayback(playback);
        schedulePlayback(playback);
      },
      setLoopEnabled(enabled) {
        if (activePlayback !== playback || playback.stopped) {
          return;
        }

        playback.loopEnabled = enabled;
      },
    };
  }

  function stop() {
    stopPlayback(activePlayback, true);
  }

  return {
    init,
    playSequence,
    previewNote,
    stop,
  };
}

const audioEngine = createAudioEngine(Tone);

export const init = audioEngine.init;
export const playSequence = audioEngine.playSequence;
export const previewNote = audioEngine.previewNote;
export const stop = audioEngine.stop;
