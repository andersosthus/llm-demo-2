import { describe, expect, it, vi } from "vitest";

import { createAudioEngine } from "./audioEngine";

function createToneDouble() {
  const triggerAttackRelease = vi.fn();
  const toDestination = vi.fn();
  const start = vi.fn().mockResolvedValue(undefined);
  const Frequency = vi.fn((midi: number, units: "midi") => ({
    toNote: () => `${units}-${midi}`,
  }));
  let nextEventId = 1;
  const scheduledCallbacks = new Map<
    number,
    {
      callback: (time: number) => void;
      interval: number;
    }
  >();
  const PluckSynth = vi.fn(function PluckSynth() {
    const synth = {
      toDestination,
      triggerAttackRelease,
    };

    toDestination.mockReturnValue(synth);

    return synth;
  });
  const Transport = {
    bpm: {
      value: 120,
    },
    scheduleRepeat: vi.fn((callback: (time: number) => void, interval: number) => {
      const eventId = nextEventId++;

      scheduledCallbacks.set(eventId, {
        callback,
        interval,
      });

      return eventId;
    }),
    clear: vi.fn((eventId: number) => {
      scheduledCallbacks.delete(eventId);
      return Transport;
    }),
    cancel: vi.fn(() => {
      scheduledCallbacks.clear();
      return Transport;
    }),
    start: vi.fn(() => Transport),
    stop: vi.fn(() => Transport),
  };

  return {
    tone: {
      Frequency,
      PluckSynth,
      Transport,
      start,
    },
    spies: {
      Frequency,
      PluckSynth,
      Transport,
      start,
      scheduledCallbacks,
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

  it("plays sequence steps in order at the bpm-derived interval and stops naturally", async () => {
    const { tone, spies } = createToneDouble();
    const audioEngine = createAudioEngine(tone);
    const onStep = vi.fn();
    const onStop = vi.fn();

    await audioEngine.playSequence({
      steps: [
        { string: 0, fret: 0 },
        { string: 0, fret: 3 },
        { string: 1, fret: 2 },
      ],
      bpm: 120,
      onStep,
      onStop,
    });

    expect(spies.Transport.scheduleRepeat).toHaveBeenCalledTimes(1);
    expect(spies.Transport.scheduleRepeat).toHaveBeenCalledWith(expect.any(Function), 0.5);
    expect(spies.Transport.start).toHaveBeenCalledTimes(1);

    const scheduled = Array.from(spies.scheduledCallbacks.values())[0];

    expect(scheduled).toBeDefined();

    scheduled!.callback(0);
    scheduled!.callback(0.5);
    scheduled!.callback(1);

    expect(onStep).toHaveBeenNthCalledWith(1, 0);
    expect(onStep).toHaveBeenNthCalledWith(2, 1);
    expect(onStep).toHaveBeenNthCalledWith(3, 2);
    expect(spies.triggerAttackRelease).toHaveBeenNthCalledWith(1, "midi-40", 0.425, 0);
    expect(spies.triggerAttackRelease).toHaveBeenNthCalledWith(2, "midi-43", 0.425, 0.5);
    expect(spies.triggerAttackRelease).toHaveBeenNthCalledWith(3, "midi-47", 0.425, 1);

    scheduled!.callback(1.5);

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(spies.Transport.clear).toHaveBeenCalledTimes(1);
    expect(spies.Transport.stop).toHaveBeenCalledTimes(1);
  });

  it("stops playback and prevents further step callbacks", async () => {
    const { tone, spies } = createToneDouble();
    const audioEngine = createAudioEngine(tone);
    const onStep = vi.fn();
    const onStop = vi.fn();

    await audioEngine.playSequence({
      steps: [
        { string: 0, fret: 0 },
        { string: 0, fret: 3 },
      ],
      bpm: 80,
      onStep,
      onStop,
    });

    const scheduledEntry = Array.from(spies.scheduledCallbacks.entries())[0];

    expect(scheduledEntry).toBeDefined();

    const [eventId, scheduled] = scheduledEntry!;

    scheduled.callback(0);

    expect(onStep).toHaveBeenCalledWith(0);

    audioEngine.stop();

    expect(spies.Transport.clear).toHaveBeenCalledWith(eventId);
    expect(spies.Transport.stop).toHaveBeenCalledTimes(1);

    scheduled.callback(0.75);

    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("adds a four-beat count-in before the first sequence step", async () => {
    const { tone, spies } = createToneDouble();
    const audioEngine = createAudioEngine(tone);
    const onStep = vi.fn();

    await audioEngine.playSequence({
      steps: [{ string: 0, fret: 0 }],
      bpm: 120,
      countInEnabled: true,
      onStep,
    });

    const scheduled = Array.from(spies.scheduledCallbacks.values())[0];

    expect(scheduled).toBeDefined();

    scheduled!.callback(0);
    scheduled!.callback(0.5);
    scheduled!.callback(1);
    scheduled!.callback(1.5);

    expect(onStep).not.toHaveBeenCalled();
    expect(spies.triggerAttackRelease).toHaveBeenCalledTimes(4);

    scheduled!.callback(2);

    expect(onStep).toHaveBeenCalledWith(0);
    expect(spies.triggerAttackRelease).toHaveBeenCalledTimes(5);
  });

  it("loops the sequence with a one-beat gap instead of stopping", async () => {
    const { tone, spies } = createToneDouble();
    const audioEngine = createAudioEngine(tone);
    const onStep = vi.fn();
    const onStop = vi.fn();

    await audioEngine.playSequence({
      steps: [
        { string: 0, fret: 0 },
        { string: 0, fret: 3 },
      ],
      bpm: 120,
      loopEnabled: true,
      onStep,
      onStop,
    });

    const scheduled = Array.from(spies.scheduledCallbacks.values())[0];

    expect(scheduled).toBeDefined();

    scheduled!.callback(0);
    scheduled!.callback(0.5);

    expect(onStep.mock.calls).toEqual([[0], [1]]);

    scheduled!.callback(1);

    expect(onStep.mock.calls).toEqual([[0], [1]]);
    expect(onStop).not.toHaveBeenCalled();

    scheduled!.callback(1.5);

    expect(onStep.mock.calls).toEqual([[0], [1], [0]]);
    expect(onStop).not.toHaveBeenCalled();
  });
});
