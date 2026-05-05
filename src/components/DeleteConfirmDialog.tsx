import type { Sequence } from "../sequenceStore";
import { Button } from "./ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  sequence: Sequence | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function stepCountLabel(stepCount: number) {
  return `${stepCount} step${stepCount === 1 ? "" : "s"}`;
}

export function DeleteConfirmDialog({
  open,
  sequence,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  if (!open || sequence === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-6 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-sequence-title"
        aria-describedby="delete-sequence-description"
        className="w-full max-w-md rounded-[2rem] border border-rose-400/20 bg-stone-900 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-300/80">
              Library
            </p>
            <h2 id="delete-sequence-title" className="mt-2 font-serif text-2xl text-stone-50">
              Delete sequence
            </h2>
            <p id="delete-sequence-description" className="mt-2 text-sm text-stone-300">
              Delete {sequence.name}? This removes the saved exercise and its{" "}
              {stepCountLabel(sequence.steps.length)}.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={onConfirm}>
              Delete sequence
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
