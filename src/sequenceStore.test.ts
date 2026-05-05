import { describe, expect, it } from "vitest";

import {
  createSequenceStore,
  DEFAULT_SEQUENCE_BPM,
  SEQUENCE_STORAGE_KEY,
  SEQUENCE_STORAGE_VERSION,
  type Sequence,
} from "./sequenceStore";

class MemoryStorage implements Storage {
  private entries = new Map<string, string>();

  get length() {
    return this.entries.size;
  }

  clear() {
    this.entries.clear();
  }

  getItem(key: string) {
    return this.entries.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.entries.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.entries.delete(key);
  }

  setItem(key: string, value: string) {
    this.entries.set(key, value);
  }
}

function createSequence(overrides: Partial<Sequence> = {}): Sequence {
  return {
    id: overrides.id ?? "sequence-1",
    name: overrides.name ?? "Warmup",
    steps: overrides.steps ?? [
      { string: 0, fret: 0 },
      { string: 0, fret: 3 },
    ],
    bpm: overrides.bpm ?? DEFAULT_SEQUENCE_BPM,
    createdAt: overrides.createdAt ?? 1_700_000_000_000,
  };
}

describe("sequenceStore", () => {
  it("round-trips saved sequences and writes the versioned payload", () => {
    const storage = new MemoryStorage();
    const store = createSequenceStore(storage);
    const sequence = createSequence();

    expect(store.save(sequence)).toBe(true);
    expect(store.loadAll()).toEqual([sequence]);

    expect(JSON.parse(storage.getItem(SEQUENCE_STORAGE_KEY) ?? "")).toEqual({
      version: SEQUENCE_STORAGE_VERSION,
      sequences: [sequence],
    });
  });

  it("rejects duplicate names and reports existing names", () => {
    const storage = new MemoryStorage();
    const store = createSequenceStore(storage);

    expect(store.save(createSequence({ id: "sequence-1", name: "Warmup" }))).toBe(true);
    expect(store.nameExists("warmup")).toBe(true);
    expect(store.save(createSequence({ id: "sequence-2", name: " warmup " }))).toBe(false);
    expect(store.loadAll()).toHaveLength(1);
  });

  it("rejects renaming a sequence to an existing name", () => {
    const storage = new MemoryStorage();
    const store = createSequenceStore(storage);

    store.save(createSequence({ id: "sequence-1", name: "Warmup" }));
    store.save(createSequence({ id: "sequence-2", name: "Arpeggio" }));

    expect(store.rename("sequence-2", " warmup ")).toBe(false);
    expect(store.loadAll().map((sequence) => sequence.name)).toEqual(["Warmup", "Arpeggio"]);
  });

  it("treats renaming to the current sequence name as a no-op", () => {
    const storage = new MemoryStorage();
    const store = createSequenceStore(storage);

    store.save(createSequence({ id: "sequence-1", name: "Warmup" }));

    expect(store.rename("sequence-1", " warmup ")).toBe(true);
    expect(store.loadAll()).toEqual([createSequence({ id: "sequence-1", name: "Warmup" })]);
  });

  it("deletes only the targeted sequence", () => {
    const storage = new MemoryStorage();
    const store = createSequenceStore(storage);

    store.save(createSequence({ id: "sequence-1", name: "Warmup" }));
    store.save(createSequence({ id: "sequence-2", name: "Arpeggio" }));

    expect(store.delete("sequence-1")).toBe(true);
    expect(store.loadAll()).toEqual([createSequence({ id: "sequence-2", name: "Arpeggio" })]);
  });

  it("persists BPM updates", () => {
    const storage = new MemoryStorage();
    const store = createSequenceStore(storage);

    store.save(createSequence({ id: "sequence-1", bpm: DEFAULT_SEQUENCE_BPM }));

    expect(store.updateBpm("sequence-1", 132)).toBe(true);
    expect(store.loadAll()[0]?.bpm).toBe(132);
  });

  it("handles malformed and old payloads gracefully", () => {
    const malformedStorage = new MemoryStorage();
    malformedStorage.setItem(SEQUENCE_STORAGE_KEY, "{not json");

    expect(createSequenceStore(malformedStorage).loadAll()).toEqual([]);

    const oldPayloadStorage = new MemoryStorage();
    oldPayloadStorage.setItem(
      SEQUENCE_STORAGE_KEY,
      JSON.stringify({
        version: 0,
        sequences: [createSequence()],
      }),
    );

    expect(createSequenceStore(oldPayloadStorage).loadAll()).toEqual([]);
  });
});
