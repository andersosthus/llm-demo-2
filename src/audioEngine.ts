import * as Tone from "tone";

import { noteAt } from "./fretboardMath";

const PREVIEW_DURATION_SECONDS = 0.35;

interface FrequencyLike {
  toNote(): string;
}

interface PluckSynthLike {
  toDestination(): PluckSynthLike;
  triggerAttackRelease(note: string, duration: number): void;
}

interface ToneLike {
  Frequency(value: number, units: "midi"): FrequencyLike;
  PluckSynth: new () => PluckSynthLike;
  start(): Promise<void>;
}

export function createAudioEngine(tone: ToneLike) {
  let startPromise: Promise<void> | null = null;
  let synth: PluckSynthLike | null = null;

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

  return {
    init,
    previewNote,
  };
}

const audioEngine = createAudioEngine(Tone);

export const init = audioEngine.init;
export const previewNote = audioEngine.previewNote;
