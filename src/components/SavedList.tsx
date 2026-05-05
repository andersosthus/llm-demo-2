import { useState } from "react";

import type { Sequence } from "../sequenceStore";

interface SavedListProps {
  sequences: Sequence[];
  onRename: (sequence: Sequence) => void;
  onDelete: (sequence: Sequence) => void;
}

const YEAR_RELATIVE_TIME_UNIT = {
  unit: "year" as const,
  sizeMs: 31_557_600_000,
  limitMs: Number.POSITIVE_INFINITY,
};

const RELATIVE_TIME_UNITS = [
  { unit: "minute" as const, sizeMs: 60_000, limitMs: 3_600_000 },
  { unit: "hour" as const, sizeMs: 3_600_000, limitMs: 86_400_000 },
  { unit: "day" as const, sizeMs: 86_400_000, limitMs: 604_800_000 },
  { unit: "week" as const, sizeMs: 604_800_000, limitMs: 2_629_800_000 },
  { unit: "month" as const, sizeMs: 2_629_800_000, limitMs: 31_557_600_000 },
  YEAR_RELATIVE_TIME_UNIT,
];

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(createdAt: number, now = Date.now()) {
  const deltaMs = createdAt - now;
  const absoluteMs = Math.abs(deltaMs);

  if (absoluteMs < 45_000) {
    return "just now";
  }

  const matchingUnit = RELATIVE_TIME_UNITS.find(
    (candidate) => absoluteMs < candidate.limitMs,
  ) ?? YEAR_RELATIVE_TIME_UNIT;
  const relativeValue = Math.round(deltaMs / matchingUnit.sizeMs);

  return relativeFormatter.format(relativeValue, matchingUnit.unit);
}

function stepCountLabel(stepCount: number) {
  return `${stepCount} step${stepCount === 1 ? "" : "s"}`;
}

export function SavedList({ sequences, onRename, onDelete }: SavedListProps) {
  const [openMenuSequenceId, setOpenMenuSequenceId] = useState<string | null>(null);
  const orderedSequences = [...sequences].sort((left, right) => right.createdAt - left.createdAt);

  return (
    <section
      aria-label="Saved sequences"
      className="rounded-[2rem] border border-amber-400/20 bg-stone-950/60 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
    >
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
          Library
        </p>
        <h2 className="mt-2 font-serif text-2xl text-stone-50">Saved sequences</h2>
      </div>

      {orderedSequences.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-stone-700 bg-stone-900/70 px-5 py-6 text-sm text-stone-300">
          No sequences yet. Press Record to create your first exercise.
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {orderedSequences.map((sequence) => {
            const isMenuOpen = openMenuSequenceId === sequence.id;

            return (
              <li
                key={sequence.id}
                className="rounded-[1.5rem] border border-stone-800 bg-stone-900/70 px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                      <p className="text-lg font-semibold text-stone-50">{sequence.name}</p>
                      <p className="text-sm text-stone-400">
                        {formatRelativeTime(sequence.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-stone-300">
                      {stepCountLabel(sequence.steps.length)}
                    </p>
                  </div>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      aria-label={`Open actions for ${sequence.name}`}
                      className="rounded-full border border-stone-700 px-3 py-2 text-sm font-semibold text-stone-200 transition-colors hover:border-stone-500 hover:bg-stone-800"
                      onClick={() =>
                        setOpenMenuSequenceId((currentId) =>
                          currentId === sequence.id ? null : sequence.id,
                        )
                      }
                    >
                      ...
                    </button>

                    {isMenuOpen ? (
                      <div
                        role="menu"
                        aria-label={`Actions for ${sequence.name}`}
                        className="absolute right-0 top-full z-10 mt-2 flex min-w-36 flex-col rounded-2xl border border-stone-700 bg-stone-950 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-800"
                          onClick={() => {
                            setOpenMenuSequenceId(null);
                            onRename(sequence);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-200 transition-colors hover:bg-stone-800"
                          onClick={() => {
                            setOpenMenuSequenceId(null);
                            onDelete(sequence);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
