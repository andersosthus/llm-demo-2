import { describe, expect, it, vi } from "vitest";

import { createAudioEngine } from "./audioEngine";

function createToneDouble() {
  const triggerAttackRelease = vi.fn();
  const toDestination = vi.fn();
  const start = vi.fn().mockResolvedValue(undefined);
  const Frequency = vi.fn((midi: number, units: "midi") => ({
    toNote: () => `${units}-${midi}`,
  }));
  const PluckSynth = vi.fn(function PluckSynth() {
    const synth = {
      toDestination,
      triggerAttackRelease,
    };

    toDestination.mockReturnValue(synth);

    return synth;
  });

  return {
    tone: {
      Frequency,
      PluckSynth,
      start,
    },
    spies: {
      Frequency,
      PluckSynth,
      start,
      toDestination,
      triggerAttackRelease,
    },
  };
}

describe("audioEngine", () => {
  it("initializes lazily and reuses the same synth for preview clicks", async () => {
    const { tone, spies } = createToneDouble();
    const audioEngine = createAudioEngine(tone);

    await audioEngine.previewNote(0, 0);
    await audioEngine.previewNote(0, 3);

    expect(spies.start).toHaveBeenCalledTimes(1);
    expect(spies.PluckSynth).toHaveBeenCalledTimes(1);
    expect(spies.toDestination).toHaveBeenCalledTimes(1);
    expect(spies.triggerAttackRelease).toHaveBeenCalledTimes(2);
  });

  it("maps string and fret positions to short preview notes", async () => {
    const { tone, spies } = createToneDouble();
    const audioEngine = createAudioEngine(tone);

    await audioEngine.previewNote(1, 2);

    expect(spies.Frequency).toHaveBeenCalledWith(47, "midi");
    expect(spies.triggerAttackRelease).toHaveBeenCalledWith("midi-47", 0.35);
  });
});
