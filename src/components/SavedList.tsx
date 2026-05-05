import { useState } from "react";

import { cn } from "../lib/utils";
import type { Sequence } from "../sequenceStore";

interface SavedListProps {
  onPlaySequence?: (sequenceId: string) => void;
  onSelectSequence?: (sequenceId: string) => void;
  playEnabled?: boolean;
  selectedSequenceId?: string | null;
  selectionEnabled?: boolean;
  sequences: Sequence[];
  onRename: (sequence: Sequence) => void;
  onDelete: (sequence: Sequence) => void;
}

interface SavedSequenceRowProps {
  isPlayEnabled: boolean;
  sequence: Sequence;
  isSelected: boolean;
  isSelectionEnabled: boolean;
  isMenuOpen: boolean;
  onPlay: () => void;
  onSelect: () => void;
  onToggleMenu: () => void;
  onRename: () => void;
  onDelete: () => void;
}

interface SavedSequenceActionsProps {
  sequenceName: string;
  isOpen: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
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

function SavedSequenceActions({
  sequenceName,
  isOpen,
  onToggle,
  onRename,
  onDelete,
}: SavedSequenceActionsProps) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Open actions for ${sequenceName}`}
        className="rounded-full border border-stone-700 px-3 py-2 text-sm font-semibold text-stone-200 transition-colors hover:border-stone-500 hover:bg-stone-800"
        onClick={onToggle}
      >
        ...
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={`Actions for ${sequenceName}`}
          className="absolute right-0 top-full z-10 mt-2 flex min-w-36 flex-col rounded-2xl border border-stone-700 bg-stone-950 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
        >
          <button
            type="button"
            role="menuitem"
            className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-800"
            onClick={onRename}
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-200 transition-colors hover:bg-stone-800"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SavedSequenceRow({
  isPlayEnabled,
  sequence,
  isSelected,
  isSelectionEnabled,
  isMenuOpen,
  onPlay,
  onSelect,
  onToggleMenu,
  onRename,
  onDelete,
}: SavedSequenceRowProps) {
  return (
    <li
      className={cn(
        "rounded-[1.5rem] border bg-stone-900/70 px-5 py-4 transition-colors",
        isSelected ? "border-amber-300/60 bg-amber-400/10" : "border-stone-800",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          aria-label={`Select ${sequence.name}`}
          aria-pressed={isSelected}
          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!isSelectionEnabled}
          onClick={onSelect}
        >
          <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
            <p className="text-lg font-semibold text-stone-50">{sequence.name}</p>
            <p className="text-sm text-stone-400">{formatRelativeTime(sequence.createdAt)}</p>
          </div>
          <p className="mt-2 text-sm text-stone-300">
            {stepCountLabel(sequence.steps.length)}
          </p>
        </button>

        <div className="flex shrink-0 items-start gap-2">
          <button
            type="button"
            aria-label={`Play ${sequence.name}`}
            className="rounded-full border border-amber-300/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors hover:border-amber-200 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isPlayEnabled}
            onClick={onPlay}
          >
            Play
          </button>
          <SavedSequenceActions
            sequenceName={sequence.name}
            isOpen={isMenuOpen}
            onToggle={onToggleMenu}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </div>
    </li>
  );
}

export function SavedList({
  onPlaySequence,
  onSelectSequence,
  playEnabled = true,
  selectedSequenceId = null,
  selectionEnabled = true,
  sequences,
  onRename,
  onDelete,
}: SavedListProps) {
  const [openMenuSequenceId, setOpenMenuSequenceId] = useState<string | null>(null);
  const orderedSequences = [...sequences].sort((left, right) => right.createdAt - left.createdAt);

  function toggleSequenceMenu(sequenceId: string) {
    setOpenMenuSequenceId((currentId) => (currentId === sequenceId ? null : sequenceId));
  }

  function requestRename(sequence: Sequence) {
    setOpenMenuSequenceId(null);
    onRename(sequence);
  }

  function requestDelete(sequence: Sequence) {
    setOpenMenuSequenceId(null);
    onDelete(sequence);
  }

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
          {orderedSequences.map((sequence) => (
            <SavedSequenceRow
              key={sequence.id}
              isPlayEnabled={playEnabled}
              sequence={sequence}
              isSelected={sequence.id === selectedSequenceId}
              isSelectionEnabled={selectionEnabled}
              isMenuOpen={openMenuSequenceId === sequence.id}
              onPlay={() => onPlaySequence?.(sequence.id)}
              onSelect={() => onSelectSequence?.(sequence.id)}
              onToggleMenu={() => toggleSequenceMenu(sequence.id)}
              onRename={() => requestRename(sequence)}
              onDelete={() => requestDelete(sequence)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
