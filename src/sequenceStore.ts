import type { Step } from "./recordingMachine";

export const DEFAULT_SEQUENCE_BPM = 80;
export const SEQUENCE_STORAGE_KEY = "guitar-app:sequences:v1";
export const SEQUENCE_STORAGE_VERSION = 1;

export interface Sequence {
  id: string;
  name: string;
  steps: Step[];
  bpm: number;
  createdAt: number;
}

interface SequencePayload {
  version: number;
  sequences: Sequence[];
}

export interface SequenceStore {
  loadAll: () => Sequence[];
  save: (sequence: Sequence) => boolean;
  delete: (id: string) => boolean;
  rename: (id: string, newName: string) => boolean;
  updateBpm: (id: string, bpm: number) => boolean;
  nameExists: (name: string) => boolean;
}

function emptyPayload(): SequencePayload {
  return {
    version: SEQUENCE_STORAGE_VERSION,
    sequences: [],
  };
}

function cloneStep(step: Step): Step {
  return { ...step };
}

function cloneSequence(sequence: Sequence): Sequence {
  return {
    ...sequence,
    steps: sequence.steps.map(cloneStep),
  };
}

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function trimmedNameOrNull(name: string) {
  const trimmedName = name.trim();

  return trimmedName.length === 0 ? null : trimmedName;
}

function hasSequenceNamed(sequences: Sequence[], name: string, ignoredId?: string) {
  const normalizedName = normalizeName(name);

  return sequences.some((sequence) => {
    if (sequence.id === ignoredId) {
      return false;
    }

    return normalizeName(sequence.name) === normalizedName;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStep(value: unknown): value is Step {
  if (!isRecord(value)) {
    return false;
  }

  const stringIndex = value["string"];
  const fret = value["fret"];

  return (
    typeof stringIndex === "number" &&
    Number.isInteger(stringIndex) &&
    stringIndex >= 0 &&
    stringIndex <= 5 &&
    typeof fret === "number" &&
    Number.isInteger(fret) &&
    fret >= 0 &&
    fret <= 24
  );
}

function isSequence(value: unknown): value is Sequence {
  if (!isRecord(value)) {
    return false;
  }

  const id = value["id"];
  const name = value["name"];
  const steps = value["steps"];
  const bpm = value["bpm"];
  const createdAt = value["createdAt"];

  return (
    typeof id === "string" &&
    typeof name === "string" &&
    Array.isArray(steps) &&
    steps.every(isStep) &&
    typeof bpm === "number" &&
    Number.isFinite(bpm) &&
    typeof createdAt === "number" &&
    Number.isFinite(createdAt)
  );
}

function readPayload(storage: Storage): SequencePayload {
  const rawPayload = storage.getItem(SEQUENCE_STORAGE_KEY);

  if (rawPayload === null) {
    return emptyPayload();
  }

  try {
    const parsed = JSON.parse(rawPayload);

    if (!isRecord(parsed) || parsed["version"] !== SEQUENCE_STORAGE_VERSION) {
      return emptyPayload();
    }

    const sequences = parsed["sequences"];

    if (!Array.isArray(sequences)) {
      return emptyPayload();
    }

    return {
      version: SEQUENCE_STORAGE_VERSION,
      sequences: sequences.filter(isSequence).map(cloneSequence),
    };
  } catch {
    return emptyPayload();
  }
}

function writePayload(storage: Storage, payload: SequencePayload) {
  storage.setItem(
    SEQUENCE_STORAGE_KEY,
    JSON.stringify({
      version: SEQUENCE_STORAGE_VERSION,
      sequences: payload.sequences.map(cloneSequence),
    }),
  );
}

function updateSequences(
  storage: Storage,
  update: (sequences: Sequence[]) => Sequence[] | null,
): boolean {
  const payload = readPayload(storage);
  const nextSequences = update(payload.sequences.map(cloneSequence));

  if (nextSequences === null) {
    return false;
  }

  writePayload(storage, {
    version: SEQUENCE_STORAGE_VERSION,
    sequences: nextSequences,
  });

  return true;
}

export function createSequenceStore(storage: Storage): SequenceStore {
  return {
    loadAll() {
      return readPayload(storage).sequences.map(cloneSequence);
    },
    save(sequence) {
      const trimmedName = trimmedNameOrNull(sequence.name);

      if (trimmedName === null) {
        return false;
      }

      return updateSequences(storage, (sequences) => {
        if (hasSequenceNamed(sequences, trimmedName)) {
          return null;
        }

        return [...sequences, cloneSequence({ ...sequence, name: trimmedName })];
      });
    },
    delete(id) {
      return updateSequences(storage, (sequences) => {
        const nextSequences = sequences.filter((sequence) => sequence.id !== id);

        if (nextSequences.length === sequences.length) {
          return null;
        }

        return nextSequences;
      });
    },
    rename(id, newName) {
      const trimmedName = trimmedNameOrNull(newName);

      if (trimmedName === null) {
        return false;
      }

      return updateSequences(storage, (sequences) => {
        const target = sequences.find((sequence) => sequence.id === id);

        if (target === undefined) {
          return null;
        }

        if (normalizeName(target.name) === normalizeName(trimmedName)) {
          return sequences;
        }

        if (hasSequenceNamed(sequences, trimmedName, id)) {
          return null;
        }

        return sequences.map((sequence) =>
          sequence.id === id ? cloneSequence({ ...sequence, name: trimmedName }) : sequence,
        );
      });
    },
    updateBpm(id, bpm) {
      return updateSequences(storage, (sequences) => {
        if (!sequences.some((sequence) => sequence.id === id)) {
          return null;
        }

        return sequences.map((sequence) =>
          sequence.id === id ? cloneSequence({ ...sequence, bpm }) : sequence,
        );
      });
    },
    nameExists(name) {
      const trimmedName = trimmedNameOrNull(name);

      if (trimmedName === null) {
        return false;
      }

      return hasSequenceNamed(readPayload(storage).sequences, trimmedName);
    },
  };
}
