import { describe, expect, it } from "vitest";

import {
  createPrefsStore,
  PREFS_STORAGE_KEY,
  PREFS_STORAGE_VERSION,
  type Prefs,
} from "./prefsStore";

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

const defaultPrefs: Prefs = {
  countInEnabled: true,
  loopEnabled: false,
};

describe("prefsStore", () => {
  it("loads default playback prefs when storage is empty", () => {
    const storage = new MemoryStorage();
    const store = createPrefsStore(storage);

    expect(store.load()).toEqual(defaultPrefs);
  });

  it("round-trips playback prefs and writes the versioned payload", () => {
    const storage = new MemoryStorage();
    const store = createPrefsStore(storage);
    const prefs: Prefs = {
      countInEnabled: false,
      loopEnabled: true,
    };

    store.save(prefs);

    expect(store.load()).toEqual(prefs);
    expect(JSON.parse(storage.getItem(PREFS_STORAGE_KEY) ?? "")).toEqual({
      version: PREFS_STORAGE_VERSION,
      prefs,
    });
  });

  it("handles malformed and old payloads gracefully", () => {
    const malformedStorage = new MemoryStorage();
    malformedStorage.setItem(PREFS_STORAGE_KEY, "{not json");

    expect(createPrefsStore(malformedStorage).load()).toEqual(defaultPrefs);

    const oldPayloadStorage = new MemoryStorage();
    oldPayloadStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        version: 0,
        prefs: {
          countInEnabled: false,
          loopEnabled: true,
        },
      }),
    );

    expect(createPrefsStore(oldPayloadStorage).load()).toEqual(defaultPrefs);
  });
});
