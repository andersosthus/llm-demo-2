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
  let initPromise: Promise<void> | null = null;
  let synth: PluckSynthLike | null = null;

  function getSynth() {
    if (!synth) {
      synth = new tone.PluckSynth().toDestination();
    }

    return synth;
  }

  async function init() {
    if (!initPromise) {
      initPromise = tone.start().then(() => {
        getSynth();
      });
    }

    await initPromise;
  }

  async function previewNote(stringIndex: number, fret: number) {
    await init();

    const note = noteAt(stringIndex, fret);
    const pitch = tone.Frequency(note.midi, "midi").toNote();

    getSynth().triggerAttackRelease(pitch, PREVIEW_DURATION_SECONDS);
  }

  return {
    init,
    previewNote,
  };
}

const audioEngine = createAudioEngine(Tone);

export const init = audioEngine.init;
export const previewNote = audioEngine.previewNote;
