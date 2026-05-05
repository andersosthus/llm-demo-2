export const PREFS_STORAGE_KEY = "guitar-app:prefs:v1";
export const PREFS_STORAGE_VERSION = 1;

export interface Prefs {
  countInEnabled: boolean;
  loopEnabled: boolean;
}

export interface PrefsStore {
  load: () => Prefs;
  save: (prefs: Prefs) => void;
}

const defaultPrefs: Prefs = {
  countInEnabled: true,
  loopEnabled: false,
};

interface PrefsPayload {
  version: number;
  prefs: Prefs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function defaultPayload(): PrefsPayload {
  return {
    version: PREFS_STORAGE_VERSION,
    prefs: { ...defaultPrefs },
  };
}

function clonePrefs(prefs: Prefs): Prefs {
  return {
    countInEnabled: prefs.countInEnabled,
    loopEnabled: prefs.loopEnabled,
  };
}

function isPrefs(value: unknown): value is Prefs {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value["countInEnabled"] === "boolean" &&
    typeof value["loopEnabled"] === "boolean"
  );
}

function readPayload(storage: Storage): PrefsPayload {
  const rawPayload = storage.getItem(PREFS_STORAGE_KEY);

  if (rawPayload === null) {
    return defaultPayload();
  }

  try {
    const parsed = JSON.parse(rawPayload);

    if (
      !isRecord(parsed) ||
      parsed["version"] !== PREFS_STORAGE_VERSION ||
      !isPrefs(parsed["prefs"])
    ) {
      return defaultPayload();
    }

    return {
      version: PREFS_STORAGE_VERSION,
      prefs: clonePrefs(parsed["prefs"]),
    };
  } catch {
    return defaultPayload();
  }
}

function writePrefs(storage: Storage, prefs: Prefs) {
  storage.setItem(
    PREFS_STORAGE_KEY,
    JSON.stringify({
      version: PREFS_STORAGE_VERSION,
      prefs: clonePrefs(prefs),
    }),
  );
}

export function createPrefsStore(storage: Storage): PrefsStore {
  return {
    load() {
      return clonePrefs(readPayload(storage).prefs);
    },
    save(prefs) {
      writePrefs(storage, prefs);
    },
  };
}
